export type UseCaseKey = 'research' | 'clinical' | 'demo';
export type ThemeKey = 'light' | 'dark' | 'highContrast';
export interface UseCaseConfig {
    key: UseCaseKey;
    label: string;
    apiBaseUrl: string;
    features: {
        showAdvancedPanels: boolean;
        enableAnnotations: boolean;
        enableAuditTrail: boolean;
    };
}
export declare const useSettingsStore: import("pinia").StoreDefinition<"settings", {
    useCase: UseCaseKey;
    theme: ThemeKey;
}, {
    useCaseConfig: (s: {
        useCase: UseCaseKey;
        theme: ThemeKey;
    } & import("pinia").PiniaCustomStateProperties<{
        useCase: UseCaseKey;
        theme: ThemeKey;
    }>) => UseCaseConfig;
    features: (s: {
        useCase: UseCaseKey;
        theme: ThemeKey;
    } & import("pinia").PiniaCustomStateProperties<{
        useCase: UseCaseKey;
        theme: ThemeKey;
    }>) => {
        showAdvancedPanels: boolean;
        enableAnnotations: boolean;
        enableAuditTrail: boolean;
    };
    apiBaseUrl: (s: {
        useCase: UseCaseKey;
        theme: ThemeKey;
    } & import("pinia").PiniaCustomStateProperties<{
        useCase: UseCaseKey;
        theme: ThemeKey;
    }>) => string;
}, {
    setUseCase(key: UseCaseKey): void;
    setTheme(theme: ThemeKey): void;
}>;
export declare function initSettingsPersistence(pinia: any): void;
