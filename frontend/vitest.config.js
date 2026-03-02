import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { resolve, dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default defineConfig({
    plugins: [vue(), vueJsx()],
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
        exclude: [
            '**/.direnv/**',
            '**/node_modules/**',
            '**/dist/**',
            '**/e2e/**',
            '**/types/**'
        ],
        root: fileURLToPath(new URL('./', import.meta.url)),
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        clearMocks: true,
        restoreMocks: true,
        mockReset: true
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
});
