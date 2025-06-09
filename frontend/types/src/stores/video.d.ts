import type { Video, VideoFilters } from '@/types';
export declare const useVideoStore: import("pinia").StoreDefinition<"video", import("pinia")._UnwrapAll<Pick<{
    videos: import("vue").Ref<{
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    }[], Video[] | {
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    }[]>;
    currentVideo: import("vue").Ref<{
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    } | null, Video | {
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    filters: import("vue").Ref<{
        title?: string | undefined;
        created_after?: string | undefined;
        created_before?: string | undefined;
        has_annotations?: boolean | undefined;
        min_duration?: number | undefined;
        max_duration?: number | undefined;
    }, VideoFilters | {
        title?: string | undefined;
        created_after?: string | undefined;
        created_before?: string | undefined;
        has_annotations?: boolean | undefined;
        min_duration?: number | undefined;
        max_duration?: number | undefined;
    }>;
    pagination: import("vue").Ref<{
        page: number;
        pageSize: number;
        total: number;
    }, {
        page: number;
        pageSize: number;
        total: number;
    } | {
        page: number;
        pageSize: number;
        total: number;
    }>;
    hasVideos: import("vue").ComputedRef<boolean>;
    totalPages: import("vue").ComputedRef<number>;
    fetchVideos: (params?: {
        page?: number;
        filters?: VideoFilters;
    }) => Promise<void>;
    fetchVideoById: (id: number) => Promise<import("@/services").Video>;
    uploadVideo: (file: File, onProgress?: (progress: number) => void) => Promise<import("@/services").Video>;
    deleteVideo: (id: number) => Promise<void>;
    updateFilters: (newFilters: VideoFilters) => void;
    clearFilters: () => void;
    setCurrentVideo: (video: Video | null) => void;
    clearError: () => void;
    reset: () => void;
}, "videos" | "currentVideo" | "loading" | "error" | "filters" | "pagination">>, Pick<{
    videos: import("vue").Ref<{
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    }[], Video[] | {
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    }[]>;
    currentVideo: import("vue").Ref<{
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    } | null, Video | {
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    filters: import("vue").Ref<{
        title?: string | undefined;
        created_after?: string | undefined;
        created_before?: string | undefined;
        has_annotations?: boolean | undefined;
        min_duration?: number | undefined;
        max_duration?: number | undefined;
    }, VideoFilters | {
        title?: string | undefined;
        created_after?: string | undefined;
        created_before?: string | undefined;
        has_annotations?: boolean | undefined;
        min_duration?: number | undefined;
        max_duration?: number | undefined;
    }>;
    pagination: import("vue").Ref<{
        page: number;
        pageSize: number;
        total: number;
    }, {
        page: number;
        pageSize: number;
        total: number;
    } | {
        page: number;
        pageSize: number;
        total: number;
    }>;
    hasVideos: import("vue").ComputedRef<boolean>;
    totalPages: import("vue").ComputedRef<number>;
    fetchVideos: (params?: {
        page?: number;
        filters?: VideoFilters;
    }) => Promise<void>;
    fetchVideoById: (id: number) => Promise<import("@/services").Video>;
    uploadVideo: (file: File, onProgress?: (progress: number) => void) => Promise<import("@/services").Video>;
    deleteVideo: (id: number) => Promise<void>;
    updateFilters: (newFilters: VideoFilters) => void;
    clearFilters: () => void;
    setCurrentVideo: (video: Video | null) => void;
    clearError: () => void;
    reset: () => void;
}, "hasVideos" | "totalPages">, Pick<{
    videos: import("vue").Ref<{
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    }[], Video[] | {
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    }[]>;
    currentVideo: import("vue").Ref<{
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    } | null, Video | {
        id: number;
        title: string;
        file_path: string;
        thumbnail?: string | undefined;
        duration?: number | undefined;
        fps?: number | undefined;
        width?: number | undefined;
        height?: number | undefined;
        created_at: string;
        updated_at: string;
        annotations_count?: number | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    filters: import("vue").Ref<{
        title?: string | undefined;
        created_after?: string | undefined;
        created_before?: string | undefined;
        has_annotations?: boolean | undefined;
        min_duration?: number | undefined;
        max_duration?: number | undefined;
    }, VideoFilters | {
        title?: string | undefined;
        created_after?: string | undefined;
        created_before?: string | undefined;
        has_annotations?: boolean | undefined;
        min_duration?: number | undefined;
        max_duration?: number | undefined;
    }>;
    pagination: import("vue").Ref<{
        page: number;
        pageSize: number;
        total: number;
    }, {
        page: number;
        pageSize: number;
        total: number;
    } | {
        page: number;
        pageSize: number;
        total: number;
    }>;
    hasVideos: import("vue").ComputedRef<boolean>;
    totalPages: import("vue").ComputedRef<number>;
    fetchVideos: (params?: {
        page?: number;
        filters?: VideoFilters;
    }) => Promise<void>;
    fetchVideoById: (id: number) => Promise<import("@/services").Video>;
    uploadVideo: (file: File, onProgress?: (progress: number) => void) => Promise<import("@/services").Video>;
    deleteVideo: (id: number) => Promise<void>;
    updateFilters: (newFilters: VideoFilters) => void;
    clearFilters: () => void;
    setCurrentVideo: (video: Video | null) => void;
    clearError: () => void;
    reset: () => void;
}, "clearError" | "reset" | "fetchVideos" | "fetchVideoById" | "uploadVideo" | "deleteVideo" | "updateFilters" | "clearFilters" | "setCurrentVideo">>;
