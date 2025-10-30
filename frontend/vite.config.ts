import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path' // ← add dirname

// ---- make the CommonJS-style globals -------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// --------------------------------------------------------

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: mode === 'development' ? 'http://localhost:3000/' : './',
    plugins: [vue(), vueJsx(), vueDevTools()],

    build: {
      manifest: mode === 'production' ? 'manifest.json' : false,
      outDir: resolve(__dirname, '../static/dist'),
      target: 'esnext', // Ermöglicht Top-level await
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          format: 'es' // ES-Module Format für moderne Features
        },
        external: ['fsevents'] // 👈 tell Rollup to skip this optional macOS dependency
      }
    },

    esbuild: {
      target: 'esnext' // Unterstützt moderne JS-Features inklusive Top-level await
    },

    server: {
      cors: true,
      port: 5173, // Ändere den Port, um Konflikte mit Django zu vermeiden
      hmr: { host: 'localhost' },
      proxy: {
        // Leite alle API-Requests an Django weiter
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false
        },
        // Zusätzliche Endpunkte falls nötig
        '/admin': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false
        },
        '/static': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false
        }
      }
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src') // one alias is enough
      }
    },

    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/public/assets/scss/material-dashboard/_variables.scss";`
        }
      }
    }
  }
})
