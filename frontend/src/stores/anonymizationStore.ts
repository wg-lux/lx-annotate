/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
import { uploadFiles, pollUploadStatus, type UploadStatusResponse } from '@/api/upload';

/* ------------------------------------------------------------------ */
/* Typen                                                               */
/* ------------------------------------------------------------------ */

// New interface for file overview
export interface FileItem {
  id: number;
  filename: string;
  mediaType: "pdf" | "video";
  anonymizationStatus: "not_started" | "processing_anonymization" | "done" | "failed" | "validated" | "predicting_segments" | "extracting_frames";
  annotationStatus: "not_started" | "done";
  createdAt: string; // ISO
  sensitiveMetaId?: number; // Add this for video file lookup
  metadataImported: boolean; // New field to track if metadata was properly imported
}

export interface AnonymizationState {
  anonymizationStatus: string;
  loading: boolean;
  error: string | null;
  current: PatientData | null;
  // New state for overview functionality
  overview: FileItem[];
  pollingHandles: Record<number, ReturnType<typeof setInterval>>;
  isPolling: boolean;
}

// Interface matching the actual API response for sensitivemeta
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
  // PDF specific fields
  file?: string;
  pdfUrl?: string;
  fullPdfPath?: string;
}

// Updated interface for PDF data from anony_text endpoint
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

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export const useAnonymizationStore = defineStore('anonymization', {
  state: (): AnonymizationState & { pending: PatientData[] } => ({
    anonymizationStatus: 'idle',
    loading: false,
    error: null,
    pending: [],
    current: null,
    // New state
    overview: [],
    pollingHandles: {},
    isPolling: false
  }),

  getters: {
    getCurrentItem: (state) => state.current,
    isAnyFileProcessing: (state) => state.overview.some(f => f.anonymizationStatus === 'processing_anonymization' || f.anonymizationStatus === 'extracting_frames' || f.anonymizationStatus === 'predicting_segments'),
    processingFiles: (state) => state.overview.filter(f => f.anonymizationStatus === 'processing_anonymization' || f.anonymizationStatus === 'extracting_frames' || f.anonymizationStatus === 'predicting_segments')
  },

  actions: {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    async fetchNext(lastId?: number) {
      this.loading = true;
      this.error = null;

      try {
        // Check if we have a specific file selected from overview
        if (lastId) {
          const item = this.overview.find(f => f.id === lastId);
          
          if (item?.mediaType === 'video') {
            // 1️⃣ get SensitiveMeta & video urls for video
            console.log(`Fetching video sensitive meta for ID: ${lastId}`);
            const { data: meta } = await axiosInstance.get<SensitiveMetaApiResponse>(
              r(`video/sensitivemeta/?id=${item.sensitiveMetaId}`)
            );
            console.log('Received video sensitive meta:', meta);
            
            this.current = {
              id: item.id,
              sensitiveMetaId: item.sensitiveMetaId || meta.id,
              text: '', // Videos don't have text
              anonymizedText: '', // Videos don't have anonymized text
              reportMeta: meta
            };
            return this.current;
          }
        }

        /* 1) PDF-Datensatz von anony_text endpoint -------------------- */
        const pdfUrl = lastId
          ? a(`anony_text/?last_id=${lastId}`)
          : a('anony_text/');
        
        console.log(`Fetching PDF data from: ${pdfUrl}`);
        const { data: pdf } = await axiosInstance.get<PdfDataResponse>(pdfUrl);
        console.log('Received PDF data:', pdf);

        if (!pdf?.id) {
          this.$patch({ current: null });
          throw new Error('Backend lieferte keinen gültigen PDF-Datensatz.');
        }
        if (pdf.error) {
          this.$patch({ current: null });
          throw new Error('Backend meldet Fehler-Flag im PDF-Datensatz.');
        }

        /* 2) Sensitive-Meta nachladen ---------------------------------- */
        const metaUrl = a(`sensitivemeta/?id=${pdf.sensitiveMetaId}`);
        console.log(`Fetching sensitive meta from: ${metaUrl}`);
        const { data: metaResponse } = await axiosInstance.get<SensitiveMetaApiResponse>(metaUrl);
        console.log('Received sensitive meta response data:', metaResponse);

        if (typeof metaResponse?.id !== 'number') {
          console.error('Received invalid sensitive meta data structure:', metaResponse);
          this.$patch({ current: null });
          throw new Error('Ungültige Metadaten vom Backend empfangen (keine gültige ID gefunden).');
        }

        /* 3) Merge & State-Update -------------------------------------- */
        const merged: PatientData = { 
          ...pdf, 
          reportMeta: metaResponse 
        };
        console.log('Merged data:', merged);

        this.$patch({
          current: merged
        });

        return merged;
      } catch (err: any) {
        console.error('Error in fetchNext:', err);
        if (axios.isAxiosError(err)) {
          console.error('Axios error details:', err.response?.status, err.response?.data);
          this.error = `Fehler beim Laden der Metadaten (${err.response?.status}): ${err.message}`;
        } else {
          this.error = err?.message ?? 'Unbekannter Fehler beim Laden.';
        }
        this.$patch({ current: null });
        return null;
      } finally {
        this.loading = false;
      }
    },

    /* ---------------------------------------------------------------- */
    /* Update-Methoden                                                  */
    /* ---------------------------------------------------------------- */
    async patchPdf(payload: Partial<PatientData>) {
      if (!payload.id) throw new Error('patchPdf: id fehlt im Payload.');
      console.log('Patching PDF with payload:', payload);
      return axiosInstance.patch(a('update_anony_text/'), payload);
    },

    async patchVideo(payload: any) {
      return axiosInstance.patch(r('video/update_sensitivemeta/'), payload);
    },

    fetchPendingAnonymizations() {
      return this.pending;
    },

    /**
     * Upload files and fetch the resulting anonymization data
     * @param files - FileList or File array containing files to upload
     * @returns Promise that resolves when upload and fetch are complete
     */
    async uploadAndFetch(files: FileList | File[]): Promise<PatientData | null> {
      this.loading = true;
      this.error = null;

      try {
        const fileArray = Array.from(files);
        console.log('Starting upload process for files:', fileArray.map(f => f.name));
        
        // 1) Upload files
        const uploadResponse = await uploadFiles(files);
        console.log('Upload initiated:', uploadResponse);

        // 2) Poll status until completion
        const finalStatus = await pollUploadStatus(
          uploadResponse.statusUrl,
          (status: UploadStatusResponse) => {
            console.log('Upload status update:', status);
            // Could emit progress events here if needed
          }
        );

        console.log('Upload completed:', finalStatus);

        if (finalStatus.status !== 'anonymized' || !finalStatus.sensitiveMetaId) {
          throw new Error('Upload completed but no sensitive meta ID received');
        }

        // 3) Fetch the newly created anonymization data
        const result = await this.fetchNext(finalStatus.sensitiveMetaId);
        
        if (!result) {
          throw new Error('Failed to fetch anonymization data after upload');
        }

        console.log('Upload and fetch process completed successfully');
        return result;

      } catch (err: any) {
        console.error('Error in uploadAndFetch:', err);
        if (axios.isAxiosError(err)) {
          this.error = `Upload-Fehler (${err.response?.status}): ${err.message}`;
        } else {
          this.error = err?.message ?? 'Unbekannter Fehler beim Upload.';
        }
        this.$patch({ current: null });
        return null;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Fetch overview of all uploaded files with their statuses
     */
    async fetchOverview() {
      this.loading = true;
      this.error = null;

      try {
        console.log('Fetching file overview...');
        const { data } = await axiosInstance.get<FileItem[]>(r('anonymization/items/overview/'));
        console.log('Received overview data:', data);
        
        this.overview = data;
        return data;
      } catch (err: any) {
        console.error('Error fetching overview:', err);
        if (axios.isAxiosError(err)) {
          this.error = `Fehler beim Laden der Übersicht (${err.response?.status}): ${err.message}`;
        } else {
          this.error = err?.message ?? 'Unbekannter Fehler beim Laden der Übersicht.';
        }
        return [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Start anonymization for a specific file
     */
    async startAnonymization(id: number) {
      const file = this.overview.find(f => f.id === id);
      if (!file) {
        this.error = `Datei mit ID ${id} nicht gefunden.`;
        return false;
      }

      try {
        console.log(`Starting anonymization for file ${id}...`);
        
        // Optimistic UI update
        file.anonymizationStatus = 'processing_anonymization';
        
        // Trigger anonymization
        await axiosInstance.post(r(`anonymization/${id}/start/`));
        console.log(`Anonymization started for file ${id}`);
        
        // Start polling
        this.startPolling(id);
        
        return true;
      } catch (err: any) {
        console.error(`Error starting anonymization for file ${id}:`, err);
        
        // Revert optimistic update
        file.anonymizationStatus = 'not_started';
        
        if (axios.isAxiosError(err)) {
          this.error = `Fehler beim Starten der Anonymisierung (${err.response?.status}): ${err.message}`;
        } else {
          this.error = err?.message ?? 'Unbekannter Fehler beim Starten der Anonymisierung.';
        }
        return false;
      }
    },

    /**
     * Start polling status for a specific file
     */
    startPolling(id: number) {
      /* if we are ALREADY polling this id do nothing */
      if (this.pollingHandles[id]) return;
      
      console.log(`Starting status polling for file ${id}`);
      this.isPolling = true;
      
      const timer = setInterval(async () => {
        try {
          const { data } = await axiosInstance.get(r(`anonymization/${id}/status/`));
          const file = this.overview.find(f => f.id === id);
          
          if (file && data.anonymizationStatus) {
              /* unify wording coming from the backend ------------------- */
              const normalised =
                data.anonymizationStatus === 'completed'
                  ? 'done'
                  : data.anonymizationStatus;
  
              console.log(`Status update for file ${id}: ${normalised}`);
              file.anonymizationStatus = normalised as any;
  
              /* stop when finished or failed --------------------------- */
              if (['done', 'failed'].includes(normalised)) {
                this.stopPolling(id);
              }
            }
        } catch (err) {
          console.error(`Error polling status for file ${id}:`, err);
          // Continue polling even on error to be resilient
        }
      }, 3000);
      
      this.pollingHandles[id] = timer;
    },

    /**
     * Stop polling for a specific file
     */
    stopPolling(id: number) {
      const timer = this.pollingHandles[id];
      if (timer) {
        clearInterval(timer);
        delete this.pollingHandles[id];
        console.log(`Stopped polling for file ${id}`);
      }
      
      // Update global polling state
      this.isPolling = Object.keys(this.pollingHandles).length > 0;
    },

    /**
     * Stop all polling
     */
    stopAllPolling() {
      Object.keys(this.pollingHandles).forEach(id => {
        this.stopPolling(parseInt(id));
      });
      this.isPolling = false;
      console.log('Stopped all polling');
    },

    /**
     * Set current item for validation (called when clicking "Validate")
     */
    async setCurrentForValidation(id: number) {
      try {

        console.log(`Setting current item for validation: ${id}`);

                        
        // Find the item in overview to get mediaType and sensitiveMetaId
        const item = this.overview.find(f => f.id === id);
        if (!item) {
            throw new Error(`Item with ID ${id} not found in overview`);
        }
        
        console.log('Found item for validation:', item);
        
        if (item.mediaType === 'video') {
            // For videos, use the sensitiveMetaId to load the video data
            if (!item.sensitiveMetaId || typeof item.sensitiveMetaId !== 'number') {
              throw new Error(`Video item with ID ${id} has no valid sensitiveMetaId (got: ${item.sensitiveMetaId})`);
              return null;
            }
            console.log(`Loading video data for sensitiveMetaId: ${item.sensitiveMetaId}`);
            const { data: meta } = await axiosInstance.get(r(`video/sensitivemeta/?id=${item.sensitiveMetaId}`));
            console.log('Received video sensitive meta:', meta);
            
            this.current = {
              id: item.sensitiveMetaId, // Use sensitiveMetaId for video stream URL
              sensitiveMetaId: item.sensitiveMetaId,
              text: '', // Videos don't have text
              anonymizedText: '', // Videos don't have anonymized text
              reportMeta: meta
            };
            return this.current;
        } 
        else {
            // For PDFs, use the original endpoint
        console.log(`Setting current item for validation: ${id}`);
        const { data } = await axiosInstance.put<PatientData>(
          r(`anonymization/${id}/current/`)
        );
        console.log('Received validation data:', data);
        
        this.current = data;
        return data;
      } 
    }
      
      catch (err: any) {
        console.error(`Error setting current for validation (ID: ${id}):`, err);
        if (axios.isAxiosError(err)) {
          this.error = `Fehler beim Laden der Validierungsdaten (${err.response?.status}): ${err.message}`;
        } else {
          this.error = err?.message ?? 'Unbekannter Fehler beim Laden der Validierungsdaten.';
        }
        return null;
      }
    },

    /**
     * Refresh overview data
     */
    async refreshOverview() {
      await this.fetchOverview();
    },

    /**
     * Re-import a video file to regenerate metadata
     */
    async reimportVideo(fileId: number) {
      const file = this.overview.find(f => f.id === fileId);
      if (!file) {
        this.error = `Video mit ID ${fileId} nicht gefunden.`;
        return false;
      }

      if (file.mediaType !== 'video') {
        this.error = `Datei mit ID ${fileId} ist kein Video.`;
        return false;
      }

      try {
        console.log(`Re-importing video ${fileId}...`);
        
        // Optimistic UI update - set to processing to show user feedback
        file.anonymizationStatus = 'processing_anonymization';
        file.metadataImported = false;
        
        // Trigger re-import via backend
        const response = await axiosInstance.post(r(`video/${fileId}/reimport/`));
        console.log(`Video re-import response:`, response.data);
        
        // ✅ NEW: Start polling immediately after re-import to monitor status
        console.log(`Starting polling for re-imported video ${fileId}`);
        this.startPolling(fileId);
        
        // Check if re-import was successful
        if (response.data && response.data.sensitive_meta_created) {
          console.log(`Video ${fileId} re-imported successfully with metadata`);
        } else {
          console.log(`Video ${fileId} re-imported but metadata may be incomplete`);
        }
        
        return true;
      } catch (err: any) {
        console.error(`Error re-importing video ${fileId}:`, err);
        
        // Revert optimistic update
        file.anonymizationStatus = 'failed';
        file.metadataImported = false;
        
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.error || err.message;
          this.error = `Fehler beim erneuten Importieren (${err.response?.status}): ${errorMessage}`;
        } else {
          this.error = err?.message ?? 'Unbekannter Fehler beim erneuten Importieren.';
        }
        return false;
      }
    }

    // ...existing actions continue...
  }
});
