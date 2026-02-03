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

    // For now, return a placeholder - actual audio rendering would happen here
    // In production, this would use a audio rendering library or service
    const exportUrl = `/uploads/exports/${filename}`;

    // Store export record
    project.exports.push({
      format,
      exportedAt: new Date(),
      fileUrl: exportUrl
    });

    await project.save();

    logger.info('Project exported', {
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
        message: 'Export queued for processing. This feature will be fully implemented in Phase 2.'
      }
    });
  } catch (error) {
    logger.error('Export failed', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({ success: false, error: 'Failed to export project' });
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
