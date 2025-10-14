import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const usePdfStore = defineStore('pdf', () => {
    // State
    const currentPdf = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const streamingActive = ref(false);
    const lastProcessedId = ref(null);
    // Getters
    const hasCurrentPdf = computed(() => currentPdf.value !== null);
    const isProcessing = computed(() => currentPdf.value?.status === 'processing');
    const isDone = computed(() => currentPdf.value?.status === 'done');
    const hasError = computed(() => error.value !== null || currentPdf.value?.error === true);
    const pdfStreamUrl = computed(() => {
        if (!currentPdf.value?.pdfStreamUrl)
            return null;
        return currentPdf.value.pdfStreamUrl;
    });
    // Actions
    /**
     * Build PDF streaming URL using pdf_id (RawPdfFile.id)
     * URL pattern: /api/pdfstream/<pdf_id>/
     */
    function buildPdfStreamUrl(pdfId) {
        return `/api/media/pdfs/${pdfId}/stream`;
    }
    /**
     * Fetch the next PDF for annotation from the queue
     * @param lastId - Optional last processed PDF ID to continue from
     *
     * MIGRATED: Now uses /api/anonymization/items/overview/ endpoint
     * instead of deprecated /api/pdf/next/
     */
    async function fetchNextPdf(lastId) {
        loading.value = true;
        error.value = null;
        try {
            // Use Modern Framework anonymization overview endpoint
            const response = await fetch('/api/anonymization/items/overview/');
            if (!response.ok) {
                throw new Error(`Failed to fetch overview: ${response.status}`);
            }
            const data = await response.json();
            // Filter pending PDFs (not_started or pending_validation)
            const pendingPdfs = data.pdfs?.filter((p) => p.status === 'pending_validation' || p.status === 'not_started') || [];
            if (pendingPdfs.length === 0) {
                // No more PDFs to process
                currentPdf.value = null;
                lastProcessedId.value = null;
                return;
            }
            // Find next PDF
            let nextPdf;
            if (lastId) {
                const lastIndex = pendingPdfs.findIndex((p) => p.id === lastId);
                nextPdf = pendingPdfs[lastIndex + 1] || pendingPdfs[0];
            }
            else {
                nextPdf = pendingPdfs[0];
            }
            currentPdf.value = nextPdf;
            lastProcessedId.value = nextPdf.id;
            // Build stream URL and start streaming
            if (nextPdf.id && currentPdf.value) {
                currentPdf.value.pdfStreamUrl = buildPdfStreamUrl(nextPdf.id);
                streamingActive.value = true;
            }
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error fetching next PDF:', err);
        }
        finally {
            loading.value = false;
        }
    }
    /**
     * Update sensitive metadata using pdf_id (RawPdfFile.id)
     *
     * MIGRATED: Now uses /api/media/pdfs/<pk>/sensitive-metadata/ endpoint
     * instead of deprecated /api/pdf/sensitivemeta/<id>/
     *
     * @param pdfId - PDF ID (RawPdfFile.id), not sensitiveMetaId
     */
    async function updateSensitiveMeta(pdfId, data) {
        if (!currentPdf.value) {
            throw new Error('No current PDF to update');
        }
        loading.value = true;
        error.value = null;
        try {
            // Use Modern Framework sensitive metadata endpoint
            const response = await fetch(`/api/media/pdfs/${pdfId}/sensitive-metadata/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                throw new Error(`Failed to update sensitive metadata: ${response.status}`);
            }
            const updatedData = await response.json();
            // Update current PDF metadata
            if (currentPdf.value.reportMeta) {
                currentPdf.value.reportMeta = { ...currentPdf.value.reportMeta, ...updatedData };
            }
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error updating sensitive metadata:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    }
    /**
     * Update anonymized text using pdf_id (RawPdfFile.id)
     *
     * MIGRATED: Now uses /api/media/pdfs/<pk>/sensitive-metadata/ endpoint
     * instead of deprecated /api/pdf/<id>/anonymize/
     */
    async function updateAnonymizedText(pdfId, anonymizedText) {
        if (!currentPdf.value) {
            throw new Error('No current PDF to update');
        }
        loading.value = true;
        error.value = null;
        try {
            // Use Modern Framework sensitive metadata endpoint for anonymized text
            const response = await fetch(`/api/media/pdfs/${pdfId}/sensitive-metadata/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({ anonymized_text: anonymizedText }),
            });
            if (!response.ok) {
                throw new Error(`Failed to update anonymized text: ${response.status}`);
            }
            // Update current PDF with new anonymized text
            currentPdf.value.anonymizedText = anonymizedText;
            currentPdf.value.status = 'done';
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error updating anonymized text:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    }
    /**
     * Approve the current PDF and move to next
     *
     * MIGRATED: Now uses /api/anonymization/<file_id>/validate/ endpoint
     * instead of deprecated /api/pdf/<id>/approve/
     */
    async function approvePdf() {
        if (!currentPdf.value) {
            throw new Error('No current PDF to approve');
        }
        const pdfId = currentPdf.value.id;
        loading.value = true;
        error.value = null;
        try {
            // Use Modern Framework anonymization validate endpoint
            const response = await fetch(`/api/anonymization/${pdfId}/validate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken(),
                },
                body: JSON.stringify({
                    validation_status: 'approved'
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to approve PDF: ${response.status}`);
            }
            // Mark as processed and fetch next
            lastProcessedId.value = pdfId;
            await fetchNextPdf(pdfId);
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error approving PDF:', err);
            throw err;
        }
        finally {
            loading.value = false;
        }
    }
    /**
     * Skip the current PDF and move to next
     */
    async function skipPdf() {
        if (!currentPdf.value) {
            throw new Error('No current PDF to skip');
        }
        const pdfId = currentPdf.value.id;
        lastProcessedId.value = pdfId;
        await fetchNextPdf(pdfId);
    }
    /**
     * Check anonymization status
     *
     * MIGRATED: Now uses /api/anonymization/<file_id>/status/ endpoint
     * instead of deprecated /api/pdf/<id>/status/
     */
    async function checkAnonymizationStatus(pdfId) {
        try {
            // Use Modern Framework anonymization status endpoint
            const response = await fetch(`/api/anonymization/${pdfId}/status/`);
            if (!response.ok) {
                throw new Error(`Failed to check status: ${response.status}`);
            }
            return await response.json();
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : 'Unknown error occurred';
            console.error('Error checking anonymization status:', err);
            throw err;
        }
    }
    /**
     * Stop PDF streaming
     */
    function stopStreaming() {
        streamingActive.value = false;
    }
    /**
     * Clear current state
     */
    function clearState() {
        currentPdf.value = null;
        loading.value = false;
        error.value = null;
        streamingActive.value = false;
        lastProcessedId.value = null;
    }
    /**
     * Get CSRF token from DOM
     */
    function getCsrfToken() {
        const token = document.querySelector('[name=csrfmiddlewaretoken]')?.getAttribute('value');
        if (!token) {
            throw new Error('CSRF token not found');
        }
        return token;
    }
    return {
        // State
        currentPdf,
        loading,
        error,
        streamingActive,
        lastProcessedId,
        // Getters
        hasCurrentPdf,
        isProcessing,
        isDone,
        hasError,
        pdfStreamUrl,
        // Actions
        buildPdfStreamUrl,
        fetchNextPdf,
        updateSensitiveMeta,
        updateAnonymizedText,
        approvePdf,
        skipPdf,
        checkAnonymizationStatus,
        stopStreaming,
        clearState,
    };
});
