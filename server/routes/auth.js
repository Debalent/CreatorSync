// Authentication Routes for CreatorSync
const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const translationManager = require('../utils/translationManager');

// In-memory sessions (for simplicity, can be replaced with Redis)
const sessions = new Map();

// Export sessions for use in other routes
module.exports.sessions = sessions;

// Middleware to verify authentication
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    const session = sessions.get(token);
    if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = await dataManager.findUserById(session.userId);
    next();
};

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, artistName } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await dataManager.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = uuidv4();
        const user = {
            id: userId,
            username,
            email,
            password: hashedPassword,
            artistName: artistName || username,
            joinedAt: new Date(),
            isVerified: false,
            profile: {
                bio: '',
                location: '',
                website: '',
                socialLinks: {}
            },
            stats: {
                beatsUploaded: 0,
                totalEarnings: 0,
                followers: 0,
                following: 0
            }
        };

        await dataManager.addUser(user);

        // Create session
        const token = uuidv4();
        const session = {
            userId,
            token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        sessions.set(token, session);

        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;

        res.status(201).json({
            success: true,
            message: translationManager.translate(req.language, 'auth.signupSuccessful'),
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await dataManager.findUserByEmail(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create session
        const token = uuidv4();
        const session = {
            userId: user.id,
            token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        sessions.set(token, session);

        // Return user data (without password)
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: translationManager.translate(req.language, 'auth.loginSuccessful'),
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Logout user
router.post('/logout', authenticateUser, (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            sessions.delete(token);
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

// Get current user profile
router.get('/profile', authenticateUser, (req, res) => {
    try {
        const { password: _, ...userWithoutPassword } = req.user;

        res.json({
            success: true,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
    try {
        const { artistName, bio, location, website, socialLinks } = req.body;
        const user = req.user;

        // Update profile fields
        if (artistName) user.artistName = artistName;
        if (bio !== undefined) user.profile.bio = bio;
        if (location !== undefined) user.profile.location = location;
        if (website !== undefined) user.profile.website = website;
        if (socialLinks) user.profile.socialLinks = { ...user.profile.socialLinks, ...socialLinks };

        user.updatedAt = new Date();
        await dataManager.updateUser(user.id, user);

        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.put('/password', authenticateUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        user.password = hashedPassword;
        user.updatedAt = new Date();
        await dataManager.updateUser(user.id, user);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Verify email (placeholder)
router.post('/verify-email', authenticateUser, async (req, res) => {
    try {
        const { verificationCode } = req.body;
        const user = req.user;

        // Mock verification (implement real email verification)
        if (verificationCode === '123456') {
            user.isVerified = true;
            user.updatedAt = new Date();
            await dataManager.updateUser(user.id, user);

            res.json({
                success: true,
                message: 'Email verified successfully'
            });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Request password reset (placeholder)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Mock password reset (implement real email sending)
        const user = await dataManager.findUserByEmail(email);

        if (user) {
            // In real implementation, send password reset email
            console.log(`Password reset requested for: ${email}`);
        }

        // Always return success for security (don't reveal if email exists)
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

module.exports = router;
