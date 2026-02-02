// Platform-Wide Analytics Routes
// For internal tracking of user traffic, revenue, and engagement

const express = require('express');
const router = express.Router();
const analyticsTracker = require('../utils/analyticsTracker');
const treasuryManager = require('../utils/treasuryManager');
const logger = require('../utils/logger');

// Mock admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    // In production, verify admin role from JWT token
    req.admin = { id: 'admin-id', role: 'admin', email: 'admin@creatorsync.com' };
    next();
};

// ============================================
// Traffic Tracking Endpoints
// ============================================

// Track page view
router.post('/track/page-view', (req, res) => {
    try {
        const { page, userId, sessionId, referrer, device, browser, country } = req.body;

        const result = analyticsTracker.trackPageView({
            page,
            userId,
            sessionId,
            referrer,
            device,
            browser,
            country
        });

        res.json(result);
    } catch (error) {
        logger.error('Failed to track page view', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to track page view' });
    }
});

// Track session
router.post('/track/session', (req, res) => {
    try {
        const { sessionId, userId, action } = req.body;

        const result = analyticsTracker.trackSession(sessionId, userId, action);

        res.json(result);
    } catch (error) {
        logger.error('Failed to track session', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to track session' });
    }
});

// Track user interaction
router.post('/track/interaction', (req, res) => {
    try {
        const { feature, action, userId, sessionId, metadata } = req.body;

        const result = analyticsTracker.trackInteraction({
            feature,
            action,
            userId,
            sessionId,
            metadata
        });

        res.json(result);
    } catch (error) {
        logger.error('Failed to track interaction', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to track interaction' });
    }
});

// ============================================
// Analytics Dashboard (Admin Only)
// ============================================

// Get full platform analytics
router.get('/overview', authenticateAdmin, (req, res) => {
    try {
        const analytics = analyticsTracker.getFullAnalytics();
        const treasury = treasuryManager.getTreasurySnapshot();

        res.json({
            success: true,
            analytics: {
                ...analytics,
                treasury: {
                    totalRevenue: treasury.totalRevenue,
                    totalCommissions: treasury.totalCommissions,
                    pendingBalance: treasury.pendingBalance,
                    nextPayoutDate: treasury.nextPayoutDate
                }
            }
        });
    } catch (error) {
        logger.error('Failed to get platform analytics', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get analytics' });
    }
});

// Get traffic analytics
router.get('/traffic', authenticateAdmin, (req, res) => {
    try {
        const traffic = analyticsTracker.getTrafficAnalytics();

        res.json({
            success: true,
            traffic
        });
    } catch (error) {
        logger.error('Failed to get traffic analytics', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get traffic analytics' });
    }
});

// Get revenue analytics
router.get('/revenue', authenticateAdmin, (req, res) => {
    try {
        const revenue = analyticsTracker.getRevenueAnalytics();
        const treasury = treasuryManager.getTreasurySnapshot();

        res.json({
            success: true,
            revenue: {
                ...revenue,
                treasury: {
                    totalRevenue: treasury.totalRevenue,
                    totalCommissions: treasury.totalCommissions,
                    totalPayouts: treasury.totalPayouts,
                    pendingBalance: treasury.pendingBalance
                }
            }
        });
    } catch (error) {
        logger.error('Failed to get revenue analytics', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get revenue analytics' });
    }
});

// Get engagement analytics
router.get('/engagement', authenticateAdmin, (req, res) => {
    try {
        const engagement = analyticsTracker.getEngagementAnalytics();

        res.json({
            success: true,
            engagement
        });
    } catch (error) {
        logger.error('Failed to get engagement analytics', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get engagement analytics' });
    }
});

// ============================================
// Bookkeeping & Reports
// ============================================

// Get daily snapshot
router.get('/snapshot/daily/:date?', authenticateAdmin, (req, res) => {
    try {
        const { date } = req.params;
        const snapshot = analyticsTracker.getDailySnapshot(date);

        if (!snapshot) {
            // Create snapshot for today if it doesn't exist
            const newSnapshot = analyticsTracker.createDailySnapshot();
            return res.json({
                success: true,
                snapshot: newSnapshot
            });
        }

        res.json({
            success: true,
            snapshot
        });
    } catch (error) {
        logger.error('Failed to get daily snapshot', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get daily snapshot' });
    }
});

// Create daily snapshot manually
router.post('/snapshot/daily', authenticateAdmin, (req, res) => {
    try {
        const snapshot = analyticsTracker.createDailySnapshot();

        res.json({
            success: true,
            message: 'Daily snapshot created',
            snapshot
        });
    } catch (error) {
        logger.error('Failed to create daily snapshot', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create daily snapshot' });
    }
});

// Get monthly report
router.get('/report/monthly/:month?', authenticateAdmin, (req, res) => {
    try {
        const { month } = req.params;
        const report = analyticsTracker.getMonthlyReport(month);

        if (!report) {
            // Create report for current month if it doesn't exist
            const newReport = analyticsTracker.createMonthlyReport(month);
            return res.json({
                success: true,
                report: newReport
            });
        }

        res.json({
            success: true,
            report
        });
    } catch (error) {
        logger.error('Failed to get monthly report', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get monthly report' });
    }
});

// Create monthly report manually
router.post('/report/monthly', authenticateAdmin, (req, res) => {
    try {
        const { month } = req.body;
        const report = analyticsTracker.createMonthlyReport(month);

        res.json({
            success: true,
            message: 'Monthly report created',
            report
        });
    } catch (error) {
        logger.error('Failed to create monthly report', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to create monthly report' });
    }
});

// Get audit log
router.get('/audit-log', authenticateAdmin, (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const auditLog = analyticsTracker.getAuditLog(parseInt(limit));

        res.json({
            success: true,
            auditLog,
            count: auditLog.length
        });
    } catch (error) {
        logger.error('Failed to get audit log', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get audit log' });
    }
});

// ============================================
// Real-Time Stats
// ============================================

// Get real-time statistics
router.get('/realtime', authenticateAdmin, (req, res) => {
    try {
        const traffic = analyticsTracker.traffic;
        const engagement = analyticsTracker.engagement;

        const realtimeStats = {
            activeSessions: traffic.get('sessions').size,
            activeUsers: {
                current: engagement.get('activeUsers').get('daily').size,
                daily: engagement.get('activeUsers').get('daily').size,
                weekly: engagement.get('activeUsers').get('weekly').size
            },
            recentInteractions: analyticsTracker.getAuditLog(20).filter(log => log.type === 'interaction'),
            recentPageViews: analyticsTracker.getAuditLog(20).filter(log => log.type === 'page_view'),
            timestamp: new Date()
        };

        res.json({
            success: true,
            realtime: realtimeStats
        });
    } catch (error) {
        logger.error('Failed to get realtime stats', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to get realtime stats' });
    }
});

// ============================================
// Maintenance Endpoints
// ============================================

// Cleanup old sessions
router.post('/maintenance/cleanup-sessions', authenticateAdmin, (req, res) => {
    try {
        analyticsTracker.cleanupOldSessions();

        res.json({
            success: true,
            message: 'Old sessions cleaned up'
        });
    } catch (error) {
        logger.error('Failed to cleanup sessions', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to cleanup sessions' });
    }
});

// Reset daily metrics
router.post('/maintenance/reset-daily', authenticateAdmin, (req, res) => {
    try {
        analyticsTracker.resetDailyMetrics();

        res.json({
            success: true,
            message: 'Daily metrics reset'
        });
    } catch (error) {
        logger.error('Failed to reset daily metrics', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to reset daily metrics' });
    }
});

module.exports = router;
