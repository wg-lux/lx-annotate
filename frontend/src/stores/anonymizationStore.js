/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
import { uploadFiles, pollUploadStatus } from '@/api/upload';
/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export var useAnonymizationStore = defineStore('anonymization', {
    state: function () { return ({
        anonymizationStatus: 'idle',
        loading: false,
        error: null,
        pending: [], // Beachte: pending verwendet jetzt auch PatientData mit SensitiveMetaApiResponse
        current: null
    }); },
    getters: {
        getCurrentItem: function (state) { return state.current; },
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
                const metaUrl = a(`sensitivemeta/?id=${pdf.sensitiveMetaId}`);
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
                    reportMeta: metaResponse
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
        fetchPendingAnonymizations: function () {
            return this.pending;
        },
        /**
         * Upload files and fetch the resulting anonymization data
         * @param files - FileList or File array containing files to upload
         * @returns Promise that resolves when upload and fetch are complete
         */
        async uploadAndFetch(files) {
            this.loading = true;
            this.error = null;
            try {
                const fileArray = Array.from(files);
                console.log('Starting upload process for files:', fileArray.map(f => f.name));
                // 1) Upload files
                const uploadResponse = await uploadFiles(files);
                console.log('Upload initiated:', uploadResponse);
                // 2) Poll status until completion
                const finalStatus = await pollUploadStatus(uploadResponse.statusUrl, (status) => {
                    console.log('Upload status update:', status);
                    // Could emit progress events here if needed
                });
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
        /**
         * Load a specific file by ID and type for anonymization validation
         * @param type - 'pdf' or 'video'
         * @param id - File ID
         * @param sensitiveMetaId - Optional sensitive meta ID if known
         * @returns Promise that resolves with the loaded data
         */
        async fetchSpecificFile(type, id, sensitiveMetaId) {
            this.loading = true;
            this.error = null;
            try {
                let pdfData;
                if (type === 'pdf') {
                    // For PDFs, we need to fetch from the anony_text endpoint with specific ID
                    const pdfUrl = a(`anony_text/?id=${id}`);
                    console.log(`Fetching specific PDF data from: ${pdfUrl}`);
                    const { data } = await axiosInstance.get(pdfUrl);
                    pdfData = data;
                }
                else {
                    // For videos, we'll need to create a similar endpoint or adapt existing ones
                    // For now, simulate the structure
                    pdfData = {
                        id: id,
                        sensitiveMetaId: sensitiveMetaId || 0,
                        text: '',
                        anonymizedText: '',
                        status: 'ready'
                    };
                }
                console.log('Received specific file data:', pdfData);
                if (!pdfData?.id) {
                    this.$patch({ current: null });
                    throw new Error('Backend lieferte keinen gültigen Datensatz.');
                }
                if (pdfData.error) {
                    this.$patch({ current: null });
                    throw new Error('Backend meldet Fehler-Flag im Datensatz.');
                }
                // Use provided sensitiveMetaId or the one from the response
                const metaId = sensitiveMetaId || pdfData.sensitiveMetaId;
                if (!metaId) {
                    this.$patch({ current: null });
                    throw new Error('Keine SensitiveMeta ID verfügbar.');
                }
                /* Load Sensitive-Meta data */
                const metaUrl = a(`sensitivemeta/?id=${metaId}`);
                console.log(`Fetching sensitive meta from: ${metaUrl}`);
                const { data: metaResponse } = await axiosInstance.get(metaUrl);
                console.log('Received sensitive meta response data:', metaResponse);
                if (typeof metaResponse?.id !== 'number') {
                    console.error('Received invalid sensitive meta data structure:', metaResponse);
                    this.$patch({ current: null });
                    throw new Error('Ungültige Metadaten vom Backend empfangen (keine gültige ID gefunden).');
                }
                /* Merge & State-Update */
                const merged = {
                    ...pdfData,
                    reportMeta: metaResponse
                };
                console.log('Merged specific file data:', merged);
                this.$patch({
                    current: merged
                });
                return merged;
            }
            catch (err) {
                console.error('Error in fetchSpecificFile:', err);
                if (axios.isAxiosError(err)) {
                    console.error('Axios error details:', err.response?.status, err.response?.data);
                    this.error = `Fehler beim Laden der Datei (${err.response?.status}): ${err.message}`;
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
        /**
         * Load available files for selection
         * @param type - Optional filter by type ('pdf', 'video', 'all')
         * @param limit - Number of results to return
         * @returns Promise with available files data
         */
        async fetchAvailableFiles(type = 'all', limit = 50) {
            try {
                const response = await axiosInstance.get('/api/available-files/', {
                    params: { type, limit }
                });
                return response.data;
            }
            catch (err) {
                console.error('Error fetching available files:', err);
                throw new Error('Fehler beim Laden der verfügbaren Dateien.');
            }
        },
        // ...existing code...
    }
});
