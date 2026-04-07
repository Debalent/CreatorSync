const request = require('supertest');
const express = require('express');

// Mock only what beats.js actually requires
jest.mock('../../server/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  },
  requestLogger: (req, res, next) => next(),
  errorLogger: (err, req, res, next) => next()
}));

jest.mock('../../server/utils/searchEngine', () => ({
  searchBeats: jest.fn(() => ({ results: [], total: 0 })),
  getSearchSuggestions: jest.fn(() => []),
  getFilterOptions: jest.fn(() => ({}))
}));

jest.mock('../../server/utils/audioProcessor', () => ({
  validateAudioFile: jest.fn(),
  extractMetadata: jest.fn()
}));

jest.mock('../../server/utils/dataManager', () => ({
  readData: jest.fn().mockResolvedValue({ beats: [] }),
  addBeat: jest.fn(),
  findBeatById: jest.fn(),
  updateBeat: jest.fn()
}));

// Require once — beats.js uses its own in-memory Map (exported as router.beats)
const beatRoutes = require('../../server/routes/beats');

// Helper to build a seeded beat object
const makeBeat = (id, overrides = {}) => ({
  id,
  title: `Beat ${id}`,
  artist: 'Test Artist',
  category: 'hip-hop',
  genre: 'Hip Hop',
  price: 29.99,
  bpm: 90,
  key: 'C',
  duration: '3:30',
  tags: [],
  audioUrl: `/audio/${id}.mp3`,
  artwork: '/art.jpg',
  isExclusive: false,
  licenseType: 'standard',
  uploadedAt: new Date(),
  updatedAt: new Date(),
  uploadedBy: 'mock-user-id', // matches beats.js hardcoded authenticateUser
  likes: 0,
  plays: 0,
  downloads: 0,
  isActive: true,
  ...overrides
});

describe('Beat Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/beats', beatRoutes);
    jest.clearAllMocks();
    // Clear the in-memory Maps between tests
    beatRoutes.beats.clear();
    beatRoutes.beatStats.clear();
  });

  describe('GET /api/beats', () => {
    it('should retrieve all beats', async () => {
      beatRoutes.beats.set('beat1', makeBeat('beat1', { genre: 'Hip Hop' }));
      beatRoutes.beats.set('beat2', makeBeat('beat2', { genre: 'R&B', uploadedBy: 'user456' }));

      const response = await request(app).get('/api/beats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.beats)).toBe(true);
      expect(response.body.beats.length).toBe(2);
    });

    it('should filter beats by genre', async () => {
      beatRoutes.beats.set('hip-hop-beat', makeBeat('hip-hop-beat', { genre: 'Hip Hop' }));
      beatRoutes.beats.set('rnb-beat', makeBeat('rnb-beat', { genre: 'R&B' }));

      const response = await request(app).get('/api/beats?genre=Hip%20Hop');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.beats)).toBe(true);
      expect(response.body.beats.length).toBe(1);
      expect(response.body.beats[0].genre).toBe('Hip Hop');
    });
  });

  describe('POST /api/beats', () => {
    it('should create a new beat with required fields', async () => {
      const response = await request(app)
        .post('/api/beats')
        .send({
          title: 'New Beat',
          artist: 'Test Artist',
          category: 'hip-hop',
          audioUrl: '/uploads/beat.mp3',
          genre: 'Trap',
          bpm: 140,
          price: 49.99
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.beat).toHaveProperty('title', 'New Beat');
      expect(response.body.beat).toHaveProperty('id');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/beats')
        .send({
          title: 'Incomplete Beat'
          // Missing: artist, category, audioUrl
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/beats/:id', () => {
    it('should retrieve a specific beat', async () => {
      beatRoutes.beats.set('beat123', makeBeat('beat123', { title: 'Test Beat' }));
      beatRoutes.beatStats.set('beat123', { views: 0, plays: 0, downloads: 0 });

      const response = await request(app).get('/api/beats/beat123');

      expect(response.status).toBe(200);
      expect(response.body.beat).toHaveProperty('title', 'Test Beat');
    });

    it('should return 404 for non-existent beat', async () => {
      const response = await request(app).get('/api/beats/nonexistent');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/beats/:id', () => {
    it('should update a beat owned by the user', async () => {
      // uploadedBy matches hardcoded 'mock-user-id' in beats.js authenticateUser
      beatRoutes.beats.set('beat123', makeBeat('beat123', { title: 'Old Title', uploadedBy: 'mock-user-id' }));

      const response = await request(app)
        .put('/api/beats/beat123')
        .send({ title: 'Updated Title', price: 59.99 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.beat).toHaveProperty('title', 'Updated Title');
    });

    it('should prevent updating beats owned by other users', async () => {
      // Different owner — req.user.id ('mock-user-id') won't match
      beatRoutes.beats.set('beat123', makeBeat('beat123', { uploadedBy: 'different-user-id' }));

      const response = await request(app)
        .put('/api/beats/beat123')
        .send({ title: 'Hacked Title' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/beats/:id', () => {
    it('should delete a beat owned by the user', async () => {
      beatRoutes.beats.set('beat123', makeBeat('beat123', { uploadedBy: 'mock-user-id' }));
      beatRoutes.beatStats.set('beat123', { views: 0, plays: 0, downloads: 0 });

      const response = await request(app).delete('/api/beats/beat123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(beatRoutes.beats.has('beat123')).toBe(false);
    });
  });
});
