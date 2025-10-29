import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      src: resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
