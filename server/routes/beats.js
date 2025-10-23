// Beat Routes for CreatorSync
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock beats database (replace with real database)
const beats = new Map();
const beatStats = new Map();

// Mock authentication middleware (use the real one from auth.js)
const authenticateUser = (req, res, next) => {
    // Simplified auth check - implement proper authentication
    req.user = { id: 'mock-user-id', username: 'MockUser' };
    next();
};

// Get all beats with filtering and pagination
router.get('/', (req, res) => {
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
            sortBy = 'newest',
            page = 1,
            limit = 20
        } = req.query;

        let filteredBeats = Array.from(beats.values());

        // Apply filters
        if (category && category !== 'all') {
            filteredBeats = filteredBeats.filter(beat => beat.category === category);
        }

        if (genre) {
            filteredBeats = filteredBeats.filter(beat =>
                beat.genre.toLowerCase().includes(genre.toLowerCase())
            );
        }

        if (bpmMin) {
            filteredBeats = filteredBeats.filter(beat => beat.bpm >= parseInt(bpmMin));
        }

        if (bpmMax) {
            filteredBeats = filteredBeats.filter(beat => beat.bpm <= parseInt(bpmMax));
        }

        if (priceMin) {
            filteredBeats = filteredBeats.filter(beat => beat.price >= parseFloat(priceMin));
        }

        if (priceMax) {
            filteredBeats = filteredBeats.filter(beat => beat.price <= parseFloat(priceMax));
        }

        if (key) {
            filteredBeats = filteredBeats.filter(beat =>
                beat.key.toLowerCase().includes(key.toLowerCase())
            );
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredBeats = filteredBeats.filter(beat =>
                beat.title.toLowerCase().includes(searchLower) ||
                beat.artist.toLowerCase().includes(searchLower) ||
                beat.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }

        // Apply sorting
        switch (sortBy) {
        case 'newest':
            filteredBeats.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            break;
        case 'oldest':
            filteredBeats.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
            break;
        case 'price-low':
            filteredBeats.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredBeats.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            filteredBeats.sort((a, b) => (b.likes + b.plays) - (a.likes + a.plays));
            break;
        case 'bpm-low':
            filteredBeats.sort((a, b) => a.bpm - b.bpm);
            break;
        case 'bpm-high':
            filteredBeats.sort((a, b) => b.bpm - a.bpm);
            break;
        }

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedBeats = filteredBeats.slice(startIndex, endIndex);

        res.json({
            success: true,
            beats: paginatedBeats,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: filteredBeats.length,
                pages: Math.ceil(filteredBeats.length / limitNum)
            },
            filters: {
                category,
                genre,
                bpmRange: [bpmMin, bpmMax],
                priceRange: [priceMin, priceMax],
                key,
                search
            }
        });
    } catch (error) {
        console.error('Get beats error:', error);
        res.status(500).json({ error: 'Failed to get beats' });
    }
});

// Get single beat by ID
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const beat = beats.get(id);

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Increment view count
        const stats = beatStats.get(id) || { views: 0, plays: 0, downloads: 0 };
        stats.views += 1;
        beatStats.set(id, stats);

        res.json({
            success: true,
            beat: {
                ...beat,
                stats
            }
        });
    } catch (error) {
        console.error('Get beat error:', error);
        res.status(500).json({ error: 'Failed to get beat' });
    }
});

// Create new beat
router.post('/', authenticateUser, (req, res) => {
    try {
        const {
            title,
            artist,
            category,
            genre,
            price,
            bpm,
            key,
            duration,
            description,
            tags,
            audioUrl,
            artwork,
            isExclusive = false,
            licenseType = 'standard'
        } = req.body;

        // Validation
        if (!title || !artist || !category || !audioUrl) {
            return res.status(400).json({
                error: 'Title, artist, category, and audio URL are required'
            });
        }

        const beatId = uuidv4();
        const beat = {
            id: beatId,
            title,
            artist,
            category,
            genre: genre || category,
            price: parseFloat(price) || 0,
            bpm: parseInt(bpm) || 120,
            key: key || 'Unknown',
            duration: duration || '0:00',
            description: description || '',
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
            audioUrl,
            artwork: artwork || '/assets/default-artwork.jpg',
            isExclusive,
            licenseType,
            uploadedAt: new Date(),
            updatedAt: new Date(),
            uploadedBy: req.user.id,
            likes: 0,
            plays: 0,
            downloads: 0,
            isActive: true
        };

        beats.set(beatId, beat);
        beatStats.set(beatId, { views: 0, plays: 0, downloads: 0 });

        res.status(201).json({
            success: true,
            message: 'Beat created successfully',
            beat
        });
    } catch (error) {
        console.error('Create beat error:', error);
        res.status(500).json({ error: 'Failed to create beat' });
    }
});

// Update beat
router.put('/:id', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const beat = beats.get(id);

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Check ownership (simplified - implement proper authorization)
        if (beat.uploadedBy !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to update this beat' });
        }

        // Update fields
        const updatableFields = [
            'title', 'artist', 'category', 'genre', 'price', 'bpm', 'key',
            'duration', 'description', 'tags', 'artwork', 'isExclusive', 'licenseType'
        ];

        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'tags' && typeof req.body[field] === 'string') {
                    beat[field] = req.body[field].split(',').map(t => t.trim());
                } else {
                    beat[field] = req.body[field];
                }
            }
        });

        beat.updatedAt = new Date();
        beats.set(id, beat);

        res.json({
            success: true,
            message: 'Beat updated successfully',
            beat
        });
    } catch (error) {
        console.error('Update beat error:', error);
        res.status(500).json({ error: 'Failed to update beat' });
    }
});

// Delete beat
router.delete('/:id', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const beat = beats.get(id);

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Check ownership (simplified - implement proper authorization)
        if (beat.uploadedBy !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this beat' });
        }

        beats.delete(id);
        beatStats.delete(id);

        res.json({
            success: true,
            message: 'Beat deleted successfully'
        });
    } catch (error) {
        console.error('Delete beat error:', error);
        res.status(500).json({ error: 'Failed to delete beat' });
    }
});

// Like/Unlike beat
router.post('/:id/like', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const beat = beats.get(id);

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Toggle like (simplified - implement proper user tracking)
        const isLiked = req.body.isLiked !== false; // Default to like

        if (isLiked) {
            beat.likes += 1;
        } else {
            beat.likes = Math.max(0, beat.likes - 1);
        }

        beat.updatedAt = new Date();
        beats.set(id, beat);

        res.json({
            success: true,
            message: isLiked ? 'Beat liked' : 'Beat unliked',
            likes: beat.likes,
            isLiked
        });
    } catch (error) {
        console.error('Like beat error:', error);
        res.status(500).json({ error: 'Failed to like beat' });
    }
});

// Track beat play
router.post('/:id/play', (req, res) => {
    try {
        const { id } = req.params;
        const beat = beats.get(id);

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Increment play count
        beat.plays += 1;
        beat.updatedAt = new Date();
        beats.set(id, beat);

        const stats = beatStats.get(id) || { views: 0, plays: 0, downloads: 0 };
        stats.plays += 1;
        beatStats.set(id, stats);

        res.json({
            success: true,
            message: 'Play recorded',
            plays: beat.plays
        });
    } catch (error) {
        console.error('Track play error:', error);
        res.status(500).json({ error: 'Failed to track play' });
    }
});

// Get beat analytics
router.get('/:id/analytics', authenticateUser, (req, res) => {
    try {
        const { id } = req.params;
        const beat = beats.get(id);

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        // Check ownership (simplified)
        if (beat.uploadedBy !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view analytics' });
        }

        const stats = beatStats.get(id) || { views: 0, plays: 0, downloads: 0 };

        // Mock detailed analytics
        const analytics = {
            ...stats,
            likes: beat.likes,
            totalEarnings: beat.price * stats.downloads,
            dailyStats: [], // Would be populated with real data
            geographicData: [], // Would be populated with real data
            deviceStats: [], // Would be populated with real data
            referrerStats: [] // Would be populated with real data
        };

        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Get trending beats
router.get('/trending/now', (req, res) => {
    try {
        const allBeats = Array.from(beats.values());

        // Calculate trending score based on recent plays, likes, and uploads
        const trendingBeats = allBeats
            .map(beat => {
                const stats = beatStats.get(beat.id) || { views: 0, plays: 0, downloads: 0 };
                const daysSinceUpload = (new Date() - new Date(beat.uploadedAt)) / (1000 * 60 * 60 * 24);
                const recencyFactor = Math.max(0, 1 - (daysSinceUpload / 30)); // Decay over 30 days
                const trendingScore = (beat.likes + stats.plays + stats.views) * recencyFactor;

                return {
                    ...beat,
                    stats,
                    trendingScore
                };
            })
            .sort((a, b) => b.trendingScore - a.trendingScore)
            .slice(0, 20); // Top 20 trending

        res.json({
            success: true,
            beats: trendingBeats
        });
    } catch (error) {
        console.error('Get trending beats error:', error);
        res.status(500).json({ error: 'Failed to get trending beats' });
    }
});

// Initialize with some sample beats
const initializeSampleBeats = () => {
    const sampleBeats = [
        {
            id: uuidv4(),
            title: 'Urban Nights',
            artist: 'ProducerX',
            category: 'hip-hop',
            genre: 'Hip Hop',
            price: 25,
            bpm: 140,
            key: 'C Minor',
            duration: '3:24',
            description: 'Dark urban beat with heavy 808s',
            tags: ['dark', 'urban', 'trap', '808s'],
            audioUrl: '/assets/audio/urban-nights.mp3',
            artwork: '/assets/artwork/urban-nights.jpg',
            isExclusive: false,
            licenseType: 'standard',
            uploadedAt: new Date(),
            updatedAt: new Date(),
            uploadedBy: 'sample-user-1',
            likes: 234,
            plays: 1847,
            downloads: 47,
            isActive: true
        },
        {
            id: uuidv4(),
            title: 'Melodic Dreams',
            artist: 'BeatMaker',
            category: 'r&b',
            genre: 'R&B',
            price: 30,
            bpm: 85,
            key: 'F Major',
            duration: '4:12',
            description: 'Smooth melodic R&B instrumental',
            tags: ['melodic', 'smooth', 'vocals', 'chill'],
            audioUrl: '/assets/audio/melodic-dreams.mp3',
            artwork: '/assets/artwork/melodic-dreams.jpg',
            isExclusive: false,
            licenseType: 'standard',
            uploadedAt: new Date(),
            updatedAt: new Date(),
            uploadedBy: 'sample-user-2',
            likes: 456,
            plays: 2891,
            downloads: 73,
            isActive: true
        }
    ];

    sampleBeats.forEach(beat => {
        beats.set(beat.id, beat);
        beatStats.set(beat.id, {
            views: Math.floor(Math.random() * 1000),
            plays: beat.plays,
            downloads: beat.downloads
        });
    });
};

// Initialize sample data
initializeSampleBeats();

module.exports = router;
