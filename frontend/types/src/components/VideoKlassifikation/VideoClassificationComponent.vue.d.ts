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
    getLabelIdByName(labelName: any): Promise<any>;
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
    getCsrfToken(): string | null;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    SimpleExaminationForm: import("vue").DefineComponent<Record<string, unknown>, unknown, unknown>;
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
        jumpToSegment: (segment: import("@/stores/videoStore").Segment) => void;
        getEnhancedSegmentStyle: (segment: import("@/stores/videoStore").Segment, allSegments?: import("@/stores/videoStore").Segment[] | undefined) => Record<string, string>;
        duration: number;
        getSegmentVerticalPosition: (segment: import("@/stores/videoStore").Segment, allSegs: import("@/stores/videoStore").Segment[]) => number;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("resize" | "seek")[], "resize" | "seek", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
        duration: {
            type: NumberConstructor;
            required: true;
        };
    }>> & Readonly<{
        onResize?: ((...args: any[]) => any) | undefined;
        onSeek?: ((...args: any[]) => any) | undefined;
    }>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
