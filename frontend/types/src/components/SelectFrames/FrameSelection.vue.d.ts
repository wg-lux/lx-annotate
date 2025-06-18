declare const _default: import("vue").DefineComponent<{}, {}, {
    videos: never[];
    selectedVideoId: null;
    currentTime: number;
    duration: number;
    extractedFrames: never[];
    frameCounter: number;
}, {
    currentVideoUrl(): any;
    canCaptureFrame(): boolean;
    selectedFrames(): never[];
    allFramesSelected(): boolean;
    anyFrameSelected(): boolean;
    someFramesSelected(): boolean;
}, {
    loadVideos(): Promise<void>;
    onVideoChange(): void;
    onVideoLoaded(): void;
    handleTimeUpdate(): void;
    captureCurrentFrame(): void;
    generateFrames(): void;
    captureFrameAtTime(timestamp: any): void;
    generateMockPredictions(): {
        label: string;
        confidence: number;
    }[];
    toggleFrameSelection(frame: any): void;
    updateSelectedFrames(): void;
    selectAllFrames(): void;
    deselectAllFrames(): void;
    toggleAllFrames(): void;
    removeFrame(frameId: any): void;
    getConfidenceClass(confidence: any): "bg-danger" | "bg-success" | "bg-warning text-dark";
    proceedToAnnotation(): void;
    formatTime(seconds: any): string;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
