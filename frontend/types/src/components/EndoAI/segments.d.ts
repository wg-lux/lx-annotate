export interface Segment {
    id: string;
    label: string;
    label_display: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
}
export declare function getSegmentStyle(segment: Segment, duration: number): Record<string, string>;
export declare function getColorForLabel(label: string): string;
export declare function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void;
