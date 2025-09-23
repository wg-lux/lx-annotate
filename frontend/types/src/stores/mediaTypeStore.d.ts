import { type ComputedRef } from 'vue';
export type MediaType = 'pdf' | 'video' | 'unknown';
export interface MediaItem {
    id: number;
    mediaType: MediaType;
    pdfStreamUrl?: string;
    pdfUrl?: string;
    videoUrl?: string;
    filename?: string;
    fileSize?: number;
    reportMeta?: {
        pdfUrl?: string;
        file?: string;
        [key: string]: any;
    };
    lastStatusCheck?: number;
    isProcessingLocked?: boolean;
    anonymizationStatus?: string;
}
export interface MediaTypeConfig {
    icon: string;
    badgeClass: string;
    displayName: string;
    supportedExtensions: string[];
}
export declare const useMediaTypeStore: import("pinia").StoreDefinition<"mediaType", Pick<{
    currentItem: import("vue").Ref<{
        id: number;
        mediaType: MediaType;
        pdfStreamUrl?: string | undefined;
        pdfUrl?: string | undefined;
        videoUrl?: string | undefined;
        filename?: string | undefined;
        fileSize?: number | undefined;
        reportMeta?: {
            [x: string]: any;
            pdfUrl?: string | undefined;
            file?: string | undefined;
        } | undefined;
        lastStatusCheck?: number | undefined;
        isProcessingLocked?: boolean | undefined;
        anonymizationStatus?: string | undefined;
    } | null, MediaItem | {
        id: number;
        mediaType: MediaType;
        pdfStreamUrl?: string | undefined;
        pdfUrl?: string | undefined;
        videoUrl?: string | undefined;
        filename?: string | undefined;
        fileSize?: number | undefined;
        reportMeta?: {
            [x: string]: any;
            pdfUrl?: string | undefined;
            file?: string | undefined;
        } | undefined;
        lastStatusCheck?: number | undefined;
        isProcessingLocked?: boolean | undefined;
        anonymizationStatus?: string | undefined;
    } | null>;
    currentMediaType: ComputedRef<MediaType>;
    isPdf: ComputedRef<boolean>;
    isVideo: ComputedRef<boolean>;
    isUnknown: ComputedRef<boolean>;
    currentMediaUrl: ComputedRef<string | undefined>;
    currentMediaConfig: ComputedRef<MediaTypeConfig>;
    detectMediaType: (item: MediaItem) => MediaType;
    getPdfUrl: (item: MediaItem) => string | undefined;
    getVideoUrl: (item: MediaItem) => string | undefined;
    setCurrentItem: (item: MediaItem | null) => void;
    updateCurrentItem: (updates: Partial<MediaItem>) => void;
    clearCurrentItem: () => void;
    getMediaTypeConfig: (mediaType: MediaType) => MediaTypeConfig;
    isSupportedExtension: (filename: string) => boolean;
    getMediaTypeIcon: (mediaType: MediaType) => string;
    getMediaTypeBadgeClass: (mediaType: MediaType) => string;
}, "currentItem">, Pick<{
    currentItem: import("vue").Ref<{
        id: number;
        mediaType: MediaType;
        pdfStreamUrl?: string | undefined;
        pdfUrl?: string | undefined;
        videoUrl?: string | undefined;
        filename?: string | undefined;
        fileSize?: number | undefined;
        reportMeta?: {
            [x: string]: any;
            pdfUrl?: string | undefined;
            file?: string | undefined;
        } | undefined;
        lastStatusCheck?: number | undefined;
        isProcessingLocked?: boolean | undefined;
        anonymizationStatus?: string | undefined;
    } | null, MediaItem | {
        id: number;
        mediaType: MediaType;
        pdfStreamUrl?: string | undefined;
        pdfUrl?: string | undefined;
        videoUrl?: string | undefined;
        filename?: string | undefined;
        fileSize?: number | undefined;
        reportMeta?: {
            [x: string]: any;
            pdfUrl?: string | undefined;
            file?: string | undefined;
        } | undefined;
        lastStatusCheck?: number | undefined;
        isProcessingLocked?: boolean | undefined;
        anonymizationStatus?: string | undefined;
    } | null>;
    currentMediaType: ComputedRef<MediaType>;
    isPdf: ComputedRef<boolean>;
    isVideo: ComputedRef<boolean>;
    isUnknown: ComputedRef<boolean>;
    currentMediaUrl: ComputedRef<string | undefined>;
    currentMediaConfig: ComputedRef<MediaTypeConfig>;
    detectMediaType: (item: MediaItem) => MediaType;
    getPdfUrl: (item: MediaItem) => string | undefined;
    getVideoUrl: (item: MediaItem) => string | undefined;
    setCurrentItem: (item: MediaItem | null) => void;
    updateCurrentItem: (updates: Partial<MediaItem>) => void;
    clearCurrentItem: () => void;
    getMediaTypeConfig: (mediaType: MediaType) => MediaTypeConfig;
    isSupportedExtension: (filename: string) => boolean;
    getMediaTypeIcon: (mediaType: MediaType) => string;
    getMediaTypeBadgeClass: (mediaType: MediaType) => string;
}, "currentMediaType" | "isPdf" | "isVideo" | "isUnknown" | "currentMediaUrl" | "currentMediaConfig">, Pick<{
    currentItem: import("vue").Ref<{
        id: number;
        mediaType: MediaType;
        pdfStreamUrl?: string | undefined;
        pdfUrl?: string | undefined;
        videoUrl?: string | undefined;
        filename?: string | undefined;
        fileSize?: number | undefined;
        reportMeta?: {
            [x: string]: any;
            pdfUrl?: string | undefined;
            file?: string | undefined;
        } | undefined;
        lastStatusCheck?: number | undefined;
        isProcessingLocked?: boolean | undefined;
        anonymizationStatus?: string | undefined;
    } | null, MediaItem | {
        id: number;
        mediaType: MediaType;
        pdfStreamUrl?: string | undefined;
        pdfUrl?: string | undefined;
        videoUrl?: string | undefined;
        filename?: string | undefined;
        fileSize?: number | undefined;
        reportMeta?: {
            [x: string]: any;
            pdfUrl?: string | undefined;
            file?: string | undefined;
        } | undefined;
        lastStatusCheck?: number | undefined;
        isProcessingLocked?: boolean | undefined;
        anonymizationStatus?: string | undefined;
    } | null>;
    currentMediaType: ComputedRef<MediaType>;
    isPdf: ComputedRef<boolean>;
    isVideo: ComputedRef<boolean>;
    isUnknown: ComputedRef<boolean>;
    currentMediaUrl: ComputedRef<string | undefined>;
    currentMediaConfig: ComputedRef<MediaTypeConfig>;
    detectMediaType: (item: MediaItem) => MediaType;
    getPdfUrl: (item: MediaItem) => string | undefined;
    getVideoUrl: (item: MediaItem) => string | undefined;
    setCurrentItem: (item: MediaItem | null) => void;
    updateCurrentItem: (updates: Partial<MediaItem>) => void;
    clearCurrentItem: () => void;
    getMediaTypeConfig: (mediaType: MediaType) => MediaTypeConfig;
    isSupportedExtension: (filename: string) => boolean;
    getMediaTypeIcon: (mediaType: MediaType) => string;
    getMediaTypeBadgeClass: (mediaType: MediaType) => string;
}, "detectMediaType" | "getPdfUrl" | "getVideoUrl" | "setCurrentItem" | "updateCurrentItem" | "clearCurrentItem" | "getMediaTypeConfig" | "isSupportedExtension" | "getMediaTypeIcon" | "getMediaTypeBadgeClass">>;
/**
 * Standalone function to detect media type without store
 */
export declare function detectMediaTypeStandalone(item: MediaItem): MediaType;
/**
 * Standalone function to get appropriate CSS classes
 */
export declare function getMediaTypeClasses(mediaType: MediaType): {
    icon: string;
    badge: string;
};
