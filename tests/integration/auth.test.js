const request = require('supertest');
const express = require('express');
const authRoutes = require('../../server/routes/auth');

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

jest.mock('../../server/utils/database', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(() => ({
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn()
    }))
  }))
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

/* eslint-env jest */

describe('Authentication Routes', () => {
  let app;
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const { getDb } = require('../../server/utils/database');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'user123' })
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword123');
      jwt.sign = jest.fn().mockReturnValue('token123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue({ email: 'test@example.com' })
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        username: 'testuser',
        role: 'user'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockUser)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('token123');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    it('should reject login with invalid credentials', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should verify a valid token', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockUser)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      jwt.verify = jest.fn().mockReturnValue({ userId: 'user123' });

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer validtoken123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid or missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
    });
  });
});
