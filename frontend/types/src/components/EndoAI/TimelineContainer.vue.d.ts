import type { Segment as SegmentType } from '@/stores/videoStore';
interface Props {
    segments: SegmentType[];
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    activeSegmentId?: string | number | null;
    showConfidence?: boolean;
    showRowLabels?: boolean;
    labelTranslations?: Record<string, string>;
    hasVideo?: boolean;
    selectionMode?: boolean;
    minRowHeight?: number;
    maxRows?: number;
}
interface SegmentRow {
    id: number;
    segments: SegmentType[];
    maxEndTime: number;
    minStartTime: number;
}
declare const _default: import("vue").DefineComponent<Props, {
    zoomLevel: import("vue").Ref<number, number>;
    isSelecting: import("vue").Ref<boolean, boolean>;
    selectionStart: import("vue").Ref<number, number>;
    selectionEnd: import("vue").Ref<number, number>;
    isDragging: import("vue").Ref<boolean, boolean>;
    isResizing: import("vue").Ref<boolean, boolean>;
    activeResizeSegmentId: import("vue").Ref<string | number | null, string | number | null>;
    activeDragSegmentId: import("vue").Ref<string | number | null, string | number | null>;
    handleDragStart: (segment: SegmentType, event: MouseEvent) => void;
    handleDragEnd: (event: MouseEvent) => void;
    handleResizeStart: (segment: SegmentType, mode: "start" | "end", event: MouseEvent) => void;
    formatTime: (seconds: number) => string;
    segmentRows: import("vue").ComputedRef<SegmentRow[]>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    seek: (time: number) => any;
    "play-pause": () => any;
    "segment-select": (segment: SegmentType) => any;
    "segment-resize": (segmentId: string | number, newStart: number, newEnd: number, mode: string, final?: boolean | undefined) => any;
    "segment-move": (segmentId: string | number, newStart: number, newEnd: number, final?: boolean | undefined) => any;
    "time-selection": (data: {
        start: number;
        end: number;
    }) => any;
    "segment-contextmenu": (segment: SegmentType, event: MouseEvent) => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onSeek?: ((time: number) => any) | undefined;
    "onPlay-pause"?: (() => any) | undefined;
    "onSegment-select"?: ((segment: SegmentType) => any) | undefined;
    "onSegment-resize"?: ((segmentId: string | number, newStart: number, newEnd: number, mode: string, final?: boolean | undefined) => any) | undefined;
    "onSegment-move"?: ((segmentId: string | number, newStart: number, newEnd: number, final?: boolean | undefined) => any) | undefined;
    "onTime-selection"?: ((data: {
        start: number;
        end: number;
    }) => any) | undefined;
    "onSegment-contextmenu"?: ((segment: SegmentType, event: MouseEvent) => any) | undefined;
}>, {
    hasVideo: boolean;
    selectionMode: boolean;
    showConfidence: boolean;
    labelTranslations: Record<string, string>;
    showRowLabels: boolean;
    minRowHeight: number;
    maxRows: number;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {
    containerRef: HTMLDivElement;
}, HTMLDivElement>;
export default _default;
