// Jest Configuration for CreatorSync
// Testing framework configuration

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Coverage directory
    coverageDirectory: 'coverage',

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0
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

