import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

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

export const usePdfStore = defineStore('pdf', () => {
  // State
  const currentPdf = ref<PdfMetadata | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const streamingActive = ref(false);
  const lastProcessedId = ref<number | null>(null);

  // Getters
  const hasCurrentPdf = computed(() => currentPdf.value !== null);
  const isProcessing = computed(() => currentPdf.value?.status === 'processing');
  const isDone = computed(() => currentPdf.value?.status === 'done');
  const hasError = computed(() => error.value !== null || currentPdf.value?.error === true);
  const pdfStreamUrl = computed(() => {
    if (!currentPdf.value?.pdfStreamUrl) return null;
    return currentPdf.value.pdfStreamUrl;
  });

  // Actions
  
  /**
   * Build PDF streaming URL using pdf_id (RawPdfFile.id)
   * URL pattern: /api/pdfstream/<pdf_id>/
   */
  function buildPdfStreamUrl(pdfId: number): string {
    return `/api/pdfstream/${pdfId}/`;
  }

  /**
   * Fetch the next PDF for annotation from the queue
   * @param lastId - Optional last processed PDF ID to continue from
   */
  async function fetchNextPdf(lastId?: number): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const url = lastId 
        ? `/api/pdf/next/?last_id=${lastId}`
        : '/api/pdf/next/';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No more PDFs to process
          currentPdf.value = null;
          lastProcessedId.value = null;
          return;
        }
        throw new Error(`Failed to fetch next PDF: ${response.status}`);
      }

      const pdfData = await response.json();
      currentPdf.value = pdfData;
      lastProcessedId.value = pdfData.id;
      
      // Start PDF streaming if available
      if (pdfData.pdfStreamUrl) {
        streamingActive.value = true;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching next PDF:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update sensitive metadata using sensitive_meta_id (SensitiveMeta.id)
   * URL pattern: /api/pdf/sensitivemeta/<sensitive_meta_id>/
   */
  async function updateSensitiveMeta(sensitiveMetaId: number, data: Partial<PdfMetadata['reportMeta']>): Promise<void> {
    if (!currentPdf.value) {
      throw new Error('No current PDF to update');
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/pdf/sensitivemeta/${sensitiveMetaId}/`, {
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
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating sensitive metadata:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update anonymized text using pdf_id (RawPdfFile.id)
   * URL pattern: /api/pdf/<pdf_id>/anonymize/
   */
  async function updateAnonymizedText(pdfId: number, anonymizedText: string): Promise<void> {
    if (!currentPdf.value) {
      throw new Error('No current PDF to update');
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/pdf/${pdfId}/anonymize/`, {
        method: 'POST',
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
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating anonymized text:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Approve the current PDF and move to next
   */
  async function approvePdf(): Promise<void> {
    if (!currentPdf.value) {
      throw new Error('No current PDF to approve');
    }

    const pdfId = currentPdf.value.id;
    
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/api/pdf/${pdfId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to approve PDF: ${response.status}`);
      }

      // Mark as processed and fetch next
      lastProcessedId.value = pdfId;
      await fetchNextPdf(pdfId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error approving PDF:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Skip the current PDF and move to next
   */
  async function skipPdf(): Promise<void> {
    if (!currentPdf.value) {
      throw new Error('No current PDF to skip');
    }

    const pdfId = currentPdf.value.id;
    lastProcessedId.value = pdfId;
    await fetchNextPdf(pdfId);
  }

  /**
   * Check anonymization status
   */
  async function checkAnonymizationStatus(pdfId: number): Promise<{ status: string; progress?: number }> {
    try {
      const response = await fetch(`/api/pdf/${pdfId}/status/`);
      
      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error checking anonymization status:', err);
      throw err;
    }
  }

  /**
   * Stop PDF streaming
   */
  function stopStreaming(): void {
    streamingActive.value = false;
  }

  /**
   * Clear current state
   */
  function clearState(): void {
    currentPdf.value = null;
    loading.value = false;
    error.value = null;
    streamingActive.value = false;
    lastProcessedId.value = null;
  }

  /**
   * Get CSRF token from DOM
   */
  function getCsrfToken(): string {
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
