import { type Ref, type ComputedRef } from 'vue';
/**
 * Translation map for label names (German translations)
 */
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
    id: string | number;
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
export declare const useVideoStore: import("pinia").StoreDefinition<"video", import("pinia")._UnwrapAll<Pick<{
    currentVideo: import("vue").Ref<{
        isAnnotated: boolean;
        errorMessage: string;
        segments: {
            id: string;
            label: string;
            label_display: string;
            startTime: number;
            endTime: number;
            avgConfidence: number;
        }[];
        videoUrl: string;
        id: string;
        status: 'in_progress' | 'available' | 'completed';
        assignedUser: string | null;
    } | null, VideoAnnotation | {
        isAnnotated: boolean;
        errorMessage: string;
        segments: {
            id: string;
            label: string;
            label_display: string;
            startTime: number;
            endTime: number;
            avgConfidence: number;
        }[];
        videoUrl: string;
        id: string;
        status: 'in_progress' | 'available' | 'completed';
        assignedUser: string | null;
    } | null>;
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segmentsByLabel: import("vue").Ref<Record<string, Segment[]>, Record<string, Segment[]>>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    videoList: import("vue").Ref<{
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }, VideoList | {
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }>;
    videoMeta: import("vue").Ref<{
        id: number;
        originalFileName: string;
        file: string | null;
        videoUrl: string | null;
        fullVideoPath: string | null;
        sensitiveMetaId: number;
        patientFirstName: string | null;
        patientLastName: string | null;
        patientDob: string | null;
        examinationDate: string | null;
        duration: number | null;
    } | null, VideoFileMeta | {
        id: number;
        originalFileName: string;
        file: string | null;
        videoUrl: string | null;
        fullVideoPath: string | null;
        sensitiveMetaId: number;
        patientFirstName: string | null;
        patientLastName: string | null;
        patientDob: string | null;
        examinationDate: string | null;
        duration: number | null;
    } | null>;
    hasVideo: import("vue").ComputedRef<boolean>;
    duration: import("vue").ComputedRef<number>;
    fetchVideoMeta: (id: number) => Promise<void>;
    updateSensitiveMeta: (payload: SensitiveMetaUpdatePayload) => Promise<void>;
    clearVideoMeta: () => void;
    fetchAllVideos: () => void;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: string) => Promise<void>;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: string) => Promise<void>;
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
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: string | number | null) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSegment: (id: string, partial: Partial<Segment>) => void;
}, "errorMessage" | "videoUrl" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta">>, Pick<{
    currentVideo: import("vue").Ref<{
        isAnnotated: boolean;
        errorMessage: string;
        segments: {
            id: string;
            label: string;
            label_display: string;
            startTime: number;
            endTime: number;
            avgConfidence: number;
        }[];
        videoUrl: string;
        id: string;
        status: 'in_progress' | 'available' | 'completed';
        assignedUser: string | null;
    } | null, VideoAnnotation | {
        isAnnotated: boolean;
        errorMessage: string;
        segments: {
            id: string;
            label: string;
            label_display: string;
            startTime: number;
            endTime: number;
            avgConfidence: number;
        }[];
        videoUrl: string;
        id: string;
        status: 'in_progress' | 'available' | 'completed';
        assignedUser: string | null;
    } | null>;
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segmentsByLabel: import("vue").Ref<Record<string, Segment[]>, Record<string, Segment[]>>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    videoList: import("vue").Ref<{
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }, VideoList | {
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }>;
    videoMeta: import("vue").Ref<{
        id: number;
        originalFileName: string;
        file: string | null;
        videoUrl: string | null;
        fullVideoPath: string | null;
        sensitiveMetaId: number;
        patientFirstName: string | null;
        patientLastName: string | null;
        patientDob: string | null;
        examinationDate: string | null;
        duration: number | null;
    } | null, VideoFileMeta | {
        id: number;
        originalFileName: string;
        file: string | null;
        videoUrl: string | null;
        fullVideoPath: string | null;
        sensitiveMetaId: number;
        patientFirstName: string | null;
        patientLastName: string | null;
        patientDob: string | null;
        examinationDate: string | null;
        duration: number | null;
    } | null>;
    hasVideo: import("vue").ComputedRef<boolean>;
    duration: import("vue").ComputedRef<number>;
    fetchVideoMeta: (id: number) => Promise<void>;
    updateSensitiveMeta: (payload: SensitiveMetaUpdatePayload) => Promise<void>;
    clearVideoMeta: () => void;
    fetchAllVideos: () => void;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: string) => Promise<void>;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: string) => Promise<void>;
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
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: string | number | null) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSegment: (id: string, partial: Partial<Segment>) => void;
}, "duration" | "allSegments" | "hasVideo">, Pick<{
    currentVideo: import("vue").Ref<{
        isAnnotated: boolean;
        errorMessage: string;
        segments: {
            id: string;
            label: string;
            label_display: string;
            startTime: number;
            endTime: number;
            avgConfidence: number;
        }[];
        videoUrl: string;
        id: string;
        status: 'in_progress' | 'available' | 'completed';
        assignedUser: string | null;
    } | null, VideoAnnotation | {
        isAnnotated: boolean;
        errorMessage: string;
        segments: {
            id: string;
            label: string;
            label_display: string;
            startTime: number;
            endTime: number;
            avgConfidence: number;
        }[];
        videoUrl: string;
        id: string;
        status: 'in_progress' | 'available' | 'completed';
        assignedUser: string | null;
    } | null>;
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segmentsByLabel: import("vue").Ref<Record<string, Segment[]>, Record<string, Segment[]>>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    videoList: import("vue").Ref<{
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }, VideoList | {
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        readonly labels: readonly {
            readonly id: number;
            readonly name: string;
            readonly color?: string | undefined;
        }[];
    }>;
    videoMeta: import("vue").Ref<{
        id: number;
        originalFileName: string;
        file: string | null;
        videoUrl: string | null;
        fullVideoPath: string | null;
        sensitiveMetaId: number;
        patientFirstName: string | null;
        patientLastName: string | null;
        patientDob: string | null;
        examinationDate: string | null;
        duration: number | null;
    } | null, VideoFileMeta | {
        id: number;
        originalFileName: string;
        file: string | null;
        videoUrl: string | null;
        fullVideoPath: string | null;
        sensitiveMetaId: number;
        patientFirstName: string | null;
        patientLastName: string | null;
        patientDob: string | null;
        examinationDate: string | null;
        duration: number | null;
    } | null>;
    hasVideo: import("vue").ComputedRef<boolean>;
    duration: import("vue").ComputedRef<number>;
    fetchVideoMeta: (id: number) => Promise<void>;
    updateSensitiveMeta: (payload: SensitiveMetaUpdatePayload) => Promise<void>;
    clearVideoMeta: () => void;
    fetchAllVideos: () => void;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    loadVideo: (videoId: string) => Promise<void>;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: string) => Promise<void>;
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
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    setActiveSegment: (segmentId: string | number | null) => void;
    updateVideoStatus: (status: VideoStatus) => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSensitiveMeta: (payload: any) => Promise<boolean>;
    clearVideoMeta: () => void;
    startDraft: (label: string, startTime: number) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
}, "clearVideo" | "setVideo" | "loadVideo" | "fetchVideoUrl" | "fetchAllSegments" | "fetchAllVideos" | "fetchVideoMeta" | "fetchVideoSegments" | "fetchSegmentsByLabel" | "createSegment" | "patchSegmentLocally" | "updateSegment" | "deleteSegment" | "removeSegment" | "saveAnnotations" | "uploadRevert" | "uploadProcess" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "setActiveSegment" | "updateVideoStatus" | "assignUserToVideo" | "updateSensitiveMeta" | "clearVideoMeta" | "startDraft" | "updateDraftEnd" | "commitDraft" | "cancelDraft" | "createFiveSecondSegment" | "formatTime" | "getSegmentOptions" | "clearSegments">>;
export type { Segment, VideoAnnotation, VideoMeta, LabelMeta, VideoList, DraftSegment, SegmentOption, SegmentStyle, VideoStatus, LabelKey, BackendFramePrediction };
