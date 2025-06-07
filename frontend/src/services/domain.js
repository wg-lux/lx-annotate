import { apiService } from './api';
// Report Service
export class ReportService {
    async getReport(id) {
        return apiService.get(`/api/reports/${id}/`);
    }
    async getReportWithSecureUrl(id) {
        return apiService.get(`/api/reports/${id}/with-secure-url/`);
    }
    async getReports(params) {
        return apiService.get('/api/reports/', { params });
    }
    async uploadReport(file, onProgress) {
        return apiService.uploadFile('/api/reports/upload/', file, onProgress);
    }
    async deleteReport(id) {
        return apiService.delete(`/api/reports/${id}/`);
    }
    // Annotation methods (basic structure for future implementation)
    async getReportAnnotations(reportId) {
        return apiService.get(`/api/reports/${reportId}/annotations/`);
    }
    async createAnnotation(data) {
        return apiService.post(`/api/reports/${data.reportId}/annotations/`, data);
    }
    async updateAnnotation(reportId, annotationId, data) {
        return apiService.put(`/api/reports/${reportId}/annotations/${annotationId}/`, data);
    }
    async deleteAnnotation(reportId, annotationId) {
        return apiService.delete(`/api/reports/${reportId}/annotations/${annotationId}/`);
    }
    // Utility method to determine file type from filename
    getFileTypeFromFilename(filename) {
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
    async getVideos(params) {
        return apiService.get('/api/videos/', { params });
    }
    async getVideo(id) {
        return apiService.get(`/api/videos/${id}/`);
    }
    async uploadVideo(file, onProgress) {
        return apiService.uploadFile('/api/videos/upload/', file, onProgress);
    }
    async deleteVideo(id) {
        return apiService.delete(`/api/videos/${id}/`);
    }
    async getVideoAnnotations(videoId) {
        return apiService.get(`/api/videos/${videoId}/annotations/`);
    }
}
// Label Segment Service
export class LabelSegmentService {
    async getLabelSegments(videoId) {
        return apiService.get(`/api/label-segments/?video_id=${videoId}`);
    }
    async createLabelSegment(data) {
        return apiService.post('/api/label-segments/', data);
    }
    async updateLabelSegment(id, data) {
        return apiService.put(`/api/label-segments/${id}/`, data);
    }
    async deleteLabelSegment(id) {
        return apiService.delete(`/api/label-segments/${id}/`);
    }
}
// Export service instances
export const videoService = new VideoService();
export const labelSegmentService = new LabelSegmentService();
export const reportService = new ReportService();
