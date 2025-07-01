/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
import { uploadFiles, pollUploadStatus } from '@/api/upload';
/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export const useAnonymizationStore = defineStore('anonymization', {
    state: () => ({
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
        async fetchNext(lastId) {
            this.loading = true;
            this.error = null;
            try {
                /* 1) PDF-Datensatz von anony_text endpoint -------------------- */
                const pdfUrl = lastId
                    ? a(`anony_text/?last_id=${lastId}`)
                    : a('anony_text/');
                console.log(`Fetching PDF data from: ${pdfUrl}`);
                const { data: pdf } = await axiosInstance.get(pdfUrl);
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
                const metaUrl = a(`sensitivemeta/?id=${pdf.sensitive_meta_id}`);
                console.log(`Fetching sensitive meta from: ${metaUrl}`);
                const { data: metaResponse } = await axiosInstance.get(metaUrl);
                console.log('Received sensitive meta response data:', metaResponse);
                if (typeof metaResponse?.id !== 'number') {
                    console.error('Received invalid sensitive meta data structure:', metaResponse);
                    this.$patch({ current: null });
                    throw new Error('Ungültige Metadaten vom Backend empfangen (keine gültige ID gefunden).');
                }
                /* 3) Merge & State-Update -------------------------------------- */
                const merged = {
                    ...pdf,
                    report_meta: metaResponse
                };
                console.log('Merged data:', merged);
                this.$patch({
                    current: merged
                });
                return merged;
            }
            catch (err) {
                console.error('Error in fetchNext:', err);
                if (axios.isAxiosError(err)) {
                    console.error('Axios error details:', err.response?.status, err.response?.data);
                    this.error = `Fehler beim Laden der Metadaten (${err.response?.status}): ${err.message}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim Laden.';
                }
                this.$patch({ current: null });
                return null;
            }
            finally {
                this.loading = false;
            }
        },
        /* ---------------------------------------------------------------- */
        /* Update-Methoden                                                  */
        /* ---------------------------------------------------------------- */
        async patchPdf(payload) {
            if (!payload.id)
                throw new Error('patchPdf: id fehlt im Payload.');
            console.log('Patching PDF with payload:', payload);
            return axiosInstance.patch(a('update_anony_text/'), payload);
        },
        async patchVideo(payload) {
            return axiosInstance.patch(r('video/update_sensitivemeta/'), payload);
        },
        fetchPendingAnonymizations() {
            return this.pending;
        },
        /**
         * Upload files and fetch the resulting anonymization data
         * @param fileList - FileList containing files to upload
         * @returns Promise that resolves when upload and fetch are complete
         */
        async uploadAndFetch(fileList) {
            this.loading = true;
            this.error = null;
            try {
                console.log('Starting upload process for files:', Array.from(fileList).map(f => f.name));
                // 1) Upload files
                const uploadResponse = await uploadFiles(fileList);
                console.log('Upload initiated:', uploadResponse);
                // 2) Poll status until completion
                const finalStatus = await pollUploadStatus(uploadResponse.status_url, (status) => {
                    console.log('Upload status update:', status);
                    // Could emit progress events here if needed
                });
                console.log('Upload completed:', finalStatus);
                if (finalStatus.status !== 'anonymized' || !finalStatus.sensitive_meta_id) {
                    throw new Error('Upload completed but no sensitive meta ID received');
                }
                // 3) Fetch the newly created anonymization data
                const result = await this.fetchNext(finalStatus.sensitive_meta_id);
                if (!result) {
                    throw new Error('Failed to fetch anonymization data after upload');
                }
                console.log('Upload and fetch process completed successfully');
                return result;
            }
            catch (err) {
                console.error('Error in uploadAndFetch:', err);
                if (axios.isAxiosError(err)) {
                    this.error = `Upload-Fehler (${err.response?.status}): ${err.message}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim Upload.';
                }
                this.$patch({ current: null });
                return null;
            }
            finally {
                this.loading = false;
            }
        },
    }
});
