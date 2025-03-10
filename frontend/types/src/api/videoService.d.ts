import type { Segment } from '@/components/EndoAI/segments';
declare function fetchVideoUrl(): Promise<void>;
declare function saveAnnotations(): Promise<void>;
export declare const videoService: {
    errorMessage: import("vue").Ref<string, string>;
    videoUrl: import("vue").Ref<string, string>;
    segments: import("vue").Ref<{
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[], Segment[] | {
        id: string;
        label: string;
        label_display: string;
        startTime: number;
        endTime: number;
        avgConfidence: number;
    }[]>;
    fetchVideoUrl: typeof fetchVideoUrl;
    saveAnnotations: typeof saveAnnotations;
    uploadRevert: (uniqueFileId: string, load: () => void, error: (message: string) => void) => void;
    uploadProcess: (fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void) => void;
};
export {};
