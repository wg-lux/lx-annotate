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
export declare const useAnnotationStore: import("pinia").StoreDefinition<"annotation", Pick<{
    annotations: readonly {
        readonly id: string;
        readonly videoId: string;
        readonly startTime: number;
        readonly endTime: number;
        readonly type: AnnotationType;
        readonly text: string;
        readonly tags: readonly string[];
        readonly position?: {
            readonly x: number;
            readonly y: number;
            readonly width: number;
            readonly height: number;
        } | undefined;
        readonly createdAt: Date;
        readonly updatedAt: Date;
        readonly userId: string;
        readonly isPublic: boolean;
        readonly confidence?: number | undefined;
        readonly metadata?: {
            readonly [x: string]: any;
        } | undefined;
    }[];
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    selectedAnnotations: readonly string[];
    filter: {
        readonly videoId?: string | undefined;
        readonly type?: AnnotationType | undefined;
        readonly userId?: string | undefined;
        readonly tags?: readonly string[] | undefined;
        readonly timeRange?: {
            readonly start: number;
            readonly end: number;
        } | undefined;
        readonly isPublic?: boolean | undefined;
    };
    currentVideoId: import("vue").Ref<string | null, string | null>;
    playbackTime: import("vue").Ref<number, number>;
    isEditing: import("vue").Ref<boolean, boolean>;
    isDirty: import("vue").Ref<boolean, boolean>;
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
    hasSelection: import("vue").ComputedRef<boolean>;
    canDelete: import("vue").ComputedRef<boolean>;
    canEdit: import("vue").ComputedRef<boolean>;
    annotationCount: import("vue").ComputedRef<number>;
    loadAnnotations: (videoId?: string) => Promise<void>;
    createAnnotation: (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<any>;
    deleteAnnotation: (id: string) => Promise<void>;
    deleteSelectedAnnotations: () => Promise<void>;
    selectAnnotation: (id: string) => void;
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
    syncSegmentsFromVideoStore: (videoId: string) => void;
    createSegmentAnnotation: (videoId: string, segment: any, userId: string) => Promise<Annotation | null>;
    createExaminationAnnotation: (videoId: string, timestamp: number, examinationType: string, examinationId: number, userId: string) => Promise<Annotation | null>;
    linkSegmentAndAnnotation: (segment: any, userId: string) => Promise<Annotation | null>;
    validateSegmentsAndExaminations: (fileId: number) => Promise<boolean>;
    annotateSegmentsAndExaminations: (fileId: number) => Promise<boolean>;
}, "filter" | "isDirty" | "annotations" | "selectedAnnotations" | "isLoading" | "error" | "currentVideoId" | "playbackTime" | "isEditing">, Pick<{
    annotations: readonly {
        readonly id: string;
        readonly videoId: string;
        readonly startTime: number;
        readonly endTime: number;
        readonly type: AnnotationType;
        readonly text: string;
        readonly tags: readonly string[];
        readonly position?: {
            readonly x: number;
            readonly y: number;
            readonly width: number;
            readonly height: number;
        } | undefined;
        readonly createdAt: Date;
        readonly updatedAt: Date;
        readonly userId: string;
        readonly isPublic: boolean;
        readonly confidence?: number | undefined;
        readonly metadata?: {
            readonly [x: string]: any;
        } | undefined;
    }[];
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    selectedAnnotations: readonly string[];
    filter: {
        readonly videoId?: string | undefined;
        readonly type?: AnnotationType | undefined;
        readonly userId?: string | undefined;
        readonly tags?: readonly string[] | undefined;
        readonly timeRange?: {
            readonly start: number;
            readonly end: number;
        } | undefined;
        readonly isPublic?: boolean | undefined;
    };
    currentVideoId: import("vue").Ref<string | null, string | null>;
    playbackTime: import("vue").Ref<number, number>;
    isEditing: import("vue").Ref<boolean, boolean>;
    isDirty: import("vue").Ref<boolean, boolean>;
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
    hasSelection: import("vue").ComputedRef<boolean>;
    canDelete: import("vue").ComputedRef<boolean>;
    canEdit: import("vue").ComputedRef<boolean>;
    annotationCount: import("vue").ComputedRef<number>;
    loadAnnotations: (videoId?: string) => Promise<void>;
    createAnnotation: (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<any>;
    deleteAnnotation: (id: string) => Promise<void>;
    deleteSelectedAnnotations: () => Promise<void>;
    selectAnnotation: (id: string) => void;
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
    syncSegmentsFromVideoStore: (videoId: string) => void;
    createSegmentAnnotation: (videoId: string, segment: any, userId: string) => Promise<Annotation | null>;
    createExaminationAnnotation: (videoId: string, timestamp: number, examinationType: string, examinationId: number, userId: string) => Promise<Annotation | null>;
    linkSegmentAndAnnotation: (segment: any, userId: string) => Promise<Annotation | null>;
    validateSegmentsAndExaminations: (fileId: number) => Promise<boolean>;
    annotateSegmentsAndExaminations: (fileId: number) => Promise<boolean>;
}, "filteredAnnotations" | "hasSelection" | "canDelete" | "canEdit" | "annotationCount">, Pick<{
    annotations: readonly {
        readonly id: string;
        readonly videoId: string;
        readonly startTime: number;
        readonly endTime: number;
        readonly type: AnnotationType;
        readonly text: string;
        readonly tags: readonly string[];
        readonly position?: {
            readonly x: number;
            readonly y: number;
            readonly width: number;
            readonly height: number;
        } | undefined;
        readonly createdAt: Date;
        readonly updatedAt: Date;
        readonly userId: string;
        readonly isPublic: boolean;
        readonly confidence?: number | undefined;
        readonly metadata?: {
            readonly [x: string]: any;
        } | undefined;
    }[];
    isLoading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    selectedAnnotations: readonly string[];
    filter: {
        readonly videoId?: string | undefined;
        readonly type?: AnnotationType | undefined;
        readonly userId?: string | undefined;
        readonly tags?: readonly string[] | undefined;
        readonly timeRange?: {
            readonly start: number;
            readonly end: number;
        } | undefined;
        readonly isPublic?: boolean | undefined;
    };
    currentVideoId: import("vue").Ref<string | null, string | null>;
    playbackTime: import("vue").Ref<number, number>;
    isEditing: import("vue").Ref<boolean, boolean>;
    isDirty: import("vue").Ref<boolean, boolean>;
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
    hasSelection: import("vue").ComputedRef<boolean>;
    canDelete: import("vue").ComputedRef<boolean>;
    canEdit: import("vue").ComputedRef<boolean>;
    annotationCount: import("vue").ComputedRef<number>;
    loadAnnotations: (videoId?: string) => Promise<void>;
    createAnnotation: (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
    updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<any>;
    deleteAnnotation: (id: string) => Promise<void>;
    deleteSelectedAnnotations: () => Promise<void>;
    selectAnnotation: (id: string) => void;
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
    syncSegmentsFromVideoStore: (videoId: string) => void;
    createSegmentAnnotation: (videoId: string, segment: any, userId: string) => Promise<Annotation | null>;
    createExaminationAnnotation: (videoId: string, timestamp: number, examinationType: string, examinationId: number, userId: string) => Promise<Annotation | null>;
    linkSegmentAndAnnotation: (segment: any, userId: string) => Promise<Annotation | null>;
    validateSegmentsAndExaminations: (fileId: number) => Promise<boolean>;
    annotateSegmentsAndExaminations: (fileId: number) => Promise<boolean>;
}, "loadAnnotations" | "createAnnotation" | "updateAnnotation" | "deleteAnnotation" | "deleteSelectedAnnotations" | "selectAnnotation" | "selectAllAnnotations" | "clearSelection" | "setFilter" | "clearFilter" | "setCurrentVideoId" | "setPlaybackTime" | "startEditing" | "stopEditing" | "markDirty" | "seekToAnnotation" | "exportAnnotations" | "clearError" | "reset" | "syncSegmentsFromVideoStore" | "createSegmentAnnotation" | "createExaminationAnnotation" | "linkSegmentAndAnnotation" | "validateSegmentsAndExaminations" | "annotateSegmentsAndExaminations">>;
export declare function createDefaultAnnotation(videoId: string, type: AnnotationType, startTime: number, endTime: number, userId: string): Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;
export declare function validateAnnotation(annotation: Partial<Annotation>): string[];
