// Winston Logger Configuration for CreatorSync
// Provides structured logging with multiple transports

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'creatorsync' },
    transports: [
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5
        }),
        // Write all logs with level 'info' and below to combined.log
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

// Create specialized loggers for different components
const createComponentLogger = (component) => {
    return {
        info: (message, meta = {}) => logger.info(message, { component, ...meta }),
        warn: (message, meta = {}) => logger.warn(message, { component, ...meta }),
        error: (message, meta = {}) => logger.error(message, { component, ...meta }),
        debug: (message, meta = {}) => logger.debug(message, { component, ...meta })
    };
};

// Export logger and helper functions
module.exports = {
    logger,
    createComponentLogger,
    
    // Convenience methods
    logInfo: (message, meta) => logger.info(message, meta),
    logWarn: (message, meta) => logger.warn(message, meta),
    logError: (message, meta) => logger.error(message, meta),
    logDebug: (message, meta) => logger.debug(message, meta),
    
    // Request logging middleware
    requestLogger: (req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info('HTTP Request', {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
                userAgent: req.get('user-agent')
            });
        });
        
        next();
    },
    
    // Error logging middleware
    errorLogger: (err, req, res, next) => {
        logger.error('Application Error', {
            error: err.message,
            stack: err.stack,
            method: req.method,
            url: req.url,
            ip: req.ip,
            body: req.body
        });
        
        next(err);
    },
    
    // Socket.IO logging
    socketLogger: (event, data, socketId) => {
        logger.info('Socket Event', {
            event,
            socketId,
            data: typeof data === 'object' ? JSON.stringify(data) : data
        });
    },
    
    // Analytics logging
    analyticsLogger: (event, userId, data) => {
        logger.info('Analytics Event', {
            event,
            userId,
            timestamp: new Date().toISOString(),
            data
        });
    },
    
    // Payment logging
    paymentLogger: (action, userId, amount, metadata) => {
        logger.info('Payment Event', {
            action,
            userId,
            amount,
            metadata,
            timestamp: new Date().toISOString()
        });
    },
    
    // Security logging
    securityLogger: (event, severity, details) => {
        const logLevel = severity === 'high' ? 'error' : 'warn';
        logger[logLevel]('Security Event', {
            event,
            severity,
            details,
            timestamp: new Date().toISOString()
        });
    }
};

