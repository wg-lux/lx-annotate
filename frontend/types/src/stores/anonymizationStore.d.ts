export interface FileItem {
    id: number;
    filename: string;
    mediaType: "pdf" | "video";
    anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
    annotationStatus: "not_started" | "done";
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
    current: PatientData | null;
    overview: FileItem[];
    pollingHandles: Record<number, ReturnType<typeof setInterval>>;
    isPolling: boolean;
    hasAvailableFiles: boolean;
    availableFiles: FileItem[];
}
export interface SensitiveMeta {
    id: number;
    patientFirstName: string | null;
    patientLastName: string | null;
    patientDob: string | null;
    patientGender: string;
    examinationDate: string | null;
    casenumber?: string | null;
    centerName?: string;
    patientGenderName?: string;
    endoscopeType?: string;
    endoscopeSn?: string;
    isVerified?: boolean;
    dobVerified?: boolean;
    namesVerified?: boolean;
    file?: string;
    pdfUrl?: string;
    fullPdfPath?: string;
}
export interface VideoDetailApiResponse {
    id: number;
    sensitiveMetaId: number;
    videoUrl: string | null;
    thumbnail: string | null;
    patientFirstName: string | null;
    patientLastName: string | null;
    patientDob: string | null;
    examinationDate: string | null;
    casenumber?: string | null;
    file: string | null;
}
export interface PdfDataResponse {
    id: number;
    sensitiveMetaId: number;
    text: string;
    anonymizedText: string;
    status?: string;
    error?: boolean;
}
export interface PatientData {
    id: number;
    sensitiveMetaId: number;
    videoUrl?: string | null;
    thumbnail?: string | null;
    text: string;
    anonymizedText: string;
    reportMeta?: SensitiveMeta;
    status?: string;
    error?: boolean;
}
export declare const availableFiles: import("vue").Ref<{
    id: number;
    filename: string;
    mediaType: "pdf" | "video";
    anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
    annotationStatus: "not_started" | "done";
    createdAt: string;
    sensitiveMetaId?: number | undefined;
    metadataImported: boolean;
    fileSize?: number | undefined;
    rawFile?: string | undefined;
}[], FileItem[] | {
    id: number;
    filename: string;
    mediaType: "pdf" | "video";
    anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
    annotationStatus: "not_started" | "done";
    createdAt: string;
    sensitiveMetaId?: number | undefined;
    metadataImported: boolean;
    fileSize?: number | undefined;
    rawFile?: string | undefined;
}[]>;
export declare const useAnonymizationStore: import("pinia").StoreDefinition<"anonymization", AnonymizationState & {
    pending: PatientData[];
}, {
    getCurrentItem: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        current: {
            id: number;
            sensitiveMetaId: number;
            videoUrl?: string | null | undefined;
            thumbnail?: string | null | undefined;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string | null;
                patientLastName: string | null;
                patientDob: string | null;
                patientGender: string;
                examinationDate: string | null;
                casenumber?: string | null | undefined;
                centerName?: string | undefined;
                patientGenderName?: string | undefined;
                endoscopeType?: string | undefined;
                endoscopeSn?: string | undefined;
                isVerified?: boolean | undefined;
                dobVerified?: boolean | undefined;
                namesVerified?: boolean | undefined;
                file?: string | undefined;
                pdfUrl?: string | undefined;
                fullPdfPath?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: "pdf" | "video";
            anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
            annotationStatus: "not_started" | "done";
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
            mediaType: "pdf" | "video";
            anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
            annotationStatus: "not_started" | "done";
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pending: {
            id: number;
            sensitiveMetaId: number;
            videoUrl?: string | null | undefined;
            thumbnail?: string | null | undefined;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string | null;
                patientLastName: string | null;
                patientDob: string | null;
                patientGender: string;
                examinationDate: string | null;
                casenumber?: string | null | undefined;
                centerName?: string | undefined;
                patientGenderName?: string | undefined;
                endoscopeType?: string | undefined;
                endoscopeSn?: string | undefined;
                isVerified?: boolean | undefined;
                dobVerified?: boolean | undefined;
                namesVerified?: boolean | undefined;
                file?: string | undefined;
                pdfUrl?: string | undefined;
                fullPdfPath?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        }[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState & {
        pending: PatientData[];
    }>) => {
        id: number;
        sensitiveMetaId: number;
        videoUrl?: string | null | undefined;
        thumbnail?: string | null | undefined;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string | null;
            patientLastName: string | null;
            patientDob: string | null;
            patientGender: string;
            examinationDate: string | null;
            casenumber?: string | null | undefined;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            file?: string | undefined;
            pdfUrl?: string | undefined;
            fullPdfPath?: string | undefined;
        } | undefined;
        status?: string | undefined;
        error?: boolean | undefined;
    } | null;
    isAnyFileProcessing: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        current: {
            id: number;
            sensitiveMetaId: number;
            videoUrl?: string | null | undefined;
            thumbnail?: string | null | undefined;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string | null;
                patientLastName: string | null;
                patientDob: string | null;
                patientGender: string;
                examinationDate: string | null;
                casenumber?: string | null | undefined;
                centerName?: string | undefined;
                patientGenderName?: string | undefined;
                endoscopeType?: string | undefined;
                endoscopeSn?: string | undefined;
                isVerified?: boolean | undefined;
                dobVerified?: boolean | undefined;
                namesVerified?: boolean | undefined;
                file?: string | undefined;
                pdfUrl?: string | undefined;
                fullPdfPath?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: "pdf" | "video";
            anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
            annotationStatus: "not_started" | "done";
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
            mediaType: "pdf" | "video";
            anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
            annotationStatus: "not_started" | "done";
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pending: {
            id: number;
            sensitiveMetaId: number;
            videoUrl?: string | null | undefined;
            thumbnail?: string | null | undefined;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string | null;
                patientLastName: string | null;
                patientDob: string | null;
                patientGender: string;
                examinationDate: string | null;
                casenumber?: string | null | undefined;
                centerName?: string | undefined;
                patientGenderName?: string | undefined;
                endoscopeType?: string | undefined;
                endoscopeSn?: string | undefined;
                isVerified?: boolean | undefined;
                dobVerified?: boolean | undefined;
                namesVerified?: boolean | undefined;
                file?: string | undefined;
                pdfUrl?: string | undefined;
                fullPdfPath?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        }[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState & {
        pending: PatientData[];
    }>) => boolean;
    processingFiles: (state: {
        anonymizationStatus: string;
        loading: boolean;
        error: string | null;
        current: {
            id: number;
            sensitiveMetaId: number;
            videoUrl?: string | null | undefined;
            thumbnail?: string | null | undefined;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string | null;
                patientLastName: string | null;
                patientDob: string | null;
                patientGender: string;
                examinationDate: string | null;
                casenumber?: string | null | undefined;
                centerName?: string | undefined;
                patientGenderName?: string | undefined;
                endoscopeType?: string | undefined;
                endoscopeSn?: string | undefined;
                isVerified?: boolean | undefined;
                dobVerified?: boolean | undefined;
                namesVerified?: boolean | undefined;
                file?: string | undefined;
                pdfUrl?: string | undefined;
                fullPdfPath?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        } | null;
        overview: {
            id: number;
            filename: string;
            mediaType: "pdf" | "video";
            anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
            annotationStatus: "not_started" | "done";
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
            mediaType: "pdf" | "video";
            anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
            annotationStatus: "not_started" | "done";
            createdAt: string;
            sensitiveMetaId?: number | undefined;
            metadataImported: boolean;
            fileSize?: number | undefined;
            rawFile?: string | undefined;
        }[];
        pending: {
            id: number;
            sensitiveMetaId: number;
            videoUrl?: string | null | undefined;
            thumbnail?: string | null | undefined;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string | null;
                patientLastName: string | null;
                patientDob: string | null;
                patientGender: string;
                examinationDate: string | null;
                casenumber?: string | null | undefined;
                centerName?: string | undefined;
                patientGenderName?: string | undefined;
                endoscopeType?: string | undefined;
                endoscopeSn?: string | undefined;
                isVerified?: boolean | undefined;
                dobVerified?: boolean | undefined;
                namesVerified?: boolean | undefined;
                file?: string | undefined;
                pdfUrl?: string | undefined;
                fullPdfPath?: string | undefined;
            } | undefined;
            status?: string | undefined;
            error?: boolean | undefined;
        }[];
    } & import("pinia").PiniaCustomStateProperties<AnonymizationState & {
        pending: PatientData[];
    }>) => {
        id: number;
        filename: string;
        mediaType: "pdf" | "video";
        anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
        annotationStatus: "not_started" | "done";
        createdAt: string;
        sensitiveMetaId?: number | undefined;
        metadataImported: boolean;
        fileSize?: number | undefined;
        rawFile?: string | undefined;
    }[];
}, {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    fetchNext(lastId?: number): Promise<PatientData | null | undefined>;
    patchPdf(payload: {
        id?: number;
        sensitive_meta_id?: number;
        [key: string]: any;
    }): Promise<any>;
    patchVideo(payload: {
        id?: number;
        sensitive_meta_id?: number;
        [key: string]: any;
    }): Promise<any>;
    fetchPendingAnonymizations(): {
        id: number;
        sensitiveMetaId: number;
        videoUrl?: string | null | undefined;
        thumbnail?: string | null | undefined;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string | null;
            patientLastName: string | null;
            patientDob: string | null;
            patientGender: string;
            examinationDate: string | null;
            casenumber?: string | null | undefined;
            centerName?: string | undefined;
            patientGenderName?: string | undefined;
            endoscopeType?: string | undefined;
            endoscopeSn?: string | undefined;
            isVerified?: boolean | undefined;
            dobVerified?: boolean | undefined;
            namesVerified?: boolean | undefined;
            file?: string | undefined;
            pdfUrl?: string | undefined;
            fullPdfPath?: string | undefined;
        } | undefined;
        status?: string | undefined;
        error?: boolean | undefined;
    }[];
    /**
     * Upload files and fetch the resulting anonymization data
     * @param files - FileList or File array containing files to upload
     * @returns Promise that resolves when upload and fetch are complete
     */
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
    setCurrentForValidation(id: number): Promise<PatientData | null>;
    /**
     * Refresh overview data
     */
    refreshOverview(): Promise<void>;
    /**
     * Re-import a video file to regenerate metadata
     */
    reimportVideo(fileId: number): Promise<boolean>;
}>;
