// Notification Routes
// API endpoints for managing user notifications

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Notification manager will be injected by server
let notificationManager = null;

// Initialize notification manager
router.setNotificationManager = (manager) => {
    notificationManager = manager;
};

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: unreadOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const { unreadOnly = false, limit = 50 } = req.query;

        const notifications = notificationManager.getUserNotifications(userId, {
            unreadOnly: unreadOnly === 'true',
            limit: parseInt(limit)
        });

        const unreadCount = notificationManager.getUnreadCount(userId);

        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
                total: notifications.length
            }
        });
    } catch (error) {
        logger.error('Get notifications error:', error);
        res.status(500).json({
            error: 'Failed to fetch notifications',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get('/unread-count', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const count = notificationManager.getUnreadCount(userId);

        res.json({
            success: true,
            data: { count }
        });
    } catch (error) {
        logger.error('Get unread count error:', error);
        res.status(500).json({
            error: 'Failed to fetch unread count',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/:notificationId/read', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const { notificationId } = req.params;

        const success = notificationManager.markAsRead(userId, notificationId);

        if (success) {
            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } else {
            res.status(404).json({
                error: 'Notification not found'
            });
        }
    } catch (error) {
        logger.error('Mark as read error:', error);
        res.status(500).json({
            error: 'Failed to mark notification as read',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/read-all', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const count = notificationManager.markAllAsRead(userId);

        res.json({
            success: true,
            message: `${count} notifications marked as read`
        });
    } catch (error) {
        logger.error('Mark all as read error:', error);
        res.status(500).json({
            error: 'Failed to mark all notifications as read',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete('/:notificationId', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const { notificationId } = req.params;

        const success = notificationManager.deleteNotification(userId, notificationId);

        if (success) {
            res.json({
                success: true,
                message: 'Notification deleted'
            });
        } else {
            res.status(404).json({
                error: 'Notification not found'
            });
        }
    } catch (error) {
        logger.error('Delete notification error:', error);
        res.status(500).json({
            error: 'Failed to delete notification',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/clear-all:
 *   delete:
 *     summary: Clear all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared
 */
router.delete('/clear-all', authenticate, (req, res) => {
    try {
        const userId = req.user.userId;
        const count = notificationManager.clearAllNotifications(userId);

        res.json({
            success: true,
            message: `${count} notifications cleared`
        });
    } catch (error) {
        logger.error('Clear all notifications error:', error);
        res.status(500).json({
            error: 'Failed to clear notifications',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send a test notification (development only)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Test notification sent
 */
router.post('/test', authenticate, async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                error: 'Test notifications are disabled in production'
            });
        }

        const userId = req.user.userId;
        const { type = 'test', title = 'Test Notification', message = 'This is a test notification' } = req.body;

        await notificationManager.sendNotification(userId, {
            type,
            title,
            message
        });

        res.json({
            success: true,
            message: 'Test notification sent'
        });
    } catch (error) {
        logger.error('Send test notification error:', error);
        res.status(500).json({
            error: 'Failed to send test notification',
            message: error.message
        });
    }
});

module.exports = router;

