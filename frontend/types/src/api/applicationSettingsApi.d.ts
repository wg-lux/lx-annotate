export interface ApplicationSettingsRecord {
    id: number;
    centerId: number | null;
    centerKey?: string | null;
    centerName: string | null;
    processorId: number | null;
    processorName: string | null;
    annotatorName: string | null;
    reportTemplateName: string | null;
    aiDatasetName: string | null;
    aiDatasetType: string | null;
    updatedAt: string | null;
    backupStatus: {
        ready: boolean;
        missingPaths: string[];
        requiredPathCount: number;
        availablePathCount: number;
        sourceRoots: Array<{
            label: string;
            path: string;
            exists: boolean;
            fileCount: number;
        }>;
    };
}
export interface ApplicationSettingsUpdatePayload {
    centerId?: number | null;
    processorId?: number | null;
    annotatorName?: string | null;
    reportTemplateName?: string | null;
    aiDatasetName?: string | null;
    aiDatasetType?: string | null;
}
export interface NamedDropdownOption {
    id: number;
    name: string;
    centerKey?: string | null;
}
export interface ValueLabelOption {
    value: string;
    label: string;
}
export interface ApplicationSettingsDropdowns {
    centers: NamedDropdownOption[];
    processors: NamedDropdownOption[];
    annotators: ValueLabelOption[];
    reportTemplates: ValueLabelOption[];
    aiDatasets: Array<ValueLabelOption & {
        id: number;
        datasetType: string;
        aiModelType: string;
        isActive: boolean;
        nameCount: number;
    }>;
}
export interface ApplicationBackupPayload {
    targetPath: string;
}
export interface ApplicationBackupResult {
    targetRoot: string;
    copiedRoots: Array<{
        label: string;
        sourcePath: string;
        destinationPath: string;
        fileCount: number;
    }>;
}
export interface ApplicationAiDatasetExportPayload {
    aiDatasetName?: string;
    aiDatasetType?: string;
}
export interface ApplicationAiDatasetExportResult {
    success: boolean;
    datasetId: number;
    datasetName: string;
    datasetType: string;
    outputPath: string;
    summary: {
        imageAnnotationCount?: number;
        videoAnnotationCount?: number;
        frameCount?: number;
        videoCount?: number;
        labelCount?: number;
    };
}
export declare function fetchApplicationSettings(): Promise<ApplicationSettingsRecord>;
export declare function updateApplicationSettings(payload: ApplicationSettingsUpdatePayload): Promise<ApplicationSettingsRecord>;
export declare function fetchApplicationSettingsDropdowns(): Promise<ApplicationSettingsDropdowns>;
export declare function triggerApplicationBackup(payload: ApplicationBackupPayload): Promise<ApplicationBackupResult>;
export declare function triggerApplicationAiDatasetExport(payload: ApplicationAiDatasetExportPayload): Promise<ApplicationAiDatasetExportResult>;
