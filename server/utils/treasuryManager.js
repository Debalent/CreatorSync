// Treasury Manager - Internal Revenue Collection and Payout System
const { logger } = require('./logger');

class TreasuryManager {
    constructor() {
        this.treasury = new Map();
        this.payoutHistory = [];
        this.pendingPayouts = [];
        this.businessBankAccount = {
            accountHolder: process.env.BUSINESS_ACCOUNT_HOLDER || 'Pending Setup',
            bankName: process.env.BUSINESS_BANK_NAME || 'Pending Setup',
            accountNumber: process.env.BUSINESS_ACCOUNT_NUMBER || 'xxxx-xxxx-xxxx',
            routingNumber: process.env.BUSINESS_ROUTING_NUMBER || 'xxxxxxxxx',
            accountType: process.env.BUSINESS_ACCOUNT_TYPE || 'checking',
            configured: this.isAccountConfigured()
        };

        this.initializeTreasury();
    }

    isAccountConfigured() {
        return process.env.BUSINESS_ACCOUNT_NUMBER &&
               process.env.BUSINESS_ROUTING_NUMBER &&
               process.env.BUSINESS_ACCOUNT_NUMBER !== 'xxxx-xxxx-xxxx';
    }

    initializeTreasury() {
        // Initialize treasury with default values
        this.treasury.set('totalRevenue', 0);
        this.treasury.set('totalCommissions', 0);
        this.treasury.set('totalPayouts', 0);
        this.treasury.set('pendingBalance', 0);
        this.treasury.set('lastPayoutDate', null);
        this.treasury.set('nextPayoutDate', this.calculateNextPayoutDate());

        logger.info('Treasury Manager initialized', {
            accountConfigured: this.businessBankAccount.configured,
            nextPayoutDate: this.treasury.get('nextPayoutDate')
        });
    }

    // Record revenue from a transaction
    recordRevenue(transaction) {
        try {
            const { amount, commission, type = 'beat_sale', transactionId, userId, timestamp } = transaction;

            const revenue = {
                id: transactionId,
                amount: parseFloat(amount),
                commission: parseFloat(commission),
                type,
                userId,
                timestamp: timestamp || new Date(),
                status: 'collected',
                payoutScheduled: false
            };

            // Update treasury totals
            const currentRevenue = this.treasury.get('totalRevenue');
            const currentCommissions = this.treasury.get('totalCommissions');
            const currentPending = this.treasury.get('pendingBalance');

            this.treasury.set('totalRevenue', currentRevenue + revenue.amount);
            this.treasury.set('totalCommissions', currentCommissions + revenue.commission);
            this.treasury.set('pendingBalance', currentPending + revenue.commission);

            logger.info('Revenue recorded', {
                transactionId,
                amount: revenue.amount,
                commission: revenue.commission,
                newPendingBalance: this.treasury.get('pendingBalance')
            });

            return {
                success: true,
                revenue,
                treasury: this.getTreasurySnapshot()
            };
        } catch (error) {
            logger.error('Failed to record revenue', { error: error.message, transaction });
            throw error;
        }
    }

    // Calculate next Friday at 8:00 AM
    calculateNextPayoutDate() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
        const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // If today is Friday, next Friday is in 7 days

        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + daysUntilFriday);
        nextFriday.setHours(8, 0, 0, 0); // Set to 8:00 AM

        // If it's already past 8:00 AM on Friday, schedule for next Friday
        if (dayOfWeek === 5 && now.getHours() >= 8) {
            nextFriday.setDate(nextFriday.getDate() + 7);
        }

        return nextFriday;
    }

    // Process weekly payout
    async processWeeklyPayout() {
        try {
            const pendingBalance = this.treasury.get('pendingBalance');

            if (pendingBalance <= 0) {
                logger.info('No pending balance to payout');
                return {
                    success: true,
                    message: 'No pending balance',
                    amount: 0
                };
            }

            if (!this.businessBankAccount.configured) {
                logger.warn('Business bank account not configured - payout skipped', {
                    pendingBalance
                });

                return {
                    success: false,
                    message: 'Business bank account not configured',
                    pendingBalance,
                    action: 'Configure bank account to enable automatic payouts'
                };
            }

            const payout = {
                id: `payout_${Date.now()}`,
                amount: pendingBalance,
                date: new Date(),
                status: 'processing',
                bankAccount: {
                    accountHolder: this.businessBankAccount.accountHolder,
                    bankName: this.businessBankAccount.bankName,
                    accountLast4: this.businessBankAccount.accountNumber.slice(-4)
                },
                method: 'ACH',
                estimatedArrival: this.calculateArrivalDate()
            };

            // In production, integrate with Stripe Payouts or bank API
            // For now, simulate the payout
            await this.simulateBankTransfer(payout);

            // Update treasury
            this.treasury.set('totalPayouts', this.treasury.get('totalPayouts') + pendingBalance);
            this.treasury.set('pendingBalance', 0);
            this.treasury.set('lastPayoutDate', payout.date);
            this.treasury.set('nextPayoutDate', this.calculateNextPayoutDate());

            payout.status = 'completed';
            this.payoutHistory.push(payout);

            logger.info('Weekly payout processed', {
                payoutId: payout.id,
                amount: payout.amount,
                nextPayoutDate: this.treasury.get('nextPayoutDate')
            });

            return {
                success: true,
                payout,
                treasury: this.getTreasurySnapshot()
            };
        } catch (error) {
            logger.error('Failed to process weekly payout', { error: error.message });
            throw error;
        }
    }

    // Simulate bank transfer (replace with real API in production)
    async simulateBankTransfer(payout) {
        return new Promise((resolve) => {
            // Simulate processing delay
            setTimeout(() => {
                logger.info('Bank transfer simulated', {
                    payoutId: payout.id,
                    amount: payout.amount,
                    method: payout.method
                });
                resolve();
            }, 1000);
        });
    }

    // Calculate estimated arrival date (typically 1-3 business days for ACH)
    calculateArrivalDate() {
        const arrival = new Date();
        arrival.setDate(arrival.getDate() + 3); // 3 business days
        return arrival;
    }

    // Get current treasury snapshot
    getTreasurySnapshot() {
        return {
            totalRevenue: this.treasury.get('totalRevenue'),
            totalCommissions: this.treasury.get('totalCommissions'),
            totalPayouts: this.treasury.get('totalPayouts'),
            pendingBalance: this.treasury.get('pendingBalance'),
            lastPayoutDate: this.treasury.get('lastPayoutDate'),
            nextPayoutDate: this.treasury.get('nextPayoutDate'),
            businessBankAccount: {
                configured: this.businessBankAccount.configured,
                accountHolder: this.businessBankAccount.accountHolder,
                bankName: this.businessBankAccount.bankName,
                accountLast4: this.businessBankAccount.configured ?
                    this.businessBankAccount.accountNumber.slice(-4) : 'Not Set'
            }
        };
    }

    // Update business bank account details
    updateBankAccount(accountDetails) {
        try {
            const { accountHolder, bankName, accountNumber, routingNumber, accountType } = accountDetails;

            if (!accountNumber || !routingNumber) {
                throw new Error('Account number and routing number are required');
            }

            this.businessBankAccount = {
                accountHolder: accountHolder || 'Business Account',
                bankName: bankName || 'Unknown Bank',
                accountNumber,
                routingNumber,
                accountType: accountType || 'checking',
                configured: true,
                updatedAt: new Date()
            };

            logger.info('Business bank account updated', {
                accountHolder: this.businessBankAccount.accountHolder,
                bankName: this.businessBankAccount.bankName
            });

            return {
                success: true,
                message: 'Bank account updated successfully',
                account: {
                    accountHolder: this.businessBankAccount.accountHolder,
                    bankName: this.businessBankAccount.bankName,
                    accountLast4: accountNumber.slice(-4),
                    configured: true
                }
            };
        } catch (error) {
            logger.error('Failed to update bank account', { error: error.message });
            throw error;
        }
    }

    // Get payout history
    getPayoutHistory(limit = 20) {
        return this.payoutHistory
            .slice(-limit)
            .reverse()
            .map(payout => ({
                id: payout.id,
                amount: payout.amount,
                date: payout.date,
                status: payout.status,
                method: payout.method,
                estimatedArrival: payout.estimatedArrival,
                bankAccountLast4: payout.bankAccount.accountLast4
            }));
    }

    // Manual payout trigger (for testing or emergency payouts)
    async triggerManualPayout(amount = null) {
        const pendingBalance = this.treasury.get('pendingBalance');
        const payoutAmount = amount || pendingBalance;

        if (payoutAmount > pendingBalance) {
            throw new Error('Payout amount exceeds pending balance');
        }

        logger.info('Manual payout triggered', { amount: payoutAmount });

        return await this.processWeeklyPayout();
    }
}

// Singleton instance
const treasuryManager = new TreasuryManager();

module.exports = treasuryManager;
