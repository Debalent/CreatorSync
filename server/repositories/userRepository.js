// Enterprise User Repository
// Database operations for user management

const { ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { logger } = require('../utils/logger');
const { databaseManager } = require('../utils/database');

class UserRepository {
    constructor() {
        this.collectionName = 'users';
    }

    /**
     * Get collection instance
     */
    getCollection() {
        return databaseManager.getCollection(this.collectionName);
    }

    /**
     * Create new user
     */
    async create(userData) {
        try {
            const collection = this.getCollection();

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            const user = {
                username: userData.username,
                email: userData.email.toLowerCase(),
                passwordHash,
                role: userData.role || 'user',
                subscription: userData.subscription || 'free',
                profile: {
                    displayName: userData.displayName || userData.username,
                    bio: userData.bio || '',
                    avatar: userData.avatar || null,
                    website: userData.website || null,
                    location: userData.location || null
                },
                stats: {
                    totalBeats: 0,
                    totalSales: 0,
                    totalEarnings: 0,
                    totalPurchases: 0
                },
                settings: {
                    emailNotifications: true,
                    pushNotifications: false,
                    language: userData.language || 'en',
                    currency: userData.currency || 'USD'
                },
                verification: {
                    email: false,
                    phone: false,
                    identity: false
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: null,
                isActive: true,
                isBanned: false
            };

            const result = await collection.insertOne(user);
            logger.info('User created', { userId: result.insertedId, email: user.email });

            return { ...user, id: result.insertedId };
        } catch (error) {
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new Error(`${field} already exists`);
            }
            logger.error('Error creating user', { error: error.message });
            throw error;
        }
    }

    /**
     * Find user by ID
     */
    async findById(userId) {
        try {
            const collection = this.getCollection();
            const user = await collection.findOne({ _id: new ObjectId(userId) });

            if (user) {
                user.id = user._id;
                delete user.passwordHash; // Don't expose password hash
            }

            return user;
        } catch (error) {
            logger.error('Error finding user by ID', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Find user by email
     */
    async findByEmail(email) {
        try {
            const collection = this.getCollection();
            return await collection.findOne({ email: email.toLowerCase() });
        } catch (error) {
            logger.error('Error finding user by email', { email, error: error.message });
            throw error;
        }
    }

    /**
     * Find user by username
     */
    async findByUsername(username) {
        try {
            const collection = this.getCollection();
            return await collection.findOne({ username: username });
        } catch (error) {
            logger.error('Error finding user by username', { username, error: error.message });
            throw error;
        }
    }

    /**
     * Verify user password
     */
    async verifyPassword(email, password) {
        try {
            const user = await this.findByEmail(email);
            if (!user) {
                return null;
            }

            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) {
                return null;
            }

            // Update last login
            await this.updateLastLogin(user._id);

            user.id = user._id;
            delete user.passwordHash;
            return user;
        } catch (error) {
            logger.error('Error verifying password', { email, error: error.message });
            throw error;
        }
    }

    /**
     * Update user
     */
    async update(userId, updates) {
        try {
            const collection = this.getCollection();

            const updateData = {
                ...updates,
                updatedAt: new Date()
            };

            // Don't allow updating sensitive fields directly
            delete updateData.passwordHash;
            delete updateData.email;
            delete updateData.createdAt;
            delete updateData._id;
            delete updateData.id;

            const result = await collection.findOneAndUpdate(
                { _id: new ObjectId(userId) },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (result.value) {
                result.value.id = result.value._id;
                delete result.value.passwordHash;
            }

            return result.value;
        } catch (error) {
            logger.error('Error updating user', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Update user password
     */
    async updatePassword(userId, newPassword) {
        try {
            const collection = this.getCollection();

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        passwordHash,
                        updatedAt: new Date()
                    }
                }
            );

            logger.info('Password updated', { userId });
            return true;
        } catch (error) {
            logger.error('Error updating password', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Update subscription
     */
    async updateSubscription(userId, subscription) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        subscription,
                        updatedAt: new Date()
                    }
                }
            );

            logger.info('Subscription updated', { userId, subscription });
            return true;
        } catch (error) {
            logger.error('Error updating subscription', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(userId) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { lastLoginAt: new Date() } }
            );
        } catch (error) {
            logger.error('Error updating last login', { userId, error: error.message });
        }
    }

    /**
     * Update user stats
     */
    async updateStats(userId, statsUpdate) {
        try {
            const collection = this.getCollection();

            const updateObj = {};
            for (const [key, value] of Object.entries(statsUpdate)) {
                updateObj[`stats.${key}`] = value;
            }

            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $inc: updateObj,
                    $set: { updatedAt: new Date() }
                }
            );
        } catch (error) {
            logger.error('Error updating stats', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Ban/unban user
     */
    async setBanStatus(userId, isBanned, reason = null) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        isBanned,
                        banReason: reason,
                        updatedAt: new Date()
                    }
                }
            );

            logger.info('User ban status updated', { userId, isBanned, reason });
            return true;
        } catch (error) {
            logger.error('Error setting ban status', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete user (soft delete)
     */
    async delete(userId) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(userId) },
                {
                    $set: {
                        isActive: false,
                        deletedAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            logger.info('User deleted', { userId });
            return true;
        } catch (error) {
            logger.error('Error deleting user', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Hard delete user (permanent)
     */
    async hardDelete(userId) {
        try {
            const collection = this.getCollection();

            await collection.deleteOne({ _id: new ObjectId(userId) });
            logger.info('User permanently deleted', { userId });
            return true;
        } catch (error) {
            logger.error('Error hard deleting user', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * List users with pagination
     */
    async list(options = {}) {
        try {
            const collection = this.getCollection();

            const {
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc',
                filter = {}
            } = options;

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [users, total] = await Promise.all([
                collection
                    .find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .project({ passwordHash: 0 })
                    .toArray(),
                collection.countDocuments(filter)
            ]);

            return {
                users: users.map(user => ({ ...user, id: user._id })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error listing users', { error: error.message });
            throw error;
        }
    }
}

module.exports = new UserRepository();
