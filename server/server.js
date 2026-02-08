// CreatorSync Backend Server
// Proprietary platform for music monetization and collaboration
// Developed by Demond Balentine

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const beatRoutes = require('./routes/beats');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const subscriptionRoutes = require('./routes/subscriptions');
const aiSongwriterRoutes = require('./routes/ai-songwriter');
const pluginRoutes = require('./routes/plugins');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const biddingRoutes = require('./routes/bidding');
const treasuryRoutes = require('./routes/treasury');
const platformAnalyticsRoutes = require('./routes/platform-analytics');
const beatMakerRoutes = require('./routes/beat-maker');
const samplesRoutes = require('./routes/samples');
const exportRoutes = require('./routes/export');

// Import utilities
const translationManager = require('./utils/translationManager');
const { logger, requestLogger, errorLogger, socketLogger } = require('./utils/logger');
const { cacheManager } = require('./utils/cache');
const swaggerSpec = require('./utils/swagger');
const swaggerUi = require('swagger-ui-express');
const NotificationManager = require('./utils/notificationManager');
const emailService = require('./utils/emailService');
const audioProcessor = require('./utils/audioProcessor');
const searchEngine = require('./utils/searchEngine');
const payoutScheduler = require('./utils/payoutScheduler');
console.log('✅ payoutScheduler loaded');
const analyticsTracker = require('./utils/analyticsTracker');
console.log('✅ analyticsTracker loaded');

console.log('✅ All utilities loaded');

// Import middleware
const { apiLimiter, authLimiter, uploadLimiter, paymentLimiter } = require('./middleware/rateLimiter');
const { socketAuth } = require('./middleware/auth');

console.log('✅ All middleware loaded');
console.log('🏗️  Defining CreatorSyncServer class...');

class CreatorSyncServer {
    constructor () {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:5501',
                methods: ['GET', 'POST']
            }
        });

        this.port = process.env.PORT || 3000;
        this.connectedUsers = new Map();
        this.activeCollaborations = new Map();

        // Initialize notification manager
        this.notificationManager = new NotificationManager(this.io);

        this.initializeCache();
        this.initializeMiddleware();
        this.initializeTranslations();
        this.initializeRoutes();
        this.initializeSocketHandlers();
        this.initializeErrorHandling();
    }

    async initializeCache () {
        try {
            await cacheManager.connect();
            logger.info('Cache manager initialized');
        } catch (error) {
            logger.warn('Cache initialization failed, continuing without cache', { error: error.message });
        }
    }

    initializeMiddleware () {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ['\'self\''],
                    styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
                    fontSrc: ['\'self\'', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
                    scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.socket.io', 'https://unpkg.com'],
                    workerSrc: ['\'self\'', 'blob:'],
                    imgSrc: ['\'self\'', 'data:', 'https:'],
                    connectSrc: ['\'self\'', 'ws:', 'wss:', 'https://cdn.socket.io', 'https://unpkg.com']
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.CLIENT_URL || 'http://localhost:5501',
            credentials: true
        }));

        // Language detection middleware
        this.app.use((req, res, next) => {
            const acceptLanguage = req.headers['accept-language'];
            req.language = translationManager.detectLanguage(acceptLanguage);
            next();
        });

        // Compression for better performance
        this.app.use(compression());

        // Logging - Use Winston instead of Morgan
        this.app.use(requestLogger);

        // Body parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Static files
        this.app.use(express.static(path.join(__dirname, '../public')));
        this.app.use('/translations', express.static(path.join(__dirname, '../translations')));

        // File upload configuration
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(__dirname, '../public/uploads');
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
            }
        });

        this.upload = multer({
            storage,
            limits: {
                fileSize: 100 * 1024 * 1024 // 100MB limit
            },
            fileFilter: (req, file, cb) => {
                // Allow audio files, images, and project files
                const allowedMimes = [
                    'audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac',
                    'image/jpeg', 'image/png', 'image/gif',
                    'application/zip', 'application/x-zip-compressed'
                ];

                if (allowedMimes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Invalid file type'), false);
                }
            }
        });
    }

    async initializeTranslations () {
        try {
            await translationManager.initialize();
            console.log('🌍 Translation system initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize translation system:', error);
        }
    }

    initializeRoutes () {
        // API Documentation
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'CreatorSync API Documentation'
        }));

        // Apply general API rate limiting
        this.app.use('/api', apiLimiter);

        // Initialize notification routes with notification manager
        notificationRoutes.setNotificationManager(this.notificationManager);

        // API routes with specific rate limiters
        this.app.use('/api/auth', authLimiter, authRoutes);
        this.app.use('/api/beats', beatRoutes);
        this.app.use('/api/users', userRoutes);
        this.app.use('/api/payments', paymentLimiter, paymentRoutes);
        this.app.use('/api/subscriptions', subscriptionRoutes);
        this.app.use('/api/ai-songwriter', aiSongwriterRoutes);
        this.app.use('/api/plugins', pluginRoutes);
        this.app.use('/api/analytics', analyticsRoutes);
        this.app.use('/api/notifications', notificationRoutes);
        this.app.use('/api/bidding', biddingRoutes);
        this.app.use('/api/treasury', treasuryRoutes);
        this.app.use('/api/platform-analytics', platformAnalyticsRoutes);
        this.app.use('/api/beat-maker', beatMakerRoutes);
        this.app.use('/api/beat-maker', samplesRoutes);
        this.app.use('/api/beat-maker', exportRoutes);

        // Beat upload endpoint with rate limiting
        this.app.post('/api/upload/beat', uploadLimiter, this.upload.fields([
            { name: 'audio', maxCount: 1 },
            { name: 'artwork', maxCount: 1 }
        ]), this.handleBeatUpload.bind(this));

        // Collaboration endpoints
        this.app.post('/api/collaboration/create', this.createCollaboration.bind(this));
        this.app.post('/api/collaboration/invite', this.inviteToCollaboration.bind(this));
        this.app.get('/api/collaboration/:id', this.getCollaboration.bind(this));

        // Analytics endpoints
        this.app.get('/api/analytics/dashboard', this.getDashboardAnalytics.bind(this));
        this.app.get('/api/analytics/earnings', this.getEarningsAnalytics.bind(this));

        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: '1.0.0'
            });
        });

        // Serve main app for all other routes
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });
    }

    initializeSocketHandlers () {
        // Add Socket.IO authentication middleware
        this.io.use(socketAuth);

        this.io.on('connection', (socket) => {
            logger.info('User connected', { socketId: socket.id, userId: socket.user?.userId });

            // User authentication
            socket.on('authenticate', (userData) => {
                this.connectedUsers.set(socket.id, {
                    ...userData,
                    socketId: socket.id,
                    connectedAt: new Date()
                });

                // Register user for notifications
                if (userData.userId) {
                    this.notificationManager.registerUser(userData.userId, socket.id);
                }

                // Notify other users
                socket.broadcast.emit('user_online', {
                    userId: userData.userId,
                    username: userData.username
                });
            });

            // Beat interaction events
            socket.on('play_beat', (beatData) => {
                this.handleBeatPlay(socket, beatData);
            });

            socket.on('like_beat', (beatData) => {
                this.handleBeatLike(socket, beatData);
            });

            socket.on('toggle_favorite', (data) => {
                this.handleToggleFavorite(socket, data);
            });

            // Real-time collaboration
            socket.on('join_collaboration', (collaborationId) => {
                socket.join(`collab_${collaborationId}`);
                this.handleJoinCollaboration(socket, collaborationId);
            });

            socket.on('leave_collaboration', (collaborationId) => {
                socket.leave(`collab_${collaborationId}`);
                this.handleLeaveCollaboration(socket, collaborationId);
            });

            socket.on('collaboration_update', (data) => {
                this.handleCollaborationUpdate(socket, data);
            });

            // Chat functionality
            socket.on('send_message', (messageData) => {
                this.handleChatMessage(socket, messageData);
            });

            // File sharing in collaboration
            socket.on('share_file', (fileData) => {
                this.handleFileShare(socket, fileData);
            });

            // Finisher integration events
            socket.on('finisher_project_update', (projectData) => {
                this.handleFinisherProjectUpdate(socket, projectData);
            });

            socket.on('finisher_collaboration_invite', (inviteData) => {
                this.handleFinisherCollaborationInvite(socket, inviteData);
            });

            socket.on('finisher_sync_request', (syncData) => {
                this.handleFinisherSync(socket, syncData);
            });

            // Beat Maker collaboration events
            socket.on('beatmaker_join_session', (sessionData) => {
                this.handleBeatMakerJoin(socket, sessionData);
            });

            socket.on('beatmaker_leave_session', (sessionId) => {
                this.handleBeatMakerLeave(socket, sessionId);
            });

            socket.on('beatmaker_project_update', (updateData) => {
                this.handleBeatMakerProjectUpdate(socket, updateData);
            });

            socket.on('beatmaker_track_update', (trackData) => {
                this.handleBeatMakerTrackUpdate(socket, trackData);
            });

            socket.on('beatmaker_pattern_update', (patternData) => {
                this.handleBeatMakerPatternUpdate(socket, patternData);
            });

            socket.on('beatmaker_effect_update', (effectData) => {
                this.handleBeatMakerEffectUpdate(socket, effectData);
            });

            socket.on('beatmaker_playback_state', (playbackData) => {
                this.handleBeatMakerPlaybackState(socket, playbackData);
            });

            // Disconnect handling
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
                const user = this.connectedUsers.get(socket.id);

                if (user) {
                    // Unregister from notifications
                    if (user.userId) {
                        this.notificationManager.unregisterUser(user.userId);
                    }

                    // Notify other users
                    socket.broadcast.emit('user_offline', {
                        userId: user.userId,
                        username: user.username
                    });

                    this.connectedUsers.delete(socket.id);
                }
            });
        });
    }

    // Socket event handlers
    handleBeatPlay (socket, beatData) {
        // Track play analytics
        console.log(`Beat played: ${beatData.beatId} by user: ${socket.id}`);

        // Emit to analytics system
        this.io.emit('beat_analytics', {
            type: 'play',
            beatId: beatData.beatId,
            userId: beatData.userId,
            timestamp: new Date()
        });
    }

    handleBeatLike (socket, beatData) {
        // Handle beat like/unlike
        console.log(`Beat liked: ${beatData.beatId} by user: ${socket.id}`);

        // Update like count and emit to all users
        socket.broadcast.emit('beat_liked', {
            beatId: beatData.beatId,
            newLikeCount: beatData.newLikeCount
        });
    }

    handleToggleFavorite (socket, data) {
        // Toggle favorite status
        console.log(`Favorite toggled: ${data.beatId} by user: ${socket.id}`);

        // Emit confirmation back to user
        socket.emit('favorite_updated', {
            beatId: data.beatId,
            isFavorited: data.isFavorited
        });
    }

    handleJoinCollaboration (socket, collaborationId) {
        const collaboration = this.activeCollaborations.get(collaborationId);
        if (collaboration) {
            // Add user to collaboration
            socket.to(`collab_${collaborationId}`).emit('user_joined_collaboration', {
                userId: socket.id,
                collaborationId
            });
        }
    }

    handleLeaveCollaboration (socket, collaborationId) {
        socket.to(`collab_${collaborationId}`).emit('user_left_collaboration', {
            userId: socket.id,
            collaborationId
        });
    }

    handleCollaborationUpdate (socket, data) {
        // Broadcast collaboration updates to all participants
        socket.to(`collab_${data.collaborationId}`).emit('collaboration_updated', {
            type: data.type,
            content: data.content,
            timestamp: new Date(),
            userId: socket.id
        });
    }

    handleChatMessage (socket, messageData) {
        // Handle real-time chat in collaborations
        socket.to(`collab_${messageData.collaborationId}`).emit('new_message', {
            message: messageData.message,
            userId: messageData.userId,
            username: messageData.username,
            timestamp: new Date()
        });
    }

    handleFileShare (socket, fileData) {
        // Handle file sharing in collaborations
        socket.to(`collab_${fileData.collaborationId}`).emit('file_shared', {
            fileName: fileData.fileName,
            fileUrl: fileData.fileUrl,
            fileType: fileData.fileType,
            sharedBy: fileData.userId,
            timestamp: new Date()
        });
    }

    // HTTP route handlers
    async handleBeatUpload (req, res) {
        try {
            const { title, artist, category, price, bpm, key, tags } = req.body;
            const audioFile = req.files.audio ? req.files.audio[0] : null;
            const artworkFile = req.files.artwork ? req.files.artwork[0] : null;

            if (!audioFile) {
                return res.status(400).json({ error: 'Audio file is required' });
            }

            const beatData = {
                id: uuidv4(),
                title,
                artist,
                category,
                price: parseFloat(price),
                bpm: parseInt(bpm),
                key,
                tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
                audioUrl: `/uploads/${audioFile.filename}`,
                artwork: artworkFile ? `/uploads/${artworkFile.filename}` : '/assets/default-artwork.jpg',
                uploadedAt: new Date(),
                likes: 0,
                plays: 0
            };

            // Save to database (placeholder - implement your database logic)
            // await this.saveBeatToDatabase(beatData);

            // Emit to all connected clients
            this.io.emit('beat_uploaded', beatData);

            res.json({
                success: true,
                message: 'Beat uploaded successfully',
                beat: beatData
            });
        } catch (error) {
            console.error('Beat upload error:', error);
            res.status(500).json({ error: 'Failed to upload beat' });
        }
    }

    async createCollaboration (req, res) {
        try {
            const { name, description, participants } = req.body;

            const collaboration = {
                id: uuidv4(),
                name,
                description,
                participants: participants || [],
                createdAt: new Date(),
                lastActivity: new Date(),
                files: [],
                messages: []
            };

            this.activeCollaborations.set(collaboration.id, collaboration);

            res.json({
                success: true,
                collaboration
            });
        } catch (error) {
            console.error('Collaboration creation error:', error);
            res.status(500).json({ error: 'Failed to create collaboration' });
        }
    }

    async inviteToCollaboration (req, res) {
        try {
            const { collaborationId, userId, userEmail } = req.body;

            // Send invitation (implement email/notification logic)
            this.io.emit('collaboration_invite', {
                collaborationId,
                userId,
                userEmail,
                timestamp: new Date()
            });

            res.json({
                success: true,
                message: 'Invitation sent successfully'
            });
        } catch (error) {
            console.error('Collaboration invitation error:', error);
            res.status(500).json({ error: 'Failed to send invitation' });
        }
    }

    async getCollaboration (req, res) {
        try {
            const { id } = req.params;
            const collaboration = this.activeCollaborations.get(id);

            if (!collaboration) {
                return res.status(404).json({ error: 'Collaboration not found' });
            }

            res.json({ collaboration });
        } catch (error) {
            console.error('Get collaboration error:', error);
            res.status(500).json({ error: 'Failed to get collaboration' });
        }
    }

    async getDashboardAnalytics (req, res) {
        try {
            // Mock analytics data - implement real analytics
            const analytics = {
                totalBeats: 156,
                totalPlays: 12847,
                totalEarnings: 2847.50,
                monthlyGrowth: 23.5,
                topGenres: [
                    { name: 'Hip Hop', count: 45 },
                    { name: 'Trap', count: 38 },
                    { name: 'R&B', count: 29 },
                    { name: 'Pop', count: 24 }
                ],
                recentActivity: [
                    { type: 'beat_sold', amount: 35, timestamp: new Date() },
                    { type: 'new_follower', user: 'ProducerX', timestamp: new Date() },
                    { type: 'collaboration_invite', from: 'BeatMaker', timestamp: new Date() }
                ]
            };

            res.json({ analytics });
        } catch (error) {
            console.error('Analytics error:', error);
            res.status(500).json({ error: 'Failed to get analytics' });
        }
    }

    async getEarningsAnalytics (req, res) {
        try {
            // Mock earnings data - implement real analytics
            const earnings = {
                total: 2847.50,
                thisMonth: 456.75,
                lastMonth: 389.25,
                growth: 17.3,
                transactions: [
                    { id: '1', amount: 35, beat: 'Urban Nights', date: new Date() },
                    { id: '2', amount: 25, beat: 'Melodic Dreams', date: new Date() },
                    { id: '3', amount: 45, beat: 'Trap Anthem', date: new Date() }
                ],
                projections: {
                    nextMonth: 523.45,
                    nextQuarter: 1654.32
                }
            };

            res.json({ earnings });
        } catch (error) {
            console.error('Earnings analytics error:', error);
            res.status(500).json({ error: 'Failed to get earnings analytics' });
        }
    }

    initializeErrorHandling () {
        // Handle 404 errors
        this.app.use((req, res) => {
            res.status(404).json({
                error: 'Not found',
                message: 'The requested resource was not found'
            });
        });

        // Global error handler with logging
        this.app.use(errorLogger);

        // Final error handler
        this.app.use((error, req, res, next) => {
            logger.error('Server error', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method
            });

            res.status(error.status || 500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        });
    }

    // Finisher Integration Handlers
    handleFinisherProjectUpdate (socket, projectData) {
        try {
            console.log('🎵 Finisher project update received:', projectData.projectId);

            // Broadcast project update to relevant users
            if (projectData.collaborators) {
                projectData.collaborators.forEach(userId => {
                    const targetSocket = this.findSocketByUserId(userId);
                    if (targetSocket) {
                        targetSocket.emit('finisher_project_updated', {
                            projectId: projectData.projectId,
                            projectName: projectData.projectName,
                            lastModified: projectData.lastModified,
                            changes: projectData.changes
                        });
                    }
                });
            }

            // Emit acknowledgment back to sender
            socket.emit('finisher_project_sync_complete', {
                projectId: projectData.projectId,
                status: 'success'
            });
        } catch (error) {
            console.error('❌ Error handling Finisher project update:', error);
            socket.emit('finisher_error', {
                type: 'project_update_failed',
                message: 'Failed to sync project update'
            });
        }
    }

    handleFinisherCollaborationInvite (socket, inviteData) {
        try {
            console.log('🤝 Finisher collaboration invite:', inviteData.targetUserId);

            const targetSocket = this.findSocketByUserId(inviteData.targetUserId);
            if (targetSocket) {
                targetSocket.emit('finisher_collaboration_invite', {
                    projectId: inviteData.projectId,
                    projectName: inviteData.projectName,
                    inviterName: inviteData.inviterName,
                    inviterId: inviteData.inviterId,
                    message: inviteData.message,
                    finisherUrl: inviteData.finisherUrl
                });

                // Acknowledge to sender
                socket.emit('finisher_invite_sent', {
                    targetUserId: inviteData.targetUserId,
                    status: 'delivered'
                });
            } else {
                // User not online, could store invitation for later
                socket.emit('finisher_invite_sent', {
                    targetUserId: inviteData.targetUserId,
                    status: 'pending'
                });
            }
        } catch (error) {
            console.error('❌ Error handling Finisher collaboration invite:', error);
            socket.emit('finisher_error', {
                type: 'invite_failed',
                message: 'Failed to send collaboration invite'
            });
        }
    }

    handleFinisherSync (socket, syncData) {
        try {
            console.log('🔄 Finisher sync request:', syncData.type);

            switch (syncData.type) {
            case 'user_data':
                this.syncUserDataToFinisher(socket, syncData);
                break;
            case 'project_list':
                this.syncProjectListToFinisher(socket, syncData);
                break;
            case 'beat_library':
                this.syncBeatLibraryToFinisher(socket, syncData);
                break;
            default:
                socket.emit('finisher_error', {
                    type: 'invalid_sync_type',
                    message: `Unknown sync type: ${syncData.type}`
                });
            }
        } catch (error) {
            console.error('❌ Error handling Finisher sync:', error);
            socket.emit('finisher_error', {
                type: 'sync_failed',
                message: 'Failed to process sync request'
            });
        }
    }

    syncUserDataToFinisher (socket, syncData) {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
            socket.emit('finisher_sync_response', {
                type: 'user_data',
                data: {
                    userId: user.userId,
                    username: user.username,
                    email: user.email,
                    subscription: user.subscription || 'free',
                    avatar: user.avatar
                }
            });
        }
    }

    syncProjectListToFinisher (socket, syncData) {
        // This would typically query a database for user's projects
        // For now, send a mock response
        socket.emit('finisher_sync_response', {
            type: 'project_list',
            data: {
                projects: [
                    {
                        id: 'proj_1',
                        name: 'My First Beat',
                        lastModified: new Date().toISOString(),
                        collaborators: []
                    }
                ]
            }
        });
    }

    syncBeatLibraryToFinisher (socket, syncData) {
        // This would typically query the beats database
        // For now, send a mock response
        socket.emit('finisher_sync_response', {
            type: 'beat_library',
            data: {
                beats: [
                    {
                        id: 'beat_1',
                        title: 'Sample Beat',
                        genre: 'Hip Hop',
                        bpm: 120,
                        url: '/uploads/sample-beat.mp3'
                    }
                ]
            }
        });
    }

    findSocketByUserId (userId) {
        for (const [socketId, userData] of this.connectedUsers) {
            if (userData.userId === userId) {
                return this.io.sockets.sockets.get(socketId);
            }
        }
        return null;
    }

    // Beat Maker collaboration handlers
    handleBeatMakerJoin (socket, sessionData) {
        const sessionId = sessionData.projectId;
        socket.join(`beatmaker_${sessionId}`);

        logger.info('User joined beat maker session', {
            sessionId,
            userId: socket.user?.userId,
            socketId: socket.id
        });

        // Notify other participants
        socket.to(`beatmaker_${sessionId}`).emit('beatmaker_user_joined', {
            userId: socket.user?.userId,
            username: socket.user?.username,
            timestamp: new Date()
        });

        // Send current session state to new user
        socket.emit('beatmaker_session_state', {
            sessionId,
            participants: this.getBeatMakerParticipants(sessionId)
        });
    }

    handleBeatMakerLeave (socket, sessionId) {
        socket.leave(`beatmaker_${sessionId}`);

        logger.info('User left beat maker session', {
            sessionId,
            userId: socket.user?.userId
        });

        socket.to(`beatmaker_${sessionId}`).emit('beatmaker_user_left', {
            userId: socket.user?.userId,
            timestamp: new Date()
        });
    }

    handleBeatMakerProjectUpdate (socket, updateData) {
        const { projectId, updates } = updateData;

        // Broadcast project updates to all session participants
        socket.to(`beatmaker_${projectId}`).emit('beatmaker_project_updated', {
            projectId,
            updates,
            userId: socket.user?.userId,
            timestamp: new Date()
        });

        logger.info('Beat maker project updated', {
            projectId,
            updateType: Object.keys(updates).join(', ')
        });
    }

    handleBeatMakerTrackUpdate (socket, trackData) {
        const { projectId, trackId, updates } = trackData;

        socket.to(`beatmaker_${projectId}`).emit('beatmaker_track_updated', {
            projectId,
            trackId,
            updates,
            userId: socket.user?.userId,
            timestamp: new Date()
        });
    }

    handleBeatMakerPatternUpdate (socket, patternData) {
        const { projectId, patternId, steps } = patternData;

        socket.to(`beatmaker_${projectId}`).emit('beatmaker_pattern_updated', {
            projectId,
            patternId,
            steps,
            userId: socket.user?.userId,
            timestamp: new Date()
        });
    }

    handleBeatMakerEffectUpdate (socket, effectData) {
        const { projectId, trackId, effectId, params } = effectData;

        socket.to(`beatmaker_${projectId}`).emit('beatmaker_effect_updated', {
            projectId,
            trackId,
            effectId,
            params,
            userId: socket.user?.userId,
            timestamp: new Date()
        });
    }

    handleBeatMakerPlaybackState (socket, playbackData) {
        const { projectId, isPlaying, currentTime } = playbackData;

        socket.to(`beatmaker_${projectId}`).emit('beatmaker_playback_synced', {
            projectId,
            isPlaying,
            currentTime,
            userId: socket.user?.userId,
            timestamp: new Date()
        });
    }

    getBeatMakerParticipants (sessionId) {
        const participants = [];
        const room = this.io.sockets.adapter.rooms.get(`beatmaker_${sessionId}`);

        if (room) {
            room.forEach(socketId => {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket?.user) {
                    participants.push({
                        userId: socket.user.userId,
                        username: socket.user.username,
                        socketId
                    });
                }
            });
        }

        return participants;
    }

    async start () {
        // Connect to MongoDB with Mongoose
        try {
            const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/creatorsync';
            await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000
            });
            logger.info('✅ MongoDB connected via Mongoose', { database: mongoose.connection.name });
        } catch (error) {
            logger.error('❌ MongoDB connection failed', { error: error.message });
            throw error;
        }

        this.server.listen(this.port, () => {
            logger.info(`
🎵 CreatorSync Server Running
📍 Port: ${this.port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🚀 Ready for music monetization and collaboration!
📚 API Documentation: http://localhost:${this.port}/api-docs
            `);

            // Start payout scheduler for automated weekly payouts
            try {
                payoutScheduler.start();
                logger.info('💰 Payout scheduler started - Weekly payouts every Friday at 8:00 AM');
            } catch (error) {
                logger.error('Failed to start payout scheduler', { error: error.message });
            }

            // Schedule analytics maintenance tasks
            this.scheduleAnalyticsMaintenance();
        });

        // Graceful shutdown
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }

    scheduleAnalyticsMaintenance () {
        // Create daily snapshot at midnight
        setInterval(() => {
            const now = new Date();
            if (now.getHours() === 0 && now.getMinutes() === 0) {
                analyticsTracker.createDailySnapshot();
                analyticsTracker.resetDailyMetrics();
                logger.info('Daily analytics snapshot created');
            }
        }, 60000); // Check every minute

        // Cleanup old sessions every 30 minutes
        setInterval(() => {
            analyticsTracker.cleanupOldSessions();
        }, 30 * 60 * 1000);

        // Create monthly report on the 1st of each month
        setInterval(() => {
            const now = new Date();
            if (now.getDate() === 1 && now.getHours() === 0) {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
                const monthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
                analyticsTracker.createMonthlyReport(monthKey);
                analyticsTracker.resetMonthlyMetrics();
                logger.info('Monthly analytics report created', { month: monthKey });
            }
        }, 60000);

        logger.info('📊 Analytics maintenance tasks scheduled');
    }

    async shutdown () {
        logger.info('🛑 Shutting down CreatorSync server...');

        // Create final analytics snapshot before shutdown
        try {
            analyticsTracker.createDailySnapshot();
            logger.info('Final analytics snapshot created');
        } catch (error) {
            logger.error('Error creating final snapshot', { error: error.message });
        }

        // Stop payout scheduler
        try {
            payoutScheduler.stop();
            logger.info('Payout scheduler stopped');
        } catch (error) {
            logger.error('Error stopping payout scheduler', { error: error.message });
        }

        // Close MongoDB connection
        try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed');
        } catch (error) {
            logger.error('Error closing MongoDB connection', { error: error.message });
        }

        // Close cache connection
        await cacheManager.disconnect();

        this.server.close(() => {
            logger.info('✅ Server closed successfully');
            process.exit(0);
        });

        // Force shutdown after 10 seconds
        setTimeout(() => {
            logger.error('⚠️ Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    }
}

// Initialize and start the server
console.log('🔧 Starting CreatorSync Server initialization...');
(async () => {
    try {
        console.log('📦 Creating server instance...');
        const server = new CreatorSyncServer();
        console.log('✅ Server instance created');
        console.log('🚀 Calling server.start()...');
        await server.start();
        console.log('✅ server.start() completed');
    } catch (error) {
        console.error('❌ Fatal error starting server:', error);
        console.error(error.stack);
        process.exit(1);
    }
})();

module.exports = CreatorSyncServer;
