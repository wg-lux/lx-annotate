import type { PropType } from 'vue';
import type { Segment } from '@/stores/videoStore';
import type { LabelGroup, TimeMarker, ApiSegment } from '@/types/timeline';
declare const _default: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    duration: {
        type: NumberConstructor;
        required: true;
    };
    currentTime: {
        type: NumberConstructor;
        default: number;
    };
    segments: {
        type: PropType<Segment[]>;
        default: () => never[];
    };
    apiSegments: {
        type: PropType<ApiSegment[]>;
        default: () => never[];
    };
    fps: {
        type: NumberConstructor;
        default: number;
    };
}>, {
    timelineRef: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
    timeMarkersRef: import("vue").Ref<HTMLElement | null, HTMLElement | null>;
    organizedSegments: import("vue").ComputedRef<LabelGroup[]>;
    timeMarkers: import("vue").ComputedRef<TimeMarker[]>;
    cursorPosition: import("vue").ComputedRef<number>;
    currentTime: import("vue").ComputedRef<number>;
    selectedSegmentId: import("vue").Ref<number | null, number | null>;
    allSegments: import("vue").ComputedRef<Segment[]>;
    selectedSegment: import("vue").ComputedRef<Segment | null>;
    startResize: (segment: Segment, event: MouseEvent | TouchEvent) => void;
    handleTimelineClick: (event: MouseEvent) => void;
    jumpToSegment: (segment: Segment) => void;
    getSegmentStyle: (segment: Segment, color: string) => {
        left: string;
        width: string;
        backgroundColor: string;
        borderColor: string;
    };
    formatTime: (seconds: number) => string;
    formatDuration: (seconds: number) => string;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("resize" | "createSegment" | "seek")[], "resize" | "createSegment" | "seek", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    duration: {
        type: NumberConstructor;
        required: true;
    };
    currentTime: {
        type: NumberConstructor;
        default: number;
    };
    segments: {
        type: PropType<Segment[]>;
        default: () => never[];
    };
    apiSegments: {
        type: PropType<ApiSegment[]>;
        default: () => never[];
    };
    fps: {
        type: NumberConstructor;
        default: number;
    };
}>> & Readonly<{
    onResize?: ((...args: any[]) => any) | undefined;
    onCreateSegment?: ((...args: any[]) => any) | undefined;
    onSeek?: ((...args: any[]) => any) | undefined;
}>, {
    segments: Segment[];
    currentTime: number;
    apiSegments: ApiSegment[];
    fps: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
