const fs = require('fs').promises;
const path = require('path');

class TranslationManager {
    constructor () {
        this.translations = new Map();
        this.defaultLanguage = 'en';
        this.supportedLanguages = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ru'];
        this.translationsDir = path.join(__dirname, '../../translations');
    }

    async initialize () {
        console.log('🌍 Initializing Translation Manager...');

        for (const lang of this.supportedLanguages) {
            try {
                const translationPath = path.join(this.translationsDir, `${lang}.json`);
                const translationData = await fs.readFile(translationPath, 'utf8');
                const translations = JSON.parse(translationData);
                this.translations.set(lang, translations);
                console.log(`✅ Loaded translations for: ${lang}`);
            } catch (error) {
                console.error(`❌ Failed to load translations for ${lang}:`, error.message);
            }
        }

        console.log(`🌍 Translation Manager initialized with ${this.translations.size} languages`);
    }

    getSupportedLanguages () {
        return this.supportedLanguages;
    }

    getDefaultLanguage () {
        return this.defaultLanguage;
    }

    detectLanguage (acceptLanguage) {
        if (!acceptLanguage) return this.defaultLanguage;

        // Parse Accept-Language header
        const languages = acceptLanguage.split(',').map(lang => {
            const [code, quality] = lang.trim().split(';q=');
            return {
                code: code.split('-')[0], // Get primary language code
                quality: quality ? parseFloat(quality) : 1.0
            };
        });

        // Sort by quality (highest first)
        languages.sort((a, b) => b.quality - a.quality);

        // Find first supported language
        for (const lang of languages) {
            if (this.supportedLanguages.includes(lang.code)) {
                return lang.code;
            }
        }

        return this.defaultLanguage;
    }

    getTranslation (language, key) {
        const translations = this.translations.get(language) || this.translations.get(this.defaultLanguage);

        if (!translations) {
            console.warn(`No translations available for language: ${language}`);
            return key; // Return key as fallback
        }

        // Navigate through nested object structure
        const keys = key.split('.');
        let value = translations;

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                console.warn(`Translation key not found: ${key} for language: ${language}`);
                // Fallback to default language
                const defaultTranslations = this.translations.get(this.defaultLanguage);
                value = defaultTranslations;
                for (const defaultKey of keys) {
                    value = value?.[defaultKey];
                    if (value === undefined) break;
                }
                break;
            }
        }

        return value || key;
    }

    translate (language, key, interpolations = {}) {
        let translation = this.getTranslation(language, key);

        // Handle string interpolations (e.g., "Welcome {name}" -> "Welcome John")
        if (typeof translation === 'string') {
            for (const [placeholder, value] of Object.entries(interpolations)) {
                translation = translation.replace(new RegExp(`{${placeholder}}`, 'g'), value);
            }
        }

        return translation;
    }

    // Helper method for API responses
    getLocalizedResponse (language, responseType, data = {}) {
        const baseKey = `api.responses.${responseType}`;
        return {
            message: this.translate(language, baseKey, data),
            success: responseType.includes('success') || responseType.includes('created'),
            timestamp: new Date().toISOString()
        };
    }

    // Helper method for error responses
    getLocalizedError (language, errorType, details = {}) {
        const baseKey = `api.errors.${errorType}`;
        return {
            error: this.translate(language, baseKey, details),
            errorType,
            timestamp: new Date().toISOString()
        };
    }

    // Validate translation completeness
    validateTranslations () {
        const defaultTranslations = this.translations.get(this.defaultLanguage);
        const missingTranslations = {};

        for (const lang of this.supportedLanguages) {
            if (lang === this.defaultLanguage) continue;

            const langTranslations = this.translations.get(lang);
            missingTranslations[lang] = this.findMissingKeys(defaultTranslations, langTranslations);
        }

        return missingTranslations;
    }

    findMissingKeys (defaultObj, targetObj, path = '') {
        const missing = [];

        for (const [key, value] of Object.entries(defaultObj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (!(key in targetObj)) {
                missing.push(currentPath);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                missing.push(...this.findMissingKeys(value, targetObj[key], currentPath));
            }
        }

        return missing;
    }

    // Get translation statistics
    getTranslationStats () {
        const stats = {};

        for (const lang of this.supportedLanguages) {
            const translations = this.translations.get(lang);
            if (translations) {
                stats[lang] = this.countTranslationKeys(translations);
            }
        }

        return stats;
    }

    countTranslationKeys (obj, count = 0) {
        for (const value of Object.values(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                count = this.countTranslationKeys(value, count);
            } else {
                count++;
            }
        }
        return count;
    }

    // Reload translations (useful for development)
    async reloadTranslations () {
        this.translations.clear();
        await this.initialize();
    }
}

module.exports = new TranslationManager();
