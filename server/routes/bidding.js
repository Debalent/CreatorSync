// Bidding Routes for CreatorSync
const express = require('express');
const { beatRepository } = require('../models/Beat');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock authentication middleware
const authenticateUser = (req, res, next) => {
    req.user = { id: 'mock-user-id', username: 'MockUser', email: 'user@example.com' };
    next();
};

/**
 * Switch beat pricing type (standard <-> bidding)
 * Only allowed for trending beats when switching to bidding
 */
router.put('/beats/:id/pricing-type', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { pricingType, minBidPrice, biddingDuration } = req.body;

        // Find beat
        const beat = await beatRepository.findById(id);
        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Verify ownership
        if (beat.artistId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: You do not own this beat' });
        }

        // Validate pricing type
        if (!['standard', 'bidding'].includes(pricingType)) {
            return res.status(400).json({ error: 'Invalid pricing type. Must be "standard" or "bidding"' });
        }

        // If switching to bidding, calculate end date
        let biddingEndDate = null;
        if (pricingType === 'bidding') {
            if (!beat.trending) {
                return res.status(400).json({
                    error: 'Only trending beats can be switched to bidding mode'
                });
            }

            if (!minBidPrice || minBidPrice <= 0) {
                return res.status(400).json({ error: 'Minimum bid price must be greater than 0' });
            }

            // Default to 7 days if not specified
            const duration = biddingDuration || 7;
            biddingEndDate = new Date();
            biddingEndDate.setDate(biddingEndDate.getDate() + duration);
        }

        // Update beat
        beat.switchPricingType(pricingType, minBidPrice, biddingEndDate);

        res.json({
            success: true,
            message: `Pricing type switched to ${pricingType}`,
            beat: beat.toPublic()
        });
    } catch (error) {
        console.error('Switch pricing type error:', error);
        res.status(400).json({
            error: error.message || 'Failed to switch pricing type'
        });
    }
});

/**
 * Place a bid on a beat
 */
router.post('/beats/:id/bid', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { bidAmount } = req.body;

        if (!bidAmount || bidAmount <= 0) {
            return res.status(400).json({ error: 'Valid bid amount is required' });
        }

        // Find beat
        const beat = await beatRepository.findById(id);
        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Prevent self-bidding
        if (beat.artistId === req.user.id) {
            return res.status(400).json({ error: 'You cannot bid on your own beat' });
        }

        // Place bid
        const bidResult = beat.placeBid(req.user.id, bidAmount, req.user.username);

        res.json({
            success: true,
            message: 'Bid placed successfully',
            bid: bidResult,
            beat: {
                id: beat.id,
                title: beat.title,
                currentBid: beat.currentBid,
                nextMinimumBid: bidResult.nextMinimumBid,
                totalBids: bidResult.totalBids,
                biddingEndDate: beat.biddingEndDate
            }
        });
    } catch (error) {
        console.error('Place bid error:', error);
        res.status(400).json({
            error: error.message || 'Failed to place bid'
        });
    }
});

/**
 * Get bid history for a beat
 */
router.get('/beats/:id/bids', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Find beat
        const beat = await beatRepository.findById(id);
        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        if (beat.pricingType !== 'bidding') {
            return res.status(400).json({ error: 'This beat is not in bidding mode' });
        }

        // Paginate bid history
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedBids = beat.bidHistory.slice(startIndex, endIndex);

        res.json({
            success: true,
            beatId: beat.id,
            beatTitle: beat.title,
            currentBid: beat.currentBid,
            minBidPrice: beat.minBidPrice,
            totalBids: beat.bidHistory.length,
            biddingEndDate: beat.biddingEndDate,
            timeRemaining: beat.biddingEndDate ? new Date(beat.biddingEndDate) - new Date() : null,
            bids: paginatedBids,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: beat.bidHistory.length,
                pages: Math.ceil(beat.bidHistory.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Get bid history error:', error);
        res.status(500).json({ error: 'Failed to get bid history' });
    }
});

/**
 * Get all beats currently in bidding mode
 */
router.get('/beats/bidding/active', async (req, res) => {
    try {
        const { category, minPrice, maxPrice, sortBy = 'ending-soon' } = req.query;

        // Get all beats
        const allBeats = await beatRepository.findAll(1000, 0);

        // Filter for bidding beats that haven't ended
        let biddingBeats = allBeats.filter(beat => {
            return beat.pricingType === 'bidding' &&
                   beat.biddingEndDate &&
                   new Date(beat.biddingEndDate) > new Date();
        });

        // Apply filters
        if (category) {
            biddingBeats = biddingBeats.filter(b => b.category === category);
        }

        if (minPrice) {
            biddingBeats = biddingBeats.filter(b => {
                const price = b.currentBid || b.minBidPrice;
                return price >= parseFloat(minPrice);
            });
        }

        if (maxPrice) {
            biddingBeats = biddingBeats.filter(b => {
                const price = b.currentBid || b.minBidPrice;
                return price <= parseFloat(maxPrice);
            });
        }

        // Sort
        switch (sortBy) {
            case 'ending-soon':
                biddingBeats.sort((a, b) =>
                    new Date(a.biddingEndDate) - new Date(b.biddingEndDate)
                );
                break;
            case 'highest-bid':
                biddingBeats.sort((a, b) =>
                    (b.currentBid || b.minBidPrice) - (a.currentBid || a.minBidPrice)
                );
                break;
            case 'most-bids':
                biddingBeats.sort((a, b) =>
                    b.bidHistory.length - a.bidHistory.length
                );
                break;
            case 'lowest-price':
                biddingBeats.sort((a, b) =>
                    (a.currentBid || a.minBidPrice) - (b.currentBid || b.minBidPrice)
                );
                break;
        }

        res.json({
            success: true,
            total: biddingBeats.length,
            beats: biddingBeats.map(beat => ({
                ...beat.toPublic(),
                timeRemaining: new Date(beat.biddingEndDate) - new Date()
            }))
        });
    } catch (error) {
        console.error('Get active bidding beats error:', error);
        res.status(500).json({ error: 'Failed to get bidding beats' });
    }
});

/**
 * Mark beat as trending (admin/system function)
 */
router.put('/beats/:id/trending', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { trending } = req.body;

        // Find beat
        const beat = await beatRepository.findById(id);
        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // In a real app, this would require admin privileges
        // For now, only the beat owner can mark as trending
        if (beat.artistId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await beatRepository.update(id, { trending: trending === true });

        res.json({
            success: true,
            message: `Beat ${trending ? 'marked' : 'unmarked'} as trending`,
            beat: beat.toPublic()
        });
    } catch (error) {
        console.error('Update trending status error:', error);
        res.status(500).json({ error: 'Failed to update trending status' });
    }
});

module.exports = router;
