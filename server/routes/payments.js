// Payment Routes for CreatorSync
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock database for transactions
const transactions = new Map();
const userWallets = new Map();

// Mock authentication middleware
const authenticateUser = (req, res, next) => {
    req.user = { id: 'mock-user-id', username: 'MockUser', email: 'user@example.com' };
    next();
};

// Create payment intent for beat purchase
router.post('/create-payment-intent', authenticateUser, async (req, res) => {
    try {
        const { beatId, licenseType = 'standard', amount } = req.body;

        if (!beatId || !amount) {
            return res.status(400).json({ error: 'Beat ID and amount are required' });
        }

        // Validate amount (should be fetched from beat data in real implementation)
        const beatAmount = parseFloat(amount);
        if (beatAmount < 1) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Create payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(beatAmount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                beatId,
                licenseType,
                userId: req.user.id,
                userEmail: req.user.email
            },
            description: `CreatorSync Beat Purchase - ${beatId}`,
            receipt_email: req.user.email
        });

        // Store transaction record
        const transactionId = uuidv4();
        const transaction = {
            id: transactionId,
            paymentIntentId: paymentIntent.id,
            beatId,
            licenseType,
            amount: beatAmount,
            currency: 'usd',
            status: 'pending',
            userId: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        transactions.set(transactionId, transaction);

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            transactionId,
            amount: beatAmount
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({
            error: 'Failed to create payment intent',
            message: error.message
        });
    }
});

// Confirm payment and complete purchase
router.post('/confirm-payment', authenticateUser, async (req, res) => {
    try {
        const { paymentIntentId, transactionId } = req.body;

        if (!paymentIntentId || !transactionId) {
            return res.status(400).json({
                error: 'Payment intent ID and transaction ID are required'
            });
        }

        // Retrieve payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({
                error: 'Payment not completed',
                status: paymentIntent.status
            });
        }

        // Update transaction status
        const transaction = transactions.get(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        transaction.status = 'completed';
        transaction.completedAt = new Date();
        transaction.stripePaymentIntentId = paymentIntentId;
        transactions.set(transactionId, transaction);

        // Process beat purchase (grant access, send files, etc.)
        await this.processBeatPurchase(transaction);

        res.json({
            success: true,
            message: 'Payment confirmed and beat purchased successfully',
            transaction: {
                id: transaction.id,
                beatId: transaction.beatId,
                amount: transaction.amount,
                licenseType: transaction.licenseType,
                status: transaction.status,
                completedAt: transaction.completedAt
            }
        });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({
            error: 'Failed to confirm payment',
            message: error.message
        });
    }
});

// Get user's purchase history
router.get('/purchases', authenticateUser, (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const userId = req.user.id;

        // Filter transactions by user
        let userTransactions = Array.from(transactions.values())
            .filter(transaction => transaction.userId === userId);

        // Filter by status if provided
        if (status) {
            userTransactions = userTransactions.filter(transaction =>
                transaction.status === status
            );
        }

        // Sort by creation date (newest first)
        userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedTransactions = userTransactions.slice(startIndex, endIndex);

        res.json({
            success: true,
            purchases: paginatedTransactions,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: userTransactions.length,
                pages: Math.ceil(userTransactions.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({ error: 'Failed to get purchase history' });
    }
});

// Get user's earnings (for beat sellers)
router.get('/earnings', authenticateUser, (req, res) => {
    try {
        const { period = 'all' } = req.query;
        const userId = req.user.id;

        // Mock earnings data (replace with real database queries)
        const earnings = {
            total: 2847.50,
            available: 2103.25,
            pending: 744.25,
            thisMonth: 456.75,
            lastMonth: 389.25,
            growth: 17.3,
            transactions: [
                {
                    id: uuidv4(),
                    type: 'sale',
                    beatTitle: 'Urban Nights',
                    amount: 35.00,
                    fee: 3.50,
                    net: 31.50,
                    buyerUsername: 'Producer123',
                    date: new Date(),
                    status: 'completed'
                },
                {
                    id: uuidv4(),
                    type: 'sale',
                    beatTitle: 'Melodic Dreams',
                    amount: 25.00,
                    fee: 2.50,
                    net: 22.50,
                    buyerUsername: 'BeatLover',
                    date: new Date(),
                    status: 'completed'
                },
                {
                    id: uuidv4(),
                    type: 'sale',
                    beatTitle: 'Trap Anthem',
                    amount: 45.00,
                    fee: 4.50,
                    net: 40.50,
                    buyerUsername: 'Rapper456',
                    date: new Date(),
                    status: 'pending'
                }
            ],
            monthlyBreakdown: [
                { month: 'Jan', gross: 234.50, net: 210.75, sales: 12 },
                { month: 'Feb', gross: 345.75, net: 310.25, sales: 18 },
                { month: 'Mar', gross: 456.25, net: 410.75, sales: 23 },
                { month: 'Apr', gross: 567.00, net: 509.25, sales: 28 }
            ]
        };

        res.json({
            success: true,
            earnings
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ error: 'Failed to get earnings' });
    }
});

// Create payout request
router.post('/payout', authenticateUser, async (req, res) => {
    try {
        const { amount, method = 'stripe' } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        // Check available balance (mock check)
        const userWallet = userWallets.get(userId) || { available: 0 };
        if (amount > userWallet.available) {
            return res.status(400).json({ error: 'Insufficient available balance' });
        }

        // Create payout record
        const payoutId = uuidv4();
        const payout = {
            id: payoutId,
            userId,
            amount: parseFloat(amount),
            method,
            status: 'pending',
            requestedAt: new Date(),
            estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
        };

        // In real implementation, integrate with Stripe Connect or similar
        // const stripePayout = await stripe.payouts.create({
        //     amount: Math.round(amount * 100),
        //     currency: 'usd'
        // });

        // Update user wallet
        userWallet.available -= amount;
        userWallet.pending = (userWallet.pending || 0) + amount;
        userWallets.set(userId, userWallet);

        res.json({
            success: true,
            message: 'Payout requested successfully',
            payout: {
                id: payout.id,
                amount: payout.amount,
                status: payout.status,
                estimatedArrival: payout.estimatedArrival
            }
        });
    } catch (error) {
        console.error('Create payout error:', error);
        res.status(500).json({
            error: 'Failed to create payout request',
            message: error.message
        });
    }
});

// Get payout history
router.get('/payouts', authenticateUser, (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user.id;

        // Mock payout history
        const payouts = [
            {
                id: uuidv4(),
                amount: 150.00,
                method: 'stripe',
                status: 'completed',
                requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            },
            {
                id: uuidv4(),
                amount: 89.50,
                method: 'stripe',
                status: 'completed',
                requestedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
            },
            {
                id: uuidv4(),
                amount: 75.25,
                method: 'stripe',
                status: 'pending',
                requestedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                estimatedArrival: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
            }
        ];

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedPayouts = payouts.slice(startIndex, endIndex);

        res.json({
            success: true,
            payouts: paginatedPayouts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: payouts.length,
                pages: Math.ceil(payouts.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Get payouts error:', error);
        res.status(500).json({ error: 'Failed to get payout history' });
    }
});

// Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            // Update transaction status, grant access to beat, etc.
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            // Handle failed payment
            break;

        case 'payout.paid':
            const payout = event.data.object;
            console.log('Payout completed:', payout.id);
            // Update payout status
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Get transaction details
router.get('/transaction/:id', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const transaction = transactions.get(id);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check if user has access to this transaction
        if (transaction.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view this transaction' });
        }

        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({ error: 'Failed to get transaction details' });
    }
});

// Process beat purchase (internal function)
async function processBeatPurchase (transaction) {
    try {
        // In real implementation:
        // 1. Grant user access to beat files
        // 2. Send download links via email
        // 3. Update beat analytics
        // 4. Notify beat creator of sale
        // 5. Process revenue sharing

        console.log(`Processing beat purchase: ${transaction.beatId} for user: ${transaction.userId}`);

        // Mock implementation
        return {
            success: true,
            downloadLink: `/api/download/beat/${transaction.beatId}?token=${uuidv4()}`,
            licenseDocument: `/api/download/license/${transaction.id}`
        };
    } catch (error) {
        console.error('Process beat purchase error:', error);
        throw error;
    }
}

// Get payment statistics (admin/analytics)
router.get('/stats', authenticateUser, (req, res) => {
    try {
        // Mock payment statistics
        const stats = {
            totalRevenue: 125847.50,
            totalTransactions: 2847,
            averageTransactionValue: 44.25,
            monthlyGrowth: 18.5,
            topSellingBeats: [
                { beatId: '1', title: 'Urban Nights', sales: 47, revenue: 1175.00 },
                { beatId: '2', title: 'Melodic Dreams', sales: 38, revenue: 950.00 },
                { beatId: '3', title: 'Trap Anthem', sales: 34, revenue: 1190.00 }
            ],
            recentTransactions: Array.from(transactions.values())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
        };

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ error: 'Failed to get payment statistics' });
    }
});

module.exports = router;
