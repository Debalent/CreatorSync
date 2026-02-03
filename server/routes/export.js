const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticateToken } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * @route POST /api/beat-maker/export/:projectId
 * @desc Export project to audio file (requires subscription)
 * @access Private
 */
router.post('/export/:projectId', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'wav', sampleRate = 44100, bitDepth = 16 } = req.body;

    // Validate format
    const validFormats = ['wav', 'mp3', 'flac'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ success: false, error: 'Invalid export format' });
    }

    // Check subscription
    const hasSubscription = req.user.subscription === 'premium' || req.user.subscription === 'professional';
    if (!hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required to export projects',
        requiresSubscription: true
      });
    }

    // Get project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check permissions
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.${format}`;
    const exportDir = path.join(__dirname, '../../public/uploads/exports');
    const exportPath = path.join(exportDir, filename);

    // Ensure export directory exists
    await fs.mkdir(exportDir, { recursive: true });

    // Render audio using Tone.js Offline Context approach
    // Note: This is a simplified implementation. Production would need:
    // - Server-side audio rendering (using node-web-audio-api or similar)
    // - FFmpeg for format conversion
    // - Background job processing for large projects
    
    try {
      // For now, create a placeholder file
      // In production, implement actual audio rendering here
      await fs.writeFile(exportPath, Buffer.from(''));
      
      const exportUrl = `/uploads/exports/${filename}`;

      // Store export record
      project.exports.push({
        format,
        exportedAt: new Date(),
        fileUrl: exportUrl
      });

      await project.save();

      logger.info('Project export created', {
        projectId,
        userId: req.user.userId,
        format,
        filename
      });

      res.json({
        success: true,
        export: {
          url: exportUrl,
          format,
          filename,
          message: 'Export created. Note: Server-side audio rendering requires additional setup with FFmpeg or audio processing library.'
        }
      });
    } catch (renderError) {
      logger.error('Audio rendering failed', { error: renderError.message });
      throw new Error('Audio rendering failed');
    }
  } catch (error) {
    logger.error('Export failed', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({ success: false, error: 'Failed to export project' });
  }
});

/**
 * @route POST /api/beat-maker/upload-recording
 * @desc Upload recorded audio from microphone
 * @access Private
 */
router.post('/upload-recording', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const multer = require('multer');
    const upload = multer({
      dest: path.join(__dirname, '../../public/uploads/recordings'),
      limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
    }).single('audio');

    upload(req, res, async (err) => {
      if (err) {
        logger.error('Recording upload failed', { error: err.message });
        return res.status(400).json({ success: false, error: 'Upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const recordingUrl = `/uploads/recordings/${req.file.filename}`;

      logger.info('Recording uploaded', {
        userId: req.user.userId,
        filename: req.file.filename,
        size: req.file.size
      });

      res.json({
        success: true,
        url: recordingUrl,
        filename: req.file.filename
      });
    });
  } catch (error) {
    logger.error('Recording upload error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to upload recording' });
  }
});

/**
 * @route GET /api/beat-maker/exports/:projectId
 * @desc Get export history for a project
 * @access Private
 */
router.get('/exports/:projectId', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .select('exports creator');

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check permissions
    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({
      success: true,
      exports: project.exports
    });
  } catch (error) {
    logger.error('Failed to fetch exports', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch exports' });
  }
});

/**
 * @route POST /api/beat-maker/projects/:id/render
 * @desc Render project audio in real-time (Phase 2)
 * @access Private
 */
router.post('/projects/:id/render', authenticateToken, apiLimiter, async (req, res) => {
  try {
    // This will be implemented in Phase 2 with server-side audio rendering
    // Using Web Audio API on Node.js or FFmpeg for mixing

    res.json({
      success: true,
      message: 'Server-side rendering coming in Phase 2',
      status: 'pending'
    });
  } catch (error) {
    logger.error('Render failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to render project' });
  }
});

module.exports = router;
