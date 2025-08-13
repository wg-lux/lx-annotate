import { type Ref, type ComputedRef } from 'vue';
/**
 * PDF processing status types
 */
type PdfStatus = 'processing' | 'available' | 'done' | 'failed' | 'not_started';
/**
 * PDF file interface
 */
interface PdfFile {
    id: number;
    centerName?: string;
    processorName?: string;
    originalFileName?: string;
    status?: PdfStatus;
    file?: string;
    text?: string;
    anonymizedText?: string;
    sensitiveMetaId?: number;
    [key: string]: any;
}
/**
 * PDF annotation interface for validation workflow
 */
interface PdfAnnotation {
    id: string | number;
    isAnnotated: boolean;
    errorMessage: string;
    pdfUrl: string;
    status: PdfStatus;
    assignedUser: string | null;
    text?: string;
    anonymizedText?: string;
    sensitiveMetaId?: number;
}
/**
 * PDF metadata from backend
 */
interface PdfMeta {
    id: number;
    originalFileName?: string;
    status: PdfStatus;
    assignedUser?: string | null;
    anonymized: boolean;
    centerName?: string;
    processorName?: string;
    sensitiveMetaId?: number;
    text?: string;
    anonymizedText?: string;
}
/**
 * PDF list response structure
 */
interface PdfList {
    pdfs: PdfMeta[];
}
/**
 * Store state interface
 */
interface PdfStoreState {
    currentPdf: Ref<PdfAnnotation | null>;
    errorMessage: Ref<string>;
    pdfUrl: Ref<string>;
    pdfList: Ref<PdfList>;
    pdfMeta: Ref<PdfMeta | null>;
    _fetchToken: Ref<number>;
}
/**
 * Store getters interface
 */
interface PdfStoreGetters {
    hasPdf: ComputedRef<boolean>;
    pdfStreamUrl: ComputedRef<string>;
    isLoading: ComputedRef<boolean>;
}
/**
 * Store actions interface
 */
interface PdfStoreActions {
    clearPdf(): void;
    setPdf(pdf: PdfAnnotation): void;
    loadPdf(pdfId: string | number): Promise<void>;
    fetchPdfUrl(pdfId?: string | number): Promise<void>;
    fetchAllPdfs(): Promise<PdfList>;
    fetchPdfMeta(pdfId: string | number): Promise<PdfMeta | null>;
    buildPdfStreamUrl(id: string | number): string;
    validatePdfAccess(pdfId: string | number): Promise<boolean>;
    updateSensitiveMeta(sensitiveMetaId: number, data: any): Promise<boolean>;
    updateAnonymizedText(pdfId: number, anonymizedText: string): Promise<boolean>;
    fetchNextPdf(lastId?: number): Promise<PdfMeta | null>;
}
/**
 * PDF Store Implementation
 *
 * ID Usage Clarification:
 * - pdf_id: RawPdfFile.id (used for PDF streaming: /api/pdfstream/<pdf_id>/)
 * - sensitive_meta_id: SensitiveMeta.id (used for patient data: /api/pdf/sensitivemeta/<sensitive_meta_id>/)
 *
 * URL Patterns from backend:
 * - PDF Stream: /api/pdfstream/<int:pdf_id>/
 * - Patient Meta: /api/pdf/sensitivemeta/<int:sensitive_meta_id>/
 * - Update Meta: /api/pdf/update_sensitivemeta/ (body: {sensitive_meta_id: ...})
 * - Update Text: /api/pdf/update_anony_text/ (body: {id: pdf_id, ...})
 * - Fetch PDF: /api/pdf/anony_text/?last_id=<pdf_id>
 */
export declare const usePdfStore: import("pinia").StoreDefinition<"pdf", import("pinia")._UnwrapAll<Pick<PdfStoreState & PdfStoreGetters & PdfStoreActions, "pdfUrl" | "errorMessage" | "currentPdf" | "pdfList" | "pdfMeta" | "_fetchToken">>, Pick<PdfStoreState & PdfStoreGetters & PdfStoreActions, "isLoading" | "hasPdf" | "pdfStreamUrl">, Pick<PdfStoreState & PdfStoreGetters & PdfStoreActions, "updateSensitiveMeta" | "clearPdf" | "setPdf" | "loadPdf" | "fetchPdfUrl" | "fetchAllPdfs" | "fetchPdfMeta" | "buildPdfStreamUrl" | "validatePdfAccess" | "updateAnonymizedText" | "fetchNextPdf">>;
export type { PdfFile, PdfAnnotation, PdfMeta, PdfList, PdfStatus, PdfStoreState, PdfStoreGetters, PdfStoreActions };
