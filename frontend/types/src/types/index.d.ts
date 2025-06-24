export interface ApiResponse<T = any> {
    data: T;
    message?: string;
    status: 'success' | 'error';
    timestamp?: string;
}
export interface PaginatedResponse<T> {
    results: T[];
    count: number;
    next: string | null;
    previous: string | null;
    page_size: number;
    current_page: number;
}
export interface Video {
    id: string;
    title: string;
    url: string;
    duration: number;
    status: 'available' | 'processing' | 'error';
    assignedUser?: string;
    anonymized: boolean;
    originalFileName: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface VideoSegment {
    id: number;
    video: number;
    start_time: number;
    end_time: number;
    label?: string;
    confidence?: number;
    created_at: string;
    updated_at: string;
}
export interface Segment {
    id: string | number;
    label: string;
    label_display: string;
    startTime: number;
    endTime: number;
    avgConfidence: number;
    video_id?: number;
    label_id?: number;
    start_frame_number?: number;
    end_frame_number?: number;
}
export * from './annotation';
export interface Annotation {
    id: string;
    videoId: string;
    startTime: number;
    endTime: number;
    category: string;
    text: string;
    isDraft: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}
export interface VideoMeta {
    id: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
}
export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_staff: boolean;
    date_joined: string;
    last_login?: string;
}
export interface AuthTokens {
    access: string;
    refresh: string;
    expires_in: number;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface LoginResponse {
    user: User;
    tokens: AuthTokens;
}
export interface ApiError {
    message: string;
    code?: string;
    field?: string;
    details?: Record<string, any>;
}
export interface ValidationError {
    [field: string]: string[];
}
export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}
export interface FileUploadResponse {
    id: number;
    file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
}
export interface VideoFilters {
    title?: string;
    created_after?: string;
    created_before?: string;
    has_annotations?: boolean;
    min_duration?: number;
    max_duration?: number;
}
export interface AnnotationFilters {
    video?: number;
    label?: string;
    confidence_min?: number;
    confidence_max?: number;
    created_after?: string;
    created_before?: string;
}
export interface TableColumn<T = any> {
    key: keyof T;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any, row: T) => string;
}
export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
}
export interface VideoState {
    videos: Video[];
    currentVideo: Video | null;
    loading: boolean;
    error: string | null;
    filters: VideoFilters;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}
export interface AnnotationState {
    annotations: Annotation[];
    currentAnnotation: Annotation | null;
    labels: import('./annotation').Label[];
    loading: boolean;
    error: string | null;
    filters: AnnotationFilters;
}
export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    tokens: AuthTokens | null;
    loading: boolean;
    error: string | null;
}
