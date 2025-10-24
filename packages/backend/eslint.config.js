import baseConfig from '@claude-code-web/eslint-config'

export default [
  ...baseConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
