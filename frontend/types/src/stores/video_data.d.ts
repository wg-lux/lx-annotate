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
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[]>;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: () => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
}, "segments" | "errorMessage" | "currentVideo" | "videoUrl">>, Pick<{
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
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[]>;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: () => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
}, never>, Pick<{
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
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[]>;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: () => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
}, "saveAnnotations" | "fetchVideoUrl" | "getColorForLabel" | "clearVideo" | "setVideo" | "getSegmentStyle" | "getTranslationForLabel" | "jumpToSegment">>;
