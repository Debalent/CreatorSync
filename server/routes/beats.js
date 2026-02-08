// Beat Routes for CreatorSync
const express = require('express');
const router = express.Router();
const Beat = require('../models/BeatMongoose');
const User = require('../models/UserMongoose');
const { authenticate: auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all beats with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const {
            category,
            genre,
            bpmMin,
            bpmMax,
            priceMin,
            priceMax,
            key,
            search,
            producer,
            sortBy = 'newest',
            page = 1,
            limit = 20
        } = req.query;

        // Build filter query
        const filter = { isPublic: true };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (genre) {
            filter.genre = new RegExp(genre, 'i');
        }

        if (bpmMin || bpmMax) {
            filter.bpm = {};
            if (bpmMin) filter.bpm.$gte = parseInt(bpmMin);
            if (bpmMax) filter.bpm.$lte = parseInt(bpmMax);
        }

        if (priceMin || priceMax) {
            filter.price = {};
            if (priceMin) filter.price.$gte = parseFloat(priceMin);
            if (priceMax) filter.price.$lte = parseFloat(priceMax);
        }

        if (key) {
            filter.key = new RegExp(key, 'i');
        }

        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { tags: new RegExp(search, 'i') }
            ];
        }

        // Filter by producer username
        if (producer) {
            const producerUser = await User.findOne({ username: producer });
            if (producerUser) {
                filter.producer = producerUser._id;
            } else {
                return res.json({ beats: [], total: 0, page, totalPages: 0 });
            }
        }

        // Apply sorting
        let sort = {};
        switch (sortBy) {
        case 'newest':
            sort = { createdAt: -1 };
            break;
        case 'oldest':
            sort = { createdAt: 1 };
            break;
        case 'price-low':
            sort = { price: 1 };
            break;
        case 'price-high':
            sort = { price: -1 };
            break;
        case 'popular':
            sort = { plays: -1 };
            break;
        case 'bpm-low':
            sort = { bpm: 1 };
            break;
        case 'bpm-high':
            sort = { bpm: -1 };
            break;
        default:
            sort = { createdAt: -1 };
        }

        // Count total matching documents
        const total = await Beat.countDocuments(filter);

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute query with population and pagination
        const beats = await Beat.find(filter)
            .populate('producer', 'username displayName bio avatar subscription')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.json({
            success: true,
            beats,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            filters: {
                category,
                genre,
                bpmRange: [bpmMin, bpmMax],
                priceRange: [priceMin, priceMax],
                key,
                search,
                producer
            }
        });
    } catch (error) {
        console.error('Get beats error:', error);
        res.status(500).json({ error: 'Failed to get beats', details: error.message });
    }
});

// TODO: Advanced search endpoint - needs refactoring for MongoDB
// router.get('/search/advanced', async (req, res) => {
//     try {
//         const searchResults = await Beat.find(...)
//         res.json({ success: true, ...searchResults });
//     } catch (error) {
//         console.error('Search error:', error);
//         res.status(500).json({ error: 'Failed to search beats' });
//     }
// });

// TODO: Get search suggestions - needs refactoring for MongoDB  
// router.get('/search/suggestions', async (req, res) => {
//     try {
//         const suggestions = await Beat.aggregate(...)
//         res.json({ success: true, suggestions });
//     } catch (error) {
//         console.error('Suggestions error:', error);
//         res.status(500).json({ error: 'Failed to get suggestions' });
//     }
// });

// TODO: Get filter options - needs refactoring for MongoDB
// router.get('/search/filters', async (req, res) => {
//     try {
//         const filterOptions = await Beat.aggregate(...)
//         res.json({ success: true, filters: filterOptions });
//     } catch (error) {
//         console.error('Filter options error:', error);
//         res.status(500).json({ error: 'Failed to get filter options' });
//     }
// });

// Get trending beats (top 5 random beats based on algorithm)
router.get('/trending', async (req, res) => {
    try {
        // Get all beats and randomly select 5 for trending section
        const allBeats = await Beat.find({ isPublic: true })
            .populate('producer', 'username displayName avatar')
            .lean();

        // Shuffle and pick top 5 randomly (simulating trending algorithm)
        const shuffled = allBeats.sort(() => 0.5 - Math.random());
        const trending = shuffled.slice(0, Math.min(5, shuffled.length));

        res.json({
            success: true,
            beats: trending,
            total: trending.length
        });
    } catch (error) {
        console.error('Get trending beats error:', error);
        res.status(500).json({ error: 'Failed to get trending beats', details: error.message });
    }
});

// Get single beat by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const beat = await Beat.findById(id).populate('producer', 'username displayName avatar').lean();

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        res.json({
            success: true,
            beat
        });
    } catch (error) {
        console.error('Get beat error:', error);
        res.status(500).json({ error: 'Failed to get beat', details: error.message });
    }
});

// TODO: Implement these routes with MongoDB
/*
// Create new beat
router.post('/', auth, async (req, res) => {
    const beat = new Beat({ ...req.body, producer: req.user.userId });
    await beat.save();
    res.status(201).json({ success: true, beat });
});

// Update beat  
router.put('/:id', auth, async (req, res) => {
    const beat = await Beat.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, beat });
});

// Delete beat
router.delete('/:id', auth, async (req, res) => {
    await Beat.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Beat deleted' });
});

// Like/Unlike beat
router.post('/:id/like', auth, async (req, res) => {
    const beat = await Beat.findById(req.params.id);
    const userId = req.user.userId;
    if (beat.likes.includes(userId)) {
        beat.likes.pull(userId);
    } else {
        beat.likes.push(userId);
    }
    await beat.save();
    res.json({ success: true, likes: beat.likes.length });
});

// Track play
router.post('/:id/play', async (req, res) => {
    await Beat.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } });
    res.json({ success: true });
});
*/

module.exports = router;
