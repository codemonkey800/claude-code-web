import baseConfig from '@claude-code-web/eslint-config'

export default [
  {
    ignores: ['*.config.ts', '*.config.js', 'vite.config.ts'],
  },
  ...baseConfig,
  {
    files: ['**/*.tsx', '**/*.ts'],
    ignores: ['*.config.ts', '*.config.js', 'vite.config.ts'],
    rules: {
      // Frontend-specific rules if needed
    },
  },
]
