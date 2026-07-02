declare const _default: import("vue").DefineComponent<{}, {}, {
    videos: never[];
    videoLabels: never[];
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
    errorMessage: null;
    successMessage: null;
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
        time: number;
        position: number;
    }[];
    labelSegments(): import("@/stores/videoStore").Segment[];
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
    clearErrorMessage(): void;
    clearSuccessMessage(): void;
    getCsrfToken(): string | null;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    SimpleExaminationForm: import("vue").DefineComponent<Record<string, unknown>, unknown, unknown>;
    Timeline: import("vue").DefineComponent<{
        video?: {
            duration?: number | undefined;
        } | null | undefined;
        segments?: import("@/stores/videoStore").Segment[] | undefined;
        labels?: import("@/stores/videoStore").LabelMeta[] | undefined;
        currentTime?: number | undefined;
        isPlaying?: boolean | undefined;
        activeSegmentId?: string | number | null | undefined;
        showWaveform?: boolean | undefined;
        selectionMode?: boolean | undefined;
        fps?: number | undefined;
    }, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
        [x: string]: any;
    } & {
        [x: string]: any;
    }, string, import("vue").PublicProps, Readonly<{
        video?: {
            duration?: number | undefined;
        } | null | undefined;
        segments?: import("@/stores/videoStore").Segment[] | undefined;
        labels?: import("@/stores/videoStore").LabelMeta[] | undefined;
        currentTime?: number | undefined;
        isPlaying?: boolean | undefined;
        activeSegmentId?: string | number | null | undefined;
        showWaveform?: boolean | undefined;
        selectionMode?: boolean | undefined;
        fps?: number | undefined;
    }> & Readonly<{
        [x: `on${Capitalize<any>}`]: ((...args: any[] | unknown[]) => any) | undefined;
    }>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
