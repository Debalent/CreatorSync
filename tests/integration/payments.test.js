const request = require('supertest');
const express = require('express');
const paymentRoutes = require('../../server/routes/payments');

// Mock dependencies
jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  requestLogger: (req, res, next) => next(),
  errorLogger: (err, req, res, next) => next()
}));

jest.mock('stripe', () => {
  return jest.fn(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

jest.mock('../../server/utils/database', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(() => ({
      findOne: jest.fn(),
      updateOne: jest.fn(),
      insertOne: jest.fn()
    }))
  }))
}));

jest.mock('../../server/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { userId: 'user123', username: 'testuser', email: 'test@example.com' };
    next();
  }
}));

jest.mock('../../server/utils/notificationManager', () => {
  return jest.fn().mockImplementation(() => ({
    sendNotification: jest.fn().mockResolvedValue(true)
  }));
});

describe('Payment Routes', () => {
  let app;
  const stripe = require('stripe');
  const { getDb } = require('../../server/utils/database');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/payments', paymentRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/payments/create-intent', () => {
    it('should create a payment intent for a beat purchase', async () => {
      const mockBeat = {
        _id: 'beat123',
        title: 'Test Beat',
        price: 49.99,
        userId: 'seller123'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const mockPaymentIntent = {
        id: 'pi_123',
        client_secret: 'secret_123',
        amount: 4999,
        currency: 'usd'
      };

      const stripeInstance = stripe();
      stripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          beatId: 'beat123',
          amount: 49.99
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('clientSecret');
      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4999,
          currency: 'usd'
        })
      );
    });

    it('should reject payment for non-existent beat', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          beatId: 'nonexistent',
          amount: 49.99
        });

      expect(response.status).toBe(404);
    });

    it('should validate payment amount matches beat price', async () => {
      const mockBeat = {
        _id: 'beat123',
        title: 'Test Beat',
        price: 49.99
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          beatId: 'beat123',
          amount: 29.99 // Wrong amount
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should process successful payment webhook', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            amount: 4999,
            metadata: {
              beatId: 'beat123',
              userId: 'user123'
            }
          }
        }
      };

      const mockBeat = {
        _id: 'beat123',
        title: 'Test Beat',
        userId: 'seller123'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'transaction123' })
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const stripeInstance = stripe();
      stripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'sig_test')
        .send({});

      expect(response.status).toBe(200);
    });

    it('should reject webhook with invalid signature', async () => {
      const stripeInstance = stripe();
      stripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'invalid_sig')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payments/history', () => {
    it('should retrieve user payment history', async () => {
      const mockPayments = [
        {
          _id: 'payment1',
          userId: 'user123',
          amount: 49.99,
          status: 'completed',
          createdAt: new Date()
        },
        {
          _id: 'payment2',
          userId: 'user123',
          amount: 29.99,
          status: 'completed',
          createdAt: new Date()
        }
      ];

      const mockCollection = {
        find: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockPayments)
        }))
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .get('/api/payments/history');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });
});
