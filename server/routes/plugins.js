// Plugin API Routes for CreatorSync DAW Integration
const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const { sessions } = require('./auth');

// Middleware to verify plugin authentication
const authenticatePlugin = async (req, res, next) => {
    const { pluginKey, userToken } = req.headers;

    if (!pluginKey || !userToken) {
        return res.status(401).json({ error: 'Plugin key and user token required' });
    }

    // Verify plugin key (implement proper plugin licensing)
    if (pluginKey !== process.env.PLUGIN_API_KEY) {
        return res.status(401).json({ error: 'Invalid plugin key' });
    }

    // Verify user token
    const session = sessions.get(userToken);
    if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired user token' });
    }

    req.userId = session.userId;
    next();
};

// Get user profile for plugin
router.get('/user/profile', authenticatePlugin, async (req, res) => {
    try {
        const user = await dataManager.findUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Plugin user profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Get user's beats for plugin
router.get('/user/beats', authenticatePlugin, async (req, res) => {
    try {
        const user = await dataManager.findUserById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // In a real implementation, filter beats by user
        const allBeats = await dataManager.getAllBeats();
        const userBeats = allBeats.filter(beat => beat.userId === req.userId);

        res.json({ beats: userBeats });
    } catch (error) {
        console.error('Plugin user beats error:', error);
        res.status(500).json({ error: 'Failed to get user beats' });
    }
});

// Sync project data between web and plugin
router.post('/project/sync', authenticatePlugin, async (req, res) => {
    try {
        const { projectData, direction } = req.body;

        if (direction === 'upload') {
            // Save project data from plugin to web
            console.log('Uploading project from plugin:', projectData.projectId);
            // Implement project save logic
        } else if (direction === 'download') {
            // Send project data from web to plugin
            console.log('Downloading project to plugin:', projectData.projectId);
            // Implement project load logic
        }

        res.json({ success: true, message: 'Project synced successfully' });
    } catch (error) {
        console.error('Plugin project sync error:', error);
        res.status(500).json({ error: 'Failed to sync project' });
    }
});

// Get marketplace beats for plugin
router.get('/marketplace/beats', authenticatePlugin, async (req, res) => {
    try {
        const { category, limit = 20, offset = 0 } = req.query;

        const allBeats = await dataManager.getAllBeats();

        let filteredBeats = allBeats;

        if (category && category !== 'all') {
            filteredBeats = allBeats.filter(beat => beat.category === category);
        }

        const paginatedBeats = filteredBeats.slice(offset, offset + limit);

        res.json({
            beats: paginatedBeats,
            total: filteredBeats.length,
            limit,
            offset
        });
    } catch (error) {
        console.error('Plugin marketplace error:', error);
        res.status(500).json({ error: 'Failed to get marketplace beats' });
    }
});

// Plugin heartbeat/keepalive
router.post('/heartbeat', authenticatePlugin, (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        serverStatus: 'online'
    });
});

// Get plugin configuration
router.get('/config', authenticatePlugin, (req, res) => {
    res.json({
        features: {
            mixmaster1: true,
            finisher: true,
            collaboration: true,
            marketplace: true
        },
        limits: {
            maxTracks: 32,
            maxEffects: 16,
            cloudStorage: '10GB'
        },
        apiVersion: '1.0.0'
    });
});

module.exports = router;
