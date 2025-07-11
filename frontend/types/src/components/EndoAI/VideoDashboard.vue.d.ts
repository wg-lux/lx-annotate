import { type VideoMeta, type Segment } from '@/stores/videoStore';
interface ROI {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface AnonymizationDetails {
    anonymized: boolean;
    hasROI: boolean;
    roi: ROI;
    outsideFrameCount: number;
    totalFrameCount: number;
    anonymizationProgress?: number;
    lastAnonymizationDate?: string;
}
declare const _default: import("vue").DefineComponent<{}, {}, {
    loading: boolean;
    currentVideoMeta: VideoMeta | null;
    anonymizationFilter: "anonymized" | "all" | "not_anonymized";
    currentVideoAnonymizationDetails: AnonymizationDetails | null;
}, {
    videoStore(): import("pinia").Store<"video", import("pinia")._UnwrapAll<Pick<{
        currentVideo: Readonly<import("vue").Ref<{
            readonly id: string | number;
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
            readonly status: import("@/stores/videoStore").VideoStatus;
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
            readonly status: import("@/stores/videoStore").VideoStatus;
            readonly assignedUser: string | null;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
        } | null>>;
        errorMessage: Readonly<import("vue").Ref<string, string>>;
        videoUrl: Readonly<import("vue").Ref<string, string>>;
        segmentsByLabel: Record<string, Segment[]>;
        videoList: Readonly<import("vue").Ref<{
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
        videoMeta: Readonly<import("vue").Ref<{
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
        videos: import("vue").Ref<{
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        }[], import("@/stores/videoStore").Video[] | {
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        }[]>;
        allSegments: import("vue").ComputedRef<Segment[]>;
        draftSegment: Readonly<import("vue").Ref<{
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
        activeSegment: import("vue").ComputedRef<Segment | null>;
        duration: import("vue").ComputedRef<number>;
        hasVideo: import("vue").ComputedRef<boolean>;
        segments: import("vue").ComputedRef<Segment[]>;
        labels: import("vue").ComputedRef<import("@/stores/videoStore").LabelMeta[]>;
        videoStreamUrl: import("vue").ComputedRef<string>;
        timelineSegments: import("vue").ComputedRef<{
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
        buildVideoStreamUrl: (id: string | number) => string;
        clearVideo: () => void;
        setVideo: (video: import("@/stores/videoStore").VideoAnnotation) => void;
        loadVideo: (videoId: string) => Promise<void>;
        fetchVideoUrl: (videoId?: string | number | undefined) => Promise<void>;
        fetchAllSegments: (id: string) => Promise<void>;
        fetchAllVideos: () => Promise<import("@/stores/videoStore").VideoList>;
        fetchVideoMeta: (lastId?: string | undefined) => Promise<any>;
        fetchVideoSegments: (videoId: string) => Promise<void>;
        fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
        createSegment: (videoId: string, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
        patchSegmentLocally: (id: string | number, updates: Partial<Segment>) => void;
        updateSegment: (segmentId: string | number, updates: import("@/stores/videoStore").SegmentUpdatePayload) => Promise<boolean>;
        deleteSegment: (segmentId: string | number) => Promise<boolean>;
        removeSegment: (segmentId: number) => void;
        saveAnnotations: () => Promise<void>;
        uploadRevert: (uniqueFileId: string, load: (serverFileId?: string | undefined) => void, error: (message: string) => void) => void;
        uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId?: string | undefined) => void, error: (message: string) => void) => void;
        getSegmentStyle: (segment: Segment, videoDuration: number) => import("@/stores/videoStore").SegmentStyle;
        getColorForLabel: typeof import("../../utils/videoUtils.js").getColorForLabel;
        getTranslationForLabel: typeof import("../../utils/videoUtils.js").getTranslationForLabel;
        jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
        setActiveSegment: (segmentId: string | number | null) => void;
        updateVideoStatus: (status: import("@/stores/videoStore").VideoStatus) => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSensitiveMeta: (payload: any) => Promise<boolean>;
        clearVideoMeta: () => void;
        startDraft: (label: string, startTime: number) => void;
        updateDraftEnd: (endTime: number) => void;
        commitDraft: () => Promise<Segment | null>;
        cancelDraft: () => void;
        createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
        formatTime: (seconds: number) => string;
        getSegmentOptions: () => import("@/stores/videoStore").SegmentOption[];
        clearSegments: () => void;
    }, "errorMessage" | "videoUrl" | "videos" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta" | "draftSegment">>, Pick<{
        currentVideo: Readonly<import("vue").Ref<{
            readonly id: string | number;
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
            readonly status: import("@/stores/videoStore").VideoStatus;
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
            readonly status: import("@/stores/videoStore").VideoStatus;
            readonly assignedUser: string | null;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
        } | null>>;
        errorMessage: Readonly<import("vue").Ref<string, string>>;
        videoUrl: Readonly<import("vue").Ref<string, string>>;
        segmentsByLabel: Record<string, Segment[]>;
        videoList: Readonly<import("vue").Ref<{
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
        videoMeta: Readonly<import("vue").Ref<{
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
        videos: import("vue").Ref<{
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        }[], import("@/stores/videoStore").Video[] | {
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        }[]>;
        allSegments: import("vue").ComputedRef<Segment[]>;
        draftSegment: Readonly<import("vue").Ref<{
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
        activeSegment: import("vue").ComputedRef<Segment | null>;
        duration: import("vue").ComputedRef<number>;
        hasVideo: import("vue").ComputedRef<boolean>;
        segments: import("vue").ComputedRef<Segment[]>;
        labels: import("vue").ComputedRef<import("@/stores/videoStore").LabelMeta[]>;
        videoStreamUrl: import("vue").ComputedRef<string>;
        timelineSegments: import("vue").ComputedRef<{
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
        buildVideoStreamUrl: (id: string | number) => string;
        clearVideo: () => void;
        setVideo: (video: import("@/stores/videoStore").VideoAnnotation) => void;
        loadVideo: (videoId: string) => Promise<void>;
        fetchVideoUrl: (videoId?: string | number | undefined) => Promise<void>;
        fetchAllSegments: (id: string) => Promise<void>;
        fetchAllVideos: () => Promise<import("@/stores/videoStore").VideoList>;
        fetchVideoMeta: (lastId?: string | undefined) => Promise<any>;
        fetchVideoSegments: (videoId: string) => Promise<void>;
        fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
        createSegment: (videoId: string, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
        patchSegmentLocally: (id: string | number, updates: Partial<Segment>) => void;
        updateSegment: (segmentId: string | number, updates: import("@/stores/videoStore").SegmentUpdatePayload) => Promise<boolean>;
        deleteSegment: (segmentId: string | number) => Promise<boolean>;
        removeSegment: (segmentId: number) => void;
        saveAnnotations: () => Promise<void>;
        uploadRevert: (uniqueFileId: string, load: (serverFileId?: string | undefined) => void, error: (message: string) => void) => void;
        uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId?: string | undefined) => void, error: (message: string) => void) => void;
        getSegmentStyle: (segment: Segment, videoDuration: number) => import("@/stores/videoStore").SegmentStyle;
        getColorForLabel: typeof import("../../utils/videoUtils.js").getColorForLabel;
        getTranslationForLabel: typeof import("../../utils/videoUtils.js").getTranslationForLabel;
        jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
        setActiveSegment: (segmentId: string | number | null) => void;
        updateVideoStatus: (status: import("@/stores/videoStore").VideoStatus) => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSensitiveMeta: (payload: any) => Promise<boolean>;
        clearVideoMeta: () => void;
        startDraft: (label: string, startTime: number) => void;
        updateDraftEnd: (endTime: number) => void;
        commitDraft: () => Promise<Segment | null>;
        cancelDraft: () => void;
        createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
        formatTime: (seconds: number) => string;
        getSegmentOptions: () => import("@/stores/videoStore").SegmentOption[];
        clearSegments: () => void;
    }, "duration" | "segments" | "labels" | "allSegments" | "activeSegment" | "hasVideo" | "videoStreamUrl" | "timelineSegments">, Pick<{
        currentVideo: Readonly<import("vue").Ref<{
            readonly id: string | number;
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
            readonly status: import("@/stores/videoStore").VideoStatus;
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
            readonly status: import("@/stores/videoStore").VideoStatus;
            readonly assignedUser: string | null;
            readonly duration?: number | undefined;
            readonly fps?: number | undefined;
        } | null>>;
        errorMessage: Readonly<import("vue").Ref<string, string>>;
        videoUrl: Readonly<import("vue").Ref<string, string>>;
        segmentsByLabel: Record<string, Segment[]>;
        videoList: Readonly<import("vue").Ref<{
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
        videoMeta: Readonly<import("vue").Ref<{
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
        videos: import("vue").Ref<{
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        }[], import("@/stores/videoStore").Video[] | {
            [x: string]: any;
            id: number;
            center_name?: string | undefined;
            processor_name?: string | undefined;
            original_file_name?: string | undefined;
            status?: string | undefined;
            video_url?: string | undefined;
        }[]>;
        allSegments: import("vue").ComputedRef<Segment[]>;
        draftSegment: Readonly<import("vue").Ref<{
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
        activeSegment: import("vue").ComputedRef<Segment | null>;
        duration: import("vue").ComputedRef<number>;
        hasVideo: import("vue").ComputedRef<boolean>;
        segments: import("vue").ComputedRef<Segment[]>;
        labels: import("vue").ComputedRef<import("@/stores/videoStore").LabelMeta[]>;
        videoStreamUrl: import("vue").ComputedRef<string>;
        timelineSegments: import("vue").ComputedRef<{
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
        buildVideoStreamUrl: (id: string | number) => string;
        clearVideo: () => void;
        setVideo: (video: import("@/stores/videoStore").VideoAnnotation) => void;
        loadVideo: (videoId: string) => Promise<void>;
        fetchVideoUrl: (videoId?: string | number | undefined) => Promise<void>;
        fetchAllSegments: (id: string) => Promise<void>;
        fetchAllVideos: () => Promise<import("@/stores/videoStore").VideoList>;
        fetchVideoMeta: (lastId?: string | undefined) => Promise<any>;
        fetchVideoSegments: (videoId: string) => Promise<void>;
        fetchSegmentsByLabel: (id: string, label?: string) => Promise<void>;
        createSegment: (videoId: string, label: string, startTime: number, endTime: number) => Promise<Segment | null>;
        patchSegmentLocally: (id: string | number, updates: Partial<Segment>) => void;
        updateSegment: (segmentId: string | number, updates: import("@/stores/videoStore").SegmentUpdatePayload) => Promise<boolean>;
        deleteSegment: (segmentId: string | number) => Promise<boolean>;
        removeSegment: (segmentId: number) => void;
        saveAnnotations: () => Promise<void>;
        uploadRevert: (uniqueFileId: string, load: (serverFileId?: string | undefined) => void, error: (message: string) => void) => void;
        uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId?: string | undefined) => void, error: (message: string) => void) => void;
        getSegmentStyle: (segment: Segment, videoDuration: number) => import("@/stores/videoStore").SegmentStyle;
        getColorForLabel: typeof import("../../utils/videoUtils.js").getColorForLabel;
        getTranslationForLabel: typeof import("../../utils/videoUtils.js").getTranslationForLabel;
        jumpToSegment: (segment: Segment, videoElement: HTMLVideoElement | null) => void;
        setActiveSegment: (segmentId: string | number | null) => void;
        updateVideoStatus: (status: import("@/stores/videoStore").VideoStatus) => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSensitiveMeta: (payload: any) => Promise<boolean>;
        clearVideoMeta: () => void;
        startDraft: (label: string, startTime: number) => void;
        updateDraftEnd: (endTime: number) => void;
        commitDraft: () => Promise<Segment | null>;
        cancelDraft: () => void;
        createFiveSecondSegment: (clickTime: number, label: string) => Promise<Segment | null>;
        formatTime: (seconds: number) => string;
        getSegmentOptions: () => import("@/stores/videoStore").SegmentOption[];
        clearSegments: () => void;
    }, "buildVideoStreamUrl" | "clearVideo" | "setVideo" | "loadVideo" | "fetchVideoUrl" | "fetchAllSegments" | "fetchAllVideos" | "fetchVideoMeta" | "fetchVideoSegments" | "fetchSegmentsByLabel" | "createSegment" | "patchSegmentLocally" | "updateSegment" | "deleteSegment" | "removeSegment" | "saveAnnotations" | "uploadRevert" | "uploadProcess" | "getSegmentStyle" | "getColorForLabel" | "getTranslationForLabel" | "jumpToSegment" | "setActiveSegment" | "updateVideoStatus" | "assignUserToVideo" | "updateSensitiveMeta" | "clearVideoMeta" | "startDraft" | "updateDraftEnd" | "commitDraft" | "cancelDraft" | "createFiveSecondSegment" | "formatTime" | "getSegmentOptions" | "clearSegments">>;
    videoUrl(): string;
    currentVideo(): {
        readonly id: string | number;
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
        readonly status: import("@/stores/videoStore").VideoStatus;
        readonly assignedUser: string | null;
        readonly duration?: number | undefined;
        readonly fps?: number | undefined;
    } | null;
    videoMeta(): {
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
    } | null;
    allSegments(): Segment[];
    videoList(): {
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
    };
    duration(): number;
    sortedSegments(): Segment[];
    filteredVideos(): {
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
    anonymizedCount(): number;
    pendingCount(): number;
    inProgressCount(): number;
}, {
    getColorForLabel(label: string): string;
    getTranslationForLabel(label: string): string;
    refreshData(): Promise<void>;
    selectVideo(video: VideoMeta): Promise<void>;
    loadVideoData(video: VideoMeta): Promise<void>;
    loadAnonymizationDetails(videoId: number): Promise<void>;
    onVideoLoaded(): void;
    startAnonymization(): Promise<void>;
    startAnonymizationForVideo(video: VideoMeta): Promise<void>;
    downloadAnonymizedVideo(): void;
    editROI(): void;
    setAnonymizationFilter(filter: 'all' | 'anonymized' | 'not_anonymized'): void;
    getROIStyle(roi: ROI): {
        position: "relative";
        width: string;
        height: string;
        border: string;
        borderRadius: string;
        backgroundColor: string;
        display: string;
        alignItems: string;
        justifyContent: string;
        margin: string;
    };
    showSegments(video: VideoMeta): void;
    jumpToSegment(segment: Segment): void;
    getSegmentCountForVideo(videoId: string | number): number;
    createTimelineSegmentStyle(segment: Segment, videoDuration: number): Record<string, string>;
    formatTime(seconds: number): string;
    formatDuration(seconds: number | null): string;
    getStatusText(status?: string): string;
    getStatusBadgeClass(status?: string): string;
    getConfidenceClass(confidence: number): string;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
