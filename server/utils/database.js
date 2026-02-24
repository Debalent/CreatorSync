// MongoDB Database Connection Manager
// Enterprise-grade connection pooling and error handling

const { MongoClient } = require('mongodb');
const { logger } = require('./logger');

class DatabaseManager {
    constructor() {
        this.client = null;
        this.db = null;
        this.isConnected = false;
        this.retryAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    /**
     * Initialize database connection with retry logic
     */
    async connect() {
        if (this.isConnected) {
            logger.warn('Database already connected');
            return this.db;
        }

        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorsync';

        const options = {
            maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
            minPoolSize: parseInt(process.env.DB_POOL_MIN) || 2,
            maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME_MS) || 30000,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: 'majority',
            compression: 'snappy'
        };

        try {
            logger.info('Connecting to MongoDB...', { uri: uri.replace(/:[^:]*@/, ':***@') });

            this.client = new MongoClient(uri, options);
            await this.client.connect();

            // Verify connection
            await this.client.db('admin').command({ ping: 1 });

            const dbName = process.env.MONGODB_DATABASE || 'creatorsync';
            this.db = this.client.db(dbName);
            this.isConnected = true;
            this.retryAttempts = 0;

            logger.info('MongoDB connected successfully', { database: dbName });

            // Setup event listeners
            this.setupEventListeners();

            // Create indexes
            await this.createIndexes();

            return this.db;
        } catch (error) {
            logger.error('MongoDB connection failed', { error: error.message, attempt: this.retryAttempts + 1 });

            if (this.retryAttempts < this.maxRetries) {
                this.retryAttempts++;
                logger.info(`Retrying connection in ${this.retryDelay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.connect();
            }

            throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`);
        }
    }

    /**
     * Setup database event listeners
     */
    setupEventListeners() {
        this.client.on('serverOpening', () => {
            logger.info('MongoDB server connection opening');
        });

        this.client.on('serverClosed', () => {
            logger.warn('MongoDB server connection closed');
            this.isConnected = false;
        });

        this.client.on('error', (error) => {
            logger.error('MongoDB client error', { error: error.message });
        });

        this.client.on('timeout', () => {
            logger.error('MongoDB operation timeout');
        });
    }

    /**
     * Create database indexes for performance
     */
    async createIndexes() {
        try {
            // Users collection indexes
            await this.db.collection('users').createIndexes([
                { key: { email: 1 }, unique: true },
                { key: { username: 1 }, unique: true },
                { key: { createdAt: -1 } },
                { key: { subscription: 1 } },
                { key: { role: 1 } }
            ]);

            // Beats collection indexes
            await this.db.collection('beats').createIndexes([
                { key: { userId: 1 } },
                { key: { genre: 1 } },
                { key: { bpm: 1 } },
                { key: { price: 1 } },
                { key: { uploadedAt: -1 } },
                { key: { tags: 1 } },
                { key: { title: 'text', artist: 'text', tags: 'text' } }, // Full-text search
                { key: { featured: 1, uploadedAt: -1 } }
            ]);

            // Transactions collection indexes
            await this.db.collection('transactions').createIndexes([
                { key: { buyerId: 1, createdAt: -1 } },
                { key: { sellerId: 1, createdAt: -1 } },
                { key: { beatId: 1 } },
                { key: { status: 1 } },
                { key: { stripePaymentIntentId: 1 }, unique: true, sparse: true }
            ]);

            // Collaborations collection indexes
            await this.db.collection('collaborations').createIndexes([
                { key: { beatId: 1 } },
                { key: { participants: 1 } },
                { key: { createdAt: -1 } },
                { key: { status: 1 } }
            ]);

            // Notifications collection indexes with TTL
            await this.db.collection('notifications').createIndexes([
                { key: { userId: 1, createdAt: -1 } },
                { key: { read: 1 } },
                { key: { createdAt: 1 }, expireAfterSeconds: 2592000 } // 30 days TTL
            ]);

            // Sessions collection with TTL
            await this.db.collection('sessions').createIndexes([
                { key: { userId: 1 } },
                { key: { expiresAt: 1 }, expireAfterSeconds: 0 }
            ]);

            logger.info('Database indexes created successfully');
        } catch (error) {
            logger.error('Error creating indexes', { error: error.message });
        }
    }

    /**
     * Get database instance
     */
    getDb() {
        if (!this.isConnected || !this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    /**
     * Get specific collection
     */
    getCollection(collectionName) {
        return this.getDb().collection(collectionName);
    }

    /**
     * Check if database is connected
     */
    async healthCheck() {
        try {
            if (!this.client) {
                return { healthy: false, message: 'No database client' };
            }

            await this.client.db('admin').command({ ping: 1 });
            return { healthy: true, message: 'Database connection healthy' };
        } catch (error) {
            return { healthy: false, message: error.message };
        }
    }

    /**
     * Gracefully close database connection
     */
    async disconnect() {
        if (this.client) {
            try {
                await this.client.close();
                this.isConnected = false;
                this.db = null;
                logger.info('MongoDB connection closed');
            } catch (error) {
                logger.error('Error closing MongoDB connection', { error: error.message });
                throw error;
            }
        }
    }

    /**
     * Execute transaction with retry logic
     */
    async withTransaction(callback) {
        const session = this.client.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                result = await callback(session);
            });
            return result;
        } catch (error) {
            logger.error('Transaction failed', { error: error.message });
            throw error;
        } finally {
            await session.endSession();
        }
    }
}

// Export singleton instance
const databaseManager = new DatabaseManager();

module.exports = {
    databaseManager,
    DatabaseManager
};
