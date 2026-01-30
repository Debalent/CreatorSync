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
        // Simulate loading beats data
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
        const message = typeof messageKey === 'string' && !messageKey.includes('.')
            ? messageKey
            : translationSystem.translate(messageKey, interpolations);

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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.creatorSyncApp = new CreatorSyncApp();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreatorSyncApp;
}
