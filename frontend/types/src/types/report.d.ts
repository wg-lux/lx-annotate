export interface ReportMeta {
    id: number;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_gender?: string;
    patient_dob?: string;
    casenumber?: string;
    examination_date?: string;
    pdf_url?: string;
    created_at: string;
    updated_at: string;
}
export interface SecureFileUrl {
    url: string;
    expires_at: string;
    file_type: string;
    file_size: number;
    original_filename: string;
}
export interface ReportData {
    id: number;
    anonymized_text?: string;
    report_meta: ReportMeta;
    secure_file_url?: SecureFileUrl;
    file_type?: string;
    status: 'pending' | 'approved' | 'rejected';
}
export interface FileUrlRequest {
    report_id: number;
    file_type?: string;
}
export interface FileUrlResponse {
    url: string;
    expires_at: string;
    file_type: string;
    original_filename: string;
    file_size: number;
}
