const request = require('supertest');
const express = require('express');

jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  requestLogger: (req, res, next) => next(),
  errorLogger: (err, req, res, next) => next()
}));

// Stripe mock — factory always returns the SAME instance so tests and route share it
jest.mock('stripe', () => {
  const mockInstance = {
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  };
  const factory = jest.fn().mockReturnValue(mockInstance);
  factory._instance = mockInstance;
  return factory;
});

jest.mock('../../server/utils/treasuryManager', () => ({
  recordRevenue: jest.fn(),
  getTreasurySnapshot: jest.fn(() => ({}))
}));

jest.mock('../../server/utils/analyticsTracker', () => ({
  trackRevenue: jest.fn(),
  trackInteraction: jest.fn(),
  getRevenueAnalytics: jest.fn(() => ({ totalRevenue: 0, transactionCount: 0, averageTransactionValue: 0, topRevenueUsers: [] }))
}));

// Require once — same Stripe instance shared with payments.js
const paymentRoutes = require('../../server/routes/payments');
const stripeFactory = require('stripe');
const stripeInstance = stripeFactory._instance;

describe('Payment Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRoutes);
    jest.clearAllMocks();
    paymentRoutes.transactions.clear();
    paymentRoutes.userWallets.clear();
  });

  describe('POST /api/payments/create-payment-intent', () => {
    it('should create a payment intent for a beat purchase', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'secret_123',
        amount: 4999,
        currency: 'usd'
      };

      stripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .send({ beatId: 'beat123', amount: 49.99 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clientSecret', 'secret_123');
      expect(response.body).toHaveProperty('transactionId');
      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4999, currency: 'usd' })
      );
    });

    it('should reject when beatId or amount is missing', async () => {
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .send({ beatId: 'beat123' }); // missing amount

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject when amount is less than 1', async () => {
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .send({ beatId: 'beat123', amount: 0.50 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/payments/confirm-payment', () => {
    it('should confirm a succeeded payment', async () => {
      const txId = 'tx-test-123';
      paymentRoutes.transactions.set(txId, {
        id: txId,
        paymentIntentId: 'pi_123',
        beatId: 'beat123',
        licenseType: 'standard',
        amount: 49.99,
        currency: 'usd',
        status: 'pending',
        userId: 'mock-user-id',
        commission: { platformCommission: 6.25, sellerEarnings: 43.74 },
        createdAt: new Date()
      });

      stripeInstance.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_123',
        status: 'succeeded'
      });

      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .send({ paymentIntentId: 'pi_123', transactionId: txId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transaction.status).toBe('completed');
    });

    it('should reject if payment has not succeeded', async () => {
      const txId = 'tx-pending-456';
      paymentRoutes.transactions.set(txId, {
        id: txId,
        paymentIntentId: 'pi_456',
        beatId: 'beat456',
        licenseType: 'standard',
        amount: 29.99,
        currency: 'usd',
        status: 'pending',
        userId: 'mock-user-id',
        commission: { platformCommission: 3.75, sellerEarnings: 26.24 },
        createdAt: new Date()
      });

      stripeInstance.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_456',
        status: 'requires_payment_method'
      });

      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .send({ paymentIntentId: 'pi_456', transactionId: txId });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should process a valid webhook event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123', amount: 4999 } }
      };

      stripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'sig_valid')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({}));

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('received', true);
    });

    it('should reject webhook with invalid signature', async () => {
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({}));

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payments/purchases', () => {
    it('should retrieve user purchase history', async () => {
      // Pre-populate with transactions owned by the hardcoded mock-user-id
      paymentRoutes.transactions.set('tx1', {
        id: 'tx1', beatId: 'beat1', amount: 49.99,
        currency: 'usd', status: 'completed',
        userId: 'mock-user-id', createdAt: new Date()
      });
      paymentRoutes.transactions.set('tx2', {
        id: 'tx2', beatId: 'beat2', amount: 29.99,
        currency: 'usd', status: 'completed',
        userId: 'mock-user-id', createdAt: new Date()
      });

      const response = await request(app).get('/api/payments/purchases');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.purchases)).toBe(true);
      expect(response.body.purchases.length).toBe(2);
    });
  });
});

