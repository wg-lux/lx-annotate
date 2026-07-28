import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs
} from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

configureVueProject({
  scriptLangs: ['ts', 'js']
})

export default defineConfigWithVueTs(
  {
    ignores: [
      'coverage/**',
      'dist/**',
      '.vite/**',
      'lx-annotate/**',
      'tools/**',
      '**/*.d.ts',
      'src/**/*.js'
    ]
  },
  js.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    files: ['**/*.{ts,vue}'],
    rules: {
      complexity: ['warn', 25],
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: globals.browser
    }
  },
  {
    files: [
      'src/**/__tests__/**/*.ts',
      'src/**/*.{test,spec}.ts',
      'tests/**/*.ts'
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        vi: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['cypress/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.mocha,
        cy: 'readonly',
        Cypress: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['*.config.ts', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.ts'],
    languageOptions: {
      globals: globals.node
    }
  },
  skipFormatting
)
