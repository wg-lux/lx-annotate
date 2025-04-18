import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath } from 'node:url';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: mode === 'development' ? '/' : './',
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
    ],
    build: {
      manifest: mode === 'production' ? 'manifest.json' : false,      
      outDir: resolve(__dirname, '../static/dist'),
      emptyOutDir: true, // Explizit aktiviert
      rollupOptions: {
        input: {
          'main': resolve(__dirname, 'src/main.ts'),
        },      
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]'
        }
      },
    },
    server: {
      cors: true,
      port: 3000,
      hmr: {
        host: 'localhost',
      },
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    resolve: {
      alias: {
        'src': resolve(__dirname, 'src'),
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        'vue': 'vue/dist/vue.esm-bundler.js', // Fügt eine Alias-Auflösung für Vue hinzu
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/public/assets/scss/material-dashboard/_variables.scss";`,
        },
      },
    },
  };
});