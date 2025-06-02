export interface VideoResponse {
    id: string;
    videoUrl: string;
    status: 'in_progress' | 'available' | 'completed';
    assignedUser: string | null;
    isAnnotated: boolean;
    errorMessage: string;
    segments: Segment[];
}
export interface VideoFileMeta {
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
}
export interface SensitiveMetaUpdatePayload {
    sensitiveMetaId: number;
    patientFirstName: string;
    patientLastName: string;
    patientDob: string;
    examinationDate: string;
}
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
    id: string;
    status: 'in_progress' | 'available' | 'completed';
    assignedUser: string | null;
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
    id: number;
    originalFileName: string;
    status: string;
    assignedUser?: string | null;
    anonymized: boolean;
}
export interface LabelMeta {
    id: number;
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
        labels: {
            id: number;
            name: string;
        }[];
    }, VideoList | {
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        labels: {
            id: number;
            name: string;
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
    fetchAllVideos: () => Promise<{
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        labels: {
            id: number;
            name: string;
        }[];
    }>;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    updateVideoStatus: (status: 'in_progress' | 'available' | 'completed') => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSegment: (id: string, partial: Partial<Segment>) => void;
    urlFor: (id: number) => string;
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
        labels: {
            id: number;
            name: string;
        }[];
    }, VideoList | {
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        labels: {
            id: number;
            name: string;
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
    fetchAllVideos: () => Promise<{
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        labels: {
            id: number;
            name: string;
        }[];
    }>;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    updateVideoStatus: (status: 'in_progress' | 'available' | 'completed') => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSegment: (id: string, partial: Partial<Segment>) => void;
    urlFor: (id: number) => string;
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
        labels: {
            id: number;
            name: string;
        }[];
    }, VideoList | {
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        labels: {
            id: number;
            name: string;
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
    fetchAllVideos: () => Promise<{
        videos: {
            id: number;
            originalFileName: string;
            status: string;
            assignedUser?: string | null | undefined;
            anonymized: boolean;
        }[];
        labels: {
            id: number;
            name: string;
        }[];
    }>;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
    clearVideo: () => void;
    setVideo: (video: VideoAnnotation) => void;
    fetchVideoUrl: (videoId?: number) => Promise<void>;
    fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
    fetchAllSegments: (id: string) => Promise<void>;
    saveAnnotations: () => Promise<void>;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    getColorForLabel: (label: string) => string;
    getTranslationForLabel: (label: string) => string;
    jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
    updateVideoStatus: (status: 'in_progress' | 'available' | 'completed') => Promise<void>;
    assignUserToVideo: (user: string) => Promise<void>;
    updateSegment: (id: string, partial: Partial<Segment>) => void;
    urlFor: (id: number) => string;
}, "fetchVideoMeta" | "updateSensitiveMeta" | "clearVideoMeta" | "fetchAllVideos" | "uploadRevert" | "uploadProcess" | "clearVideo" | "setVideo" | "fetchVideoUrl" | "fetchSegmentsByLabel" | "fetchAllSegments" | "saveAnnotations" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "updateVideoStatus" | "assignUserToVideo" | "updateSegment" | "urlFor">>;
