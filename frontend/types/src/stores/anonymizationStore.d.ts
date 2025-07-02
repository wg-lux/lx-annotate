export interface AnonymizationState {
    anonymizationStatus: string;
    loading: boolean;
    error: string | null;
    current: PatientData | null;
}
export interface SensitiveMetaApiResponse {
    id: number;
    patientFirstName: string;
    patientLastName: string;
    patientDob: string;
    patientGender: string;
    examinationDate: string;
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
    text: string;
    anonymizedText: string;
    reportMeta?: SensitiveMetaApiResponse;
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
            sensitiveMetaId: number;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string;
                patientLastName: string;
                patientDob: string;
                patientGender: string;
                examinationDate: string;
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
        pending: {
            id: number;
            sensitiveMetaId: number;
            text: string;
            anonymizedText: string;
            reportMeta?: {
                id: number;
                patientFirstName: string;
                patientLastName: string;
                patientDob: string;
                patientGender: string;
                examinationDate: string;
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
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
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
}, {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    fetchNext(lastId?: number): Promise<PatientData>;
    patchPdf(payload: Partial<PatientData>): Promise<import("axios").AxiosResponse<any, any>>;
    patchVideo(payload: any): Promise<import("axios").AxiosResponse<any, any>>;
    fetchPendingAnonymizations(): {
        id: number;
        sensitiveMetaId: number;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
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
    uploadAndFetch(files: FileList | File[]): Promise<PatientData | null>;
    /**
     * Load a specific file by ID and type for anonymization validation
     * @param type - 'pdf' or 'video'
     * @param id - File ID
     * @param sensitiveMetaId - Optional sensitive meta ID if known
     * @returns Promise that resolves with the loaded data
     */
    fetchSpecificFile(type: 'pdf' | 'video', id: number, sensitiveMetaId?: number): Promise<PatientData | null>;
    /**
     * Load available files for selection
     * @param type - Optional filter by type ('pdf', 'video', 'all')
     * @param limit - Number of results to return
     * @returns Promise with available files data
     */
    fetchAvailableFiles(type?: 'pdf' | 'video' | 'all', limit?: number): Promise<any>;
}>;
