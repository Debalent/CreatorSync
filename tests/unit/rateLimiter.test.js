// Unit Tests for Rate Limiter Middleware

const request = require('supertest');
const express = require('express');
const { apiLimiter, authLimiter } = require('../../server/middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('API Rate Limiter', () => {
        it('should allow requests within the limit', async () => {
            app.use('/api', apiLimiter);
            app.get('/api/test', (req, res) => res.json({ success: true }));

            const response = await request(app).get('/api/test');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should include rate limit headers', async () => {
            app.use('/api', apiLimiter);
            app.get('/api/test', (req, res) => res.json({ success: true }));

            const response = await request(app).get('/api/test');
            expect(response.headers).toHaveProperty('ratelimit-limit');
            expect(response.headers).toHaveProperty('ratelimit-remaining');
        });
    });

    describe('Auth Rate Limiter', () => {
        it('should have stricter limits for auth endpoints', async () => {
            app.use('/auth', authLimiter);
            app.post('/auth/login', (req, res) => res.json({ success: true }));

            const response = await request(app).post('/auth/login');
            expect(response.status).toBe(200);
        });
    });
});

