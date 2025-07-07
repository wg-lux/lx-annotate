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
        pending: [],
        current: null,
        // New state
        overview: [],
        pollingHandles: {},
        isPolling: false
    }),
    getters: {
        getCurrentItem: (state) => state.current,
        isAnyFileProcessing: (state) => state.overview.some(f => f.anonymizationStatus === 'processing'),
        processingFiles: (state) => state.overview.filter(f => f.anonymizationStatus === 'processing')
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
        fetchPendingAnonymizations() {
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
         * Fetch overview of all uploaded files with their statuses
         */
        async fetchOverview() {
            this.loading = true;
            this.error = null;
            try {
                console.log('Fetching file overview...');
                const { data } = await axiosInstance.get(r('anonymization/items/overview/'));
                console.log('Received overview data:', data);
                this.overview = data;
                return data;
            }
            catch (err) {
                console.error('Error fetching overview:', err);
                if (axios.isAxiosError(err)) {
                    this.error = `Fehler beim Laden der Übersicht (${err.response?.status}): ${err.message}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim Laden der Übersicht.';
                }
                return [];
            }
            finally {
                this.loading = false;
            }
        },
        /**
         * Start anonymization for a specific file
         */
        async startAnonymization(id) {
            const file = this.overview.find(f => f.id === id);
            if (!file) {
                this.error = `Datei mit ID ${id} nicht gefunden.`;
                return false;
            }
            try {
                console.log(`Starting anonymization for file ${id}...`);
                // Optimistic UI update
                file.anonymizationStatus = 'processing';
                // Trigger anonymization
                await axiosInstance.post(r(`anonymization/${id}/start/`));
                console.log(`Anonymization started for file ${id}`);
                // Start polling
                this.startPolling(id);
                return true;
            }
            catch (err) {
                console.error(`Error starting anonymization for file ${id}:`, err);
                // Revert optimistic update
                file.anonymizationStatus = 'not_started';
                if (axios.isAxiosError(err)) {
                    this.error = `Fehler beim Starten der Anonymisierung (${err.response?.status}): ${err.message}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim Starten der Anonymisierung.';
                }
                return false;
            }
        },
        /**
         * Start polling status for a specific file
         */
        startPolling(id) {
            /* if we are ALREADY polling this id do nothing */
            if (this.pollingHandles[id])
                return;
            console.log(`Starting status polling for file ${id}`);
            this.isPolling = true;
            const timer = setInterval(async () => {
                try {
                    const { data } = await axiosInstance.get(r(`anonymization/${id}/status/`));
                    const file = this.overview.find(f => f.id === id);
                    if (file && data.anonymizationStatus) {
                        /* unify wording coming from the backend ------------------- */
                        const normalised = data.anonymizationStatus === 'completed'
                            ? 'done'
                            : data.anonymizationStatus;
                        console.log(`Status update for file ${id}: ${normalised}`);
                        file.anonymizationStatus = normalised;
                        /* stop when finished or failed --------------------------- */
                        if (['done', 'failed'].includes(normalised)) {
                            this.stopPolling(id);
                        }
                    }
                }
                catch (err) {
                    console.error(`Error polling status for file ${id}:`, err);
                    // Continue polling even on error to be resilient
                }
            }, 3000);
            this.pollingHandles[id] = timer;
        },
        /**
         * Stop polling for a specific file
         */
        stopPolling(id) {
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
        async setCurrentForValidation(id) {
            try {
                console.log(`Setting current item for validation: ${id}`);
                const { data } = await axiosInstance.put(r(`anonymization/${id}/current/`));
                console.log('Received validation data:', data);
                this.current = data;
                return data;
            }
            catch (err) {
                console.error(`Error setting current for validation (ID: ${id}):`, err);
                if (axios.isAxiosError(err)) {
                    this.error = `Fehler beim Laden der Validierungsdaten (${err.response?.status}): ${err.message}`;
                }
                else {
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
        }
        // ...existing actions continue...
    }
});
