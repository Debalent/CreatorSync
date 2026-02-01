// Beat Model for CreatorSync
// Database schema and methods for beat management

const { v4: uuidv4 } = require('uuid');

/**
 * Beat class representing a music beat/track
 */
class Beat {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.title = data.title;
        this.artist = data.artist;
        this.artistId = data.artistId;
        this.category = data.category || 'Hip Hop';
        this.genre = data.genre || [];
        this.price = data.price || 0;
        this.bpm = data.bpm || 120;
        this.key = data.key || 'C Major';
        this.tags = data.tags || [];
        this.audioUrl = data.audioUrl;
        this.artwork = data.artwork || '/assets/default-artwork.jpg';
        this.duration = data.duration || 0;
        this.fileSize = data.fileSize || 0;
        this.format = data.format || 'mp3';
        this.likes = data.likes || 0;
        this.plays = data.plays || 0;
        this.downloads = data.downloads || 0;
        this.likedBy = data.likedBy || [];
        this.description = data.description || '';
        this.license = data.license || 'standard';
        this.exclusive = data.exclusive || false;
        this.featured = data.featured || false;
        this.status = data.status || 'active'; // active, pending, archived

        // Pricing and bidding system
        this.pricingType = data.pricingType || 'standard'; // 'standard' or 'bidding'
        this.minBidPrice = data.minBidPrice || null; // Minimum bid price for auctions
        this.currentBid = data.currentBid || null; // Current highest bid
        this.highestBidder = data.highestBidder || null; // User ID of highest bidder
        this.bidHistory = data.bidHistory || []; // Array of all bids
        this.biddingEndDate = data.biddingEndDate || null; // When bidding ends
        this.trending = data.trending || false; // Trending status (allows switching to bidding)

        // Platform commission
        this.platformCommissionRate = 0.125; // 12.5% commission

        this.uploadedAt = data.uploadedAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    /**
     * Increment play count
     */
    incrementPlays() {
        this.plays++;
        this.updatedAt = new Date();
    }

    /**
     * Toggle like for a user
     * @param {String} userId - User ID
     * @returns {Boolean} True if liked, false if unliked
     */
    toggleLike(userId) {
        const index = this.likedBy.indexOf(userId);
        if (index > -1) {
            this.likedBy.splice(index, 1);
            this.likes--;
            this.updatedAt = new Date();
            return false;
        } else {
            this.likedBy.push(userId);
            this.likes++;
            this.updatedAt = new Date();
            return true;
        }
    }

    /**
     * Check if user has liked this beat
     * @param {String} userId - User ID
     * @returns {Boolean} True if liked
     */
    isLikedBy(userId) {
        return this.likedBy.includes(userId);
    }

    /**
     * Increment download count
     */
    incrementDownloads() {
        this.downloads++;
        this.updatedAt = new Date();
    }

    /**
     * Switch pricing type (only allowed for trending beats)
     * @param {String} newType - 'standard' or 'bidding'
     * @param {Number} minPrice - Minimum bid price (required for bidding)
     * @param {Date} endDate - Bidding end date (required for bidding)
     * @returns {Boolean} True if successful
     */
    switchPricingType(newType, minPrice = null, endDate = null) {
        if (!this.trending && newType === 'bidding') {
            throw new Error('Only trending beats can be switched to bidding');
        }

        if (newType === 'bidding') {
            if (!minPrice || minPrice <= 0) {
                throw new Error('Minimum bid price is required for bidding');
            }
            if (!endDate || endDate <= new Date()) {
                throw new Error('Valid bidding end date is required');
            }
            this.minBidPrice = minPrice;
            this.biddingEndDate = endDate;
            this.currentBid = null;
            this.highestBidder = null;
            this.bidHistory = [];
        }

        this.pricingType = newType;
        this.updatedAt = new Date();
        return true;
    }

    /**
     * Place a bid on this beat
     * @param {String} userId - User ID placing the bid
     * @param {Number} bidAmount - Bid amount
     * @param {String} username - Username of bidder
     * @returns {Object} Bid result
     */
    placeBid(userId, bidAmount, username) {
        if (this.pricingType !== 'bidding') {
            throw new Error('This beat is not available for bidding');
        }

        if (new Date() > new Date(this.biddingEndDate)) {
            throw new Error('Bidding has ended for this beat');
        }

        const minimumBid = this.currentBid
            ? this.currentBid + (this.currentBid * 0.05) // 5% increment
            : this.minBidPrice;

        if (bidAmount < minimumBid) {
            throw new Error(`Bid must be at least $${minimumBid.toFixed(2)}`);
        }

        // Record the bid
        const bid = {
            userId,
            username,
            amount: bidAmount,
            timestamp: new Date()
        };

        this.bidHistory.unshift(bid); // Add to beginning of array
        this.currentBid = bidAmount;
        this.highestBidder = userId;
        this.updatedAt = new Date();

        return {
            success: true,
            currentBid: this.currentBid,
            nextMinimumBid: this.currentBid * 1.05,
            totalBids: this.bidHistory.length
        };
    }

    /**
     * Calculate platform commission
     * @param {Number} amount - Transaction amount
     * @returns {Object} Commission breakdown
     */
    calculateCommission(amount) {
        const commission = amount * this.platformCommissionRate;
        const sellerEarnings = amount - commission;

        return {
            totalAmount: amount,
            platformCommission: commission,
            sellerEarnings: sellerEarnings,
            commissionRate: this.platformCommissionRate
        };
    }

    /**
     * Get final sale price (considers bidding if active)
     * @returns {Number} Final price
     */
    getFinalPrice() {
        if (this.pricingType === 'bidding' && this.currentBid) {
            return this.currentBid;
        }
        return this.price;
    }

    /**
     * Get beat's public data (safe for API responses)
     * @returns {Object} Public beat data
     */
    toPublic() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            artistId: this.artistId,
            category: this.category,
            genre: this.genre,
            price: this.price,
            bpm: this.bpm,
            key: this.key,
            tags: this.tags,
            audioUrl: this.audioUrl,
            artwork: this.artwork,
            duration: this.duration,
            likes: this.likes,
            plays: this.plays,
            downloads: this.downloads,
            description: this.description,
            license: this.license,
            exclusive: this.exclusive,
            featured: this.featured,
            trending: this.trending,
            pricingType: this.pricingType,
            minBidPrice: this.minBidPrice,
            currentBid: this.currentBid,
            biddingEndDate: this.biddingEndDate,
            totalBids: this.bidHistory.length,
            uploadedAt: this.uploadedAt
        };
    }

    /**
     * Get beat's full data (includes all fields)
     * @returns {Object} Full beat data
     */
    toFull() {
        return {
            id: this.id,
            title: this.title,
            artist: this.artist,
            artistId: this.artistId,
            category: this.category,
            genre: this.genre,
            price: this.price,
            bpm: this.bpm,
            key: this.key,
            tags: this.tags,
            audioUrl: this.audioUrl,
            artwork: this.artwork,
            duration: this.duration,
            fileSize: this.fileSize,
            format: this.format,
            likes: this.likes,
            plays: this.plays,
            downloads: this.downloads,
            likedBy: this.likedBy,
            description: this.description,
            license: this.license,
            exclusive: this.exclusive,
            featured: this.featured,
            status: this.status,
            uploadedAt: this.uploadedAt,
            updatedAt: this.updatedAt
        };
    }
}

/**
 * In-memory beat storage (replace with database)
 */
class BeatRepository {
    constructor() {
        this.beats = new Map();
    }

    /**
     * Create a new beat
     * @param {Object} beatData - Beat data
     * @returns {Promise<Beat>} Created beat
     */
    async create(beatData) {
        const beat = new Beat(beatData);
        this.beats.set(beat.id, beat);
        return beat;
    }

    /**
     * Find beat by ID
     * @param {String} id - Beat ID
     * @returns {Promise<Beat|null>} Beat or null
     */
    async findById(id) {
        return this.beats.get(id) || null;
    }

    /**
     * Find beats by artist ID
     * @param {String} artistId - Artist ID
     * @returns {Promise<Array>} Array of beats
     */
    async findByArtistId(artistId) {
        const beats = [];
        for (const beat of this.beats.values()) {
            if (beat.artistId === artistId) {
                beats.push(beat);
            }
        }
        return beats;
    }

    /**
     * Find beats by category
     * @param {String} category - Category name
     * @returns {Promise<Array>} Array of beats
     */
    async findByCategory(category) {
        const beats = [];
        for (const beat of this.beats.values()) {
            if (beat.category === category) {
                beats.push(beat);
            }
        }
        return beats;
    }

    /**
     * Search beats
     * @param {Object} filters - Search filters
     * @returns {Promise<Array>} Array of beats
     */
    async search(filters = {}) {
        let beats = Array.from(this.beats.values());

        // Filter by category
        if (filters.category) {
            beats = beats.filter(b => b.category === filters.category);
        }

        // Filter by genre
        if (filters.genre) {
            beats = beats.filter(b => b.genre.includes(filters.genre));
        }

        // Filter by BPM range
        if (filters.minBpm) {
            beats = beats.filter(b => b.bpm >= filters.minBpm);
        }
        if (filters.maxBpm) {
            beats = beats.filter(b => b.bpm <= filters.maxBpm);
        }

        // Filter by price range
        if (filters.minPrice !== undefined) {
            beats = beats.filter(b => b.price >= filters.minPrice);
        }
        if (filters.maxPrice !== undefined) {
            beats = beats.filter(b => b.price <= filters.maxPrice);
        }

        // Filter by tags
        if (filters.tags && filters.tags.length > 0) {
            beats = beats.filter(b =>
                filters.tags.some(tag => b.tags.includes(tag))
            );
        }

        // Filter by status
        if (filters.status) {
            beats = beats.filter(b => b.status === filters.status);
        } else {
            // Default to active beats only
            beats = beats.filter(b => b.status === 'active');
        }

        // Sort
        if (filters.sortBy) {
            beats.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'newest':
                        return b.uploadedAt - a.uploadedAt;
                    case 'oldest':
                        return a.uploadedAt - b.uploadedAt;
                    case 'popular':
                        return b.plays - a.plays;
                    case 'likes':
                        return b.likes - a.likes;
                    case 'price-low':
                        return a.price - b.price;
                    case 'price-high':
                        return b.price - a.price;
                    default:
                        return 0;
                }
            });
        }

        return beats;
    }

    /**
     * Update beat
     * @param {String} id - Beat ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Beat|null>} Updated beat or null
     */
    async update(id, updates) {
        const beat = this.beats.get(id);
        if (!beat) return null;

        Object.assign(beat, updates);
        beat.updatedAt = new Date();
        return beat;
    }

    /**
     * Delete beat
     * @param {String} id - Beat ID
     * @returns {Promise<Boolean>} True if deleted
     */
    async delete(id) {
        return this.beats.delete(id);
    }

    /**
     * Get all beats (with pagination)
     * @param {Number} limit - Number of beats to return
     * @param {Number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of beats
     */
    async findAll(limit = 50, offset = 0) {
        const beats = Array.from(this.beats.values())
            .filter(b => b.status === 'active')
            .sort((a, b) => b.uploadedAt - a.uploadedAt);
        return beats.slice(offset, offset + limit);
    }
}

// Export singleton instance
const beatRepository = new BeatRepository();

module.exports = {
    Beat,
    BeatRepository,
    beatRepository
};

