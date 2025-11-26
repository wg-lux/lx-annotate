import { type Ref, type ComputedRef } from 'vue';
import { getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils';
/**
 * Translation map for label names (German translations)
 */
export interface Video {
    id: number;
    center_name?: string;
    processor_name?: string;
    original_file_name?: string;
    status?: string;
    video_url?: string;
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
    videoFile: number;
    videoName: string;
    videoId: number;
    label: number | null;
    labelName: string | null;
    labelId: number | null;
    startFrameNumber: number;
    endFrameNumber: number;
    startTime: number;
    endTime: number;
    labelDisplay: string;
    framePredictions: BackendFramePrediction[];
    manualFrameAnnotations: any[];
    timeSegments: TimeSegments | null;
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
    duration?: number;
    fps?: number;
    hasROI?: boolean;
    outsideFrameCount?: number;
    centerName: string;
    processorName: string;
}
/**
 * Label metadata
 */
export interface LabelMeta {
    id: number;
    name: string;
    color?: string;
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
    [key: string]: any;
}
export interface CreateSegmentResponse extends BackendSegment {
}
declare function backendSegmentToSegment(backend: BackendSegment): Segment;
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
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
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
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
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
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly centerName: string;
            readonly processorName: string;
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
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly centerName: string;
            readonly processorName: string;
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
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly centerName: string;
        readonly processorName: string;
    } | null, {
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly centerName: string;
        readonly processorName: string;
    } | null>>;
    videos: Ref<{
        [x: string]: any;
        id: number;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
    }[], Video[] | {
        [x: string]: any;
        id: number;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
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
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
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
    buildVideoStreamUrl: (id: string | number) => string;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchAllSegments: (id: number) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchVideoSegments: (videoId: number) => Promise<void>;
    fetchSegmentsByLabel: (id: number, label?: string) => Promise<void>;
    createSegment: (videoId: number, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegmentAPI: (segmentId: number, updates: SegmentUpdatePayload) => Promise<boolean>;
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
}, "errorMessage" | "videoUrl" | "videos" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta" | "draftSegment" | "hasRawVideoFile">, Pick<{
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
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
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
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
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
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly centerName: string;
            readonly processorName: string;
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
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly centerName: string;
            readonly processorName: string;
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
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly centerName: string;
        readonly processorName: string;
    } | null, {
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly centerName: string;
        readonly processorName: string;
    } | null>>;
    videos: Ref<{
        [x: string]: any;
        id: number;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
    }[], Video[] | {
        [x: string]: any;
        id: number;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
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
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
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
    buildVideoStreamUrl: (id: string | number) => string;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchAllSegments: (id: number) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchVideoSegments: (videoId: number) => Promise<void>;
    fetchSegmentsByLabel: (id: number, label?: string) => Promise<void>;
    createSegment: (videoId: number, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegmentAPI: (segmentId: number, updates: SegmentUpdatePayload) => Promise<boolean>;
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
}, "segments" | "duration" | "labels" | "allSegments" | "activeSegment" | "hasVideo" | "videoStreamUrl" | "timelineSegments">, Pick<{
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
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
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
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
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
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly centerName: string;
            readonly processorName: string;
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
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
            readonly hasROI?: boolean | undefined;
            readonly outsideFrameCount?: number | undefined;
            readonly centerName: string;
            readonly processorName: string;
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
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly centerName: string;
        readonly processorName: string;
    } | null, {
        readonly id: number;
        readonly original_file_name: string;
        readonly status: string;
        readonly assignedUser?: string | null | undefined;
        readonly anonymized: boolean;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
        readonly hasROI?: boolean | undefined;
        readonly outsideFrameCount?: number | undefined;
        readonly centerName: string;
        readonly processorName: string;
    } | null>>;
    videos: Ref<{
        [x: string]: any;
        id: number;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
    }[], Video[] | {
        [x: string]: any;
        id: number;
        center_name?: string | undefined;
        processor_name?: string | undefined;
        original_file_name?: string | undefined;
        status?: string | undefined;
        video_url?: string | undefined;
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
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
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
    buildVideoStreamUrl: (id: string | number) => string;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchAllSegments: (id: number) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchVideoSegments: (videoId: number) => Promise<void>;
    fetchSegmentsByLabel: (id: number, label?: string) => Promise<void>;
    createSegment: (videoId: number, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegmentAPI: (segmentId: number, updates: SegmentUpdatePayload) => Promise<boolean>;
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
}, "buildVideoStreamUrl" | "setCurrentVideo" | "clearVideo" | "deleteVideo" | "setVideo" | "loadVideo" | "fetchVideoUrl" | "fetchAllSegments" | "fetchAllVideos" | "fetchLabels" | "fetchVideoSegments" | "fetchSegmentsByLabel" | "createSegment" | "updateSegmentAPI" | "deleteSegment" | "removeSegment" | "saveAnnotations" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "setActiveSegment" | "updateVideoStatus" | "assignUserToVideo" | "hasRawVideoFileFn" | "persistDirtySegments" | "updateSegmentInMemory" | "startDraft" | "updateDraftEnd" | "commitDraft" | "cancelDraft" | "createFiveSecondSegment" | "patchDraftSegment" | "patchSegmentLocally" | "backendSegmentToSegment" | "formatTime" | "getSegmentOptions" | "clearSegments">>;
export {};
