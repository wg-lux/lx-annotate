import type { ImageData } from '@/stores/imageStore';
import { getSegmentStyle, getTranslationForLabel, getColorForLabel } from '@/stores/labelStore';
import type { Segment } from '@/stores/labelStore';
declare const _default: import("vue").DefineComponent<{}, {
    frames: import("vue").ComputedRef<{
        id: string;
        imageUrl: string;
        status: "in_progress" | "completed";
        assignedUser?: string | null | undefined;
    }[]>;
    annotateFrame: (frame: ImageData) => void;
    selectSegment: (segment: Segment, frame: ImageData) => void;
    getSegmentStyle: typeof getSegmentStyle;
    getTranslationForLabel: typeof getTranslationForLabel;
    getColorForLabel: typeof getColorForLabel;
    getSegmentsForFrame: (frameId: string) => {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }[];
    showAnnotationModal: import("vue").Ref<boolean, boolean>;
    selectedFrame: import("vue").Ref<{
        id: string;
        imageUrl: string;
        status: "in_progress" | "completed";
        assignedUser?: string | null | undefined;
    } | null, ImageData | {
        id: string;
        imageUrl: string;
        status: "in_progress" | "completed";
        assignedUser?: string | null | undefined;
    } | null>;
    newSegment: import("vue").Ref<{
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }, Segment | {
        id: string;
        label: string;
        label_display?: string | undefined;
        startTime: number;
        endTime: number;
        avgConfidence: number;
        frameId?: string | undefined;
    }>;
    saveNewSegment: () => Promise<void>;
    translationMap: import("vue").ComputedRef<Record<string, string>>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    DynamicScroller: import("vue").Component<any>;
    DynamicScrollerItem: import("vue").Component<any>;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
