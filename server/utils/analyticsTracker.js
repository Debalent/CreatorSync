// Analytics Tracker for User Traffic, Revenue, and Engagement
// Tracks all platform metrics for analytics and bookkeeping

const logger = require('./logger');

class AnalyticsTracker {
    constructor() {
        // Traffic metrics
        this.traffic = new Map([
            ['totalPageViews', 0],
            ['uniqueVisitors', new Set()],
            ['sessions', new Map()], // sessionId -> session data
            ['pageViews', new Map()], // page -> count
            ['referrers', new Map()], // referrer -> count
            ['devices', new Map()], // device type -> count
            ['browsers', new Map()], // browser -> count
            ['countries', new Map()] // country -> count
        ]);

        // Revenue metrics (syncs with treasury)
        this.revenue = new Map([
            ['totalRevenue', 0],
            ['revenueByType', new Map([
                ['beat_sales', 0],
                ['subscriptions', 0],
                ['collaborations', 0],
                ['other', 0]
            ])],
            ['revenueByDay', new Map()], // date -> amount
            ['revenueByMonth', new Map()], // month -> amount
            ['transactionCount', 0],
            ['averageTransactionValue', 0],
            ['topRevenueUsers', new Map()] // userId -> total revenue
        ]);

        // Engagement metrics
        this.engagement = new Map([
            ['totalInteractions', 0],
            ['featureUsage', new Map([
                ['beat_upload', 0],
                ['beat_purchase', 0],
                ['beat_preview', 0],
                ['collaboration_created', 0],
                ['collaboration_joined', 0],
                ['search_performed', 0],
                ['profile_viewed', 0],
                ['finisher_accessed', 0],
                ['mixmaster1_accessed', 0],
                ['ai_songwriter_used', 0]
            ])],
            ['userSessions', new Map()], // userId -> session metrics
            ['averageSessionDuration', 0],
            ['averageTimeOnPlatform', 0],
            ['activeUsers', new Map([
                ['daily', new Set()],
                ['weekly', new Set()],
                ['monthly', new Set()]
            ])],
            ['retentionRate', 0],
            ['bounceRate', 0]
        ]);

        // Bookkeeping data
        this.bookkeeping = new Map([
            ['dailySnapshots', new Map()], // date -> snapshot
            ['monthlyReports', new Map()], // month -> report
            ['auditLog', []] // Array of all tracked events
        ]);

        this.startTime = new Date();
        
        logger.info('Analytics Tracker initialized');
    }

    // ============================================
    // Traffic Tracking
    // ============================================

    trackPageView(data) {
        try {
            const { page, userId, sessionId, referrer, device, browser, country, timestamp = new Date() } = data;

            // Total page views
            this.traffic.set('totalPageViews', this.traffic.get('totalPageViews') + 1);

            // Unique visitors
            if (userId) {
                this.traffic.get('uniqueVisitors').add(userId);
            }

            // Page-specific views
            const pageViews = this.traffic.get('pageViews');
            pageViews.set(page, (pageViews.get(page) || 0) + 1);

            // Session tracking
            if (sessionId) {
                const sessions = this.traffic.get('sessions');
                if (!sessions.has(sessionId)) {
                    sessions.set(sessionId, {
                        id: sessionId,
                        userId,
                        startTime: timestamp,
                        lastActivity: timestamp,
                        pageViews: [],
                        interactions: 0
                    });
                }
                const session = sessions.get(sessionId);
                session.pageViews.push({ page, timestamp });
                session.lastActivity = timestamp;
            }

            // Referrer tracking
            if (referrer) {
                const referrers = this.traffic.get('referrers');
                referrers.set(referrer, (referrers.get(referrer) || 0) + 1);
            }

            // Device tracking
            if (device) {
                const devices = this.traffic.get('devices');
                devices.set(device, (devices.get(device) || 0) + 1);
            }

            // Browser tracking
            if (browser) {
                const browsers = this.traffic.get('browsers');
                browsers.set(browser, (browsers.get(browser) || 0) + 1);
            }

            // Country tracking
            if (country) {
                const countries = this.traffic.get('countries');
                countries.set(country, (countries.get(country) || 0) + 1);
            }

            this.logEvent('page_view', data);

            return { success: true };
        } catch (error) {
            logger.error('Failed to track page view', { error: error.message, data });
            return { success: false, error: error.message };
        }
    }

    trackSession(sessionId, userId, action = 'start') {
        try {
            const sessions = this.traffic.get('sessions');
            const timestamp = new Date();

            if (action === 'start') {
                sessions.set(sessionId, {
                    id: sessionId,
                    userId,
                    startTime: timestamp,
                    lastActivity: timestamp,
                    pageViews: [],
                    interactions: 0,
                    duration: 0
                });
            } else if (action === 'end') {
                const session = sessions.get(sessionId);
                if (session) {
                    session.endTime = timestamp;
                    session.duration = timestamp - session.startTime;
                    this.updateSessionMetrics();
                }
            }

            return { success: true };
        } catch (error) {
            logger.error('Failed to track session', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // Revenue Tracking
    // ============================================

    trackRevenue(data) {
        try {
            const { 
                transactionId, 
                amount, 
                type = 'other', 
                userId, 
                timestamp = new Date() 
            } = data;

            // Total revenue
            const currentTotal = this.revenue.get('totalRevenue');
            this.revenue.set('totalRevenue', currentTotal + amount);

            // Revenue by type
            const revenueByType = this.revenue.get('revenueByType');
            const currentTypeRevenue = revenueByType.get(type) || 0;
            revenueByType.set(type, currentTypeRevenue + amount);

            // Revenue by day
            const dateKey = timestamp.toISOString().split('T')[0];
            const revenueByDay = this.revenue.get('revenueByDay');
            revenueByDay.set(dateKey, (revenueByDay.get(dateKey) || 0) + amount);

            // Revenue by month
            const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
            const revenueByMonth = this.revenue.get('revenueByMonth');
            revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + amount);

            // Transaction count
            const currentCount = this.revenue.get('transactionCount');
            this.revenue.set('transactionCount', currentCount + 1);

            // Average transaction value
            const newTotal = currentTotal + amount;
            const newCount = currentCount + 1;
            this.revenue.set('averageTransactionValue', newTotal / newCount);

            // Top revenue users
            if (userId) {
                const topUsers = this.revenue.get('topRevenueUsers');
                topUsers.set(userId, (topUsers.get(userId) || 0) + amount);
            }

            this.logEvent('revenue', data);

            logger.info('Revenue tracked', {
                transactionId,
                amount,
                type,
                totalRevenue: newTotal
            });

            return { success: true };
        } catch (error) {
            logger.error('Failed to track revenue', { error: error.message, data });
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // Engagement Tracking
    // ============================================

    trackInteraction(data) {
        try {
            const { 
                feature, 
                action, 
                userId, 
                sessionId, 
                metadata = {}, 
                timestamp = new Date() 
            } = data;

            // Total interactions
            const currentTotal = this.engagement.get('totalInteractions');
            this.engagement.set('totalInteractions', currentTotal + 1);

            // Feature usage
            const featureUsage = this.engagement.get('featureUsage');
            const featureKey = `${feature}_${action}`.toLowerCase();
            
            if (featureUsage.has(feature)) {
                featureUsage.set(feature, featureUsage.get(feature) + 1);
            } else if (featureUsage.has(featureKey)) {
                featureUsage.set(featureKey, featureUsage.get(featureKey) + 1);
            }

            // User session engagement
            if (userId) {
                const userSessions = this.engagement.get('userSessions');
                if (!userSessions.has(userId)) {
                    userSessions.set(userId, {
                        totalInteractions: 0,
                        features: new Map(),
                        lastActive: timestamp,
                        firstActive: timestamp
                    });
                }
                const userSession = userSessions.get(userId);
                userSession.totalInteractions++;
                userSession.lastActive = timestamp;
                
                const userFeatures = userSession.features;
                userFeatures.set(feature, (userFeatures.get(feature) || 0) + 1);
            }

            // Update session interaction count
            if (sessionId) {
                const sessions = this.traffic.get('sessions');
                const session = sessions.get(sessionId);
                if (session) {
                    session.interactions++;
                    session.lastActivity = timestamp;
                }
            }

            // Track active users
            this.trackActiveUser(userId, timestamp);

            this.logEvent('interaction', data);

            return { success: true };
        } catch (error) {
            logger.error('Failed to track interaction', { error: error.message, data });
            return { success: false, error: error.message };
        }
    }

    trackActiveUser(userId, timestamp = new Date()) {
        if (!userId) return;

        const activeUsers = this.engagement.get('activeUsers');
        
        // Daily active users
        activeUsers.get('daily').add(userId);

        // Weekly active users
        activeUsers.get('weekly').add(userId);

        // Monthly active users
        activeUsers.get('monthly').add(userId);
    }

    // ============================================
    // Session Metrics
    // ============================================

    updateSessionMetrics() {
        try {
            const sessions = this.traffic.get('sessions');
            let totalDuration = 0;
            let completedSessions = 0;

            for (const session of sessions.values()) {
                if (session.duration > 0) {
                    totalDuration += session.duration;
                    completedSessions++;
                }
            }

            if (completedSessions > 0) {
                const avgDuration = totalDuration / completedSessions;
                this.engagement.set('averageSessionDuration', avgDuration);
            }
        } catch (error) {
            logger.error('Failed to update session metrics', { error: error.message });
        }
    }

    // ============================================
    // Bookkeeping & Snapshots
    // ============================================

    createDailySnapshot() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const snapshot = {
                date: today,
                timestamp: new Date(),
                traffic: {
                    totalPageViews: this.traffic.get('totalPageViews'),
                    uniqueVisitors: this.traffic.get('uniqueVisitors').size,
                    activeSessions: this.traffic.get('sessions').size
                },
                revenue: {
                    totalRevenue: this.revenue.get('totalRevenue'),
                    transactionCount: this.revenue.get('transactionCount'),
                    averageTransactionValue: this.revenue.get('averageTransactionValue'),
                    revenueByType: Object.fromEntries(this.revenue.get('revenueByType'))
                },
                engagement: {
                    totalInteractions: this.engagement.get('totalInteractions'),
                    activeUsers: {
                        daily: this.engagement.get('activeUsers').get('daily').size,
                        weekly: this.engagement.get('activeUsers').get('weekly').size,
                        monthly: this.engagement.get('activeUsers').get('monthly').size
                    },
                    averageSessionDuration: this.engagement.get('averageSessionDuration')
                }
            };

            this.bookkeeping.get('dailySnapshots').set(today, snapshot);

            logger.info('Daily snapshot created', { date: today });

            return snapshot;
        } catch (error) {
            logger.error('Failed to create daily snapshot', { error: error.message });
            return null;
        }
    }

    createMonthlyReport(month) {
        try {
            const monthKey = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const revenueByMonth = this.revenue.get('revenueByMonth');
            const monthRevenue = revenueByMonth.get(monthKey) || 0;

            const report = {
                month: monthKey,
                timestamp: new Date(),
                revenue: {
                    total: monthRevenue,
                    byType: Object.fromEntries(this.revenue.get('revenueByType')),
                    transactions: this.revenue.get('transactionCount'),
                    averageValue: this.revenue.get('averageTransactionValue')
                },
                traffic: {
                    totalViews: this.traffic.get('totalPageViews'),
                    uniqueVisitors: this.traffic.get('uniqueVisitors').size,
                    topPages: Array.from(this.traffic.get('pageViews').entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                },
                engagement: {
                    totalInteractions: this.engagement.get('totalInteractions'),
                    activeUsers: this.engagement.get('activeUsers').get('monthly').size,
                    topFeatures: Array.from(this.engagement.get('featureUsage').entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                }
            };

            this.bookkeeping.get('monthlyReports').set(monthKey, report);

            logger.info('Monthly report created', { month: monthKey });

            return report;
        } catch (error) {
            logger.error('Failed to create monthly report', { error: error.message });
            return null;
        }
    }

    logEvent(type, data) {
        const auditLog = this.bookkeeping.get('auditLog');
        auditLog.push({
            type,
            timestamp: new Date(),
            data
        });

        // Keep only last 10000 events to prevent memory issues
        if (auditLog.length > 10000) {
            auditLog.shift();
        }
    }

    // ============================================
    // Analytics Retrieval
    // ============================================

    getTrafficAnalytics() {
        return {
            totalPageViews: this.traffic.get('totalPageViews'),
            uniqueVisitors: this.traffic.get('uniqueVisitors').size,
            activeSessions: this.traffic.get('sessions').size,
            topPages: Array.from(this.traffic.get('pageViews').entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([page, views]) => ({ page, views })),
            topReferrers: Array.from(this.traffic.get('referrers').entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([referrer, count]) => ({ referrer, count })),
            deviceBreakdown: Object.fromEntries(this.traffic.get('devices')),
            browserBreakdown: Object.fromEntries(this.traffic.get('browsers')),
            countryBreakdown: Object.fromEntries(this.traffic.get('countries'))
        };
    }

    getRevenueAnalytics() {
        const topUsers = Array.from(this.revenue.get('topRevenueUsers').entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([userId, revenue]) => ({ userId, revenue }));

        const last30Days = Array.from(this.revenue.get('revenueByDay').entries())
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 30)
            .map(([date, amount]) => ({ date, amount }));

        return {
            totalRevenue: this.revenue.get('totalRevenue'),
            revenueByType: Object.fromEntries(this.revenue.get('revenueByType')),
            transactionCount: this.revenue.get('transactionCount'),
            averageTransactionValue: this.revenue.get('averageTransactionValue'),
            topRevenueUsers: topUsers,
            last30Days,
            monthlyTrend: Object.fromEntries(this.revenue.get('revenueByMonth'))
        };
    }

    getEngagementAnalytics() {
        const topFeatures = Array.from(this.engagement.get('featureUsage').entries())
            .sort((a, b) => b[1] - a[1])
            .map(([feature, count]) => ({ feature, count }));

        return {
            totalInteractions: this.engagement.get('totalInteractions'),
            featureUsage: topFeatures,
            activeUsers: {
                daily: this.engagement.get('activeUsers').get('daily').size,
                weekly: this.engagement.get('activeUsers').get('weekly').size,
                monthly: this.engagement.get('activeUsers').get('monthly').size
            },
            averageSessionDuration: Math.round(this.engagement.get('averageSessionDuration') / 1000), // seconds
            totalUsers: this.engagement.get('userSessions').size
        };
    }

    getFullAnalytics() {
        return {
            traffic: this.getTrafficAnalytics(),
            revenue: this.getRevenueAnalytics(),
            engagement: this.getEngagementAnalytics(),
            uptime: Math.floor((new Date() - this.startTime) / 1000) // seconds
        };
    }

    getDailySnapshot(date) {
        const dateKey = date || new Date().toISOString().split('T')[0];
        return this.bookkeeping.get('dailySnapshots').get(dateKey);
    }

    getMonthlyReport(month) {
        const monthKey = month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        return this.bookkeeping.get('monthlyReports').get(monthKey);
    }

    getAuditLog(limit = 100) {
        const auditLog = this.bookkeeping.get('auditLog');
        return auditLog.slice(-limit).reverse();
    }

    // ============================================
    // Cleanup & Maintenance
    // ============================================

    cleanupOldSessions() {
        try {
            const sessions = this.traffic.get('sessions');
            const now = new Date();
            const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);

            for (const [sessionId, session] of sessions.entries()) {
                if (session.lastActivity < thirtyMinutesAgo) {
                    sessions.delete(sessionId);
                }
            }

            logger.info('Old sessions cleaned up');
        } catch (error) {
            logger.error('Failed to cleanup sessions', { error: error.message });
        }
    }

    resetDailyMetrics() {
        try {
            // Reset daily active users
            this.engagement.get('activeUsers').get('daily').clear();

            logger.info('Daily metrics reset');
        } catch (error) {
            logger.error('Failed to reset daily metrics', { error: error.message });
        }
    }

    resetWeeklyMetrics() {
        try {
            // Reset weekly active users
            this.engagement.get('activeUsers').get('weekly').clear();

            logger.info('Weekly metrics reset');
        } catch (error) {
            logger.error('Failed to reset weekly metrics', { error: error.message });
        }
    }

    resetMonthlyMetrics() {
        try {
            // Reset monthly active users
            this.engagement.get('activeUsers').get('monthly').clear();

            logger.info('Monthly metrics reset');
        } catch (error) {
            logger.error('Failed to reset monthly metrics', { error: error.message });
        }
    }
}

// Export singleton instance
const analyticsTracker = new AnalyticsTracker();

module.exports = analyticsTracker;
