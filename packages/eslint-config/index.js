import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.vite/**',
    ],
  },

  // Base config for all files
  js.configs.recommended,

  // Root-level config files (JS/MJS)
  {
    files: ['*.js', '*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript files configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: true,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // TypeScript recommended rules
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-type-checked'].rules,

      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Import sorting
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js built-in modules
            ['^node:'],
            // External packages
            ['^@?\\w'],
            // Internal packages from src
            ['^src/'],
            // Parent imports
            ['^\\.\\.'],
            // Sibling imports
            ['^\\.'],
            // Type imports
            ['^.+\\u0000$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // JavaScript files configuration
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      // Import sorting
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js built-in modules
            ['^node:'],
            // External packages
            ['^@?\\w'],
            // Internal packages from src
            ['^src/'],
            // Parent imports
            ['^\\.\\.'],
            // Sibling imports
            ['^\\.'],
            // Type imports
            ['^.+\\u0000$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',

      // General best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Prettier config - must be last to override conflicting rules
  eslintConfigPrettier,
];
