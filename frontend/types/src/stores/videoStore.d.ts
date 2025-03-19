export interface Segment {
    id: string;
    label: string;
    label_display: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
}
export interface VideoAnnotation {
    isAnnotated: boolean;
    errorMessage: string;
    segments: Segment[];
    videoUrl: string;
    videoID: string;
}
export interface VideoLabelResponse {
    label: string;
    time_segments: Array<{
        segment_start: number;
        segment_end: number;
        start_time: number;
        end_time: number;
        frames: Record<string, {
            frame_filename: string;
            frame_file_path: string;
            predictions: Record<string, number>;
        }>;
    }>;
}
export interface VideoMeta {
    videoID: string;
    originalFileName: string;
}
export interface LabelMeta {
    id: string;
    name: string;
}
export interface VideoList {
    videos: VideoMeta[];
    labels: LabelMeta[];
}
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
        videoID: string;
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
        videoID: string;
    } | null>;
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segmentsByLabel: import("vue").Ref<Record<string, Segment[]>, Record<string, Segment[]>>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    videoList: import("vue").Ref<{
        videos: {
            videoID: string;
            originalFileName: string;
        }[];
        labels: {
            id: string;
            name: string;
        }[];
    }, VideoList | {
        videos: {
            videoID: string;
            originalFileName: string;
        }[];
        labels: {
            id: string;
            name: string;
        }[];
    }>;
    fetchAllVideos: () => void;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: () => Promise<void>;
    fetchSegmentsByLabel: (videoID: string, label?: string) => Promise<void>;
    fetchAllSegments: (videoID: string) => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
}, "errorMessage" | "videoUrl" | "currentVideo" | "segmentsByLabel" | "videoList">>, Pick<{
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
        videoID: string;
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
        videoID: string;
    } | null>;
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segmentsByLabel: import("vue").Ref<Record<string, Segment[]>, Record<string, Segment[]>>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    videoList: import("vue").Ref<{
        videos: {
            videoID: string;
            originalFileName: string;
        }[];
        labels: {
            id: string;
            name: string;
        }[];
    }, VideoList | {
        videos: {
            videoID: string;
            originalFileName: string;
        }[];
        labels: {
            id: string;
            name: string;
        }[];
    }>;
    fetchAllVideos: () => void;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: () => Promise<void>;
    fetchSegmentsByLabel: (videoID: string, label?: string) => Promise<void>;
    fetchAllSegments: (videoID: string) => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
}, "allSegments">, Pick<{
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
        videoID: string;
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
        videoID: string;
    } | null>;
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segmentsByLabel: import("vue").Ref<Record<string, Segment[]>, Record<string, Segment[]>>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    videoList: import("vue").Ref<{
        videos: {
            videoID: string;
            originalFileName: string;
        }[];
        labels: {
            id: string;
            name: string;
        }[];
    }, VideoList | {
        videos: {
            videoID: string;
            originalFileName: string;
        }[];
        labels: {
            id: string;
            name: string;
        }[];
    }>;
    fetchAllVideos: () => void;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: () => Promise<void>;
    fetchSegmentsByLabel: (videoID: string, label?: string) => Promise<void>;
    fetchAllSegments: (videoID: string) => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
}, "fetchAllVideos" | "uploadRevert" | "uploadProcess" | "clearVideo" | "setVideo" | "fetchVideoUrl" | "fetchSegmentsByLabel" | "fetchAllSegments" | "saveAnnotations" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment">>;
