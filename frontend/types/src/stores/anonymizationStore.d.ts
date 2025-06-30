export interface AnonymizationState {
    anonymizationStatus: string;
    loading: boolean;
    error: string | null;
    current: PatientData | null;
}
export interface SensitiveMetaApiResponse {
    id: number;
    file?: string;
    pdf_url?: string;
    full_pdf_path?: string;
    sensitive_meta_id?: number;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_dob?: string;
    patient_gender?: string;
    casenumber?: string | null;
    examination_date?: string;
}
export interface PdfDataResponse {
    id: number;
    sensitive_meta_id: number;
    text: string;
    anonymized_text: string;
    status?: string;
    error?: boolean;
}
export interface PatientData {
    id: number;
    sensitive_meta_id: number;
    text: string;
    anonymized_text: string;
    report_meta?: SensitiveMetaApiResponse;
    status?: string;
    error?: boolean;
}
export declare const useAnonymizationStore: import("pinia").StoreDefinition<"anonymization", AnonymizationState & {
    pending: PatientData[];
}, {
    getCurrentItem: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        current: {
            id: number;
            sensitive_meta_id: number;
            text: string;
            anonymized_text: string;
            report_meta?: {
                id: number;
                file?: string | undefined;
                pdf_url?: string | undefined;
                full_pdf_path?: string | undefined;
                sensitive_meta_id?: number | undefined;
                patient_first_name?: string | undefined;
                patient_last_name?: string | undefined;
                patient_dob?: string | undefined;
                patient_gender?: string | undefined;
                casenumber?: string | null | undefined;
                examination_date?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        } | null;
        pending: {
            id: number;
            sensitive_meta_id: number;
            text: string;
            anonymized_text: string;
            report_meta?: {
                id: number;
                file?: string | undefined;
                pdf_url?: string | undefined;
                full_pdf_path?: string | undefined;
                sensitive_meta_id?: number | undefined;
                patient_first_name?: string | undefined;
                patient_last_name?: string | undefined;
                patient_dob?: string | undefined;
                patient_gender?: string | undefined;
                casenumber?: string | null | undefined;
                examination_date?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        }[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState & {
        pending: PatientData[];
    }>) => {
        id: number;
        sensitive_meta_id: number;
        text: string;
        anonymized_text: string;
        report_meta?: {
            id: number;
            file?: string | undefined;
            pdf_url?: string | undefined;
            full_pdf_path?: string | undefined;
            sensitive_meta_id?: number | undefined;
            patient_first_name?: string | undefined;
            patient_last_name?: string | undefined;
            patient_dob?: string | undefined;
            patient_gender?: string | undefined;
            casenumber?: string | null | undefined;
            examination_date?: string | undefined;
        } | undefined;
        status?: string | undefined;
        error?: boolean | undefined;
    } | null;
}, {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    fetchNext(lastId?: number): Promise<PatientData | null>;
    patchPdf(payload: Partial<PatientData>): Promise<import("axios").AxiosResponse<any, any>>;
    patchVideo(payload: any): Promise<import("axios").AxiosResponse<any, any>>;
    fetchPendingAnonymizations(): {
        id: number;
        sensitive_meta_id: number;
        text: string;
        anonymized_text: string;
        report_meta?: {
            id: number;
            file?: string | undefined;
            pdf_url?: string | undefined;
            full_pdf_path?: string | undefined;
            sensitive_meta_id?: number | undefined;
            patient_first_name?: string | undefined;
            patient_last_name?: string | undefined;
            patient_dob?: string | undefined;
            patient_gender?: string | undefined;
            casenumber?: string | null | undefined;
            examination_date?: string | undefined;
        } | undefined;
        status?: string | undefined;
        error?: boolean | undefined;
    }[];
}>;
