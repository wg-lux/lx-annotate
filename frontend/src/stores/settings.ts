// src/stores/settings.ts
import { defineStore } from 'pinia'

export type UseCaseKey = 'research' | 'clinical' | 'demo'
export type ThemeKey = 'light' | 'dark' | 'highContrast'

export interface UseCaseConfig {
  key: UseCaseKey
  label: string
  apiBaseUrl: string
  features: {
    showAdvancedPanels: boolean
    enableAnnotations: boolean
    enableAuditTrail: boolean
  }
}

const USE_CASES: Record<UseCaseKey, UseCaseConfig> = {
  research: {
    key: 'research',
    label: 'Research',
    apiBaseUrl: 'https://api.example.com/research',
    features: { showAdvancedPanels: true, enableAnnotations: true, enableAuditTrail: false },
  },
  clinical: {
    key: 'clinical',
    label: 'Clinical',
    apiBaseUrl: 'https://api.example.com/clinical',
    features: { showAdvancedPanels: false, enableAnnotations: true, enableAuditTrail: true },
  },
  demo: {
    key: 'demo',
    label: 'Demo',
    apiBaseUrl: 'https://api.example.com/demo',
    features: { showAdvancedPanels: false, enableAnnotations: false, enableAuditTrail: false },
  },
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    useCase: 'research' as UseCaseKey,
    theme: 'light' as ThemeKey,
  }),
  getters: {
    useCaseConfig: (s) => USE_CASES[s.useCase],
    features: (s) => USE_CASES[s.useCase].features,
    apiBaseUrl: (s) => USE_CASES[s.useCase].apiBaseUrl,
  },
  actions: {
    setUseCase(key: UseCaseKey) { this.useCase = key },
    setTheme(theme: ThemeKey) { this.theme = theme },
  },
})

// Simple persistence (no plugin needed)
export function initSettingsPersistence(pinia: any) {
  const store = useSettingsStore(pinia)
  const raw = localStorage.getItem('settings')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.useCase) store.useCase = parsed.useCase
      if (parsed.theme) store.theme = parsed.theme
    } catch {}
  }
  store.$subscribe((_mutation, state) => {
    localStorage.setItem('settings', JSON.stringify({ useCase: state.useCase, theme: state.theme }))
  })
}
