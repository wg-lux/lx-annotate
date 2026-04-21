export type AnnotationTaskMode = 'random' | 'filtered';
export interface AnnotationTask {
    id: string;
    data: {
        frameId: number;
        imageUrl: string;
        existingExternalId?: string;
        annotationMode?: string;
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
    aiDatasetName: import("vue").Ref<string | null, string | null>;
    aiDatasetType: import("vue").Ref<string | null, string | null>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
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
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
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
    hydrateAiDatasetDefaults: () => Promise<void>;
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "informationSource" | "selectedLabelGroupId" | "taskMode" | "targetLabelName" | "filterLabelName" | "allowRandomFallback" | "aiDatasetName" | "aiDatasetType" | "taskQueue" | "isInitialLoading" | "isPrefetching" | "lastError">, Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
    taskMode: import("vue").Ref<AnnotationTaskMode, AnnotationTaskMode>;
    targetLabelName: import("vue").Ref<string, string>;
    filterLabelName: import("vue").Ref<string | null, string | null>;
    allowRandomFallback: import("vue").Ref<boolean, boolean>;
    informationSource: import("vue").Ref<string, string>;
    aiDatasetName: import("vue").Ref<string | null, string | null>;
    aiDatasetType: import("vue").Ref<string | null, string | null>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
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
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
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
    aiDatasetName: import("vue").Ref<string | null, string | null>;
    aiDatasetType: import("vue").Ref<string | null, string | null>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
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
            imageUrl: string;
            existingExternalId?: string | undefined;
            annotationMode?: string | undefined;
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
    hydrateAiDatasetDefaults: () => Promise<void>;
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "setSelectedLabelGroupId" | "setTaskMode" | "setTargetLabelName" | "setFilterLabelName" | "setAllowRandomFallback" | "setInformationSource" | "hydrateAiDatasetDefaults" | "fetchBatch" | "prefetchIfNeeded" | "popNextTask" | "clearQueue" | "primeQueue">>;
