import type { Segment } from '@/stores/videoStore';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    duration: {
        type: NumberConstructor;
        required: true;
    };
}>, {
    timelineRef: import("vue").Ref<HTMLElement, HTMLElement>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    startResize: (segment: Segment, event: MouseEvent | TouchEvent) => void;
    handleTimelineClick: (event: MouseEvent) => void;
    getSegmentStyle: (segment: Segment, duration: number) => Record<string, string>;
    duration: number;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, "resize"[], "resize", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    duration: {
        type: NumberConstructor;
        required: true;
    };
}>> & Readonly<{
    onResize?: (...args: any[]) => any;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
