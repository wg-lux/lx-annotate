import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath } from 'node:url';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  build: {
    manifest: "manifest.json",
    // Ensure the outDir is where Django collects static files
    outDir: resolve(__dirname, '../static/dist'),
    rollupOptions: {
      // Adjust the entry point as needed (e.g., main.ts)
      input: {
        'main.js': resolve(__dirname, 'src/main.ts'),
            },      
      output: {
        // Override filename pattern for a stable name without a hash
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    // Optionally, if you really want to empty outDir (be cautious)
    // emptyOutDir: true,
  },
  server: {
    cors: true,
    port: 3000,
    hmr: {
      host: 'localhost',
    },
  },
  resolve: {
    alias: {
      // Merged alias definitions:
      'src': resolve(__dirname, 'src'),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/public/assets/scss/material-dashboard/_variables.scss";`,
      },
    },
  },
});
