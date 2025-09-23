import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve, dirname } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  root: __dirname,        // <-- pin root to frontend explicitly
  plugins: [vue(), vueJsx()],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    globals: true,
    setupFiles: [],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true  // <-- Ultimativer Fix: Single-Thread = kein Tinypool Worker
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
