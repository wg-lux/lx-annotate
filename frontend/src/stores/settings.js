// src/stores/settings.ts
import { defineStore } from 'pinia';
const USE_CASES = {
    research: {
        key: 'research',
        label: 'Research',
        apiBaseUrl: 'https://api.example.com/research',
        features: { showAdvancedPanels: true, enableAnnotations: true, enableAuditTrail: false }
    },
    clinical: {
        key: 'clinical',
        label: 'Clinical',
        apiBaseUrl: 'https://api.example.com/clinical',
        features: { showAdvancedPanels: false, enableAnnotations: true, enableAuditTrail: true }
    },
    demo: {
        key: 'demo',
        label: 'Demo',
        apiBaseUrl: 'https://api.example.com/demo',
        features: { showAdvancedPanels: false, enableAnnotations: false, enableAuditTrail: false }
    }
};
export const useSettingsStore = defineStore('settings', {
    state: () => ({
        useCase: 'research',
        theme: 'light'
    }),
    getters: {
        useCaseConfig: (s) => USE_CASES[s.useCase],
        features: (s) => USE_CASES[s.useCase].features,
        apiBaseUrl: (s) => USE_CASES[s.useCase].apiBaseUrl
    },
    actions: {
        setUseCase(key) {
            this.useCase = key;
        },
        setTheme(theme) {
            this.theme = theme;
        }
    }
});
// Simple persistence (no plugin needed)
export function initSettingsPersistence(pinia) {
    const store = useSettingsStore(pinia);
    const raw = localStorage.getItem('settings');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.useCase)
                store.useCase = parsed.useCase;
            if (parsed.theme)
                store.theme = parsed.theme;
        }
        catch { }
    }
    store.$subscribe((_mutation, state) => {
        localStorage.setItem('settings', JSON.stringify({ useCase: state.useCase, theme: state.theme }));
    });
}
