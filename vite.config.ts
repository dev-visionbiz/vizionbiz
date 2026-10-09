import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/receitaws': {
        target: 'https://www.receitaws.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/receitaws/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
