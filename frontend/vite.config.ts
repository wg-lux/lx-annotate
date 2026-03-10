import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
    base: '/static/', //needs to be here for correct nginx serving!
    plugins: [vue(), vueJsx(), vueDevTools()],

    build: {
      manifest: true,
      outDir: resolve(__dirname, '../staticfiles'),
      // Keep non-Vite static assets (e.g. Django/admin/docs) intact.
      emptyOutDir: false,
      target: 'esnext',
      commonjsOptions: {
        transformMixedEsModules: true
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          format: 'es'
        },
        external: ['fsevents', 'LabelStudio']
      }
    },

    esbuild: {
      target: 'esnext'
    },

    server: {
      cors: true,
      host: '127.0.0.1',
      port: 5173,
      hmr: { host: '127.0.0.1' },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        },
        '/static': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        },
        '/admin': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      }
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/public/assets/scss/material-dashboard/_variables.scss";`
        }
      }
    }
})
