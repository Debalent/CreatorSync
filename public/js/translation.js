// CreatorSync Frontend Translation System
class TranslationSystem {
    constructor () {
        this.currentLanguage = this.detectLanguage();
        this.translations = {};
        this.translationKeys = new Set();
        this.init();
    }

    async init () {
        await this.loadTranslations();
        this.setupLanguageSelector();
        this.applyTranslations();
    }

    detectLanguage () {
        // Check localStorage first
        const savedLanguage = localStorage.getItem('creatorSync_language');
        if (savedLanguage && ['en', 'es', 'fr', 'de'].includes(savedLanguage)) {
            return savedLanguage;
        }

        // Default to English
        localStorage.setItem('creatorSync_language', 'en');
        return 'en';
    }

    async loadTranslations () {
        try {
            const response = await fetch(`/translations/${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations = await response.json();
                console.log(`🌍 Loaded frontend translations for: ${this.currentLanguage}`);
            } else {
                console.warn(`Failed to load translations for ${this.currentLanguage}, falling back to English`);
                const fallbackResponse = await fetch('/translations/en.json');
                this.translations = await fallbackResponse.json();
                this.currentLanguage = 'en';
            }
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English
            this.currentLanguage = 'en';
            try {
                const response = await fetch('/translations/en.json');
                this.translations = await response.json();
            } catch (fallbackError) {
                console.error('Failed to load fallback translations:', fallbackError);
            }
        }
    }

    getTranslation (key, interpolations = {}) {
        // Navigate through nested object structure
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                console.warn(`Translation key not found: ${key}`);
                return undefined;
            }
        }

        // Handle string interpolations
        if (typeof value === 'string') {
            for (const [placeholder, replacement] of Object.entries(interpolations)) {
                value = value.replace(new RegExp(`{${placeholder}}`, 'g'), replacement);
            }
        }

        return value;
    }

    translate (key, interpolations = {}) {
        return this.getTranslation(key, interpolations);
    }

    async changeLanguage (language) {
        if (language === this.currentLanguage) return;

        this.currentLanguage = language;
        localStorage.setItem('creatorSync_language', language);

        await this.loadTranslations();
        this.applyTranslations();

        // Emit language change event for other components
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: this.currentLanguage }
        }));

        console.log(`🌍 Language changed to: ${language}`);
    }

    setupLanguageSelector () {
        if (document.getElementById('languageSelect')) {
            return;
        }

        // Create language selector dropdown
        const languageSelector = document.createElement('div');
        languageSelector.className = 'language-selector';
        languageSelector.innerHTML = `
            <select id="languageSelect" title="Select Language">
                <option value="en">🇺🇸 English</option>
                <option value="es">🇪🇸 Español</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="de">🇩🇪 Deutsch</option>
            </select>
        `;

        // Add to navigation
        const navAuth = document.querySelector('.nav-auth');
        if (navAuth) {
            navAuth.appendChild(languageSelector);

            // Add event listener
            document.getElementById('languageSelect').addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });

            // Set current language
            document.getElementById('languageSelect').value = this.currentLanguage;
        }
    }

    applyTranslations () {
        // Apply translations to elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.dataset.translate;
            const translation = this.getTranslation(key);
            if (translation === undefined) {
                return;
            }

            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Apply translations to elements with data-translate-html
        document.querySelectorAll('[data-translate-html]').forEach(element => {
            const key = element.dataset.translateHtml;
            const translation = this.getTranslation(key);
            if (translation !== undefined) {
                element.innerHTML = translation;
            }
        });

        // Apply translations to elements with data-translate-title
        document.querySelectorAll('[data-translate-title]').forEach(element => {
            const key = element.dataset.translateTitle;
            const translation = this.getTranslation(key);
            if (translation !== undefined) {
                element.title = translation;
            }
        });

        // Apply translations to elements with data-translate-aria-label
        document.querySelectorAll('[data-translate-aria-label]').forEach(element => {
            const key = element.dataset.translateAriaLabel;
            const translation = this.getTranslation(key);
            if (translation !== undefined) {
                element.setAttribute('aria-label', translation);
            }
        });
    }

    // Helper method to translate and update element
    translateElement (element, key, useInnerHTML = false) {
        const translation = this.getTranslation(key);
        if (useInnerHTML) {
            element.innerHTML = translation;
        } else {
            element.textContent = translation;
        }
    }

    // Method to add translation keys dynamically
    addTranslationKey (key, value, language = this.currentLanguage) {
        if (!this.translations[language]) {
            this.translations[language] = {};
        }

        // Navigate and set nested value
        const keys = key.split('.');
        let current = this.translations[language];

        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
    }

    // Get current language
    getCurrentLanguage () {
        return this.currentLanguage;
    }

    // Get supported languages
    getSupportedLanguages () {
        return ['en', 'es', 'fr', 'de'];
    }
}

// Create global translation instance
const translationSystem = new TranslationSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TranslationSystem;
}
