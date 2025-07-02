/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
import { uploadFiles, pollUploadStatus, type UploadStatusResponse } from '@/api/upload';

/* ------------------------------------------------------------------ */
/* Typen                                                               */
/* ------------------------------------------------------------------ */
export interface AnonymizationState {
  anonymizationStatus: string;
  loading: boolean;
  error: string | null;
  current: PatientData | null;
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
    pending: [], // Beachte: pending verwendet jetzt auch PatientData mit SensitiveMetaApiResponse
    current: null
  }),

  getters: {
    getCurrentItem: (state) => state.current,
  },

  actions: {
    /** Holt den nächsten PDF-Datensatz + zugehöriges SensitiveMeta
     *  und fügt beides zusammen. */
    async fetchNext(lastId?: number) {
      this.loading = true;
      this.error = null;

      try {
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
  }
});
