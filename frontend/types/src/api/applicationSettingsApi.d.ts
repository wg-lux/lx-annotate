export interface ApplicationSettingsRecord {
    id: number;
    centerId: number | null;
    centerKey?: string | null;
    centerName: string | null;
    processorId: number | null;
    processorName: string | null;
    annotatorName: string | null;
    reportTemplateName: string | null;
    aiDatasetId: number | null;
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
    aiDatasetId?: number | null;
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
export interface ApplicationVideoDimensionBackfillPayload {
    dryRun?: boolean;
    limit?: number | null;
}
export interface ApplicationVideoDimensionBackfillRun {
    runId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    dryRun: boolean;
    limit: number | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    result: {
        count: number;
        summary: Record<string, number>;
        items: Array<{
            videoId: number | null;
            status: string;
            sourceDimensions: number[];
            processedDimensions: number[];
            repaired: boolean;
            detail: string;
        }>;
    } | null;
    error: string | null;
    stdout: string;
}
export interface ApplicationAiDatasetExportPayload {
    datasetId?: number;
    aiDatasetName?: string;
    aiDatasetType?: string;
    centerKey?: string | null;
    allCenters?: boolean;
    onlyValidated?: boolean;
}
export interface ApplicationAiDatasetExportResult {
    success: boolean;
    artifactId: string;
    datasetId: number;
    datasetName: string;
    datasetType: string;
    outputPath: string;
    downloadUrl: string | null;
    sha256: string;
    byteSize: number;
    status: 'running' | 'completed' | 'failed';
    error?: string | null;
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
export declare function triggerApplicationVideoDimensionBackfill(payload: ApplicationVideoDimensionBackfillPayload): Promise<ApplicationVideoDimensionBackfillRun>;
export declare function fetchApplicationVideoDimensionBackfillRun(runId: string): Promise<ApplicationVideoDimensionBackfillRun>;
