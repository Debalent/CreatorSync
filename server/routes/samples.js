const express = require('express');
const router = express.Router();
const Sample = require('../models/Sample');
const SamplePack = require('../models/SamplePack');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

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

module.exports = router;
