const express = require('express');
const router = express.Router();
const Sample = require('../models/Sample');
const SamplePack = require('../models/SamplePack');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Configure multer for sample uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/samples');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/flac', 'audio/aac', 'audio/ogg', 'audio/webm'
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|flac|aac|ogg|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});

/**
 * @route GET /api/beat-maker/samples
 * @desc Get samples with filtering
 * @access Public
 */
router.get('/samples', optionalAuth, apiLimiter, async (req, res) => {
  try {
    const { category, tags, isPremium, search, limit = 50, skip = 0 } = req.query;

    const query = { isPublic: true };

    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const samples = await Sample.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-waveformData') // Exclude heavy data
      .lean();

    res.json({ success: true, samples, count: samples.length });
  } catch (error) {
    logger.error('Error fetching samples', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch samples' });
  }
});

/**
 * @route GET /api/beat-maker/samples/:id
 * @desc Get single sample with full data
 * @access Public
 */
router.get('/samples/:id', optionalAuth, apiLimiter, async (req, res) => {
  try {
    const sample = await Sample.findById(req.params.id);

    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }

    // Check premium access
    if (sample.isPremium && req.user) {
      const hasSubscription = req.user.subscription === 'premium' || req.user.subscription === 'professional';
      if (!hasSubscription) {
        return res.status(403).json({
          success: false,
          error: 'Premium subscription required',
          requiresSubscription: true
        });
      }
    }

    // Increment usage count
    sample.usageCount += 1;
    await sample.save();

    res.json({ success: true, sample });
  } catch (error) {
    logger.error('Error fetching sample', { error: error.message, sampleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to fetch sample' });
  }
});

/**
 * @route GET /api/beat-maker/samples/categories/list
 * @desc Get available categories
 * @access Public
 */
router.get('/samples/categories/list', apiLimiter, async (req, res) => {
  try {
    const categories = await Sample.distinct('category');
    res.json({ success: true, categories });
  } catch (error) {
    logger.error('Error fetching categories', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * @route GET /api/beat-maker/packs
 * @desc Get sample packs
 * @access Public
 */
router.get('/packs', optionalAuth, apiLimiter, async (req, res) => {
  try {
    const { genre, isPremium, limit = 20, skip = 0 } = req.query;

    const query = { isPublic: true };
    if (genre) query.genre = genre;
    if (isPremium !== undefined) query.isPremium = isPremium === 'true';

    const packs = await SamplePack.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('creator', 'username avatar')
      .lean();

    res.json({ success: true, packs, count: packs.length });
  } catch (error) {
    logger.error('Error fetching sample packs', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch packs' });
  }
});

/**
 * @route GET /api/beat-maker/packs/:id/samples
 * @desc Get samples in a pack
 * @access Public
 */
router.get('/packs/:id/samples', optionalAuth, apiLimiter, async (req, res) => {
  try {
    const pack = await SamplePack.findById(req.params.id);

    if (!pack) {
      return res.status(404).json({ success: false, error: 'Pack not found' });
    }

    const samples = await Sample.find({ packId: req.params.id, isPublic: true })
      .select('-waveformData')
      .lean();

    res.json({ success: true, pack, samples });
  } catch (error) {
    logger.error('Error fetching pack samples', { error: error.message, packId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to fetch samples' });
  }
});

/**
 * @route POST /api/beat-maker/samples/:id/download
 * @desc Track sample download
 * @access Private
 */
router.post('/samples/:id/download', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const sample = await Sample.findById(req.params.id);

    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }

    // Check premium access
    if (sample.isPremium) {
      const hasSubscription = req.user.subscription === 'premium' || req.user.subscription === 'professional';
      if (!hasSubscription) {
        return res.status(403).json({
          success: false,
          error: 'Premium subscription required',
          requiresSubscription: true
        });
      }
    }

    sample.downloads += 1;
    await sample.save();

    logger.info('Sample downloaded', { sampleId: req.params.id, userId: req.user.userId });
    res.json({ success: true, downloadUrl: sample.fileUrl });
  } catch (error) {
    logger.error('Error downloading sample', { error: error.message, sampleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to download sample' });
  }
});

/**
 * @route POST /api/beat-maker/samples/upload
 * @desc Upload user's own sample
 * @access Private
 */
router.post('/samples/upload', authenticateToken, uploadLimiter, upload.single('sample'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { name, category = 'user', tags = '', bpm, key, isPublic = false } = req.body;

    if (!name) {
      // Delete uploaded file if validation fails
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, error: 'Sample name is required' });
    }

    // Get file metadata
    const fileUrl = `/uploads/samples/${req.file.filename}`;
    const fileSize = req.file.size;
    const duration = 0; // Would need audio processing library to get actual duration

    // Create sample record
    const sample = new Sample({
      name,
      category,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      fileUrl,
      fileSize,
      duration,
      bpm: bpm ? parseInt(bpm) : null,
      key: key || null,
      waveformData: [], // Would generate with audio processing
      isPremium: false, // User samples are free to them
      isPublic: isPublic === 'true' || isPublic === true,
      uploadedBy: req.user.userId,
      usageCount: 0,
      downloads: 0
    });

    await sample.save();

    logger.info('User sample uploaded', {
      sampleId: sample._id,
      userId: req.user.userId,
      filename: req.file.filename,
      size: fileSize
    });

    res.json({
      success: true,
      sample: {
        id: sample._id,
        name: sample.name,
        category: sample.category,
        fileUrl: sample.fileUrl,
        duration: sample.duration,
        bpm: sample.bpm,
        key: sample.key
      },
      message: 'Sample uploaded successfully'
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    logger.error('Sample upload failed', { error: error.message, userId: req.user?.userId });
    res.status(500).json({ success: false, error: 'Failed to upload sample' });
  }
});

/**
 * @route GET /api/beat-maker/samples/my-samples
 * @desc Get user's uploaded samples
 * @access Private
 */
router.get('/samples/my-samples', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { category, search, limit = 50, skip = 0 } = req.query;

    const query = { uploadedBy: req.user.userId };

    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const samples = await Sample.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-waveformData')
      .lean();

    const total = await Sample.countDocuments(query);

    res.json({ success: true, samples, count: samples.length, total });
  } catch (error) {
    logger.error('Error fetching user samples', { error: error.message, userId: req.user.userId });
    res.status(500).json({ success: false, error: 'Failed to fetch samples' });
  }
});

/**
 * @route PUT /api/beat-maker/samples/:id
 * @desc Update user's sample metadata
 * @access Private
 */
router.put('/samples/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const sample = await Sample.findById(req.params.id);

    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }

    // Check ownership
    if (sample.uploadedBy?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { name, category, tags, bpm, key, isPublic } = req.body;

    if (name) sample.name = name;
    if (category) sample.category = category;
    if (tags) sample.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (bpm !== undefined) sample.bpm = parseInt(bpm) || null;
    if (key !== undefined) sample.key = key || null;
    if (isPublic !== undefined) sample.isPublic = isPublic === 'true' || isPublic === true;

    sample.updatedAt = new Date();
    await sample.save();

    logger.info('Sample updated', { sampleId: sample._id, userId: req.user.userId });

    res.json({ success: true, sample });
  } catch (error) {
    logger.error('Sample update failed', { error: error.message, sampleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update sample' });
  }
});

/**
 * @route DELETE /api/beat-maker/samples/:id
 * @desc Delete user's sample
 * @access Private
 */
router.delete('/samples/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const sample = await Sample.findById(req.params.id);

    if (!sample) {
      return res.status(404).json({ success: false, error: 'Sample not found' });
    }

    // Check ownership
    if (sample.uploadedBy?.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '../../public', sample.fileUrl);
    await fs.unlink(filePath).catch(err => {
      logger.warn('Failed to delete sample file', { filePath, error: err.message });
    });

    // Delete from database
    await Sample.findByIdAndDelete(req.params.id);

    logger.info('Sample deleted', { sampleId: req.params.id, userId: req.user.userId });

    res.json({ success: true, message: 'Sample deleted successfully' });
  } catch (error) {
    logger.error('Sample deletion failed', { error: error.message, sampleId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to delete sample' });
  }
});

module.exports = router;
