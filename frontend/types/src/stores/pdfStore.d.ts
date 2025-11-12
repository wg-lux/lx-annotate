export interface PdfMetadata {
    id: number;
    sensitiveMetaId: number | null;
    text: string;
    anonymizedText: string;
    reportMeta?: {
        id: number;
        patientFirstName: string;
        patientLastName: string;
        patientDob: string;
        patientGender: string;
        examinationDate: string;
        centerName: string;
        endoscopeType: string;
        endoscopeSn: string;
        isVerified: boolean;
    };
    status: 'not_started' | 'processing' | 'done';
    error: boolean;
    pdfStreamUrl?: string;
}
export interface PdfState {
    currentPdf: PdfMetadata | null;
    loading: boolean;
    error: string | null;
    streamingActive: boolean;
    lastProcessedId: number | null;
}
export declare const usePdfStore: import("pinia").StoreDefinition<"pdf", Pick<{
    currentPdf: import("vue").Ref<{
        id: number;
        sensitiveMetaId: number | null;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
            centerName: string;
            endoscopeType: string;
            endoscopeSn: string;
            isVerified: boolean;
        } | undefined;
        status: 'not_started' | 'processing' | 'done';
        error: boolean;
        pdfStreamUrl?: string | undefined;
    } | null, PdfMetadata | {
        id: number;
        sensitiveMetaId: number | null;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
            centerName: string;
            endoscopeType: string;
            endoscopeSn: string;
            isVerified: boolean;
        } | undefined;
        status: 'not_started' | 'processing' | 'done';
        error: boolean;
        pdfStreamUrl?: string | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    streamingActive: import("vue").Ref<boolean, boolean>;
    lastProcessedId: import("vue").Ref<number | null, number | null>;
    hasCurrentPdf: import("vue").ComputedRef<boolean>;
    isProcessing: import("vue").ComputedRef<boolean>;
    isDone: import("vue").ComputedRef<boolean>;
    hasError: import("vue").ComputedRef<boolean>;
    pdfStreamUrl: import("vue").ComputedRef<string | null>;
    buildPdfStreamUrl: (pdfId: number) => string;
    fetchNextPdf: (lastId?: number) => Promise<void>;
    updateSensitiveMeta: (pdfId: number, data: Partial<PdfMetadata['reportMeta']>) => Promise<void>;
    updateAnonymizedText: (pdfId: number, anonymizedText: string) => Promise<void>;
    approvePdf: () => Promise<void>;
    skipPdf: () => Promise<void>;
    checkAnonymizationStatus: (pdfId: number) => Promise<{
        status: string;
        progress?: number;
    }>;
    stopStreaming: () => void;
    clearState: () => void;
}, "loading" | "error" | "currentPdf" | "streamingActive" | "lastProcessedId">, Pick<{
    currentPdf: import("vue").Ref<{
        id: number;
        sensitiveMetaId: number | null;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
            centerName: string;
            endoscopeType: string;
            endoscopeSn: string;
            isVerified: boolean;
        } | undefined;
        status: 'not_started' | 'processing' | 'done';
        error: boolean;
        pdfStreamUrl?: string | undefined;
    } | null, PdfMetadata | {
        id: number;
        sensitiveMetaId: number | null;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
            centerName: string;
            endoscopeType: string;
            endoscopeSn: string;
            isVerified: boolean;
        } | undefined;
        status: 'not_started' | 'processing' | 'done';
        error: boolean;
        pdfStreamUrl?: string | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    streamingActive: import("vue").Ref<boolean, boolean>;
    lastProcessedId: import("vue").Ref<number | null, number | null>;
    hasCurrentPdf: import("vue").ComputedRef<boolean>;
    isProcessing: import("vue").ComputedRef<boolean>;
    isDone: import("vue").ComputedRef<boolean>;
    hasError: import("vue").ComputedRef<boolean>;
    pdfStreamUrl: import("vue").ComputedRef<string | null>;
    buildPdfStreamUrl: (pdfId: number) => string;
    fetchNextPdf: (lastId?: number) => Promise<void>;
    updateSensitiveMeta: (pdfId: number, data: Partial<PdfMetadata['reportMeta']>) => Promise<void>;
    updateAnonymizedText: (pdfId: number, anonymizedText: string) => Promise<void>;
    approvePdf: () => Promise<void>;
    skipPdf: () => Promise<void>;
    checkAnonymizationStatus: (pdfId: number) => Promise<{
        status: string;
        progress?: number;
    }>;
    stopStreaming: () => void;
    clearState: () => void;
}, "hasError" | "isProcessing" | "pdfStreamUrl" | "hasCurrentPdf" | "isDone">, Pick<{
    currentPdf: import("vue").Ref<{
        id: number;
        sensitiveMetaId: number | null;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
            centerName: string;
            endoscopeType: string;
            endoscopeSn: string;
            isVerified: boolean;
        } | undefined;
        status: 'not_started' | 'processing' | 'done';
        error: boolean;
        pdfStreamUrl?: string | undefined;
    } | null, PdfMetadata | {
        id: number;
        sensitiveMetaId: number | null;
        text: string;
        anonymizedText: string;
        reportMeta?: {
            id: number;
            patientFirstName: string;
            patientLastName: string;
            patientDob: string;
            patientGender: string;
            examinationDate: string;
            centerName: string;
            endoscopeType: string;
            endoscopeSn: string;
            isVerified: boolean;
        } | undefined;
        status: 'not_started' | 'processing' | 'done';
        error: boolean;
        pdfStreamUrl?: string | undefined;
    } | null>;
    loading: import("vue").Ref<boolean, boolean>;
    error: import("vue").Ref<string | null, string | null>;
    streamingActive: import("vue").Ref<boolean, boolean>;
    lastProcessedId: import("vue").Ref<number | null, number | null>;
    hasCurrentPdf: import("vue").ComputedRef<boolean>;
    isProcessing: import("vue").ComputedRef<boolean>;
    isDone: import("vue").ComputedRef<boolean>;
    hasError: import("vue").ComputedRef<boolean>;
    pdfStreamUrl: import("vue").ComputedRef<string | null>;
    buildPdfStreamUrl: (pdfId: number) => string;
    fetchNextPdf: (lastId?: number) => Promise<void>;
    updateSensitiveMeta: (pdfId: number, data: Partial<PdfMetadata['reportMeta']>) => Promise<void>;
    updateAnonymizedText: (pdfId: number, anonymizedText: string) => Promise<void>;
    approvePdf: () => Promise<void>;
    skipPdf: () => Promise<void>;
    checkAnonymizationStatus: (pdfId: number) => Promise<{
        status: string;
        progress?: number;
    }>;
    stopStreaming: () => void;
    clearState: () => void;
}, "updateSensitiveMeta" | "buildPdfStreamUrl" | "fetchNextPdf" | "updateAnonymizedText" | "approvePdf" | "skipPdf" | "checkAnonymizationStatus" | "stopStreaming" | "clearState">>;
