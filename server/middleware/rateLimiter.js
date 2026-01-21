// Rate Limiting Middleware for CreatorSync API
// Protects against abuse and DDoS attacks

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login/register requests per windowMs
    skipSuccessfulRequests: true, // Don't count successful requests
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many authentication attempts',
            message: 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads per hour
    message: {
        error: 'Upload limit exceeded',
        message: 'You have exceeded the hourly upload limit. Please try again later.',
        retryAfter: '1 hour'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Upload limit exceeded',
            message: 'You have reached the maximum number of uploads per hour. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Rate limiter for payment endpoints
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 payment attempts per hour
    message: {
        error: 'Payment limit exceeded',
        message: 'Too many payment attempts. Please contact support if you need assistance.',
        retryAfter: '1 hour'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'Payment limit exceeded',
            message: 'You have exceeded the payment attempt limit. Please try again later or contact support.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Rate limiter for AI Songwriter endpoints
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 AI requests per hour
    message: {
        error: 'AI request limit exceeded',
        message: 'You have exceeded the AI request limit. Please upgrade your plan for more requests.',
        retryAfter: '1 hour'
    },
    handler: (req, res) => {
        res.status(429).json({
            error: 'AI request limit exceeded',
            message: 'You have reached the maximum number of AI requests per hour. Upgrade to Pro for unlimited access.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    }
});

// Rate limiter for collaboration endpoints
const collaborationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // Limit each IP to 30 collaboration actions per hour
    message: {
        error: 'Collaboration limit exceeded',
        message: 'You have exceeded the collaboration action limit. Please try again later.',
        retryAfter: '1 hour'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    uploadLimiter,
    paymentLimiter,
    aiLimiter,
    collaborationLimiter
};

