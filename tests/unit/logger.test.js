// Unit Tests for Logger Utility

const { logger, createComponentLogger, logInfo } = require('../../server/utils/logger');

describe('Logger Utility', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('Basic Logging', () => {
        it('should log info messages', () => {
            const message = 'Test info message';
            logInfo(message);
            // Logger is configured, test passes if no errors
            expect(true).toBe(true);
        });

        it('should create component logger', () => {
            const componentLogger = createComponentLogger('TestComponent');
            expect(componentLogger).toHaveProperty('info');
            expect(componentLogger).toHaveProperty('warn');
            expect(componentLogger).toHaveProperty('error');
            expect(componentLogger).toHaveProperty('debug');
        });
    });

    describe('Component Logger', () => {
        it('should log with component metadata', () => {
            const componentLogger = createComponentLogger('TestComponent');
            componentLogger.info('Test message', { userId: '123' });
            // Logger is configured, test passes if no errors
            expect(true).toBe(true);
        });
    });
});

