export type AnnotationTaskMode = 'random' | 'filtered';
export type AnnotationSamplingStrategy = 'balanced' | 'segments' | 'annotations' | 'none';
export interface AnnotationTask {
    id: string;
    data: {
        frameId: number;
        videoId?: number;
        frameNumber?: number;
        relativePath?: string;
        imageUrl: string;
        existingExternalId?: string;
        annotationMode?: string;
        datasetSelectionLabelId?: number;
        datasetSelectionLabelName?: string;
        datasetSelectionSource?: string;
        datasetBucket?: string;
        labelOptions?: Array<{
            id: number;
            name: string;
        }>;
        manualAnnotations?: Array<{
            id?: number;
            labelId: number;
            labelName: string;
            value: boolean;
            floatValue?: number | null;
            externalAnnotationId?: string | null;
        }>;
        predictionAnnotations?: Array<{
            id?: number;
            labelId: number;
            labelName: string;
            value: boolean;
            floatValue?: number | null;
            modelMetaId?: number | null;
        }>;
        suggestedLabelIds?: number[];
    };
}
export declare const useAnnotationQueueStore: import("pinia").StoreDefinition<"annotationQueue", Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
    taskMode: import("vue").Ref<AnnotationTaskMode, AnnotationTaskMode>;
    targetLabelName: import("vue").Ref<string, string>;
    filterLabelName: import("vue").Ref<string | null, string | null>;
    allowRandomFallback: import("vue").Ref<boolean, boolean>;
    informationSource: import("vue").Ref<string, string>;
    samplingStrategy: import("vue").Ref<AnnotationSamplingStrategy, AnnotationSamplingStrategy>;
    predictionSegmentsOnly: import("vue").Ref<boolean, boolean>;
    aiDatasetId: import("vue").Ref<string | null, string | null>;
    aiDatasetName: import("vue").Ref<string | null, string | null>;
    aiDatasetType: import("vue").Ref<string | null, string | null>;
    annotatorPrincipal: import("vue").Ref<string | null, string | null>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            videoId?: number | undefined;
            frameNumber?: number | undefined;
            relativePath?: string | undefined;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
            datasetSelectionLabelId?: number | undefined;
            datasetSelectionLabelName?: string | undefined;
            datasetSelectionSource?: string | undefined;
            datasetBucket?: string | undefined;
            labelOptions?: {
                id: number;
                name: string;
            }[] | undefined;
            manualAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                externalAnnotationId?: string | null | undefined;
            }[] | undefined;
            predictionAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                modelMetaId?: number | null | undefined;
            }[] | undefined;
            suggestedLabelIds?: number[] | undefined;
        };
    }[], AnnotationTask[] | {
        id: string;
        data: {
            frameId: number;
            videoId?: number | undefined;
            frameNumber?: number | undefined;
            relativePath?: string | undefined;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
            datasetSelectionLabelId?: number | undefined;
            datasetSelectionLabelName?: string | undefined;
            datasetSelectionSource?: string | undefined;
            datasetBucket?: string | undefined;
            labelOptions?: {
                id: number;
                name: string;
            }[] | undefined;
            manualAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                externalAnnotationId?: string | null | undefined;
            }[] | undefined;
            predictionAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                modelMetaId?: number | null | undefined;
            }[] | undefined;
            suggestedLabelIds?: number[] | undefined;
        };
    }[]>;
    isInitialLoading: import("vue").Ref<boolean, boolean>;
    isPrefetching: import("vue").Ref<boolean, boolean>;
    lastError: import("vue").Ref<string | null, string | null>;
    setSelectedLabelGroupId: (groupId: string | null) => void;
    setTaskMode: (mode: AnnotationTaskMode) => void;
    setTargetLabelName: (label: string | null) => void;
    setFilterLabelName: (label: string | null) => void;
    setAllowRandomFallback: (enabled: boolean) => void;
    setInformationSource: (source: string | null) => void;
    setSamplingStrategy: (strategy: string | null) => void;
    setPredictionSegmentsOnly: (enabled: boolean) => void;
    setAiDataset: (datasetName: string | null, datasetType: string | null, datasetId?: number | string | null) => void;
    setAnnotatorPrincipal: (principal: string | null) => void;
    hydrateAiDatasetDefaults: () => Promise<void>;
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "informationSource" | "selectedLabelGroupId" | "taskMode" | "targetLabelName" | "filterLabelName" | "allowRandomFallback" | "samplingStrategy" | "predictionSegmentsOnly" | "aiDatasetId" | "aiDatasetName" | "aiDatasetType" | "annotatorPrincipal" | "taskQueue" | "isInitialLoading" | "isPrefetching" | "lastError">, Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
    taskMode: import("vue").Ref<AnnotationTaskMode, AnnotationTaskMode>;
    targetLabelName: import("vue").Ref<string, string>;
    filterLabelName: import("vue").Ref<string | null, string | null>;
    allowRandomFallback: import("vue").Ref<boolean, boolean>;
    informationSource: import("vue").Ref<string, string>;
    samplingStrategy: import("vue").Ref<AnnotationSamplingStrategy, AnnotationSamplingStrategy>;
    predictionSegmentsOnly: import("vue").Ref<boolean, boolean>;
    aiDatasetId: import("vue").Ref<string | null, string | null>;
    aiDatasetName: import("vue").Ref<string | null, string | null>;
    aiDatasetType: import("vue").Ref<string | null, string | null>;
    annotatorPrincipal: import("vue").Ref<string | null, string | null>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            videoId?: number | undefined;
            frameNumber?: number | undefined;
            relativePath?: string | undefined;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
            datasetSelectionLabelId?: number | undefined;
            datasetSelectionLabelName?: string | undefined;
            datasetSelectionSource?: string | undefined;
            datasetBucket?: string | undefined;
            labelOptions?: {
                id: number;
                name: string;
            }[] | undefined;
            manualAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                externalAnnotationId?: string | null | undefined;
            }[] | undefined;
            predictionAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                modelMetaId?: number | null | undefined;
            }[] | undefined;
            suggestedLabelIds?: number[] | undefined;
        };
    }[], AnnotationTask[] | {
        id: string;
        data: {
            frameId: number;
            videoId?: number | undefined;
            frameNumber?: number | undefined;
            relativePath?: string | undefined;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
            datasetSelectionLabelId?: number | undefined;
            datasetSelectionLabelName?: string | undefined;
            datasetSelectionSource?: string | undefined;
            datasetBucket?: string | undefined;
            labelOptions?: {
                id: number;
                name: string;
            }[] | undefined;
            manualAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                externalAnnotationId?: string | null | undefined;
            }[] | undefined;
            predictionAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                modelMetaId?: number | null | undefined;
            }[] | undefined;
            suggestedLabelIds?: number[] | undefined;
        };
    }[]>;
    isInitialLoading: import("vue").Ref<boolean, boolean>;
    isPrefetching: import("vue").Ref<boolean, boolean>;
    lastError: import("vue").Ref<string | null, string | null>;
    setSelectedLabelGroupId: (groupId: string | null) => void;
    setTaskMode: (mode: AnnotationTaskMode) => void;
    setTargetLabelName: (label: string | null) => void;
    setFilterLabelName: (label: string | null) => void;
    setAllowRandomFallback: (enabled: boolean) => void;
    setInformationSource: (source: string | null) => void;
    setSamplingStrategy: (strategy: string | null) => void;
    setPredictionSegmentsOnly: (enabled: boolean) => void;
    setAiDataset: (datasetName: string | null, datasetType: string | null, datasetId?: number | string | null) => void;
    setAnnotatorPrincipal: (principal: string | null) => void;
    hydrateAiDatasetDefaults: () => Promise<void>;
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "taskQuerySignature">, Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
    taskMode: import("vue").Ref<AnnotationTaskMode, AnnotationTaskMode>;
    targetLabelName: import("vue").Ref<string, string>;
    filterLabelName: import("vue").Ref<string | null, string | null>;
    allowRandomFallback: import("vue").Ref<boolean, boolean>;
    informationSource: import("vue").Ref<string, string>;
    samplingStrategy: import("vue").Ref<AnnotationSamplingStrategy, AnnotationSamplingStrategy>;
    predictionSegmentsOnly: import("vue").Ref<boolean, boolean>;
    aiDatasetId: import("vue").Ref<string | null, string | null>;
    aiDatasetName: import("vue").Ref<string | null, string | null>;
    aiDatasetType: import("vue").Ref<string | null, string | null>;
    annotatorPrincipal: import("vue").Ref<string | null, string | null>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            videoId?: number | undefined;
            frameNumber?: number | undefined;
            relativePath?: string | undefined;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
            datasetSelectionLabelId?: number | undefined;
            datasetSelectionLabelName?: string | undefined;
            datasetSelectionSource?: string | undefined;
            datasetBucket?: string | undefined;
            labelOptions?: {
                id: number;
                name: string;
            }[] | undefined;
            manualAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                externalAnnotationId?: string | null | undefined;
            }[] | undefined;
            predictionAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                modelMetaId?: number | null | undefined;
            }[] | undefined;
            suggestedLabelIds?: number[] | undefined;
        };
    }[], AnnotationTask[] | {
        id: string;
        data: {
            frameId: number;
            videoId?: number | undefined;
            frameNumber?: number | undefined;
            relativePath?: string | undefined;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
            datasetSelectionLabelId?: number | undefined;
            datasetSelectionLabelName?: string | undefined;
            datasetSelectionSource?: string | undefined;
            datasetBucket?: string | undefined;
            labelOptions?: {
                id: number;
                name: string;
            }[] | undefined;
            manualAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                externalAnnotationId?: string | null | undefined;
            }[] | undefined;
            predictionAnnotations?: {
                id?: number | undefined;
                labelId: number;
                labelName: string;
                value: boolean;
                floatValue?: number | null | undefined;
                modelMetaId?: number | null | undefined;
            }[] | undefined;
            suggestedLabelIds?: number[] | undefined;
        };
    }[]>;
    isInitialLoading: import("vue").Ref<boolean, boolean>;
    isPrefetching: import("vue").Ref<boolean, boolean>;
    lastError: import("vue").Ref<string | null, string | null>;
    setSelectedLabelGroupId: (groupId: string | null) => void;
    setTaskMode: (mode: AnnotationTaskMode) => void;
    setTargetLabelName: (label: string | null) => void;
    setFilterLabelName: (label: string | null) => void;
    setAllowRandomFallback: (enabled: boolean) => void;
    setInformationSource: (source: string | null) => void;
    setSamplingStrategy: (strategy: string | null) => void;
    setPredictionSegmentsOnly: (enabled: boolean) => void;
    setAiDataset: (datasetName: string | null, datasetType: string | null, datasetId?: number | string | null) => void;
    setAnnotatorPrincipal: (principal: string | null) => void;
    hydrateAiDatasetDefaults: () => Promise<void>;
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "setSelectedLabelGroupId" | "setTaskMode" | "setTargetLabelName" | "setFilterLabelName" | "setAllowRandomFallback" | "setInformationSource" | "setSamplingStrategy" | "setPredictionSegmentsOnly" | "setAiDataset" | "setAnnotatorPrincipal" | "hydrateAiDatasetDefaults" | "fetchBatch" | "prefetchIfNeeded" | "popNextTask" | "clearQueue" | "primeQueue">>;
