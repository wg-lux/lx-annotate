declare const _default: import("vue").DefineComponent<{}, {}, {
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
    labelSegments: never[];
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
    canStartLabeling(): boolean;
    canFinishLabeling(): boolean;
    currentTimePosition(): number;
    timelineMarkers(): {
        time: any;
        position: number;
    }[];
}, {
    loadVideos(): Promise<void>;
    loadSavedExaminations(): Promise<void>;
    onVideoChange(): void;
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
    handleSegmentResize(segmentId: any, newEndTime: any): void;
    startLabelMarking(): void;
    cancelLabelMarking(): void;
    finishLabelMarking(): void;
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
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("resize" | "seek" | "createSegment")[], "resize" | "seek" | "createSegment", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
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
        onSeek?: ((...args: any[]) => any) | undefined;
        onCreateSegment?: ((...args: any[]) => any) | undefined;
    }>, {
        segments: import("@/stores/videoStore").Segment[];
        currentTime: number;
        apiSegments: import("../../types/timeline.js").ApiSegment[];
        fps: number;
    }, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
