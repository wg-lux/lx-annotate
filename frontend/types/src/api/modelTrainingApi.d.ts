export interface ModelTrainingDatasetOption {
    id: number;
    value: string;
    label: string;
    datasetType: string;
    aiModelType: string;
    isActive: boolean;
    nameCount: number;
}
export interface ModelTrainingOption {
    value: string;
    label: string;
    description: string;
}
export type AnnotationSourceScope = 'all' | 'frame_only' | 'segment_only';
export interface PhiRegionDetectorTrainingDefaults {
    baseModel: string;
    datasetYaml: string;
    outputDir: string;
    runName: string;
    epochs: number;
    batchSize: number;
    inputSize: number;
    device: string;
    workers: number;
    patience: number;
    exportOnnx: boolean;
    confidenceThreshold: number;
    nmsThreshold: number;
    classIds: string;
}
export interface ModelTrainingOptionsResponse {
    trainingTargets: ModelTrainingOption[];
    aiDatasets: ModelTrainingDatasetOption[];
    backbones: ModelTrainingOption[];
    featureModes: ModelTrainingOption[];
    phiRegionDetector: {
        baseModels: ModelTrainingOption[];
        defaults: PhiRegionDetectorTrainingDefaults;
    };
    defaults: {
        epochs: number;
        batchSize: number;
        labelsetVersion: number;
        backboneName: string;
        featureMode: string;
        treatUnlabeledAsNegative: boolean;
        backboneCheckpoint: string | null;
    };
}
export interface ModelTrainingRunPayload {
    trainingTarget?: 'image_multilabel' | 'phi_region_detector';
    annotationSourceScope?: AnnotationSourceScope;
    datasetId?: number;
    datasetYaml?: string;
    outputDir?: string;
    baseModel?: string;
    runName?: string | null;
    backboneName?: string;
    featureMode?: string;
    epochs: number;
    batchSize: number;
    inputSize?: number;
    device?: string;
    workers?: number;
    patience?: number;
    exportOnnx?: boolean;
    confidenceThreshold?: number;
    nmsThreshold?: number;
    classIds?: string;
    labelsetVersion?: number;
    treatUnlabeledAsNegative?: boolean;
    backboneCheckpoint?: string | null;
}
export interface ModelTrainingRunRecord {
    runId: string;
    trainingTarget?: 'image_multilabel' | 'phi_region_detector';
    annotationSourceScope?: AnnotationSourceScope | null;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'lost';
    datasetId: number | null;
    datasetName: string | null;
    datasetType?: string;
    aiModelType?: string;
    backboneName: string;
    featureMode: string;
    freezeBackbone: boolean;
    epochs: number;
    batchSize: number;
    labelsetVersion: number;
    treatUnlabeledAsNegative: boolean;
    backboneCheckpoint: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    result: {
        modelPath?: string;
        metaPath?: string;
        history?: {
            trainLoss?: number[];
            valLoss?: number[];
            testLoss?: number | null;
        };
    } | null;
    artifactPaths?: Record<string, string>;
    error: string | null;
    stdout: string;
    stderr?: string;
}
export declare function fetchModelTrainingOptions(): Promise<ModelTrainingOptionsResponse>;
export declare function createModelTrainingRun(payload: ModelTrainingRunPayload): Promise<ModelTrainingRunRecord>;
export declare function fetchModelTrainingRuns(): Promise<ModelTrainingRunRecord[]>;
export declare function fetchModelTrainingRun(runId: string): Promise<ModelTrainingRunRecord>;
