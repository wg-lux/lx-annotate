import { type MedicalField, type TerminologyBundleVersion } from '@/api/terminologyApi';
declare function bundleKey(bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>): string;
export declare const useTerminologyStore: import("pinia").StoreDefinition<"terminology", Pick<{
    bundles: import("vue").Ref<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[], TerminologyBundleVersion[] | {
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[]>;
    activeBundle: import("vue").Ref<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    } | null, TerminologyBundleVersion | {
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    } | null>;
    registryPath: import("vue").Ref<string, string>;
    loading: import("vue").Ref<boolean, boolean>;
    selecting: import("vue").Ref<boolean, boolean>;
    importing: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    selectedMedicalField: import("vue").Ref<"gastroenterology", "gastroenterology">;
    lastSelectionCounts: import("vue").Ref<Record<string, number> | null, Record<string, number> | null>;
    activeModuleName: import("vue").ComputedRef<string>;
    activeBundleKey: import("vue").ComputedRef<string>;
    activeBundleLabel: import("vue").ComputedRef<string>;
    filteredBundles: import("vue").ComputedRef<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[]>;
    medicalFieldLabel: import("vue").ComputedRef<string>;
    medicalFieldOptions: {
        value: "gastroenterology";
        label: string;
    }[];
    bundleKey: typeof bundleKey;
    findBundleByKey: (key: string) => TerminologyBundleVersion | null;
    importBundle: (file: File) => Promise<import("@/api/terminologyApi").ImportTerminologyBundleResponse>;
    loadBundles: () => Promise<void>;
    selectBundle: (bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) => Promise<import("@/api/terminologyApi").SelectTerminologyBundleResponse>;
    setMedicalField: (value: MedicalField) => void;
}, "error" | "loading" | "bundles" | "activeBundle" | "registryPath" | "selecting" | "importing" | "selectedMedicalField" | "lastSelectionCounts" | "medicalFieldOptions">, Pick<{
    bundles: import("vue").Ref<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[], TerminologyBundleVersion[] | {
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[]>;
    activeBundle: import("vue").Ref<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    } | null, TerminologyBundleVersion | {
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    } | null>;
    registryPath: import("vue").Ref<string, string>;
    loading: import("vue").Ref<boolean, boolean>;
    selecting: import("vue").Ref<boolean, boolean>;
    importing: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    selectedMedicalField: import("vue").Ref<"gastroenterology", "gastroenterology">;
    lastSelectionCounts: import("vue").Ref<Record<string, number> | null, Record<string, number> | null>;
    activeModuleName: import("vue").ComputedRef<string>;
    activeBundleKey: import("vue").ComputedRef<string>;
    activeBundleLabel: import("vue").ComputedRef<string>;
    filteredBundles: import("vue").ComputedRef<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[]>;
    medicalFieldLabel: import("vue").ComputedRef<string>;
    medicalFieldOptions: {
        value: "gastroenterology";
        label: string;
    }[];
    bundleKey: typeof bundleKey;
    findBundleByKey: (key: string) => TerminologyBundleVersion | null;
    importBundle: (file: File) => Promise<import("@/api/terminologyApi").ImportTerminologyBundleResponse>;
    loadBundles: () => Promise<void>;
    selectBundle: (bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) => Promise<import("@/api/terminologyApi").SelectTerminologyBundleResponse>;
    setMedicalField: (value: MedicalField) => void;
}, "activeModuleName" | "activeBundleKey" | "activeBundleLabel" | "filteredBundles" | "medicalFieldLabel">, Pick<{
    bundles: import("vue").Ref<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[], TerminologyBundleVersion[] | {
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[]>;
    activeBundle: import("vue").Ref<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    } | null, TerminologyBundleVersion | {
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    } | null>;
    registryPath: import("vue").Ref<string, string>;
    loading: import("vue").Ref<boolean, boolean>;
    selecting: import("vue").Ref<boolean, boolean>;
    importing: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    selectedMedicalField: import("vue").Ref<"gastroenterology", "gastroenterology">;
    lastSelectionCounts: import("vue").Ref<Record<string, number> | null, Record<string, number> | null>;
    activeModuleName: import("vue").ComputedRef<string>;
    activeBundleKey: import("vue").ComputedRef<string>;
    activeBundleLabel: import("vue").ComputedRef<string>;
    filteredBundles: import("vue").ComputedRef<{
        moduleName: string;
        version: string;
        medicalField: "gastroenterology" | null;
        inputDirs: string[];
        isActive: boolean;
    }[]>;
    medicalFieldLabel: import("vue").ComputedRef<string>;
    medicalFieldOptions: {
        value: "gastroenterology";
        label: string;
    }[];
    bundleKey: typeof bundleKey;
    findBundleByKey: (key: string) => TerminologyBundleVersion | null;
    importBundle: (file: File) => Promise<import("@/api/terminologyApi").ImportTerminologyBundleResponse>;
    loadBundles: () => Promise<void>;
    selectBundle: (bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) => Promise<import("@/api/terminologyApi").SelectTerminologyBundleResponse>;
    setMedicalField: (value: MedicalField) => void;
}, "bundleKey" | "findBundleByKey" | "importBundle" | "loadBundles" | "selectBundle" | "setMedicalField">>;
export {};
