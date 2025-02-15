import { fileURLToPath } from 'node:url'
import { mergeConfig } from 'vite'
import { defineConfig, configDefaults } from 'vitest/config.js'

import type { UserConfig } from 'vite'
import baseViteConfig from './vite.config'

const viteConfig = baseViteConfig as UserConfig;

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
