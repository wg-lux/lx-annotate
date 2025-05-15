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
export interface SensitiveMeta {
    id: number;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_dob?: string;
    patient_gender?: string;
    casenumber?: string | null;
    examination_date?: string;
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
            };
            status?: string;
            error?: boolean;
        };
        pending: {
            id: number;
            sensitive_meta_id: number;
            text: string;
            anonymized_text: string;
            report_meta?: {
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
            };
            status?: string;
            error?: boolean;
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
        };
        status?: string;
        error?: boolean;
    };
}, {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    fetchNext(lastId?: number): Promise<PatientData>;
    patchPdf(payload: Partial<PatientData>): Promise<import("axios").AxiosResponse<any, any>>;
    patchVideo(payload: any): Promise<import("axios").AxiosResponse<any, any>>;
    fetchPendingAnonymizations(): any;
}>;
