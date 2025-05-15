declare const _default: import("vue").DefineComponent<{}, {
    videoUrl: import("vue").ComputedRef<string>;
    duration: import("vue").ComputedRef<number>;
    allSegments: import("vue").ComputedRef<() => IterableIterator<import("@/stores/videoStore").Segment>>;
    videoRef: import("vue").Ref<HTMLVideoElement, HTMLVideoElement>;
    handleSegmentResize: (id: string, newEnd: number) => void;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    Timeline: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
        duration: {
            type: NumberConstructor;
            required: true;
        };
    }>, {
        timelineRef: import("vue").Ref<HTMLElement, HTMLElement>;
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
        onResize?: (...args: any[]) => any;
    }>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
