// Subscription Routes for The Finisher Integration
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const treasuryManager = require('../utils/treasuryManager');
const analyticsTracker = require('../utils/analyticsTracker');
const logger = require('../utils/logger');

// Mock subscription database
const subscriptions = new Map();
const users = new Map(); // Import from auth.js in real implementation

// Mock authentication middleware
const authenticateUser = (req, res, next) => {
    req.user = { id: 'mock-user-id', username: 'MockUser', email: 'user@example.com' };
    next();
};

// The Finisher subscription plans
const FINISHER_PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 9.99,
        stripePriceId: 'price_starter_monthly', // Replace with actual Stripe price ID
        billingPeriod: 'monthly',
        features: [
            'Basic audio processing',
            '5GB cloud storage',
            'Standard support',
            'CreatorSync integration'
        ],
        limits: {
            projects: 10,
            storage: 5 * 1024 * 1024 * 1024, // 5GB
            collaborators: 2
        }
    },
    'pro-monthly': {
        id: 'pro-monthly',
        name: 'Pro',
        price: 29.99,
        stripePriceId: 'price_pro_monthly', // Replace with actual Stripe price ID
        billingPeriod: 'monthly',
        features: [
            'Advanced audio processing',
            '100GB cloud storage',
            'Priority support',
            'Advanced collaboration tools',
            'Analytics dashboard',
            'Revenue sharing benefits'
        ],
        limits: {
            projects: 100,
            storage: 100 * 1024 * 1024 * 1024, // 100GB
            collaborators: 10
        }
    },
    'pro-yearly': {
        id: 'pro-yearly',
        name: 'Pro',
        price: 23.99,
        yearlyTotal: 287.90,
        stripePriceId: 'price_pro_yearly', // Replace with actual Stripe price ID
        billingPeriod: 'yearly',
        features: [
            'Advanced audio processing',
            '100GB cloud storage',
            'Priority support',
            'Advanced collaboration tools',
            'Analytics dashboard',
            'Revenue sharing benefits',
            'MixMaster1 access'
        ],
        limits: {
            projects: 100,
            storage: 100 * 1024 * 1024 * 1024, // 100GB
            collaborators: 10
        }
    },
    'enterprise-monthly': {
        id: 'enterprise-monthly',
        name: 'Enterprise',
        price: 99.99,
        stripePriceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
        billingPeriod: 'monthly',
        features: [
            'Professional audio suite',
            'Unlimited storage',
            '24/7 dedicated support',
            'White-label solutions',
            'Custom integrations',
            'Advanced revenue tools',
            'MixMaster1 access'
        ],
        limits: {
            projects: -1, // Unlimited
            storage: -1, // Unlimited
            collaborators: -1 // Unlimited
        }
    },
    'enterprise-yearly': {
        id: 'enterprise-yearly',
        name: 'Enterprise',
        price: 79.99,
        yearlyTotal: 959.90,
        stripePriceId: 'price_enterprise_yearly', // Replace with actual Stripe price ID
        billingPeriod: 'yearly',
        features: [
            'Professional audio suite',
            'Unlimited storage',
            '24/7 dedicated support',
            'White-label solutions',
            'Custom integrations',
            'Advanced revenue tools',
            'MixMaster1 access'
        ],
        limits: {
            projects: -1, // Unlimited
            storage: -1, // Unlimited
            collaborators: -1 // Unlimited
        }
    }
};

// Get subscription plans
router.get('/plans', (req, res) => {
    try {
        res.json({
            success: true,
            plans: Object.values(FINISHER_PLANS)
        });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get subscription plans' });
    }
});

// Create subscription checkout session
router.post('/create-subscription', authenticateUser, async (req, res) => {
    try {
        const { plan: planId } = req.body;
        const userId = req.user.id;

        const plan = FINISHER_PLANS[planId];
        if (!plan) {
            return res.status(400).json({ error: 'Invalid subscription plan' });
        }

        // Check if user already has an active subscription
        const existingSubscription = Array.from(subscriptions.values())
            .find(sub => sub.userId === userId && sub.status === 'active');

        if (existingSubscription) {
            return res.status(400).json({
                error: 'User already has an active subscription',
                currentPlan: existingSubscription.planId
            });
        }

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            customer_email: req.user.email,
            payment_method_types: [
                'card',              // Credit/Debit cards
                'cashapp',           // Cash App
                'link',              // Stripe Link
                'affirm',            // Buy now, pay later
                'afterpay_clearpay'  // Afterpay/Clearpay
            ],
            line_items: [{
                price: plan.stripePriceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/subscription/cancelled`,
            subscription_data: {
                trial_period_days: 15, // 15-day free trial
                trial_settings: {
                    end_behavior: {
                        missing_payment_method: 'cancel'
                    }
                },
                metadata: {
                    userId,
                    planId,
                    source: 'creatorsync',
                    discountFirstMonth: 'true' // 50% off first month after trial
                }
            },
            metadata: {
                userId,
                planId,
                source: 'creatorsync'
            },
            // Enable payment method collection during trial
            payment_method_collection: 'always',
            // Allow promotion codes
            allow_promotion_codes: true
        });

        // Create pending subscription record
        const subscriptionId = uuidv4();
        const subscription = {
            id: subscriptionId,
            userId,
            planId,
            status: 'pending',
            stripeSessionId: session.id,
            createdAt: new Date(),
            trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
            amount: plan.price,
            firstMonthDiscount: 0.5 // 50% off first month
        };

        subscriptions.set(subscriptionId, subscription);

        res.json({
            success: true,
            checkoutUrl: session.url,
            subscriptionId
        });
    } catch (error) {
        console.error('Create subscription error:', error);
        res.status(500).json({
            error: 'Failed to create subscription',
            message: error.message
        });
    }
});

// Handle successful subscription
router.post('/success', authenticateUser, async (req, res) => {
    try {
        const { sessionId } = req.body;

        // Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid' || session.mode === 'subscription') {
            // Find the subscription
            const subscription = Array.from(subscriptions.values())
                .find(sub => sub.stripeSessionId === sessionId);

            if (subscription) {
                // Activate subscription
                subscription.status = 'active';
                subscription.stripeSubscriptionId = session.subscription;
                subscription.activatedAt = new Date();
                subscriptions.set(subscription.id, subscription);

                // Update user with subscription info
                const user = users.get(subscription.userId);
                if (user) {
                    user.subscription = {
                        active: true,
                        planId: subscription.planId,
                        plan: FINISHER_PLANS[subscription.planId],
                        subscriptionId: subscription.id,
                        activatedAt: subscription.activatedAt,
                        trialEndsAt: subscription.trialEndsAt
                    };
                    users.set(subscription.userId, user);
                }

                // Grant access to The Finisher
                await this.grantFinisherAccess(subscription.userId, subscription.planId);

                res.json({
                    success: true,
                    message: 'Subscription activated successfully',
                    subscription: {
                        id: subscription.id,
                        planId: subscription.planId,
                        status: subscription.status,
                        activatedAt: subscription.activatedAt
                    }
                });
            } else {
                res.status(404).json({ error: 'Subscription not found' });
            }
        } else {
            res.status(400).json({ error: 'Payment not completed' });
        }
    } catch (error) {
        console.error('Subscription success error:', error);
        res.status(500).json({
            error: 'Failed to process subscription success',
            message: error.message
        });
    }
});

// Cancel subscription
router.post('/cancel', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find active subscription
        const subscription = Array.from(subscriptions.values())
            .find(sub => sub.userId === userId && sub.status === 'active');

        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel subscription in Stripe
        if (subscription.stripeSubscriptionId) {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                cancel_at_period_end: true
            });
        }

        // Update subscription status
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscriptions.set(subscription.id, subscription);

        // Update user
        const user = users.get(userId);
        if (user && user.subscription) {
            user.subscription.active = false;
            user.subscription.cancelledAt = subscription.cancelledAt;
            users.set(userId, user);
        }

        res.json({
            success: true,
            message: 'Subscription cancelled successfully',
            subscription: {
                id: subscription.id,
                status: subscription.status,
                cancelledAt: subscription.cancelledAt
            }
        });
    } catch (error) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({
            error: 'Failed to cancel subscription',
            message: error.message
        });
    }
});

// Get user's subscription status
router.get('/status', authenticateUser, (req, res) => {
    try {
        const userId = req.user.id;

        const subscription = Array.from(subscriptions.values())
            .find(sub => sub.userId === userId && (sub.status === 'active' || sub.status === 'trialing'));

        if (subscription) {
            const plan = FINISHER_PLANS[subscription.planId];
            res.json({
                success: true,
                subscription: {
                    id: subscription.id,
                    planId: subscription.planId,
                    plan,
                    status: subscription.status,
                    activatedAt: subscription.activatedAt,
                    trialEndsAt: subscription.trialEndsAt,
                    cancelledAt: subscription.cancelledAt,
                    hasFinisherAccess: subscription.status === 'active'
                }
            });
        } else {
            res.json({
                success: true,
                subscription: null,
                hasFinisherAccess: false
            });
        }
    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
});

// Get subscription analytics (for admin/business insights)
router.get('/analytics', authenticateUser, (req, res) => {
    try {
        // Mock analytics data
        const analytics = {
            totalSubscriptions: subscriptions.size,
            activeSubscriptions: Array.from(subscriptions.values())
                .filter(sub => sub.status === 'active').length,
            monthlyRevenue: 15847.50,
            conversionRate: 12.5,
            planDistribution: {
                starter: 45,
                pro: 38,
                enterprise: 17
            },
            churnRate: 5.2,
            averageLifetimeValue: 324.80,
            trialToPayConversion: 67.8,
            recentSubscriptions: Array.from(subscriptions.values())
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 10)
                .map(sub => ({
                    id: sub.id,
                    planId: sub.planId,
                    status: sub.status,
                    createdAt: sub.createdAt,
                    amount: sub.amount
                }))
        };

        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Get subscription analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// The Finisher access control with tiered features
router.get('/finisher-access', authenticateUser, (req, res) => {
    try {
        const userId = req.user.id;

        const subscription = Array.from(subscriptions.values())
            .find(sub => sub.userId === userId && sub.status === 'active');

        if (subscription) {
            const plan = FINISHER_PLANS[subscription.planId];

            // Define tiered features based on plan
            const tierFeatures = {
                starter: {
                    mixmaster1: true,
                    effectsSuite: false,
                    mastering: false,
                    collaboration: false,
                    unlimitedStorage: false,
                    prioritySupport: false
                },
                pro: {
                    mixmaster1: true,
                    effectsSuite: true,
                    mastering: true,
                    collaboration: true,
                    unlimitedStorage: false,
                    prioritySupport: true
                },
                enterprise: {
                    mixmaster1: true,
                    effectsSuite: true,
                    mastering: true,
                    collaboration: true,
                    unlimitedStorage: true,
                    prioritySupport: true,
                    whiteLabel: true
                }
            };

            res.json({
                success: true,
                hasAccess: true,
                plan: subscription.planId,
                planName: plan.name,
                features: tierFeatures[subscription.planId] || tierFeatures.starter,
                limits: plan.limits,
                finisherUrl: `/finisher-app.html?token=${this.generateFinisherToken(userId)}`,
                mixmasterUrl: `/mixmaster1-app.html?token=${this.generateFinisherToken(userId)}`,
                subscription: {
                    id: subscription.id,
                    planId: subscription.planId,
                    activatedAt: subscription.activatedAt
                }
            });
        } else {
            res.json({
                success: true,
                hasAccess: false,
                upgradeUrl: '/subscription/upgrade',
                message: 'Upgrade to access The Finisher and Mixmaster1'
            });
        }
    } catch (error) {
        console.error('Check Finisher access error:', error);
        res.status(500).json({ error: 'Failed to check access' });
    }
});

// Webhook to handle Stripe subscription events
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

        // Handle subscription events
        switch (event.type) {
        case 'customer.subscription.created':
            this.handleSubscriptionCreated(event.data.object);
            break;

        case 'customer.subscription.updated':
            this.handleSubscriptionUpdated(event.data.object);
            break;

        case 'customer.subscription.deleted':
            this.handleSubscriptionDeleted(event.data.object);
            break;

        case 'invoice.payment_succeeded':
            this.handlePaymentSucceeded(event.data.object);
            // Record subscription revenue in treasury
            try {
                const invoice = event.data.object;
                const subscriptionAmount = invoice.amount_paid / 100; // Convert from cents
                const commission = subscriptionAmount * 0.125; // 12.5% platform fee

                treasuryManager.recordRevenue({
                    transactionId: invoice.id,
                    amount: subscriptionAmount,
                    commission: commission,
                    type: 'subscription',
                    userId: invoice.customer,
                    timestamp: new Date(invoice.created * 1000)
                });

                logger.info('Subscription revenue recorded in treasury', {
                    invoiceId: invoice.id,
                    amount: subscriptionAmount,
                    commission: commission
                });
            } catch (revenueError) {
                logger.error('Failed to record subscription revenue', {
                    error: revenueError.message,
                    invoiceId: event.data.object.id
                });
            }
            break;

        case 'invoice.payment_failed':
            this.handlePaymentFailed(event.data.object);
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Helper functions
async function grantFinisherAccess (userId, planId) {
    // Implementation for granting access to The Finisher
    console.log(`Granting Finisher access to user ${userId} with plan ${planId}`);

    // In real implementation:
    // 1. Create user account in The Finisher system
    // 2. Set up plan limits and features
    // 3. Send welcome email with access instructions
    // 4. Configure integrations between CreatorSync and The Finisher
}

function generateFinisherToken (userId) {
    // Generate secure token for accessing The Finisher
    return `finisher_${userId}_${Date.now()}`;
}

function handleSubscriptionCreated (subscription) {
    console.log('Subscription created:', subscription.id);
    // Update subscription status in database
}

function handleSubscriptionUpdated (subscription) {
    console.log('Subscription updated:', subscription.id);
    // Update subscription details in database
}

function handleSubscriptionDeleted (subscription) {
    console.log('Subscription deleted:', subscription.id);
    // Handle subscription cancellation
}

function handlePaymentSucceeded (invoice) {
    console.log('Payment succeeded:', invoice.id);
    // Renew subscription, send receipt
}

function handlePaymentFailed (invoice) {
    console.log('Payment failed:', invoice.id);
    // Handle failed payment, notify user
}

module.exports = router;
