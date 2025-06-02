declare const _default: import("vue").DefineComponent<{}, {
    videoStore: import("pinia").Store<"video", import("pinia")._UnwrapAll<Pick<{
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
            status: "in_progress" | "available" | "completed";
            assignedUser: string | null;
        } | null, import("@/stores/videoStore").VideoAnnotation | {
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
            status: "in_progress" | "available" | "completed";
            assignedUser: string | null;
        } | null>;
        errorMessage: import("vue").Ref<string, string>;
        videoUrl: import("vue").Ref<string, string>;
        segmentsByLabel: import("vue").Ref<Record<string, import("@/stores/videoStore").Segment[]>, Record<string, import("@/stores/videoStore").Segment[]>>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
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
        }, import("@/stores/videoStore").VideoList | {
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
        } | null, import("@/stores/videoStore").VideoFileMeta | {
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
        updateSensitiveMeta: (payload: import("@/stores/videoStore").SensitiveMetaUpdatePayload) => Promise<void>;
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
        setVideo: (video: import("@/stores/videoStore").VideoAnnotation) => void;
        fetchVideoUrl: (videoId?: number | undefined) => Promise<void>;
        fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
        fetchAllSegments: (id: string) => Promise<void>;
        saveAnnotations: () => Promise<void>;
        getSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        getColorForLabel: (label: string) => string;
        getTranslationForLabel: (label: string) => string;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment, videoElement: HTMLVideoElement | null) => void;
        updateVideoStatus: (status: "in_progress" | "available" | "completed") => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSegment: (id: string, partial: Partial<import("@/stores/videoStore").Segment>) => void;
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
            status: "in_progress" | "available" | "completed";
            assignedUser: string | null;
        } | null, import("@/stores/videoStore").VideoAnnotation | {
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
            status: "in_progress" | "available" | "completed";
            assignedUser: string | null;
        } | null>;
        errorMessage: import("vue").Ref<string, string>;
        videoUrl: import("vue").Ref<string, string>;
        segmentsByLabel: import("vue").Ref<Record<string, import("@/stores/videoStore").Segment[]>, Record<string, import("@/stores/videoStore").Segment[]>>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
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
        }, import("@/stores/videoStore").VideoList | {
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
        } | null, import("@/stores/videoStore").VideoFileMeta | {
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
        updateSensitiveMeta: (payload: import("@/stores/videoStore").SensitiveMetaUpdatePayload) => Promise<void>;
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
        setVideo: (video: import("@/stores/videoStore").VideoAnnotation) => void;
        fetchVideoUrl: (videoId?: number | undefined) => Promise<void>;
        fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
        fetchAllSegments: (id: string) => Promise<void>;
        saveAnnotations: () => Promise<void>;
        getSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        getColorForLabel: (label: string) => string;
        getTranslationForLabel: (label: string) => string;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment, videoElement: HTMLVideoElement | null) => void;
        updateVideoStatus: (status: "in_progress" | "available" | "completed") => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSegment: (id: string, partial: Partial<import("@/stores/videoStore").Segment>) => void;
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
            status: "in_progress" | "available" | "completed";
            assignedUser: string | null;
        } | null, import("@/stores/videoStore").VideoAnnotation | {
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
            status: "in_progress" | "available" | "completed";
            assignedUser: string | null;
        } | null>;
        errorMessage: import("vue").Ref<string, string>;
        videoUrl: import("vue").Ref<string, string>;
        segmentsByLabel: import("vue").Ref<Record<string, import("@/stores/videoStore").Segment[]>, Record<string, import("@/stores/videoStore").Segment[]>>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
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
        }, import("@/stores/videoStore").VideoList | {
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
        } | null, import("@/stores/videoStore").VideoFileMeta | {
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
        updateSensitiveMeta: (payload: import("@/stores/videoStore").SensitiveMetaUpdatePayload) => Promise<void>;
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
        setVideo: (video: import("@/stores/videoStore").VideoAnnotation) => void;
        fetchVideoUrl: (videoId?: number | undefined) => Promise<void>;
        fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
        fetchAllSegments: (id: string) => Promise<void>;
        saveAnnotations: () => Promise<void>;
        getSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        getColorForLabel: (label: string) => string;
        getTranslationForLabel: (label: string) => string;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment, videoElement: HTMLVideoElement | null) => void;
        updateVideoStatus: (status: "in_progress" | "available" | "completed") => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSegment: (id: string, partial: Partial<import("@/stores/videoStore").Segment>) => void;
        urlFor: (id: number) => string;
    }, "fetchVideoMeta" | "updateSensitiveMeta" | "clearVideoMeta" | "fetchAllVideos" | "uploadRevert" | "uploadProcess" | "clearVideo" | "setVideo" | "fetchVideoUrl" | "fetchSegmentsByLabel" | "fetchAllSegments" | "saveAnnotations" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "updateVideoStatus" | "assignUserToVideo" | "updateSegment" | "urlFor">>;
    selectedVideoId: import("vue").Ref<number | null, number | null>;
    currentTime: import("vue").Ref<number, number>;
    duration: import("vue").Ref<number, number>;
    videoRef: import("vue").Ref<HTMLVideoElement | null, HTMLVideoElement | null>;
    hasVideos: import("vue").ComputedRef<boolean>;
    currentVideoStreamUrl: import("vue").ComputedRef<string>;
    allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
    onVideoChange: () => void;
    onVideoLoaded: () => void;
    handleTimeUpdate: () => void;
    handleSegmentResize: (id: string, newEnd: number) => void;
    handleTimelineSeek: (time: number) => void;
    formatTime: (seconds: number) => string;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    Timeline: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
        duration: {
            type: NumberConstructor;
            required: true;
        };
    }>, {
        timelineRef: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
        startResize: (segment: import("@/stores/videoStore").Segment, event: MouseEvent | TouchEvent) => void;
        handleTimelineClick: (event: MouseEvent) => void;
        getSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        duration: number;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "resize"[], "resize", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        duration: {
            type: NumberConstructor;
            required: true;
        };
    }>> & Readonly<{
        onResize?: ((...args: any[]) => any) | undefined;
    }>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
