/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
import { ref } from 'vue';

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
  fileSize?: number|undefined; // Optional field for file size
  rawFile?: string; // New field for raw file path (for videos)
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
  hasAvailableFiles: boolean;
  availableFiles: FileItem[];
  // NEW: IDs der Dateien, die validiert werden müssen (anonymizationStatus === 'done' && annotationStatus !== 'done')
  needsValidationIds: number[];
}

// Interface matching the actual API response for sensitivemeta
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
  // PDF specific fields
  file?: string;
  pdfUrl?: string;
  fullPdfPath?: string;
}

// NEW – matches your VideoDetailSer
export interface VideoDetailApiResponse {
  id: number;
  sensitiveMetaId: number;     // ✔︎ camelCase
  videoUrl: string | null;
  thumbnail: string | null;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientDob: string | null;
  examinationDate: string | null;
  casenumber?: string | null;
  file: string | null;
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
  videoUrl?: string | null;
  thumbnail?: string | null;
  text: string;
  anonymizedText: string;
  reportMeta?: SensitiveMeta;
  status?: string;
  error?: boolean;
  pdfStreamUrl?: string; // Add this field from VoPPatientDataSerializer
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const availableFiles = ref<FileItem[]>([]);
export const useAnonymizationStore = defineStore('anonymization', {
  state: (): AnonymizationState & { pending: PatientData[] } => ({
    anonymizationStatus: 'idle',
    loading: false,
    error: null,
    pending: [],
    current: null,
    overview: [],
    pollingHandles: {},
    isPolling: false,
    hasAvailableFiles: false,
    availableFiles: availableFiles.value, // Use the value of the ref to get the actual array
    // NEW
    needsValidationIds: [],
  }),

  getters: {
    getCurrentItem: (state) => state.current,
    isAnyFileProcessing: (state) => state.overview.some(f => f.anonymizationStatus === 'processing_anonymization' || f.anonymizationStatus === 'extracting_frames' || f.anonymizationStatus === 'predicting_segments'),
    processingFiles: (state) => state.overview.filter(f => f.anonymizationStatus === 'processing_anonymization' || f.anonymizationStatus === 'extracting_frames' || f.anonymizationStatus === 'predicting_segments'),
    getState: (state) => state
  },

  actions: {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    async fetchNext(lastId?: number): Promise<any> {
      this.loading = true;
      this.error = null;

      try {
        // Check if we have a specific file selected from overview
        if (lastId) {
          const item = this.overview.find(f => f.id === lastId);
          
          if (item?.mediaType === 'video') {
            // **Use the sensitive_meta_id (!) and keep the trailing slash**
            console.log(`Fetching video detail for sensitiveMetaId: ${item.id}`);
            const { data: video } = await axiosInstance.get<VideoDetailApiResponse>(
              r(`media/videos/${item.id}/`)
            );
            console.log('Received video detail:', video);
            
            this.current = {
              id: video.id,
              sensitiveMetaId: video.sensitiveMetaId,
              videoUrl: video.videoUrl,
              thumbnail: video.thumbnail,
              text: '',            // Videos haben keinen Text
              anonymizedText: '',
              reportMeta: {
                id: video.sensitiveMetaId,
                patientFirstName: video.patientFirstName,
                patientLastName:  video.patientLastName,
                patientDob:       video.patientDob,
                patientGender: '',
                examinationDate:  video.examinationDate,
                casenumber:       video.casenumber
              }
            };
            return this.current;
          }
        

        else {
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
        const { data: metaResponse } = await axiosInstance.get<SensitiveMeta>(metaUrl);
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
      } 
    }
    else {
        if (this.current) {
          return
        }
        else{
            console.warn('No lastId provided and current item is not set.');
            const currentItem = this.getCurrentItem;
            if (currentItem && currentItem.id) {
                this.current = currentItem;
                return this.fetchNext(currentItem.id);
            } else {
                console.warn('No valid current item available to fetch. Stopping to prevent infinite recursion.');
                return null;
            }
        }
    }
    }
      catch (err: any) {
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

    async patchPdf(payload: { id?: number; sensitive_meta_id?: number; [key: string]: any }): Promise<any> {
      if (!payload.id && !payload.sensitive_meta_id) {
        throw new Error('patchPdf: id oder sensitive_meta_id fehlt im Payload.');
      }
      console.log('Patching PDF with payload:', payload);
      
      // Use the correct endpoint for PDF sensitive meta updates
      if (payload.sensitive_meta_id) {
        return axiosInstance.patch(a('update_sensitivemeta/'), payload);
      } else {
        return axiosInstance.patch(a('update_anony_text/'), payload);
      }
    },

    async patchVideo(payload: { id?: number; sensitive_meta_id?: number; [key: string]: any }): Promise<any> {
        if (!payload.id && !payload.sensitive_meta_id) {
            throw new Error('patchVideo: id oder sensitive_meta_id fehlt im Payload.');
        }
        console.log('Patching Video with payload:', payload);
        
        // Use the video media endpoint which handles both streaming and updates
        if (payload.sensitive_meta_id) {
            return axiosInstance.patch(`media/videos/`, payload);
        } else {
            return axiosInstance.patch(`media/videos/${payload.id}/`, payload);
        }
    },
    fetchPendingAnonymizations() {
      return this.pending;
    },

    /**
     * Upload files and fetch the resulting anonymization data
     * @param files - FileList or File array containing files to upload
     * @returns Promise that resolves when upload and fetch are complete
     */


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
        
        // Update overview and available files
        this.overview = data;
        
        // Clear and update availableFiles to prevent duplicates
        this.availableFiles.length = 0; // Clear the array
        this.availableFiles.push(...data); // Add all files from the fresh data
        
        // Update the reactive ref as well
        availableFiles.value = [...data];
        
        // NEW: Ermittele IDs, die validiert werden müssen (Anonymisierung abgeschlossen, Annotation noch nicht erledigt)
        const needsValidation = data
          .filter(f => f.anonymizationStatus === 'done' && f.annotationStatus !== 'done')
          .map(f => f.id);
        this.needsValidationIds = needsValidation;

        // NEW: Polling sofort stoppen für
        // 1) Dateien, die nicht mehr existieren
        const currentPollingIds = Object.keys(this.pollingHandles).map((k) => Number(k));
        const existingIds = new Set(data.map(f => f.id));
        for (const pid of currentPollingIds) {
          if (!existingIds.has(pid)) {
            this.stopPolling(pid);
          }
        }
        // 2) Dateien mit finalem Status oder die nicht gepollt werden sollen
        const stopStatuses = new Set(['done', 'validated', 'failed', 'not_started']);
        for (const f of data) {
          if (stopStatuses.has(f.anonymizationStatus) && this.pollingHandles[f.id]) {
            this.stopPolling(f.id);
          }
        }
        
        this.hasAvailableFiles = data.length > 0;
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
      if (this.pollingHandles[id]) {
        console.log(`Polling for file ${id} is already running`);
        return;
      }
      if (id in this.needsValidationIds) {
        console.log(`File ${id} is in needsValidationIds, skipping polling`);
        file.anonymizationStatus = 'validated'; // Set status to validated
        return;
      }
      
      console.log(`Starting status polling for file ${id}`);
      this.isPolling = true;
      
      const timer = setInterval(async () => {
        try {
          const { data } = await axiosInstance.get(r(`anonymization/${id}/status/`));
          const file = this.overview.find(f => f.id === id);
          
          if (file && data.anonymizationStatus) {
              // ✅ FIX: Remove redundant normalization
              const statusFromBackend = data.anonymizationStatus;
  
              console.log(`Status update for file ${id}: ${statusFromBackend}`);
              file.anonymizationStatus = statusFromBackend as any;
  
              // ✅ FIX: Include 'validated' as a stopping condition
              if (['done', 'validated', 'failed'].includes(statusFromBackend)) {
                console.log(`Stopping polling for file ${id} - final status: ${statusFromBackend}`);
                this.stopPolling(id);
              }
            }
        } catch (err) {
          console.error(`Error polling status for file ${id}:`, err);
          // Continue polling even on error to be resilient
        }
      }, 10000); // Reduced from 1500ms to 10000ms (10 seconds)

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
            // For videos, use the ID to load the video data

            console.log(`Loading video data for sensitiveMetaId: ${item.id}`);
            const { data: video } = await axiosInstance.get<VideoDetailApiResponse>(
              r(`media/videos/${item.id}/`)
            );
            console.log('Received video detail:', video);
            
            this.current = {
              id: video.id,
              sensitiveMetaId: video.sensitiveMetaId,
              videoUrl: video.videoUrl,
              thumbnail: video.thumbnail,
              text: 'd', // Videos don't have text
              anonymizedText: '', // Videos don't have anonymized text
              reportMeta: {
                id: video.sensitiveMetaId,
                patientFirstName: video.patientFirstName,
                patientLastName: video.patientLastName,
                patientDob: video.patientDob,
                patientGender: '', // Will be filled from backend if available
                examinationDate: video.examinationDate,
                casenumber: video.casenumber
              }
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

  }
});
