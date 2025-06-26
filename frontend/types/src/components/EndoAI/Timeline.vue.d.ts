import { type Segment, type LabelMeta } from '@/stores/videoStore';
type __VLS_Props = {
    video?: {
        duration?: number;
    } | null;
    segments?: Segment[];
    labels?: LabelMeta[];
    currentTime?: number;
    isPlaying?: boolean;
    activeSegmentId?: string | number | null;
    showWaveform?: boolean;
    selectionMode?: boolean;
    fps?: number;
};
declare const _default: import("vue").DefineComponent<__VLS_Props, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {
    [x: string]: any;
}, string, import("vue").PublicProps, Readonly<__VLS_Props> & Readonly<{
    [x: `on${Capitalize<any>}`]: ((...args: any) => any) | undefined;
}>, {}, {}, {}, {}, string, import("vue").ComponentProvideOptions, false, {
    timeline: HTMLDivElement;
    segmentElements: HTMLDivElement[];
    waveformCanvas: HTMLCanvasElement;
}, HTMLDivElement>;
export default _default;
