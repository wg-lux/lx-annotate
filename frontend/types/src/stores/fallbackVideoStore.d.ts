import type { VideoMeta, Segment, LabelMeta } from '@/stores/videoStore';
export declare const useFallbackVideoStore: import("pinia").StoreDefinition<"fallbackVideo", import("pinia")._UnwrapAll<Pick<{
    isEnabled: import("vue").Ref<boolean, boolean>;
    fallbackDuration: import("vue").Ref<number, number>;
    fallbackVideoList: import("vue").ComputedRef<{
        videos: VideoMeta[];
        labels: LabelMeta[];
    }>;
    fallbackSegments: import("vue").ComputedRef<Segment[]>;
    enableFallback: () => void;
    disableFallback: () => void;
    getFallbackVideoUrl: () => string;
    createFallbackSegment: (label: string, startTime: number, endTime: number) => Segment;
}, "isEnabled" | "fallbackDuration">>, Pick<{
    isEnabled: import("vue").Ref<boolean, boolean>;
    fallbackDuration: import("vue").Ref<number, number>;
    fallbackVideoList: import("vue").ComputedRef<{
        videos: VideoMeta[];
        labels: LabelMeta[];
    }>;
    fallbackSegments: import("vue").ComputedRef<Segment[]>;
    enableFallback: () => void;
    disableFallback: () => void;
    getFallbackVideoUrl: () => string;
    createFallbackSegment: (label: string, startTime: number, endTime: number) => Segment;
}, "fallbackVideoList" | "fallbackSegments">, Pick<{
    isEnabled: import("vue").Ref<boolean, boolean>;
    fallbackDuration: import("vue").Ref<number, number>;
    fallbackVideoList: import("vue").ComputedRef<{
        videos: VideoMeta[];
        labels: LabelMeta[];
    }>;
    fallbackSegments: import("vue").ComputedRef<Segment[]>;
    enableFallback: () => void;
    disableFallback: () => void;
    getFallbackVideoUrl: () => string;
    createFallbackSegment: (label: string, startTime: number, endTime: number) => Segment;
}, "enableFallback" | "disableFallback" | "getFallbackVideoUrl" | "createFallbackSegment">>;
