import { type ComputedRef } from 'vue';
export type MediaScope = 'pdf' | 'video' | 'meta' | 'unknown';
export type MediaKey = `${MediaScope}:${number}`;
export type MediaType = 'pdf' | 'video' | 'unknown';
export type MediaItem = {
    id: number;
    scope?: MediaScope;
    mediaType?: MediaType;
    filename?: string;
    rawStreamUrl?: string;
    processedStreamUrl?: string;
};
type MediaTypeConfig = {
    icon: string;
    badgeClass: string;
    displayName: string;
    supportedExtensions: string[];
};
export declare const useMediaTypeStore: import("pinia").StoreDefinition<"mediaType", Pick<{
    currentItem: import("vue").Ref<{
        id: number;
        scope?: MediaScope | undefined;
        mediaType?: MediaType | undefined;
        filename?: string | undefined;
        rawStreamUrl?: string | undefined;
        processedStreamUrl?: string | undefined;
    } | null, MediaItem | {
        id: number;
        scope?: MediaScope | undefined;
        mediaType?: MediaType | undefined;
        filename?: string | undefined;
        rawStreamUrl?: string | undefined;
        processedStreamUrl?: string | undefined;
    } | null>;
    currentMediaType: ComputedRef<MediaType>;
    isPdf: ComputedRef<boolean>;
    isVideo: ComputedRef<boolean>;
    isUnknown: ComputedRef<boolean>;
    currentMediaConfig: ComputedRef<MediaTypeConfig>;
    seedTypesFromOverview: (items: Array<{
        id: number;
        mediaType?: string;
    }>) => void;
    rememberType: (id: number, type: MediaType, scope?: MediaScope) => void;
    getType: (id: number, scope?: MediaScope) => MediaType;
    setCurrentByKey: (scope: MediaScope, id: number) => void;
    getAllTypes: (id: number) => MediaType[];
    resolveType: (id: number, hint?: 'prefer-video' | 'prefer-pdf') => MediaType;
    setItem: (scope: MediaScope, item: MediaItem) => void;
    getItem: (scope: MediaScope, id: number) => MediaItem | undefined;
    getRawStreamUrl: (scope: MediaScope, id: number) => string | undefined;
    getProcessedStreamUrl: (scope: MediaScope, id: number) => string | undefined;
    detectMediaType: (item: MediaItem) => MediaType;
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
        scope?: MediaScope | undefined;
        mediaType?: MediaType | undefined;
        filename?: string | undefined;
        rawStreamUrl?: string | undefined;
        processedStreamUrl?: string | undefined;
    } | null, MediaItem | {
        id: number;
        scope?: MediaScope | undefined;
        mediaType?: MediaType | undefined;
        filename?: string | undefined;
        rawStreamUrl?: string | undefined;
        processedStreamUrl?: string | undefined;
    } | null>;
    currentMediaType: ComputedRef<MediaType>;
    isPdf: ComputedRef<boolean>;
    isVideo: ComputedRef<boolean>;
    isUnknown: ComputedRef<boolean>;
    currentMediaConfig: ComputedRef<MediaTypeConfig>;
    seedTypesFromOverview: (items: Array<{
        id: number;
        mediaType?: string;
    }>) => void;
    rememberType: (id: number, type: MediaType, scope?: MediaScope) => void;
    getType: (id: number, scope?: MediaScope) => MediaType;
    setCurrentByKey: (scope: MediaScope, id: number) => void;
    getAllTypes: (id: number) => MediaType[];
    resolveType: (id: number, hint?: 'prefer-video' | 'prefer-pdf') => MediaType;
    setItem: (scope: MediaScope, item: MediaItem) => void;
    getItem: (scope: MediaScope, id: number) => MediaItem | undefined;
    getRawStreamUrl: (scope: MediaScope, id: number) => string | undefined;
    getProcessedStreamUrl: (scope: MediaScope, id: number) => string | undefined;
    detectMediaType: (item: MediaItem) => MediaType;
    setCurrentItem: (item: MediaItem | null) => void;
    updateCurrentItem: (updates: Partial<MediaItem>) => void;
    clearCurrentItem: () => void;
    getMediaTypeConfig: (mediaType: MediaType) => MediaTypeConfig;
    isSupportedExtension: (filename: string) => boolean;
    getMediaTypeIcon: (mediaType: MediaType) => string;
    getMediaTypeBadgeClass: (mediaType: MediaType) => string;
}, "currentMediaType" | "isPdf" | "isVideo" | "isUnknown" | "currentMediaConfig">, Pick<{
    currentItem: import("vue").Ref<{
        id: number;
        scope?: MediaScope | undefined;
        mediaType?: MediaType | undefined;
        filename?: string | undefined;
        rawStreamUrl?: string | undefined;
        processedStreamUrl?: string | undefined;
    } | null, MediaItem | {
        id: number;
        scope?: MediaScope | undefined;
        mediaType?: MediaType | undefined;
        filename?: string | undefined;
        rawStreamUrl?: string | undefined;
        processedStreamUrl?: string | undefined;
    } | null>;
    currentMediaType: ComputedRef<MediaType>;
    isPdf: ComputedRef<boolean>;
    isVideo: ComputedRef<boolean>;
    isUnknown: ComputedRef<boolean>;
    currentMediaConfig: ComputedRef<MediaTypeConfig>;
    seedTypesFromOverview: (items: Array<{
        id: number;
        mediaType?: string;
    }>) => void;
    rememberType: (id: number, type: MediaType, scope?: MediaScope) => void;
    getType: (id: number, scope?: MediaScope) => MediaType;
    setCurrentByKey: (scope: MediaScope, id: number) => void;
    getAllTypes: (id: number) => MediaType[];
    resolveType: (id: number, hint?: 'prefer-video' | 'prefer-pdf') => MediaType;
    setItem: (scope: MediaScope, item: MediaItem) => void;
    getItem: (scope: MediaScope, id: number) => MediaItem | undefined;
    getRawStreamUrl: (scope: MediaScope, id: number) => string | undefined;
    getProcessedStreamUrl: (scope: MediaScope, id: number) => string | undefined;
    detectMediaType: (item: MediaItem) => MediaType;
    setCurrentItem: (item: MediaItem | null) => void;
    updateCurrentItem: (updates: Partial<MediaItem>) => void;
    clearCurrentItem: () => void;
    getMediaTypeConfig: (mediaType: MediaType) => MediaTypeConfig;
    isSupportedExtension: (filename: string) => boolean;
    getMediaTypeIcon: (mediaType: MediaType) => string;
    getMediaTypeBadgeClass: (mediaType: MediaType) => string;
}, "seedTypesFromOverview" | "rememberType" | "getType" | "setCurrentByKey" | "getAllTypes" | "resolveType" | "setItem" | "getItem" | "getRawStreamUrl" | "getProcessedStreamUrl" | "detectMediaType" | "setCurrentItem" | "updateCurrentItem" | "clearCurrentItem" | "getMediaTypeConfig" | "isSupportedExtension" | "getMediaTypeIcon" | "getMediaTypeBadgeClass">>;
export {};
