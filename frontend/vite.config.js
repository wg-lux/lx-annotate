import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import vueDevTools from 'vite-plugin-vue-devtools';
import { fileURLToPath } from 'node:url';
import { resolve } from 'path';
export default defineConfig(({ mode }) => {
    // Lade alle Umgebungsvariablen basierend auf dem aktuellen Modus
    const env = loadEnv(mode, process.cwd(), '');
    return {
        base: '/',
        plugins: [
            vue(),
            vueJsx(),
            vueDevTools(),
        ],
        build: {
            target: 'es6', // Enable modern features like top-level await
            manifest: "manifest.json",
            outDir: resolve(__dirname, '../static/dist'),
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
            //port: 5174,
            port: 3000,
            hmr: {
                host: 'localhost',
            },
            proxy: {
                "/api": {
                    target: env.VITE_API_URL,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, '')
                }
            }
        },
        resolve: {
            alias: {
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
    };
});
