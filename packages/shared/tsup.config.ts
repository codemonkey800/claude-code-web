import { defineConfig } from 'tsup'

export default defineConfig({
  // Entry point
  entry: ['src/index.ts'],

  // Output both ESM and CommonJS for compatibility
  format: ['esm', 'cjs'],

  // Generate TypeScript declarations with explicit tsconfig
  dts: {
    resolve: true,
  },

  // Generate source maps for debugging
  sourcemap: true,

  // Clean output directory before each build
  clean: true,

  // Don't split code - better for library packages
  splitting: false,

  // Enable tree shaking for optimal bundle size
  treeshake: true,

  // Don't minify - let consumers decide
  minify: false,

  // Output directory
  outDir: 'dist',

  // Target ES2022 to match tsconfig
  target: 'es2022',

  // Don't bundle dependencies
  external: ['zod'],

  // Explicitly use the local tsconfig
  tsconfig: './tsconfig.json',
})
