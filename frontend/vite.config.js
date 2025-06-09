import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path'; // ← add dirname
// ---- make the CommonJS-style globals -------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// --------------------------------------------------------
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        base: mode === 'development' ? 'http://localhost:3000/' : './',
        plugins: [vue(), vueJsx(), vueDevTools()],
        build: {
            manifest: mode === 'production' ? 'manifest.json' : false,
            outDir: resolve(__dirname, '../static/dist'),
            target: 'esnext', // Ermöglicht Top-level await
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'src/main.ts'),
                },
                output: {
                    entryFileNames: '[name].js',
                    chunkFileNames: '[name].js',
                    assetFileNames: '[name].[ext]',
                    format: 'es', // ES-Module Format für moderne Features
                },
            },
        },
        esbuild: {
            target: 'esnext', // Unterstützt moderne JS-Features inklusive Top-level await
        },
        server: {
            cors: true,
            port: 8000,
            hmr: { host: 'localhost' },
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'), // one alias is enough
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
