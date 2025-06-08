import type { Segment } from '@/stores/videoStore';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    duration: {
        type: NumberConstructor;
        required: true;
    };
}>, {
    timelineRef: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    startResize: (segment: Segment, event: MouseEvent | TouchEvent) => void;
    handleTimelineClick: (event: MouseEvent) => void;
    jumpToSegment: (segment: Segment) => void;
    getEnhancedSegmentStyle: (segment: Segment, allSegments?: Segment[] | undefined) => Record<string, string>;
    duration: number;
    getSegmentVerticalPosition: (segment: Segment, allSegs: Segment[]) => number;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("resize" | "seek")[], "resize" | "seek", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    duration: {
        type: NumberConstructor;
        required: true;
    };
}>> & Readonly<{
    onResize?: ((...args: any[]) => any) | undefined;
    onSeek?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
