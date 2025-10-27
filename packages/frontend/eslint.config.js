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
      // Disable explicit return types for React components
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
]
