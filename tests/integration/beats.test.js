const request = require('supertest');
const express = require('express');
const beatRoutes = require('../../server/routes/beats');

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
      find: jest.fn(() => ({
        toArray: jest.fn()
      })),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn()
    }))
  }))
}));

jest.mock('../../server/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { userId: 'user123', username: 'testuser' };
    next();
  }
}));

describe('Beat Routes', () => {
  let app;
  const { getDb } = require('../../server/utils/database');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/beats', beatRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/beats', () => {
    it('should retrieve all beats', async () => {
      const mockBeats = [
        {
          _id: 'beat1',
          title: 'Test Beat 1',
          userId: 'user123',
          price: 29.99,
          genre: 'Hip Hop'
        },
        {
          _id: 'beat2',
          title: 'Test Beat 2',
          userId: 'user456',
          price: 39.99,
          genre: 'R&B'
        }
      ];

      const mockCollection = {
        find: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockBeats)
        }))
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .get('/api/beats');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should filter beats by genre', async () => {
      const mockBeats = [
        {
          _id: 'beat1',
          title: 'Hip Hop Beat',
          genre: 'Hip Hop',
          price: 29.99
        }
      ];

      const mockCollection = {
        find: jest.fn(() => ({
          toArray: jest.fn().mockResolvedValue(mockBeats)
        }))
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .get('/api/beats?genre=Hip Hop');

      expect(response.status).toBe(200);
      expect(mockCollection.find).toHaveBeenCalled();
    });
  });

  describe('POST /api/beats', () => {
    it('should create a new beat with authentication', async () => {
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue({ insertedId: 'beat123' })
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .post('/api/beats')
        .send({
          title: 'New Beat',
          genre: 'Trap',
          bpm: 140,
          price: 49.99,
          description: 'A fire trap beat'
        });

      expect(response.status).toBe(201);
      expect(mockCollection.insertOne).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/beats')
        .send({
          title: 'Incomplete Beat'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/beats/:id', () => {
    it('should retrieve a specific beat', async () => {
      const mockBeat = {
        _id: 'beat123',
        title: 'Test Beat',
        userId: 'user123',
        price: 29.99
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .get('/api/beats/beat123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title', 'Test Beat');
    });

    it('should return 404 for non-existent beat', async () => {
      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(null)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .get('/api/beats/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/beats/:id', () => {
    it('should update a beat owned by the user', async () => {
      const mockBeat = {
        _id: 'beat123',
        title: 'Old Title',
        userId: 'user123'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .put('/api/beats/beat123')
        .send({
          title: 'Updated Title',
          price: 59.99
        });

      expect(response.status).toBe(200);
      expect(mockCollection.updateOne).toHaveBeenCalled();
    });

    it('should prevent updating beats owned by other users', async () => {
      const mockBeat = {
        _id: 'beat123',
        title: 'Other User Beat',
        userId: 'otherUser'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat)
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .put('/api/beats/beat123')
        .send({
          title: 'Hacked Title'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/beats/:id', () => {
    it('should delete a beat owned by the user', async () => {
      const mockBeat = {
        _id: 'beat123',
        userId: 'user123'
      };

      const mockCollection = {
        findOne: jest.fn().mockResolvedValue(mockBeat),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
      };

      getDb.mockReturnValue({
        collection: jest.fn(() => mockCollection)
      });

      const response = await request(app)
        .delete('/api/beats/beat123');

      expect(response.status).toBe(200);
      expect(mockCollection.deleteOne).toHaveBeenCalled();
    });
  });
});
