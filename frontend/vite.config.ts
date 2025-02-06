import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath } from 'node:url';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/static/' : '/',
  server: {
    cors: true,
  },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  build: {
    manifest: "manifest.json",
    // Make sure the outDir is a folder that Django will collect from (see your STATICFILES_DIRS)
    outDir: resolve("./assets"),
    rollupOptions: {
      input: {
        // Use a key that matches what you reference in Django
        'main': './src/main.ts',
      },
      output: {
        // Override the default filename pattern to produce a stable name without a hash.
        // This will output a file named "main.ts.js"
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/scss/material-dashboard/_variables.scss";`,
      },
    },
  },
});
