export interface AnonymizationState {
    anonymizationStatus: string;
    loading: boolean;
    error: string | null;
}
export interface AnonymizationPageState {
    page: number;
    pageSize: number;
    total: number;
    data: any[];
}
export interface PatientData {
    text: string;
    anonymized_text: string;
    report_meta: {
        casenumber: string | null;
        patient_dob: string | null;
        patient_first_name: string;
        patient_gender: string;
        patient_last_name: string;
        pdf_hash: string;
        examination_date?: string;
    };
    id: string;
    status?: string;
}
export declare const useAnonymizationStore: import("pinia").StoreDefinition<"anonymization", AnonymizationState & {
    pendingAnonymizations: PatientData[];
}, {}, {
    fetchPendingAnonymizations(): Promise<{
        text: string;
        anonymized_text: string;
        report_meta: {
            casenumber: string | null;
            patient_dob: string | null;
            patient_first_name: string;
            patient_gender: string;
            patient_last_name: string;
            pdf_hash: string;
            examination_date?: string | undefined;
        };
        id: string;
        status?: string | undefined;
    }[]>;
    updateAnonymization(data: Partial<PatientData>): Promise<void>;
}>;
