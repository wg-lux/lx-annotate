import type { Video, VideoFilters } from '@/types';
export declare const useVideoStore: import("pinia").StoreDefinition<"video", import("pinia")._UnwrapAll<Pick<{
    videos: import("vue").Ref<{
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    }[], Video[] | {
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    currentVideo: import("vue").Ref<{
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    } | null, Video | {
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
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
}, "videos" | "currentVideo" | "error" | "loading" | "filters" | "pagination">>, Pick<{
    videos: import("vue").Ref<{
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    }[], Video[] | {
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    currentVideo: import("vue").Ref<{
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    } | null, Video | {
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
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
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    }[], Video[] | {
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    currentVideo: import("vue").Ref<{
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
    } | null, Video | {
        id: string;
        title: string;
        url: string;
        duration: number;
        status: "available" | "error" | "processing";
        assignedUser?: string | undefined;
        anonymized: boolean;
        originalFileName: string;
        createdAt: Date;
        updatedAt: Date;
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
}, "reset" | "clearError" | "updateFilters" | "fetchVideos" | "fetchVideoById" | "uploadVideo" | "deleteVideo" | "clearFilters" | "setCurrentVideo">>;
