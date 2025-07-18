import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import axiosInstance, { r } from '@/api/axiosInstance';
// Composables
const router = useRouter();
const route = useRoute();
const anonymizationStore = useAnonymizationStore();
// Reactive state
const loading = ref(false);
const error = ref('');
const isRefreshing = ref(false);
const isProcessing = ref(false);
const currentOperation = ref('');
const processingProgress = ref(0);
const processingStatus = ref('');
const previewMode = ref('original');
const videoElement = ref(null);
// Video data from anonymization store
const currentVideo = ref(null);
const videoDetailData = ref(null);
const videoMetadata = ref({
    sensitiveFrameCount: null,
    totalFrames: null,
    sensitiveRatio: null,
    duration: null,
    resolution: null
});
// Patient data for correction
const editedPatient = ref({
    patientFirstName: '',
    patientLastName: '',
    patientGender: '',
    patientDob: '',
    casenumber: '',
    examiner: '',
    centerName: '',
    endoscopeType: '',
    endoscopeSn: ''
});
const examinationDate = ref('');
const usesPseudonyms = ref(false);
const pseudonymMapping = ref({
    firstNamePseudonym: '',
    lastNamePseudonym: '',
    originalFirstName: '',
    originalLastName: ''
});
// Configuration for masking
const maskConfig = ref({
    type: 'device_default',
    deviceName: 'olympus_cv_1500',
    processingMethod: 'streaming',
    endoscopeX: 550,
    endoscopeY: 0,
    endoscopeWidth: 1350,
    endoscopeHeight: 1080
});
// Configuration for frame removal
const frameConfig = ref({
    selectionMethod: 'automatic',
    detectionEngine: 'minicpm',
    processingMethod: 'streaming',
    manualFrames: ''
});
// Processing history
const processingHistory = ref([]);
// Computed properties
const canApplyMask = computed(() => {
    return currentVideo.value && !isProcessing.value &&
        (maskConfig.value.type !== 'custom' ||
            (maskConfig.value.endoscopeX >= 0 && maskConfig.value.endoscopeY >= 0 &&
                maskConfig.value.endoscopeWidth > 0 && maskConfig.value.endoscopeHeight > 0));
});
const canRemoveFrames = computed(() => {
    return currentVideo.value && !isProcessing.value &&
        (frameConfig.value.selectionMethod !== 'manual' ||
            frameConfig.value.manualFrames.trim().length > 0);
});
const hasProcessedVersion = computed(() => {
    return processingHistory.value.some(entry => entry.status === 'success' && entry.outputPath);
});
const props = defineProps();
// Methods
const goBack = () => {
    router.push('/anonymisierung/uebersicht');
};
const refreshCurrentVideo = async () => {
    if (!currentVideo.value) {
        currentVideo.value = { id: props.fileId };
    }
    else {
        currentVideo.value.id = props.fileId;
    }
    isRefreshing.value = true;
    try {
        await loadVideoDetails(currentVideo.value.id);
    }
    finally {
        isRefreshing.value = false;
    }
};
const loadVideoDetails = async (videoId) => {
    loading.value = true;
    error.value = '';
    try {
        // Load video metadata and processing history
        const [videoResponse, metadataResponse, historyResponse] = await Promise.all([
            axiosInstance.get(r(`video-correction/${videoId}/`)),
            axiosInstance.get(r(`video-metadata/${videoId}/`)),
            axiosInstance.get(r(`video-processing-history/${videoId}/`))
        ]);
        currentVideo.value = videoResponse.data;
        videoMetadata.value = metadataResponse.data;
        processingHistory.value = historyResponse.data;
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Laden der Video-Details';
        console.error('Error loading video details:', err);
    }
    finally {
        loading.value = false;
    }
};
const analyzeVideo = async () => {
    if (!currentVideo.value)
        return;
    isProcessing.value = true;
    currentOperation.value = 'analysis';
    processingProgress.value = 0;
    processingStatus.value = 'Video wird analysiert...';
    try {
        const response = await axiosInstance.post(r(`video-analyze/${currentVideo.value.id}/`), {
            use_minicpm: frameConfig.value.detectionEngine !== 'traditional',
            detailed_analysis: true
        });
        // Update metadata with analysis results
        videoMetadata.value = { ...videoMetadata.value, ...response.data };
        processingProgress.value = 100;
        processingStatus.value = 'Analyse abgeschlossen';
        // Add to history
        processingHistory.value.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            operation: 'analysis',
            status: 'success',
            details: `${response.data.sensitiveFrameCount || 0} sensible Frames gefunden`
        });
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler bei der Video-Analyse';
        console.error('Error analyzing video:', err);
    }
    finally {
        isProcessing.value = false;
        currentOperation.value = '';
    }
};
const applyMasking = async () => {
    if (!currentVideo.value)
        return;
    isProcessing.value = true;
    currentOperation.value = 'masking';
    processingProgress.value = 0;
    processingStatus.value = 'Maskierung wird vorbereitet...';
    try {
        const payload = {
            mask_type: maskConfig.value.type,
            device_name: maskConfig.value.deviceName,
            use_streaming: maskConfig.value.processingMethod === 'streaming',
            custom_mask: maskConfig.value.type === 'custom' ? {
                endoscope_x: maskConfig.value.endoscopeX,
                endoscope_y: maskConfig.value.endoscopeY,
                endoscope_width: maskConfig.value.endoscopeWidth,
                endoscope_height: maskConfig.value.endoscopeHeight
            } : undefined
        };
        // Start masking operation
        const response = await axiosInstance.post(r(`video-apply-mask/${currentVideo.value.id}/`), payload);
        // Start polling for progress
        const taskId = response.data.task_id;
        await pollTaskProgress(taskId, 'masking');
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler bei der Maskierung';
        console.error('Error applying mask:', err);
        isProcessing.value = false;
        currentOperation.value = '';
    }
};
const removeFrames = async () => {
    if (!currentVideo.value)
        return;
    isProcessing.value = true;
    currentOperation.value = 'frame_removal';
    processingProgress.value = 0;
    processingStatus.value = 'Frame-Entfernung wird vorbereitet...';
    try {
        const payload = {
            selection_method: frameConfig.value.selectionMethod,
            detection_engine: frameConfig.value.detectionEngine,
            use_streaming: frameConfig.value.processingMethod === 'streaming',
            manual_frames: frameConfig.value.selectionMethod === 'manual'
                ? parseManualFrames(frameConfig.value.manualFrames)
                : undefined
        };
        // Start frame removal operation
        const response = await axiosInstance.post(r(`video-remove-frames/${currentVideo.value.id}/`), payload);
        // Start polling for progress
        const taskId = response.data.task_id;
        await pollTaskProgress(taskId, 'frame_removal');
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler bei der Frame-Entfernung';
        console.error('Error removing frames:', err);
        isProcessing.value = false;
        currentOperation.value = '';
    }
};
const parseManualFrames = (frameString) => {
    const frames = [];
    const parts = frameString.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            // Range: "30-35"
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    frames.push(i);
                }
            }
        }
        else {
            // Single frame: "10"
            const frame = parseInt(trimmed);
            if (!isNaN(frame)) {
                frames.push(frame);
            }
        }
    }
    return [...new Set(frames)].sort((a, b) => a - b);
};
const pollTaskProgress = async (taskId, operation) => {
    const pollInterval = 2000; // 2 seconds
    const maxPolls = 300; // 10 minutes max
    let polls = 0;
    const poll = async () => {
        if (polls >= maxPolls) {
            throw new Error('Zeitüberschreitung bei der Verarbeitung');
        }
        try {
            const response = await axiosInstance.get(r(`task-status/${taskId}/`));
            const { status, progress, message, result } = response.data;
            processingProgress.value = progress || 0;
            processingStatus.value = message || 'Verarbeitung läuft...';
            if (status === 'SUCCESS') {
                processingProgress.value = 100;
                processingStatus.value = 'Verarbeitung abgeschlossen';
                // Add to history
                processingHistory.value.unshift({
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    operation,
                    status: 'success',
                    details: result?.summary || 'Verarbeitung erfolgreich',
                    outputPath: result?.output_path
                });
                // Refresh video details
                await refreshCurrentVideo();
                isProcessing.value = false;
                currentOperation.value = '';
                return;
            }
            if (status === 'FAILURE') {
                throw new Error(message || 'Verarbeitung fehlgeschlagen');
            }
            // Continue polling
            polls++;
            setTimeout(poll, pollInterval);
        }
        catch (err) {
            console.error('Polling error:', err);
            throw err;
        }
    };
    await poll();
};
const cancelProcessing = async () => {
    // Implementation depends on backend support for task cancellation
    isProcessing.value = false;
    currentOperation.value = '';
    processingProgress.value = 0;
    processingStatus.value = '';
};
const reprocessVideo = async () => {
    if (!currentVideo.value)
        return;
    try {
        await axiosInstance.post(r(`video-reprocess/${currentVideo.value.id}/`));
        await refreshCurrentVideo();
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler bei der Neuverarbeitung';
        console.error('Error reprocessing video:', err);
    }
};
const getVideoUrl = () => {
    if (!currentVideo.value)
        return '';
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    if (previewMode.value === 'processed' && hasProcessedVersion.value) {
        // Get the latest processed version
        const latestProcessed = processingHistory.value
            .filter(entry => entry.status === 'success' && entry.outputPath)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (latestProcessed) {
            return `${base}/api/media/processed-videos/${currentVideo.value.id}/${latestProcessed.id}/`;
        }
    }
    // Default to original
    return `${base}/api/media/videos/${currentVideo.value.id}/`;
};
const seekVideo = (seconds) => {
    if (videoElement.value) {
        videoElement.value.currentTime += seconds;
    }
};
const downloadResult = async (outputPath) => {
    if (!currentVideo.value)
        return;
    try {
        const response = await axiosInstance.get(r(`video-download-processed/${currentVideo.value.id}/`), {
            params: { path: outputPath },
            responseType: 'blob'
        });
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${currentVideo.value.filename}_processed.mp4`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Download';
        console.error('Error downloading result:', err);
    }
};
// Event handlers
const onVideoError = (event) => {
    console.error('Video loading error:', event);
    const video = event.target;
    console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc
    });
};
const onVideoLoadStart = () => {
    console.log('Video loading started for:', getVideoUrl());
};
const onVideoCanPlay = () => {
    console.log('Video can play, loaded successfully');
};
// Utility functions
const formatFileSize = (bytes) => {
    if (!bytes)
        return 'Unbekannt';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};
const formatDate = (dateString) => {
    if (!dateString)
        return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};
const formatPercentage = (ratio) => {
    if (ratio === null || ratio === undefined)
        return 'Unbekannt';
    return `${(ratio * 100).toFixed(1)}%`;
};
const getStatusBadgeClass = (status) => {
    const classes = {
        'not_started': 'bg-secondary',
        'processing': 'bg-warning',
        'done': 'bg-success',
        'failed': 'bg-danger',
        'success': 'bg-success'
    };
    return classes[status] || 'bg-secondary';
};
const getStatusText = (status) => {
    const texts = {
        'not_started': 'Nicht gestartet',
        'processing': 'In Bearbeitung',
        'done': 'Fertig',
        'failed': 'Fehlgeschlagen',
        'success': 'Erfolgreich'
    };
    return texts[status] || status;
};
const getSensitivityBadgeClass = (ratio) => {
    if (ratio === null || ratio === undefined)
        return 'badge bg-secondary';
    if (ratio > 0.1)
        return 'badge bg-danger';
    if (ratio > 0.05)
        return 'badge bg-warning';
    return 'badge bg-success';
};
const getOperationText = (operation) => {
    const texts = {
        'analysis': 'Video-Analyse',
        'masking': 'Maskierung',
        'frame_removal': 'Frame-Entfernung',
        'reprocessing': 'Neuverarbeitung'
    };
    return texts[operation] || operation;
};
const getOperationBadgeClass = (operation) => {
    const classes = {
        'analysis': 'bg-info',
        'masking': 'bg-warning',
        'frame_removal': 'bg-danger',
        'reprocessing': 'bg-primary'
    };
    return classes[operation] || 'bg-secondary';
};
// Lifecycle hooks
onMounted(async () => {
    const videoId = route.params.id;
    if (videoId && !isNaN(parseInt(videoId))) {
        await loadVideoDetails(parseInt(videoId));
    }
    else {
        error.value = 'Ungültige Video-ID';
    }
});
// Watchers
watch(() => route.params.id, async (newId) => {
    if (newId && !isNaN(parseInt(newId))) {
        await loadVideoDetails(parseInt(newId));
    }
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['table', 'video-container',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0 d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goBack) },
        ...{ class: ("btn btn-outline-secondary btn-sm") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-arrow-left me-1") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshCurrentVideo) },
        ...{ class: ("btn btn-outline-primary btn-sm") },
        disabled: ((__VLS_ctx.isRefreshing)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.isRefreshing })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2") },
        });
    }
    else if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
    }
    else if (!__VLS_ctx.currentVideo) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-8") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        (__VLS_ctx.currentVideo.filename);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.getStatusBadgeClass(__VLS_ctx.currentVideo.anonymizationStatus))) },
            ...{ class: ("badge ms-1") },
        });
        (__VLS_ctx.getStatusText(__VLS_ctx.currentVideo.anonymizationStatus));
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatFileSize(__VLS_ctx.currentVideo.fileSize ?? null));
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatDate(__VLS_ctx.currentVideo.createdAt));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-sm-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.videoMetadata.sensitiveFrameCount || 'Unbekannt');
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.videoMetadata.totalFrames || 'Unbekannt');
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.getSensitivityBadgeClass(__VLS_ctx.videoMetadata.sensitiveRatio))) },
        });
        (__VLS_ctx.formatPercentage(__VLS_ctx.videoMetadata.sensitiveRatio));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4 text-end") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex flex-column gap-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.analyzeVideo) },
            ...{ class: ("btn btn-outline-info btn-sm") },
            disabled: ((__VLS_ctx.isProcessing)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-search me-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.reprocessVideo) },
            ...{ class: ("btn btn-outline-warning btn-sm") },
            disabled: ((__VLS_ctx.isProcessing)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-redo me-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-mask me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.maskConfig.type)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("device_default"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("roi_based"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("custom"),
        });
        if (__VLS_ctx.maskConfig.type === 'device_default') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: ((__VLS_ctx.maskConfig.deviceName)),
                ...{ class: ("form-select") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("olympus_cv_1500"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("olympus_cv_190"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("pentax_epk_i7010"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("fujifilm_vp_4450hd"),
            });
        }
        if (__VLS_ctx.maskConfig.type === 'custom') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: ("number"),
                ...{ class: ("form-control") },
                min: ("0"),
            });
            (__VLS_ctx.maskConfig.endoscopeX);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: ("number"),
                ...{ class: ("form-control") },
                min: ("0"),
            });
            (__VLS_ctx.maskConfig.endoscopeY);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mt-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: ("number"),
                ...{ class: ("form-control") },
                min: ("1"),
            });
            (__VLS_ctx.maskConfig.endoscopeWidth);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: ("number"),
                ...{ class: ("form-control") },
                min: ("1"),
            });
            (__VLS_ctx.maskConfig.endoscopeHeight);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: ("form-check-input") },
            type: ("radio"),
            value: ("streaming"),
            id: ("maskStreaming"),
        });
        (__VLS_ctx.maskConfig.processingMethod);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("maskStreaming"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: ("form-check-input") },
            type: ("radio"),
            value: ("direct"),
            id: ("maskDirect"),
        });
        (__VLS_ctx.maskConfig.processingMethod);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("maskDirect"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.applyMasking) },
            ...{ class: ("btn btn-warning w-100") },
            disabled: ((__VLS_ctx.isProcessing || !__VLS_ctx.canApplyMask)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-mask me-2") },
        });
        if (__VLS_ctx.isProcessing && __VLS_ctx.currentOperation === 'masking') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card h-100") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cut me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: ("form-check-input") },
            type: ("radio"),
            value: ("automatic"),
            id: ("frameAutomatic"),
        });
        (__VLS_ctx.frameConfig.selectionMethod);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("frameAutomatic"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: ("form-check-input") },
            type: ("radio"),
            value: ("manual"),
            id: ("frameManual"),
        });
        (__VLS_ctx.frameConfig.selectionMethod);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("frameManual"),
        });
        if (__VLS_ctx.frameConfig.selectionMethod === 'manual') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                value: ((__VLS_ctx.frameConfig.manualFrames)),
                ...{ class: ("form-control") },
                rows: ("3"),
                placeholder: ("z.B. 10,25,30-35,100"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("form-text text-muted") },
            });
        }
        if (__VLS_ctx.frameConfig.selectionMethod === 'automatic') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: ((__VLS_ctx.frameConfig.detectionEngine)),
                ...{ class: ("form-select") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("minicpm"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("traditional"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: ("hybrid"),
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: ("form-check-input") },
            type: ("radio"),
            value: ("streaming"),
            id: ("frameStreaming"),
        });
        (__VLS_ctx.frameConfig.processingMethod);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("frameStreaming"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("form-check") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: ("form-check-input") },
            type: ("radio"),
            value: ("traditional"),
            id: ("frameTraditional"),
        });
        (__VLS_ctx.frameConfig.processingMethod);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-check-label") },
            for: ("frameTraditional"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.removeFrames) },
            ...{ class: ("btn btn-danger w-100") },
            disabled: ((__VLS_ctx.isProcessing || !__VLS_ctx.canRemoveFrames)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cut me-2") },
        });
        if (__VLS_ctx.isProcessing && __VLS_ctx.currentOperation === 'frame_removal') {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-spinner fa-spin me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        if (__VLS_ctx.isProcessing) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mb-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-12") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card border-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-body") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("spinner-border spinner-border-sm text-warning me-3") },
                role: ("status"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("visually-hidden") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("flex-grow-1") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("mb-1") },
            });
            (__VLS_ctx.getOperationText(__VLS_ctx.currentOperation));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress-bar progress-bar-striped progress-bar-animated") },
                ...{ style: (({ width: __VLS_ctx.processingProgress + '%' })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted mt-1") },
            });
            (__VLS_ctx.processingStatus);
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelProcessing) },
                ...{ class: ("btn btn-outline-danger btn-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-times me-1") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex gap-2 mt-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.loading))))
                        return;
                    if (!(!((__VLS_ctx.error))))
                        return;
                    if (!(!((!__VLS_ctx.currentVideo))))
                        return;
                    __VLS_ctx.previewMode = 'original';
                } },
            ...{ class: ("btn btn-sm") },
            ...{ class: ((__VLS_ctx.previewMode === 'original' ? 'btn-primary' : 'btn-outline-primary')) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.loading))))
                        return;
                    if (!(!((__VLS_ctx.error))))
                        return;
                    if (!(!((!__VLS_ctx.currentVideo))))
                        return;
                    __VLS_ctx.previewMode = 'processed';
                } },
            ...{ class: ("btn btn-sm") },
            ...{ class: ((__VLS_ctx.previewMode === 'processed' ? 'btn-primary' : 'btn-outline-primary')) },
            disabled: ((!__VLS_ctx.hasProcessedVersion)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onError: (__VLS_ctx.onVideoError) },
            ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
            ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
            ref: ("videoElement"),
            controls: (true),
            width: ("100%"),
            height: ("600px"),
            src: ((__VLS_ctx.getVideoUrl())),
        });
        // @ts-ignore navigation for `const videoElement = ref()`
        /** @type { typeof __VLS_ctx.videoElement } */ ;
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-3 d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex gap-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.loading))))
                        return;
                    if (!(!((__VLS_ctx.error))))
                        return;
                    if (!(!((!__VLS_ctx.currentVideo))))
                        return;
                    __VLS_ctx.seekVideo(-10);
                } },
            ...{ class: ("btn btn-outline-secondary btn-sm") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-backward me-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(!((__VLS_ctx.loading))))
                        return;
                    if (!(!((__VLS_ctx.error))))
                        return;
                    if (!(!((!__VLS_ctx.currentVideo))))
                        return;
                    __VLS_ctx.seekVideo(10);
                } },
            ...{ class: ("btn btn-outline-secondary btn-sm") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-forward me-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.previewMode === 'original' ? 'Original-Video' : 'Verarbeitetes Video');
        if (__VLS_ctx.processingHistory.length) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row mt-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-12") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                ...{ class: ("mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("card-body") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("table-responsive") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                ...{ class: ("table table-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
            for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.processingHistory))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                    key: ((entry.id)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (__VLS_ctx.formatDate(entry.timestamp));
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge") },
                    ...{ class: ((__VLS_ctx.getOperationBadgeClass(entry.operation))) },
                });
                (__VLS_ctx.getOperationText(entry.operation));
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge") },
                    ...{ class: ((__VLS_ctx.getStatusBadgeClass(entry.status))) },
                });
                (__VLS_ctx.getStatusText(entry.status));
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
                (entry.details);
                __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                if (entry.status === 'success' && entry.outputPath) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(!((__VLS_ctx.loading))))
                                    return;
                                if (!(!((__VLS_ctx.error))))
                                    return;
                                if (!(!((!__VLS_ctx.currentVideo))))
                                    return;
                                if (!((__VLS_ctx.processingHistory.length)))
                                    return;
                                if (!((entry.status === 'success' && entry.outputPath)))
                                    return;
                                __VLS_ctx.downloadResult(entry.outputPath);
                            } },
                        ...{ class: ("btn btn-outline-primary btn-sm") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-download") },
                    });
                }
            }
        }
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'd-flex', 'gap-2', 'btn', 'btn-outline-secondary', 'btn-sm', 'fas', 'fa-arrow-left', 'me-1', 'btn', 'btn-outline-primary', 'btn-sm', 'fas', 'fa-sync-alt', 'fa-spin', 'card-body', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'alert', 'alert-danger', 'alert', 'alert-info', 'fas', 'fa-info-circle', 'me-2', 'row', 'mb-4', 'col-12', 'card', 'bg-light', 'card-body', 'row', 'col-md-8', 'card-title', 'row', 'col-sm-6', 'mb-1', 'badge', 'ms-1', 'mb-1', 'mb-1', 'col-sm-6', 'mb-1', 'mb-1', 'mb-1', 'col-md-4', 'text-end', 'd-flex', 'flex-column', 'gap-2', 'btn', 'btn-outline-info', 'btn-sm', 'fas', 'fa-search', 'me-1', 'btn', 'btn-outline-warning', 'btn-sm', 'fas', 'fa-redo', 'me-1', 'row', 'mb-4', 'col-md-6', 'card', 'h-100', 'card-header', 'mb-0', 'fas', 'fa-mask', 'me-2', 'card-body', 'text-muted', 'mb-3', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-select', 'mb-3', 'row', 'col-6', 'form-label', 'form-control', 'col-6', 'form-label', 'form-control', 'row', 'mt-2', 'col-6', 'form-label', 'form-control', 'col-6', 'form-label', 'form-control', 'mb-3', 'form-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'btn', 'btn-warning', 'w-100', 'fas', 'fa-mask', 'me-2', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'col-md-6', 'card', 'h-100', 'card-header', 'mb-0', 'fas', 'fa-cut', 'me-2', 'card-body', 'text-muted', 'mb-3', 'mb-3', 'form-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'mb-3', 'form-label', 'form-control', 'form-text', 'text-muted', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'btn', 'btn-danger', 'w-100', 'fas', 'fa-cut', 'me-2', 'fas', 'fa-spinner', 'fa-spin', 'me-1', 'row', 'mb-4', 'col-12', 'card', 'border-warning', 'card-body', 'd-flex', 'align-items-center', 'spinner-border', 'spinner-border-sm', 'text-warning', 'me-3', 'visually-hidden', 'flex-grow-1', 'mb-1', 'progress', 'progress-bar', 'progress-bar-striped', 'progress-bar-animated', 'text-muted', 'mt-1', 'btn', 'btn-outline-danger', 'btn-sm', 'fas', 'fa-times', 'me-1', 'row', 'col-12', 'card', 'card-header', 'mb-0', 'd-flex', 'gap-2', 'mt-2', 'btn', 'btn-sm', 'btn', 'btn-sm', 'card-body', 'video-container', 'mt-3', 'd-flex', 'justify-content-between', 'align-items-center', 'd-flex', 'gap-2', 'btn', 'btn-outline-secondary', 'btn-sm', 'fas', 'fa-backward', 'me-1', 'btn', 'btn-outline-secondary', 'btn-sm', 'fas', 'fa-forward', 'me-1', 'text-muted', 'row', 'mt-4', 'col-12', 'card', 'card-header', 'mb-0', 'card-body', 'table-responsive', 'table', 'table-sm', 'badge', 'badge', 'text-muted', 'btn', 'btn-outline-primary', 'btn-sm', 'fas', 'fa-download',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoElement': __VLS_nativeElements['video'],
    };
    var $refs;
    var $el;
    return {
        attrs: {},
        slots: __VLS_slots,
        refs: $refs,
        rootEl: $el,
    };
}
;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            isRefreshing: isRefreshing,
            isProcessing: isProcessing,
            currentOperation: currentOperation,
            processingProgress: processingProgress,
            processingStatus: processingStatus,
            previewMode: previewMode,
            videoElement: videoElement,
            currentVideo: currentVideo,
            videoMetadata: videoMetadata,
            maskConfig: maskConfig,
            frameConfig: frameConfig,
            processingHistory: processingHistory,
            canApplyMask: canApplyMask,
            canRemoveFrames: canRemoveFrames,
            hasProcessedVersion: hasProcessedVersion,
            goBack: goBack,
            refreshCurrentVideo: refreshCurrentVideo,
            analyzeVideo: analyzeVideo,
            applyMasking: applyMasking,
            removeFrames: removeFrames,
            cancelProcessing: cancelProcessing,
            reprocessVideo: reprocessVideo,
            getVideoUrl: getVideoUrl,
            seekVideo: seekVideo,
            downloadResult: downloadResult,
            onVideoError: onVideoError,
            onVideoLoadStart: onVideoLoadStart,
            onVideoCanPlay: onVideoCanPlay,
            formatFileSize: formatFileSize,
            formatDate: formatDate,
            formatPercentage: formatPercentage,
            getStatusBadgeClass: getStatusBadgeClass,
            getStatusText: getStatusText,
            getSensitivityBadgeClass: getSensitivityBadgeClass,
            getOperationText: getOperationText,
            getOperationBadgeClass: getOperationBadgeClass,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
