export interface Annotation {
    id: string;
    videoId: string;
    startTime: number;
    endTime: number;
    type: AnnotationType;
    text: string;
    tags: string[];
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    isPublic: boolean;
    confidence?: number;
    metadata?: Record<string, any>;
}
export declare enum AnnotationType {
    TEXT = "text",
    REGION = "region",
    POINT = "point",
    SEGMENT = "segment",
    CLASSIFICATION = "classification",
    DETECTION = "detection"
}
export interface AnnotationFilter {
    videoId?: string;
    type?: AnnotationType;
    userId?: string;
    tags?: string[];
    timeRange?: {
        start: number;
        end: number;
    };
    isPublic?: boolean;
}
export interface AnnotationState {
    annotations: Annotation[];
    currentAnnotation: Annotation | null;
    selectedAnnotations: string[];
    filter: AnnotationFilter;
    isLoading: boolean;
    error: string | null;
    currentVideoId: string | null;
    playbackTime: number;
    isEditing: boolean;
    isDirty: boolean;
}
export declare const useAnnotationStore: import("pinia").StoreDefinition<"annotation", import("pinia")._UnwrapAll<Pick<{
    filteredAnnotations: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    currentVideoAnnotations: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    annotationsAtCurrentTime: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    totalAnnotations: import("vue").ComputedRef<number>;
    selectedAnnotationObjects: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    loadAnnotations: (videoId?: string) => Promise<void>;
    createAnnotation: (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<any>;
    deleteAnnotation: (id: string) => Promise<void>;
    bulkDeleteAnnotations: (ids: string[]) => Promise<void>;
    setCurrentAnnotation: (annotation: Annotation | null) => void;
    selectAnnotation: (id: string) => void;
    deselectAnnotation: (id: string) => void;
    toggleAnnotationSelection: (id: string) => void;
    selectAllAnnotations: () => void;
    clearSelection: () => void;
    setFilter: (filter: Partial<AnnotationFilter>) => void;
    clearFilter: () => void;
    setCurrentVideoId: (videoId: string | null) => void;
    setPlaybackTime: (time: number) => void;
    startEditing: () => void;
    stopEditing: () => void;
    markDirty: () => void;
    seekToAnnotation: (annotation: Annotation) => void;
    exportAnnotations: (format?: 'json' | 'csv') => Promise<void>;
    clearError: () => void;
    reset: () => void;
    annotations: import("vue").Ref<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[], {
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    currentAnnotation: import("vue").Ref<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    } | null, {
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    } | null>;
    selectedAnnotations: import("vue").Ref<string[], string[]>;
    filter: import("vue").Ref<{
        videoId?: string | undefined;
        type?: AnnotationType | undefined;
        userId?: string | undefined;
        tags?: string[] | undefined;
        timeRange?: {
            start: number;
            end: number;
        } | undefined;
        isPublic?: boolean | undefined;
    }, {
        videoId?: string | undefined;
        type?: AnnotationType | undefined;
        userId?: string | undefined;
        tags?: string[] | undefined;
        timeRange?: {
            start: number;
            end: number;
        } | undefined;
        isPublic?: boolean | undefined;
    }>;
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    currentVideoId: import("vue").Ref<string | null, string | null>;
    playbackTime: import("vue").Ref<number, number>;
    isEditing: import("vue").Ref<boolean, boolean>;
    isDirty: import("vue").Ref<boolean, boolean>;
}, "isLoading" | "error" | "filter" | "annotations" | "currentAnnotation" | "selectedAnnotations" | "currentVideoId" | "playbackTime" | "isEditing" | "isDirty">>, Pick<{
    filteredAnnotations: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    currentVideoAnnotations: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    annotationsAtCurrentTime: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    totalAnnotations: import("vue").ComputedRef<number>;
    selectedAnnotationObjects: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    loadAnnotations: (videoId?: string) => Promise<void>;
    createAnnotation: (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<any>;
    deleteAnnotation: (id: string) => Promise<void>;
    bulkDeleteAnnotations: (ids: string[]) => Promise<void>;
    setCurrentAnnotation: (annotation: Annotation | null) => void;
    selectAnnotation: (id: string) => void;
    deselectAnnotation: (id: string) => void;
    toggleAnnotationSelection: (id: string) => void;
    selectAllAnnotations: () => void;
    clearSelection: () => void;
    setFilter: (filter: Partial<AnnotationFilter>) => void;
    clearFilter: () => void;
    setCurrentVideoId: (videoId: string | null) => void;
    setPlaybackTime: (time: number) => void;
    startEditing: () => void;
    stopEditing: () => void;
    markDirty: () => void;
    seekToAnnotation: (annotation: Annotation) => void;
    exportAnnotations: (format?: 'json' | 'csv') => Promise<void>;
    clearError: () => void;
    reset: () => void;
    annotations: import("vue").Ref<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[], {
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    currentAnnotation: import("vue").Ref<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    } | null, {
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    } | null>;
    selectedAnnotations: import("vue").Ref<string[], string[]>;
    filter: import("vue").Ref<{
        videoId?: string | undefined;
        type?: AnnotationType | undefined;
        userId?: string | undefined;
        tags?: string[] | undefined;
        timeRange?: {
            start: number;
            end: number;
        } | undefined;
        isPublic?: boolean | undefined;
    }, {
        videoId?: string | undefined;
        type?: AnnotationType | undefined;
        userId?: string | undefined;
        tags?: string[] | undefined;
        timeRange?: {
            start: number;
            end: number;
        } | undefined;
        isPublic?: boolean | undefined;
    }>;
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    currentVideoId: import("vue").Ref<string | null, string | null>;
    playbackTime: import("vue").Ref<number, number>;
    isEditing: import("vue").Ref<boolean, boolean>;
    isDirty: import("vue").Ref<boolean, boolean>;
}, "filteredAnnotations" | "currentVideoAnnotations" | "annotationsAtCurrentTime" | "totalAnnotations" | "selectedAnnotationObjects">, Pick<{
    filteredAnnotations: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    currentVideoAnnotations: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    annotationsAtCurrentTime: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    totalAnnotations: import("vue").ComputedRef<number>;
    selectedAnnotationObjects: import("vue").ComputedRef<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    loadAnnotations: (videoId?: string) => Promise<void>;
    createAnnotation: (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<any>;
    deleteAnnotation: (id: string) => Promise<void>;
    bulkDeleteAnnotations: (ids: string[]) => Promise<void>;
    setCurrentAnnotation: (annotation: Annotation | null) => void;
    selectAnnotation: (id: string) => void;
    deselectAnnotation: (id: string) => void;
    toggleAnnotationSelection: (id: string) => void;
    selectAllAnnotations: () => void;
    clearSelection: () => void;
    setFilter: (filter: Partial<AnnotationFilter>) => void;
    clearFilter: () => void;
    setCurrentVideoId: (videoId: string | null) => void;
    setPlaybackTime: (time: number) => void;
    startEditing: () => void;
    stopEditing: () => void;
    markDirty: () => void;
    seekToAnnotation: (annotation: Annotation) => void;
    exportAnnotations: (format?: 'json' | 'csv') => Promise<void>;
    clearError: () => void;
    reset: () => void;
    annotations: import("vue").Ref<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[], {
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    }[]>;
    currentAnnotation: import("vue").Ref<{
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    } | null, {
        id: string;
        videoId: string;
        startTime: number;
        endTime: number;
        type: AnnotationType;
        text: string;
        tags: string[];
        position?: {
            x: number;
            y: number;
            width: number;
            height: number;
        } | undefined;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isPublic: boolean;
        confidence?: number | undefined;
        metadata?: Record<string, any> | undefined;
    } | null>;
    selectedAnnotations: import("vue").Ref<string[], string[]>;
    filter: import("vue").Ref<{
        videoId?: string | undefined;
        type?: AnnotationType | undefined;
        userId?: string | undefined;
        tags?: string[] | undefined;
        timeRange?: {
            start: number;
            end: number;
        } | undefined;
        isPublic?: boolean | undefined;
    }, {
        videoId?: string | undefined;
        type?: AnnotationType | undefined;
        userId?: string | undefined;
        tags?: string[] | undefined;
        timeRange?: {
            start: number;
            end: number;
        } | undefined;
        isPublic?: boolean | undefined;
    }>;
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    currentVideoId: import("vue").Ref<string | null, string | null>;
    playbackTime: import("vue").Ref<number, number>;
    isEditing: import("vue").Ref<boolean, boolean>;
    isDirty: import("vue").Ref<boolean, boolean>;
}, "reset" | "clearError" | "loadAnnotations" | "createAnnotation" | "updateAnnotation" | "deleteAnnotation" | "bulkDeleteAnnotations" | "setCurrentAnnotation" | "selectAnnotation" | "deselectAnnotation" | "toggleAnnotationSelection" | "selectAllAnnotations" | "clearSelection" | "setFilter" | "clearFilter" | "setCurrentVideoId" | "setPlaybackTime" | "startEditing" | "stopEditing" | "markDirty" | "seekToAnnotation" | "exportAnnotations">>;
export declare function createDefaultAnnotation(videoId: string, type: AnnotationType, startTime: number, endTime: number, userId: string): Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;
export declare function validateAnnotation(annotation: Partial<Annotation>): string[];
