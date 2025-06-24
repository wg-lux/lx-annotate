import { type Ref, type ComputedRef } from 'vue';
import { type FrontendSegment } from '../utils/caseConversion';
/**
 * Translation map for label names (German translations)
 */
type LabelKey = 'appendix' | 'blood' | 'diverticule' | 'grasper' | 'ileocaecalvalve' | 'ileum' | 'low_quality' | 'nbi' | 'needle' | 'outside' | 'polyp' | 'snare' | 'water_jet' | 'wound';
/**
 * Video status types
 */
type VideoStatus = 'in_progress' | 'available' | 'completed';
/**
 * Segment interface for internal store usage
 */
interface Segment extends FrontendSegment {
    id: string | number;
    label: string;
    label_name: string;
    label_display: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
    video_id?: number;
    label_id?: number;
    start_frame_number?: number;
    end_frame_number?: number;
    start_time?: number;
    end_time?: number;
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
    label: string;
    label_display: string;
    startTime: number;
    endTime: number | null;
    start_time: number;
    end_time: number | null;
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
    currentVideo: Readonly<Ref<{
        readonly id: string | number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly label_name: string;
            readonly label_display: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly video_id?: number | undefined;
            readonly label_id?: number | undefined;
            readonly start_frame_number?: number | undefined;
            readonly end_frame_number?: number | undefined;
            readonly start_time?: number | undefined;
            readonly end_time?: number | undefined;
            readonly segmentId?: number | undefined;
            readonly segmentStart?: number | undefined;
            readonly segmentEnd?: number | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
    } | null, {
        readonly id: string | number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly label_name: string;
            readonly label_display: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly video_id?: number | undefined;
            readonly label_id?: number | undefined;
            readonly start_frame_number?: number | undefined;
            readonly end_frame_number?: number | undefined;
            readonly start_time?: number | undefined;
            readonly end_time?: number | undefined;
            readonly segmentId?: number | undefined;
            readonly segmentStart?: number | undefined;
            readonly segmentEnd?: number | undefined;
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
    } | null>>;
    allSegments: ComputedRef<Segment[]>;
    draftSegment: Readonly<Ref<{
        readonly start: number;
        readonly end: number | null;
        readonly label: string;
        readonly label_display: string;
        readonly startTime: number;
        readonly endTime: number | null;
        readonly start_time: number;
        readonly end_time: number | null;
    } | null, {
        readonly start: number;
        readonly end: number | null;
        readonly label: string;
        readonly label_display: string;
        readonly startTime: number;
        readonly endTime: number | null;
        readonly start_time: number;
        readonly end_time: number | null;
    } | null>>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: string) => Promise<void>;
    createSegment: (videoId: string, labelName: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegment: (segmentId: string | number, updates: SegmentUpdatePayload) => Promise<boolean>;
    deleteSegment: (segmentId: string | number) => Promise<boolean>;
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
    startDraft: (label: string, startTime: number, labelDisplay?: string) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
    loadVideo: (videoId: string) => Promise<void>;
}, "errorMessage" | "videoUrl" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta" | "draftSegment">>, Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: string | number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly label_name: string;
            readonly label_display: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly video_id?: number | undefined;
            readonly label_id?: number | undefined;
            readonly start_frame_number?: number | undefined;
            readonly end_frame_number?: number | undefined;
            readonly start_time?: number | undefined;
            readonly end_time?: number | undefined;
            readonly segmentId?: number | undefined;
            readonly segmentStart?: number | undefined;
            readonly segmentEnd?: number | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
    } | null, {
        readonly id: string | number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly label_name: string;
            readonly label_display: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly video_id?: number | undefined;
            readonly label_id?: number | undefined;
            readonly start_frame_number?: number | undefined;
            readonly end_frame_number?: number | undefined;
            readonly start_time?: number | undefined;
            readonly end_time?: number | undefined;
            readonly segmentId?: number | undefined;
            readonly segmentStart?: number | undefined;
            readonly segmentEnd?: number | undefined;
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
    } | null>>;
    allSegments: ComputedRef<Segment[]>;
    draftSegment: Readonly<Ref<{
        readonly start: number;
        readonly end: number | null;
        readonly label: string;
        readonly label_display: string;
        readonly startTime: number;
        readonly endTime: number | null;
        readonly start_time: number;
        readonly end_time: number | null;
    } | null, {
        readonly start: number;
        readonly end: number | null;
        readonly label: string;
        readonly label_display: string;
        readonly startTime: number;
        readonly endTime: number | null;
        readonly start_time: number;
        readonly end_time: number | null;
    } | null>>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: string) => Promise<void>;
    createSegment: (videoId: string, labelName: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegment: (segmentId: string | number, updates: SegmentUpdatePayload) => Promise<boolean>;
    deleteSegment: (segmentId: string | number) => Promise<boolean>;
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
    startDraft: (label: string, startTime: number, labelDisplay?: string) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
    loadVideo: (videoId: string) => Promise<void>;
}, "segments" | "duration" | "labels" | "allSegments" | "activeSegment" | "hasVideo">, Pick<{
    currentVideo: Readonly<Ref<{
        readonly id: string | number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly label_name: string;
            readonly label_display: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly video_id?: number | undefined;
            readonly label_id?: number | undefined;
            readonly start_frame_number?: number | undefined;
            readonly end_frame_number?: number | undefined;
            readonly start_time?: number | undefined;
            readonly end_time?: number | undefined;
            readonly segmentId?: number | undefined;
            readonly segmentStart?: number | undefined;
            readonly segmentEnd?: number | undefined;
        }[];
        readonly videoUrl: string;
        readonly status: VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
    } | null, {
        readonly id: string | number;
        readonly isAnnotated: boolean;
        readonly errorMessage: string;
        readonly segments: readonly {
            readonly id: string | number;
            readonly label: string;
            readonly label_name: string;
            readonly label_display: string;
            readonly startTime: number;
            readonly endTime: number;
            readonly avgConfidence: number;
            readonly video_id?: number | undefined;
            readonly label_id?: number | undefined;
            readonly start_frame_number?: number | undefined;
            readonly end_frame_number?: number | undefined;
            readonly start_time?: number | undefined;
            readonly end_time?: number | undefined;
            readonly segmentId?: number | undefined;
            readonly segmentStart?: number | undefined;
            readonly segmentEnd?: number | undefined;
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
    } | null>>;
    allSegments: ComputedRef<Segment[]>;
    draftSegment: Readonly<Ref<{
        readonly start: number;
        readonly end: number | null;
        readonly label: string;
        readonly label_display: string;
        readonly startTime: number;
        readonly endTime: number | null;
        readonly start_time: number;
        readonly end_time: number | null;
    } | null, {
        readonly start: number;
        readonly end: number | null;
        readonly label: string;
        readonly label_display: string;
        readonly startTime: number;
        readonly endTime: number | null;
        readonly start_time: number;
        readonly end_time: number | null;
    } | null>>;
    activeSegment: ComputedRef<Segment | null>;
    duration: ComputedRef<number>;
    hasVideo: ComputedRef<boolean>;
    segments: ComputedRef<Segment[]>;
    labels: ComputedRef<LabelMeta[]>;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: (videoId?: string | number) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    fetchAllVideos: () => Promise<VideoList>;
    fetchVideoMeta: (lastId?: string) => Promise<any>;
    fetchVideoSegments: (videoId: string) => Promise<void>;
    createSegment: (videoId: string, labelName: string, startTime: number, endTime: number) => Promise<Segment | null>;
    updateSegment: (segmentId: string | number, updates: SegmentUpdatePayload) => Promise<boolean>;
    deleteSegment: (segmentId: string | number) => Promise<boolean>;
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
    startDraft: (label: string, startTime: number, labelDisplay?: string) => void;
    updateDraftEnd: (endTime: number) => void;
    commitDraft: () => Promise<Segment | null>;
    cancelDraft: () => void;
    createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
    formatTime: (seconds: number) => string;
    getSegmentOptions: () => SegmentOption[];
    clearSegments: () => void;
    loadVideo: (videoId: string) => Promise<void>;
}, "clearVideo" | "setVideo" | "fetchVideoUrl" | "fetchAllSegments" | "fetchAllVideos" | "fetchVideoMeta" | "fetchVideoSegments" | "createSegment" | "updateSegment" | "deleteSegment" | "saveAnnotations" | "uploadRevert" | "uploadProcess" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "setActiveSegment" | "updateVideoStatus" | "assignUserToVideo" | "startDraft" | "updateDraftEnd" | "commitDraft" | "cancelDraft" | "createFiveSecondSegment" | "formatTime" | "getSegmentOptions" | "clearSegments" | "loadVideo">>;
export type { Segment, VideoAnnotation, VideoMeta, LabelMeta, VideoList, DraftSegment, SegmentOption, SegmentStyle, VideoStatus, LabelKey };
