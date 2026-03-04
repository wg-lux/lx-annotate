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
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "selectedLabelGroupId" | "taskQueue" | "isInitialLoading" | "isPrefetching" | "lastError">, Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
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
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, never>, Pick<{
    selectedLabelGroupId: import("vue").Ref<string | null, string | null>;
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
    fetchBatch: (batchSize?: number) => Promise<AnnotationTask[]>;
    prefetchIfNeeded: () => Promise<void>;
    popNextTask: () => AnnotationTask | undefined;
    clearQueue: () => void;
    primeQueue: (batchSize?: number) => Promise<void>;
}, "setSelectedLabelGroupId" | "fetchBatch" | "prefetchIfNeeded" | "popNextTask" | "clearQueue" | "primeQueue">>;
