const request = require('supertest');
const express = require('express');

// Mock dependencies before requiring the routes
jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  securityLogger: jest.fn(),
  requestLogger: (req, res, next) => next(),
  errorLogger: (err, req, res, next) => next()
}));

jest.mock('../../server/utils/dataManager', () => ({
  findUserByEmail: jest.fn(),
  addUser: jest.fn(),
  findUserById: jest.fn(),
  updateUser: jest.fn()
}));

jest.mock('../../server/utils/translationManager', () => ({
  translate: jest.fn(() => 'Success'),
  initialize: jest.fn()
}));

jest.mock('../../server/middleware/auth', () => ({
  generateToken: jest.fn(() => 'mock-jwt-token'),
  authenticate: (req, res, next) => next()
}));

jest.mock('bcrypt');

// Require once — same mock instance shared with the route module
const authRoutes = require('../../server/routes/auth');
const dataManager = require('../../server/utils/dataManager');
const bcrypt = require('bcrypt');

describe('Authentication Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
    authRoutes.sessions.clear();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      dataManager.findUserByEmail.mockResolvedValue(null);
      dataManager.addUser.mockResolvedValue();
      bcrypt.hash = jest.fn().mockResolvedValue('hashedPassword123');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(dataManager.addUser).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      dataManager.findUserByEmail.mockResolvedValue({ email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // missing username and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        username: 'testuser',
        role: 'user'
      };

      dataManager.findUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(true);

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

    it('should reject login when user does not exist', async () => {
      dataManager.findUserByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with incorrect password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        username: 'testuser'
      };

      dataManager.findUserByEmail.mockResolvedValue(mockUser);
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return profile for authenticated session', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashed'
      };

      const validToken = 'valid-session-token-abc';
      authRoutes.sessions.set(validToken, {
        userId: 'user123',
        token: validToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      dataManager.findUserById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });

    it('should reject request with expired session token', async () => {
      const expiredToken = 'expired-session-token';
      authRoutes.sessions.set(expiredToken, {
        userId: 'user123',
        token: expiredToken,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1000) // expired
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });
});
