const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

/**
 * @route GET /api/beat-maker/projects
 * @desc Get all projects for authenticated user
 * @access Private
 */
router.get('/projects', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const projects = await Project.find({ creator: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('-tracks.patterns.notes -automation') // Exclude heavy data
      .lean();

    logger.info('Projects fetched', { userId: req.user.userId, count: projects.length });
    res.json({ success: true, projects });
  } catch (error) {
    logger.error('Error fetching projects', { error: error.message, userId: req.user.userId });
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

/**
 * @route GET /api/beat-maker/projects/:id
 * @desc Get single project by ID
 * @access Private
 */
router.get('/projects/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check access permissions
    const isCreator = project.creator.toString() === req.user.userId;
    const isCollaborator = project.collaborators.some(
      c => c.user.toString() === req.user.userId
    );
    const canView = isCreator || isCollaborator || project.isPublic;

    if (!canView) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    logger.info('Project fetched', { projectId: req.params.id, userId: req.user.userId });
    res.json({ success: true, project });
  } catch (error) {
    logger.error('Error fetching project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

/**
 * @route POST /api/beat-maker/projects
 * @desc Create new project (requires subscription to save)
 * @access Private
 */
router.post('/projects', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { name, bpm, timeSignature, tracks, patterns } = req.body;

    // Check subscription for saving
    const user = req.user;
    const hasSubscription = user.subscription === 'premium' || user.subscription === 'professional';

    if (!hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required to save projects',
        requiresSubscription: true
      });
    }

    const project = new Project({
      name,
      bpm: bpm || 120,
      timeSignature: timeSignature || { numerator: 4, denominator: 4 },
      creator: user.userId,
      tracks: tracks || [],
      patterns: patterns || []
    });

    await project.save();

    logger.info('Project created', { projectId: project._id, userId: user.userId });
    res.status(201).json({ success: true, project });
  } catch (error) {
    logger.error('Error creating project', { error: error.message, userId: req.user.userId });
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

/**
 * @route PUT /api/beat-maker/projects/:id
 * @desc Update project (requires subscription)
 * @access Private
 */
router.put('/projects/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check permissions
    const isCreator = project.creator.toString() === req.user.userId;
    const hasEditAccess = project.collaborators.some(
      c => c.user.toString() === req.user.userId && c.permissions === 'edit'
    );

    if (!isCreator && !hasEditAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check subscription
    const hasSubscription = req.user.subscription === 'premium' || req.user.subscription === 'professional';
    if (!hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required to save changes',
        requiresSubscription: true
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'bpm', 'timeSignature', 'tracks', 'patterns', 'automation', 'master', 'tags', 'genre'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    project.version += 1;
    await project.save();

    logger.info('Project updated', { projectId: project._id, userId: req.user.userId });
    res.json({ success: true, project });
  } catch (error) {
    logger.error('Error updating project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

/**
 * @route DELETE /api/beat-maker/projects/:id
 * @desc Delete project
 * @access Private
 */
router.delete('/projects/:id', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (project.creator.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only creator can delete project' });
    }

    await project.deleteOne();

    logger.info('Project deleted', { projectId: req.params.id, userId: req.user.userId });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Error deleting project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

/**
 * @route POST /api/beat-maker/projects/:id/duplicate
 * @desc Duplicate a project
 * @access Private
 */
router.post('/projects/:id/duplicate', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const originalProject = await Project.findById(req.params.id);

    if (!originalProject) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Check subscription
    const hasSubscription = req.user.subscription === 'premium' || req.user.subscription === 'professional';
    if (!hasSubscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required to duplicate projects',
        requiresSubscription: true
      });
    }

    const duplicatedProject = new Project({
      ...originalProject.toObject(),
      _id: undefined,
      name: `${originalProject.name} (Copy)`,
      creator: req.user.userId,
      collaborators: [],
      isPublic: false,
      version: 1,
      parentVersion: originalProject._id,
      createdAt: undefined,
      updatedAt: undefined
    });

    await duplicatedProject.save();

    logger.info('Project duplicated', { originalId: req.params.id, newId: duplicatedProject._id });
    res.status(201).json({ success: true, project: duplicatedProject });
  } catch (error) {
    logger.error('Error duplicating project', { error: error.message, projectId: req.params.id });
    res.status(500).json({ success: false, error: 'Failed to duplicate project' });
  }
});

/**
 * @route GET /api/beat-maker/projects/public/explore
 * @desc Get public projects for exploration
 * @access Public
 */
router.get('/projects/public/explore', optionalAuth, apiLimiter, async (req, res) => {
  try {
    const { genre, tags, limit = 20, skip = 0 } = req.query;

    const query = { isPublic: true };
    if (genre) query.genre = genre;
    if (tags) query.tags = { $in: tags.split(',') };

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('creator', 'username avatar')
      .select('-tracks.patterns.notes -automation')
      .lean();

    res.json({ success: true, projects });
  } catch (error) {
    logger.error('Error fetching public projects', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

module.exports = router;
