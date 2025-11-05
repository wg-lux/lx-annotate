/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { a, r } from '@/api/axiosInstance';
import axios from 'axios';
import { ref } from 'vue';
/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export const availableFiles = ref([]);
export const useAnonymizationStore = defineStore('anonymization', {
    state: () => ({
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
        needsValidationIds: []
    }),
    getters: {
        getCurrentItem: (state) => state.current,
        isAnyFileProcessing: (state) => state.overview.some((f) => f.anonymizationStatus === 'processing_anonymization' ||
            f.anonymizationStatus === 'extracting_frames' ||
            f.anonymizationStatus === 'predicting_segments'),
        processingFiles: (state) => state.overview.filter((f) => f.anonymizationStatus === 'processing_anonymization' ||
            f.anonymizationStatus === 'extracting_frames' ||
            f.anonymizationStatus === 'predicting_segments'),
        getState: (state) => state
    },
    actions: {
        /** Gets the next anonymization file + its metadata */
        async fetchNext(lastId) {
            this.loading = true;
            this.error = null;
            try {
                // Check if we have a specific file selected from overview
                if (lastId) {
                    const item = this.overview.find((f) => f.id === lastId);
                    if (item?.mediaType === 'video') {
                        // **Use the sensitive_meta_id (!) for video details endpoint**
                        console.log(`Fetching video detail for sensitiveMetaId: ${item.id}`);
                        const { data: video } = await axiosInstance.get(r(`media/videos/${item.id}/details/`));
                        console.log('Received video detail:', video);
                        this.current = {
                            id: video.id,
                            sensitiveMetaId: video.sensitiveMetaId,
                            videoUrl: video.videoUrl,
                            thumbnail: video.thumbnail,
                            text: '', // Videos haben keinen Text
                            anonymizedText: '',
                            reportMeta: {
                                id: video.sensitiveMetaId,
                                patientFirstName: video.patientFirstName,
                                patientLastName: video.patientLastName,
                                patientDob: video.patientDob,
                                patientGender: '',
                                examinationDate: video.examinationDate,
                                casenumber: video.casenumber
                            }
                        };
                        return this.current;
                    }
                    else {
                        /* PDF-Daten via Modern Media Framework laden ----------------- */
                        if (!lastId) {
                            throw new Error('PDF ID is required to fetch PDF data');
                        }
                        // 1) PDF Details (inkl. text/anonymizedText) laden
                        console.log(`Fetching PDF details for ID: ${lastId}`);
                        const { data: pdfDetails } = await axiosInstance.get(r(`media/pdfs/${lastId}/`));
                        console.log('Received PDF details:', pdfDetails);
                        // 2) Sensitive Metadata laden
                        console.log(`Fetching PDF sensitive metadata for ID: ${lastId}`);
                        const { data: sensitiveMeta } = await axiosInstance.get(r(`media/pdfs/${lastId}/sensitive-metadata/`));
                        console.log('Received PDF sensitive metadata:', sensitiveMeta);
                        if (typeof sensitiveMeta?.id !== 'number') {
                            console.error('Received invalid sensitive meta data structure:', sensitiveMeta);
                            this.$patch({ current: null });
                            throw new Error('Ungültige Metadaten vom Backend empfangen (keine gültige ID gefunden).');
                        }
                        /* Merge & State-Update -------------------------------------- */
                        const merged = {
                            id: lastId,
                            sensitiveMetaId: sensitiveMeta.id,
                            text: pdfDetails.text || '', // Text from PDF details
                            anonymizedText: pdfDetails.anonymizedText || '', // AnonymizedText from PDF details (camelCase!)
                            pdfStreamUrl: pdfDetails.streamUrl || pdfDetails.stream_url, // Stream URL for PDF viewing
                            reportMeta: sensitiveMeta
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
                        return;
                    }
                    else {
                        console.warn('No lastId provided and current item is not set.');
                        const currentItem = this.getCurrentItem;
                        if (currentItem && currentItem.id) {
                            this.current = currentItem;
                            return this.fetchNext(currentItem.id);
                        }
                        else {
                            console.warn('No valid current item available to fetch. Stopping to prevent infinite recursion.');
                            return null;
                        }
                    }
                }
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
            if (!payload.id) {
                throw new Error('patchPdf: PDF ID fehlt im Payload.');
            }
            console.log('Patching PDF sensitive metadata with payload:', payload);
            // Remove id from payload before sending (it's in URL)
            const { id, ...updateData } = payload;
            // Use Modern Media Framework endpoint
            return axiosInstance.patch(r(`media/pdfs/${id}/sensitive-metadata/`), updateData);
        },
        async patchVideo(payload) {
            if (!payload.id) {
                throw new Error('patchVideo: Video ID fehlt im Payload.');
            }
            console.log('Patching video sensitive metadata with payload:', payload);
            // Remove id from payload before sending (it's in URL)
            const { id, ...updateData } = payload;
            // Use Modern Media Framework endpoint
            return axiosInstance.patch(r(`media/videos/${id}/sensitive-metadata/`), updateData);
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
                const { data } = await axiosInstance.get(r('anonymization/items/overview/'));
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
                    .filter((f) => f.anonymizationStatus === 'done' && f.annotationStatus !== 'done')
                    .map((f) => f.id);
                this.needsValidationIds = needsValidation;
                // NEW: Polling sofort stoppen für
                // 1) Dateien, die nicht mehr existieren
                const currentPollingIds = Object.keys(this.pollingHandles).map((k) => Number(k));
                const existingIds = new Set(data.map((f) => f.id));
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
            const file = this.overview.find((f) => f.id === id);
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
            if (this.pollingHandles[id]) {
                console.log(`Polling for file ${id} is already running`);
                return;
            }
            // ✅ FIX: Correct array check using .includes() instead of 'in' operator
            if (this.needsValidationIds.includes(id)) {
                console.log(`File ${id} is in needsValidationIds, skipping polling`);
                const file = this.overview.find((f) => f.id === id);
                if (file) {
                    file.anonymizationStatus = 'validated'; // Set status to validated
                }
                return;
            }
            console.log(`Starting status polling for file ${id}`);
            this.isPolling = true;
            const timer = setInterval(async () => {
                try {
                    const { data } = await axiosInstance.get(r(`anonymization/${id}/status/`));
                    const file = this.overview.find((f) => f.id === id);
                    if (file && data.anonymizationStatus) {
                        // ✅ FIX: Remove redundant normalization
                        const statusFromBackend = data.anonymizationStatus;
                        console.log(`Status update for file ${id}: ${statusFromBackend}`);
                        file.anonymizationStatus = statusFromBackend;
                        // ✅ FIX: Include 'validated' as a stopping condition
                        if (['done', 'validated', 'failed'].includes(statusFromBackend)) {
                            console.log(`Stopping polling for file ${id} - final status: ${statusFromBackend}`);
                            this.stopPolling(id);
                        }
                    }
                }
                catch (err) {
                    console.error(`Error polling status for file ${id}:`, err);
                    // Continue polling even on error to be resilient
                }
            }, 10000); // Reduced from 1500ms to 10000ms (10 seconds)
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
            Object.keys(this.pollingHandles).forEach((id) => {
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
                // Find the item in overview to get mediaType and sensitiveMetaId
                const item = this.overview.find((f) => f.id === id);
                if (!item) {
                    throw new Error(`Item with ID ${id} not found in overview`);
                }
                console.log('Found item for validation:', item);
                if (item.mediaType === 'video') {
                    // For videos, use the ID to load the video data
                    console.log(`Loading video data for sensitiveMetaId: ${item.id}`);
                    const { data: video } = await axiosInstance.get(r(`media/videos/${item.id}/details/`));
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
                    // For PDFs, load both details and sensitive metadata
                    console.log(`Setting current PDF item for validation: ${id}`);
                    // 1) PDF Details (inkl. text/anonymizedText) laden
                    console.log(`Fetching PDF details for ID: ${id}`);
                    const { data: pdfDetails } = await axiosInstance.get(r(`media/pdfs/${id}/`));
                    console.log('Received PDF details:', pdfDetails);
                    // 2) Sensitive-Meta laden
                    const metaUrl = r(`media/pdfs/${id}/sensitive-metadata/`);
                    console.log(`Fetching sensitive meta from: ${metaUrl}`);
                    const { data: sensitiveMeta } = await axiosInstance.get(metaUrl);
                    console.log('Received sensitive meta response data:', sensitiveMeta);
                    if (typeof sensitiveMeta?.id !== 'number') {
                        console.error('Received invalid sensitive meta data structure:', sensitiveMeta);
                        throw new Error('Ungültige Metadaten vom Backend empfangen.');
                    }
                    /* Merge & State-Update -------------------------------------- */
                    const merged = {
                        id: id,
                        sensitiveMetaId: sensitiveMeta.id,
                        text: pdfDetails.text || '', // Text from PDF details
                        anonymizedText: pdfDetails.anonymizedText || '', // AnonymizedText from PDF details (camelCase!)
                        pdfStreamUrl: pdfDetails.streamUrl || pdfDetails.stream_url, // Stream URL for PDF viewing
                        reportMeta: sensitiveMeta
                    };
                    console.log('Merged validation data:', merged);
                    this.current = merged;
                    return merged;
                }
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
        },
        /**
         * Re-import a video file to regenerate metadata
         */
        async reimportVideo(fileId) {
            const file = this.overview.find((f) => f.id === fileId);
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
                const response = await axiosInstance.post(r(`media/videos/${fileId}/reimport/`));
                console.log(`Video re-import response:`, response.data);
                console.log(`Starting polling for re-imported video ${fileId}`);
                this.startPolling(fileId);
                // Check if re-import was successful
                if (response.data && response.data.sensitive_meta_created) {
                    console.log(`Video ${fileId} re-imported successfully with metadata`);
                }
                else {
                    console.log(`Video ${fileId} re-imported but metadata may be incomplete`);
                }
                return true;
            }
            catch (err) {
                console.error(`Error re-importing video ${fileId}:`, err);
                // Revert optimistic update
                file.anonymizationStatus = 'failed';
                file.metadataImported = false;
                if (axios.isAxiosError(err)) {
                    const errorMessage = err.response?.data?.error || err.message;
                    this.error = `Fehler beim erneuten Importieren (${err.response?.status}): ${errorMessage}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim erneuten Importieren.';
                }
                return false;
            }
        },
        /**
         * Re-import a PDF file to regenerate metadata
         * Follows the same pattern as reimportVideo for consistency
         */
        async reimportPdf(fileId) {
            const file = this.overview.find((f) => f.id === fileId);
            if (!file) {
                this.error = `PDF mit ID ${fileId} nicht gefunden.`;
                return false;
            }
            if (file.mediaType !== 'pdf') {
                this.error = `Datei mit ID ${fileId} ist kein PDF.`;
                return false;
            }
            try {
                console.log(`Re-importing PDF ${fileId}...`);
                // Optimistic UI update - set to processing to show user feedback
                file.anonymizationStatus = 'processing_anonymization';
                file.metadataImported = false;
                // Trigger re-import via backend using media framework endpoint
                const response = await axiosInstance.post(r(`media/pdfs/${fileId}/reimport/`));
                console.log(`PDF re-import response:`, response.data);
                console.log(`Starting polling for re-imported PDF ${fileId}`);
                this.startPolling(fileId);
                // Check if re-import was successful
                if (response.data && response.data.sensitive_meta_created) {
                    console.log(`PDF ${fileId} re-imported successfully with metadata`);
                }
                else {
                    console.log(`PDF ${fileId} re-imported but metadata may be incomplete`);
                }
                return true;
            }
            catch (err) {
                console.error(`Error re-importing PDF ${fileId}:`, err);
                // Revert optimistic update
                file.anonymizationStatus = 'failed';
                file.metadataImported = false;
                if (axios.isAxiosError(err)) {
                    const errorMessage = err.response?.data?.error || err.message;
                    this.error = `Fehler beim erneuten Importieren (${err.response?.status}): ${errorMessage}`;
                }
                else {
                    this.error = err?.message ?? 'Unbekannter Fehler beim erneuten Importieren.';
                }
                return false;
            }
        }
    }
});
