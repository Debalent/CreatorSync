// User Routes for CreatorSync
const express = require('express');
const router = express.Router();
const User = require('../models/UserMongoose');
const Beat = require('../models/BeatMongoose');
const { authenticate: auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// In-memory social graph used for quick mock/testing. Replace with DB-backed implementation in production.
const users = new Map();
const followers = new Map();
const following = new Map();

// Get user profile by ID or username
router.get('/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;

        // Find user by ID or username
        let user;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            // If it's a valid MongoDB ObjectId
            user = await User.findById(identifier).select('-password').lean();
        } else {
            // Otherwise treat as username
            user = await User.findOne({ username: identifier }).select('-password').lean();
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get beat count for this user
        const beatCount = await Beat.countDocuments({ producer: user._id });

        // Get total likes and plays from user's beats
        const beatStats = await Beat.aggregate([
            { $match: { producer: user._id } },
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: { $size: '$likes' } },
                    totalPlays: { $sum: '$plays' }
                }
            }
        ]);

        const stats = beatStats[0] || { totalLikes: 0, totalPlays: 0 };

        const profileWithStats = {
            ...user,
            stats: {
                beats: beatCount,
                followers: user.followers?.length || 0,
                following: user.following?.length || 0,
                likes: stats.totalLikes,
                plays: stats.totalPlays
            }
        };

        res.json({
            success: true,
            user: profileWithStats
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ error: 'Failed to get user profile', details: error.message });
    }
});

// Get user by username specifically (for profile page)
router.get('/username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const user = await User.findOne({ username }).select('-password').lean();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get beat count
        const beatCount = await Beat.countDocuments({ producer: user._id });

        // Get total likes and plays
        const beatStats = await Beat.aggregate([
            { $match: { producer: user._id } },
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: { $size: '$likes' } },
                    totalPlays: { $sum: '$plays' }
                }
            }
        ]);

        const stats = beatStats[0] || { totalLikes: 0, totalPlays: 0 };

        res.json({
            success: true,
            user: {
                ...user,
                stats: {
                    beats: beatCount,
                    followers: user.followers?.length || 0,
                    following: user.following?.length || 0,
                    likes: stats.totalLikes,
                    plays: stats.totalPlays
                }
            }
        });
    } catch (error) {
        console.error('Get user by username error:', error);
        res.status(500).json({ error: 'Failed to get user', details: error.message });
    }
});

// Get user's beats
router.get('/:identifier/beats', async (req, res) => {
    try {
        const { identifier } = req.params;
        const { page = 1, limit = 12, sortBy = 'newest' } = req.query;

        // Find user by ID or username
        let user;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(identifier);
        } else {
            user = await User.findOne({ username: identifier });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Build sort criteria
        let sort = {};
        switch (sortBy) {
        case 'newest':
            sort = { createdAt: -1 };
            break;
        case 'oldest':
            sort = { createdAt: 1 };
            break;
        case 'popular':
            sort = { plays: -1 };
            break;
        case 'price-low':
            sort = { price: 1 };
            break;
        case 'price-high':
            sort = { price: -1 };
            break;
        default:
            sort = { createdAt: -1 };
        }

        // Count total beats
        const total = await Beat.countDocuments({ producer: user._id });

        // Get paginated beats
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const userBeats = await Beat.find({ producer: user._id })
            .populate('producer', 'username displayName avatar')
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.json({
            success: true,
            beats: userBeats,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get user beats error:', error);
        res.status(500).json({ error: 'Failed to get user beats', details: error.message });
    }
});

// Follow/Unfollow user
router.post('/:userId/follow', auth, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.userId;

        if (userId === currentUserId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const targetUser = users.get(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get or create follower/following sets
        const targetFollowers = followers.get(userId) || new Set();
        const currentFollowing = following.get(currentUserId) || new Set();

        const isFollowing = currentFollowing.has(userId);

        if (isFollowing) {
            // Unfollow
            targetFollowers.delete(currentUserId);
            currentFollowing.delete(userId);
        } else {
            // Follow
            targetFollowers.add(currentUserId);
            currentFollowing.add(userId);
        }

        // Update sets
        followers.set(userId, targetFollowers);
        following.set(currentUserId, currentFollowing);

        res.json({
            success: true,
            message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
            isFollowing: !isFollowing,
            followerCount: targetFollowers.size
        });
    } catch (error) {
        console.error('Follow/Unfollow error:', error);
        res.status(500).json({ error: 'Failed to update follow status' });
    }
});

// Get user's followers
router.get('/:userId/followers', (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const targetUser = users.get(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userFollowers = followers.get(userId) || new Set();
        const followerList = Array.from(userFollowers).map(followerId => {
            const follower = users.get(followerId);
            if (follower) {
                const { password, ...publicData } = follower;
                return publicData;
            }
            return null;
        }).filter(Boolean);

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedFollowers = followerList.slice(startIndex, endIndex);

        res.json({
            success: true,
            followers: paginatedFollowers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: followerList.length,
                pages: Math.ceil(followerList.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ error: 'Failed to get followers' });
    }
});

// Get user's following
router.get('/:userId/following', (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const targetUser = users.get(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userFollowing = following.get(userId) || new Set();
        const followingList = Array.from(userFollowing).map(followedId => {
            const followedUser = users.get(followedId);
            if (followedUser) {
                const { password, ...publicData } = followedUser;
                return publicData;
            }
            return null;
        }).filter(Boolean);

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedFollowing = followingList.slice(startIndex, endIndex);

        res.json({
            success: true,
            following: paginatedFollowing,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: followingList.length,
                pages: Math.ceil(followingList.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ error: 'Failed to get following' });
    }
});

// Search users
router.get('/search/all', (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const searchTerm = q.toLowerCase().trim();
        const allUsers = Array.from(users.values());

        // Search by username, artist name, or bio
        const matchingUsers = allUsers.filter(user => {
            const { password, ...searchableUser } = user;
            return (
                user.username.toLowerCase().includes(searchTerm) ||
                (user.artistName && user.artistName.toLowerCase().includes(searchTerm)) ||
                (user.profile?.bio && user.profile.bio.toLowerCase().includes(searchTerm))
            );
        }).map(user => {
            const { password, ...publicData } = user;

            // Add social stats
            const userFollowers = followers.get(user.id) || new Set();
            const userFollowing = following.get(user.id) || new Set();

            return {
                ...publicData,
                stats: {
                    ...publicData.stats,
                    followers: userFollowers.size,
                    following: userFollowing.size
                }
            };
        });

        // Sort by follower count (most followed first)
        matchingUsers.sort((a, b) => b.stats.followers - a.stats.followers);

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedUsers = matchingUsers.slice(startIndex, endIndex);

        res.json({
            success: true,
            users: paginatedUsers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: matchingUsers.length,
                pages: Math.ceil(matchingUsers.length / limitNum)
            },
            query: q
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Get user's favorite beats
router.get('/:userId/favorites', auth, (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 12 } = req.query;

        // Check if user can access favorites (own favorites or public)
        if (userId !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized to view favorites' });
        }

        // Mock favorite beats (replace with real database query)
        const favoriteBeats = [
            {
                id: uuidv4(),
                title: 'Favorite Beat 1',
                artist: 'SomeArtist',
                category: 'hip-hop',
                price: 30,
                artwork: '/assets/artwork/fav1.jpg',
                favoritedAt: new Date()
            },
            {
                id: uuidv4(),
                title: 'Favorite Beat 2',
                artist: 'AnotherArtist',
                category: 'r&b',
                price: 25,
                artwork: '/assets/artwork/fav2.jpg',
                favoritedAt: new Date()
            }
        ];

        // Apply pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedFavorites = favoriteBeats.slice(startIndex, endIndex);

        res.json({
            success: true,
            favorites: paginatedFavorites,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: favoriteBeats.length,
                pages: Math.ceil(favoriteBeats.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Failed to get favorites' });
    }
});

// Get user's analytics (for own profile)
router.get('/:userId/analytics', auth, (req, res) => {
    try {
        const { userId } = req.params;

        // Check authorization
        if (userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to view analytics' });
        }

        // Mock analytics data (replace with real analytics)
        const analytics = {
            overview: {
                totalBeats: 24,
                totalPlays: 15847,
                totalLikes: 2341,
                totalEarnings: 1247.50,
                followerGrowth: 15.2,
                playGrowth: 23.5
            },
            recentActivity: [
                { type: 'beat_sold', beatTitle: 'Urban Nights', amount: 25, date: new Date() },
                { type: 'new_follower', username: 'NewFan123', date: new Date() },
                { type: 'beat_liked', beatTitle: 'Melodic Dreams', date: new Date() }
            ],
            topBeats: [
                { title: 'Urban Nights', plays: 2847, likes: 456, earnings: 375 },
                { title: 'Melodic Dreams', plays: 2341, likes: 389, earnings: 290 },
                { title: 'Trap Anthem', plays: 1956, likes: 267, earnings: 245 }
            ],
            monthlyStats: [
                { month: 'Jan', plays: 1200, earnings: 150 },
                { month: 'Feb', plays: 1450, earnings: 185 },
                { month: 'Mar', plays: 1789, earnings: 234 },
                { month: 'Apr', plays: 2156, earnings: 289 }
            ]
        };

        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Get user analytics error:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

// Get leaderboard/top users
router.get('/leaderboard/all', (req, res) => {
    try {
        const { category = 'followers', limit = 50 } = req.query;

        const allUsers = Array.from(users.values()).map(user => {
            const { password, ...publicData } = user;

            // Add social stats
            const userFollowers = followers.get(user.id) || new Set();
            const userFollowing = following.get(user.id) || new Set();

            return {
                ...publicData,
                stats: {
                    ...publicData.stats,
                    followers: userFollowers.size,
                    following: userFollowing.size
                }
            };
        });

        // Sort by selected category
        let sortedUsers;
        switch (category) {
        case 'followers':
            sortedUsers = allUsers.sort((a, b) => b.stats.followers - a.stats.followers);
            break;
        case 'beats':
            sortedUsers = allUsers.sort((a, b) => b.stats.beatsUploaded - a.stats.beatsUploaded);
            break;
        case 'earnings':
            sortedUsers = allUsers.sort((a, b) => b.stats.totalEarnings - a.stats.totalEarnings);
            break;
        default:
            sortedUsers = allUsers.sort((a, b) => b.stats.followers - a.stats.followers);
        }

        const limitNum = parseInt(limit);
        const topUsers = sortedUsers.slice(0, limitNum);

        res.json({
            success: true,
            leaderboard: topUsers,
            category,
            total: allUsers.length
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

module.exports = router;
