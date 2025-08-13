import { defineStore } from 'pinia';
import { ref, computed, reactive, readonly } from 'vue';
import axiosInstance, { r } from '../api/axiosInstance';
import { AxiosError } from 'axios';
// ===================================================================
// STORE IMPLEMENTATION
// ===================================================================
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
export const usePdfStore = defineStore('pdf', () => {
    // ===================================================================
    // REACTIVE STATE
    // ===================================================================
    const currentPdf = ref(null);
    const errorMessage = ref('');
    const pdfUrl = ref('');
    const pdfList = ref({ pdfs: [] });
    const pdfMeta = ref(null);
    const _fetchToken = ref(0);
    // ===================================================================
    // UTILITY FUNCTIONS
    // ===================================================================
    function buildPdfStreamUrl(id) {
        const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        // Use the correct PDF stream endpoint: /api/pdfstream/<pdf_id>/
        // where pdf_id is the RawPdfFile.id (not sensitive_meta_id)
        return `${base}/api/pdfstream/${id}/`;
    }
    // ===================================================================
    // COMPUTED PROPERTIES
    // ===================================================================
    const hasPdf = computed(() => currentPdf.value !== null);
    const pdfStreamUrl = computed(() => currentPdf.value ? buildPdfStreamUrl(currentPdf.value.id) : '');
    const isLoading = computed(() => _fetchToken.value > 0);
    // ===================================================================
    // ACTIONS
    // ===================================================================
    function clearPdf() {
        currentPdf.value = null;
        errorMessage.value = '';
        pdfUrl.value = '';
    }
    function setPdf(pdf) {
        currentPdf.value = pdf;
        errorMessage.value = '';
    }
    async function fetchPdfUrl(pdfId) {
        try {
            const id = pdfId || currentPdf.value?.id;
            if (!id) {
                console.warn("No PDF ID available for fetching PDF URL");
                errorMessage.value = "No PDF selected.";
                return;
            }
            // Use the stream URL directly since PDFStreamView handles the file serving
            const streamUrl = buildPdfStreamUrl(id);
            pdfUrl.value = streamUrl;
            console.log("Generated PDF stream URL:", pdfUrl.value);
        }
        catch (error) {
            const axiosError = error;
            console.error("Error generating PDF URL:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error generating PDF URL. Please check the PDF ID or try again later.";
        }
    }
    async function validatePdfAccess(pdfId) {
        try {
            // Make a HEAD request to check if the PDF is accessible
            const streamUrl = buildPdfStreamUrl(pdfId);
            // Use GET with range header instead of HEAD to avoid CORS issues
            await axiosInstance.get(streamUrl, {
                headers: { 'Range': 'bytes=0-0' }
            });
            return true;
        }
        catch (error) {
            console.error(`PDF ${pdfId} is not accessible:`, error);
            return false;
        }
    }
    async function loadPdf(pdfId) {
        try {
            _fetchToken.value++;
            errorMessage.value = '';
            console.log(`Loading PDF ${pdfId}...`);
            // Fetch PDF metadata
            const meta = await fetchPdfMeta(pdfId);
            if (!meta) {
                throw new Error(`PDF ${pdfId} not found`);
            }
            // Create PDF annotation object
            const pdfAnnotation = {
                id: pdfId,
                isAnnotated: false,
                errorMessage: '',
                pdfUrl: buildPdfStreamUrl(pdfId),
                status: meta.status,
                assignedUser: meta.assignedUser || null,
                text: meta.text,
                anonymizedText: meta.anonymizedText,
                sensitiveMetaId: meta.sensitiveMetaId
            };
            setPdf(pdfAnnotation);
            // Generate PDF URL for streaming
            await fetchPdfUrl(pdfId);
            console.log(`PDF ${pdfId} loaded successfully`);
        }
        catch (error) {
            const axiosError = error;
            console.error(`Error loading PDF ${pdfId}:`, axiosError.response?.data || axiosError.message);
            errorMessage.value = `Error loading PDF ${pdfId}. Please check the PDF ID or try again later.`;
            currentPdf.value = null;
        }
        finally {
            _fetchToken.value--;
        }
    }
    async function fetchPdfMeta(pdfId) {
        try {
            console.log(`Fetching PDF metadata for pdf_id: ${pdfId}...`);
            // Use the anony_text endpoint to get PDF data including anonymized text
            // This endpoint expects the RawPdfFile.id (pdf_id)
            const response = await axiosInstance.get(r(`pdf/anony_text/?last_id=${pdfId}`), { headers: { 'Accept': 'application/json' } });
            const data = response.data;
            const meta = {
                id: data.id || parseInt(String(pdfId)),
                originalFileName: data.original_file_name || data.file_name,
                status: data.status || 'not_started',
                assignedUser: data.assigned_user,
                anonymized: data.anonymized || false,
                centerName: data.center_name,
                processorName: data.processor_name,
                sensitiveMetaId: data.sensitive_meta_id,
                text: data.text,
                anonymizedText: data.anonymized_text
            };
            pdfMeta.value = meta;
            console.log(`PDF metadata fetched for pdf_id ${pdfId}:`, meta);
            return meta;
        }
        catch (error) {
            const axiosError = error;
            console.error(`Error fetching PDF metadata for pdf_id ${pdfId}:`, axiosError.response?.data || axiosError.message);
            return null;
        }
    }
    async function fetchAllPdfs() {
        try {
            _fetchToken.value++;
            console.log("Fetching all PDFs...");
            // Use the anony_text endpoint to get the first available PDF
            // This will give us the structure we need
            const response = await axiosInstance.get(r('pdf/anony_text/'), { headers: { 'Accept': 'application/json' } });
            // Since this endpoint returns a single PDF, we'll create an array with one item
            // For a full list, we might need to use a different endpoint or paginate
            const data = response.data;
            const pdfs = data ? [{
                    id: data.id,
                    originalFileName: data.original_file_name || data.file_name,
                    status: data.status || 'not_started',
                    assignedUser: data.assigned_user,
                    anonymized: data.anonymized || false,
                    centerName: data.center_name,
                    processorName: data.processor_name,
                    sensitiveMetaId: data.sensitive_meta_id,
                    text: data.text,
                    anonymizedText: data.anonymized_text
                }] : [];
            const pdfListData = { pdfs };
            pdfList.value = pdfListData;
            console.log(`Fetched ${pdfs.length} PDFs`);
            return pdfListData;
        }
        catch (error) {
            const axiosError = error;
            console.error("Error fetching PDFs:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error fetching PDFs. Please try again later.";
            return { pdfs: [] };
        }
        finally {
            _fetchToken.value--;
        }
    }
    async function updateSensitiveMeta(sensitiveMetaId, data) {
        try {
            console.log(`Updating sensitive meta ${sensitiveMetaId} with:`, data);
            const payload = {
                sensitive_meta_id: sensitiveMetaId,
                ...data
            };
            const response = await axiosInstance.patch(r('pdf/update_sensitivemeta/'), payload, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Sensitive meta ${sensitiveMetaId} updated successfully`);
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error(`Error updating sensitive meta ${sensitiveMetaId}:`, axiosError.response?.data || axiosError.message);
            errorMessage.value = `Error updating patient data. Please try again.`;
            return false;
        }
    }
    async function updateAnonymizedText(pdfId, anonymizedText) {
        try {
            console.log(`Updating anonymized text for PDF ${pdfId}`);
            const payload = {
                id: pdfId,
                anonymized_text: anonymizedText
            };
            const response = await axiosInstance.patch(r('pdf/update_anony_text/'), payload, { headers: { 'Content-Type': 'application/json' } });
            console.log(`Anonymized text updated successfully for PDF ${pdfId}`);
            return true;
        }
        catch (error) {
            const axiosError = error;
            console.error(`Error updating anonymized text for PDF ${pdfId}:`, axiosError.response?.data || axiosError.message);
            errorMessage.value = `Error updating anonymized text. Please try again.`;
            return false;
        }
    }
    async function fetchNextPdf(lastId) {
        try {
            console.log(`Fetching next PDF after ID: ${lastId || 'none'}`);
            const url = lastId ? `pdf/anony_text/?last_id=${lastId}` : 'pdf/anony_text/';
            const response = await axiosInstance.get(r(url), { headers: { 'Accept': 'application/json' } });
            const data = response.data;
            if (!data) {
                console.log('No more PDFs available');
                return null;
            }
            const meta = {
                id: data.id,
                originalFileName: data.original_file_name || data.file_name,
                status: data.status || 'not_started',
                assignedUser: data.assigned_user,
                anonymized: data.anonymized || false,
                centerName: data.center_name,
                processorName: data.processor_name,
                sensitiveMetaId: data.sensitive_meta_id,
                text: data.text,
                anonymizedText: data.anonymized_text
            };
            console.log(`Next PDF fetched:`, meta);
            return meta;
        }
        catch (error) {
            const axiosError = error;
            console.error(`Error fetching next PDF:`, axiosError.response?.data || axiosError.message);
            return null;
        }
    }
    // ===================================================================
    // STORE RETURN
    // ===================================================================
    return {
        // State
        currentPdf,
        errorMessage,
        pdfUrl,
        pdfList,
        pdfMeta,
        _fetchToken,
        // Getters
        hasPdf,
        pdfStreamUrl,
        isLoading,
        // Actions
        clearPdf,
        setPdf,
        loadPdf,
        fetchPdfUrl,
        fetchAllPdfs,
        fetchPdfMeta,
        buildPdfStreamUrl,
        validatePdfAccess,
        updateSensitiveMeta,
        updateAnonymizedText,
        fetchNextPdf
    };
});
