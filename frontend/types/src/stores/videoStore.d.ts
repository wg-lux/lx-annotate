import { type Ref, type ComputedRef } from 'vue';
import { buildVideoStreamUrl } from '@/utils/mediaUrls';
import { getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils';
/**
 * Translation map for label names (German translations)
 */
export interface Video {
    id: number;
    center_key?: string;
    center_name?: string;
    processor_name?: string;
    original_file_name?: string;
    status?: string;
    video_url?: string;
    exportSegmentsByVideo?: boolean;
    frameCount?: number;
    [key: string]: any;
}
export type LabelKey = 'appendix' | 'blood' | 'diverticule' | 'grasper' | 'ileocaecalvalve' | 'ileum' | 'low_quality' | 'nbi' | 'needle' | 'outside' | 'polyp' | 'snare' | 'water_jet' | 'wound';
/**
 * Video status types
 */
export type VideoStatus = 'in_progress' | 'available' | 'completed';
/**
 * Backend frame prediction structure (from API responses)
 */
export interface BackendFramePrediction {
    frameNumber: number;
    label: string;
    confidence: number;
}
/**
 * Backend frame structure (from API responses)
 */
export interface TimeSegmentFrame {
    frameFilename: string;
    frameFilePath: string;
    frameUrl: string;
    allClassifications: any[];
    predictions: BackendFramePrediction[] | any[];
    frameId: number;
    manualAnnotations: any[];
}
export interface TimeSegments {
    segmentId: number;
    segmentStart: number;
    segmentEnd: number;
    startTime: number;
    endTime: number;
    frames: TimeSegmentFrame[];
}
/**
 * Backend segment format (from API responses)
 */
export interface BackendSegment {
    id: number;
    videoFile?: number;
    videoName?: string;
    videoId?: number;
    label?: number | null;
    labelName?: string | null;
    labelId?: number | null;
    startFrameNumber: number;
    endFrameNumber: number;
    startTime: number;
    endTime: number;
    exportSegment?: boolean;
    export_segment?: boolean;
    sourceName?: string | null;
    source_name?: string | null;
    segmentOrigin?: 'manual' | 'prediction';
    segment_origin?: 'manual' | 'prediction';
    predictionMetaId?: number | null;
    prediction_meta_id?: number | null;
    labelDisplay?: string;
    framePredictions?: BackendFramePrediction[];
    manualFrameAnnotations?: any[];
    timeSegments?: TimeSegments | null;
}
/**
 * Frontend segment format (unified camelCase)
 */
export interface FrontendSegment {
    id: number;
    startFrameNumber?: number;
    endFrameNumber?: number;
    label: string;
    videoName?: string;
    startTime: number;
    endTime: number;
    usingFPS?: boolean;
}
export type SegmentSyncState = 'clean' | 'dirty' | 'pending_create' | 'pending_update' | 'pending_delete' | 'error';
/**
 * Segment interface for internal store usage
 * (canonical frontend representation)
 */
export interface Segment {
    id: number;
    label: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
    videoID?: number;
    labelID: number | null;
    frames?: Record<string, TimeSegmentFrame>;
    color?: string;
    startFrameNumber?: number;
    endFrameNumber?: number;
    usingFPS?: boolean;
    isDraft?: boolean;
    isDirty?: boolean;
    exportSegment?: boolean;
    sourceName?: string | null;
    segmentOrigin?: 'manual' | 'prediction';
    predictionMetaId?: number | null;
    syncState?: SegmentSyncState;
    lastSyncError?: string | null;
}
/**
 * Video annotation interface
 */
export interface VideoAnnotation {
    id: number;
    isAnnotated: boolean;
    errorMessage: string;
    segments: Segment[];
    videoUrl: string;
    status: VideoStatus;
    assignedUser: string | null;
    duration?: number;
    fps?: number;
    frameCount?: number;
}
export type SegmentAnnotationStatus = 'not_started' | 'cleanup_queued' | 'cleanup_running' | 'cleanup_failed' | 'cleanup_required' | 'validated';
export interface PostValidationRebuildSummary {
    id?: number | null;
    status?: string;
    taskId?: string;
    task_id?: string;
    details?: string;
    outputFile?: string;
    output_file?: string;
    createdAt?: string | null;
    created_at?: string | null;
    completedAt?: string | null;
    completed_at?: string | null;
}
/**
 * Video metadata from backend
 */
export interface VideoMeta {
    id: number;
    original_file_name: string;
    status: string;
    assignedUser?: string | null;
    anonymized: boolean;
    segmentAnnotationsValidated?: boolean;
    segmentAnnotationStatus?: SegmentAnnotationStatus;
    outsideSegmentsRemoved?: boolean;
    postValidationRebuild?: PostValidationRebuildSummary | null;
    duration?: number;
    fps?: number;
    hasROI?: boolean;
    outsideFrameCount?: number;
    frameCount?: number;
    centerKey?: string;
    centerName: string;
    processorName: string;
    validatedAnnotators?: string[];
    segments?: Segment[];
    exportSegmentsByVideo?: boolean;
}
/**
 * Label metadata
 */
export interface LabelMeta {
    id: number;
    name: string;
    color?: string;
}
export interface PredictionModelMeta {
    id: number;
    name: string;
    version: string;
    description?: string;
    modelName: string;
    aiModelId: number;
    labelsetName: string;
    labelsetVersion: number | string;
    labelsetId: number;
    weightsAvailable: boolean;
    isActive: boolean;
}
export interface PredictionModelListResponse {
    models: PredictionModelMeta[];
    defaultHuggingfaceModelId: string;
    defaultModelName: string;
    defaultLabelsetName: string;
    huggingfaceModels: Array<{
        modelId: string;
        label: string;
        labelsetName: string;
    }>;
}
export interface RerunPredictionSegmentsPayload {
    modelMetaId?: number | null;
    hfModelId?: string | null;
    labelsetName?: string | null;
    labelsetVersion?: number | string | null;
    replacePredictionSegments?: boolean;
    deleteFramesAfter?: boolean;
}
export interface RerunPredictionSegmentsResponse {
    success: boolean;
    videoId: number;
    modelMeta: PredictionModelMeta;
    deletedPredictionSegments: number;
    predictionSegmentsCount: number;
    error?: string;
}
/**
 * Video list response structure
 */
export interface VideoList {
    videos: VideoMeta[];
    labels: LabelMeta[];
}
/**
 * Draft segment interface
 */
export interface DraftSegment {
    id: number;
    label: string;
    startTime: number;
    endTime: number | null;
}
/**
 * Segment option for dropdowns
 */
export interface SegmentOption {
    id: number;
    label: string;
    startTime: number;
    endTime: number;
    display: string;
}
/**
 * Segment style object for CSS
 */
export interface SegmentStyle {
    left: string;
    width: string;
    backgroundColor: string;
    opacity?: string;
    border?: string;
}
/**
 * Update payload for segments
 */
export interface SegmentUpdatePayload {
    startTime?: number;
    endTime?: number;
    start_time?: number;
    end_time?: number;
    exportSegment?: boolean;
    export_segment?: boolean;
    [key: string]: any;
}
export interface CreateSegmentResponse extends BackendSegment {
}
export type SegmentSourceKind = 'all' | 'manual' | 'prediction';
export declare function backendSegmentToSegment(backend: BackendSegment): Segment;
/**
 * Upload callback types
 */
export type UploadLoadCallback = (serverFileId?: string) => void;
export type UploadErrorCallback = (message: string) => void;
export declare const useVideoStore: import("pinia").StoreDefinition<"video", Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly frameCount?: number | undefined;
    } | null, {
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly frameCount?: number | undefined;
    } | null>>;
    errorMessage: Readonly<Ref<string, string>>;
    videoUrl: Readonly<Ref<string, string>>;
    segmentsByLabel: Record<string, Segment[]>;
    videoList: Readonly<Ref<{
        readonly videos: readonly {
            readonly id: number;
            readonly original_file_name: string;
            readonly status: string;
            readonly assignedUser?: string | null | undefined;
            readonly anonymized: boolean;
            readonly segmentAnnotationsValidated?: boolean | undefined;
            readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
            readonly outsideSegmentsRemoved?: boolean | undefined;
            readonly postValidationRebuild?: {
                readonly id?: number | null | undefined;
                readonly status?: string | undefined;
                readonly taskId?: string | undefined;
                readonly task_id?: string | undefined;
                readonly details?: string | undefined;
                readonly outputFile?: string | undefined;
                readonly output_file?: string | undefined;
                readonly createdAt?: string | null | undefined;
                readonly created_at?: string | null | undefined;
                readonly completedAt?: string | null | undefined;
                readonly completed_at?: string | null | undefined;
            } | null | undefined;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly frameCount?: number | undefined;
            readonly centerKey?: string | undefined;
            readonly centerName: string;
            readonly processorName: string;
            readonly validatedAnnotators?: readonly string[] | undefined;
            readonly segments?: readonly {
                readonly id: number;
                readonly label: string;
                readonly startTime: number;
                readonly endTime: number;
                readonly avgConfidence: number;
                readonly videoID?: number | undefined;
                readonly labelID: number | null;
                readonly frames?: {
                    readonly [x: string]: {
                        readonly frameFilename: string;
                        readonly frameFilePath: string;
                        readonly frameUrl: string;
                        readonly allClassifications: readonly any[];
                        readonly predictions: readonly any[] | readonly {
                            readonly frameNumber: number;
                            readonly label: string;
                            readonly confidence: number;
                        }[];
                        readonly frameId: number;
                        readonly manualAnnotations: readonly any[];
                    };
                } | undefined;
                readonly color?: string | undefined;
                readonly startFrameNumber?: number | undefined;
                readonly endFrameNumber?: number | undefined;
                readonly usingFPS?: boolean | undefined;
                readonly isDraft?: boolean | undefined;
                readonly isDirty?: boolean | undefined;
                readonly exportSegment?: boolean | undefined;
                readonly sourceName?: string | null | undefined;
                readonly segmentOrigin?: "manual" | "prediction" | undefined;
                readonly predictionMetaId?: number | null | undefined;
                readonly syncState?: SegmentSyncState | undefined;
                readonly lastSyncError?: string | null | undefined;
            }[] | undefined;
            readonly exportSegmentsByVideo?: boolean | undefined;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }, {
        readonly videos: readonly {
            readonly id: number;
            readonly original_file_name: string;
            readonly status: string;
            readonly assignedUser?: string | null | undefined;
            readonly anonymized: boolean;
            readonly segmentAnnotationsValidated?: boolean | undefined;
            readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
            readonly outsideSegmentsRemoved?: boolean | undefined;
            readonly postValidationRebuild?: {
                readonly id?: number | null | undefined;
                readonly status?: string | undefined;
                readonly taskId?: string | undefined;
                readonly task_id?: string | undefined;
                readonly details?: string | undefined;
                readonly outputFile?: string | undefined;
                readonly output_file?: string | undefined;
                readonly createdAt?: string | null | undefined;
                readonly created_at?: string | null | undefined;
                readonly completedAt?: string | null | undefined;
                readonly completed_at?: string | null | undefined;
            } | null | undefined;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly frameCount?: number | undefined;
            readonly centerKey?: string | undefined;
            readonly centerName: string;
            readonly processorName: string;
            readonly validatedAnnotators?: readonly string[] | undefined;
            readonly segments?: readonly {
                readonly id: number;
                readonly label: string;
                readonly startTime: number;
                readonly endTime: number;
                readonly avgConfidence: number;
                readonly videoID?: number | undefined;
                readonly labelID: number | null;
                readonly frames?: {
                    readonly [x: string]: {
                        readonly frameFilename: string;
                        readonly frameFilePath: string;
                        readonly frameUrl: string;
                        readonly allClassifications: readonly any[];
                        readonly predictions: readonly any[] | readonly {
                            readonly frameNumber: number;
                            readonly label: string;
                            readonly confidence: number;
                        }[];
                        readonly frameId: number;
                        readonly manualAnnotations: readonly any[];
                    };
                } | undefined;
                readonly color?: string | undefined;
                readonly startFrameNumber?: number | undefined;
                readonly endFrameNumber?: number | undefined;
                readonly usingFPS?: boolean | undefined;
                readonly isDraft?: boolean | undefined;
                readonly isDirty?: boolean | undefined;
                readonly exportSegment?: boolean | undefined;
                readonly sourceName?: string | null | undefined;
                readonly segmentOrigin?: "manual" | "prediction" | undefined;
                readonly predictionMetaId?: number | null | undefined;
                readonly syncState?: SegmentSyncState | undefined;
                readonly lastSyncError?: string | null | undefined;
            }[] | undefined;
            readonly exportSegmentsByVideo?: boolean | undefined;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }>>;
    videoMeta: Readonly<Ref<{
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly segmentAnnotationsValidated?: boolean | undefined;
        readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
        readonly outsideSegmentsRemoved?: boolean | undefined;
        readonly postValidationRebuild?: {
            readonly id?: number | null | undefined;
            readonly status?: string | undefined;
            readonly taskId?: string | undefined;
            readonly task_id?: string | undefined;
            readonly details?: string | undefined;
            readonly outputFile?: string | undefined;
            readonly output_file?: string | undefined;
            readonly createdAt?: string | null | undefined;
            readonly created_at?: string | null | undefined;
            readonly completedAt?: string | null | undefined;
            readonly completed_at?: string | null | undefined;
        } | null | undefined;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly frameCount?: number | undefined;
        readonly centerKey?: string | undefined;
        readonly centerName: string;
        readonly processorName: string;
        readonly validatedAnnotators?: readonly string[] | undefined;
        readonly segments?: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[] | undefined;
        readonly exportSegmentsByVideo?: boolean | undefined;
    } | null, {
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly segmentAnnotationsValidated?: boolean | undefined;
        readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
        readonly outsideSegmentsRemoved?: boolean | undefined;
        readonly postValidationRebuild?: {
            readonly id?: number | null | undefined;
            readonly status?: string | undefined;
            readonly taskId?: string | undefined;
            readonly task_id?: string | undefined;
            readonly details?: string | undefined;
            readonly outputFile?: string | undefined;
            readonly output_file?: string | undefined;
            readonly createdAt?: string | null | undefined;
            readonly created_at?: string | null | undefined;
            readonly completedAt?: string | null | undefined;
            readonly completed_at?: string | null | undefined;
        } | null | undefined;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly frameCount?: number | undefined;
        readonly centerKey?: string | undefined;
        readonly centerName: string;
        readonly processorName: string;
        readonly validatedAnnotators?: readonly string[] | undefined;
        readonly segments?: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[] | undefined;
        readonly exportSegmentsByVideo?: boolean | undefined;
    } | null>>;
    videos: Ref<{
        [x: string]: any;
        id: number;
        center_key?: string | undefined;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
        exportSegmentsByVideo?: boolean | undefined;
        frameCount?: number | undefined;
    }[], Video[] | {
        [x: string]: any;
        id: number;
        center_key?: string | undefined;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
        exportSegmentsByVideo?: boolean | undefined;
        frameCount?: number | undefined;
    }[]>;
    allSegments: ComputedRef<Segment[]>;
    draftSegment: Ref<{
        id: number;
        label: string;
        startTime: number;
        endTime: number | null;
    } | null, DraftSegment | {
        id: number;
        label: string;
        startTime: number;
        endTime: number | null;
    } | null>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    effectiveFps: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    predictionModels: Readonly<Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly version: string;
        readonly description?: string | undefined;
        readonly modelName: string;
        readonly aiModelId: number;
        readonly labelsetName: string;
        readonly labelsetVersion: number | string;
        readonly labelsetId: number;
        readonly weightsAvailable: boolean;
        readonly isActive: boolean;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly version: string;
        readonly description?: string | undefined;
        readonly modelName: string;
        readonly aiModelId: number;
        readonly labelsetName: string;
        readonly labelsetVersion: number | string;
        readonly labelsetId: number;
        readonly weightsAvailable: boolean;
        readonly isActive: boolean;
    }[]>>;
    defaultHuggingfaceModelId: Readonly<Ref<string, string>>;
    defaultPredictionLabelsetName: Readonly<Ref<string, string>>;
    videoStreamUrl: ComputedRef<string>;
    timelineSegments: ComputedRef<{
        id: number;
        label: string;
        label_display: string;
        name: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        video_id: number | undefined;
        label_id: number | null;
    }[]>;
    hasRawVideoFile: Readonly<Ref<boolean | null, boolean | null>>;
    buildVideoStreamUrl: typeof buildVideoStreamUrl;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoFps: (videoId?: number) => Promise<number | null>;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchAllSegments: (id: number, forceRefresh?: boolean, options?: {
        sourceKind?: SegmentSourceKind;
    }) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchPredictionModels: () => Promise<PredictionModelMeta[]>;
    rerunPredictionSegments: (videoId: number, payload: RerunPredictionSegmentsPayload) => Promise<RerunPredictionSegmentsResponse>;
    fetchVideoSegments: (videoId: number, options?: {
        sourceKind?: SegmentSourceKind;
    }) => Promise<void>;
    fetchSegmentsByLabel: (id: number, label?: string) => Promise<void>;
    createSegment: (videoId: number, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegmentAPI: (segmentId: number, updates: SegmentUpdatePayload, options?: {
        silent?: boolean;
        videoId?: number;
    }) => Promise<boolean>;
    setSegmentExportFlag: (segmentId: number, exportSegment: boolean) => Promise<boolean>;
    setVideoExportFlag: (videoId: number, exportSegmentsByVideo: boolean) => Promise<boolean>;
    deleteSegment: (segmentId: number) => Promise<boolean>;
    removeSegment: (segmentId: number) => void;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, videoDuration: number) => SegmentStyle;
    getColorForLabel: typeof getColorForLabel;
    getTranslationForLabel: typeof getTranslationForLabel;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: number) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    hasRawVideoFileFn: () => void;
    persistDirtySegments: () => Promise<void>;
    updateSegmentInMemory: (segmentId: number, updates: Partial<Segment>, markDirty?: boolean) => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    patchDraftSegment: (id: number, updates: Partial<DraftSegment>) => void;
    patchSegmentLocally: (id: number, updates: Partial<Segment>) => void;
    backendSegmentToSegment: typeof backendSegmentToSegment;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "errorMessage" | "videoUrl" | "videos" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta" | "draftSegment" | "predictionModels" | "defaultHuggingfaceModelId" | "defaultPredictionLabelsetName" | "hasRawVideoFile">, Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly frameCount?: number | undefined;
    } | null, {
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly frameCount?: number | undefined;
    } | null>>;
    errorMessage: Readonly<Ref<string, string>>;
    videoUrl: Readonly<Ref<string, string>>;
    segmentsByLabel: Record<string, Segment[]>;
    videoList: Readonly<Ref<{
        readonly videos: readonly {
            readonly id: number;
            readonly original_file_name: string;
            readonly status: string;
            readonly assignedUser?: string | null | undefined;
            readonly anonymized: boolean;
            readonly segmentAnnotationsValidated?: boolean | undefined;
            readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
            readonly outsideSegmentsRemoved?: boolean | undefined;
            readonly postValidationRebuild?: {
                readonly id?: number | null | undefined;
                readonly status?: string | undefined;
                readonly taskId?: string | undefined;
                readonly task_id?: string | undefined;
                readonly details?: string | undefined;
                readonly outputFile?: string | undefined;
                readonly output_file?: string | undefined;
                readonly createdAt?: string | null | undefined;
                readonly created_at?: string | null | undefined;
                readonly completedAt?: string | null | undefined;
                readonly completed_at?: string | null | undefined;
            } | null | undefined;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly frameCount?: number | undefined;
            readonly centerKey?: string | undefined;
            readonly centerName: string;
            readonly processorName: string;
            readonly validatedAnnotators?: readonly string[] | undefined;
            readonly segments?: readonly {
                readonly id: number;
                readonly label: string;
                readonly startTime: number;
                readonly endTime: number;
                readonly avgConfidence: number;
                readonly videoID?: number | undefined;
                readonly labelID: number | null;
                readonly frames?: {
                    readonly [x: string]: {
                        readonly frameFilename: string;
                        readonly frameFilePath: string;
                        readonly frameUrl: string;
                        readonly allClassifications: readonly any[];
                        readonly predictions: readonly any[] | readonly {
                            readonly frameNumber: number;
                            readonly label: string;
                            readonly confidence: number;
                        }[];
                        readonly frameId: number;
                        readonly manualAnnotations: readonly any[];
                    };
                } | undefined;
                readonly color?: string | undefined;
                readonly startFrameNumber?: number | undefined;
                readonly endFrameNumber?: number | undefined;
                readonly usingFPS?: boolean | undefined;
                readonly isDraft?: boolean | undefined;
                readonly isDirty?: boolean | undefined;
                readonly exportSegment?: boolean | undefined;
                readonly sourceName?: string | null | undefined;
                readonly segmentOrigin?: "manual" | "prediction" | undefined;
                readonly predictionMetaId?: number | null | undefined;
                readonly syncState?: SegmentSyncState | undefined;
                readonly lastSyncError?: string | null | undefined;
            }[] | undefined;
            readonly exportSegmentsByVideo?: boolean | undefined;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }, {
        readonly videos: readonly {
            readonly id: number;
            readonly original_file_name: string;
            readonly status: string;
            readonly assignedUser?: string | null | undefined;
            readonly anonymized: boolean;
            readonly segmentAnnotationsValidated?: boolean | undefined;
            readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
            readonly outsideSegmentsRemoved?: boolean | undefined;
            readonly postValidationRebuild?: {
                readonly id?: number | null | undefined;
                readonly status?: string | undefined;
                readonly taskId?: string | undefined;
                readonly task_id?: string | undefined;
                readonly details?: string | undefined;
                readonly outputFile?: string | undefined;
                readonly output_file?: string | undefined;
                readonly createdAt?: string | null | undefined;
                readonly created_at?: string | null | undefined;
                readonly completedAt?: string | null | undefined;
                readonly completed_at?: string | null | undefined;
            } | null | undefined;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly frameCount?: number | undefined;
            readonly centerKey?: string | undefined;
            readonly centerName: string;
            readonly processorName: string;
            readonly validatedAnnotators?: readonly string[] | undefined;
            readonly segments?: readonly {
                readonly id: number;
                readonly label: string;
                readonly startTime: number;
                readonly endTime: number;
                readonly avgConfidence: number;
                readonly videoID?: number | undefined;
                readonly labelID: number | null;
                readonly frames?: {
                    readonly [x: string]: {
                        readonly frameFilename: string;
                        readonly frameFilePath: string;
                        readonly frameUrl: string;
                        readonly allClassifications: readonly any[];
                        readonly predictions: readonly any[] | readonly {
                            readonly frameNumber: number;
                            readonly label: string;
                            readonly confidence: number;
                        }[];
                        readonly frameId: number;
                        readonly manualAnnotations: readonly any[];
                    };
                } | undefined;
                readonly color?: string | undefined;
                readonly startFrameNumber?: number | undefined;
                readonly endFrameNumber?: number | undefined;
                readonly usingFPS?: boolean | undefined;
                readonly isDraft?: boolean | undefined;
                readonly isDirty?: boolean | undefined;
                readonly exportSegment?: boolean | undefined;
                readonly sourceName?: string | null | undefined;
                readonly segmentOrigin?: "manual" | "prediction" | undefined;
                readonly predictionMetaId?: number | null | undefined;
                readonly syncState?: SegmentSyncState | undefined;
                readonly lastSyncError?: string | null | undefined;
            }[] | undefined;
            readonly exportSegmentsByVideo?: boolean | undefined;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }>>;
    videoMeta: Readonly<Ref<{
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly segmentAnnotationsValidated?: boolean | undefined;
        readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
        readonly outsideSegmentsRemoved?: boolean | undefined;
        readonly postValidationRebuild?: {
            readonly id?: number | null | undefined;
            readonly status?: string | undefined;
            readonly taskId?: string | undefined;
            readonly task_id?: string | undefined;
            readonly details?: string | undefined;
            readonly outputFile?: string | undefined;
            readonly output_file?: string | undefined;
            readonly createdAt?: string | null | undefined;
            readonly created_at?: string | null | undefined;
            readonly completedAt?: string | null | undefined;
            readonly completed_at?: string | null | undefined;
        } | null | undefined;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly frameCount?: number | undefined;
        readonly centerKey?: string | undefined;
        readonly centerName: string;
        readonly processorName: string;
        readonly validatedAnnotators?: readonly string[] | undefined;
        readonly segments?: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[] | undefined;
        readonly exportSegmentsByVideo?: boolean | undefined;
    } | null, {
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly segmentAnnotationsValidated?: boolean | undefined;
        readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
        readonly outsideSegmentsRemoved?: boolean | undefined;
        readonly postValidationRebuild?: {
            readonly id?: number | null | undefined;
            readonly status?: string | undefined;
            readonly taskId?: string | undefined;
            readonly task_id?: string | undefined;
            readonly details?: string | undefined;
            readonly outputFile?: string | undefined;
            readonly output_file?: string | undefined;
            readonly createdAt?: string | null | undefined;
            readonly created_at?: string | null | undefined;
            readonly completedAt?: string | null | undefined;
            readonly completed_at?: string | null | undefined;
        } | null | undefined;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly frameCount?: number | undefined;
        readonly centerKey?: string | undefined;
        readonly centerName: string;
        readonly processorName: string;
        readonly validatedAnnotators?: readonly string[] | undefined;
        readonly segments?: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[] | undefined;
        readonly exportSegmentsByVideo?: boolean | undefined;
    } | null>>;
    videos: Ref<{
        [x: string]: any;
        id: number;
        center_key?: string | undefined;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
        exportSegmentsByVideo?: boolean | undefined;
        frameCount?: number | undefined;
    }[], Video[] | {
        [x: string]: any;
        id: number;
        center_key?: string | undefined;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
        exportSegmentsByVideo?: boolean | undefined;
        frameCount?: number | undefined;
    }[]>;
    allSegments: ComputedRef<Segment[]>;
    draftSegment: Ref<{
        id: number;
        label: string;
        startTime: number;
        endTime: number | null;
    } | null, DraftSegment | {
        id: number;
        label: string;
        startTime: number;
        endTime: number | null;
    } | null>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    effectiveFps: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    predictionModels: Readonly<Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly version: string;
        readonly description?: string | undefined;
        readonly modelName: string;
        readonly aiModelId: number;
        readonly labelsetName: string;
        readonly labelsetVersion: number | string;
        readonly labelsetId: number;
        readonly weightsAvailable: boolean;
        readonly isActive: boolean;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly version: string;
        readonly description?: string | undefined;
        readonly modelName: string;
        readonly aiModelId: number;
        readonly labelsetName: string;
        readonly labelsetVersion: number | string;
        readonly labelsetId: number;
        readonly weightsAvailable: boolean;
        readonly isActive: boolean;
    }[]>>;
    defaultHuggingfaceModelId: Readonly<Ref<string, string>>;
    defaultPredictionLabelsetName: Readonly<Ref<string, string>>;
    videoStreamUrl: ComputedRef<string>;
    timelineSegments: ComputedRef<{
        id: number;
        label: string;
        label_display: string;
        name: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        video_id: number | undefined;
        label_id: number | null;
    }[]>;
    hasRawVideoFile: Readonly<Ref<boolean | null, boolean | null>>;
    buildVideoStreamUrl: typeof buildVideoStreamUrl;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoFps: (videoId?: number) => Promise<number | null>;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchAllSegments: (id: number, forceRefresh?: boolean, options?: {
        sourceKind?: SegmentSourceKind;
    }) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchPredictionModels: () => Promise<PredictionModelMeta[]>;
    rerunPredictionSegments: (videoId: number, payload: RerunPredictionSegmentsPayload) => Promise<RerunPredictionSegmentsResponse>;
    fetchVideoSegments: (videoId: number, options?: {
        sourceKind?: SegmentSourceKind;
    }) => Promise<void>;
    fetchSegmentsByLabel: (id: number, label?: string) => Promise<void>;
    createSegment: (videoId: number, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegmentAPI: (segmentId: number, updates: SegmentUpdatePayload, options?: {
        silent?: boolean;
        videoId?: number;
    }) => Promise<boolean>;
    setSegmentExportFlag: (segmentId: number, exportSegment: boolean) => Promise<boolean>;
    setVideoExportFlag: (videoId: number, exportSegmentsByVideo: boolean) => Promise<boolean>;
    deleteSegment: (segmentId: number) => Promise<boolean>;
    removeSegment: (segmentId: number) => void;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, videoDuration: number) => SegmentStyle;
    getColorForLabel: typeof getColorForLabel;
    getTranslationForLabel: typeof getTranslationForLabel;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: number) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    hasRawVideoFileFn: () => void;
    persistDirtySegments: () => Promise<void>;
    updateSegmentInMemory: (segmentId: number, updates: Partial<Segment>, markDirty?: boolean) => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    patchDraftSegment: (id: number, updates: Partial<DraftSegment>) => void;
    patchSegmentLocally: (id: number, updates: Partial<Segment>) => void;
    backendSegmentToSegment: typeof backendSegmentToSegment;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "segments" | "duration" | "labels" | "allSegments" | "activeSegment" | "effectiveFps" | "hasVideo" | "videoStreamUrl" | "timelineSegments">, Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly frameCount?: number | undefined;
    } | null, {
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly frameCount?: number | undefined;
    } | null>>;
    errorMessage: Readonly<Ref<string, string>>;
    videoUrl: Readonly<Ref<string, string>>;
    segmentsByLabel: Record<string, Segment[]>;
    videoList: Readonly<Ref<{
        readonly videos: readonly {
            readonly id: number;
            readonly original_file_name: string;
            readonly status: string;
            readonly assignedUser?: string | null | undefined;
            readonly anonymized: boolean;
            readonly segmentAnnotationsValidated?: boolean | undefined;
            readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
            readonly outsideSegmentsRemoved?: boolean | undefined;
            readonly postValidationRebuild?: {
                readonly id?: number | null | undefined;
                readonly status?: string | undefined;
                readonly taskId?: string | undefined;
                readonly task_id?: string | undefined;
                readonly details?: string | undefined;
                readonly outputFile?: string | undefined;
                readonly output_file?: string | undefined;
                readonly createdAt?: string | null | undefined;
                readonly created_at?: string | null | undefined;
                readonly completedAt?: string | null | undefined;
                readonly completed_at?: string | null | undefined;
            } | null | undefined;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly frameCount?: number | undefined;
            readonly centerKey?: string | undefined;
            readonly centerName: string;
            readonly processorName: string;
            readonly validatedAnnotators?: readonly string[] | undefined;
            readonly segments?: readonly {
                readonly id: number;
                readonly label: string;
                readonly startTime: number;
                readonly endTime: number;
                readonly avgConfidence: number;
                readonly videoID?: number | undefined;
                readonly labelID: number | null;
                readonly frames?: {
                    readonly [x: string]: {
                        readonly frameFilename: string;
                        readonly frameFilePath: string;
                        readonly frameUrl: string;
                        readonly allClassifications: readonly any[];
                        readonly predictions: readonly any[] | readonly {
                            readonly frameNumber: number;
                            readonly label: string;
                            readonly confidence: number;
                        }[];
                        readonly frameId: number;
                        readonly manualAnnotations: readonly any[];
                    };
                } | undefined;
                readonly color?: string | undefined;
                readonly startFrameNumber?: number | undefined;
                readonly endFrameNumber?: number | undefined;
                readonly usingFPS?: boolean | undefined;
                readonly isDraft?: boolean | undefined;
                readonly isDirty?: boolean | undefined;
                readonly exportSegment?: boolean | undefined;
                readonly sourceName?: string | null | undefined;
                readonly segmentOrigin?: "manual" | "prediction" | undefined;
                readonly predictionMetaId?: number | null | undefined;
                readonly syncState?: SegmentSyncState | undefined;
                readonly lastSyncError?: string | null | undefined;
            }[] | undefined;
            readonly exportSegmentsByVideo?: boolean | undefined;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }, {
        readonly videos: readonly {
            readonly id: number;
            readonly original_file_name: string;
            readonly status: string;
            readonly assignedUser?: string | null | undefined;
            readonly anonymized: boolean;
            readonly segmentAnnotationsValidated?: boolean | undefined;
            readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
            readonly outsideSegmentsRemoved?: boolean | undefined;
            readonly postValidationRebuild?: {
                readonly id?: number | null | undefined;
                readonly status?: string | undefined;
                readonly taskId?: string | undefined;
                readonly task_id?: string | undefined;
                readonly details?: string | undefined;
                readonly outputFile?: string | undefined;
                readonly output_file?: string | undefined;
                readonly createdAt?: string | null | undefined;
                readonly created_at?: string | null | undefined;
                readonly completedAt?: string | null | undefined;
                readonly completed_at?: string | null | undefined;
            } | null | undefined;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly frameCount?: number | undefined;
            readonly centerKey?: string | undefined;
            readonly centerName: string;
            readonly processorName: string;
            readonly validatedAnnotators?: readonly string[] | undefined;
            readonly segments?: readonly {
                readonly id: number;
                readonly label: string;
                readonly startTime: number;
                readonly endTime: number;
                readonly avgConfidence: number;
                readonly videoID?: number | undefined;
                readonly labelID: number | null;
                readonly frames?: {
                    readonly [x: string]: {
                        readonly frameFilename: string;
                        readonly frameFilePath: string;
                        readonly frameUrl: string;
                        readonly allClassifications: readonly any[];
                        readonly predictions: readonly any[] | readonly {
                            readonly frameNumber: number;
                            readonly label: string;
                            readonly confidence: number;
                        }[];
                        readonly frameId: number;
                        readonly manualAnnotations: readonly any[];
                    };
                } | undefined;
                readonly color?: string | undefined;
                readonly startFrameNumber?: number | undefined;
                readonly endFrameNumber?: number | undefined;
                readonly usingFPS?: boolean | undefined;
                readonly isDraft?: boolean | undefined;
                readonly isDirty?: boolean | undefined;
                readonly exportSegment?: boolean | undefined;
                readonly sourceName?: string | null | undefined;
                readonly segmentOrigin?: "manual" | "prediction" | undefined;
                readonly predictionMetaId?: number | null | undefined;
                readonly syncState?: SegmentSyncState | undefined;
                readonly lastSyncError?: string | null | undefined;
            }[] | undefined;
            readonly exportSegmentsByVideo?: boolean | undefined;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }>>;
    videoMeta: Readonly<Ref<{
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly segmentAnnotationsValidated?: boolean | undefined;
        readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
        readonly outsideSegmentsRemoved?: boolean | undefined;
        readonly postValidationRebuild?: {
            readonly id?: number | null | undefined;
            readonly status?: string | undefined;
            readonly taskId?: string | undefined;
            readonly task_id?: string | undefined;
            readonly details?: string | undefined;
            readonly outputFile?: string | undefined;
            readonly output_file?: string | undefined;
            readonly createdAt?: string | null | undefined;
            readonly created_at?: string | null | undefined;
            readonly completedAt?: string | null | undefined;
            readonly completed_at?: string | null | undefined;
        } | null | undefined;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly frameCount?: number | undefined;
        readonly centerKey?: string | undefined;
        readonly centerName: string;
        readonly processorName: string;
        readonly validatedAnnotators?: readonly string[] | undefined;
        readonly segments?: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[] | undefined;
        readonly exportSegmentsByVideo?: boolean | undefined;
    } | null, {
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly segmentAnnotationsValidated?: boolean | undefined;
        readonly segmentAnnotationStatus?: SegmentAnnotationStatus | undefined;
        readonly outsideSegmentsRemoved?: boolean | undefined;
        readonly postValidationRebuild?: {
            readonly id?: number | null | undefined;
            readonly status?: string | undefined;
            readonly taskId?: string | undefined;
            readonly task_id?: string | undefined;
            readonly details?: string | undefined;
            readonly outputFile?: string | undefined;
            readonly output_file?: string | undefined;
            readonly createdAt?: string | null | undefined;
            readonly created_at?: string | null | undefined;
            readonly completedAt?: string | null | undefined;
            readonly completed_at?: string | null | undefined;
        } | null | undefined;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly frameCount?: number | undefined;
        readonly centerKey?: string | undefined;
        readonly centerName: string;
        readonly processorName: string;
        readonly validatedAnnotators?: readonly string[] | undefined;
        readonly segments?: readonly {
            readonly id: number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID: number | null;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frameFilename: string;
                    readonly frameFilePath: string;
                    readonly frameUrl: string;
                    readonly allClassifications: readonly any[];
                    readonly predictions: readonly any[] | readonly {
                        readonly frameNumber: number;
                        readonly label: string;
                        readonly confidence: number;
                    }[];
                    readonly frameId: number;
                    readonly manualAnnotations: readonly any[];
                };
            } | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
            readonly isDraft?: boolean | undefined;
            readonly isDirty?: boolean | undefined;
            readonly exportSegment?: boolean | undefined;
            readonly sourceName?: string | null | undefined;
            readonly segmentOrigin?: "manual" | "prediction" | undefined;
            readonly predictionMetaId?: number | null | undefined;
            readonly syncState?: SegmentSyncState | undefined;
            readonly lastSyncError?: string | null | undefined;
        }[] | undefined;
        readonly exportSegmentsByVideo?: boolean | undefined;
    } | null>>;
    videos: Ref<{
        [x: string]: any;
        id: number;
        center_key?: string | undefined;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
        exportSegmentsByVideo?: boolean | undefined;
        frameCount?: number | undefined;
    }[], Video[] | {
        [x: string]: any;
        id: number;
        center_key?: string | undefined;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
        exportSegmentsByVideo?: boolean | undefined;
        frameCount?: number | undefined;
    }[]>;
    allSegments: ComputedRef<Segment[]>;
    draftSegment: Ref<{
        id: number;
        label: string;
        startTime: number;
        endTime: number | null;
    } | null, DraftSegment | {
        id: number;
        label: string;
        startTime: number;
        endTime: number | null;
    } | null>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    effectiveFps: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    predictionModels: Readonly<Ref<readonly {
        readonly id: number;
        readonly name: string;
        readonly version: string;
        readonly description?: string | undefined;
        readonly modelName: string;
        readonly aiModelId: number;
        readonly labelsetName: string;
        readonly labelsetVersion: number | string;
        readonly labelsetId: number;
        readonly weightsAvailable: boolean;
        readonly isActive: boolean;
    }[], readonly {
        readonly id: number;
        readonly name: string;
        readonly version: string;
        readonly description?: string | undefined;
        readonly modelName: string;
        readonly aiModelId: number;
        readonly labelsetName: string;
        readonly labelsetVersion: number | string;
        readonly labelsetId: number;
        readonly weightsAvailable: boolean;
        readonly isActive: boolean;
    }[]>>;
    defaultHuggingfaceModelId: Readonly<Ref<string, string>>;
    defaultPredictionLabelsetName: Readonly<Ref<string, string>>;
    videoStreamUrl: ComputedRef<string>;
    timelineSegments: ComputedRef<{
        id: number;
        label: string;
        label_display: string;
        name: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        video_id: number | undefined;
        label_id: number | null;
    }[]>;
    hasRawVideoFile: Readonly<Ref<boolean | null, boolean | null>>;
    buildVideoStreamUrl: typeof buildVideoStreamUrl;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoFps: (videoId?: number) => Promise<number | null>;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchAllSegments: (id: number, forceRefresh?: boolean, options?: {
        sourceKind?: SegmentSourceKind;
    }) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchPredictionModels: () => Promise<PredictionModelMeta[]>;
    rerunPredictionSegments: (videoId: number, payload: RerunPredictionSegmentsPayload) => Promise<RerunPredictionSegmentsResponse>;
    fetchVideoSegments: (videoId: number, options?: {
        sourceKind?: SegmentSourceKind;
    }) => Promise<void>;
    fetchSegmentsByLabel: (id: number, label?: string) => Promise<void>;
    createSegment: (videoId: number, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegmentAPI: (segmentId: number, updates: SegmentUpdatePayload, options?: {
        silent?: boolean;
        videoId?: number;
    }) => Promise<boolean>;
    setSegmentExportFlag: (segmentId: number, exportSegment: boolean) => Promise<boolean>;
    setVideoExportFlag: (videoId: number, exportSegmentsByVideo: boolean) => Promise<boolean>;
    deleteSegment: (segmentId: number) => Promise<boolean>;
    removeSegment: (segmentId: number) => void;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, videoDuration: number) => SegmentStyle;
    getColorForLabel: typeof getColorForLabel;
    getTranslationForLabel: typeof getTranslationForLabel;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: number) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    hasRawVideoFileFn: () => void;
    persistDirtySegments: () => Promise<void>;
    updateSegmentInMemory: (segmentId: number, updates: Partial<Segment>, markDirty?: boolean) => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    patchDraftSegment: (id: number, updates: Partial<DraftSegment>) => void;
    patchSegmentLocally: (id: number, updates: Partial<Segment>) => void;
    backendSegmentToSegment: typeof backendSegmentToSegment;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "buildVideoStreamUrl" | "setCurrentVideo" | "clearVideo" | "deleteVideo" | "setVideo" | "loadVideo" | "fetchVideoFps" | "fetchVideoUrl" | "fetchAllSegments" | "fetchAllVideos" | "fetchLabels" | "fetchPredictionModels" | "rerunPredictionSegments" | "fetchVideoSegments" | "fetchSegmentsByLabel" | "createSegment" | "updateSegmentAPI" | "setSegmentExportFlag" | "setVideoExportFlag" | "deleteSegment" | "removeSegment" | "saveAnnotations" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "setActiveSegment" | "updateVideoStatus" | "assignUserToVideo" | "hasRawVideoFileFn" | "persistDirtySegments" | "updateSegmentInMemory" | "startDraft" | "updateDraftEnd" | "commitDraft" | "cancelDraft" | "createFiveSecondSegment" | "patchDraftSegment" | "patchSegmentLocally" | "backendSegmentToSegment" | "formatTime" | "getSegmentOptions" | "clearSegments">>;
