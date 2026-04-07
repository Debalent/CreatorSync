const { authenticate, socketAuth } = require('../../server/middleware/auth');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../server/utils/database', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(() => ({
      findOne: jest.fn()
    }))
  }))
}));

jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  const { getDb } = require('../../server/utils/database');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('authenticate - REST API Authentication', () => {
    it('should authenticate valid JWT token', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockUser)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      jwt.verify = jest.fn().mockReturnValue({ userId: 'user123' });

      const req = {
        headers: { authorization: 'Bearer validtoken123' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('user123');
    });

    it('should reject request without token', async () => {
      const req = {
        headers: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = {
        headers: { authorization: 'Bearer invalidtoken' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      jwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const req = {
        headers: { authorization: 'Bearer expiredtoken' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('expired')
        })
      );
    });
  });

  describe('socketAuth - WebSocket Authentication', () => {
    it('should authenticate valid socket connection with token', async () => {
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

      const socket = {
        handshake: {
          auth: {
            token: 'validtoken123'
          }
        },
        user: null
      };
      const next = jest.fn();

      await socketAuth(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.user).toBeDefined();
      expect(socket.user.userId).toBe('user123');
    });

    it('should reject socket connection without token', async () => {
      const socket = {
        handshake: {
          auth: {}
        }
      };
      const next = jest.fn();

      await socketAuth(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject socket connection with invalid token', async () => {
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const socket = {
        handshake: {
          auth: {
            token: 'invalidtoken'
          }
        }
      };
      const next = jest.fn();

      await socketAuth(socket, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('JWT Payload Structure', () => {
    it('should include all required user fields in token payload', async () => {
      const mockUser = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'premium',
        subscription: {
          tier: 'The Finisher',
          status: 'active'
        }
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockUser)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const mockPayload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'premium',
        subscription: {
          tier: 'The Finisher',
          status: 'active'
        }
      };

      jwt.verify = jest.fn().mockReturnValue(mockPayload);

      const req = {
        headers: { authorization: 'Bearer validtoken' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await authenticate(req, res, next);

      expect(req.user).toMatchObject({
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'premium'
      });
    });
  });
});
