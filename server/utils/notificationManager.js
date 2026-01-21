// Notification Manager
// Handles real-time notifications for user events

const { logger } = require('./logger');

class NotificationManager {
    constructor(io) {
        this.io = io;
        this.notifications = new Map(); // userId -> [notifications]
        this.userSockets = new Map(); // userId -> socketId
    }

    /**
     * Register a user's socket connection
     */
    registerUser(userId, socketId) {
        this.userSockets.set(userId, socketId);
        logger.info(`User ${userId} registered for notifications`);
    }

    /**
     * Unregister a user's socket connection
     */
    unregisterUser(userId) {
        this.userSockets.delete(userId);
        logger.info(`User ${userId} unregistered from notifications`);
    }

    /**
     * Send notification to a specific user
     */
    async sendNotification(userId, notification) {
        try {
            const notificationData = {
                id: this.generateNotificationId(),
                userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data || {},
                read: false,
                timestamp: new Date().toISOString()
            };

            // Store notification
            if (!this.notifications.has(userId)) {
                this.notifications.set(userId, []);
            }
            this.notifications.get(userId).push(notificationData);

            // Send real-time notification if user is connected
            const socketId = this.userSockets.get(userId);
            if (socketId && this.io) {
                this.io.to(socketId).emit('notification', notificationData);
                logger.info(`Real-time notification sent to user ${userId}`);
            }

            return notificationData;
        } catch (error) {
            logger.error('Error sending notification:', error);
            throw error;
        }
    }

    /**
     * Send notification to multiple users
     */
    async sendBulkNotifications(userIds, notification) {
        const results = await Promise.allSettled(
            userIds.map(userId => this.sendNotification(userId, notification))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        logger.info(`Bulk notifications sent: ${successful}/${userIds.length} successful`);

        return { successful, total: userIds.length };
    }

    /**
     * Get all notifications for a user
     */
    getUserNotifications(userId, options = {}) {
        const { unreadOnly = false, limit = 50 } = options;
        
        let notifications = this.notifications.get(userId) || [];

        if (unreadOnly) {
            notifications = notifications.filter(n => !n.read);
        }

        // Sort by timestamp (newest first)
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return notifications.slice(0, limit);
    }

    /**
     * Mark notification as read
     */
    markAsRead(userId, notificationId) {
        const notifications = this.notifications.get(userId);
        if (!notifications) return false;

        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            return true;
        }
        return false;
    }

    /**
     * Mark all notifications as read for a user
     */
    markAllAsRead(userId) {
        const notifications = this.notifications.get(userId);
        if (!notifications) return 0;

        let count = 0;
        notifications.forEach(n => {
            if (!n.read) {
                n.read = true;
                count++;
            }
        });

        return count;
    }

    /**
     * Delete a notification
     */
    deleteNotification(userId, notificationId) {
        const notifications = this.notifications.get(userId);
        if (!notifications) return false;

        const index = notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            notifications.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Clear all notifications for a user
     */
    clearAllNotifications(userId) {
        const count = (this.notifications.get(userId) || []).length;
        this.notifications.set(userId, []);
        return count;
    }

    /**
     * Get unread notification count
     */
    getUnreadCount(userId) {
        const notifications = this.notifications.get(userId) || [];
        return notifications.filter(n => !n.read).length;
    }

    /**
     * Send purchase notification
     */
    async notifyPurchase(sellerId, buyerId, beatTitle, amount) {
        await this.sendNotification(sellerId, {
            type: 'purchase',
            title: 'New Purchase!',
            message: `Your beat "${beatTitle}" was purchased for $${amount}`,
            data: { buyerId, beatTitle, amount }
        });

        await this.sendNotification(buyerId, {
            type: 'purchase_confirmation',
            title: 'Purchase Successful',
            message: `You successfully purchased "${beatTitle}"`,
            data: { beatTitle, amount }
        });
    }

    /**
     * Send collaboration invitation notification
     */
    async notifyCollaborationInvite(inviteeId, inviterId, inviterName, projectName) {
        await this.sendNotification(inviteeId, {
            type: 'collaboration_invite',
            title: 'Collaboration Invitation',
            message: `${inviterName} invited you to collaborate on "${projectName}"`,
            data: { inviterId, inviterName, projectName }
        });
    }

    /**
     * Send message notification
     */
    async notifyMessage(recipientId, senderId, senderName, messagePreview) {
        await this.sendNotification(recipientId, {
            type: 'message',
            title: 'New Message',
            message: `${senderName}: ${messagePreview}`,
            data: { senderId, senderName }
        });
    }

    /**
     * Send beat like notification
     */
    async notifyBeatLike(producerId, userId, username, beatTitle) {
        await this.sendNotification(producerId, {
            type: 'beat_like',
            title: 'Beat Liked',
            message: `${username} liked your beat "${beatTitle}"`,
            data: { userId, username, beatTitle }
        });
    }

    /**
     * Send subscription notification
     */
    async notifySubscription(userId, plan, status) {
        const messages = {
            activated: `Your ${plan} subscription has been activated!`,
            renewed: `Your ${plan} subscription has been renewed`,
            cancelled: `Your ${plan} subscription has been cancelled`,
            expired: `Your ${plan} subscription has expired`
        };

        await this.sendNotification(userId, {
            type: 'subscription',
            title: 'Subscription Update',
            message: messages[status] || 'Subscription status updated',
            data: { plan, status }
        });
    }

    /**
     * Send comment notification
     */
    async notifyComment(producerId, commenterId, commenterName, beatTitle, comment) {
        await this.sendNotification(producerId, {
            type: 'comment',
            title: 'New Comment',
            message: `${commenterName} commented on "${beatTitle}": ${comment.substring(0, 50)}...`,
            data: { commenterId, commenterName, beatTitle }
        });
    }

    /**
     * Send follower notification
     */
    async notifyNewFollower(userId, followerId, followerName) {
        await this.sendNotification(userId, {
            type: 'new_follower',
            title: 'New Follower',
            message: `${followerName} started following you`,
            data: { followerId, followerName }
        });
    }

    /**
     * Send beat featured notification
     */
    async notifyBeatFeatured(producerId, beatTitle) {
        await this.sendNotification(producerId, {
            type: 'beat_featured',
            title: 'Beat Featured!',
            message: `Your beat "${beatTitle}" has been featured on the homepage!`,
            data: { beatTitle }
        });
    }

    /**
     * Send milestone notification
     */
    async notifyMilestone(userId, milestone, value) {
        const milestones = {
            plays: `Your beats reached ${value} total plays!`,
            sales: `You've made ${value} sales!`,
            revenue: `You've earned $${value} in total revenue!`,
            followers: `You now have ${value} followers!`
        };

        await this.sendNotification(userId, {
            type: 'milestone',
            title: 'Milestone Achieved!',
            message: milestones[milestone] || `Milestone: ${milestone}`,
            data: { milestone, value }
        });
    }

    /**
     * Generate unique notification ID
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up old notifications (older than 30 days)
     */
    cleanupOldNotifications() {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        let totalCleaned = 0;

        for (const [userId, notifications] of this.notifications.entries()) {
            const filtered = notifications.filter(n => 
                new Date(n.timestamp) > thirtyDaysAgo
            );
            const cleaned = notifications.length - filtered.length;
            totalCleaned += cleaned;
            this.notifications.set(userId, filtered);
        }

        logger.info(`Cleaned up ${totalCleaned} old notifications`);
        return totalCleaned;
    }
}

module.exports = NotificationManager;

