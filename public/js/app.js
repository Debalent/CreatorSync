<<<<<<< HEAD
// CreatorSync - Client-side JavaScript Application
class CreatorSyncApp {
    constructor () {
        this.socket = null;
        this.audioPlayer = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.beats = [];
        this.currentCategory = 'all';
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');

        this.init();
    }

    init () {
        this.initializeSocket();
        this.initializeAudioPlayer();
        this.bindEventListeners();
        this.loadBeats();
        this.initializeScrollEffects();
        this.initializeAuth();
        this.checkAuthStatus();

        // Initialize translation system after DOM is ready
        this.initializeTranslations();
    }

    initializeTranslations () {
        // Listen for language change events
        window.addEventListener('languageChanged', (e) => {
            this.onLanguageChanged(e.detail.language);
        });

        // Update UI elements that depend on current language
        this.updateLanguageSpecificContent();
    }

    onLanguageChanged (newLanguage) {
        // Update any language-specific content
        this.updateAuthUI();
        this.updateLanguageSpecificContent();
    }

    updateLanguageSpecificContent () {
        // Update dynamic content that depends on language
        // This will be called when language changes
    }

    // Socket.IO Real-time Connection
    initializeSocket () {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to CreatorSync server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from CreatorSync server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('beat_uploaded', (beatData) => {
            this.addBeatToGrid(beatData);
            this.showNotification('New beat uploaded!', 'success');
        });

        this.socket.on('collaboration_invite', (data) => {
            this.showCollaborationInvite(data);
        });

        this.socket.on('user_online', (userData) => {
            this.updateUserStatus(userData.userId, true);
        });

        this.socket.on('user_offline', (userData) => {
            this.updateUserStatus(userData.userId, false);
        });
    }

    // Audio Player Functionality
    initializeAudioPlayer () {
        this.audioPlayer = {
            audio: new Audio(),
            progress: document.getElementById('progress'),
            playBtn: document.getElementById('playBtn'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            currentTime: document.querySelector('.current-time'),
            totalTime: document.querySelector('.total-time'),
            volumeBtn: document.getElementById('volumeBtn'),
            favoriteBtn: document.getElementById('favoriteBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            shareBtn: document.getElementById('shareBtn'),
            trackTitle: document.querySelector('.track-title'),
            trackArtist: document.querySelector('.track-artist'),
            trackArtwork: document.querySelector('.track-artwork'),
            progressBar: document.querySelector('.progress-bar')
        };

        // Audio event listeners
        this.audioPlayer.audio.addEventListener('loadedmetadata', () => {
            this.updateTotalTime();
        });

        this.audioPlayer.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.audioPlayer.audio.addEventListener('ended', () => {
            this.nextTrack();
        });

        // Progress bar click handler
        this.audioPlayer.progressBar.addEventListener('click', (e) => {
            const rect = this.audioPlayer.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            this.audioPlayer.audio.currentTime = percent * this.audioPlayer.audio.duration;
        });
    }

    // Event Listeners
    bindEventListeners () {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.smoothScroll(link.getAttribute('href'));
            });
        });

        // Authentication buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showLoginModal());
        document.getElementById('signupBtn')?.addEventListener('click', () => this.showSignupModal());
        document.getElementById('finisherBtn')?.addEventListener('click', () => this.handleFinisherAccess());
        document.getElementById('finisherNavLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleFinisherAccess();
        });

        // Modal controls
        document.getElementById('loginModalClose')?.addEventListener('click', () => this.hideModal('loginModal'));
        document.getElementById('signupModalClose')?.addEventListener('click', () => this.hideModal('signupModal'));
        document.getElementById('subscriptionModalClose')?.addEventListener('click', () => this.hideModal('subscriptionModal'));

        // Modal switching
        document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('loginModal');
            this.showSignupModal();
        });

        document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('signupModal');
            this.showLoginModal();
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('signupForm')?.addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('subscriptionForm')?.addEventListener('submit', (e) => this.handleSubscription(e));

        // Password strength checker
        document.getElementById('signupPassword')?.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));

        // Subscription plan buttons
        document.querySelectorAll('.subscribe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const plan = e.target.dataset.plan;
                this.showSubscriptionModal(plan);
            });
        });

        // Filter tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBeats(btn.dataset.category);
                this.updateActiveTab(btn);
            });
        });

        // Audio controls
        this.audioPlayer.playBtn.addEventListener('click', () => this.togglePlay());
        this.audioPlayer.prevBtn.addEventListener('click', () => this.previousTrack());
        this.audioPlayer.nextBtn.addEventListener('click', () => this.nextTrack());
        this.audioPlayer.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.audioPlayer.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        this.audioPlayer.downloadBtn.addEventListener('click', () => this.downloadTrack());
        this.audioPlayer.shareBtn.addEventListener('click', () => this.shareTrack());

        // Hero buttons
        document.querySelectorAll('.hero-actions .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (btn.textContent.includes('Start Creating')) {
                    if (this.currentUser) {
                        this.showCreateModal();
                    } else {
                        this.showSignupModal();
                    }
                } else if (btn.textContent.includes('Explore Beats')) {
                    this.smoothScroll('#beats');
                }
            });
        });

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Window scroll for navbar
        window.addEventListener('scroll', this.handleScroll.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    // Beat Management
    loadBeats () {
        // Show loading animation
        if (window.animationsManager) {
            window.animationsManager.showLoadingScreen('Loading Beats');
        }

        // Simulate loading beats data with delay to show animation
        setTimeout(() => {
            this.beats = [
            {
                id: 1,
                title: 'Urban Nights',
                artist: 'ProducerX',
                category: 'hip-hop',
                price: 25,
                bpm: 140,
                key: 'C Minor',
                duration: '3:24',
                audioUrl: '/assets/audio/urban-nights.mp3',
                artwork: '/assets/artwork/urban-nights.jpg',
                tags: ['dark', 'urban', 'trap'],
                likes: 234,
                plays: 1847
            },
            {
                id: 2,
                title: 'Melodic Dreams',
                artist: 'BeatMaker',
                category: 'r&b',
                price: 30,
                bpm: 85,
                key: 'F Major',
                duration: '4:12',
                audioUrl: '/assets/audio/melodic-dreams.mp3',
                artwork: '/assets/artwork/melodic-dreams.jpg',
                tags: ['melodic', 'smooth', 'vocals'],
                likes: 456,
                plays: 2891
            },
            {
                id: 3,
                title: 'Trap Anthem',
                artist: 'TrapKing',
                category: 'trap',
                price: 35,
                bpm: 160,
                key: 'G Minor',
                duration: '2:58',
                audioUrl: '/assets/audio/trap-anthem.mp3',
                artwork: '/assets/artwork/trap-anthem.jpg',
                tags: ['hard', '808s', 'energetic'],
                likes: 789,
                plays: 3247
            }
        ];

        this.renderBeats();

        // Hide loading animation after beats are loaded
        if (window.animationsManager) {
            window.animationsManager.hideLoadingScreen();
        }
        }, 800); // Delay to show the loading animation
    }

    renderBeats () {
        const beatsGrid = document.getElementById('beatsGrid');
        beatsGrid.innerHTML = '';

        const filteredBeats = this.currentCategory === 'all'
            ? this.beats
            : this.beats.filter(beat => beat.category === this.currentCategory);

        filteredBeats.forEach(beat => {
            const beatCard = this.createBeatCard(beat);
            beatsGrid.appendChild(beatCard);
        });
    }

    createBeatCard (beat) {
        const card = document.createElement('div');
        card.className = 'beat-card';
        card.innerHTML = `
            <div class="beat-artwork">
                <img src="${beat.artwork}" alt="${beat.title}" loading="lazy">
                <div class="beat-overlay">
                    <button class="play-beat-btn" data-beat-id="${beat.id}" title="Play ${beat.title}">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
            <div class="beat-info">
                <h3 class="beat-title">${beat.title}</h3>
                <p class="beat-artist">${beat.artist}</p>
                <div class="beat-details">
                    <span class="beat-bpm">${beat.bpm} BPM</span>
                    <span class="beat-key">${beat.key}</span>
                    <span class="beat-duration">${beat.duration}</span>
                </div>
                <div class="beat-stats">
                    <span class="beat-likes">
                        <i class="fas fa-heart"></i> ${beat.likes}
                    </span>
                    <span class="beat-plays">
                        <i class="fas fa-play"></i> ${beat.plays}
                    </span>
                </div>
                <div class="beat-tags">
                    ${beat.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="beat-actions">
                    <button class="btn btn-outline btn-sm favorite-btn" data-beat-id="${beat.id}" title="Add to favorites">
                        <i class="far fa-heart"></i>
                    </button>
                    <span class="beat-price">$${beat.price}</span>
                    <button class="btn btn-primary btn-sm purchase-btn" data-beat-id="${beat.id}">
                        Purchase
                    </button>
                </div>
            </div>
        `;

        // Add event listeners to card buttons
        card.querySelector('.play-beat-btn').addEventListener('click', () => {
            this.playBeat(beat);
        });

        card.querySelector('.favorite-btn').addEventListener('click', () => {
            this.toggleBeatFavorite(beat.id);
        });

        card.querySelector('.purchase-btn').addEventListener('click', () => {
            this.purchaseBeat(beat.id);
        });

        return card;
    }

    // Audio Player Controls
    playBeat (beat) {
        this.currentTrack = beat;
        this.audioPlayer.audio.src = beat.audioUrl;
        this.updateTrackInfo(beat);
        this.showAudioPlayer();
        this.play();
    }

    togglePlay () {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play () {
        if (this.audioPlayer.audio.src) {
            this.audioPlayer.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
        }
    }

    pause () {
        this.audioPlayer.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
    }

    previousTrack () {
        if (this.currentTrack) {
            const currentIndex = this.beats.findIndex(beat => beat.id === this.currentTrack.id);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.beats.length - 1;
            this.playBeat(this.beats[prevIndex]);
        }
    }

    nextTrack () {
        if (this.currentTrack) {
            const currentIndex = this.beats.findIndex(beat => beat.id === this.currentTrack.id);
            const nextIndex = currentIndex < this.beats.length - 1 ? currentIndex + 1 : 0;
            this.playBeat(this.beats[nextIndex]);
        }
    }

    updatePlayButton () {
        const icon = this.audioPlayer.playBtn.querySelector('i');
        icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
    }

    updateTrackInfo (beat) {
        this.audioPlayer.trackTitle.textContent = beat.title;
        this.audioPlayer.trackArtist.textContent = beat.artist;
        this.audioPlayer.trackArtwork.src = beat.artwork;
    }

    updateProgress () {
        const { currentTime, duration } = this.audioPlayer.audio;
        const progress = (currentTime / duration) * 100;
        this.audioPlayer.progress.style.width = `${progress}%`;
        this.audioPlayer.currentTime.textContent = this.formatTime(currentTime);
    }

    updateTotalTime () {
        const { duration } = this.audioPlayer.audio;
        this.audioPlayer.totalTime.textContent = this.formatTime(duration);
    }

    formatTime (seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showAudioPlayer () {
        document.getElementById('audioPlayer').classList.add('active');
    }

    hideAudioPlayer () {
        document.getElementById('audioPlayer').classList.remove('active');
    }

    // Filter and Search
    filterBeats (category) {
        this.currentCategory = category;
        this.renderBeats();
    }

    updateActiveTab (activeBtn) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        activeBtn.classList.add('active');
    }

    // User Interactions
    toggleBeatFavorite (beatId) {
        // Toggle favorite status and update UI
        this.socket.emit('toggle_favorite', { beatId });
    }

    purchaseBeat (beatId) {
        const beat = this.beats.find(b => b.id === beatId);
        if (beat) {
            this.showPurchaseModal(beat);
        }
    }

    toggleFavorite () {
        if (this.currentTrack) {
            this.toggleBeatFavorite(this.currentTrack.id);
        }
    }

    downloadTrack () {
        if (this.currentTrack) {
            // Implement download functionality
            this.showNotification('Download started!', 'success');
        }
    }

    shareTrack () {
        if (this.currentTrack) {
            this.showShareModal(this.currentTrack);
        }
    }

    toggleMute () {
        this.audioPlayer.audio.muted = !this.audioPlayer.audio.muted;
        const icon = this.audioPlayer.volumeBtn.querySelector('i');
        icon.className = this.audioPlayer.audio.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }

    // UI Effects and Interactions
    smoothScroll (target) {
        const element = document.querySelector(target);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }

    handleScroll () {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(15, 15, 35, 0.98)';
        } else {
            navbar.style.background = 'rgba(15, 15, 35, 0.95)';
        }
    }

    handleKeyboard (e) {
        // Keyboard shortcuts
        if (e.code === 'Space' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            this.togglePlay();
        } else if (e.code === 'ArrowLeft') {
            this.previousTrack();
        } else if (e.code === 'ArrowRight') {
            this.nextTrack();
        }
    }

    initializeScrollEffects () {
        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.stat-card, .beat-card, .collab-content').forEach(el => {
            observer.observe(el);
        });
    }

    // Modal and Notification Systems
    showNotification (messageKey, type = 'info', interpolations = {}) {
        // If message is already a string, use it directly (for backward compatibility)
        const message = typeof messageKey === 'string' && !messageKey.includes('.')
            ? messageKey
            : translationSystem.translate(messageKey, interpolations);

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" data-translate="actions.close">×</button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hideNotification(notification);
        });

        setTimeout(() => {
            this.hideNotification(notification);
        }, 5000);
    }

    hideNotification (notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon (type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showCreateModal () {
        // Implementation for create modal
        this.showNotification('Create feature coming soon!', 'info');
    }

    showPurchaseModal (beat) {
        // Implementation for purchase modal
        this.showNotification(`Purchase process for "${beat.title}" initiated!`, 'success');
    }

    showShareModal (track) {
        // Implementation for share modal
        this.showNotification(`Sharing "${track.title}"`, 'info');
    }

    showCollaborationInvite (data) {
        this.showNotification(`Collaboration invite from ${data.userName}`, 'info');
    }

    // Real-time Features
    updateConnectionStatus (isConnected) {
        const statusIndicator = document.querySelector('.connection-status');
        if (statusIndicator) {
            statusIndicator.classList.toggle('connected', isConnected);
            statusIndicator.classList.toggle('disconnected', !isConnected);
        }
    }

    updateUserStatus (userId, isOnline) {
        const userElements = document.querySelectorAll(`[data-user-id="${userId}"]`);
        userElements.forEach(element => {
            element.classList.toggle('online', isOnline);
            element.classList.toggle('offline', !isOnline);
        });
    }

    addBeatToGrid (beatData) {
        this.beats.unshift(beatData);
        this.renderBeats();
    }

    // Authentication Methods
    initializeAuth () {
        // Update UI based on authentication state
        this.updateAuthUI();
    }

    async checkAuthStatus () {
        if (this.authToken) {
            try {
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        Authorization: `Bearer ${this.authToken}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.updateAuthUI();
                } else {
                    // Token is invalid
                    this.logout();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.logout();
            }
        }
    }

    updateAuthUI () {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const finisherBtn = document.getElementById('finisherBtn');

        if (this.currentUser) {
            // User is logged in
            loginBtn.textContent = this.currentUser.username;
            loginBtn.onclick = () => this.showUserMenu();
            signupBtn.style.display = 'none';

            // Update The Finisher button based on subscription status
            if (this.currentUser.subscription?.active) {
                finisherBtn.textContent = 'Open The Finisher';
                finisherBtn.onclick = () => this.openFinisher();
            } else {
                finisherBtn.textContent = 'Upgrade to Pro';
                finisherBtn.onclick = () => this.showSubscriptionModal();
            }
        } else {
            // User is not logged in
            loginBtn.textContent = 'Login';
            loginBtn.onclick = () => this.showLoginModal();
            signupBtn.style.display = 'inline-flex';
            finisherBtn.textContent = 'Get The Finisher';
        }
    }

    showLoginModal () {
        this.showModal('loginModal');
    }

    showSignupModal () {
        this.showModal('signupModal');
    }

    showSubscriptionModal (selectedPlan = 'pro') {
        // Pre-select the plan
        const planRadio = document.getElementById(`plan${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`);
        if (planRadio) {
            planRadio.checked = true;
        }
        this.showModal('subscriptionModal');
    }

    showModal (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal (modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async handleLogin (e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const loginData = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);

                this.hideModal('loginModal');
                this.updateAuthUI();
                this.showToast('Welcome back!', 'success');

                // Emit authentication to socket
                if (this.socket) {
                    this.socket.emit('authenticate', {
                        userId: this.currentUser.id,
                        username: this.currentUser.username
                    });
                }
            } else {
                this.showToast(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Login failed. Please try again.', 'error');
        }
    }

    async handleSignup (e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const signupData = Object.fromEntries(formData);

        // Validate passwords match
        if (signupData.password !== signupData.confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        // Remove confirmPassword from data
        delete signupData.confirmPassword;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(signupData)
            });

            const data = await response.json();

            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);

                this.hideModal('signupModal');
                this.updateAuthUI();
                this.showToast('Account created successfully!', 'success');

                // Show subscription offer for new users
                setTimeout(() => {
                    this.showSubscriptionModal();
                }, 2000);

                // Emit authentication to socket
                if (this.socket) {
                    this.socket.emit('authenticate', {
                        userId: this.currentUser.id,
                        username: this.currentUser.username
                    });
                }
            } else {
                this.showToast(data.error || 'Signup failed', 'error');
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast('Signup failed. Please try again.', 'error');
        }
    }

    async handleSubscription (e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const selectedPlan = formData.get('plan');

        if (!this.currentUser) {
            this.hideModal('subscriptionModal');
            this.showSignupModal();
            this.showToast('Please create an account first', 'info');
            return;
        }

        try {
            // Create subscription with Stripe
            const response = await fetch('/api/payments/create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    plan: selectedPlan,
                    userId: this.currentUser.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to Stripe Checkout or handle payment
                if (data.checkoutUrl) {
                    window.location.href = data.checkoutUrl;
                } else {
                    this.hideModal('subscriptionModal');
                    this.showToast('Subscription activated!', 'success');
                    this.currentUser.subscription = {
                        active: true,
                        plan: selectedPlan
                    };
                    this.updateAuthUI();
                }
            } else {
                this.showToast(data.error || 'Subscription failed', 'error');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            this.showToast('Subscription failed. Please try again.', 'error');
        }
    }

    logout () {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.updateAuthUI();
        this.showToast('Logged out successfully', 'info');
    }

    checkPasswordStrength (password) {
        const strengthIndicator = document.getElementById('passwordStrength');
        if (!strengthIndicator) return;

        const strength = this.calculatePasswordStrength(password);
        strengthIndicator.className = `password-strength ${strength}`;
    }

    calculatePasswordStrength (password) {
        let score = 0;

        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }

    async handleFinisherAccess () {
        console.log('🎵 Accessing The Finisher...');

        // Check if user is logged in
        if (!this.currentUser) {
            this.showNotification('Please log in to access The Finisher', 'warning');
            this.showModal('loginModal');
            return;
        }

        try {
            // Check subscription status and feature access
            const response = await fetch('/api/subscriptions/finisher-access', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to check subscription status');
            }

            const data = await response.json();

            if (data.hasAccess) {
                // Determine destination based on plan and features
                if (data.features && data.features.effectsSuite && data.features.mastering) {
                    // Pro or Enterprise - Access full Finisher suite
                    console.log(`🚀 Redirecting to The Finisher (${data.planName})`);
                    window.location.href = '/finisher-app.html';
                } else if (data.features && data.features.mixmaster1) {
                    // Starter plan - Direct access to Mixmaster1
                    console.log(`🎛️ Redirecting to Mixmaster1 (${data.planName})`);
                    window.location.href = '/mixmaster1-app.html';
                } else {
                    // Fallback to full Finisher
                    window.location.href = '/finisher-app.html';
                }
            } else {
                // User needs subscription
                this.showSubscriptionModal();
            }
        } catch (error) {
            console.error('❌ Error checking Finisher access:', error);
            this.showNotification('Unable to access The Finisher. Please try again.', 'error');
        }
    }

    openFinisher () {
        // Legacy method - redirect to new handler
        this.handleFinisherAccess();
    }

    showUserMenu () {
        // Create and show user dropdown menu
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-content">
                <div class="user-info">
                    <strong>${this.currentUser.username}</strong>
                    <span>${this.currentUser.email}</span>
                </div>
                <hr>
                <a href="#" onclick="app.showProfile()">Profile</a>
                <a href="#" onclick="app.showAnalytics()">Analytics</a>
                <a href="#" onclick="app.showSettings()">Settings</a>
                ${this.currentUser.subscription?.active
        ? '<a href="#" onclick="app.openFinisher()">Open The Finisher</a>'
        : '<a href="#" onclick="app.showSubscriptionModal()">Upgrade to Pro</a>'
}
                <hr>
                <a href="#" onclick="app.logout()">Logout</a>
            </div>
        `;

        document.body.appendChild(menu);

        // Position menu
        const loginBtn = document.getElementById('loginBtn');
        const rect = loginBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 10}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!menu.contains(e.target) && e.target !== loginBtn) {
                    menu.remove();
                }
            }, { once: true });
        }, 100);
    }

    showProfile () {
        // Navigate to profile page or show profile modal
        this.showToast('Profile feature coming soon!', 'info');
    }

    showAnalytics () {
        // Navigate to analytics page
        this.showToast('Analytics feature coming soon!', 'info');
    }

    showSettings () {
        // Show settings modal
        this.showToast('Settings feature coming soon!', 'info');
    }

    showToast (messageKey, type = 'info', interpolations = {}) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        // If message is already a string, use it directly (for backward compatibility)
        let message;
        if (typeof messageKey === 'string' && !messageKey.includes('.')) {
            message = messageKey;
        } else if (typeof translationSystem !== 'undefined') {
            message = translationSystem.translate(messageKey, interpolations);
        } else {
            message = messageKey; // Fallback to message key
        }

        // Fallback if translation returns undefined or empty
        if (!message || message === 'undefined') {
            message = typeof messageKey === 'string' ? messageKey : 'Notification';
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" data-translate="actions.close" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">&times;</button>
        `;

        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getToastIcon (type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Additional CSS for dynamic elements
const additionalStyles = `
.language-selector {
    position: relative;
    margin-left: var(--spacing-md);
}

.language-selector select {
    background: var(--surface-color);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-sm);
    cursor: pointer;
    outline: none;
    transition: all 0.3s ease;
}

.language-selector select:hover {
    border-color: var(--primary-color);
}

.language-selector select:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.language-selector option {
    background: var(--card-color);
    color: var(--text-primary);
}
.beat-card {
    background: var(--card-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid var(--border-color);
}

.beat-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-color);
}

.beat-artwork {
    position: relative;
    overflow: hidden;
}

.beat-artwork img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.beat-card:hover .beat-artwork img {
    transform: scale(1.05);
}

.beat-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.beat-card:hover .beat-overlay {
    opacity: 1;
}

.play-beat-btn {
    background: var(--primary-color);
    color: white;
    border: none;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
    transition: all 0.3s ease;
}

.play-beat-btn:hover {
    background: var(--primary-hover);
    transform: scale(1.1);
}

.beat-info {
    padding: var(--spacing-lg);
}

.beat-title {
    font-size: var(--font-size-lg);
    font-weight: 600;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
}

.beat-artist {
    color: var(--text-secondary);
    margin-bottom: var(--spacing-md);
}

.beat-details {
    display: flex;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-muted);
}

.beat-stats {
    display: flex;
    gap: var(--spacing-lg);
    margin-bottom: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
}

.beat-tags {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-lg);
    flex-wrap: wrap;
}

.tag {
    background: var(--surface-color);
    color: var(--text-secondary);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
}

.beat-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.beat-price {
    font-weight: 600;
    color: var(--primary-color);
    font-size: var(--font-size-lg);
}

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: var(--card-color);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    border-left: 4px solid var(--primary-color);
    box-shadow: var(--shadow-lg);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.notification.show {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--text-primary);
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: var(--font-size-lg);
    margin-left: auto;
}

.notification-success {
    border-left-color: var(--success-color);
}

.notification-error {
    border-left-color: var(--error-color);
}

.notification-warning {
    border-left-color: var(--warning-color);
}

.animate-in {
    animation: slideInUp 0.6s ease-out;
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// FAQ Accordion Functionality
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');

            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Toggle current item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize FAQ first (independent of main app)
    initFAQ();

    // Then initialize main app
    try {
        window.creatorSyncApp = new CreatorSyncApp();
    } catch (error) {
        console.error('Error initializing CreatorSyncApp:', error);
        // FAQ and other features will still work
    }
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreatorSyncApp;
=======
/**
 * CreatorSync — Elite UI App.js v3.0
 * All interactivity, animations, and micro-interactions
 */

'use strict';

/* ═══════════════════════════════════════════
   1. UTILITIES
═══════════════════════════════════════════ */

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

function on(el, event, handler, opts) {
  if (!el) return;
  el.addEventListener(event, handler, opts);
}

function off(el, event, handler) {
  if (!el) return;
  el.removeEventListener(event, handler);
}

/** Animate a number from 0 to target */
function animateCounter(el, target, duration = 2000, prefix = '', suffix = '') {
  const start = performance.now();
  const isLarge = target >= 10000;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quart
    const eased = 1 - Math.pow(1 - progress, 4);
    const value = Math.floor(eased * target);

    if (isLarge) {
      el.textContent = prefix + value.toLocaleString() + suffix;
    } else {
      el.textContent = prefix + value + suffix;
    }

    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = prefix + target.toLocaleString() + suffix;
  }

  requestAnimationFrame(update);
}

/** Debounce */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Throttle */
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

/** Check if element is in viewport */
function inViewport(el, threshold = 0.15) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight * (1 - threshold) && rect.bottom > 0;
}


/* ═══════════════════════════════════════════
   2. CURSOR GLOW
═══════════════════════════════════════════ */

(function initCursorGlow() {
  const glow = $('#cursorGlow');
  if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

  let mouseX = 0, mouseY = 0;
  let glowX = 0, glowY = 0;
  let raf;

  on(document, 'mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  });

  function tick() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    glow.style.left = glowX + 'px';
    glow.style.top  = glowY + 'px';
    raf = requestAnimationFrame(tick);
  }
})();


/* ═══════════════════════════════════════════
   3. NAVBAR — SCROLL + SEARCH + MOBILE
═══════════════════════════════════════════ */

(function initNavbar() {
  const navbar      = $('#navbar');
  const hamburger   = $('#hamburger');
  const mobileMenu  = $('#mobileMenu');
  const overlay     = $('#overlay');
  const searchToggle = $('#searchToggle');
  const searchBar   = $('#searchBar');
  const globalSearch = $('#globalSearch');
  const mobileClose = $('#mobileClose');

  // ── Scroll effect ──────────────────────
  const onScroll = throttle(() => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, 50);

  on(window, 'scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  // ── Active nav link on scroll ──────────
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link[href^="#"]');

  const onScrollActivate = throttle(() => {
    let current = '';
    sections.forEach(sec => {
      const top = sec.getBoundingClientRect().top;
      if (top <= 120) current = sec.id;
    });
    navLinks.forEach(link => {
      const href = link.getAttribute('href').slice(1);
      link.classList.toggle('active', href === current);
    });
  }, 100);

  on(window, 'scroll', onScrollActivate, { passive: true });

  // ── Mobile menu ────────────────────────
  function openMobileMenu() {
    mobileMenu.classList.add('open');
    overlay.classList.add('active');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    overlay.classList.remove('active');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  on(hamburger, 'click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  on(mobileClose, 'click', closeMobileMenu);
  on(overlay, 'click', closeMobileMenu);

  // Close mobile menu on link click
  $$('.mobile-link').forEach(link => on(link, 'click', closeMobileMenu));

  // ── Search bar ─────────────────────────
  function openSearch() {
    searchBar.classList.add('open');
    searchBar.setAttribute('aria-hidden', 'false');
    setTimeout(() => globalSearch && globalSearch.focus(), 50);
  }

  function closeSearch() {
    searchBar.classList.remove('open');
    searchBar.setAttribute('aria-hidden', 'true');
  }

  on(searchToggle, 'click', () => {
    searchBar.classList.contains('open') ? closeSearch() : openSearch();
  });

  on(document, 'keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearch();
      closeMobileMenu();
    }
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  // Smooth scroll for nav links
  $$('a[href^="#"]').forEach(link => {
    on(link, 'click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
        const top  = target.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top, behavior: 'smooth' });
        closeMobileMenu();
      }
    });
  });
})();


/* ═══════════════════════════════════════════
   4. HERO WAVEFORM CANVAS (animated)
═══════════════════════════════════════════ */

(function initHeroWaveform() {
  const canvas = $('#heroWaveform');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, phase = 0;

  function resize() {
    width  = canvas.width  = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight || 120;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw several sine waves with different frequencies/amplitudes
    const waves = [
      { freq: 0.015, amp: 18, speed: 0.012, color: 'rgba(124,58,237,0.35)' },
      { freq: 0.020, amp: 12, speed: 0.018, color: 'rgba(6,182,212,0.25)' },
      { freq: 0.010, amp: 26, speed: 0.008, color: 'rgba(168,85,247,0.18)' },
    ];

    waves.forEach(({ freq, amp, speed, color }, i) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;

      for (let x = 0; x <= width; x += 2) {
        const y = height / 2 +
          Math.sin(x * freq + phase * speed * 80 + i * 1.2) * amp +
          Math.sin(x * freq * 1.7 + phase * speed * 120) * (amp * 0.4);

        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.stroke();
    });

    phase++;
    requestAnimationFrame(draw);
  }

  new ResizeObserver(resize).observe(canvas.parentElement || document.body);
  resize();
  draw();
})();


/* ═══════════════════════════════════════════
   5. PREVIEW WAVEFORM CANVAS
═══════════════════════════════════════════ */

(function initPreviewWaveform() {
  const canvas = $('#waveCanvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const bars   = 60;
  let playhead = 0;
  let playing  = false;
  let animId;

  // Generate random-ish bar heights seeded for consistency
  const heights = Array.from({ length: bars }, (_, i) =>
    0.2 + 0.8 * Math.abs(Math.sin(i * 0.45 + 1.3) * Math.cos(i * 0.19))
  );

  function resize() {
    canvas.width  = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    canvas.style.width  = canvas.offsetWidth + 'px';
    canvas.style.height = canvas.offsetHeight + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function draw() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const barW   = w / bars - 1.5;
    const gapW   = 1.5;
    const totalW = barW + gapW;

    heights.forEach((ht, i) => {
      const x    = i * totalW;
      const barH = ht * h * 0.85;
      const y    = (h - barH) / 2;
      const prog = i / bars;

      // Pulse effect for bars before playhead
      let alpha = 0.25;
      if (prog <= playhead) {
        const pulse = playing ? (0.85 + 0.15 * Math.sin(Date.now() * 0.005 + i * 0.4)) : 1;
        alpha = pulse;
      }

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (prog <= playhead) {
        grad.addColorStop(0, `rgba(168,85,247,${alpha})`);
        grad.addColorStop(1, `rgba(6,182,212,${alpha})`);
      } else {
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,${alpha * 0.5})`);
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, 2);
      ctx.fill();
    });

    if (playing) {
      playhead = Math.min(playhead + 0.003, 1);
      if (playhead >= 1) { playing = false; playhead = 0; }
      animId = requestAnimationFrame(draw);
    }
  }

  resize();
  draw();

  // Control from hero play button
  const heroPlayBtn = $('#heroPlayBtn');
  if (heroPlayBtn) {
    on(heroPlayBtn, 'click', () => {
      playing = !playing;
      const icon = heroPlayBtn.querySelector('i');
      if (icon) {
        icon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
      if (playing) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(draw);
        // Also open the persistent player
        openPlayer({
          title: 'Midnight Frequency',
          producer: 'NeoBeats',
          art: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=56&h=56&fit=crop',
        });
      }
    });
  }

  new ResizeObserver(() => { resize(); draw(); }).observe(canvas.parentElement || document.body);
})();


/* ═══════════════════════════════════════════
   6. HERO STAT COUNTERS (Intersection Observer)
═══════════════════════════════════════════ */

(function initCounters() {
  const els = $$('[data-target]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const prefix = el.dataset.prefix || '';
        animateCounter(el, target, 2200, prefix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
})();


/* ═══════════════════════════════════════════
   7. SECTION FADE-IN ON SCROLL
═══════════════════════════════════════════ */

(function initScrollAnimations() {
  const targets = $$('.beat-card, .producer-card, .ai-card, .pricing-card, .section-header, .hero-stats');

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => {
    // Pause animations until they enter viewport
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
})();


/* ═══════════════════════════════════════════
   8. BEAT CARD INTERACTIONS
═══════════════════════════════════════════ */

(function initBeatCards() {
  // ── Play buttons ───────────────────────
  on(document, 'click', (e) => {
    const playBtn = e.target.closest('.beat-play-btn');
    if (!playBtn) return;

    const card = playBtn.closest('.beat-card');
    if (!card) return;

    const title    = card.querySelector('.beat-card-title')?.textContent || 'Unknown';
    const producer = card.querySelector('.beat-card-producer')?.textContent?.trim() || 'Unknown';
    const artEl    = card.querySelector('.beat-card-art img');
    const art      = artEl ? artEl.src : '';

    openPlayer({ title, producer, art });
    rippleEffect(playBtn, e);
  });

  // ── Like buttons ───────────────────────
  on(document, 'click', (e) => {
    const likeBtn = e.target.closest('.beat-like-btn');
    if (!likeBtn) return;

    const isLiked = likeBtn.getAttribute('aria-pressed') === 'true';
    likeBtn.setAttribute('aria-pressed', String(!isLiked));

    const icon = likeBtn.querySelector('i');
    if (icon) {
      icon.className = isLiked ? 'fa-regular fa-heart' : 'fa-solid fa-heart';
    }

    // Heart burst animation
    if (!isLiked) heartBurst(likeBtn);

    showToast(isLiked ? 'Removed from likes' : 'Added to your likes ❤️', 'success');
  });

  // ── Cart buttons ───────────────────────
  on(document, 'click', (e) => {
    const cartBtn = e.target.closest('.beat-cart-btn');
    if (!cartBtn) return;

    const card  = cartBtn.closest('.beat-card');
    const title = card?.querySelector('.beat-card-title')?.textContent || 'Beat';

    rippleEffect(cartBtn, e);
    showToast(`"${title}" added to cart 🛒`, 'success');

    // Bounce animation on the button icon
    const icon = cartBtn.querySelector('i');
    if (icon) {
      icon.classList.add('fa-bounce');
      setTimeout(() => icon.classList.remove('fa-bounce'), 1000);
    }
  });

  // ── Filter chips (genre) ───────────────
  $$('[data-filter="genre"]').forEach(chip => {
    on(chip, 'click', () => {
      $$('[data-filter="genre"]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterBeats(chip.dataset.value);
    });
  });

  function filterBeats(genre) {
    const cards = $$('.beat-card:not(.is-skeleton)');
    cards.forEach(card => {
      const match = genre === 'all' || card.dataset.genre === genre;
      card.style.transition = 'opacity 0.25s, transform 0.25s';
      if (match) {
        card.style.opacity = '1';
        card.style.transform = '';
        card.style.display = '';
      } else {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => { if (card.style.opacity === '0') card.style.display = 'none'; }, 280);
      }
    });
  }

  // ── View toggle (grid / list) ──────────
  $$('.view-btn').forEach(btn => {
    on(btn, 'click', () => {
      $$('.view-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const grid = $('#beatsGrid');
      if (!grid) return;

      if (btn.dataset.view === 'list') {
        grid.style.gridTemplateColumns = '1fr';
      } else {
        grid.style.gridTemplateColumns = '';
      }
    });
  });

  // ── Sort select ────────────────────────
  const sortSelect = $('.sort-select');
  on(sortSelect, 'change', () => {
    showToast(`Sorted by: ${sortSelect.options[sortSelect.selectedIndex].text}`, 'info');
  });

  // ── Filter panel toggle ────────────────
  const filterBtn   = $('#filterBtn');
  const filterPanel = $('#filterPanel');

  on(filterBtn, 'click', () => {
    const isOpen = filterPanel.classList.contains('open');
    filterPanel.classList.toggle('open');
    filterPanel.setAttribute('aria-hidden', String(isOpen));
    filterBtn.setAttribute('aria-expanded', String(!isOpen));
    filterBtn.classList.toggle('active');
  });

  // ── BPM range sliders ──────────────────
  const bpmMin    = $('#bpmMin');
  const bpmMax    = $('#bpmMax');
  const bpmMinVal = $('#bpmMinVal');
  const bpmMaxVal = $('#bpmMaxVal');

  function updateBpmDisplay() {
    if (!bpmMin || !bpmMax) return;
    let lo = parseInt(bpmMin.value), hi = parseInt(bpmMax.value);
    if (lo > hi) [lo, hi] = [hi, lo];
    if (bpmMinVal) bpmMinVal.textContent = lo;
    if (bpmMaxVal) bpmMaxVal.textContent = hi;
  }

  on(bpmMin, 'input', updateBpmDisplay);
  on(bpmMax, 'input', updateBpmDisplay);

  // ── Load more ──────────────────────────
  const loadMoreBtn = $('#loadMoreBtn');
  on(loadMoreBtn, 'click', () => {
    const icon = loadMoreBtn.querySelector('i');
    if (icon) icon.style.transform = 'rotate(360deg)';
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = ' Loading…';
    loadMoreBtn.prepend(icon || '');

    setTimeout(() => {
      loadMoreBtn.disabled = false;
      if (icon) icon.style.transform = '';
      loadMoreBtn.innerHTML = '<i class="fa-solid fa-rotate"></i> Load More Beats';
      showToast('12 more beats loaded', 'info');
      // Remove skeleton cards
      $$('.is-skeleton').forEach(sk => sk.remove());
    }, 1200);
  });
})();


/* ═══════════════════════════════════════════
   9. PRODUCER FOLLOW BUTTONS
═══════════════════════════════════════════ */

(function initProducers() {
  on(document, 'click', (e) => {
    const followBtn = e.target.closest('.producer-follow-btn');
    if (!followBtn) return;

    const isFollowing = followBtn.getAttribute('aria-pressed') === 'true';
    followBtn.setAttribute('aria-pressed', String(!isFollowing));
    followBtn.textContent = isFollowing ? 'Follow' : 'Following';

    if (!isFollowing) {
      followBtn.style.background = 'var(--gradient-primary)';
      followBtn.style.color      = '#fff';
      followBtn.style.borderColor = 'transparent';
      const card = followBtn.closest('.producer-card');
      const name = card?.querySelector('.producer-name')?.textContent || 'Producer';
      showToast(`Now following ${name} 🎵`, 'success');
    } else {
      followBtn.style.background = '';
      followBtn.style.color      = '';
      followBtn.style.borderColor = '';
    }

    rippleEffect(followBtn, null, true);
  });
})();


/* ═══════════════════════════════════════════
   10. PRICING — BILLING TOGGLE
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   10. PRICING — BILLING CYCLE SELECTOR
═══════════════════════════════════════════ */

(function initPricing() {
  const cycleBtns   = $$('.billing-cycle-btn');
  const amounts     = $$('.pricing-price .amount[data-monthly]');
  const billedNotes = $$('.pricing-billed-note[data-monthly]');

  function setBilling(cycle) {
    // Update button states
    cycleBtns.forEach(btn => {
      const isActive = btn.dataset.cycle === cycle;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    // Animate price amounts
    amounts.forEach(el => {
      const from = parseFloat(el.textContent) || 0;
      const to   = parseFloat(el.dataset[cycle]) || 0;
      if (isNaN(to)) return;

      const startTime = performance.now();
      function animatePrice(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / 350, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = from + (to - from) * eased;
        // Show 2 decimal places only if not a whole number
        el.textContent = current % 1 === 0 ? Math.round(current) : current.toFixed(2);
        if (progress < 1) requestAnimationFrame(animatePrice);
        else el.textContent = to === 0 ? '0' : to.toFixed(2).replace(/\.00$/, '');
      }
      requestAnimationFrame(animatePrice);
    });

    // Update billing period notes
    billedNotes.forEach(el => {
      el.textContent = el.dataset[cycle] || '';
    });
  }

  cycleBtns.forEach(btn => {
    on(btn, 'click', () => setBilling(btn.dataset.cycle));
  });
})();


/* ═══════════════════════════════════════════
   11. PERSISTENT AUDIO PLAYER
═══════════════════════════════════════════ */

let playerState = {
  playing: false,
  progress: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: false,
  duration: 225, // 3:45 in seconds
  currentTime: 0,
  intervalId: null,
};

function openPlayer(track) {
  const player = $('#audioPlayer');
  if (!player) return;

  // Populate track info
  if (track.title)    $('#playerTitle').textContent    = track.title;
  if (track.producer) $('#playerProducer').textContent = track.producer;
  if (track.art) {
    const img = $('#playerArt');
    if (img) img.src = track.art;
  }

  player.removeAttribute('aria-hidden');
  player.classList.add('visible');
  // Pad body so content isn't hidden behind player
  document.body.style.paddingBottom = 'var(--player-height)';

  // Auto-play
  if (!playerState.playing) togglePlay();
}

function closePlayer() {
  const player = $('#audioPlayer');
  if (!player) return;
  player.classList.remove('visible');
  player.setAttribute('aria-hidden', 'true');
  document.body.style.paddingBottom = '';
  stopProgress();
  playerState.playing = false;
  updatePlayPauseIcon();
}

function togglePlay() {
  playerState.playing = !playerState.playing;
  updatePlayPauseIcon();

  if (playerState.playing) {
    startProgress();
  } else {
    stopProgress();
  }
}

function updatePlayPauseIcon() {
  const btn  = $('#playerPlay');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.className = playerState.playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  btn.setAttribute('aria-label', playerState.playing ? 'Pause' : 'Play');
}

function startProgress() {
  stopProgress();
  playerState.intervalId = setInterval(() => {
    playerState.currentTime += 0.25;
    if (playerState.currentTime >= playerState.duration) {
      if (playerState.repeat) {
        playerState.currentTime = 0;
      } else {
        playerState.currentTime = 0;
        playerState.playing = false;
        stopProgress();
        updatePlayPauseIcon();
        return;
      }
    }
    updateProgressUI();
  }, 250);
}

function stopProgress() {
  if (playerState.intervalId) clearInterval(playerState.intervalId);
  playerState.intervalId = null;
}

function updateProgressUI() {
  const { currentTime, duration } = playerState;
  const pct = (currentTime / duration) * 100;

  const bar   = $('#playerProgressFill');
  const thumb = $('#playerProgressThumb');
  const cur   = $('#playerCurrent');

  if (bar)   bar.style.width  = pct + '%';
  if (thumb) thumb.style.left = pct + '%';
  if (cur)   cur.textContent  = formatTime(currentTime);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

(function initPlayer() {
  const playPauseBtn = $('#playerPlay');
  const playerProgress = $('#playerProgressBar');
  const nextBtn    = $('#playerNext');
  const prevBtn    = $('#playerPrev');
  const muteBtn    = $('#playerMute');
  const volumeSlider = $('#playerVolume');
  const shuffleBtn = $('#playerShuffle');
  const repeatBtn  = $('#playerRepeat');
  const playerClose = $('#playerClose');
  const playerLike = null; // reserved for future UI
  const totalTimeEl = $('#playerDuration');

  if (totalTimeEl) totalTimeEl.textContent = formatTime(playerState.duration);

  on(playPauseBtn, 'click', togglePlay);

  // Progress bar seek
  on(playerProgress, 'click', (e) => {
    const rect = playerProgress.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    playerState.currentTime = pct * playerState.duration;
    updateProgressUI();
  });

  // Progress bar keyboard
  on(playerProgress, 'keydown', (e) => {
    if (e.key === 'ArrowRight') playerState.currentTime = Math.min(playerState.currentTime + 5,  playerState.duration);
    if (e.key === 'ArrowLeft')  playerState.currentTime = Math.max(playerState.currentTime - 5,  0);
    updateProgressUI();
    const pct = (playerState.currentTime / playerState.duration) * 100;
    playerProgress.setAttribute('aria-valuenow', Math.round(pct));
  });

  on(nextBtn, 'click', () => {
    playerState.currentTime = 0;
    updateProgressUI();
    showToast('Next track', 'info');
  });

  on(prevBtn, 'click', () => {
    playerState.currentTime = 0;
    updateProgressUI();
    showToast('Previous track', 'info');
  });

  // Volume
  on(volumeSlider, 'input', () => {
    playerState.volume = volumeSlider.value / 100;
    playerState.muted  = playerState.volume === 0;
    updateVolumeIcon();
  });

  on(muteBtn, 'click', () => {
    playerState.muted = !playerState.muted;
    if (playerState.muted) {
      volumeSlider.value = 0;
    } else {
      volumeSlider.value = playerState.volume * 100 || 80;
    }
    updateVolumeIcon();
  });

  function updateVolumeIcon() {
    const icon = muteBtn?.querySelector('i');
    if (!icon) return;
    const v = parseFloat(volumeSlider?.value || 80);
    if (playerState.muted || v === 0) icon.className = 'fa-solid fa-volume-xmark';
    else if (v < 40)                  icon.className = 'fa-solid fa-volume-low';
    else                              icon.className = 'fa-solid fa-volume-high';
  }

  // Shuffle
  on(shuffleBtn, 'click', () => {
    playerState.shuffle = !playerState.shuffle;
    shuffleBtn.setAttribute('aria-pressed', String(playerState.shuffle));
    shuffleBtn.style.color = playerState.shuffle ? 'var(--accent-purple)' : '';
  });

  // Repeat
  on(repeatBtn, 'click', () => {
    playerState.repeat = !playerState.repeat;
    repeatBtn.setAttribute('aria-pressed', String(playerState.repeat));
    repeatBtn.style.color = playerState.repeat ? 'var(--accent-cyan)' : '';
  });

  // Like current track
  on(playerLike, 'click', () => {
    const isLiked = playerLike.getAttribute('aria-pressed') === 'true';
    playerLike.setAttribute('aria-pressed', String(!isLiked));
    const icon = playerLike.querySelector('i');
    if (icon) icon.className = isLiked ? 'fa-regular fa-heart' : 'fa-solid fa-heart';
    if (!isLiked) { playerLike.style.color = 'var(--accent-pink)'; heartBurst(playerLike); }
    else playerLike.style.color = '';
  });

  // Close player
  on(playerClose, 'click', closePlayer);

  // Player license btn
  on($('.player-license-btn'), 'click', () => openModal('uploadModalBackdrop'));

  // Space bar to play/pause (when not in an input)
  on(document, 'keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) {
      e.preventDefault();
      if ($('#audioPlayer')?.classList.contains('visible')) togglePlay();
    }
  });
})();

// Expose openPlayer globally so beat cards can trigger it
window.openPlayer = openPlayer;


/* ═══════════════════════════════════════════
   12. MODAL SYSTEM
═══════════════════════════════════════════ */

function openModal(backdropId) {
  const backdrop = $(`#${backdropId}`);
  if (!backdrop) return;
  backdrop.classList.add('open');
  backdrop.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';

  // Focus first focusable element
  setTimeout(() => {
    const first = backdrop.querySelector('input, button, select, textarea, [tabindex="0"]');
    if (first) first.focus();
  }, 100);
}

function closeModal(backdropId) {
  const backdrop = $(`#${backdropId}`);
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

(function initModals() {
  // Hero CTAs — Browse Beats scrolls to marketplace, Upload opens modal
  on($('#heroBrowseBtn'), 'click', () => {
    const market = $('#marketplace');
    if (market) window.scrollTo({ top: market.offsetTop - 70, behavior: 'smooth' });
  });
  on($('#heroUploadBtn'),  'click', () => openModal('uploadModalBackdrop'));
  on($('#sellBeatsBtn'),   'click', () => openModal('uploadModalBackdrop'));
  on($('#mobileSignupBtn'),'click', () => openModal('authModalBackdrop'));

  // Auth modal
  on($('#loginBtn'),  'click', () => { openModal('authModalBackdrop'); switchAuthTab('login'); });
  on($('#signupBtn'), 'click', () => { openModal('authModalBackdrop'); switchAuthTab('signup'); });

  // Generic modal close — handles all .modal-close[data-modal] buttons
  on(document, 'click', (e) => {
    const closeBtn = e.target.closest('.modal-close[data-modal]');
    if (closeBtn) closeModal(closeBtn.dataset.modal);
  });

  // Pricing plan CTA buttons → open signup with plan context
  on(document, 'click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const card = btn.closest('.pricing-card');
    if (!card) return;
    const plan = card.querySelector('.pricing-tier')?.textContent?.trim() || 'selected plan';
    openModal('authModalBackdrop');
    switchAuthTab('signup');
    showToast(`${plan} plan selected — create your account to get started`, 'info', 4000);
  });

  // AI Tool "Try Now" buttons → open signup
  on(document, 'click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const card = btn.closest('.ai-card');
    if (!card) return;
    const tool = card.querySelector('h3')?.textContent?.trim() || 'AI Tool';
    openModal('authModalBackdrop');
    switchAuthTab('signup');
    showToast(`${tool} requires an account — join free and get 10 AI credits instantly`, 'info', 4000);
  });

  // Collab "Start a Session" → open signup
  on($('#startCollabBtn'), 'click', () => {
    openModal('authModalBackdrop');
    switchAuthTab('signup');
    showToast('Collaboration sessions are free — create your account to start jamming', 'info', 4000);
  });

  // The Finisher CTA → scroll to pricing section
  on($('#finisherCtaBtn'), 'click', () => {
    const pricing = $('#pricing');
    if (pricing) window.scrollTo({ top: pricing.offsetTop - 70, behavior: 'smooth' });
  });

  // Backdrop click to close
  $$('.modal-backdrop').forEach(backdrop => {
    on(backdrop, 'click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // Escape key to close top modal
  on(document, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.modal-backdrop.open').forEach(b => closeModal(b.id));
  });

  // Focus trap in modal
  $$('.modal-backdrop').forEach(backdrop => {
    on(backdrop, 'keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = [...backdrop.querySelectorAll(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
})();


/* ═══════════════════════════════════════════
   13. AUTH TABS
═══════════════════════════════════════════ */

function switchAuthTab(panel) {
  $$('.auth-tab').forEach(tab => {
    const isActive = tab.dataset.panel === panel;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  $$('.auth-panel').forEach(p => p.classList.add('hidden'));
  const target = $(`#${panel}Panel`);
  if (target) target.classList.remove('hidden');
}

(function initAuthTabs() {
  $$('.auth-tab').forEach(tab => {
    on(tab, 'click', () => switchAuthTab(tab.dataset.panel));
  });
})();


/* ═══════════════════════════════════════════
   14. AUTH FORMS
═══════════════════════════════════════════ */

(function initAuthForms() {
  // ── Password visibility toggle ─────────
  $$('.input-eye').forEach(btn => {
    on(btn, 'click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      const isText = input.type === 'text';
      input.type   = isText ? 'password' : 'text';
      const icon   = btn.querySelector('i');
      if (icon) icon.className = isText ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
      btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
    });
  });

  // ── Password strength ──────────────────
  const pwInput = $('#signupPassword');
  const pwFill  = $('#pwFill');
  const pwLabel = $('#pwLabel');

  on(pwInput, 'input', () => {
    if (!pwFill || !pwLabel) return;
    const val = pwInput.value;
    let score = 0;

    if (val.length >= 8)              score++;
    if (/[A-Z]/.test(val))           score++;
    if (/[0-9]/.test(val))           score++;
    if (/[^A-Za-z0-9]/.test(val))    score++;

    const levels = [
      { pct: '0%',   color: '',                             label: '' },
      { pct: '25%',  color: 'var(--accent-red)',            label: 'Weak' },
      { pct: '50%',  color: 'var(--accent-yellow)',         label: 'Fair' },
      { pct: '75%',  color: 'var(--accent-cyan)',           label: 'Good' },
      { pct: '100%', color: 'var(--accent-green)',          label: 'Strong' },
    ];

    const level = levels[score] || levels[0];
    pwFill.style.width      = level.pct;
    pwFill.style.background = level.color;
    pwLabel.textContent     = level.label;
  });

  // ── Login form ─────────────────────────
  const loginForm  = $('#loginForm');
  const loginError = $('#loginError');

  on(loginForm, 'submit', async (e) => {
    e.preventDefault();
    const email    = $('#loginEmail')?.value?.trim();
    const password = $('#loginPassword')?.value;

    if (!email || !password) {
      showFormError(loginError, 'Please fill in all fields.');
      return;
    }

    const submitBtn = loginForm.querySelector('[type="submit"]');
    setButtonLoading(submitBtn, 'Logging in…');

    try {
      // Demo mode — simulated auth (no backend required on GitHub Pages)
      await new Promise(r => setTimeout(r, 1000));
      const demoUser = { username: email.split('@')[0], email, role: 'producer', subscription: 'pro' };
      localStorage.setItem('cs_token', 'demo-' + Date.now());
      localStorage.setItem('cs_user', JSON.stringify(demoUser));

      closeModal('authModalBackdrop');
      showToast(`Welcome back, ${demoUser.username}! 🎵`, 'success');
      updateNavForLoggedIn(demoUser);

    } catch (err) {
      showFormError(loginError, err.message);
    } finally {
      resetButton(submitBtn, 'Log In');
    }
  });

  // ── Sign up form ───────────────────────
  const signupForm  = $('#signupForm');
  const signupError = $('#signupError');

  on(signupForm, 'submit', async (e) => {
    e.preventDefault();
    const username = $('#signupUsername')?.value?.trim();
    const email    = $('#signupEmail')?.value?.trim();
    const password = $('#signupPassword')?.value;
    const role     = signupForm.querySelector('input[name="role"]:checked')?.value || 'producer';

    if (!username || !email || !password) {
      showFormError(signupError, 'Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      showFormError(signupError, 'Password must be at least 8 characters.');
      return;
    }

    const submitBtn = signupForm.querySelector('[type="submit"]');
    setButtonLoading(submitBtn, 'Creating account…');

    try {
      // Demo mode — simulated registration (no backend required on GitHub Pages)
      await new Promise(r => setTimeout(r, 1200));
      const demoUser = { username, email, role: 'producer', subscription: 'free' };
      localStorage.setItem('cs_token', 'demo-' + Date.now());
      localStorage.setItem('cs_user', JSON.stringify(demoUser));

      closeModal('authModalBackdrop');
      showToast(`Welcome to CreatorSync, ${username}! 🚀`, 'success');
      updateNavForLoggedIn(demoUser);

    } catch (err) {
      showFormError(signupError, err.message);
    } finally {
      resetButton(submitBtn, 'Create Free Account');
    }
  });
})();

function showFormError(el, msg) {
  if (!el) return;
  el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
  el.style.display = 'flex';
}

function setButtonLoading(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.original = btn.textContent;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${text}`;
}

function resetButton(btn, text) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = text || btn.dataset.original || 'Submit';
}

function updateNavForLoggedIn(user) {
  const loginBtn  = $('#loginBtn');
  const signupBtn = $('#signupBtn');
  const avatarBtn = $('#userMenuBtn');

  if (loginBtn)  loginBtn.style.display  = 'none';
  if (signupBtn) signupBtn.style.display = 'none';
  if (avatarBtn) {
    avatarBtn.style.display = 'flex';
    const initials = $('#userInitials');
    if (initials) {
      initials.textContent = (user.username || 'U').substring(0, 2).toUpperCase();
    }
  }
}


/* ═══════════════════════════════════════════
   15. UPLOAD / DRAG-DROP ZONE
═══════════════════════════════════════════ */

(function initUpload() {
  const dropzone       = $('#uploadDropzone');
  const fileInput      = $('#fileInput');
  const browseBtn      = $('#dropzoneBrowse');
  const progressWrapper = $('#uploadProgressWrapper');
  const progressBar    = $('#uploadProgressBar');
  const progressLabel  = $('#uploadProgressLabel');

  if (!dropzone) return;

  // ── Browse click ────────────────────
  on(browseBtn, 'click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  on(dropzone, 'click', () => fileInput?.click());

  on(dropzone, 'keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput?.click(); }
  });

  // ── Drag events ─────────────────────
  ['dragenter', 'dragover'].forEach(evt => {
    on(dropzone, evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend'].forEach(evt => {
    on(dropzone, evt, () => dropzone.classList.remove('drag-over'));
  });

  on(dropzone, 'drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files?.length) handleFile(files[0]);
  });

  // ── File input change ───────────────
  on(fileInput, 'change', () => {
    if (fileInput?.files?.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const ALLOWED = ['audio/wav', 'audio/mpeg', 'audio/aiff', 'audio/flac', 'audio/x-aiff'];
    const MAX_MB  = 100;

    if (!ALLOWED.includes(file.type) && !file.name.match(/\.(wav|mp3|aiff|flac)$/i)) {
      showToast('Unsupported file type. Use WAV, MP3, AIFF or FLAC.', 'error');
      return;
    }

    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`File too large. Max ${MAX_MB}MB allowed.`, 'error');
      return;
    }

    // Show mock progress
    if (progressWrapper) {
      progressWrapper.classList.add('visible');
      progressWrapper.removeAttribute('aria-hidden');
    }

    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 12, 100);
      if (progressBar)  { progressBar.style.width = pct + '%'; progressBar.setAttribute('aria-valuenow', Math.round(pct)); }
      if (progressLabel) progressLabel.textContent = `Uploading… ${Math.round(pct)}%`;

      if (pct >= 100) {
        clearInterval(interval);
        if (progressLabel) progressLabel.textContent = 'Upload complete ✓';
        // Auto-populate beat title from filename
        const titleInput = $('#beatTitle');
        if (titleInput && !titleInput.value) {
          titleInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        }
        showToast(`"${file.name}" uploaded successfully!`, 'success');
      }
    }, 120);

    // Update dropzone UI
    const inner = dropzone.querySelector('.dropzone-icon i');
    if (inner) inner.className = 'fa-solid fa-circle-check';
    const title = dropzone.querySelector('.dropzone-title');
    if (title) title.textContent = file.name;
    const sub = dropzone.querySelector('.dropzone-sub');
    if (sub) sub.textContent = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Upload form submit ──────────────
  const uploadForm = $('#uploadForm');
  on(uploadForm, 'submit', async (e) => {
    e.preventDefault();

    const title = $('#beatTitle')?.value?.trim();
    const genre = $('#beatGenre')?.value;

    if (!title) {
      showToast('Please enter a beat title.', 'error');
      return;
    }
    if (!genre) {
      showToast('Please select a genre.', 'error');
      return;
    }

    const submitBtn = $('#uploadSubmitBtn');
    setButtonLoading(submitBtn, 'Publishing…');

    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));

    resetButton(submitBtn, '🚀 Publish Beat');
    closeModal('uploadModalBackdrop');
    showToast(`"${title}" is now live on the marketplace! 🎵`, 'success');

    uploadForm.reset();
    if (progressWrapper) progressWrapper.classList.remove('visible');
  });
})();


/* ═══════════════════════════════════════════
   16. TOAST NOTIFICATION SYSTEM
═══════════════════════════════════════════ */

const TOAST_ICONS = {
  success: 'fa-solid fa-circle-check',
  error:   'fa-solid fa-circle-xmark',
  info:    'fa-solid fa-circle-info',
  warning: 'fa-solid fa-triangle-exclamation',
};

function showToast(message, type = 'info', duration = 3500) {
  const container = $('#toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <i class="toast-icon ${TOAST_ICONS[type] || TOAST_ICONS.info}" aria-hidden="true"></i>
    <span>${message}</span>
    <button class="toast-close-btn" aria-label="Dismiss notification">
      <i class="fa-solid fa-xmark" aria-hidden="true"></i>
    </button>
  `;

  container.appendChild(toast);

  function dismiss() {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }

  on(toast.querySelector('.toast-close-btn'), 'click', dismiss);

  setTimeout(dismiss, duration);

  // Keep max 4 toasts
  const toasts = $$('.toast', container);
  if (toasts.length > 4) toasts[0].remove();
}

window.showToast = showToast; // expose globally


/* ═══════════════════════════════════════════
   17. BUTTON RIPPLE EFFECT
═══════════════════════════════════════════ */

function rippleEffect(el, event, center = false) {
  if (!el) return;

  const circle = document.createElement('span');
  const diameter = Math.max(el.offsetWidth, el.offsetHeight);
  const radius = diameter / 2;

  let x, y;
  if (center || !event) {
    x = el.offsetWidth  / 2 - radius;
    y = el.offsetHeight / 2 - radius;
  } else {
    const rect = el.getBoundingClientRect();
    x = event.clientX - rect.left - radius;
    y = event.clientY - rect.top  - radius;
  }

  circle.style.cssText = `
    position: absolute;
    border-radius: 50%;
    width: ${diameter}px;
    height: ${diameter}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255,255,255,0.25);
    pointer-events: none;
    transform: scale(0);
    animation: rippleAnim 0.5s linear;
  `;

  // Inject keyframes once
  if (!document.getElementById('rippleKeyframes')) {
    const style = document.createElement('style');
    style.id = 'rippleKeyframes';
    style.textContent = `@keyframes rippleAnim { to { transform: scale(3); opacity: 0; } }`;
    document.head.appendChild(style);
  }

  el.style.position = el.style.position || 'relative';
  el.style.overflow = 'hidden';
  el.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
}

// Apply ripple to all buttons
on(document, 'click', (e) => {
  const btn = e.target.closest('.btn');
  if (btn) rippleEffect(btn, e);
});


/* ═══════════════════════════════════════════
   18. HEART BURST ANIMATION
═══════════════════════════════════════════ */

function heartBurst(el) {
  if (!el) return;
  const count = 6;
  const rect  = el.getBoundingClientRect();
  const cx    = rect.left + rect.width  / 2;
  const cy    = rect.top  + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span');
    const angle = (i / count) * Math.PI * 2;
    const dist  = 30 + Math.random() * 20;
    const tx    = Math.cos(angle) * dist;
    const ty    = Math.sin(angle) * dist;
    const scale = 0.6 + Math.random() * 0.8;

    heart.textContent = '♥';
    heart.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      font-size: ${10 + Math.random() * 8}px;
      color: var(--accent-pink);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) scale(${scale});
      animation: heartFloat 0.7s ease-out forwards;
    `;

    document.body.appendChild(heart);
    setTimeout(() => heart.remove(), 700);
  }

  if (!document.getElementById('heartKeyframes')) {
    const style = document.createElement('style');
    style.id = 'heartKeyframes';
    style.textContent = `
      @keyframes heartFloat {
        0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, 0px))) scale(0.3); }
      }
    `;
    document.head.appendChild(style);
  }
}


/* ═══════════════════════════════════════════
   19. AI CARDS — HOVER TILT
═══════════════════════════════════════════ */

(function initTiltEffect() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  $$('.ai-card, .pricing-card-featured, .preview-card').forEach(card => {
    on(card, 'mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 to 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;

      card.style.transform = `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });

    on(card, 'mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      setTimeout(() => { card.style.transition = ''; }, 400);
    });
  });
})();


/* ═══════════════════════════════════════════
   20. STICKY NAV ACTIVE LINK HIGHLIGHT
═══════════════════════════════════════════ */

(function initActiveNavHighlight() {
  // MobileMenu links mirror the desktop nav
  $$('.mobile-link[href^="#"]').forEach(link => {
    on(link, 'click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = 70;
      window.scrollTo({ top: target.offsetTop - navH, behavior: 'smooth' });
    });
  });
})();


/* ═══════════════════════════════════════════
   21. RESTORE SESSION (auto-login check)
═══════════════════════════════════════════ */

(function restoreSession() {
  try {
    const token = localStorage.getItem('cs_token');
    const user  = JSON.parse(localStorage.getItem('cs_user') || 'null');
    if (token && user) updateNavForLoggedIn(user);
  } catch (e) {
    // ignore
  }
})();


/* ═══════════════════════════════════════════
   22. GENRE STRIP — PAUSE ON HOVER (CSS handles
       it, but keyboard users also can pause)
═══════════════════════════════════════════ */

(function initGenreStrip() {
  const track = $('#genresTrack');
  if (!track) return;

  $$('.genre-tag').forEach(tag => {
    on(tag, 'click', () => {
      // Filter beats by genre when genre tag clicked
      const genre = tag.textContent.toLowerCase()
        .replace(/&amp;/g, '')
        .replace(/\s+/g, '')
        .replace('&', '')
        .trim();

      const map = { 'trap': 'trap', 'drill': 'drill', 'r&b': 'rnb', 'rb': 'rnb', 'rnb': 'rnb',
                    'lo-fi': 'lofi', 'lofi': 'lofi', 'afrobeats': 'afrobeats', 'hiphop': 'hiphop',
                    'hip-hop': 'hiphop', 'pop': 'pop', 'house': 'house' };

      const mapped = map[genre] || 'all';

      // Scroll to marketplace
      const marketSection = $('#marketplace');
      if (marketSection) {
        window.scrollTo({ top: marketSection.offsetTop - 70, behavior: 'smooth' });
      }

      // Activate corresponding filter chip
      const chip = $(`[data-filter="genre"][data-value="${mapped}"]`);
      if (chip) {
        chip.click();
      }

      showToast(`Browsing: ${tag.textContent}`, 'info');
    });
  });
})();


/* ═══════════════════════════════════════════
   23. GLOBAL SEARCH — LIVE FILTER
═══════════════════════════════════════════ */

(function initGlobalSearch() {
  const input = $('#globalSearch');
  if (!input) return;

  const doSearch = debounce((query) => {
    if (!query) {
      $$('.beat-card:not(.is-skeleton)').forEach(c => { c.style.display = ''; c.style.opacity = '1'; });
      return;
    }

    const q = query.toLowerCase();
    $$('.beat-card:not(.is-skeleton)').forEach(card => {
      const title    = card.querySelector('.beat-card-title')?.textContent?.toLowerCase()  || '';
      const producer = card.querySelector('.beat-card-producer')?.textContent?.toLowerCase() || '';
      const genre    = card.dataset.genre || '';
      const match    = title.includes(q) || producer.includes(q) || genre.includes(q);
      card.style.display  = match ? '' : 'none';
      card.style.opacity  = match ? '1' : '0';
    });
  }, 280);

  on(input, 'input', () => doSearch(input.value.trim()));
})();


/* ═══════════════════════════════════════════
   24. PAGE LOAD — REMOVE SKELETONS
═══════════════════════════════════════════ */

window.addEventListener('load', () => {
  // Simulate API data load — remove skeleton placeholders after 800ms
  setTimeout(() => {
    $$('.is-skeleton').forEach(sk => {
      sk.style.transition = 'opacity 0.4s';
      sk.style.opacity = '0';
      setTimeout(() => sk.remove(), 400);
    });
  }, 800);

  // Log app ready
  console.log('%cCreatorSync v3.0 ready 🎵', 'color:#7C3AED;font-weight:700;font-size:14px;');
});


/* ═══════════════════════════════════════════
   25. MINIMAL PERFORMANCE MONITORING
═══════════════════════════════════════════ */

if ('PerformanceObserver' in window) {
  try {
    const obs = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.value > 100) {
          console.warn('[CLS]', entry.value);
        }
      });
    });
    obs.observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}
>>>>>>> gh-pages-deploy
}
