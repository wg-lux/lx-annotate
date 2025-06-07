// API Response Types
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

// Video-related Types
export interface Video {
  id: number;
  title: string;
  file_path: string;
  thumbnail?: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
  annotations_count?: number;
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

// Annotation Types
export interface Annotation {
  id: number;
  video: number;
  timestamp: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
  category?: string;
  is_active: boolean;
}

// User & Auth Types
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

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationError {
  [field: string]: string[];
}

// Upload Types
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

// Filter & Search Types
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

// Component Props Types
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

// Store State Types
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
  labels: Label[];
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