declare const _default: import("vue").DefineComponent<{}, {
    videoStore: import("pinia").Store<"video", import("pinia")._UnwrapAll<Pick<{
        currentVideo: import("vue").Ref<{
            isAnnotated: boolean;
            errorMessage: string;
            segments: {
                id: string | number;
                label: string;
                label_display: string;
                startTime: number;
                endTime: number;
                avgConfidence: number;
                video_id?: number | undefined;
                label_id?: number | undefined;
                start_frame_number?: number | undefined;
                end_frame_number?: number | undefined;
            }[];
            videoUrl: string;
            id: string;
            status: "in_progress" | "completed" | "available";
            assignedUser: string | null;
        } | null, import("@/stores/videoStore").VideoAnnotation | {
            isAnnotated: boolean;
            errorMessage: string;
            segments: {
                id: string | number;
                label: string;
                label_display: string;
                startTime: number;
                endTime: number;
                avgConfidence: number;
                video_id?: number | undefined;
                label_id?: number | undefined;
                start_frame_number?: number | undefined;
                end_frame_number?: number | undefined;
            }[];
            videoUrl: string;
            id: string;
            status: "in_progress" | "completed" | "available";
            assignedUser: string | null;
        } | null>;
        errorMessage: import("vue").Ref<string, string>;
        videoUrl: import("vue").Ref<string, string>;
        segmentsByLabel: Record<string, import("@/stores/videoStore").Segment[]>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
        videoList: import("vue").Ref<{
            videos: {
                id: number;
                originalFileName: string;
                status: string;
                assignedUser?: string | null | undefined;
                anonymized: boolean;
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
        activeSegmentId: import("vue").Ref<string | number | null, string | number | null>;
        activeSegment: import("vue").ComputedRef<import("@/stores/videoStore").Segment | null>;
        segmentOptions: import("vue").ComputedRef<{
            id: string | number;
            label: string;
            startTime: number;
            endTime: number;
            display: string;
        }[]>;
        setActiveSegment: (segmentId: string | number | null) => void;
        formatTime: (seconds: number) => string;
        getColorForLabel: (label: string) => string;
        fetchVideoMeta: (lastId?: number | undefined) => Promise<import("@/stores/videoStore").VideoFileMeta | null>;
        updateSensitiveMeta: (payload: import("@/stores/videoStore").SensitiveMetaUpdatePayload) => Promise<boolean>;
        clearVideoMeta: () => void;
        fetchAllVideos: () => Promise<{
            videos: {
                id: number;
                originalFileName: string;
                status: string;
                assignedUser?: string | null | undefined;
                anonymized: boolean;
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
        getEnhancedSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        getTranslationForLabel: (label: string) => string;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment, videoElement: HTMLVideoElement | null) => void;
        updateVideoStatus: (status: "in_progress" | "completed" | "available") => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSegment: (segmentId: string | number, updates: Partial<import("@/stores/videoStore").Segment>) => void;
        urlFor: (path: string) => string;
        getSegmentOptions: () => any[];
        clearSegments: () => void;
        fetchVideoSegments: (videoId: string) => Promise<void>;
        createSegment: (videoId: string, labelName: string, startTime: number, endTime: number) => Promise<import("@/stores/videoStore").Segment | null>;
        updateSegmentAPI: (segmentId: number, updates: Partial<import("@/stores/videoStore").Segment>) => Promise<boolean>;
        deleteSegment: (segmentId: number) => Promise<boolean>;
    }, "errorMessage" | "videoUrl" | "currentVideo" | "segmentsByLabel" | "videoList" | "videoMeta" | "activeSegmentId">>, Pick<{
        currentVideo: import("vue").Ref<{
            isAnnotated: boolean;
            errorMessage: string;
            segments: {
                id: string | number;
                label: string;
                label_display: string;
                startTime: number;
                endTime: number;
                avgConfidence: number;
                video_id?: number | undefined;
                label_id?: number | undefined;
                start_frame_number?: number | undefined;
                end_frame_number?: number | undefined;
            }[];
            videoUrl: string;
            id: string;
            status: "in_progress" | "completed" | "available";
            assignedUser: string | null;
        } | null, import("@/stores/videoStore").VideoAnnotation | {
            isAnnotated: boolean;
            errorMessage: string;
            segments: {
                id: string | number;
                label: string;
                label_display: string;
                startTime: number;
                endTime: number;
                avgConfidence: number;
                video_id?: number | undefined;
                label_id?: number | undefined;
                start_frame_number?: number | undefined;
                end_frame_number?: number | undefined;
            }[];
            videoUrl: string;
            id: string;
            status: "in_progress" | "completed" | "available";
            assignedUser: string | null;
        } | null>;
        errorMessage: import("vue").Ref<string, string>;
        videoUrl: import("vue").Ref<string, string>;
        segmentsByLabel: Record<string, import("@/stores/videoStore").Segment[]>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
        videoList: import("vue").Ref<{
            videos: {
                id: number;
                originalFileName: string;
                status: string;
                assignedUser?: string | null | undefined;
                anonymized: boolean;
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
        activeSegmentId: import("vue").Ref<string | number | null, string | number | null>;
        activeSegment: import("vue").ComputedRef<import("@/stores/videoStore").Segment | null>;
        segmentOptions: import("vue").ComputedRef<{
            id: string | number;
            label: string;
            startTime: number;
            endTime: number;
            display: string;
        }[]>;
        setActiveSegment: (segmentId: string | number | null) => void;
        formatTime: (seconds: number) => string;
        getColorForLabel: (label: string) => string;
        fetchVideoMeta: (lastId?: number | undefined) => Promise<import("@/stores/videoStore").VideoFileMeta | null>;
        updateSensitiveMeta: (payload: import("@/stores/videoStore").SensitiveMetaUpdatePayload) => Promise<boolean>;
        clearVideoMeta: () => void;
        fetchAllVideos: () => Promise<{
            videos: {
                id: number;
                originalFileName: string;
                status: string;
                assignedUser?: string | null | undefined;
                anonymized: boolean;
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
        getEnhancedSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        getTranslationForLabel: (label: string) => string;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment, videoElement: HTMLVideoElement | null) => void;
        updateVideoStatus: (status: "in_progress" | "completed" | "available") => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSegment: (segmentId: string | number, updates: Partial<import("@/stores/videoStore").Segment>) => void;
        urlFor: (path: string) => string;
        getSegmentOptions: () => any[];
        clearSegments: () => void;
        fetchVideoSegments: (videoId: string) => Promise<void>;
        createSegment: (videoId: string, labelName: string, startTime: number, endTime: number) => Promise<import("@/stores/videoStore").Segment | null>;
        updateSegmentAPI: (segmentId: number, updates: Partial<import("@/stores/videoStore").Segment>) => Promise<boolean>;
        deleteSegment: (segmentId: number) => Promise<boolean>;
    }, "duration" | "allSegments" | "hasVideo" | "activeSegment" | "segmentOptions">, Pick<{
        currentVideo: import("vue").Ref<{
            isAnnotated: boolean;
            errorMessage: string;
            segments: {
                id: string | number;
                label: string;
                label_display: string;
                startTime: number;
                endTime: number;
                avgConfidence: number;
                video_id?: number | undefined;
                label_id?: number | undefined;
                start_frame_number?: number | undefined;
                end_frame_number?: number | undefined;
            }[];
            videoUrl: string;
            id: string;
            status: "in_progress" | "completed" | "available";
            assignedUser: string | null;
        } | null, import("@/stores/videoStore").VideoAnnotation | {
            isAnnotated: boolean;
            errorMessage: string;
            segments: {
                id: string | number;
                label: string;
                label_display: string;
                startTime: number;
                endTime: number;
                avgConfidence: number;
                video_id?: number | undefined;
                label_id?: number | undefined;
                start_frame_number?: number | undefined;
                end_frame_number?: number | undefined;
            }[];
            videoUrl: string;
            id: string;
            status: "in_progress" | "completed" | "available";
            assignedUser: string | null;
        } | null>;
        errorMessage: import("vue").Ref<string, string>;
        videoUrl: import("vue").Ref<string, string>;
        segmentsByLabel: Record<string, import("@/stores/videoStore").Segment[]>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
        videoList: import("vue").Ref<{
            videos: {
                id: number;
                originalFileName: string;
                status: string;
                assignedUser?: string | null | undefined;
                anonymized: boolean;
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
        activeSegmentId: import("vue").Ref<string | number | null, string | number | null>;
        activeSegment: import("vue").ComputedRef<import("@/stores/videoStore").Segment | null>;
        segmentOptions: import("vue").ComputedRef<{
            id: string | number;
            label: string;
            startTime: number;
            endTime: number;
            display: string;
        }[]>;
        setActiveSegment: (segmentId: string | number | null) => void;
        formatTime: (seconds: number) => string;
        getColorForLabel: (label: string) => string;
        fetchVideoMeta: (lastId?: number | undefined) => Promise<import("@/stores/videoStore").VideoFileMeta | null>;
        updateSensitiveMeta: (payload: import("@/stores/videoStore").SensitiveMetaUpdatePayload) => Promise<boolean>;
        clearVideoMeta: () => void;
        fetchAllVideos: () => Promise<{
            videos: {
                id: number;
                originalFileName: string;
                status: string;
                assignedUser?: string | null | undefined;
                anonymized: boolean;
                hasROI?: boolean | undefined;
                outsideFrameCount?: number | undefined;
                totalFrameCount?: number | undefined;
                anonymizationProgress?: number | undefined;
                lastAnonymizationDate?: string | undefined;
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
        getEnhancedSegmentStyle: (segment: import("@/stores/videoStore").Segment, duration: number) => Record<string, string>;
        getTranslationForLabel: (label: string) => string;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment, videoElement: HTMLVideoElement | null) => void;
        updateVideoStatus: (status: "in_progress" | "completed" | "available") => Promise<void>;
        assignUserToVideo: (user: string) => Promise<void>;
        updateSegment: (segmentId: string | number, updates: Partial<import("@/stores/videoStore").Segment>) => void;
        urlFor: (path: string) => string;
        getSegmentOptions: () => any[];
        clearSegments: () => void;
        fetchVideoSegments: (videoId: string) => Promise<void>;
        createSegment: (videoId: string, labelName: string, startTime: number, endTime: number) => Promise<import("@/stores/videoStore").Segment | null>;
        updateSegmentAPI: (segmentId: number, updates: Partial<import("@/stores/videoStore").Segment>) => Promise<boolean>;
        deleteSegment: (segmentId: number) => Promise<boolean>;
    }, "setActiveSegment" | "formatTime" | "getColorForLabel" | "fetchVideoMeta" | "updateSensitiveMeta" | "clearVideoMeta" | "fetchAllVideos" | "uploadRevert" | "uploadProcess" | "clearVideo" | "setVideo" | "fetchVideoUrl" | "fetchSegmentsByLabel" | "fetchAllSegments" | "saveAnnotations" | "getSegmentStyle" | "getEnhancedSegmentStyle" | "getTranslationForLabel" | "jumpToSegment" | "updateVideoStatus" | "assignUserToVideo" | "updateSegment" | "urlFor" | "getSegmentOptions" | "clearSegments" | "fetchVideoSegments" | "createSegment" | "updateSegmentAPI" | "deleteSegment">>;
    timelineSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
}, {
    videos: never[];
    selectedVideoId: null;
    currentTime: number;
    duration: number;
    fps: number;
    examinationMarkers: never[];
    savedExaminations: never[];
    currentMarker: null;
    selectedLabelType: string;
    isMarkingLabel: boolean;
    labelMarkingStart: number;
    currentLabel: null;
    isMarking: boolean;
    markingStartTime: null;
    videoId: null;
}, {
    currentVideoUrl(): any;
    showExaminationForm(): boolean;
    hasVideos(): boolean;
    noVideosMessage(): "" | "Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.";
    groupedSegments(): Record<string, import("@/stores/videoStore").Segment[]>;
    labelButtonText(): "Label-Ende setzen" | "Label-Start setzen";
    canStartLabeling(): null;
    canFinishLabeling(): boolean;
    currentTimePosition(): number;
    timelineMarkers(): {
        time: number;
        position: number;
    }[];
}, {
    loadVideos(): Promise<void>;
    loadSavedExaminations(): Promise<void>;
    onVideoChange(): Promise<void>;
    loadVideoMetadata(): Promise<void>;
    loadVideoSegments(): Promise<void>;
    onVideoLoaded(): void;
    handleTimeUpdate(): void;
    handleTimelineClick(event: any): void;
    addExaminationMarker(): void;
    jumpToExamination(exam: any): void;
    deleteExamination(examId: any): Promise<void>;
    onExaminationSaved(examinationData: any): void;
    formatTime(seconds: any): string;
    handleTimelineSeek(targetTime: any): void;
    handleSegmentResize(segmentId: any, newEndTime: any): Promise<void>;
    handleCreateSegment(targetTime: any, targetFrame: any): Promise<void>;
    startLabelMarking(): Promise<void>;
    cancelLabelMarking(): void;
    finishLabelMarking(): Promise<void>;
    saveNewLabelSegment(startTime: any, endTime: any, labelType: any): Promise<void>;
    loadLabelSegments(): Promise<void>;
    getCsrfToken(): string | null;
    showSuccessMessage(message: any): void;
    showErrorMessage(message: any): void;
    getTranslationForLabel(labelKey: any): any;
    getLabelColor(labelKey: any): any;
    getSegmentStartTime(segment: any): any;
    getSegmentEndTime(segment: any): any;
    getSegmentStyle(segment: any): {
        position: string;
        left: string;
        width: string;
        backgroundColor: any;
        borderRadius: string;
        height: string;
        cursor: string;
        zIndex: number;
    };
    seekToSegment(segment: any): void;
    deleteSegment(segmentId: any): Promise<void>;
    deleteAllFullVideoSegments(): Promise<void>;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    SimpleExaminationForm: import("vue").DefineComponent<Record<string, unknown>, unknown, unknown>;
    Timeline: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
        duration: {
            type: NumberConstructor;
            required: true;
        };
        currentTime: {
            type: NumberConstructor;
            default: number;
        };
        segments: {
            type: import("vue").PropType<import("@/stores/videoStore").Segment[]>;
            default: () => never[];
        };
        apiSegments: {
            type: import("vue").PropType<import("../../types/timeline.js").ApiSegment[]>;
            default: () => never[];
        };
        fps: {
            type: NumberConstructor;
            default: number;
        };
    }>, {
        timelineRef: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
        timeMarkersRef: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
        organizedSegments: import("vue").ComputedRef<import("../../types/timeline.js").LabelGroup[]>;
        timeMarkers: import("vue").ComputedRef<import("../../types/timeline.js").TimeMarker[]>;
        cursorPosition: import("vue").ComputedRef<number>;
        currentTime: import("vue").ComputedRef<number>;
        selectedSegmentId: import("vue").Ref<number | null, number | null>;
        allSegments: import("vue").ComputedRef<import("@/stores/videoStore").Segment[]>;
        selectedSegment: import("vue").ComputedRef<import("@/stores/videoStore").Segment | null>;
        startResize: (segment: import("@/stores/videoStore").Segment, event: MouseEvent | TouchEvent) => void;
        handleTimelineClick: (event: MouseEvent) => void;
        jumpToSegment: (segment: import("@/stores/videoStore").Segment) => void;
        getSegmentStyle: (segment: import("@/stores/videoStore").Segment, color: string) => {
            left: string;
            width: string;
            backgroundColor: string;
            borderColor: string;
        };
        formatTime: (seconds: number) => string;
        formatDuration: (seconds: number) => string;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("resize" | "createSegment" | "seek")[], "resize" | "createSegment" | "seek", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        duration: {
            type: NumberConstructor;
            required: true;
        };
        currentTime: {
            type: NumberConstructor;
            default: number;
        };
        segments: {
            type: import("vue").PropType<import("@/stores/videoStore").Segment[]>;
            default: () => never[];
        };
        apiSegments: {
            type: import("vue").PropType<import("../../types/timeline.js").ApiSegment[]>;
            default: () => never[];
        };
        fps: {
            type: NumberConstructor;
            default: number;
        };
    }>> & Readonly<{
        onResize?: ((...args: any[]) => any) | undefined;
        onCreateSegment?: ((...args: any[]) => any) | undefined;
        onSeek?: ((...args: any[]) => any) | undefined;
    }>, {
        segments: import("@/stores/videoStore").Segment[];
        currentTime: number;
        apiSegments: import("../../types/timeline.js").ApiSegment[];
        fps: number;
    }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
