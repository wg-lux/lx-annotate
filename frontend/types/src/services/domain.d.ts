import type { Report, Annotation as ReportAnnotation, CreateAnnotationRequest } from '@/types/reports';
export interface Video {
    id: number;
    title: string;
    file_path: string;
    duration: number;
    created_at: string;
    updated_at: string;
    thumbnail_url?: string;
}
export interface VideoAnnotation {
    id: number;
    video_id: number;
    start_time: number;
    end_time: number;
    label: string;
    confidence?: number;
    metadata?: Record<string, any>;
}
export interface LabelSegment {
    id: number;
    video_id: number;
    start_frame: number;
    end_frame: number;
    label: string;
    annotations: VideoAnnotation[];
}
export declare class ReportService {
    getReport(id: number): Promise<Report>;
    getReportWithSecureUrl(id: number): Promise<Report>;
    getReports(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<{
        results: Report[];
        count: number;
    }>;
    uploadReport(file: File, onProgress?: (progress: number) => void): Promise<Report>;
    deleteReport(id: number): Promise<void>;
    getReportAnnotations(reportId: number): Promise<ReportAnnotation[]>;
    createAnnotation(data: CreateAnnotationRequest): Promise<ReportAnnotation>;
    updateAnnotation(reportId: number, annotationId: number, data: Partial<ReportAnnotation>): Promise<ReportAnnotation>;
    deleteAnnotation(reportId: number, annotationId: number): Promise<void>;
    getFileTypeFromFilename(filename: string): string;
}
export declare class VideoService {
    getVideos(params?: {
        page?: number;
        limit?: number;
    }): Promise<{
        results: Video[];
        count: number;
    }>;
    getVideo(id: number): Promise<Video>;
    uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<Video>;
    deleteVideo(id: number): Promise<void>;
    getVideoAnnotations(videoId: number): Promise<VideoAnnotation[]>;
}
export declare class LabelSegmentService {
    getLabelSegments(videoId: number): Promise<LabelSegment[]>;
    createLabelSegment(data: Partial<LabelSegment>): Promise<LabelSegment>;
    updateLabelSegment(id: number, data: Partial<LabelSegment>): Promise<LabelSegment>;
    deleteLabelSegment(id: number): Promise<void>;
}
export declare const videoService: VideoService;
export declare const labelSegmentService: LabelSegmentService;
export declare const reportService: ReportService;
