declare const _default: import("vue").DefineComponent<{}, {}, {
    activeTab: string;
    niceData: never[];
    parisData: never[];
    loadingNice: boolean;
    loadingParis: boolean;
    niceError: null;
    parisError: null;
    showDetailsModal: boolean;
    showClassificationModal: boolean;
    selectedVideo: null;
    classificationData: {
        nice: {};
        paris: {};
    };
}, {
    isClassificationValid(): any;
}, {
    setActiveTab(tab: any): void;
    loadNiceData(): Promise<void>;
    loadParisData(): Promise<void>;
    showNiceDetails(video: any): void;
    showParisDetails(video: any): void;
    classifyNice(video: any): void;
    classifyParis(video: any): void;
    initializeClassificationData(): void;
    closeDetailsModal(): void;
    closeClassificationModal(): void;
    startClassification(): void;
    saveClassification(): Promise<void>;
    viewSegmentInPlayer(segment: any): void;
    formatTime(seconds: any): string;
}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
