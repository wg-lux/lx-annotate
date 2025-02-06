import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/static/' : '/static/',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  build: {
    outDir: 'frontend/dist',
    manifest: true,
    rollupOptions: {
      input: {
        main: 'src/main.ts',
      },
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
