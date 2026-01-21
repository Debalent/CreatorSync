// User Model for CreatorSync
// Database schema and methods for user management

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/**
 * User class representing a CreatorSync user
 * This is a placeholder model - integrate with your database (MongoDB, PostgreSQL, etc.)
 */
class User {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.username = data.username;
        this.email = data.email;
        this.password = data.password; // Should be hashed
        this.role = data.role || 'user';
        this.subscription = data.subscription || 'free';
        this.avatar = data.avatar || null;
        this.bio = data.bio || '';
        this.location = data.location || '';
        this.website = data.website || '';
        this.socialLinks = data.socialLinks || {};
        this.verified = data.verified || false;
        this.followers = data.followers || [];
        this.following = data.following || [];
        this.favorites = data.favorites || [];
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.lastLogin = data.lastLogin || null;
    }

    /**
     * Hash user password
     * @param {String} password - Plain text password
     * @returns {Promise<String>} Hashed password
     */
    static async hashPassword(password) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        return await bcrypt.hash(password, rounds);
    }

    /**
     * Compare password with hash
     * @param {String} password - Plain text password
     * @param {String} hash - Hashed password
     * @returns {Promise<Boolean>} True if password matches
     */
    static async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Validate email format
     * @param {String} email - Email address
     * @returns {Boolean} True if valid
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate username format
     * @param {String} username - Username
     * @returns {Boolean} True if valid
     */
    static isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        return usernameRegex.test(username);
    }

    /**
     * Validate password strength
     * @param {String} password - Password
     * @returns {Object} Validation result
     */
    static validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const isValid = password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;

        return {
            isValid,
            errors: [
                password.length < minLength && `Password must be at least ${minLength} characters`,
                !hasUpperCase && 'Password must contain at least one uppercase letter',
                !hasLowerCase && 'Password must contain at least one lowercase letter',
                !hasNumbers && 'Password must contain at least one number'
            ].filter(Boolean)
        };
    }

    /**
     * Get user's public profile (safe for API responses)
     * @returns {Object} Public user data
     */
    toPublicProfile() {
        return {
            id: this.id,
            username: this.username,
            avatar: this.avatar,
            bio: this.bio,
            location: this.location,
            website: this.website,
            socialLinks: this.socialLinks,
            verified: this.verified,
            followerCount: this.followers.length,
            followingCount: this.following.length,
            createdAt: this.createdAt
        };
    }

    /**
     * Get user's private profile (includes sensitive data)
     * @returns {Object} Private user data
     */
    toPrivateProfile() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            subscription: this.subscription,
            avatar: this.avatar,
            bio: this.bio,
            location: this.location,
            website: this.website,
            socialLinks: this.socialLinks,
            verified: this.verified,
            followers: this.followers,
            following: this.following,
            favorites: this.favorites,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastLogin: this.lastLogin
        };
    }

    /**
     * Check if user has a specific subscription level
     * @param {String} level - Subscription level to check
     * @returns {Boolean} True if user has the subscription
     */
    hasSubscription(level) {
        const levels = ['free', 'starter', 'pro', 'enterprise'];
        const userLevelIndex = levels.indexOf(this.subscription);
        const requiredLevelIndex = levels.indexOf(level);
        return userLevelIndex >= requiredLevelIndex;
    }

    /**
     * Check if user is following another user
     * @param {String} userId - User ID to check
     * @returns {Boolean} True if following
     */
    isFollowing(userId) {
        return this.following.includes(userId);
    }

    /**
     * Check if user has favorited a beat
     * @param {String} beatId - Beat ID to check
     * @returns {Boolean} True if favorited
     */
    hasFavorited(beatId) {
        return this.favorites.includes(beatId);
    }
}

/**
 * In-memory user storage (replace with database)
 * This is a temporary solution for development
 */
class UserRepository {
    constructor() {
        this.users = new Map();
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<User>} Created user
     */
    async create(userData) {
        const user = new User(userData);
        this.users.set(user.id, user);
        return user;
    }

    /**
     * Find user by ID
     * @param {String} id - User ID
     * @returns {Promise<User|null>} User or null
     */
    async findById(id) {
        return this.users.get(id) || null;
    }

    /**
     * Find user by email
     * @param {String} email - Email address
     * @returns {Promise<User|null>} User or null
     */
    async findByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email === email) {
                return user;
            }
        }
        return null;
    }

    /**
     * Find user by username
     * @param {String} username - Username
     * @returns {Promise<User|null>} User or null
     */
    async findByUsername(username) {
        for (const user of this.users.values()) {
            if (user.username === username) {
                return user;
            }
        }
        return null;
    }

    /**
     * Update user
     * @param {String} id - User ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<User|null>} Updated user or null
     */
    async update(id, updates) {
        const user = this.users.get(id);
        if (!user) return null;

        Object.assign(user, updates);
        user.updatedAt = new Date();
        return user;
    }

    /**
     * Delete user
     * @param {String} id - User ID
     * @returns {Promise<Boolean>} True if deleted
     */
    async delete(id) {
        return this.users.delete(id);
    }

    /**
     * Get all users (with pagination)
     * @param {Number} limit - Number of users to return
     * @param {Number} offset - Offset for pagination
     * @returns {Promise<Array>} Array of users
     */
    async findAll(limit = 50, offset = 0) {
        const users = Array.from(this.users.values());
        return users.slice(offset, offset + limit);
    }
}

// Export singleton instance
const userRepository = new UserRepository();

module.exports = {
    User,
    UserRepository,
    userRepository
};

