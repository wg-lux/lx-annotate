export interface SensitiveMetaData {
    id: number;
    patient_first_name: string;
    patient_last_name: string;
    patient_dob: string;
    examination_date: string;
    patient_gender?: string;
    center?: string;
    examiners?: string[];
    endoscope_type?: string;
    endoscope_sn?: string;
    patient_hash?: string;
    examination_hash?: string;
    video_file?: {
        id: number;
        original_file_name: string;
        duration: number;
        video_url: string;
    };
    pdf_file?: {
        id: number;
        original_file_name: string;
        file_url: string;
    };
}
export interface SensitiveMetaUpdateRequest {
    sensitive_meta_id: number;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_dob?: string;
    examination_date?: string;
}
export interface SensitiveMetaResponse {
    message: string;
    updated_data: SensitiveMetaData;
}
export declare const useSensitiveMetaStore: import("pinia").StoreDefinition<"sensitiveMeta", import("pinia")._UnwrapAll<Pick<{
    currentMetaData: import("vue").Ref<{
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    } | null, SensitiveMetaData | {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    } | null>;
    metaDataCache: import("vue").Ref<Map<number, {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    }> & Omit<Map<number, SensitiveMetaData>, keyof Map<any, any>>, Map<number, SensitiveMetaData> | (Map<number, {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    }> & Omit<Map<number, SensitiveMetaData>, keyof Map<any, any>>)>;
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    lastFetchedId: import("vue").Ref<number | null, number | null>;
    successMessage: import("vue").Ref<string | null, string | null>;
    isCurrentDataVerified: import("vue").ComputedRef<boolean>;
    totalCachedRecords: import("vue").ComputedRef<number>;
    fetchSensitiveMetaData: (options?: {
        patientId?: number;
        lastId?: number;
        mediaType?: 'video' | 'pdf';
    }) => Promise<SensitiveMetaData | null>;
    updateSensitiveMetaData: (updateData: SensitiveMetaUpdateRequest, mediaType?: 'video' | 'pdf') => Promise<SensitiveMetaData>;
    fetchNextPatient: (mediaType?: 'video' | 'pdf') => Promise<SensitiveMetaData | null>;
    getCachedMetaData: (id: number) => SensitiveMetaData | null;
    clearCurrentData: () => void;
    clearCache: () => void;
    clearError: () => void;
    clearSuccessMessage: () => void;
    validateMetaData: (data: Partial<SensitiveMetaUpdateRequest>) => {
        isValid: boolean;
        errors: Record<string, string>;
    };
    searchCachedData: (searchTerm: string) => SensitiveMetaData[];
}, "loading" | "error" | "currentMetaData" | "metaDataCache" | "saving" | "lastFetchedId" | "successMessage">>, Pick<{
    currentMetaData: import("vue").Ref<{
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    } | null, SensitiveMetaData | {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    } | null>;
    metaDataCache: import("vue").Ref<Map<number, {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    }> & Omit<Map<number, SensitiveMetaData>, keyof Map<any, any>>, Map<number, SensitiveMetaData> | (Map<number, {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    }> & Omit<Map<number, SensitiveMetaData>, keyof Map<any, any>>)>;
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    lastFetchedId: import("vue").Ref<number | null, number | null>;
    successMessage: import("vue").Ref<string | null, string | null>;
    isCurrentDataVerified: import("vue").ComputedRef<boolean>;
    totalCachedRecords: import("vue").ComputedRef<number>;
    fetchSensitiveMetaData: (options?: {
        patientId?: number;
        lastId?: number;
        mediaType?: 'video' | 'pdf';
    }) => Promise<SensitiveMetaData | null>;
    updateSensitiveMetaData: (updateData: SensitiveMetaUpdateRequest, mediaType?: 'video' | 'pdf') => Promise<SensitiveMetaData>;
    fetchNextPatient: (mediaType?: 'video' | 'pdf') => Promise<SensitiveMetaData | null>;
    getCachedMetaData: (id: number) => SensitiveMetaData | null;
    clearCurrentData: () => void;
    clearCache: () => void;
    clearError: () => void;
    clearSuccessMessage: () => void;
    validateMetaData: (data: Partial<SensitiveMetaUpdateRequest>) => {
        isValid: boolean;
        errors: Record<string, string>;
    };
    searchCachedData: (searchTerm: string) => SensitiveMetaData[];
}, "isCurrentDataVerified" | "totalCachedRecords">, Pick<{
    currentMetaData: import("vue").Ref<{
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    } | null, SensitiveMetaData | {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    } | null>;
    metaDataCache: import("vue").Ref<Map<number, {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    }> & Omit<Map<number, SensitiveMetaData>, keyof Map<any, any>>, Map<number, SensitiveMetaData> | (Map<number, {
        id: number;
        patient_first_name: string;
        patient_last_name: string;
        patient_dob: string;
        examination_date: string;
        patient_gender?: string | undefined;
        center?: string | undefined;
        examiners?: string[] | undefined;
        endoscope_type?: string | undefined;
        endoscope_sn?: string | undefined;
        patient_hash?: string | undefined;
        examination_hash?: string | undefined;
        video_file?: {
            id: number;
            original_file_name: string;
            duration: number;
            video_url: string;
        } | undefined;
        pdf_file?: {
            id: number;
            original_file_name: string;
            file_url: string;
        } | undefined;
    }> & Omit<Map<number, SensitiveMetaData>, keyof Map<any, any>>)>;
    loading: import("vue").Ref<boolean, boolean>;
    saving: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    lastFetchedId: import("vue").Ref<number | null, number | null>;
    successMessage: import("vue").Ref<string | null, string | null>;
    isCurrentDataVerified: import("vue").ComputedRef<boolean>;
    totalCachedRecords: import("vue").ComputedRef<number>;
    fetchSensitiveMetaData: (options?: {
        patientId?: number;
        lastId?: number;
        mediaType?: 'video' | 'pdf';
    }) => Promise<SensitiveMetaData | null>;
    updateSensitiveMetaData: (updateData: SensitiveMetaUpdateRequest, mediaType?: 'video' | 'pdf') => Promise<SensitiveMetaData>;
    fetchNextPatient: (mediaType?: 'video' | 'pdf') => Promise<SensitiveMetaData | null>;
    getCachedMetaData: (id: number) => SensitiveMetaData | null;
    clearCurrentData: () => void;
    clearCache: () => void;
    clearError: () => void;
    clearSuccessMessage: () => void;
    validateMetaData: (data: Partial<SensitiveMetaUpdateRequest>) => {
        isValid: boolean;
        errors: Record<string, string>;
    };
    searchCachedData: (searchTerm: string) => SensitiveMetaData[];
}, "fetchSensitiveMetaData" | "updateSensitiveMetaData" | "fetchNextPatient" | "getCachedMetaData" | "clearCurrentData" | "clearCache" | "clearError" | "clearSuccessMessage" | "validateMetaData" | "searchCachedData">>;
