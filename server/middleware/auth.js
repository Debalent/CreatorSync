// JWT Authentication Middleware for CreatorSync
// Handles user authentication and authorization

const jwt = require('jsonwebtoken');
const { securityLogger } = require('../utils/logger');

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
    const payload = {
        userId: user.id || user.userId,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        subscription: user.subscription || 'free'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'creatorsync',
        audience: 'creatorsync-users'
    });
};

/**
 * Generate refresh token
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id || user.userId,
        type: 'refresh'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '30d',
        issuer: 'creatorsync',
        audience: 'creatorsync-users'
    });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'creatorsync',
            audience: 'creatorsync-users'
        });
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authentication token provided'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = verifyToken(token);

        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            subscription: decoded.subscription
        };

        next();
    } catch (error) {
        securityLogger('authentication_failed', 'medium', {
            ip: req.ip,
            error: error.message
        });

        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired authentication token'
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            
            req.user = {
                userId: decoded.userId,
                username: decoded.username,
                email: decoded.email,
                role: decoded.role,
                subscription: decoded.subscription
            };
        }
    } catch (error) {
        // Silently fail for optional auth
    }
    
    next();
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of allowed roles
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            securityLogger('authorization_failed', 'medium', {
                userId: req.user.userId,
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });

            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to access this resource'
            });
        }

        next();
    };
};

/**
 * Subscription-based authorization middleware
 * @param {Array} requiredSubscriptions - Array of required subscription levels
 */
const requireSubscription = (...requiredSubscriptions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        if (!requiredSubscriptions.includes(req.user.subscription)) {
            return res.status(403).json({
                error: 'Subscription Required',
                message: `This feature requires a ${requiredSubscriptions.join(' or ')} subscription`,
                upgradeUrl: '/subscriptions/upgrade'
            });
        }

        next();
    };
};

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from socket handshake
 */
const socketAuth = (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const decoded = verifyToken(token);

        // Attach user info to socket
        socket.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role,
            subscription: decoded.subscription
        };

        next();
    } catch (error) {
        securityLogger('socket_authentication_failed', 'medium', {
            socketId: socket.id,
            error: error.message
        });

        next(new Error('Invalid or expired authentication token'));
    }
};

module.exports = {
    generateToken,
    generateRefreshToken,
    verifyToken,
    authenticate,
    optionalAuth,
    authorize,
    requireSubscription,
    socketAuth
};

