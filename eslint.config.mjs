import js from '@eslint/js';
import html from 'eslint-plugin-html';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const extensionScripts = ['extension/**/*.{js,ts}'];

const extensionPages = ['extension/**/*.html'];

const websiteFiles = ['**/*.html', 'website/**/*.{js,ts}', 'js/**/*.{js,ts}'];

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'extension/dist/**',
      'build/**',
      '.cursor-context/**',
      '**/*.min.js',
      // Separate projects with their own lint setup.
      'app/**',
      'server/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.{js,html}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: extensionScripts,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
  },
  {
    files: extensionPages,
    plugins: { html },
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
  },
  {
    files: websiteFiles,
    ignores: extensionPages,
    plugins: { html },
    languageOptions: {
      globals: {
        ...globals.browser,
        Paddle: 'readonly',
      },
    },
  },
  {
    files: [
      '**/*.test.{js,ts}',
      '**/*.spec.{js,ts}',
      '**/__tests__/**/*.{js,ts}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    files: [
      '*.config.js',
      '*.config.cjs',
      'esbuild.config.js',
      'webpack.config.js',
      'jest.config.js',
    ],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  prettier
);
