import { type Ref, type ComputedRef } from 'vue';
import { getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils';
/**
 * Translation map for label names (German translations)
 */
interface Video {
    id: number;
    center_name?: string;
    processor_name?: string;
    original_file_name?: string;
    status?: string;
    video_url?: string;
    [key: string]: any;
}
type LabelKey = 'appendix' | 'blood' | 'diverticule' | 'grasper' | 'ileocaecalvalve' | 'ileum' | 'low_quality' | 'nbi' | 'needle' | 'outside' | 'polyp' | 'snare' | 'water_jet' | 'wound';
/**
 * Video status types
 */
type VideoStatus = 'in_progress' | 'available' | 'completed';
/**
 * Backend frame prediction structure (from API responses)
 */
interface BackendFramePrediction {
    frame_number: number;
    label: string;
    confidence: number;
}
/**
 * Backend frame structure (from API responses)
 */
interface BackendFrame {
    frame_filename: string;
    frame_file_path: string;
    predictions: BackendFramePrediction;
}
/**
 * Backend segment format (from API responses)
 */
export interface BackendSegment {
    id: number;
    startFrameNumber?: number;
    endFrameNumber?: number;
    labelName: string;
    videoName: string;
    startTime: number;
    endTime: number;
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
 * Segment interface for internal store usage - supports both string and number IDs
 */
interface Segment {
    id: string | number;
    label: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
    videoID?: number;
    labelID?: number;
    label_name?: string;
    frames?: Record<string, BackendFrame>;
    isDraft?: boolean;
    color?: string;
    startFrameNumber?: number;
    endFrameNumber?: number;
    usingFPS?: boolean;
}
/**
 * Video annotation interface
 */
interface VideoAnnotation {
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
interface VideoMeta {
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
interface LabelMeta {
    id: number;
    name: string;
    color?: string;
}
/**
 * Video list response structure
 */
interface VideoList {
    videos: VideoMeta[];
    labels: LabelMeta[];
}
/**
 * Draft segment interface
 */
interface DraftSegment {
    id: string | number;
    label: string;
    startTime: number;
    endTime: number | null;
}
/**
 * Segment option for dropdowns
 */
interface SegmentOption {
    id: string | number;
    label: string;
    startTime: number;
    endTime: number;
    display: string;
}
/**
 * Segment style object for CSS
 */
interface SegmentStyle {
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
/**
 * Upload callback types
 */
type UploadLoadCallback = (serverFileId?: string) => void;
type UploadErrorCallback = (message: string) => void;
export declare const useVideoStore: import("pinia").StoreDefinition<"video", Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID?: number | undefined;
            readonly label_name?: string | undefined;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frame_filename: string;
                    readonly frame_file_path: string;
                    readonly predictions: {
                        readonly frame_number: number;
                        readonly label: string;
                        readonly confidence: number;
                    };
                };
            } | undefined;
            readonly isDraft?: boolean | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
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
            readonly id: string | number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID?: number | undefined;
            readonly label_name?: string | undefined;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frame_filename: string;
                    readonly frame_file_path: string;
                    readonly predictions: {
                        readonly frame_number: number;
                        readonly label: string;
                        readonly confidence: number;
                    };
                };
            } | undefined;
            readonly isDraft?: boolean | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
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
    draftSegment: Readonly<Ref<{
        readonly start: number;
        readonly end: number | null;
        readonly id: string | number;
        readonly label: string;
        readonly startTime: number;
        readonly endTime: number | null;
    } | null, {
        readonly start: number;
        readonly end: number | null;
        readonly id: string | number;
        readonly label: string;
        readonly startTime: number;
        readonly endTime: number | null;
    } | null>>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    videoStreamUrl: ComputedRef<string>;
    timelineSegments: ComputedRef<{
        id: string | number;
        label: string;
        label_display: string;
        name: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        video_id: number | undefined;
        label_id: number | undefined;
    }[]>;
    hasRawVideoFile: Readonly<Ref<boolean | null, boolean | null>>;
    buildVideoStreamUrl: (id: string | number) => string;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: number) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: number) => Promise<void>;
    fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
    createSegment: (videoId: string, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    patchSegmentLocally: (id: string | number, updates: Partial<Segment>) => void;
    updateSegment: (segmentId: string | number, updates: SegmentUpdatePayload) => Promise<boolean>;
    deleteSegment: (segmentId: string | number) => Promise<boolean>;
    removeSegment: (segmentId: number) => void;
    saveAnnotations: () => Promise<void>;
    uploadRevert: (uniqueFileId: string, load: UploadLoadCallback, error: UploadErrorCallback) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: UploadLoadCallback, error: UploadErrorCallback) => void;
    getSegmentStyle: (segment: Segment, videoDuration: number) => SegmentStyle;
    getColorForLabel: typeof getColorForLabel;
    getTranslationForLabel: typeof getTranslationForLabel;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: string | number | null) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSensitiveMeta: (payload: any) => Promise<boolean>;
    clearVideoMeta: () => void;
    hasRawVideoFileFn: () => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "videoUrl" | "errorMessage" | "videos" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta" | "draftSegment" | "hasRawVideoFile">, Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID?: number | undefined;
            readonly label_name?: string | undefined;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frame_filename: string;
                    readonly frame_file_path: string;
                    readonly predictions: {
                        readonly frame_number: number;
                        readonly label: string;
                        readonly confidence: number;
                    };
                };
            } | undefined;
            readonly isDraft?: boolean | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
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
            readonly id: string | number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID?: number | undefined;
            readonly label_name?: string | undefined;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frame_filename: string;
                    readonly frame_file_path: string;
                    readonly predictions: {
                        readonly frame_number: number;
                        readonly label: string;
                        readonly confidence: number;
                    };
                };
            } | undefined;
            readonly isDraft?: boolean | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
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
    draftSegment: Readonly<Ref<{
        readonly start: number;
        readonly end: number | null;
        readonly id: string | number;
        readonly label: string;
        readonly startTime: number;
        readonly endTime: number | null;
    } | null, {
        readonly start: number;
        readonly end: number | null;
        readonly id: string | number;
        readonly label: string;
        readonly startTime: number;
        readonly endTime: number | null;
    } | null>>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    videoStreamUrl: ComputedRef<string>;
    timelineSegments: ComputedRef<{
        id: string | number;
        label: string;
        label_display: string;
        name: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        video_id: number | undefined;
        label_id: number | undefined;
    }[]>;
    hasRawVideoFile: Readonly<Ref<boolean | null, boolean | null>>;
    buildVideoStreamUrl: (id: string | number) => string;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: number) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: number) => Promise<void>;
    fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
    createSegment: (videoId: string, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    patchSegmentLocally: (id: string | number, updates: Partial<Segment>) => void;
    updateSegment: (segmentId: string | number, updates: SegmentUpdatePayload) => Promise<boolean>;
    deleteSegment: (segmentId: string | number) => Promise<boolean>;
    removeSegment: (segmentId: number) => void;
    saveAnnotations: () => Promise<void>;
    uploadRevert: (uniqueFileId: string, load: UploadLoadCallback, error: UploadErrorCallback) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: UploadLoadCallback, error: UploadErrorCallback) => void;
    getSegmentStyle: (segment: Segment, videoDuration: number) => SegmentStyle;
    getColorForLabel: typeof getColorForLabel;
    getTranslationForLabel: typeof getTranslationForLabel;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: string | number | null) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSensitiveMeta: (payload: any) => Promise<boolean>;
    clearVideoMeta: () => void;
    hasRawVideoFileFn: () => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "segments" | "duration" | "labels" | "allSegments" | "activeSegment" | "hasVideo" | "videoStreamUrl" | "timelineSegments">, Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID?: number | undefined;
            readonly label_name?: string | undefined;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frame_filename: string;
                    readonly frame_file_path: string;
                    readonly predictions: {
                        readonly frame_number: number;
                        readonly label: string;
                        readonly confidence: number;
                    };
                };
            } | undefined;
            readonly isDraft?: boolean | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
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
            readonly id: string | number;
            readonly label: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly videoID?: number | undefined;
            readonly labelID?: number | undefined;
            readonly label_name?: string | undefined;
            readonly frames?: {
                readonly [x: string]: {
                    readonly frame_filename: string;
                    readonly frame_file_path: string;
                    readonly predictions: {
                        readonly frame_number: number;
                        readonly label: string;
                        readonly confidence: number;
                    };
                };
            } | undefined;
            readonly isDraft?: boolean | undefined;
            readonly color?: string | undefined;
            readonly startFrameNumber?: number | undefined;
            readonly endFrameNumber?: number | undefined;
            readonly usingFPS?: boolean | undefined;
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
    draftSegment: Readonly<Ref<{
        readonly start: number;
        readonly end: number | null;
        readonly id: string | number;
        readonly label: string;
        readonly startTime: number;
        readonly endTime: number | null;
    } | null, {
        readonly start: number;
        readonly end: number | null;
        readonly id: string | number;
        readonly label: string;
        readonly startTime: number;
        readonly endTime: number | null;
    } | null>>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    videoStreamUrl: ComputedRef<string>;
    timelineSegments: ComputedRef<{
        id: string | number;
        label: string;
        label_display: string;
        name: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        video_id: number | undefined;
        label_id: number | undefined;
    }[]>;
    hasRawVideoFile: Readonly<Ref<boolean | null, boolean | null>>;
    buildVideoStreamUrl: (id: string | number) => string;
    setCurrentVideo: (videoId: number) => VideoAnnotation | null;
    clearVideo: () => void;
    deleteVideo: (videoId: number | null) => Promise<boolean>;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: number) => Promise<void>;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: number) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchLabels: () => Promise<LabelMeta[]>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: number) => Promise<void>;
    fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
    createSegment: (videoId: string, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
    patchSegmentLocally: (id: string | number, updates: Partial<Segment>) => void;
    updateSegment: (segmentId: string | number, updates: SegmentUpdatePayload) => Promise<boolean>;
    deleteSegment: (segmentId: string | number) => Promise<boolean>;
    removeSegment: (segmentId: number) => void;
    saveAnnotations: () => Promise<void>;
    uploadRevert: (uniqueFileId: string, load: UploadLoadCallback, error: UploadErrorCallback) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: UploadLoadCallback, error: UploadErrorCallback) => void;
    getSegmentStyle: (segment: Segment, videoDuration: number) => SegmentStyle;
    getColorForLabel: typeof getColorForLabel;
    getTranslationForLabel: typeof getTranslationForLabel;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: string | number | null) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSensitiveMeta: (payload: any) => Promise<boolean>;
    clearVideoMeta: () => void;
    hasRawVideoFileFn: () => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "buildVideoStreamUrl" | "setCurrentVideo" | "clearVideo" | "deleteVideo" | "setVideo" | "loadVideo" | "fetchVideoUrl" | "fetchAllSegments" | "fetchAllVideos" | "fetchLabels" | "fetchVideoMeta" | "fetchVideoSegments" | "fetchSegmentsByLabel" | "createSegment" | "patchSegmentLocally" | "updateSegment" | "deleteSegment" | "removeSegment" | "saveAnnotations" | "uploadRevert" | "uploadProcess" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "setActiveSegment" | "updateVideoStatus" | "assignUserToVideo" | "updateSensitiveMeta" | "clearVideoMeta" | "hasRawVideoFileFn" | "startDraft" | "updateDraftEnd" | "commitDraft" | "cancelDraft" | "createFiveSecondSegment" | "formatTime" | "getSegmentOptions" | "clearSegments">>;
export type { Video, Segment, VideoAnnotation, VideoMeta, LabelMeta, VideoList, DraftSegment, SegmentOption, SegmentStyle, VideoStatus, LabelKey, BackendFramePrediction };
