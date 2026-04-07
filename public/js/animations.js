// CreatorSync Splash Screen and Loading Animations Handler

class CreatorSyncAnimations {
    constructor() {
        this.splashScreen = null;
        this.loadingScreen = null;
        this.initialized = false;
    }

    /**
     * Initialize splash screen on page load
     */
    initSplashScreen() {
        if (this.initialized) return;

        // Create splash screen HTML
        const splashHTML = `
            <div class="splash-screen" id="splashScreen">
                <div class="swirl-background">
                    <div class="swirl-circle"></div>
                    <div class="swirl-circle"></div>
                    <div class="swirl-circle"></div>
                </div>
                <div class="splash-particles">
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                </div>
                <div class="splash-logo-container">
                    <img src="assets/logo.png" alt="CreatorSync" class="splash-logo">
                </div>
                <p class="splash-tagline">Powered by The Finisher</p>
            </div>
        `;

        // Insert at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', splashHTML);
        this.splashScreen = document.getElementById('splashScreen');

        // Remove splash screen after animation
        setTimeout(() => {
            this.hideSplashScreen();
        }, 3000); // 3 seconds

        this.initialized = true;
    }

    /**
     * Hide splash screen with fade out animation
     */
    hideSplashScreen() {
        if (this.splashScreen) {
            this.splashScreen.classList.add('hidden');
            setTimeout(() => {
                this.splashScreen.remove();
                this.splashScreen = null;
            }, 800); // Match fadeOutSplash animation duration
        }
    }

    /**
     * Show wave loading screen
     * @param {string} message - Loading message to display
     */
    showLoadingScreen(message = 'Loading') {
        // Remove existing loading screen if present
        this.hideLoadingScreen();

        const loadingHTML = `
            <div class="wave-loading-container" id="waveLoading">
                <div class="wave-logo-wrapper">
                    <img src="assets/logo.png" alt="CreatorSync" class="wave-logo logo-echo logo-pulse">
                    <div class="wave-gradient-overlay"></div>
                </div>
                <div class="wave-sync-bars">
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                </div>
                <p class="loading-text">${message}</p>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', loadingHTML);
        this.loadingScreen = document.getElementById('waveLoading');
    }

    /**
     * Hide wave loading screen
     */
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                if (this.loadingScreen) {
                    this.loadingScreen.remove();
                    this.loadingScreen = null;
                }
            }, 500); // Match fade-out transition
        }
    }

    /**
     * Update loading message
     * @param {string} message - New loading message
     */
    updateLoadingMessage(message) {
        if (this.loadingScreen) {
            const textElement = this.loadingScreen.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    /**
     * Add echo effect to an element
     * @param {string|HTMLElement} element - Element selector or element itself
     */
    addEchoEffect(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) {
            el.classList.add('logo-echo', 'logo-pulse');
        }
    }

    /**
     * Remove echo effect from an element
     * @param {string|HTMLElement} element - Element selector or element itself
     */
    removeEchoEffect(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) {
            el.classList.remove('logo-echo', 'logo-pulse');
        }
    }

    /**
     * Initialize page transitions
     */
    initPageTransitions() {
        // Add page transition class to main sections
        const sections = document.querySelectorAll('section, .card, .beat-card');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('page-transition');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        sections.forEach(section => {
            observer.observe(section);
        });
    }
}

// Global instance
const animationsManager = new CreatorSyncAnimations();

// Auto-initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        animationsManager.initSplashScreen();
        animationsManager.initPageTransitions();
    });
} else {
    // DOM already loaded
    animationsManager.initSplashScreen();
    animationsManager.initPageTransitions();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreatorSyncAnimations;
}

// Make available globally
window.CreatorSyncAnimations = CreatorSyncAnimations;
window.animationsManager = animationsManager;
