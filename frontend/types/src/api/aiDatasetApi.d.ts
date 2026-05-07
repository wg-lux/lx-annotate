export interface AiDatasetOption {
    id: number;
    value: string;
    label: string;
    datasetType: string;
    aiModelType: string;
    isActive: boolean;
    nameCount: number;
}
export interface AiDatasetLabelOption {
    id: number;
    name: string;
}
export interface AiDatasetLabelSetOption {
    id: number;
    name: string;
    version: number;
    description?: string;
    labelCount: number;
    labels: AiDatasetLabelOption[];
}
export interface AiDatasetFrameBucketCount {
    bucket: 'positive' | 'negative' | 'unknown';
    frameCount: number;
}
export interface AiDatasetLabelDistributionEntry {
    labelId: number;
    labelName: string;
    framePositive: number;
    frameNegative: number;
    segmentCount: number;
    total: number;
}
export interface AiDatasetLabelFrameBucketCount {
    labelId: number;
    labelName: string;
    frameCount: number;
}
export interface AiDatasetFrameBucketDistribution {
    schemaVersion: string;
    datasetId: number;
    name: string | null;
    datasetType: string;
    aiModelType: string;
    isActive: boolean;
    updatedAt: string;
    labelGroupId: number | null;
    labelGroupName: string | null;
    targetLabelId: number | null;
    targetLabelName: string | null;
    predictionSegmentsOnly: boolean;
    summary: {
        imageAnnotationCount: number;
        videoAnnotationCount: number;
        annotationFrameCount: number;
        segmentFrameCount: number;
        mergedFrameCount: number;
        videoCount: number;
        labelCount: number;
    };
    targetBuckets: AiDatasetFrameBucketCount[];
    labelDistribution: AiDatasetLabelDistributionEntry[];
    annotationFrameBuckets: AiDatasetLabelFrameBucketCount[];
    segmentFrameBuckets: AiDatasetLabelFrameBucketCount[];
    mergedFrameBuckets: AiDatasetLabelFrameBucketCount[];
}
export interface AiDatasetFrameBucketDistributionParams {
    labelGroupId?: number | string | null;
    targetLabelId?: number | string | null;
    predictionSegmentsOnly?: boolean;
}
export declare function fetchAiDatasetOptions(): Promise<AiDatasetOption[]>;
export declare function fetchAiDatasetLabelSets(): Promise<AiDatasetLabelSetOption[]>;
export declare function fetchAiDatasetFrameBucketDistribution(datasetId: number | string, params?: AiDatasetFrameBucketDistributionParams): Promise<AiDatasetFrameBucketDistribution>;
