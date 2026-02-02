// Analytics and Reporting Routes
// Provides insights into user behavior, beat performance, and revenue metrics

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const dataManager = require('../utils/dataManager');
const analyticsTracker = require('../utils/analyticsTracker');

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 */
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;

        // Get user-specific engagement data from analytics tracker
        const userSessions = analyticsTracker.engagement.get('userSessions');
        const userSession = userSessions.get(userId) || {
            totalInteractions: 0,
            features: new Map(),
            lastActive: new Date(),
            firstActive: new Date()
        };

        // Get user-specific or admin analytics
        const analytics = role === 'admin'
            ? await getAdminDashboard()
            : await getUserDashboard(userId);

        // Add real-time engagement data
        analytics.engagement = {
            ...analytics.engagement,
            totalInteractions: userSession.totalInteractions,
            featuresUsed: Array.from(userSession.features.entries()).map(([feature, count]) => ({
                feature,
                count
            })),
            lastActive: userSession.lastActive,
            memberSince: userSession.firstActive
        };

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        logger.error('Dashboard analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard analytics',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/analytics/beats/{beatId}:
 *   get:
 *     summary: Get analytics for a specific beat
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: beatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Beat analytics data
 */
router.get('/beats/:beatId', authenticate, async (req, res) => {
    try {
        const { beatId } = req.params;
        const analytics = await getBeatAnalytics(beatId, req.user.userId);

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        logger.error('Beat analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch beat analytics',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, all]
 *     responses:
 *       200:
 *         description: Revenue analytics data
 */
router.get('/revenue', authenticate, async (req, res) => {
    try {
        const { period = 'month' } = req.query;
        const userId = req.user.userId;
        const role = req.user.role;

        const revenue = role === 'admin'
            ? await getAdminRevenue(period)
            : await getUserRevenue(userId, period);

        res.json({
            success: true,
            data: revenue
        });
    } catch (error) {
        logger.error('Revenue analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch revenue analytics',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get trending beats and genres
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Trending data
 */
router.get('/trends', async (req, res) => {
    try {
        const trends = await getTrendingData();

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        logger.error('Trends analytics error:', error);
        res.status(500).json({
            error: 'Failed to fetch trends',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/analytics/track-event:
 *   post:
 *     summary: Track user event
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *               eventData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event tracked successfully
 */
router.post('/track-event', async (req, res) => {
    try {
        const { eventType, eventData } = req.body;
        const userId = req.user?.userId || 'anonymous';

        await trackEvent(userId, eventType, eventData);

        res.json({
            success: true,
            message: 'Event tracked successfully'
        });
    } catch (error) {
        logger.error('Event tracking error:', error);
        res.status(500).json({
            error: 'Failed to track event',
            message: error.message
        });
    }
});

// Helper functions
async function getUserDashboard(userId) {
    const beats = await dataManager.readData('beats.json');
    const userBeats = beats.beats?.filter(b => b.uploadedBy === userId) || [];

    const totalPlays = userBeats.reduce((sum, beat) => sum + (beat.plays || 0), 0);
    const totalDownloads = userBeats.reduce((sum, beat) => sum + (beat.downloads || 0), 0);
    const totalRevenue = userBeats.reduce((sum, beat) => sum + (beat.revenue || 0), 0);

    return {
        totalBeats: userBeats.length,
        totalPlays,
        totalDownloads,
        totalRevenue,
        averagePrice: userBeats.length > 0
            ? userBeats.reduce((sum, b) => sum + (b.price || 0), 0) / userBeats.length
            : 0,
        topBeats: userBeats
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, 5)
            .map(b => ({
                id: b.id,
                title: b.title,
                plays: b.plays || 0,
                revenue: b.revenue || 0
            }))
    };
}

async function getAdminDashboard() {
    const beats = await dataManager.readData('beats.json');
    const users = await dataManager.readData('users.json');

    const allBeats = beats.beats || [];
    const allUsers = users.users || [];

    const totalPlays = allBeats.reduce((sum, beat) => sum + (beat.plays || 0), 0);
    const totalRevenue = allBeats.reduce((sum, beat) => sum + (beat.revenue || 0), 0);

    return {
        totalUsers: allUsers.length,
        totalBeats: allBeats.length,
        totalPlays,
        totalRevenue,
        activeUsers: allUsers.filter(u => u.lastActive &&
            new Date(u.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        topProducers: getTopProducers(allBeats, allUsers).slice(0, 10)
    };
}

async function getBeatAnalytics(beatId, userId) {
    const beats = await dataManager.readData('beats.json');
    const beat = beats.beats?.find(b => b.id === beatId);

    if (!beat) {
        throw new Error('Beat not found');
    }

    // Check if user owns the beat or is admin
    if (beat.uploadedBy !== userId && userId !== 'admin') {
        throw new Error('Unauthorized');
    }

    return {
        beatId: beat.id,
        title: beat.title,
        plays: beat.plays || 0,
        downloads: beat.downloads || 0,
        likes: beat.likes || 0,
        revenue: beat.revenue || 0,
        playHistory: beat.playHistory || [],
        demographics: beat.demographics || {}
    };
}

async function getUserRevenue(userId, period) {
    const beats = await dataManager.readData('beats.json');
    const userBeats = beats.beats?.filter(b => b.uploadedBy === userId) || [];

    const now = Date.now();
    const periodMs = getPeriodMilliseconds(period);

    const revenueData = userBeats.map(beat => ({
        beatId: beat.id,
        title: beat.title,
        revenue: beat.revenue || 0,
        sales: beat.sales || 0
    }));

    return {
        period,
        totalRevenue: revenueData.reduce((sum, b) => sum + b.revenue, 0),
        totalSales: revenueData.reduce((sum, b) => sum + b.sales, 0),
        beats: revenueData
    };
}

async function getAdminRevenue(period) {
    const beats = await dataManager.readData('beats.json');
    const allBeats = beats.beats || [];

    const totalRevenue = allBeats.reduce((sum, beat) => sum + (beat.revenue || 0), 0);
    const totalSales = allBeats.reduce((sum, beat) => sum + (beat.sales || 0), 0);

    return {
        period,
        totalRevenue,
        totalSales,
        platformFee: totalRevenue * 0.15, // 15% platform fee
        producerEarnings: totalRevenue * 0.85
    };
}

async function getTrendingData() {
    const beats = await dataManager.readData('beats.json');
    const allBeats = beats.beats || [];

    // Get trending beats (most plays in last 7 days)
    const trendingBeats = allBeats
        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
        .slice(0, 10)
        .map(b => ({
            id: b.id,
            title: b.title,
            genre: b.genre,
            plays: b.plays || 0,
            uploadedBy: b.uploadedBy
        }));

    // Get trending genres
    const genreCounts = {};
    allBeats.forEach(beat => {
        const genre = beat.genre || 'Unknown';
        genreCounts[genre] = (genreCounts[genre] || 0) + (beat.plays || 0);
    });

    const trendingGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, plays]) => ({ genre, plays }));

    return {
        trendingBeats,
        trendingGenres
    };
}

function getTopProducers(beats, users) {
    const producerStats = {};

    beats.forEach(beat => {
        const producerId = beat.uploadedBy;
        if (!producerStats[producerId]) {
            producerStats[producerId] = {
                userId: producerId,
                totalBeats: 0,
                totalPlays: 0,
                totalRevenue: 0
            };
        }
        producerStats[producerId].totalBeats++;
        producerStats[producerId].totalPlays += beat.plays || 0;
        producerStats[producerId].totalRevenue += beat.revenue || 0;
    });

    return Object.values(producerStats)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

async function trackEvent(userId, eventType, eventData) {
    logger.info('Event tracked', {
        userId,
        eventType,
        eventData,
        timestamp: new Date().toISOString()
    });
    // In production, this would write to a dedicated analytics database
}

function getPeriodMilliseconds(period) {
    const periods = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
        all: Infinity
    };
    return periods[period] || periods.month;
}

module.exports = router;

