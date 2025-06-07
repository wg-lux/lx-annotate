import { apiService } from './api';
import type { Report, Annotation as ReportAnnotation, CreateAnnotationRequest } from '@/types/reports';

// Types for Video/Annotation domain
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

// Report Service
export class ReportService {
  async getReport(id: number): Promise<Report> {
    return apiService.get<Report>(`/api/reports/${id}/`);
  }

  async getReportWithSecureUrl(id: number): Promise<Report> {
    return apiService.get<Report>(`/api/reports/${id}/with-secure-url/`);
  }

  async getReports(params?: { page?: number; limit?: number; status?: string }): Promise<{ results: Report[]; count: number }> {
    return apiService.get<{ results: Report[]; count: number }>('/api/reports/', { params });
  }

  async uploadReport(file: File, onProgress?: (progress: number) => void): Promise<Report> {
    return apiService.uploadFile<Report>('/api/reports/upload/', file, onProgress);
  }

  async deleteReport(id: number): Promise<void> {
    return apiService.delete(`/api/reports/${id}/`);
  }

  // Annotation methods (basic structure for future implementation)
  async getReportAnnotations(reportId: number): Promise<ReportAnnotation[]> {
    return apiService.get<ReportAnnotation[]>(`/api/reports/${reportId}/annotations/`);
  }

  async createAnnotation(data: CreateAnnotationRequest): Promise<ReportAnnotation> {
    return apiService.post<ReportAnnotation>(`/api/reports/${data.reportId}/annotations/`, data);
  }

  async updateAnnotation(reportId: number, annotationId: number, data: Partial<ReportAnnotation>): Promise<ReportAnnotation> {
    return apiService.put<ReportAnnotation>(`/api/reports/${reportId}/annotations/${annotationId}/`, data);
  }

  async deleteAnnotation(reportId: number, annotationId: number): Promise<void> {
    return apiService.delete(`/api/reports/${reportId}/annotations/${annotationId}/`);
  }

  // Utility method to determine file type from filename
  getFileTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return 'video';
      case 'txt':
      case 'rtf':
        return 'text';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      default:
        return 'unknown';
    }
  }
}

// Video Service
export class VideoService {
  async getVideos(params?: { page?: number; limit?: number }): Promise<{ results: Video[]; count: number }> {
    return apiService.get<{ results: Video[]; count: number }>('/api/videos/', { params });
  }

  async getVideo(id: number): Promise<Video> {
    return apiService.get<Video>(`/api/videos/${id}/`);
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<Video> {
    return apiService.uploadFile<Video>('/api/videos/upload/', file, onProgress);
  }

  async deleteVideo(id: number): Promise<void> {
    return apiService.delete(`/api/videos/${id}/`);
  }

  async getVideoAnnotations(videoId: number): Promise<VideoAnnotation[]> {
    return apiService.get<VideoAnnotation[]>(`/api/videos/${videoId}/annotations/`);
  }
}

// Label Segment Service
export class LabelSegmentService {
  async getLabelSegments(videoId: number): Promise<LabelSegment[]> {
    return apiService.get<LabelSegment[]>(`/api/label-segments/?video_id=${videoId}`);
  }

  async createLabelSegment(data: Partial<LabelSegment>): Promise<LabelSegment> {
    return apiService.post<LabelSegment>('/api/label-segments/', data);
  }

  async updateLabelSegment(id: number, data: Partial<LabelSegment>): Promise<LabelSegment> {
    return apiService.put<LabelSegment>(`/api/label-segments/${id}/`, data);
  }

  async deleteLabelSegment(id: number): Promise<void> {
    return apiService.delete(`/api/label-segments/${id}/`);
  }
}

// Export service instances
export const videoService = new VideoService();
export const labelSegmentService = new LabelSegmentService();
export const reportService = new ReportService();