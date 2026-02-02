// Automatic Weekly Payout Scheduler
// Runs every Friday at 8:00 AM to process payouts to business bank account

const cron = require('node-cron');
const treasuryManager = require('./treasuryManager');
const logger = require('./logger');

class PayoutScheduler {
    constructor() {
        this.scheduledTask = null;
        this.isRunning = false;
    }

    // Initialize the scheduler
    start() {
        if (this.isRunning) {
            logger.warn('Payout scheduler is already running');
            return;
        }

        // Schedule for every Friday at 8:00 AM
        // Cron pattern: '0 8 * * 5' = minute 0, hour 8, any day of month, any month, Friday (5)
        this.scheduledTask = cron.schedule('0 8 * * 5', async () => {
            logger.info('Scheduled payout triggered - Friday 8:00 AM');
            await this.executeWeeklyPayout();
        }, {
            scheduled: true,
            timezone: process.env.TIMEZONE || 'America/New_York'
        });

        this.isRunning = true;

        const nextPayout = treasuryManager.getTreasurySnapshot().nextPayoutDate;
        logger.info('Payout scheduler started', {
            schedule: 'Every Friday at 8:00 AM',
            timezone: process.env.TIMEZONE || 'America/New_York',
            nextScheduledPayout: nextPayout
        });
    }

    // Stop the scheduler
    stop() {
        if (this.scheduledTask) {
            this.scheduledTask.stop();
            this.isRunning = false;
            logger.info('Payout scheduler stopped');
        }
    }

    // Execute the weekly payout
    async executeWeeklyPayout() {
        try {
            logger.info('Executing weekly payout...');

            const treasury = treasuryManager.getTreasurySnapshot();

            if (treasury.pendingBalance <= 0) {
                logger.info('No pending balance to payout', {
                    pendingBalance: treasury.pendingBalance
                });
                return {
                    success: true,
                    message: 'No pending balance',
                    skipped: true
                };
            }

            if (!treasury.businessBankAccount.configured) {
                logger.warn('Business bank account not configured - payout skipped', {
                    pendingBalance: treasury.pendingBalance,
                    action: 'Please configure business bank account'
                });
                return {
                    success: false,
                    message: 'Bank account not configured',
                    skipped: true
                };
            }

            // Process the payout
            const result = await treasuryManager.processWeeklyPayout();

            if (result.success) {
                logger.info('Weekly payout completed successfully', {
                    amount: result.payout.amount,
                    payoutId: result.payout.id,
                    estimatedArrival: result.payout.estimatedArrival
                });

                // Send notification email (if email service configured)
                await this.sendPayoutNotification(result.payout);
            }

            return result;
        } catch (error) {
            logger.error('Failed to execute weekly payout', {
                error: error.message,
                stack: error.stack
            });

            // Send alert notification
            await this.sendPayoutFailureAlert(error);

            throw error;
        }
    }

    // Send payout success notification
    async sendPayoutNotification(payout) {
        // In production, integrate with email service
        logger.info('Payout notification sent', {
            payoutId: payout.id,
            amount: payout.amount,
            estimatedArrival: payout.estimatedArrival
        });
    }

    // Send payout failure alert
    async sendPayoutFailureAlert(error) {
        logger.error('Payout failure alert', {
            error: error.message,
            timestamp: new Date()
        });
    }

    // Get scheduler status
    getStatus() {
        const treasury = treasuryManager.getTreasurySnapshot();
        return {
            isRunning: this.isRunning,
            schedule: 'Every Friday at 8:00 AM',
            timezone: process.env.TIMEZONE || 'America/New_York',
            nextScheduledPayout: treasury.nextPayoutDate,
            lastPayout: treasury.lastPayoutDate,
            pendingBalance: treasury.pendingBalance,
            bankAccountConfigured: treasury.businessBankAccount.configured
        };
    }

    // Manual trigger for testing
    async manualTrigger() {
        logger.info('Manual payout trigger initiated');
        return await this.executeWeeklyPayout();
    }
}

// Singleton instance
const payoutScheduler = new PayoutScheduler();

module.exports = payoutScheduler;
