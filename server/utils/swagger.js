// Swagger/OpenAPI Documentation Configuration for CreatorSync API

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CreatorSync API',
            version: '1.0.0',
            description: 'Revolutionary music monetization platform API - Beat marketplace, collaboration, and production tools',
            contact: {
                name: 'Demond Balentine',
                email: 'balentinetechsolutions@gmail.com',
                url: 'https://creatorsync.com'
            },
            license: {
                name: 'Proprietary',
                url: 'https://creatorsync.com/license'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://staging.creatorsync.com',
                description: 'Staging server'
            },
            {
                url: 'https://api.creatorsync.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                apiKey: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['user', 'producer', 'admin'] },
                        subscription: { type: 'string', enum: ['free', 'starter', 'pro', 'enterprise'] },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Beat: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        artist: { type: 'string' },
                        category: { type: 'string' },
                        price: { type: 'number', format: 'float' },
                        bpm: { type: 'integer' },
                        key: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        audioUrl: { type: 'string', format: 'uri' },
                        artwork: { type: 'string', format: 'uri' },
                        likes: { type: 'integer' },
                        plays: { type: 'integer' },
                        uploadedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Collaboration: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        participants: { type: 'array', items: { type: 'string' } },
                        createdAt: { type: 'string', format: 'date-time' },
                        lastActivity: { type: 'string', format: 'date-time' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' },
                        statusCode: { type: 'integer' }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication required',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                RateLimitError: {
                    description: 'Rate limit exceeded',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: { type: 'string' },
                                    message: { type: 'string' },
                                    retryAfter: { type: 'integer' }
                                }
                            }
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints'
            },
            {
                name: 'Beats',
                description: 'Beat management and marketplace endpoints'
            },
            {
                name: 'Users',
                description: 'User profile and management endpoints'
            },
            {
                name: 'Payments',
                description: 'Payment processing and transactions'
            },
            {
                name: 'Subscriptions',
                description: 'Subscription management for The Finisher'
            },
            {
                name: 'Collaboration',
                description: 'Real-time collaboration features'
            },
            {
                name: 'AI Songwriter',
                description: 'AI-powered songwriting assistance'
            },
            {
                name: 'Plugins',
                description: 'DAW plugin management and downloads'
            },
            {
                name: 'Analytics',
                description: 'Analytics and reporting endpoints'
            }
        ]
    },
    apis: [
        './server/routes/*.js',
        './server/server.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

