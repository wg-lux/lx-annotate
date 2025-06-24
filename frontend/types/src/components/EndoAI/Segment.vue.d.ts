import type { Segment } from '@/stores/videoStore';
interface Props {
    segment: Segment;
    videoDuration: number;
    isActive?: boolean;
    showConfidence?: boolean;
    labelTranslations?: Record<string, string>;
}
declare const _default: import("vue").DefineComponent<Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    contextmenu: (segment: Segment, event: MouseEvent) => any;
    select: (segment: Segment) => any;
    dragStart: (segment: Segment, event: MouseEvent) => any;
    dragMove: (deltaX: number, deltaY: number) => any;
    dragEnd: () => any;
    resizeStart: (segment: Segment, mode: "start" | "end", event: MouseEvent) => any;
    resizeMove: (deltaX: number) => any;
    resizeEnd: () => any;
}, string, import("vue").PublicProps, Readonly<Props> & Readonly<{
    onContextmenu?: ((segment: Segment, event: MouseEvent) => any) | undefined;
    onSelect?: ((segment: Segment) => any) | undefined;
    onDragStart?: ((segment: Segment, event: MouseEvent) => any) | undefined;
    onDragMove?: ((deltaX: number, deltaY: number) => any) | undefined;
    onDragEnd?: (() => any) | undefined;
    onResizeStart?: ((segment: Segment, mode: "start" | "end", event: MouseEvent) => any) | undefined;
    onResizeMove?: ((deltaX: number) => any) | undefined;
    onResizeEnd?: (() => any) | undefined;
}>, {
    isActive: boolean;
    showConfidence: boolean;
    labelTranslations: Record<string, string>;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
