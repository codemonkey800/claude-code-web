import { defineConfig } from 'tsup'

export default defineConfig({
  // Entry point
  entry: ['src/index.ts'],

  // ESM only - simpler and modern
  format: ['esm'],

  // Generate TypeScript declarations
  dts: true,

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
})
