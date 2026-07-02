/* @stores/anonymizationStore.ts */
import { defineStore } from 'pinia';
import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance';
import axios from 'axios';
import { ref, computed } from 'vue';
import { endpoints } from '@/types/api/endpoints';
function syntheticQuarantineId(quarantineId, usedIds) {
    let hash = 0;
    for (let i = 0; i < quarantineId.length; i += 1) {
        hash = (hash * 31 + quarantineId.charCodeAt(i)) | 0;
    }
    let candidate = -Math.max(1, Math.abs(hash));
    while (usedIds.has(candidate)) {
        candidate -= 1;
    }
    usedIds.add(candidate);
    return candidate;
}
function buildQuarantineOverviewRows(quarantineFiles, existingIds) {
    return quarantineFiles.map((file) => {
        const mediaType = file.mediaType === 'pdf' || file.mediaType === 'video'
            ? file.mediaType
            : 'unknown';
        const quarantineTimestamp = file.quarantinedAt || file.createdAt || file.modifiedAt || '';
        const reason = file.reason ||
            'Die Datei wurde vor dem Import in die Quarantäne verschoben.';
        return {
            id: syntheticQuarantineId(file.id, existingIds),
            filename: file.filename,
            mediaType,
            anonymizationStatus: 'failed',
            annotationStatus: '',
            createdAt: quarantineTimestamp,
            metadataImported: false,
            fileSize: file.size,
            uploadJob: {
                id: file.id,
                status: 'quarantined',
                ingestMode: 'watcher',
                sourceSystem: file.directoryLabel,
                sourceFilePersisted: true,
                cleanupStatus: 'skipped',
                errorDetail: reason,
                createdAt: quarantineTimestamp,
                updatedAt: file.modifiedAt || quarantineTimestamp
            },
            quarantined: true,
            quarantineId: file.id,
            quarantineDirectoryKey: file.directoryKey,
            quarantineDirectoryLabel: file.directoryLabel,
            errorDetail: reason
        };
    });
}
const DUPLICATE_KEY_ERROR_PATTERN = /\bduplicate key\b|\bunique constraint\b/i;
function hasDuplicateKeyUploadError(file) {
    const status = String(file.uploadJob?.status || '').toLowerCase();
    if (status !== 'error' && status !== 'lost') {
        return false;
    }
    const errorDetail = file.uploadJob?.errorDetail || file.errorDetail || '';
    return DUPLICATE_KEY_ERROR_PATTERN.test(errorDetail);
}
function preserveValidatedDuplicateVideoRows(files) {
    return files.map((file) => {
        if (file.mediaType !== 'video' || !hasDuplicateKeyUploadError(file)) {
            return file;
        }
        return {
            ...file,
            anonymizationStatus: 'validated',
            annotationStatus: 'validated'
        };
    });
}
const STATUS_POLL_INTERVAL_MS = 15000;
const STATUS_POLL_BACKOFF_MS = 30000;
const STATUS_POLL_JITTER_MS = 5000;
const STATUS_POLL_STORAGE_PREFIX = 'lx-annotate:anonymization-status:next-check';
const FINAL_ANONYMIZATION_STATUSES = new Set([
    'done_processing_anonymization',
    'validated',
    'failed'
]);
const ACTIVE_UPLOAD_JOB_STATUSES = new Set(['pending', 'processing']);
const ACTIVE_ANONYMIZATION_STATUSES = new Set([
    'processing_anonymization',
    'extracting_frames',
    'predicting_segments'
]);
function isUploadJobActive(file) {
    return ACTIVE_UPLOAD_JOB_STATUSES.has(String(file.uploadJob?.status || '').toLowerCase());
}
function hasMissingVideoMetadata(file) {
    return file.mediaType === 'video' && (file.sensitiveMetaId == null || file.metadataImported === false);
}
function statusPollIntervalMs(fileId) {
    return STATUS_POLL_INTERVAL_MS + (Math.abs(fileId) % 5) * 500;
}
function statusPollStorageKey(fileId, kind) {
    return `${STATUS_POLL_STORAGE_PREFIX}:${kind}:${fileId}`;
}
function getStatusPollStorage() {
    if (typeof window === 'undefined')
        return null;
    try {
        return window.localStorage;
    }
    catch {
        return null;
    }
}
function claimStatusPollSlot(fileId, kind, delayMs) {
    const storage = getStatusPollStorage();
    if (!storage)
        return true;
    try {
        const key = statusPollStorageKey(fileId, kind);
        const now = Date.now();
        const nextCheckAt = Number(storage.getItem(key) || '0');
        if (Number.isFinite(nextCheckAt) && nextCheckAt > now) {
            return false;
        }
        storage.setItem(key, String(now + delayMs));
        return true;
    }
    catch {
        return true;
    }
}
function deferStatusPollSlot(fileId, kind, delayMs) {
    const storage = getStatusPollStorage();
    if (!storage)
        return;
    try {
        storage.setItem(statusPollStorageKey(fileId, kind), String(Date.now() + delayMs));
    }
    catch {
        // Ignore storage failures; polling still has the per-tab interval guard.
    }
}
/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export const availableFiles = ref([]);
export const useAnonymizationStore = defineStore('anonymization', {
    state: () => ({
        anonymizationStatus: 'idle',
        loading: false,
        error: null,
        current: null,
        overview: [],
        pollingHandles: {},
        isPolling: false,
        hasAvailableFiles: false,
        availableFiles: availableFiles.value,
        needsValidationIds: [],
        reimportQueuedIds: [],
        pending: [false] // TODO: Implement reactive getter here
    }),
    getters: {
        getCurrentItem: (state) => state.current,
        isAnyFileProcessing: (state) => state.overview.some((f) => f.anonymizationStatus === 'processing_anonymization' ||
            f.anonymizationStatus === 'extracting_frames' ||
            f.anonymizationStatus === 'predicting_segments'),
        processingFiles: (state) => state.overview.filter((f) => f.anonymizationStatus === 'processing_anonymization' ||
            f.anonymizationStatus === 'extracting_frames' ||
            f.anonymizationStatus === 'predicting_segments'),
        isVideoReimportQueued: (state) => (fileId) => state.reimportQueuedIds.includes(fileId),
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
                    await this.setCurrentForValidation(item.id, item.mediaType);
                    return this.current;
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
            return axiosInstance.patch(r(endpoints.media.pdfSensitiveMetadata(id)), updateData);
        },
        async patchVideo(payload) {
            if (!payload.id) {
                throw new Error('patchVideo: Video ID fehlt im Payload.');
            }
            console.log('Patching video sensitive metadata with payload:', payload);
            // Remove id from payload before sending (it's in URL)
            const { id, ...updateData } = payload;
            // Use Modern Media Framework endpoint
            return axiosInstance.patch(r(endpoints.media.videoSensitiveMetadata(id)), updateData);
        },
        fetchPendingAnonymizations() {
            return this.pending;
        },
        /**
         * Fetch overview of all uploaded files with their statuses
         */
        async fetchOverview() {
            this.loading = true;
            this.error = null;
            try {
                console.log('Fetching file overview...');
                const { data } = await axiosInstance.get(r(endpoints.anonymization.itemsOverview));
                console.log('Received overview data:', data);
                let quarantineRows = [];
                try {
                    const quarantineResponse = await axiosInstance.get(r(endpoints.runtime.quarantine), silentRequestConfig());
                    quarantineRows = buildQuarantineOverviewRows(quarantineResponse.data.files || [], new Set(data.map((file) => file.id)));
                }
                catch (quarantineError) {
                    console.warn('Could not load quarantine overview:', quarantineError?.message || quarantineError);
                }
                const overviewData = preserveValidatedDuplicateVideoRows([...data, ...quarantineRows]);
                // Update overview and available files
                this.overview = overviewData;
                // Clear and update availableFiles to prevent duplicates
                this.availableFiles.length = 0; // Clear the array
                this.availableFiles.push(...overviewData); // Add all files from the fresh data
                availableFiles.value = [...overviewData];
                const needsValidation = overviewData
                    .filter((f) => f.anonymizationStatus === 'done_processing_anonymization' && f.annotationStatus !== 'validated')
                    .map((f) => f.id);
                this.needsValidationIds = needsValidation;
                const stopStatuses = new Set(['done_processing_anonymization', 'validated', 'failed', 'not_started']);
                this.reimportQueuedIds = this.reimportQueuedIds.filter((id) => {
                    const queuedFile = overviewData.find((f) => f.id === id);
                    return !!queuedFile && !stopStatuses.has(queuedFile.anonymizationStatus);
                });
                // NEW: Polling sofort stoppen für
                // 1) Dateien, die nicht mehr existieren
                const currentPollingIds = Object.keys(this.pollingHandles).map((k) => Number(k));
                const existingIds = new Set(overviewData.map((f) => f.id));
                for (const pid of currentPollingIds) {
                    if (!existingIds.has(pid)) {
                        this.stopPolling(pid);
                    }
                }
                // 2) Dateien mit finalem Status oder die nicht gepollt werden sollen
                for (const f of overviewData) {
                    if (stopStatuses.has(f.anonymizationStatus) && this.pollingHandles[f.id]) {
                        this.stopPolling(f.id);
                    }
                }
                this.hasAvailableFiles = overviewData.length > 0;
                return overviewData;
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
                await axiosInstance.post(r(endpoints.anonymization.start(id)));
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
            // 1. Find the file to determine its type
            const file = this.overview.find((f) => f.id === id);
            if (!file) {
                console.warn(`Cannot start polling: File ${id} not found in overview`);
                return;
            }
            console.log(`Starting status polling for file ${id} (${file.mediaType})`);
            this.isPolling = true;
            const kindParam = file.mediaType === 'pdf' ? 'report' : 'video';
            let nextDelayMs = statusPollIntervalMs(id);
            const jitter = () => Math.floor(Math.random() * STATUS_POLL_JITTER_MS);
            const poll = async () => {
                if (!this.pollingHandles[id])
                    return;
                if (!claimStatusPollSlot(id, kindParam, nextDelayMs)) {
                    this.pollingHandles[id] = setTimeout(poll, nextDelayMs + jitter());
                    return;
                }
                try {
                    const { data } = await axiosInstance.get(r(endpoints.anonymization.status(id)), { params: { kind: kindParam } });
                    // Refresh file reference in case overview changed
                    const currentFile = this.overview.find((f) => f.id === id);
                    if (currentFile && data.anonymizationStatus) {
                        const statusFromBackend = data.anonymizationStatus;
                        console.log(`Status update for file ${id}: ${statusFromBackend}`);
                        currentFile.anonymizationStatus = statusFromBackend;
                        if (FINAL_ANONYMIZATION_STATUSES.has(statusFromBackend)) {
                            console.log(`Stopping polling for file ${id} - final status: ${statusFromBackend}`);
                            this.stopPolling(id);
                            return;
                        }
                    }
                    nextDelayMs = statusPollIntervalMs(id);
                }
                catch (err) {
                    if (axios.isAxiosError(err) && err.response?.status === 429) {
                        nextDelayMs = STATUS_POLL_BACKOFF_MS;
                        console.debug(`Status polling rate limited for file ${id}; backing off`);
                    }
                    else {
                        nextDelayMs = statusPollIntervalMs(id);
                        console.error(`Error polling status for file ${id}:`, err);
                    }
                }
                if (!this.pollingHandles[id])
                    return;
                deferStatusPollSlot(id, kindParam, nextDelayMs);
                this.pollingHandles[id] = setTimeout(poll, nextDelayMs + jitter());
            };
            this.pollingHandles[id] = setTimeout(poll, nextDelayMs + jitter());
        },
        /**
         * Stop polling for a specific file
         */
        stopPolling(id) {
            const timer = this.pollingHandles[id];
            if (timer) {
                clearTimeout(timer);
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
        async setCurrentForValidation(id, mediaType) {
            try {
                console.log(`Setting current item for validation: ${id}`);
                // Find the item in overview to know if wrong parameters were passed.
                const item = this.overview.find((f) => f.id === id);
                if (!item) {
                    throw new Error(`Item with ID ${id} not found in overview`);
                }
                console.log('Found item for validation:', item);
                if (mediaType === 'video') {
                    console.log(`Loading video data for ID: ${item.id}`);
                    const { data: sensitiveMeta } = await axiosInstance.get(r(endpoints.media.videoSensitiveMetadata(item.id)));
                    console.log('Received video detail:', sensitiveMeta);
                    this.current = sensitiveMeta;
                    return this.current;
                }
                else if (mediaType === 'pdf') {
                    console.log(`Setting current PDF item for validation: ${id}`);
                    const metaUrl = r(endpoints.media.pdfSensitiveMetadata(item.id));
                    console.log(`Fetching sensitive meta from: ${metaUrl}`);
                    const { data: sensitiveMeta } = await axiosInstance.get(metaUrl);
                    console.log('Received sensitive meta response data:', sensitiveMeta);
                    if (typeof sensitiveMeta?.id !== 'number') {
                        console.error('Received invalid sensitive meta data structure:', sensitiveMeta);
                        throw new Error('Ungültige Metadaten vom Backend empfangen.');
                    }
                    this.current = sensitiveMeta;
                    return sensitiveMeta;
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
            if (this.reimportQueuedIds.includes(fileId) || isUploadJobActive(file)) {
                this.startPolling(fileId);
                return true;
            }
            if (ACTIVE_ANONYMIZATION_STATUSES.has(file.anonymizationStatus) && !hasMissingVideoMetadata(file)) {
                this.startPolling(fileId);
                return true;
            }
            try {
                console.log(`Re-importing video ${fileId}...`);
                // Optimistic UI update - set to processing to show user feedback
                file.anonymizationStatus = 'processing_anonymization';
                file.metadataImported = false;
                if (!this.reimportQueuedIds.includes(fileId)) {
                    this.reimportQueuedIds.push(fileId);
                }
                // Trigger re-import via backend
                const response = await axiosInstance.post(r(endpoints.media.videoReimport(fileId)));
                console.log(`Video re-import response:`, response.data);
                console.log(`Starting polling for re-imported video ${fileId}`);
                this.startPolling(fileId);
                const jobStatus = response.data?.status;
                if (jobStatus === 'completed') {
                    this.reimportQueuedIds = this.reimportQueuedIds.filter((id) => id !== fileId);
                }
                else if (jobStatus === 'queued' || jobStatus === 'already_queued') {
                    console.log(`Video ${fileId} re-import job status: ${jobStatus}`);
                }
                return true;
            }
            catch (err) {
                console.error(`Error re-importing video ${fileId}:`, err);
                // Revert optimistic update
                file.anonymizationStatus = 'failed';
                file.metadataImported = false;
                this.reimportQueuedIds = this.reimportQueuedIds.filter((id) => id !== fileId);
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
                const response = await axiosInstance.post(r(endpoints.media.pdfReimport(fileId)));
                console.log(`PDF re-import response:`, response.data);
                console.log(`Starting polling for re-imported PDF ${fileId}`);
                this.startPolling(fileId);
                // Check if re-import was successful
                if (response.data?.sensitiveMetaCreated ?? response.data?.sensitive_meta_created) {
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
