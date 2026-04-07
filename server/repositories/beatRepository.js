// Enterprise Beat Repository
// Database operations for beat management

const { ObjectId } = require('mongodb');
const { logger } = require('../utils/logger');
const { databaseManager } = require('../utils/database');

class BeatRepository {
    constructor() {
        this.collectionName = 'beats';
    }

    /**
     * Get collection instance
     */
    getCollection() {
        return databaseManager.getCollection(this.collectionName);
    }

    /**
     * Create new beat
     */
    async create(beatData) {
        try {
            const collection = this.getCollection();

            const beat = {
                userId: new ObjectId(beatData.userId),
                title: beatData.title,
                artist: beatData.artist,
                genre: beatData.genre,
                subgenre: beatData.subgenre || null,
                bpm: parseInt(beatData.bpm),
                key: beatData.key,
                mood: beatData.mood || [],
                tags: beatData.tags || [],
                description: beatData.description || '',
                price: parseFloat(beatData.price),
                currency: beatData.currency || 'USD',
                fileUrl: beatData.fileUrl,
                waveformUrl: beatData.waveformUrl || null,
                coverImageUrl: beatData.coverImageUrl || null,
                duration: beatData.duration || 0,
                fileSize: beatData.fileSize || 0,
                fileFormat: beatData.fileFormat || 'mp3',
                licensing: {
                    leaseAvailable: beatData.leaseAvailable !== false,
                    exclusiveAvailable: beatData.exclusiveAvailable !== false,
                    leasePrice: parseFloat(beatData.leasePrice) || 0,
                    exclusivePrice: parseFloat(beatData.exclusivePrice) || 0
                },
                stats: {
                    plays: 0,
                    downloads: 0,
                    likes: 0,
                    shares: 0,
                    sales: 0,
                    revenue: 0
                },
                status: 'active',
                featured: false,
                uploadedAt: new Date(),
                updatedAt: new Date(),
                publishedAt: new Date()
            };

            const result = await collection.insertOne(beat);
            logger.info('Beat created', { beatId: result.insertedId, userId: beatData.userId });

            return { ...beat, id: result.insertedId };
        } catch (error) {
            logger.error('Error creating beat', { error: error.message });
            throw error;
        }
    }

    /**
     * Find beat by ID
     */
    async findById(beatId) {
        try {
            const collection = this.getCollection();
            const beat = await collection.findOne({ _id: new ObjectId(beatId) });

            if (beat) {
                beat.id = beat._id;
            }

            return beat;
        } catch (error) {
            logger.error('Error finding beat by ID', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Find beats by user ID
     */
    async findByUserId(userId, options = {}) {
        try {
            const collection = this.getCollection();

            const {
                page = 1,
                limit = 20,
                sortBy = 'uploadedAt',
                sortOrder = 'desc'
            } = options;

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [beats, total] = await Promise.all([
                collection
                    .find({ userId: new ObjectId(userId) })
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                collection.countDocuments({ userId: new ObjectId(userId) })
            ]);

            return {
                beats: beats.map(beat => ({ ...beat, id: beat._id })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error finding beats by user', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Search beats with filters
     */
    async search(filters = {}, options = {}) {
        try {
            const collection = this.getCollection();

            const {
                page = 1,
                limit = 20,
                sortBy = 'uploadedAt',
                sortOrder = 'desc'
            } = options;

            const query = { status: 'active' };

            // Genre filter
            if (filters.genre) {
                query.genre = filters.genre;
            }

            // BPM range filter
            if (filters.bpmMin || filters.bpmMax) {
                query.bpm = {};
                if (filters.bpmMin) query.bpm.$gte = parseInt(filters.bpmMin);
                if (filters.bpmMax) query.bpm.$lte = parseInt(filters.bpmMax);
            }

            // Price range filter
            if (filters.priceMin || filters.priceMax) {
                query.price = {};
                if (filters.priceMin) query.price.$gte = parseFloat(filters.priceMin);
                if (filters.priceMax) query.price.$lte = parseFloat(filters.priceMax);
            }

            // Key filter
            if (filters.key) {
                query.key = filters.key;
            }

            // Tags filter
            if (filters.tags && filters.tags.length > 0) {
                query.tags = { $in: filters.tags };
            }

            // Mood filter
            if (filters.mood && filters.mood.length > 0) {
                query.mood = { $in: filters.mood };
            }

            // Text search
            if (filters.search) {
                query.$text = { $search: filters.search };
            }

            // Featured filter
            if (filters.featured) {
                query.featured = true;
            }

            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [beats, total] = await Promise.all([
                collection
                    .find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .toArray(),
                collection.countDocuments(query)
            ]);

            return {
                beats: beats.map(beat => ({ ...beat, id: beat._id })),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                filters: filters
            };
        } catch (error) {
            logger.error('Error searching beats', { error: error.message });
            throw error;
        }
    }

    /**
     * Update beat
     */
    async update(beatId, updates) {
        try {
            const collection = this.getCollection();

            const updateData = {
                ...updates,
                updatedAt: new Date()
            };

            // Don't allow updating certain fields
            delete updateData._id;
            delete updateData.id;
            delete updateData.userId;
            delete updateData.uploadedAt;
            delete updateData.stats;

            const result = await collection.findOneAndUpdate(
                { _id: new ObjectId(beatId) },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (result.value) {
                result.value.id = result.value._id;
            }

            return result.value;
        } catch (error) {
            logger.error('Error updating beat', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Increment play count
     */
    async incrementPlays(beatId) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(beatId) },
                {
                    $inc: { 'stats.plays': 1 },
                    $set: { updatedAt: new Date() }
                }
            );
        } catch (error) {
            logger.error('Error incrementing plays', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Increment like count
     */
    async incrementLikes(beatId) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(beatId) },
                {
                    $inc: { 'stats.likes': 1 },
                    $set: { updatedAt: new Date() }
                }
            );
        } catch (error) {
            logger.error('Error incrementing likes', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Record sale
     */
    async recordSale(beatId, amount) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(beatId) },
                {
                    $inc: {
                        'stats.sales': 1,
                        'stats.revenue': amount
                    },
                    $set: { updatedAt: new Date() }
                }
            );

            logger.info('Beat sale recorded', { beatId, amount });
        } catch (error) {
            logger.error('Error recording sale', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Set featured status
     */
    async setFeatured(beatId, featured) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(beatId) },
                {
                    $set: {
                        featured,
                        updatedAt: new Date()
                    }
                }
            );

            logger.info('Beat featured status updated', { beatId, featured });
            return true;
        } catch (error) {
            logger.error('Error setting featured status', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Delete beat (soft delete)
     */
    async delete(beatId) {
        try {
            const collection = this.getCollection();

            await collection.updateOne(
                { _id: new ObjectId(beatId) },
                {
                    $set: {
                        status: 'deleted',
                        deletedAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            logger.info('Beat deleted', { beatId });
            return true;
        } catch (error) {
            logger.error('Error deleting beat', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Hard delete beat (permanent)
     */
    async hardDelete(beatId) {
        try {
            const collection = this.getCollection();

            await collection.deleteOne({ _id: new ObjectId(beatId) });
            logger.info('Beat permanently deleted', { beatId });
            return true;
        } catch (error) {
            logger.error('Error hard deleting beat', { beatId, error: error.message });
            throw error;
        }
    }

    /**
     * Get trending beats
     */
    async getTrending(limit = 10) {
        try {
            const collection = this.getCollection();

            // Calculate trending score based on recent plays, likes, and sales
            const beats = await collection
                .find({ status: 'active' })
                .sort({
                    'stats.plays': -1,
                    'stats.likes': -1,
                    'stats.sales': -1
                })
                .limit(limit)
                .toArray();

            return beats.map(beat => ({ ...beat, id: beat._id }));
        } catch (error) {
            logger.error('Error getting trending beats', { error: error.message });
            throw error;
        }
    }

    /**
     * Get featured beats
     */
    async getFeatured(limit = 10) {
        try {
            const collection = this.getCollection();

            const beats = await collection
                .find({ status: 'active', featured: true })
                .sort({ publishedAt: -1 })
                .limit(limit)
                .toArray();

            return beats.map(beat => ({ ...beat, id: beat._id }));
        } catch (error) {
            logger.error('Error getting featured beats', { error: error.message });
            throw error;
        }
    }
}

module.exports = new BeatRepository();
