/**
 * Environment Configuration Validator
 * Validates that all required environment variables are set before launch
 */

const fs = require('fs');
const path = require('path');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredVars = [
      'NODE_ENV',
      'PORT',
      'MONGODB_URI',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    this.productionVars = [
      'REDIS_URL',
      'SENDGRID_API_KEY',
      'EMAIL_FROM',
      'CLIENT_URL',
      'BUSINESS_ACCOUNT_NUMBER',
      'BUSINESS_ROUTING_NUMBER'
    ];

    this.optionalVars = [
      'TWITCH_CLIENT_ID',
      'TWITCH_CLIENT_SECRET',
      'YOUTUBE_API_KEY',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET'
    ];
  }

  validate() {
    console.log('🔍 Validating environment configuration...\n');

    // Check if .env file exists
    if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
      this.errors.push('❌ .env file not found. Copy .env.example to .env and configure it.');
      this.printResults();
      return false;
    }

    require('dotenv').config();

    // Validate required variables
    this.validateRequired();

    // Validate production variables if in production
    if (process.env.NODE_ENV === 'production') {
      this.validateProduction();
    }

    // Validate variable formats
    this.validateFormats();

    // Check optional integrations
    this.checkOptionalIntegrations();

    // Print results
    this.printResults();

    return this.errors.length === 0;
  }

  validateRequired() {
    console.log('📋 Checking required environment variables...');
    this.requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.errors.push(`❌ Missing required variable: ${varName}`);
      } else if (process.env[varName].includes('your-') || process.env[varName].includes('change-this')) {
        this.errors.push(`❌ ${varName} still has placeholder value. Please set a real value.`);
      } else {
        console.log(`   ✅ ${varName}`);
      }
    });
    console.log('');
  }

  validateProduction() {
    console.log('🚀 Checking production-specific variables...');
    this.productionVars.forEach(varName => {
      if (!process.env[varName]) {
        this.warnings.push(`⚠️  Missing production variable: ${varName} (recommended for production)`);
      } else {
        console.log(`   ✅ ${varName}`);
      }
    });
    console.log('');
  }

  validateFormats() {
    console.log('🔧 Validating variable formats...');

    // Validate JWT_SECRET length (should be at least 32 characters)
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.warnings.push('⚠️  JWT_SECRET should be at least 32 characters for security');
    }

    // Validate MongoDB URI format
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
      this.errors.push('❌ MONGODB_URI must start with mongodb:// or mongodb+srv://');
    }

    // Validate PORT is a number
    if (process.env.PORT && isNaN(process.env.PORT)) {
      this.errors.push('❌ PORT must be a valid number');
    }

    // Validate Redis URL format if provided
    if (process.env.REDIS_URL && !process.env.REDIS_URL.startsWith('redis://')) {
      this.warnings.push('⚠️  REDIS_URL should start with redis://');
    }

    // Validate email format
    if (process.env.EMAIL_FROM && !this.isValidEmail(process.env.EMAIL_FROM)) {
      this.errors.push('❌ EMAIL_FROM must be a valid email address');
    }

    // Validate Stripe keys format
    if (process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV === 'production' && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
        this.warnings.push('⚠️  Using Stripe TEST key in PRODUCTION environment');
      }
      if (process.env.NODE_ENV !== 'production' && process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) {
        this.warnings.push('⚠️  Using Stripe LIVE key in NON-PRODUCTION environment');
      }
    }

    console.log('');
  }

  checkOptionalIntegrations() {
    console.log('🔌 Checking optional integrations...');

    const twitchEnabled = process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET;
    const youtubeEnabled = process.env.YOUTUBE_API_KEY;
    const paypalEnabled = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;

    console.log(`   ${twitchEnabled ? '✅' : '⚪'} Twitch API Integration ${twitchEnabled ? 'enabled' : 'disabled'}`);
    console.log(`   ${youtubeEnabled ? '✅' : '⚪'} YouTube API Integration ${youtubeEnabled ? 'enabled' : 'disabled'}`);
    console.log(`   ${paypalEnabled ? '✅' : '⚪'} PayPal Integration ${paypalEnabled ? 'enabled' : 'disabled'}`);
    console.log('');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(60) + '\n');

    if (this.errors.length > 0) {
      console.log('🔴 ERRORS (must fix before launch):');
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('🟡 WARNINGS (recommended to fix):');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log('');
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All environment variables are properly configured!');
      console.log('🚀 Your platform is ready for deployment!\n');
    } else if (this.errors.length === 0) {
      console.log('✅ No critical errors found.');
      console.log('⚠️  Consider addressing warnings before production launch.\n');
    } else {
      console.log('❌ Configuration validation failed.');
      console.log('   Please fix the errors above before launching.\n');
    }

    console.log('='.repeat(60) + '\n');
  }

  static run() {
    const validator = new EnvironmentValidator();
    const isValid = validator.validate();

    if (!isValid) {
      process.exit(1);
    }

    return isValid;
  }
}

// Run if called directly
if (require.main === module) {
  EnvironmentValidator.run();
}

module.exports = EnvironmentValidator;
