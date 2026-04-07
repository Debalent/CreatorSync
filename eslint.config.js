import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.jest,
        require: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        process: "readonly",
        module: "readonly",
        __dirname: "readonly",
        alert: "readonly",
        confirm: "readonly",
        navigator: "readonly",
        FormData: "readonly",
        XMLHttpRequest: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        MediaRecorder: "readonly",
        Blob: "readonly",
        CustomEvent: "readonly",
        IntersectionObserver: "readonly",
        requestAnimationFrame: "readonly",
        Event: "readonly",
        Tone: "readonly"
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'script'
      }
    }
  }
];
