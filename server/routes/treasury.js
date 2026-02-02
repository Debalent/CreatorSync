// Treasury and Revenue Management Routes
const express = require('express');
const router = express.Router();
const treasuryManager = require('../utils/treasuryManager');
const payoutScheduler = require('../utils/payoutScheduler');
const analyticsTracker = require('../utils/analyticsTracker');
const logger = require('../utils/logger');

// Mock admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    // In production, verify admin role from JWT token
    req.admin = { id: 'admin-id', role: 'admin', email: 'admin@creatorsync.com' };
    next();
};

// Get treasury overview
router.get('/treasury', authenticateAdmin, (req, res) => {
    try {
        const treasury = treasuryManager.getTreasurySnapshot();
        const schedulerStatus = payoutScheduler.getStatus();

        res.json({
            success: true,
            treasury,
            scheduler: schedulerStatus
        });
    } catch (error) {
        logger.error('Failed to get treasury overview', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve treasury information'
        });
    }
});

// Get payout history
router.get('/payouts/history', authenticateAdmin, (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const history = treasuryManager.getPayoutHistory(parseInt(limit));

        res.json({
            success: true,
            payouts: history,
            total: history.length
        });
    } catch (error) {
        logger.error('Failed to get payout history', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve payout history'
        });
    }
});

// Update business bank account
router.post('/bank-account/update', authenticateAdmin, (req, res) => {
    try {
        const { accountHolder, bankName, accountNumber, routingNumber, accountType } = req.body;

        if (!accountNumber || !routingNumber) {
            return res.status(400).json({
                success: false,
                error: 'Account number and routing number are required'
            });
        }

        const result = treasuryManager.updateBankAccount({
            accountHolder,
            bankName,
            accountNumber,
            routingNumber,
            accountType
        });

        logger.info('Business bank account updated via admin', {
            admin: req.admin.email,
            bankName
        });

        res.json(result);
    } catch (error) {
        logger.error('Failed to update bank account', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get scheduler status
router.get('/scheduler/status', authenticateAdmin, (req, res) => {
    try {
        const status = payoutScheduler.getStatus();
        res.json({
            success: true,
            scheduler: status
        });
    } catch (error) {
        logger.error('Failed to get scheduler status', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve scheduler status'
        });
    }
});

// Manual payout trigger (for testing or emergency payouts)
router.post('/payouts/manual-trigger', authenticateAdmin, async (req, res) => {
    try {
        const { amount } = req.body;

        logger.info('Manual payout triggered by admin', {
            admin: req.admin.email,
            amount: amount || 'full pending balance'
        });

        const result = amount
            ? await treasuryManager.triggerManualPayout(parseFloat(amount))
            : await payoutScheduler.manualTrigger();

        res.json({
            success: true,
            message: 'Manual payout processed',
            payout: result.payout,
            treasury: result.treasury
        });
    } catch (error) {
        logger.error('Failed to process manual payout', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start scheduler (usually called on server startup)
router.post('/scheduler/start', authenticateAdmin, (req, res) => {
    try {
        payoutScheduler.start();
        const status = payoutScheduler.getStatus();

        res.json({
            success: true,
            message: 'Payout scheduler started',
            scheduler: status
        });
    } catch (error) {
        logger.error('Failed to start scheduler', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to start payout scheduler'
        });
    }
});

// Stop scheduler
router.post('/scheduler/stop', authenticateAdmin, (req, res) => {
    try {
        payoutScheduler.stop();

        res.json({
            success: true,
            message: 'Payout scheduler stopped'
        });
    } catch (error) {
        logger.error('Failed to stop scheduler', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to stop payout scheduler'
        });
    }
});

// Record revenue (called automatically when payments are processed)
router.post('/revenue/record', authenticateAdmin, (req, res) => {
    try {
        const { transactionId, amount, commission, type, userId } = req.body;

        if (!transactionId || !amount || !commission) {
            return res.status(400).json({
                success: false,
                error: 'Transaction ID, amount, and commission are required'
            });
        }

        const result = treasuryManager.recordRevenue({
            transactionId,
            amount: parseFloat(amount),
            commission: parseFloat(commission),
            type: type || 'beat_sale',
            userId,
            timestamp: new Date()
        });

        // Also track in analytics for bookkeeping
        analyticsTracker.trackRevenue({
            transactionId,
            amount: parseFloat(amount),
            type: type || 'beat_sale',
            userId,
            timestamp: new Date()
        });

        res.json(result);
    } catch (error) {
        logger.error('Failed to record revenue', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
