declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    ScrollingFrames: import("vue").DefineComponent<{}, {
        frames: import("vue").ComputedRef<{
            id: string;
            imageUrl: string;
            status: "in_progress" | "completed";
            assignedUser?: string | null | undefined;
        }[]>;
        annotateFrame: (frame: import("../stores/imageStore.js").ImageData) => void;
        selectSegment: (segment: import("../stores/labelStore.js").Segment, frame: import("../stores/imageStore.js").ImageData) => void;
        getSegmentStyle: typeof import("../stores/labelStore.js").getSegmentStyle;
        getTranslationForLabel: typeof import("../stores/labelStore.js").getTranslationForLabel;
        getColorForLabel: typeof import("../stores/labelStore.js").getColorForLabel;
        getSegmentsForFrame: (frameId: string) => {
            id: string;
            label: string;
            label_display?: string | undefined;
            startTime: number;
            endTime: number;
            avgConfidence: number;
            frameId?: string | undefined;
        }[];
        showAnnotationModal: import("vue").Ref<boolean, boolean>;
        selectedFrame: import("vue").Ref<{
            id: string;
            imageUrl: string;
            status: "in_progress" | "completed";
            assignedUser?: string | null | undefined;
        } | null, import("../stores/imageStore.js").ImageData | {
            id: string;
            imageUrl: string;
            status: "in_progress" | "completed";
            assignedUser?: string | null | undefined;
        } | null>;
        newSegment: import("vue").Ref<{
            id: string;
            label: string;
            label_display?: string | undefined;
            startTime: number;
            endTime: number;
            avgConfidence: number;
            frameId?: string | undefined;
        }, import("../stores/labelStore.js").Segment | {
            id: string;
            label: string;
            label_display?: string | undefined;
            startTime: number;
            endTime: number;
            avgConfidence: number;
            frameId?: string | undefined;
        }>;
        saveNewSegment: () => Promise<void>;
        translationMap: import("vue").ComputedRef<Record<string, string>>;
    }, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
        DynamicScroller: import("vue").Component<any>;
        DynamicScrollerItem: import("vue").Component<any>;
    }, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
    AnnotationComponent: import("vue").DefineComponent<{}, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
