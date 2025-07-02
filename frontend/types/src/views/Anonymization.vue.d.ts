declare const _default: import("vue").DefineComponent<{}, {}, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, {}, string, import("vue").PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {
    AnonymizationValidationComponent: import("vue").DefineComponent<{}, {
        store: import("pinia").Store<"anonymization", import("../stores/anonymizationStore.js").AnonymizationState & {
            pending: import("../stores/anonymizationStore.js").PatientData[];
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
            } & import("pinia").PiniaCustomStateProperties<import("../stores/anonymizationStore.js").AnonymizationState & {
                pending: import("../stores/anonymizationStore.js").PatientData[];
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
            fetchNext(lastId?: number | undefined): Promise<import("../stores/anonymizationStore.js").PatientData | null>;
            patchPdf(payload: Partial<import("../stores/anonymizationStore.js").PatientData>): Promise<import("axios").AxiosResponse<any, any>>;
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
        currentItem: import("vue").ComputedRef<{
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
        } | null>;
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
}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default _default;
