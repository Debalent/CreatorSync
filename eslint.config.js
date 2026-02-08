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
                Tone: 'readonly',
                translationSystem: 'readonly',
                // Beat Maker classes loaded from separate files
                BeatMakerEngine: 'readonly',
                BeatMakerUI: 'readonly',
                BeatMakerResize: 'readonly',
                EffectsManager: 'readonly',
                BeatMakerProjects: 'readonly',
                BeatMakerPianoRoll: 'readonly',
                BeatMakerArrangement: 'readonly',
                BeatMakerAutomation: 'readonly',
                BeatMakerMIDI: 'readonly',
                BeatMakerRecording: 'readonly',
                BeatMakerRouting: 'readonly',
                BeatMakerSamples: 'readonly',
                CollaborationManager: 'readonly',
                collaborationManager: 'readonly'
            }
        },
        rules: {
            'no-console': 'off',
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
