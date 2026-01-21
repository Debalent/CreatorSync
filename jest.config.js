// Jest Configuration for CreatorSync
// Testing framework configuration

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Coverage directory
    coverageDirectory: 'coverage',

    // Coverage thresholds
    coverageThresholds: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // Files to collect coverage from
    collectCoverageFrom: [
        'server/**/*.js',
        '!server/server.js',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/dist/**'
    ],

    // Test match patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Module paths
    modulePaths: ['<rootDir>'],

    // Transform files
    transform: {},

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks between tests
    restoreMocks: true,

    // Test timeout
    testTimeout: 10000
};

