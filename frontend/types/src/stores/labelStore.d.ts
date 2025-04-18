export interface Segment {
    id: string;
    label: string;
    label_display?: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
    frameId?: string;
}
export declare function getSegmentStyle(segment: Segment, duration: number): Record<string, string>;
export declare function getColorForLabel(label: string): string;
export declare function getTranslationForLabel(label: string): string;
export declare function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void;
export declare const useLabelStore: import("pinia").StoreDefinition<"label", import("pinia")._UnwrapAll<Pick<{
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    segmentsByFrame: import("vue").ComputedRef<Record<string, Segment[]>>;
    getSegmentsForFrame: (frameId: string) => {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[];
    fetchSegments: (videoId?: string) => Promise<void>;
    saveSegment: (segment: Segment) => Promise<any>;
    deleteSegment: (segmentId: string) => Promise<void>;
}, "loading" | "error" | "segments">>, Pick<{
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    segmentsByFrame: import("vue").ComputedRef<Record<string, Segment[]>>;
    getSegmentsForFrame: (frameId: string) => {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[];
    fetchSegments: (videoId?: string) => Promise<void>;
    saveSegment: (segment: Segment) => Promise<any>;
    deleteSegment: (segmentId: string) => Promise<void>;
}, "segmentsByFrame">, Pick<{
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[]>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    segmentsByFrame: import("vue").ComputedRef<Record<string, Segment[]>>;
    getSegmentsForFrame: (frameId: string) => {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[];
    fetchSegments: (videoId?: string) => Promise<void>;
    saveSegment: (segment: Segment) => Promise<any>;
    deleteSegment: (segmentId: string) => Promise<void>;
}, "getSegmentsForFrame" | "fetchSegments" | "saveSegment" | "deleteSegment">>;
