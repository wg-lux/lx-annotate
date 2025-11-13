export interface FileItem {
    id: number;
    filename: string;
    mediaType: 'pdf' | 'video';
    anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
    annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
    createdAt: string;
    sensitiveMetaId?: number;
    metadataImported: boolean;
    fileSize?: number | undefined;
    rawFile?: string;
}
export interface AnonymizationState {
    anonymizationStatus: string;
    loading: boolean;
    error: string | null;
    pending: [boolean];
    current: SensitiveMeta | null;
    overview: FileItem[];
    pollingHandles: Record<number, ReturnType<typeof setInterval>>;
    isPolling: boolean;
    hasAvailableFiles: boolean;
    availableFiles: FileItem[];
    needsValidationIds: number[];
}
export interface SensitiveMeta {
    id: number;
    casenumber?: string | null;
    patientFirstName?: string | null;
    patientLastName?: string | null;
    patientDob?: string | null;
    patientDobDisplay?: string | null;
    patientGender: string;
    examinationDate: string | null;
    centerName?: string;
    patientGenderName?: string;
    examinersDisplay: string | null;
    endoscopeType?: string;
    endoscopeSn?: string;
    isVerified?: boolean;
    dobVerified?: boolean;
    namesVerified?: boolean;
    anonymizedText?: string;
    text?: string;
    externalId?: string;
    externalIdOrigin?: string;
}
export declare const availableFiles: import("vue").Ref<{
    id: number;
    filename: string;
    mediaType: 'pdf' | 'video';
    anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
    annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
    createdAt: string;
    sensitiveMetaId?: number | undefined;
    metadataImported: boolean;
    fileSize?: number | undefined;
    rawFile?: string | undefined;
}[], FileItem[] | {
    id: number;
    filename: string;
    mediaType: 'pdf' | 'video';
    anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
    annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
    createdAt: string;
    sensitiveMetaId?: number | undefined;
    metadataImported: boolean;
    fileSize?: number | undefined;
    rawFile?: string | undefined;
}[]>;
export declare const useAnonymizationStore: import("pinia").StoreDefinition<"anonymization", AnonymizationState, {
    getCurrentItem: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        pending: [boolean];
        current: {
            id: number;
            casenumber?: string | null | undefined;
            patientFirstName?: string | null | undefined;
            patientLastName?: string | null | undefined;
            patientDob?: string | null | undefined;
            patientDobDisplay?: string | null | undefined;
            patientGender: string;
            examinationDate: string | null;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            examinersDisplay: string | null;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            anonymizedText?: string | undefined;
            text?: string | undefined;
            externalId?: string | undefined;
            externalIdOrigin?: string | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pollingHandles: Record<number, ReturnType<typeof setInterval>>;
        isPolling: boolean;
        hasAvailableFiles: boolean;
        availableFiles: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        needsValidationIds: number[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState>) => {
        id: number;
        casenumber?: string | null | undefined;
        patientFirstName?: string | null | undefined;
        patientLastName?: string | null | undefined;
        patientDob?: string | null | undefined;
        patientDobDisplay?: string | null | undefined;
        patientGender: string;
        examinationDate: string | null;
        centerName?: string | undefined;
        patientGenderName?: string | undefined;
        examinersDisplay: string | null;
        endoscopeType?: string | undefined;
        endoscopeSn?: string | undefined;
        isVerified?: boolean | undefined;
        dobVerified?: boolean | undefined;
        namesVerified?: boolean | undefined;
        anonymizedText?: string | undefined;
        text?: string | undefined;
        externalId?: string | undefined;
        externalIdOrigin?: string | undefined;
    } | null;
    isAnyFileProcessing: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        pending: [boolean];
        current: {
            id: number;
            casenumber?: string | null | undefined;
            patientFirstName?: string | null | undefined;
            patientLastName?: string | null | undefined;
            patientDob?: string | null | undefined;
            patientDobDisplay?: string | null | undefined;
            patientGender: string;
            examinationDate: string | null;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            examinersDisplay: string | null;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            anonymizedText?: string | undefined;
            text?: string | undefined;
            externalId?: string | undefined;
            externalIdOrigin?: string | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pollingHandles: Record<number, ReturnType<typeof setInterval>>;
        isPolling: boolean;
        hasAvailableFiles: boolean;
        availableFiles: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        needsValidationIds: number[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState>) => boolean;
    processingFiles: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        pending: [boolean];
        current: {
            id: number;
            casenumber?: string | null | undefined;
            patientFirstName?: string | null | undefined;
            patientLastName?: string | null | undefined;
            patientDob?: string | null | undefined;
            patientDobDisplay?: string | null | undefined;
            patientGender: string;
            examinationDate: string | null;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            examinersDisplay: string | null;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            anonymizedText?: string | undefined;
            text?: string | undefined;
            externalId?: string | undefined;
            externalIdOrigin?: string | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pollingHandles: Record<number, ReturnType<typeof setInterval>>;
        isPolling: boolean;
        hasAvailableFiles: boolean;
        availableFiles: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        needsValidationIds: number[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState>) => {
        id: number;
        filename: string;
        mediaType: 'pdf' | 'video';
        anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
        annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
        createdAt: string;
        sensitiveMetaId?: number | undefined;
        metadataImported: boolean;
        fileSize?: number | undefined;
        rawFile?: string | undefined;
    }[];
    getState: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        pending: [boolean];
        current: {
            id: number;
            casenumber?: string | null | undefined;
            patientFirstName?: string | null | undefined;
            patientLastName?: string | null | undefined;
            patientDob?: string | null | undefined;
            patientDobDisplay?: string | null | undefined;
            patientGender: string;
            examinationDate: string | null;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            examinersDisplay: string | null;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            anonymizedText?: string | undefined;
            text?: string | undefined;
            externalId?: string | undefined;
            externalIdOrigin?: string | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pollingHandles: Record<number, ReturnType<typeof setInterval>>;
        isPolling: boolean;
        hasAvailableFiles: boolean;
        availableFiles: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        needsValidationIds: number[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState>) => {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        pending: [boolean];
        current: {
            id: number;
            casenumber?: string | null | undefined;
            patientFirstName?: string | null | undefined;
            patientLastName?: string | null | undefined;
            patientDob?: string | null | undefined;
            patientDobDisplay?: string | null | undefined;
            patientGender: string;
            examinationDate: string | null;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            examinersDisplay: string | null;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            anonymizedText?: string | undefined;
            text?: string | undefined;
            externalId?: string | undefined;
            externalIdOrigin?: string | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pollingHandles: Record<number, ReturnType<typeof setInterval>>;
        isPolling: boolean;
        hasAvailableFiles: boolean;
        availableFiles: {
            id: number;
            filename: string;
            mediaType: 'pdf' | 'video';
            anonymizationStatus: 'not_started' | 'processing_anonymization' | 'done_processing_anonymization' | 'failed' | 'validated' | 'predicting_segments' | 'extracting_frames';
            annotationStatus: 'not_started' | 'done_processing_anonymization' | '';
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        needsValidationIds: number[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState>;
}, {
    /** Gets the next anonymization file + its metadata */
    fetchNext(lastId?: number): Promise<any>;
    patchPdf(payload: {
        id: number;
        [key: string]: any;
    }): Promise<any>;
    patchVideo(payload: {
        id: number;
        [key: string]: any;
    }): Promise<any>;
    fetchPendingAnonymizations(): [boolean];
    /**
     * Fetch overview of all uploaded files with their statuses
     */
    fetchOverview(): Promise<FileItem[]>;
    /**
     * Start anonymization for a specific file
     */
    startAnonymization(id: number): Promise<boolean>;
    /**
     * Start polling status for a specific file
     */
    startPolling(id: number): void;
    /**
     * Stop polling for a specific file
     */
    stopPolling(id: number): void;
    /**
     * Stop all polling
     */
    stopAllPolling(): void;
    /**
     * Set current item for validation (called when clicking "Validate")
     */
    setCurrentForValidation(id: number): Promise<SensitiveMeta | null>;
    /**
     * Refresh overview data
     */
    refreshOverview(): Promise<void>;
    /**
     * Re-import a video file to regenerate metadata
     */
    reimportVideo(fileId: number): Promise<boolean>;
    /**
     * Re-import a PDF file to regenerate metadata
     * Follows the same pattern as reimportVideo for consistency
     */
    reimportPdf(fileId: number): Promise<boolean>;
}>;
