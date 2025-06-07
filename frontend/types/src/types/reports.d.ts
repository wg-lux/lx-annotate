export interface ResponseReport {
    id: number;
    title: string;
    fileType: string;
    url: string;
    downloadUrl: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface ReportViewerProps {
    reportId: number;
}
export type ViewerType = 'pdf' | 'image' | 'spreadsheet' | 'text' | 'unknown';
export interface ReportMeta {
    patientFirstName: string;
    patientLastName: string;
    patientGender: number;
    patientDob: string;
    examinationDate: string;
}
export interface SecureFileUrl {
    url: string;
    expiresAt: string;
    fileType: string;
    originalFilename: string;
    fileSize: number;
}
export interface Report {
    id: number;
    anonymizedText: string;
    status: 'pending' | 'completed' | 'failed';
    reportMeta: ReportMeta;
    fileType: string;
    secureFileUrl: SecureFileUrl;
}
export interface LegacyReport {
    id: number;
    anonymized_text: string;
    status: string;
    report_meta: {
        patient_first_name: string;
        patient_last_name: string;
        patient_gender: number;
        patient_dob: string;
        examination_date: string;
    };
    file_type: string;
    secure_file_url: {
        url: string;
        expires_at: string;
        file_type: string;
        original_filename: string;
        file_size: number;
    };
}
export interface Annotation {
    id: number;
    reportId: number;
    type: 'highlight' | 'note' | 'tag';
    content: string;
    position: {
        page?: number;
        x: number;
        y: number;
        width?: number;
        height?: number;
    };
    createdAt: string;
    updatedAt: string;
    userId: number;
}
export interface CreateAnnotationRequest {
    reportId: number;
    type: 'highlight' | 'note' | 'tag';
    content: string;
    position: {
        page?: number;
        x: number;
        y: number;
        width?: number;
        height?: number;
    };
}
