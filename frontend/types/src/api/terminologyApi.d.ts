export type MedicalField = 'gastroenterology';
export type TerminologyBundleVersion = {
    moduleName: string;
    version: string;
    medicalField: MedicalField | null;
    inputDirs: string[];
    isActive: boolean;
};
export type TerminologyBundleListResponse = {
    registryPath: string;
    active: TerminologyBundleVersion | null;
    bundles: TerminologyBundleVersion[];
};
export type SelectTerminologyBundlePayload = {
    moduleName: string;
    version: string;
};
export type SelectTerminologyBundleResponse = {
    ok: boolean;
    active: TerminologyBundleVersion;
    counts: Record<string, number>;
};
export type ImportTerminologyBundleResponse = {
    ok: boolean;
    imported: TerminologyBundleVersion;
    registryPath: string;
    counts: Record<string, number>;
};
export declare const MEDICAL_FIELD_OPTIONS: Array<{
    value: MedicalField;
    label: string;
}>;
export declare function fetchTerminologyBundles(): Promise<TerminologyBundleListResponse>;
export declare function importTerminologyBundle(file: File): Promise<ImportTerminologyBundleResponse>;
export declare function selectTerminologyBundle(payload: SelectTerminologyBundlePayload): Promise<SelectTerminologyBundleResponse>;
