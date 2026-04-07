/**
 * Finisher Integration Manager
 * Handles embedding and communication with The Finisher app
 */

class FinisherIntegration {
    constructor () {
        this.socket = null;
        this.subscriptionStatus = null;
        this.integrationConfig = {
            method: 'iframe', // iframe, api, desktop
            url: '',
            apiEndpoint: '',
            apiKey: '',
            desktopProtocol: 'finisher://'
        };

        this.init();
    }

    async init () {
        console.log('🎵 Initializing Finisher Integration...');

        // Connect to Socket.IO
        this.connectSocket();

        // Load configuration from localStorage
        this.loadConfiguration();

        // Check subscription status
        await this.checkSubscription();

        // Set up event listeners
        this.setupEventListeners();

        // Initialize integration based on subscription
        this.initializeIntegration();

        // Set up Finisher tab navigation
        this.setupFinisherTabs();
    }

    connectSocket () {
        try {
            this.socket = io();

            this.socket.on('connect', () => {
                console.log('✅ Connected to CreatorSync server');
                this.authenticateSocket();
            });

            this.socket.on('finisher_message', (data) => {
                this.handleFinisherMessage(data);
            });

            this.socket.on('subscription_updated', (data) => {
                this.handleSubscriptionUpdate(data);
            });
        } catch (error) {
            console.error('❌ Socket connection failed:', error);
        }
    }

    authenticateSocket () {
        const userData = this.getUserData();
        if (userData) {
            this.socket.emit('authenticate', userData);
        }
    }

    getUserData () {
        try {
            return JSON.parse(localStorage.getItem('userData')) || null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    loadConfiguration () {
        try {
            const savedConfig = localStorage.getItem('finisherConfig');
            if (savedConfig) {
                this.integrationConfig = { ...this.integrationConfig, ...JSON.parse(savedConfig) };
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }

    saveConfiguration () {
        try {
            localStorage.setItem('finisherConfig', JSON.stringify(this.integrationConfig));
            console.log('✅ Configuration saved');
        } catch (error) {
            console.error('❌ Error saving configuration:', error);
        }
    }

    async checkSubscription () {
        try {
            const userData = this.getUserData();

            // Testing mode: bypass login requirement
            if (!userData) {
                console.log('⚠️ Testing mode: Bypassing authentication');
                this.hideSubscriptionCheck();
                document.getElementById('subscriptionRequired').style.display = 'none';
                document.getElementById('finisherApp').style.display = 'block';
                return;
            }

            // Show loading state
            this.showSubscriptionCheck();

            const response = await fetch('/api/subscriptions/finisher-access', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${userData.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.subscriptionStatus = data;

            // Update UI with subscription status
            this.updateSubscriptionDisplay(data);

            if (data.hasAccess) {
                console.log('✅ Finisher access granted');
                this.showFinisherApp();
            } else {
                console.log('❌ No Finisher access');
                this.showNoAccess('Subscription required for Finisher access');
            }
        } catch (error) {
            console.error('❌ Subscription check failed:', error);
            this.showNoAccess('Unable to verify subscription. Please try again.');
        }
    }

    updateSubscriptionDisplay (subscriptionData) {
        const statusBadge = document.getElementById('statusBadge');
        const planName = document.getElementById('planName');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (subscriptionData.hasAccess) {
            statusBadge.textContent = subscriptionData.plan.toUpperCase();
            statusBadge.className = `status-badge ${subscriptionData.plan.toLowerCase()}`;
            planName.textContent = `${subscriptionData.plan} Plan`;
        }

        const userData = this.getUserData();
        if (userData) {
            userName.textContent = userData.username || userData.email || 'User';
            if (userData.avatar) {
                userAvatar.src = userData.avatar;
            }
        }
    }

    showSubscriptionCheck () {
        document.getElementById('subscriptionCheck').style.display = 'flex';
        document.getElementById('finisherAppContainer').style.display = 'none';
        document.getElementById('noAccess').style.display = 'none';
    }

    showFinisherApp () {
        document.getElementById('subscriptionCheck').style.display = 'none';
        document.getElementById('finisherAppContainer').style.display = 'block';
        document.getElementById('noAccess').style.display = 'none';

        // Initialize the appropriate integration method
        this.initializeFinisherApp();
    }

    showNoAccess (message) {
        document.getElementById('subscriptionCheck').style.display = 'none';
        document.getElementById('finisherAppContainer').style.display = 'none';
        document.getElementById('noAccess').style.display = 'flex';

        // Update message if provided
        if (message) {
            const messageElement = document.querySelector('.no-access-content p');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    initializeFinisherApp () {
        switch (this.integrationConfig.method) {
        case 'iframe':
            this.initializeIframeIntegration();
            break;
        case 'api':
            this.initializeApiIntegration();
            break;
        case 'desktop':
            this.initializeDesktopIntegration();
            break;
        default:
            this.showDirectIntegration();
        }
    }

    initializeIframeIntegration () {
        const iframe = document.getElementById('finisherFrame');
        const directDiv = document.getElementById('finisherDirect');

        if (this.integrationConfig.url) {
            // Set iframe source with authentication parameters
            const userData = this.getUserData();
            const authParams = userData ? `?auth=${encodeURIComponent(userData.token)}` : '';
            const fullUrl = this.integrationConfig.url + authParams;

            iframe.src = fullUrl;
            iframe.style.display = 'block';
            directDiv.style.display = 'none';

            // Set up iframe communication
            this.setupIframeMessaging();

            console.log('✅ Iframe integration initialized');
        } else {
            this.showDirectIntegration();
        }
    }

    setupIframeMessaging () {
        window.addEventListener('message', (event) => {
            // Verify origin for security
            if (this.integrationConfig.url && !event.origin.startsWith(new URL(this.integrationConfig.url).origin)) {
                return;
            }

            this.handleFinisherMessage(event.data);
        });
    }

    async initializeApiIntegration () {
        const directDiv = document.getElementById('finisherDirect');
        const iframe = document.getElementById('finisherFrame');

        iframe.style.display = 'none';
        directDiv.style.display = 'block';

        try {
            // Test API connection
            if (this.integrationConfig.apiEndpoint && this.integrationConfig.apiKey) {
                const response = await fetch(`${this.integrationConfig.apiEndpoint}/health`, {
                    headers: {
                        Authorization: `Bearer ${this.integrationConfig.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    console.log('✅ API integration connected');
                    this.loadApiInterface();
                } else {
                    throw new Error('API connection failed');
                }
            }
        } catch (error) {
            console.error('❌ API integration failed:', error);
            this.showDirectIntegration();
        }
    }

    initializeDesktopIntegration () {
        try {
            const userData = this.getUserData();
            const protocol = this.integrationConfig.desktopProtocol;
            const authData = userData ? btoa(JSON.stringify(userData)) : '';
            const launchUrl = `${protocol}launch?auth=${authData}`;

            // Attempt to launch desktop app
            window.location.href = launchUrl;

            console.log('✅ Desktop integration launched');

            // Show fallback message
            setTimeout(() => {
                this.showDirectIntegration();
            }, 3000);
        } catch (error) {
            console.error('❌ Desktop integration failed:', error);
            this.showDirectIntegration();
        }
    }

    showDirectIntegration () {
        const iframe = document.getElementById('finisherFrame');
        const directDiv = document.getElementById('finisherDirect');

        iframe.style.display = 'none';
        directDiv.style.display = 'block';

        console.log('📋 Showing direct integration options');
    }

    loadApiInterface () {
        // This would load a custom interface for API-based integration
        // For now, show the direct integration message
        this.showDirectIntegration();
    }

    setupFinisherTabs () {
        // Set up tab navigation for The Finisher interface
        document.querySelectorAll('.finisher-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.finisher-tab').dataset.tab;
                this.switchFinisherTab(tabName);
            });
        });
    }

    switchFinisherTab (tabName) {
        // Update tab buttons
        document.querySelectorAll('.finisher-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        document.querySelectorAll('.finisher-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });

        // Load Mixmaster1 iframe when mixer tab is activated
        if (tabName === 'mixer') {
            this.loadMixmaster1();
        }

        console.log(`Switched to ${tabName} tab`);
    }

    loadMixmaster1 () {
        const mixmasterFrame = document.getElementById('mixmasterFrame');
        if (mixmasterFrame && !mixmasterFrame.src) {
            mixmasterFrame.src = '/mixmaster1-app.html';
            console.log('🎛️ Loading Mixmaster1...');
        }
    }

    updateUIBasedOnPlan (plan) {
        // Update UI elements based on subscription plan
        const planFeatures = {
            starter: {
                mixmaster1: true,
                effectsSuite: false,
                mastering: false,
                collaboration: false
            },
            pro: {
                mixmaster1: true,
                effectsSuite: true,
                mastering: true,
                collaboration: true
            },
            enterprise: {
                mixmaster1: true,
                effectsSuite: true,
                mastering: true,
                collaboration: true,
                whiteLabel: true
            }
        };

        const features = planFeatures[plan] || planFeatures.starter;

        // Hide/show tabs based on plan
        this.updateTabVisibility(features);

        // Update plan display
        document.getElementById('planName').textContent = `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
        document.getElementById('statusBadge').textContent = plan.toUpperCase();
    }

    updateTabVisibility (features) {
        // Show/hide tabs based on available features
        const effectsTab = document.getElementById('effectsTab');
        const masteringTab = document.getElementById('masteringTab');
        const collaborationTab = document.getElementById('collaborationTab');

        if (effectsTab) {
            effectsTab.style.display = features.effectsSuite ? 'flex' : 'none';
        }
        if (masteringTab) {
            masteringTab.style.display = features.mastering ? 'flex' : 'none';
        }
        if (collaborationTab) {
            collaborationTab.style.display = features.collaboration ? 'flex' : 'none';
        }
    }

    handleFinisherMessage (data) {
        console.log('📨 Message from Finisher:', data);

        switch (data.type) {
        case 'project_saved':
            this.handleProjectSaved(data);
            break;
        case 'collaboration_request':
            this.handleCollaborationRequest(data);
            break;
        case 'error':
            this.handleFinisherError(data);
            break;
        default:
            console.log('Unknown message type:', data.type);
        }
    }

    handleProjectSaved (data) {
        // Sync project data with CreatorSync
        if (this.socket) {
            this.socket.emit('finisher_project_update', data);
        }

        this.showToast('Project saved successfully', 'success');
    }

    handleCollaborationRequest (data) {
        // Handle collaboration invites from Finisher
        if (this.socket) {
            this.socket.emit('collaboration_invite', data);
        }
    }

    handleFinisherError (data) {
        console.error('Finisher error:', data.message);
        this.showToast(data.message || 'An error occurred in The Finisher', 'error');
    }

    handleSubscriptionUpdate (data) {
        this.subscriptionStatus = data;
        this.updateSubscriptionDisplay(data);

        if (!data.hasAccess) {
            this.showNoAccess('Your subscription has been cancelled or expired');
        } else if (document.getElementById('noAccess').style.display !== 'none') {
            // User just got access, reload the app
            this.showFinisherApp();
        }
    }

    setupEventListeners () {
        // Back to CreatorSync button
        document.getElementById('backToCreatorSync')?.addEventListener('click', () => {
            this.goBackToCreatorSync();
        });

        // User menu
        document.getElementById('userMenu')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleUserMenu();
        });

        // Integration configuration
        document.getElementById('saveIntegration')?.addEventListener('click', () => {
            this.saveIntegrationConfig();
        });

        // Modal close buttons
        document.querySelectorAll('[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.closest('[data-modal]').getAttribute('data-modal');
                this.closeModal(modalId);
            });
        });

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Close user menu on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#userMenu') && !e.target.closest('#userMenuDropdown')) {
                document.getElementById('userMenuDropdown')?.classList.remove('show');
            }
        });
    }

    goBackToCreatorSync () {
        // Navigate back to main CreatorSync interface
        window.location.href = '/';
    }

    toggleUserMenu () {
        const dropdown = document.getElementById('userMenuDropdown');
        dropdown?.classList.toggle('show');
    }

    openIntegrationConfig () {
        document.getElementById('integrationModal').style.display = 'flex';
        this.populateConfigForm();
    }

    populateConfigForm () {
        // Populate form with current configuration
        document.getElementById('finisherUrl').value = this.integrationConfig.url || '';
        document.getElementById('apiEndpoint').value = this.integrationConfig.apiEndpoint || '';
        document.getElementById('apiKey').value = this.integrationConfig.apiKey || '';
        document.getElementById('desktopProtocol').value = this.integrationConfig.desktopProtocol || 'finisher://';

        // Select current integration method
        const methodRadio = document.getElementById(`${this.integrationConfig.method}Integration`);
        if (methodRadio) {
            methodRadio.checked = true;
        }
    }

    saveIntegrationConfig () {
        // Get selected integration method
        const selectedMethod = document.querySelector('input[name="integration"]:checked')?.value;

        if (selectedMethod) {
            this.integrationConfig.method = selectedMethod;
            this.integrationConfig.url = document.getElementById('finisherUrl').value;
            this.integrationConfig.apiEndpoint = document.getElementById('apiEndpoint').value;
            this.integrationConfig.apiKey = document.getElementById('apiKey').value;
            this.integrationConfig.desktopProtocol = document.getElementById('desktopProtocol').value;

            this.saveConfiguration();
            this.closeModal('integrationModal');

            // Reinitialize with new configuration
            if (this.subscriptionStatus?.hasAccess) {
                this.initializeFinisherApp();
            }

            this.showToast('Integration configuration saved', 'success');
        }
    }

    closeModal (modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    openSubscriptionSettings () {
        // Redirect to subscription management
        window.open('/subscription-settings', '_blank');
    }

    openSupport () {
        // Open support chat or redirect to support page
        window.open('/support', '_blank');
    }

    logout () {
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }

    showToast (message, type = 'info') {
        // Create and show toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    initializeIntegration () {
        console.log('🎵 Finisher Integration Ready');
    }
}

// Global functions for HTML onclick handlers
window.upgradeSubscription = async function (plan) {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData) {
            window.location.href = '/#login';
            return;
        }

        const response = await fetch('/api/subscriptions/create', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${userData.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
        } else {
            throw new Error('Subscription creation failed');
        }
    } catch (error) {
        console.error('Subscription error:', error);
        alert('Failed to create subscription. Please try again.');
    }
};

window.goBackToCreatorSync = function () {
    window.location.href = '/';
};

// Global functions for HTML onclick handlers
window.switchToMixer = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.switchFinisherTab('mixer');
    }
};

window.switchToEffects = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.switchFinisherTab('effects');
    }
};

window.switchToMastering = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.switchFinisherTab('mastering');
    }
};

window.openMixmasterFullscreen = function () {
    const mixmasterUrl = '/mixmaster1-app.html';
    window.open(mixmasterUrl, '_blank', 'fullscreen=yes,scrollbars=yes,resizable=yes');
};

window.resetMixmaster = function () {
    const mixmasterFrame = document.getElementById('mixmasterFrame');
    if (mixmasterFrame && confirm('Reset Mixmaster1? This will reload the mixer and lose unsaved changes.')) {
        mixmasterFrame.src = mixmasterFrame.getAttribute('src') || mixmasterFrame.src; // Reload iframe
        console.log('🔄 Mixmaster1 reset');
    }
};

window.openIntegrationConfig = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.openIntegrationConfig();
    }
};

window.openSubscriptionSettings = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.openSubscriptionSettings();
    }
};

window.openSupport = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.openSupport();
    }
};

window.logout = function () {
    if (window.finisherIntegration) {
        window.finisherIntegration.logout();
    }
};

/**
 * AI Songwriter Assistant
 * Analyzes user writing patterns and provides intelligent suggestions
 */
class AISongwriterAssistant {
    constructor () {
        this.userStyle = {
            cadencePattern: 0,
            toneConsistency: 0,
            rhythmPreference: 0,
            vocabularyComplexity: 50,
            rhymeSchemePreference: [],
            averageLineLength: 40,
            emotionalTone: 'neutral',
            preferredRhymeScheme: ''
        };

        this.writingHistory = [];
        this.currentSong = {
            title: '',
            genre: '',
            mood: '',
            lyrics: '',
            structure: []
        };

        // Adaptive profile data
        this.userId = null;
        this.personalVocabFreq = {};      // word → count, built from user's writing
        this.appliedSuggestionTypes = { line: 0, word: 0, structure: 0 };
        this.songsAnalyzed = 0;

        this.analysisCache = new Map();
        this.suggestionEngine = new SuggestionEngine();

        this.init();
    }

    async async init () {
        console.log('🧠 Initializing AI Songwriter Assistant...');
        this.setupEventListeners();
        this.userId = this.getUserData()?.userId || this.getUserData()?.id || null;
        await this.loadUserData();
        this.updateUI();
    }

    getUserData () {
        try {
            return JSON.parse(localStorage.getItem('userData')) || null;
        } catch { return null; }
    }

    // ─── SERVER SYNC ─────────────────────────────────────────────────────────

    async loadServerProfile () {
        if (!this.userId) return;
        try {
            const userData = this.getUserData();
            const headers = userData?.token ? { Authorization: `Bearer ${userData.token}` } : {};
            const res = await fetch(`/api/ai-songwriter/profile/${encodeURIComponent(this.userId)}`, { headers });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.profile) {
                Object.assign(this.userStyle, data.profile);
                this.personalVocabFreq = { ...data.profile.personalVocab };
                this.appliedSuggestionTypes = { ...data.profile.appliedSuggestions };
                this.songsAnalyzed = data.songsAnalyzed || 0;
                console.log(`🧠 AI profile restored: ${this.songsAnalyzed} songs analyzed, tone: ${this.userStyle.emotionalTone}`);
            }
        } catch (e) {
            console.warn('AI profile load skipped:', e.message);
        }
    }

    async persistToServer (lyrics) {
        if (!this.userId || !lyrics || lyrics.trim().length < 100) return;
        try {
            const userData = this.getUserData();
            const headers = { 'Content-Type': 'application/json' };
            if (userData?.token) headers.Authorization = `Bearer ${userData.token}`;
            await fetch('/api/ai-songwriter/analyze-style', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    userId: this.userId,
                    lyrics,
                    songMetadata: { ...this.currentSong, rawLyrics: lyrics }
                })
            });
        } catch { /* fail silently — local analysis still works */ }
    }

    async trackAppliedSuggestion (type) {
        this.appliedSuggestionTypes[type] = (this.appliedSuggestionTypes[type] || 0) + 1;
        if (!this.userId) return;
        try {
            const userData = this.getUserData();
            const headers = { 'Content-Type': 'application/json' };
            if (userData?.token) headers.Authorization = `Bearer ${userData.token}`;
            await fetch('/api/ai-songwriter/feedback', {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId: this.userId, suggestionType: type })
            });
        } catch { /* ignore */ }
    }

    // ─── PERSONAL VOCABULARY ────────────────────────────────────────────────

    updatePersonalVocab (lyrics) {
        const STOP_WORDS = new Set(['the','and','but','for','are','you','that','this','with','have','from','they','will','would','could','your','been','were','when','then','there','what','which','their','more','also','into','just','like','over','such','than','only','about']);
        lyrics.toLowerCase().split(/\s+/).forEach(w => {
            const clean = w.replace(/[^a-z]/g, '');
            if (clean.length > 3 && !STOP_WORDS.has(clean)) {
                this.personalVocabFreq[clean] = (this.personalVocabFreq[clean] || 0) + 1;
            }
        });
    }

    // ─── STYLE PROFILE DISPLAY ───────────────────────────────────────────────

    updateStyleProfileDisplay () {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

        set('profileSongsAnalyzed', this.songsAnalyzed || '0');
        set('profileEmotionalTone', this.userStyle.emotionalTone || 'neutral');
        set('profileAvgLineLength', Math.round(this.userStyle.averageLineLength || 40) + ' chars');
        set('profileRhymeScheme', this.userStyle.preferredRhymeScheme || 'learning...');
        set('profileVocabComplexity', Math.round(this.userStyle.vocabularyComplexity || 50) + '%');

        const topWords = Object.entries(this.personalVocabFreq)
            .sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word]) => word);
        set('profileTopVocab', topWords.length ? topWords.join(', ') : 'still learning...');

        // Update learning progress bar
        const progress = Math.min(100, ((this.songsAnalyzed * 10) + (Object.keys(this.personalVocabFreq).length / 2)));
        const bar = document.getElementById('learningProgressBar');
        if (bar) bar.style.width = Math.round(progress) + '%';
    }

    setupEventListeners () {
        // Main textarea for lyric writing
        const lyricsTextarea = document.getElementById('lyricsTextarea');
        if (lyricsTextarea) {
            lyricsTextarea.addEventListener('input', (e) => {
                this.onLyricsChange(e.target.value);
            });

            lyricsTextarea.addEventListener('paste', (e) => {
                setTimeout(() => this.onLyricsChange(e.target.value), 100);
            });
        }

        // Song metadata inputs
        const songTitle = document.getElementById('songTitle');
        const songGenre = document.getElementById('songGenre');
        const songMood = document.getElementById('songMood');

        if (songTitle) songTitle.addEventListener('change', (e) => this.updateSongMetadata('title', e.target.value));
        if (songGenre) songGenre.addEventListener('change', (e) => this.updateSongMetadata('genre', e.target.value));
        if (songMood) songMood.addEventListener('change', (e) => this.updateSongMetadata('mood', e.target.value));

        // Control buttons
        const analyzeStyleBtn = document.getElementById('analyzeStyleBtn');
        const generateSuggestionBtn = document.getElementById('generateSuggestionBtn');
        const overcomeBlocBtn = document.getElementById('overcomeBlocBtn');
        const saveProjectBtn = document.getElementById('saveProjectBtn');

        if (analyzeStyleBtn) analyzeStyleBtn.addEventListener('click', () => this.analyzeWritingStyle());
        if (generateSuggestionBtn) generateSuggestionBtn.addEventListener('click', () => this.generateSuggestions());
        if (overcomeBlocBtn) overcomeBlocBtn.addEventListener('click', () => this.openWritersBlockAssistant());
        if (saveProjectBtn) saveProjectBtn.addEventListener('click', () => this.saveProject());

        // Quick action buttons
        const rhymeHelperBtn = document.getElementById('rhymeHelperBtn');
        const synonymFinderBtn = document.getElementById('synonymFinderBtn');
        const moodMatchBtn = document.getElementById('moodMatchBtn');
        const structureHelpBtn = document.getElementById('structureHelpBtn');

        if (rhymeHelperBtn) rhymeHelperBtn.addEventListener('click', () => this.showRhymeHelper());
        if (synonymFinderBtn) synonymFinderBtn.addEventListener('click', () => this.showSynonymFinder());
        if (moodMatchBtn) moodMatchBtn.addEventListener('click', () => this.showMoodMatcher());
        if (structureHelpBtn) structureHelpBtn.addEventListener('click', () => this.showStructureHelper());

        // Writer's block assistant
        const closeBlockAssistant = document.getElementById('closeBlockAssistant');
        const continueLineBtn = document.getElementById('continueLineBtn');
        const rewriteBtn = document.getElementById('rewriteBtn');

        if (closeBlockAssistant) closeBlockAssistant.addEventListener('click', () => this.closeWritersBlockAssistant());
        if (continueLineBtn) continueLineBtn.addEventListener('click', () => this.continueLine());
        if (rewriteBtn) rewriteBtn.addEventListener('click', () => this.rewriteInStyle());
    }

    onLyricsChange (lyrics) {
        this.currentSong.lyrics = lyrics;
        this.updateWritingStats(lyrics);
        this.analyzePatterns(lyrics);

        // Debounced analysis for performance
        clearTimeout(this.analysisTimeout);
        this.analysisTimeout = setTimeout(() => {
            this.performDeepAnalysis(lyrics);
        }, 1000);
    }

    updateSongMetadata (field, value) {
        this.currentSong[field] = value;
        this.analyzePatterns(this.currentSong.lyrics);
    }

    updateWritingStats (lyrics) {
        const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
        const words = lyrics.split(/\s+/).filter(word => word.length > 0);
        const rhymeScheme = this.detectRhymeScheme(lines);

        // Update UI
        document.getElementById('lineCount').textContent = lines.length;
        document.getElementById('wordCount').textContent = words.length;
        document.getElementById('rhymeScheme').textContent = rhymeScheme || '-';
    }

    async performDeepAnalysis (lyrics) {
        if (!lyrics || lyrics.trim().length < 100) return;

        // Update personal vocabulary
        this.updatePersonalVocab(lyrics);

        // Persist current session to server
        await this.persistToServer(lyrics);
        this.songsAnalyzed = Math.max(this.songsAnalyzed, Math.floor(lyrics.split('\n').filter(l => l.trim()).length / 8));

        // Refresh style profile display
        this.updateStyleProfileDisplay();
    }

    performPatternAnalysis (lyrics) {
        const lines = lyrics.split('\n').filter(line => line.trim().length > 0);
        const words = lyrics.split(/\s+/).filter(word => word.length > 0);

        // Cadence analysis - rhythm and flow
        const cadenceScore = this.analyzeCadence(lines);

        // Tone analysis - emotional consistency
        const toneScore = this.analyzeTone(lyrics);

        // Rhythm analysis - syllable patterns
        const rhythmScore = this.analyzeRhythm(lines);

        const analysis = {
            cadence: cadenceScore,
            tone: toneScore,
            rhythm: rhythmScore,
            averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / Math.max(1, lines.length),
            vocabularyComplexity: this.analyzeVocabulary(words),
            emotionalTone: this.detectEmotionalTone(lyrics)
        };

        return analysis;
    }

    analyzeCadence (lines) {
        if (lines.length < 2) return 0;

        let consistencyScore = 0;
        const syllableCounts = lines.map(line => this.countSyllables(line));

        // Check for consistent syllable patterns
        const avgSyllables = syllableCounts.reduce((a, b) => a + b, 0) / syllableCounts.length;
        const variance = syllableCounts.reduce((sum, count) => sum + Math.pow(count - avgSyllables, 2), 0) / syllableCounts.length;

        // Lower variance = higher consistency
        consistencyScore = Math.max(0, 100 - (variance * 5));

        return Math.min(100, consistencyScore);
    }

    analyzeTone (lyrics) {
        const words = lyrics.toLowerCase().split(/\s+/);

        // Emotional word categories
        const positiveWords = ['love', 'happy', 'joy', 'dream', 'hope', 'light', 'beautiful', 'amazing', 'wonderful', 'fantastic'];
        const negativeWords = ['hate', 'sad', 'pain', 'dark', 'lost', 'broken', 'hurt', 'alone', 'empty', 'fear'];
        const neutralWords = ['and', 'the', 'is', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];

        let positiveCount = 0;
        let negativeCount = 0;
        let totalEmotionalWords = 0;

        words.forEach(word => {
            if (positiveWords.includes(word)) {
                positiveCount++;
                totalEmotionalWords++;
            } else if (negativeWords.includes(word)) {
                negativeCount++;
                totalEmotionalWords++;
            }
        });

        if (totalEmotionalWords === 0) return 50;

        // Calculate tone consistency (how much it leans one way)
        const dominantTone = Math.max(positiveCount, negativeCount);
        const consistency = (dominantTone / totalEmotionalWords) * 100;

        return Math.min(100, consistency);
    }

    analyzeRhythm (lines) {
        if (lines.length < 4) return 0;

        let rhythmScore = 0;
        const stressPatterns = lines.map(line => this.getStressPattern(line));

        // Check for recurring rhythm patterns
        const patternMap = new Map();
        stressPatterns.forEach(pattern => {
            const key = pattern.join('');
            patternMap.set(key, (patternMap.get(key) || 0) + 1);
        });

        // Higher score for more consistent rhythm patterns
        const maxOccurrence = Math.max(...patternMap.values());
        rhythmScore = (maxOccurrence / lines.length) * 100;

        return Math.min(100, rhythmScore);
    }

    analyzeVocabulary (words) {
        const uniqueWords = new Set(words.map(word => word.toLowerCase()));
        const complexWords = words.filter(word => word.length > 6).length;

        return Math.min(100, (complexWords / words.length) * 200 + (uniqueWords.size / words.length) * 100);
    }

    detectEmotionalTone (lyrics) {
        const words = lyrics.toLowerCase().split(/\s+/);

        const emotions = {
            happy: ['happy', 'joy', 'love', 'excited', 'amazing', 'wonderful', 'fantastic', 'great'],
            sad: ['sad', 'cry', 'tears', 'lonely', 'empty', 'broken', 'hurt', 'pain'],
            angry: ['angry', 'mad', 'hate', 'rage', 'fury', 'fight', 'war', 'destroy'],
            romantic: ['love', 'heart', 'kiss', 'romance', 'beautiful', 'together', 'forever'],
            energetic: ['run', 'jump', 'dance', 'move', 'energy', 'power', 'strong', 'fast'],
            melancholy: ['grey', 'dark', 'alone', 'quiet', 'still', 'empty', 'lost', 'fading']
        };

        const scores = {};
        Object.keys(emotions).forEach(emotion => {
            scores[emotion] = 0;
            emotions[emotion].forEach(word => {
                scores[emotion] += words.filter(w => w.includes(word)).length;
            });
        });

        const dominantEmotion = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
        return scores[dominantEmotion] > 0 ? dominantEmotion : 'neutral';
    }

    countSyllables (text) {
        // Simple syllable counting algorithm
        return text.toLowerCase().replace(/[^a-z]/g, '').replace(/[aeiou]+/g, 'a').length || 1;
    }

    getStressPattern (line) {
        // Simplified stress pattern detection
        const words = line.split(/\s+/);
        return words.map(word => word.length > 4 ? 1 : 0);
    }

    detectRhymeScheme (lines) {
        if (lines.length < 2) return '';

        const endWords = lines.map(line => {
            const words = line.trim().split(/\s+/);
            return words[words.length - 1]?.toLowerCase().replace(/[^a-z]/g, '') || '';
        });

        // Simple rhyme detection based on ending sounds
        const rhymeGroups = new Map();
        let currentLabel = 'A';

        endWords.forEach((word, index) => {
            let foundRhyme = false;
            for (const [rhyme, label] of rhymeGroups) {
                if (this.wordsRhyme(word, rhyme)) {
                    foundRhyme = true;
                    break;
                }
            }

            if (!foundRhyme && word.length > 0) {
                rhymeGroups.set(word, currentLabel);
                currentLabel = String.fromCharCode(currentLabel.charCodeAt(0) + 1);
            }
        });

        return endWords.map(word => {
            for (const [rhyme, label] of rhymeGroups) {
                if (this.wordsRhyme(word, rhyme)) return label;
            }
            return 'X';
        }).join('');
    }

    wordsRhyme (word1, word2) {
        if (word1.length < 2 || word2.length < 2) return false;

        // Simple rhyme detection - last 2-3 characters
        const end1 = word1.slice(-2);
        const end2 = word2.slice(-2);

        return end1 === end2 || word1.slice(-3) === word2.slice(-3);
    }

    updateStyleMetrics (analysis) {
        // Update user style profile
        this.userStyle.cadencePattern = analysis.cadence;
        this.userStyle.toneConsistency = analysis.tone;
        this.userStyle.rhythmPreference = analysis.rhythm;
        this.userStyle.averageLineLength = analysis.averageLineLength;
        this.userStyle.vocabularyComplexity = analysis.vocabularyComplexity;
        this.userStyle.emotionalTone = analysis.emotionalTone;

        // Update UI progress bars
        this.updateProgressBar('cadencePattern', analysis.cadence);
        this.updateProgressBar('tonePattern', analysis.tone);
        this.updateProgressBar('rhythmPattern', analysis.rhythm);

        // Update scores
        document.getElementById('cadenceScore').textContent = `${Math.round(analysis.cadence)}% consistent`;
        document.getElementById('toneScore').textContent = `${Math.round(analysis.tone)}% consistent`;
        document.getElementById('rhythmScore').textContent = `${Math.round(analysis.rhythm)}% consistent`;
    }

    updateProgressBar (id, value) {
        const bar = document.getElementById(id);
        if (bar) {
            bar.style.width = `${value}%`;
        }
    }

    updateLearningStatus () {
        const lyricsLength = this.currentSong.lyrics.length;
        const status = document.getElementById('learningStatus');
        const aiStatus = document.getElementById('aiStatus');
        const aiStatusText = document.getElementById('aiStatusText');

        if (lyricsLength < 100) {
            status.textContent = 'Learning your style...';
            aiStatus.className = 'status-indicator learning';
            aiStatusText.textContent = 'Learning';
        } else if (lyricsLength < 500) {
            status.textContent = 'Analyzing patterns...';
            aiStatus.className = 'status-indicator learning';
            aiStatusText.textContent = 'Analyzing';
        } else {
            status.textContent = 'Style learned! Ready to assist.';
            aiStatus.className = 'status-indicator active';
            aiStatusText.textContent = 'AI Ready';
        }
    }

    async generateSuggestions () {
        const suggestionsList = document.getElementById('suggestionsList');
        if (!suggestionsList) return;

        // Show loading
        suggestionsList.innerHTML = '<div class="loading">Generating AI suggestions based on your style...</div>';

        try {
            const suggestions = await this.suggestionEngine.generateSuggestions(
                this.currentSong,
                this.userStyle,
                this.writingHistory,
                this.personalVocabFreq
            );

            this.displaySuggestions(suggestions);
        } catch (error) {
            console.error('Error generating suggestions:', error);
            suggestionsList.innerHTML = '<div class="suggestion-placeholder"><i class="fas fa-exclamation-triangle"></i><p>Error generating suggestions. Please try again.</p></div>';
        }
    }

    displaySuggestions (suggestions) {
        const suggestionsList = document.getElementById('suggestionsList');
        if (!suggestionsList || !suggestions.length) return;

        suggestionsList.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" onclick="window.aiSongwriter.applySuggestion('${suggestion.type}', '${suggestion.text.replace(/'/g, '\\\'')}')">
                <div class="suggestion-text">${suggestion.text}</div>
                <div class="suggestion-meta">
                    <span>${suggestion.type}</span>
                    <span>Confidence: ${suggestion.confidence}%</span>
                </div>
            </div>
        `).join('');
    }

    applySuggestion (type, text) {
        const textarea = document.getElementById('lyricsTextarea');
        if (!textarea) return;

        const currentPosition = textarea.selectionStart;
        const currentText = textarea.value;

        let newText;
        if (type === 'line') {
            // Add as new line
            newText = currentText + '\n' + text;
        } else if (type === 'word') {
            // Replace current word
            const beforeCursor = currentText.substring(0, currentPosition);
            const afterCursor = currentText.substring(currentPosition);
            const lastSpaceIndex = beforeCursor.lastIndexOf(' ');
            const nextSpaceIndex = afterCursor.indexOf(' ');

            const before = beforeCursor.substring(0, lastSpaceIndex + 1);
            const after = nextSpaceIndex === -1 ? '' : afterCursor.substring(nextSpaceIndex);

            newText = before + text + after;
        } else {
            // Insert at cursor
            const before = currentText.substring(0, currentPosition);
            const after = currentText.substring(currentPosition);
            newText = before + text + after;
        }

        textarea.value = newText;
        this.onLyricsChange(newText);

        // Track which suggestion type the user applied (feeds future suggestions)
        this.trackAppliedSuggestion(type);

        // Move cursor to end of inserted text
        const newPosition = currentPosition + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
    }

    openWritersBlockAssistant () {
        const assistant = document.getElementById('writersBlockAssistant');
        if (assistant) {
            assistant.classList.remove('hidden');
            this.loadBlockTechniques();
        }
    }

    closeWritersBlockAssistant () {
        const assistant = document.getElementById('writersBlockAssistant');
        if (assistant) {
            assistant.classList.add('hidden');
        }
    }

    async loadBlockTechniques () {
        // Load creative prompts
        this.loadCreativePrompts();
    }

    async loadCreativePrompts () {
        const promptContent = document.getElementById('promptContent');
        if (!promptContent) return;

        const prompts = await this.suggestionEngine.generateCreativePrompts(this.userStyle, this.currentSong);

        promptContent.innerHTML = prompts.map(prompt => `
            <div class="prompt-item">
                <h5>${prompt.title}</h5>
                <p>${prompt.description}</p>
                <button class="btn btn-small" onclick="window.aiSongwriter.applyPrompt('${prompt.text.replace(/'/g, '\\\'')}')">Use Prompt</button>
            </div>
        `).join('');
    }

    applyPrompt (promptText) {
        const textarea = document.getElementById('lyricsTextarea');
        if (textarea) {
            textarea.value += '\n\n' + promptText;
            this.onLyricsChange(textarea.value);
            this.closeWritersBlockAssistant();
            textarea.focus();
        }
    }

    continueLine () {
        const partialLine = document.getElementById('partialLine');
        if (!partialLine || !partialLine.value.trim()) return;

        const continuations = this.suggestionEngine.generateLineContinuations(
            partialLine.value,
            this.userStyle
        );

        const continuationsDiv = document.getElementById('continuations');
        if (continuationsDiv) {
            continuationsDiv.innerHTML = continuations.map(cont => `
                <div class="continuation-item" onclick="window.aiSongwriter.applyContinuation('${cont.replace(/'/g, '\\\'')}')">
                    ${cont}
                </div>
            `).join('');
        }
    }

    applyContinuation (continuation) {
        const partialLine = document.getElementById('partialLine');
        const fullLine = partialLine.value + continuation;

        const textarea = document.getElementById('lyricsTextarea');
        if (textarea) {
            textarea.value += '\n' + fullLine;
            this.onLyricsChange(textarea.value);
            partialLine.value = '';
            document.getElementById('continuations').innerHTML = '';
        }
    }

    rewriteInStyle () {
        const rewriteInput = document.getElementById('rewriteInput');
        if (!rewriteInput || !rewriteInput.value.trim()) return;

        const rewrites = this.suggestionEngine.rewriteInUserStyle(
            rewriteInput.value,
            this.userStyle
        );

        const rewritesDiv = document.getElementById('rewrites');
        if (rewritesDiv) {
            rewritesDiv.innerHTML = rewrites.map(rewrite => `
                <div class="rewrite-item" onclick="window.aiSongwriter.applyRewrite('${rewrite.replace(/'/g, '\\\'')}')">
                    ${rewrite}
                </div>
            `).join('');
        }
    }

    applyRewrite (rewrite) {
        const textarea = document.getElementById('lyricsTextarea');
        if (textarea) {
            textarea.value += '\n' + rewrite;
            this.onLyricsChange(textarea.value);
            document.getElementById('rewriteInput').value = '';
            document.getElementById('rewrites').innerHTML = '';
        }
    }

    showRhymeHelper () {
        const panel = document.getElementById('rhymeHelperPanel');
        if (!panel) return;
        const isOpen = panel.classList.toggle('active');
        if (!isOpen) return;

        // Pre-fill with last word from lyrics
        const textarea = document.getElementById('lyricsTextarea');
        const words = (textarea?.value || '').trim().split(/\s+/);
        const lastWord = [...words].reverse().find(w => w.replace(/[^a-z]/gi, '').length > 2) || '';
        const input = document.getElementById('rhymeSearch');
        if (input) {
            input.value = lastWord.replace(/[^a-zA-Z]/g, '');
            if (input.value) this.searchRhymes(input.value);
        }
        input?.addEventListener('input', () => this.searchRhymes(input.value), { once: false });
    }

    async searchRhymes (word) {
        if (!word || word.length < 2) return;
        const container = document.getElementById('rhymeResults');
        if (!container) return;
        container.innerHTML = '<span class="loading-dots">searching...</span>';
        try {
            const res = await fetch(`/api/ai-songwriter/rhymes/${encodeURIComponent(word)}?userId=${this.userId || ''}`);
            const data = await res.json();
            const rhymes = data.rhymes || [];
            if (!rhymes.length) { container.innerHTML = '<span class="no-results">No rhymes found</span>'; return; }
            container.innerHTML = rhymes.slice(0, 12).map(r =>
                `<button class="rhyme-word-btn" data-word="${r}">${r}</button>`
            ).join('');
            container.querySelectorAll('.rhyme-word-btn').forEach(btn => {
                btn.addEventListener('click', () => this.insertWord(btn.dataset.word));
            });
        } catch {
            container.innerHTML = '<span class="no-results">Could not load rhymes</span>';
        }
    }

    showSynonymFinder () {
        const panel = document.getElementById('synonymFinderPanel');
        if (!panel) return;
        const isOpen = panel.classList.toggle('active');
        if (!isOpen) return;

        // Pre-fill with word at cursor or last meaningful word
        const textarea = document.getElementById('lyricsTextarea');
        let selectedWord = '';
        if (textarea) {
            const start = textarea.selectionStart;
            const text = textarea.value;
            const before = text.slice(0, start).split(/\s+/).pop() || '';
            const after = text.slice(start).split(/\s+/)[0] || '';
            selectedWord = (before + after).replace(/[^a-zA-Z]/g, '');
        }
        const input = document.getElementById('synonymSearch');
        if (input) {
            input.value = selectedWord;
            if (input.value) this.searchSynonyms(input.value);
        }
        input?.addEventListener('input', () => this.searchSynonyms(input.value), { once: false });
    }

    searchSynonyms (word) {
        if (!word || word.length < 2) return;
        const container = document.getElementById('synonymResults');
        if (!container) return;
        const synonyms = this.suggestionEngine.getSynonyms(
            word.toLowerCase(), this.currentSong.mood, this.userStyle.vocabularyComplexity
        );
        if (!synonyms.length || (synonyms.length === 1 && synonyms[0] === word)) {
            container.innerHTML = '<span class="no-results">No synonyms found</span>';
            return;
        }
        container.innerHTML = synonyms.map(s =>
            `<button class="rhyme-word-btn synonym-btn" data-word="${s}">${s}</button>`
        ).join('');
        container.querySelectorAll('.synonym-btn').forEach(btn => {
            btn.addEventListener('click', () => this.insertWord(btn.dataset.word));
        });
    }

    showMoodMatcher () {
        const panel = document.getElementById('moodMatchPanel');
        if (!panel) return;
        panel.classList.toggle('active');
        const container = document.getElementById('moodMatchContent');
        if (!container) return;

        const tone = this.userStyle.emotionalTone || 'neutral';
        const consistency = Math.round(this.userStyle.toneConsistency || 50);
        const toneWords = {
            happy: ['joy', 'bright', 'smile', 'glow', 'light'],
            sad: ['tears', 'grey', 'silence', 'empty', 'away'],
            energetic: ['fire', 'run', 'power', 'rise', 'break'],
            romantic: ['love', 'close', 'tender', 'heart', 'stay'],
            melancholy: ['quiet', 'fading', 'still', 'distant', 'gone'],
            rebellious: ['fight', 'rage', 'defy', 'burn', 'free'],
            introspective: ['wonder', 'deep', 'search', 'mind', 'truth'],
            uplifting: ['soar', 'dawn', 'hope', 'rise', 'shine'],
            neutral: ['feel', 'think', 'know', 'say', 'go']
        };
        const words = toneWords[tone] || toneWords.neutral;
        container.innerHTML = `
            <div class="mood-tone-label">Detected mood: <strong>${tone}</strong></div>
            <div class="mood-consistency">Tone consistency: <strong>${consistency}%</strong></div>
            <div class="mood-word-row">
                ${words.map(w => `<button class="rhyme-word-btn mood-word-btn" data-word="${w}">${w}</button>`).join('')}
            </div>`;
        container.querySelectorAll('.mood-word-btn').forEach(btn => {
            btn.addEventListener('click', () => this.insertWord(btn.dataset.word));
        });
    }

    showStructureHelper () {
        const panel = document.getElementById('structureHelperPanel');
        if (!panel) return;
        panel.classList.toggle('active');
        const container = document.getElementById('structureContent');
        if (!container) return;

        const genre = this.currentSong.genre || 'pop';
        const structures = {
            'hip-hop': [
                { name: 'Intro', lines: 4 }, { name: 'Verse 1', lines: 16 },
                { name: 'Hook', lines: 8 }, { name: 'Verse 2', lines: 16 },
                { name: 'Hook', lines: 8 }, { name: 'Bridge', lines: 8 },
                { name: 'Outro', lines: 4 }
            ],
            pop: [
                { name: 'Verse 1', lines: 8 }, { name: 'Pre-Chorus', lines: 4 },
                { name: 'Chorus', lines: 8 }, { name: 'Verse 2', lines: 8 },
                { name: 'Pre-Chorus', lines: 4 }, { name: 'Chorus', lines: 8 },
                { name: 'Bridge', lines: 4 }, { name: 'Outro Chorus', lines: 8 }
            ],
            rnb: [
                { name: 'Intro', lines: 4 }, { name: 'Verse 1', lines: 12 },
                { name: 'Chorus', lines: 8 }, { name: 'Verse 2', lines: 12 },
                { name: 'Chorus', lines: 8 }, { name: 'Bridge', lines: 8 },
                { name: 'Outro', lines: 4 }
            ],
            country: [
                { name: 'Verse 1', lines: 8 }, { name: 'Chorus', lines: 8 },
                { name: 'Verse 2', lines: 8 }, { name: 'Chorus', lines: 8 },
                { name: 'Bridge', lines: 4 }, { name: 'Chorus', lines: 8 }
            ],
            rock: [
                { name: 'Intro', lines: 4 }, { name: 'Verse 1', lines: 8 },
                { name: 'Chorus', lines: 8 }, { name: 'Verse 2', lines: 8 },
                { name: 'Chorus', lines: 8 }, { name: 'Solo/Bridge', lines: 8 },
                { name: 'Outro', lines: 4 }
            ]
        };

        const struct = structures[genre] || structures.pop;
        const totalLines = struct.reduce((s, p) => s + p.lines, 0);
        const currentLines = (this.currentSong.lyrics || '').split('\n').filter(l => l.trim()).length;
        const progress = Math.min(100, Math.round((currentLines / totalLines) * 100));

        container.innerHTML = `
            <div class="structure-genre-label">${genre.charAt(0).toUpperCase() + genre.slice(1)} structure</div>
            <div class="structure-list">
                ${struct.map(s => `<div class="structure-part"><span>${s.name}</span><em>${s.lines} lines</em></div>`).join('')}
            </div>
            <div class="structure-progress-wrap">
                <div class="structure-progress-bar"><div style="width:${progress}%"></div></div>
                <span>${currentLines}/${totalLines} lines (${progress}%)</span>
            </div>`;
    }

    insertWord (word) {
        const textarea = document.getElementById('lyricsTextarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.slice(0, start);
        const after = text.slice(end);
        const separator = before.length && !/\s$/.test(before) ? ' ' : '';
        textarea.value = before + separator + word + ' ' + after;
        const newPos = start + separator.length + word.length + 1;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
        this.onLyricsChange(textarea.value);
    }

    saveProject () {
        const projectData = {
            ...this.currentSong,
            userStyle: this.userStyle,
            personalVocabFreq: this.personalVocabFreq,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        localStorage.setItem('aiSongwriterProject', JSON.stringify(projectData));
        this.showToast('Project saved successfully!', 'success');
    }

    async loadUserData () {
        const savedProject = localStorage.getItem('aiSongwriterProject');
        if (savedProject) {
            try {
                const data = JSON.parse(savedProject);
                this.currentSong = { ...this.currentSong, ...data };
                if (data.userStyle) Object.assign(this.userStyle, data.userStyle);
                if (data.personalVocabFreq) this.personalVocabFreq = { ...data.personalVocabFreq };

                // Restore UI
                const fields = ['songTitle', 'songGenre', 'songMood'];
                const keys = ['title', 'genre', 'mood'];
                fields.forEach((id, i) => {
                    const el = document.getElementById(id);
                    if (el) el.value = this.currentSong[keys[i]] || '';
                });
                const lyricsTextarea = document.getElementById('lyricsTextarea');
                if (lyricsTextarea) {
                    lyricsTextarea.value = this.currentSong.lyrics || '';
                    this.onLyricsChange(this.currentSong.lyrics || '');
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }

        // Load server profile (merges history from all sessions)
        await this.loadServerProfile();
        this.updateStyleProfileDisplay();
    }

    showToast (message, type = 'info') {
        // Use existing toast system
        if (window.finisherIntegration && window.finisherIntegration.showToast) {
            window.finisherIntegration.showToast(message, type);
        }
    }

    updateUI () {
        // Update initial UI state
        this.updateWritingStats(this.currentSong.lyrics || '');
        this.updateLearningStatus();
    }
}

/**
 * AI Suggestion Engine
 * Generates contextual suggestions based on user patterns
 */
class SuggestionEngine {
    constructor () {
        this.templates = {
            verse: [
                'In the {time} when {emotion} fills the air',
                'Walking through the {place} with {feeling} in my heart',
                'Remember when we {action} under {setting}',
                'Every {noun} tells a story of {theme}'
            ],
            chorus: [
                'And we\'ll {action} like there\'s no tomorrow',
                'This is the {noun} that we\'ve been waiting for',
                'Hold on to {concept} with all your might',
                'We are the {group} that {action} together'
            ],
            bridge: [
                'Sometimes I wonder if {question}',
                'In the silence I can hear {sound}',
                'Maybe {possibility} is all we need',
                'Beyond the {obstacle} lies our {goal}'
            ]
        };

        this.rhymeDatabase = new Map();
        this.initializeRhymeDatabase();
    }

    initializeRhymeDatabase () {
        // Simple rhyme database - in production this would be much larger
        const rhymes = {
            love: ['above', 'dove', 'shove', 'glove'],
            heart: ['start', 'part', 'art', 'smart'],
            night: ['light', 'bright', 'sight', 'flight'],
            day: ['way', 'say', 'play', 'stay'],
            time: ['rhyme', 'climb', 'prime', 'mime'],
            dreams: ['seems', 'themes', 'streams', 'beams']
        };

        Object.entries(rhymes).forEach(([word, rhymeList]) => {
            this.rhymeDatabase.set(word, rhymeList);
            // Add reverse mappings
            rhymeList.forEach(rhyme => {
                if (!this.rhymeDatabase.has(rhyme)) {
                    this.rhymeDatabase.set(rhyme, [word, ...rhymeList.filter(r => r !== rhyme)]);
                }
            });
        });
    }

    async generateSuggestions (currentSong, userStyle, writingHistory, personalVocab = {}) {
        const suggestions = [];

        // Line suggestions based on current context
        const lineSuggestions = this.generateLineSuggestions(currentSong, userStyle, personalVocab);
        suggestions.push(...lineSuggestions);

        // Word suggestions for vocabulary enhancement
        const wordSuggestions = this.generateWordSuggestions(currentSong, userStyle);
        suggestions.push(...wordSuggestions);

        // Structure suggestions
        const structureSuggestions = this.generateStructureSuggestions(currentSong);
        suggestions.push(...structureSuggestions);

        // Sort by confidence so best suggestions appear first
        return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
    }

    generateLineSuggestions (currentSong, userStyle, personalVocab = {}) {
        const suggestions = [];
        const { genre, mood, lyrics } = currentSong;
        const lines = lyrics.split('\n').filter(l => l.trim());
        const currentSection = this.detectCurrentSection(lines);
        const templates = this.templates[currentSection] || this.templates.verse;

        const topUserWords = Object.entries(personalVocab)
            .sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w]) => w);

        templates.forEach(template => {
            const filled = this.fillTemplate(template, { genre, mood, userStyle, personalVocab: topUserWords });
            const confidence = this.calculateConfidence(filled, userStyle);
            suggestions.push({ type: 'line', text: filled, confidence, context: currentSection });
        });

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    generateWordSuggestions (currentSong, userStyle) {
        const suggestions = [];
        const { lyrics, mood } = currentSong;

        // Find last meaningful word in lyrics
        const words = lyrics.split(/\s+/);
        const lastMeaningfulWord = [...words].reverse().find(word =>
            word.length > 3 && !/^(the|and|or|but|in|on|at|to|for|of|with)$/i.test(word)
        );

        if (lastMeaningfulWord) {
            const cleanWord = lastMeaningfulWord.replace(/[^a-zA-Z]/g, '').toLowerCase();
            const synonyms = this.getSynonyms(cleanWord, mood, userStyle.vocabularyComplexity);
            synonyms.forEach(synonym => {
                suggestions.push({
                    type: 'word',
                    text: synonym,
                    confidence: this.calculateWordConfidence(synonym, userStyle),
                    context: 'synonym'
                });
            });
        }

        return suggestions.slice(0, 2);
    }

    generateStructureSuggestions (currentSong) {
        const suggestions = [];
        const lines = currentSong.lyrics.split('\n').filter(l => l.trim());

        if (lines.length > 0 && lines.length % 4 === 0) {
            suggestions.push({
                type: 'structure',
                text: 'Consider adding a chorus here',
                confidence: 85,
                context: 'song structure'
            });
        }

        return suggestions;
    }

    detectCurrentSection (lines) {
        const lineCount = lines.length;

        if (lineCount === 0) return 'verse';
        if (lineCount <= 4) return 'verse';
        if (lineCount <= 8) return 'chorus';
        if (lineCount <= 12) return 'verse';
        if (lineCount <= 16) return 'bridge';

        return 'verse';
    }

    fillTemplate (template, context) {
        const { mood, personalVocab = [], userStyle = {} } = context;

        // Prefer user's own words when they overlap with generic options
        const pickWord = (generic, candidates) => {
            const overlap = candidates.filter(w => personalVocab.includes(w));
            const pool = overlap.length > 0 ? overlap : generic;
            return pool[Math.floor(Math.random() * pool.length)];
        };

        const replacements = {
            '{time}': pickWord(['morning', 'evening', 'midnight', 'dawn'], ['morning', 'night', 'evening', 'midnight', 'dawn', 'dusk']),
            '{emotion}': this.getEmotionWord(mood, userStyle.emotionalTone),
            '{place}': pickWord(['city', 'garden', 'highway', 'home'], ['city', 'street', 'home', 'room', 'garden', 'highway', 'road']),
            '{feeling}': this.getFeelingWord(mood, userStyle.emotionalTone),
            '{action}': pickWord(['dance', 'sing', 'run', 'fly'], ['dance', 'sing', 'run', 'walk', 'fight', 'hold', 'reach']),
            '{setting}': pickWord(['starlight', 'moonbeams', 'sunshine', 'rainfall'], ['stars', 'moon', 'sun', 'rain', 'light', 'dark', 'fire']),
            '{noun}': pickWord(['moment', 'dream', 'story', 'memory'], ['moment', 'dream', 'story', 'memory', 'word', 'voice', 'soul']),
            '{theme}': pickWord(['hope', 'love', 'freedom', 'change'], ['hope', 'love', 'freedom', 'truth', 'faith', 'peace']),
            '{concept}': pickWord(['hope', 'faith', 'love', 'dreams'], ['hope', 'faith', 'love', 'trust', 'pain', 'joy']),
            '{group}': ['ones', 'people', 'dreamers', 'fighters'][Math.floor(Math.random() * 4)],
            '{question}': ['we\'ll make it through', 'this is real', 'we belong here'][Math.floor(Math.random() * 3)],
            '{sound}': pickWord(['whispers', 'echoes', 'melodies', 'silence'], ['whisper', 'echo', 'song', 'sound', 'noise', 'silence']),
            '{possibility}': pickWord(['love', 'hope', 'trust', 'faith'], ['love', 'hope', 'trust', 'faith', 'chance']),
            '{obstacle}': pickWord(['darkness', 'storm', 'wall', 'fear'], ['dark', 'storm', 'wall', 'fear', 'shadow', 'doubt']),
            '{goal}': pickWord(['future', 'dreams', 'destiny', 'home'], ['future', 'dream', 'home', 'peace', 'truth', 'light'])
        };

        let filled = template;
        Object.entries(replacements).forEach(([placeholder, replacement]) => {
            filled = filled.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
        });

        return filled;
    }

    getEmotionWord (mood, userTone) {
        // Blend user's detected tone with the selected mood for richer matching
        const effectiveMood = (userTone && userTone !== 'neutral') ? userTone : (mood || 'happy');
        const emotions = {
            happy: ['joy', 'bliss', 'excitement', 'elation'],
            sad: ['sorrow', 'melancholy', 'grief', 'longing'],
            energetic: ['passion', 'fire', 'energy', 'power'],
            romantic: ['love', 'devotion', 'tenderness', 'warmth'],
            melancholy: ['nostalgia', 'yearning', 'solitude', 'reflection'],
            rebellious: ['defiance', 'fire', 'rage', 'revolution'],
            introspective: ['stillness', 'wonder', 'searching', 'depth'],
            uplifting: ['radiance', 'soaring', 'triumph', 'renewal'],
            neutral: ['feeling', 'thought', 'moment', 'truth']
        };
        const words = emotions[effectiveMood] || emotions.happy;
        return words[Math.floor(Math.random() * words.length)];
    }

    getFeelingWord (mood, userTone) {
        const effectiveMood = (userTone && userTone !== 'neutral') ? userTone : (mood || 'happy');
        const feelings = {
            happy: ['happiness', 'contentment', 'peace', 'satisfaction'],
            sad: ['emptiness', 'sadness', 'loss', 'pain'],
            energetic: ['excitement', 'adrenaline', 'motivation', 'drive'],
            romantic: ['love', 'affection', 'desire', 'connection'],
            melancholy: ['longing', 'ache', 'quiet sorrow', 'wistfulness'],
            rebellious: ['defiance', 'fire', 'restlessness', 'rage'],
            introspective: ['curiosity', 'wonder', 'searching', 'reflection'],
            uplifting: ['hope', 'gratitude', 'joy', 'strength'],
            neutral: ['feeling', 'sense', 'awareness', 'presence']
        };
        const words = feelings[effectiveMood] || feelings.happy;
        return words[Math.floor(Math.random() * words.length)];
    }


    getSynonyms (word, mood, complexityScore = 50) {
        // Tiered synonyms [simple, medium, complex] — tier chosen by user's vocabulary complexity
        const synonymTiers = {
            love: [['care', 'like'], ['adore', 'cherish'], ['revere', 'devotion']],
            happy: [['glad', 'good'], ['joyful', 'cheerful'], ['elated', 'euphoric']],
            sad: [['blue', 'down'], ['sorrowful', 'mournful'], ['melancholy', 'despondent']],
            beautiful: [['pretty', 'nice'], ['lovely', 'stunning'], ['magnificent', 'resplendent']],
            strong: [['hard', 'tough'], ['powerful', 'mighty'], ['formidable', 'indomitable']],
            light: [['glow', 'shine'], ['radiance', 'brilliance'], ['luminance', 'effulgence']],
            dark: [['dim', 'black'], ['shadow', 'somber'], ['tenebrous', 'obscure']],
            dream: [['hope', 'wish'], ['vision', 'reverie'], ['aspiration', 'illusion']],
            heart: [['soul', 'core'], ['spirit', 'essence'], ['innermost', 'quintessence']],
            walk: [['go', 'move'], ['wander', 'stroll'], ['meander', 'traverse']],
            think: [['feel', 'know'], ['wonder', 'ponder'], ['contemplate', 'ruminate']],
            broken: [['hurt', 'gone'], ['shattered', 'ruined'], ['fractured', 'devastated']]
        };

        const tiers = synonymTiers[word.toLowerCase()];
        if (!tiers) return [word];

        const tierIdx = complexityScore < 35 ? 0 : complexityScore < 65 ? 1 : 2;
        return tiers[tierIdx] || tiers[1] || tiers[0];
    }

    calculateConfidence (text, userStyle) {
        let confidence = 60;

        // Line length proximity — closer to user's avg earns up to +20
        const targetLen = userStyle.averageLineLength || 40;
        const lenDiff = Math.abs(text.length - targetLen);
        confidence += Math.max(0, 20 - lenDiff * 0.4);

        // Emotional tone match — +12 when a relevant word is present
        const tone = userStyle.emotionalTone || 'neutral';
        const toneWords = {
            happy: ['joy', 'bliss', 'light', 'bright', 'smile', 'glow'],
            sad: ['sorrow', 'grey', 'tears', 'lonely', 'dark', 'empty'],
            energetic: ['fire', 'power', 'run', 'fast', 'strong', 'burn'],
            romantic: ['love', 'tender', 'devotion', 'together', 'heart'],
            melancholy: ['nostalgia', 'quiet', 'still', 'fading', 'distant'],
            rebellious: ['rage', 'fight', 'break', 'defy', 'wild'],
            introspective: ['wonder', 'search', 'silence', 'within', 'deep'],
            uplifting: ['rise', 'soar', 'hope', 'dawn', 'light']
        };
        if (tone !== 'neutral') {
            const markers = toneWords[tone] || [];
            if (markers.some(w => text.toLowerCase().includes(w))) confidence += 12;
        }

        // Vocabulary complexity match — +8 when complexity is close
        const complexity = userStyle.vocabularyComplexity || 50;
        const textComplexity = text.split(' ').filter(w => w.length > 6).length
            / Math.max(1, text.split(' ').length) * 100;
        confidence += Math.max(0, 8 - Math.abs(complexity - textComplexity) * 0.2);

        return Math.min(98, Math.max(50, Math.round(confidence)));
    }

    calculateWordConfidence (word, userStyle) {
        // Score based on how well the word's complexity matches the user's vocabulary style
        const complexity = userStyle.vocabularyComplexity || 50;
        const wordComplexity = word.length > 9 ? 80 : word.length > 6 ? 50 : 25;
        const match = 100 - Math.abs(complexity - wordComplexity);
        return Math.min(92, Math.max(50, Math.round(match * 0.85)));
    }

    async generateCreativePrompts (userStyle, currentSong) {
        const emotion = userStyle.emotionalTone || 'neutral';
        const genre = currentSong.genre || 'pop';

        // Prompts are personalized based on user's dominant emotion and genre
        const emotionPrompts = {
            sad: [
                { title: 'The Last Goodbye', description: 'Write about something you\'re letting go of', text: 'There\'s a moment right before...' },
                { title: 'Empty Room', description: 'Describe a space that feels different now', text: 'Everything looks the same but feels...' }
            ],
            happy: [
                { title: 'Golden Moment', description: 'Capture a perfect, fleeting second', text: 'Time stood still when...' },
                { title: 'Thank You Song', description: 'Write to someone who changed your path', text: 'Because of you I learned...' }
            ],
            energetic: [
                { title: 'No Limits', description: 'Write from a place of unstoppable momentum', text: 'Nothing can stop me now because...' },
                { title: 'Rise Up', description: 'Anthem for pushing past every obstacle', text: 'They said it couldn\'t be done...' }
            ],
            romantic: [
                { title: 'First Look', description: 'The exact moment you knew', text: 'Across the room I saw...' },
                { title: 'Ordinary Magic', description: 'Love in a completely normal moment', text: 'It was just a Tuesday when...' }
            ],
            melancholy: [
                { title: 'Fading Photograph', description: 'A memory that\'s losing its edges', text: 'I can still almost remember...' },
                { title: 'The Space Between', description: 'What lives in silence and distance', text: 'In the quiet you left behind...' }
            ],
            neutral: [
                { title: 'Emotional Memory', description: 'Write about a moment that changed everything', text: 'Think of a specific moment when everything shifted...' },
                { title: 'Character Perspective', description: 'Tell a story from someone else\'s view', text: 'Imagine you are someone completely different...' }
            ]
        };

        const genreFrames = {
            'hip-hop': { title: 'Bars of Truth', description: 'Say the thing you\'ve been afraid to say out loud', text: 'Real talk, what I really mean is...' },
            'rnb': { title: 'Velvet Feeling', description: 'Describe warmth, touch, texture, sensation', text: 'It felt like silk and...' },
            'rock': { title: 'Against the World', description: 'You vs every expectation', text: 'They wanted me to be...' },
            'pop': { title: 'Stream of Consciousness', description: 'Write without stopping for 2 minutes', text: 'Right now I\'m feeling...' },
            'folk': { title: 'The Long Road', description: 'A journey, literal or metaphorical', text: 'Miles from where I started...' }
        };

        const basePrompts = (emotionPrompts[emotion] || emotionPrompts.neutral).slice(0, 2);
        const genrePrompt = genreFrames[genre] || genreFrames.pop;

        return [...basePrompts, { ...genrePrompt }];
    }

    generateLineContinuations (partialLine, userStyle) {
        const avgLen = userStyle.averageLineLength || 40;
        const partialLen = partialLine.length;
        const emotion = userStyle.emotionalTone || 'neutral';

        const pool = [
            { text: ' and I know it\'s true', emotion: 'romantic', len: 18 },
            { text: ' in the morning light', emotion: 'happy', len: 21 },
            { text: ' through the darkest night', emotion: 'sad', len: 25 },
            { text: ' with an open heart', emotion: 'romantic', len: 19 },
            { text: ' when the world was young', emotion: 'melancholy', len: 24 },
            { text: ' like a distant dream', emotion: 'melancholy', len: 21 },
            { text: ' with you by my side', emotion: 'romantic', len: 20 },
            { text: ' and we rise above', emotion: 'energetic', len: 18 },
            { text: ' still searching for a sign', emotion: 'introspective', len: 26 },
            { text: ' before the silence breaks', emotion: 'introspective', len: 25 },
            { text: ' burning like a flame', emotion: 'energetic', len: 21 },
            { text: ' lost within the sound', emotion: 'sad', len: 22 },
            { text: ' and nothing else remains', emotion: 'sad', len: 25 },
            { text: ' yeah we\'re doing fine', emotion: 'happy', len: 21 },
            { text: ' breaking every chain', emotion: 'rebellious', len: 21 }
        ];

        // Score each by: emotion match + line length closeness
        const scored = pool.map(c => {
            const lenScore = Math.max(0, 20 - Math.abs((partialLen + c.len) - avgLen) * 0.5);
            const emotionScore = (c.emotion === emotion) ? 15 : (emotion === 'neutral' ? 5 : 0);
            return { text: c.text, score: lenScore + emotionScore };
        });

        return scored.sort((a, b) => b.score - a.score).slice(0, 5).map(c => c.text);
    }

    rewriteInUserStyle (originalText, userStyle) {
        const complexity = userStyle.vocabularyComplexity || 50;
        const tone = userStyle.emotionalTone || 'neutral';
        const rewrites = [];

        const upgrades = { good: 'magnificent', nice: 'tender', big: 'immense', old: 'timeworn', walk: 'wander', said: 'whispered', hurt: 'shattered', want: 'crave' };
        const downgrades = { magnificent: 'amazing', tender: 'gentle', immense: 'huge', timeworn: 'old', wander: 'walk', whispered: 'said', shattered: 'broken', crave: 'want' };
        const toneSwaps = {
            sad: { love: 'used to love', bright: 'once bright', hope: 'lost hope' },
            energetic: { slowly: 'fiercely', quiet: 'loud', still: 'alive' },
            melancholy: { happy: 'bittersweet', running: 'fading', together: 'apart' }
        };

        originalText.split('\n').forEach(line => {
            if (!line.trim()) return;
            let rewritten = line;

            // Apply vocabulary complexity transformation
            if (complexity > 65) {
                Object.entries(upgrades).forEach(([from, to]) => {
                    rewritten = rewritten.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
                });
            } else if (complexity < 35) {
                Object.entries(downgrades).forEach(([from, to]) => {
                    rewritten = rewritten.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
                });
            }

            // Apply tone-based word swaps
            const swaps = toneSwaps[tone];
            if (swaps) {
                Object.entries(swaps).forEach(([from, to]) => {
                    rewritten = rewritten.replace(new RegExp(`\\b${from}\\b`, 'gi'), to);
                });
            }

            if (rewritten !== line) rewrites.push(rewritten);
            else rewrites.push(line + ' — in your style');
        });

        return rewrites.slice(0, 3);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.finisherIntegration = new FinisherIntegration();

    // Initialize AI Songwriter when on the appropriate tab
    setTimeout(() => {
        window.aiSongwriter = new AISongwriterAssistant();
    }, 1000);

    // Initialize Subscription Carousel
    initSubscriptionCarousel();
});

// Subscription Carousel Controller
function initSubscriptionCarousel() {
    const carousel = document.querySelector('.subscription-plans-carousel');
    const leftBtn = document.getElementById('scrollLeft');
    const rightBtn = document.getElementById('scrollRight');

    if (!carousel || !leftBtn || !rightBtn) return;

    // Scroll amount (one card width + gap)
    const scrollAmount = 320 + 24; // card width + gap

    // Update button states
    function updateButtons() {
        const maxScroll = carousel.scrollWidth - carousel.clientWidth;
        leftBtn.disabled = carousel.scrollLeft <= 0;
        rightBtn.disabled = carousel.scrollLeft >= maxScroll - 1;
    }

    // Scroll left
    leftBtn.addEventListener('click', () => {
        carousel.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateButtons, 300);
    });

    // Scroll right
    rightBtn.addEventListener('click', () => {
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
        setTimeout(updateButtons, 300);
    });

    // Update on scroll
    carousel.addEventListener('scroll', updateButtons);

    // Touch/swipe support
    let startX = 0;
    let scrollLeft = 0;
    let isDown = false;

    carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        carousel.style.cursor = 'grabbing';
    });

    carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });

    carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.style.cursor = 'grab';
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
    });

    carousel.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    // Initialize button states
    updateButtons();

    // Set cursor style
    carousel.style.cursor = 'grab';
}

// Add toast styles to head
const toastStyles = `
<style>
.toast {
    position: fixed;
    top: 80px;
    right: 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 400px;
}

.toast.show {
    transform: translateX(0);
}

.toast-success {
    border-left: 4px solid var(--success-color);
}

.toast-error {
    border-left: 4px solid var(--error-color);
}

.toast-info {
    border-left: 4px solid var(--primary-color);
}

.toast i {
    font-size: 1.2rem;
}

.toast-success i {
    color: var(--success-color);
}

.toast-error i {
    color: var(--error-color);
}

.toast-info i {
    color: var(--primary-color);
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', toastStyles);
