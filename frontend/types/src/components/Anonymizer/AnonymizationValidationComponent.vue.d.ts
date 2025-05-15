import { type PatientData } from '@/stores/anonymizationStore';
declare const _default: import("vue").DefineComponent<{}, {
    store: import("pinia").Store<"anonymization", import("@/stores/anonymizationStore").AnonymizationState & {
        pending: PatientData[];
    }, {
        getCurrentItem: (state: {
            anonymizationStatus: string;
            loading: boolean;
            error: string;
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
                    casenumber?: string;
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
                    casenumber?: string;
                    examination_date?: string;
                };
                status?: string;
                error?: boolean;
            }[];
        } & import("pinia").PiniaCustomStateProperties<import("@/stores/anonymizationStore").AnonymizationState & {
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
                casenumber?: string;
                examination_date?: string;
            };
            status?: string;
            error?: boolean;
        };
    }, {
        fetchNext(lastId?: number): Promise<PatientData>;
        patchPdf(payload: Partial<PatientData>): Promise<import("axios").AxiosResponse<any, any>>;
        patchVideo(payload: any): Promise<import("axios").AxiosResponse<any, any>>;
        fetchPendingAnonymizations(): any;
    }>;
    currentItem: import("vue").ComputedRef<{
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
            casenumber?: string;
            examination_date?: string;
        };
        status?: string;
        error?: boolean;
    }>;
    editedAnonymizedText: import("vue").Ref<string, string>;
    editedPatient: {
        patient_first_name: string;
        patient_last_name: string;
        patient_gender: string;
        patient_dob: string;
        casenumber: string;
    };
    examinationDate: import("vue").Ref<string, string>;
    isExaminationDateValid: import("vue").ComputedRef<boolean>;
    dirty: import("vue").ComputedRef<boolean>;
    approveItem: () => Promise<void>;
    rejectItem: () => Promise<void>;
    skipItem: () => Promise<void>;
    showOriginal: import("vue").Ref<boolean, boolean>;
    originalUrl: import("vue").Ref<string, string>;
    processedUrl: import("vue").Ref<string, string>;
    toggleImage: () => void;
    saveAnnotation: () => Promise<void>;
    canSubmit: import("vue").ComputedRef<boolean>;
    pond: import("vue").Ref<any, any>;
}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    FilePond: any;
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
