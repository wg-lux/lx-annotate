export type AnnotationTaskMode = 'random' | 'filtered';
export interface AnnotationTask {
    id: string;
    data: {
        frameId: number;
        imageUrl: string;
        existingExternalId?: string;
    };
}
export declare const useAnnotationQueueStore: import("pinia").StoreDefinition<"annotationQueue", Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
    taskMode: import("vue").Ref<AnnotationTaskMode, AnnotationTaskMode>;
    targetLabelName: import("vue").Ref<string, string>;
    filterLabelName: import("vue").Ref<string | null, string | null>;
    allowRandomFallback: import("vue").Ref<boolean, boolean>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
        };
    }[], AnnotationTask[] | {
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
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
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "selectedLabelGroupId" | "taskMode" | "targetLabelName" | "filterLabelName" | "allowRandomFallback" | "taskQueue" | "isInitialLoading" | "isPrefetching" | "lastError">, Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
    taskMode: import("vue").Ref<AnnotationTaskMode, AnnotationTaskMode>;
    targetLabelName: import("vue").Ref<string, string>;
    filterLabelName: import("vue").Ref<string | null, string | null>;
    allowRandomFallback: import("vue").Ref<boolean, boolean>;
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
        };
    }[], AnnotationTask[] | {
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
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
    taskQuerySignature: import("vue").ComputedRef<string>;
    taskQueue: import("vue").Ref<{
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
        };
    }[], AnnotationTask[] | {
        id: string;
        data: {
            frameId: number;
            imageUrl: string;
            existingExternalId?: string | undefined;
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
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "setSelectedLabelGroupId" | "setTaskMode" | "setTargetLabelName" | "setFilterLabelName" | "setAllowRandomFallback" | "fetchBatch" | "prefetchIfNeeded" | "popNextTask" | "clearQueue" | "primeQueue">>;
