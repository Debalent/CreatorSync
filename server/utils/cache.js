// Redis Cache Utility for CreatorSync
// Provides caching layer for improved performance

const redis = require('redis');
const { logger } = require('./logger');

/**
 * Cache Manager using Redis
 */
class CacheManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.defaultTTL = 3600; // 1 hour in seconds
    }

    /**
     * Initialize Redis connection
     */
    async connect() {
        try {
            // Only connect if Redis URL is configured
            if (!process.env.REDIS_URL) {
                logger.warn('Redis URL not configured, caching disabled');
                return;
            }

            this.client = redis.createClient({
                url: process.env.REDIS_URL,
                password: process.env.REDIS_PASSWORD,
                database: parseInt(process.env.REDIS_DB) || 0,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('Redis reconnection failed after 10 attempts');
                            return new Error('Redis reconnection limit exceeded');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            });

            this.client.on('error', (err) => {
                logger.error('Redis Client Error', { error: err.message });
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('Redis Client Connected');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                logger.info('Redis Client Ready');
            });

            this.client.on('reconnecting', () => {
                logger.warn('Redis Client Reconnecting');
            });

            await this.client.connect();
        } catch (error) {
            logger.error('Failed to connect to Redis', { error: error.message });
            this.isConnected = false;
        }
    }

    /**
     * Disconnect from Redis
     */
    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
            logger.info('Redis Client Disconnected');
        }
    }

    /**
     * Get value from cache
     * @param {String} key - Cache key
     * @returns {Promise<any>} Cached value or null
     */
    async get(key) {
        if (!this.isConnected) return null;

        try {
            const value = await this.client.get(key);
            if (value) {
                logger.debug('Cache hit', { key });
                return JSON.parse(value);
            }
            logger.debug('Cache miss', { key });
            return null;
        } catch (error) {
            logger.error('Cache get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {String} key - Cache key
     * @param {any} value - Value to cache
     * @param {Number} ttl - Time to live in seconds (optional)
     * @returns {Promise<Boolean>} True if successful
     */
    async set(key, value, ttl = this.defaultTTL) {
        if (!this.isConnected) return false;

        try {
            const serialized = JSON.stringify(value);
            await this.client.setEx(key, ttl, serialized);
            logger.debug('Cache set', { key, ttl });
            return true;
        } catch (error) {
            logger.error('Cache set error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {String} key - Cache key
     * @returns {Promise<Boolean>} True if successful
     */
    async delete(key) {
        if (!this.isConnected) return false;

        try {
            await this.client.del(key);
            logger.debug('Cache delete', { key });
            return true;
        } catch (error) {
            logger.error('Cache delete error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete multiple keys matching a pattern
     * @param {String} pattern - Key pattern (e.g., 'user:*')
     * @returns {Promise<Number>} Number of keys deleted
     */
    async deletePattern(pattern) {
        if (!this.isConnected) return 0;

        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.debug('Cache pattern delete', { pattern, count: keys.length });
                return keys.length;
            }
            return 0;
        } catch (error) {
            logger.error('Cache pattern delete error', { pattern, error: error.message });
            return 0;
        }
    }

    /**
     * Check if key exists in cache
     * @param {String} key - Cache key
     * @returns {Promise<Boolean>} True if exists
     */
    async exists(key) {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Increment a counter in cache
     * @param {String} key - Cache key
     * @param {Number} amount - Amount to increment (default: 1)
     * @returns {Promise<Number>} New value
     */
    async increment(key, amount = 1) {
        if (!this.isConnected) return 0;

        try {
            const result = await this.client.incrBy(key, amount);
            return result;
        } catch (error) {
            logger.error('Cache increment error', { key, error: error.message });
            return 0;
        }
    }

    /**
     * Set expiration time for a key
     * @param {String} key - Cache key
     * @param {Number} ttl - Time to live in seconds
     * @returns {Promise<Boolean>} True if successful
     */
    async expire(key, ttl) {
        if (!this.isConnected) return false;

        try {
            await this.client.expire(key, ttl);
            return true;
        } catch (error) {
            logger.error('Cache expire error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Clear all cache
     * @returns {Promise<Boolean>} True if successful
     */
    async flush() {
        if (!this.isConnected) return false;

        try {
            await this.client.flushDb();
            logger.info('Cache flushed');
            return true;
        } catch (error) {
            logger.error('Cache flush error', { error: error.message });
            return false;
        }
    }

    /**
     * Cache middleware for Express routes
     * @param {Number} ttl - Time to live in seconds
     * @returns {Function} Express middleware
     */
    middleware(ttl = this.defaultTTL) {
        return async (req, res, next) => {
            if (!this.isConnected) {
                return next();
            }

            // Only cache GET requests
            if (req.method !== 'GET') {
                return next();
            }

            const key = `cache:${req.originalUrl}`;

            try {
                const cached = await this.get(key);
                if (cached) {
                    return res.json(cached);
                }

                // Store original res.json
                const originalJson = res.json.bind(res);

                // Override res.json to cache the response
                res.json = (data) => {
                    this.set(key, data, ttl);
                    return originalJson(data);
                };

                next();
            } catch (error) {
                logger.error('Cache middleware error', { error: error.message });
                next();
            }
        };
    }
}

// Export singleton instance
const cacheManager = new CacheManager();

module.exports = {
    CacheManager,
    cacheManager
};

