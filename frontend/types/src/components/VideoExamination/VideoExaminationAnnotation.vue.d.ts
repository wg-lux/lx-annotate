declare const _default: import("vue").DefineComponent<{}, {}, {
    videos: never[];
    selectedVideoId: null;
    currentTime: number;
    duration: number;
    examinationMarkers: never[];
    savedExaminations: never[];
    currentMarker: null;
}, {
    currentVideoUrl(): any;
    showExaminationForm(): boolean;
    hasVideos(): boolean;
    noVideosMessage(): "" | "Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.";
}, {
    loadVideos(): Promise<void>;
    loadSavedExaminations(): Promise<void>;
    onVideoChange(): void;
    onVideoLoaded(): void;
    handleTimeUpdate(): void;
    handleTimelineClick(event: any): void;
    addExaminationMarker(): void;
    jumpToExamination(exam: any): void;
    deleteExamination(examId: any): Promise<void>;
    onExaminationSaved(examinationData: any): void;
    formatTime(seconds: any): string;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    SimpleExaminationForm: import("vue").DefineComponent<Record<string, unknown>, unknown, unknown>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
