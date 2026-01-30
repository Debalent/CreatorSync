// ESLint v9 flat config for CreatorSync
import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021,
                io: 'readonly',
                translationSystem: 'readonly'
            }
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'warn',
            semi: ['error', 'always'],
            quotes: ['error', 'single'],
            'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 2 }],
            'no-case-declarations': 'off',
            'no-useless-catch': 'off'
        }
    },
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            'dist/**',
            'logs/**',
            'public/uploads/**'
        ]
    }
];
