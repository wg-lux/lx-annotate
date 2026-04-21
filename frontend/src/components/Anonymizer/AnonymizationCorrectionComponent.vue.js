import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
import { buildPdfStreamUrl, buildVideoStreamUrl } from '@/utils/mediaUrls';
// Composables
const router = useRouter();
const route = useRoute();
const anonymizationStore = useAnonymizationStore();
const mediaStore = useMediaTypeStore();
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
const pdfPageCanvas = ref(null);
const pdfOverlayCanvas = ref(null);
const pdfRenderError = ref('');
const isRenderingPdf = ref(false);
const pdfPageCount = ref(0);
const activePdfPage = ref(1);
const pdfScale = ref(1.25);
const pdfPageBoxes = ref({});
const pdfSourceBytes = ref(null);
const redactedPdfBytes = ref(null);
const redactedPdfUrl = ref('');
const isDrawingPdfBox = ref(false);
const drawStart = ref(null);
const drawCurrent = ref(null);
let pdfJsLib = null;
let pdfDocument = null;
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
const resolvedMediaType = computed(() => {
    const routeMediaType = String(route.query.mediaType || '').toLowerCase();
    const propsMediaType = String(props.mediaType || '').toLowerCase();
    const explicit = propsMediaType || routeMediaType;
    if (explicit === 'pdf')
        return 'pdf';
    if (explicit === 'video')
        return 'video';
    const fromOverview = anonymizationStore.overview.find((item) => item.id === props.fileId);
    if (fromOverview?.mediaType === 'pdf')
        return 'pdf';
    if (fromOverview?.mediaType === 'video')
        return 'video';
    const currentFilename = String(currentVideo.value?.filename || '').toLowerCase();
    if (currentFilename.endsWith('.pdf'))
        return 'pdf';
    return 'video';
});
const isPdfCorrection = computed(() => resolvedMediaType.value === 'pdf');
const totalPdfBoxCount = computed(() => {
    return Object.values(pdfPageBoxes.value).reduce((acc, boxes) => acc + boxes.length, 0);
});
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
        await loadCurrentItemDetails(currentVideo.value.id);
    }
    finally {
        isRefreshing.value = false;
    }
};
const loadCurrentItemDetails = async (fileId) => {
    if (isPdfCorrection.value) {
        await loadPdfDetails(fileId);
        return;
    }
    await loadVideoDetails(fileId);
};
const loadPdfDetails = async (pdfId) => {
    loading.value = true;
    error.value = '';
    pdfRenderError.value = '';
    pdfDocument = null;
    pdfPageBoxes.value = {};
    pdfPageCount.value = 0;
    activePdfPage.value = 1;
    redactedPdfBytes.value = null;
    if (redactedPdfUrl.value) {
        URL.revokeObjectURL(redactedPdfUrl.value);
        redactedPdfUrl.value = '';
    }
    try {
        const response = await axiosInstance.get(r(`media/pdfs/${pdfId}/`));
        const details = response.data || {};
        currentVideo.value = {
            id: pdfId,
            mediaType: 'pdf',
            filename: details.filename || `document_${pdfId}.pdf`,
            anonymizationStatus: details.is_validated ? 'validated' : 'done_processing_anonymization',
            fileSize: details.file_size ?? null,
            createdAt: details.uploaded_at || null,
        };
        mediaStore.setCurrentByKey('pdf', pdfId);
        await loadPdfDocument(pdfId);
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Laden der PDF-Details';
        console.error('Error loading pdf details:', err);
    }
    finally {
        loading.value = false;
    }
};
const loadVideoDetails = async (videoId) => {
    loading.value = true;
    error.value = '';
    try {
        // Load video metadata and processing history
        const [videoResponse, metadataResponse, historyResponse] = await Promise.all([
            axiosInstance.get(r(`media/videos/video-correction/${videoId}`)),
            axiosInstance.get(r(`media/videos/${videoId}/metadata/`)),
            axiosInstance.get(r(`media/videos/${videoId}/processing-history/`))
        ]);
        currentVideo.value = videoResponse.data;
        videoMetadata.value = metadataResponse.data;
        processingHistory.value = historyResponse.data;
        // Update MediaStore with current video for consistent type detection
        if (currentVideo.value) {
            mediaStore.setCurrentItem(currentVideo.value);
        }
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Laden der Video-Details';
        console.error('Error loading video details:', err);
    }
    finally {
        loading.value = false;
    }
};
const ensurePdfJs = async () => {
    if (pdfJsLib)
        return;
    const [pdfModule, workerModule] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf.mjs'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfModule.GlobalWorkerOptions.workerSrc = workerModule.default;
    pdfJsLib = pdfModule;
};
const loadPdfDocument = async (pdfId) => {
    isRenderingPdf.value = true;
    pdfRenderError.value = '';
    try {
        await ensurePdfJs();
        const response = await axiosInstance.get(buildPdfStreamUrl(pdfId, 'raw'), {
            responseType: 'arraybuffer',
        });
        const source = new Uint8Array(response.data);
        pdfSourceBytes.value = source;
        const loadingTask = pdfJsLib.getDocument({ data: source });
        pdfDocument = await loadingTask.promise;
        pdfPageCount.value = pdfDocument.numPages;
        activePdfPage.value = 1;
        await renderCurrentPdfPage();
    }
    catch (err) {
        pdfRenderError.value = 'PDF konnte nicht geladen werden.';
        console.error('Error loading PDF document:', err);
    }
    finally {
        isRenderingPdf.value = false;
    }
};
const reloadPdfDocument = async () => {
    if (!currentVideo.value)
        return;
    await loadPdfDocument(currentVideo.value.id);
};
const getCurrentPageBoxCount = () => {
    return (pdfPageBoxes.value[activePdfPage.value] || []).length;
};
const normalizeRect = (start, end) => {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    return { x, y, width, height };
};
const drawPdfOverlay = () => {
    const overlay = pdfOverlayCanvas.value;
    if (!overlay)
        return;
    const ctx = overlay.getContext('2d');
    if (!ctx)
        return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.fillStyle = '#000000';
    const boxes = pdfPageBoxes.value[activePdfPage.value] || [];
    for (const box of boxes) {
        ctx.fillRect(box.x * overlay.width, box.y * overlay.height, box.width * overlay.width, box.height * overlay.height);
    }
    if (isDrawingPdfBox.value && drawStart.value && drawCurrent.value) {
        const preview = normalizeRect(drawStart.value, drawCurrent.value);
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.fillRect(preview.x, preview.y, preview.width, preview.height);
        ctx.strokeRect(preview.x, preview.y, preview.width, preview.height);
        ctx.restore();
    }
};
const renderCurrentPdfPage = async () => {
    if (!pdfDocument || !pdfPageCanvas.value || !pdfOverlayCanvas.value)
        return;
    isRenderingPdf.value = true;
    pdfRenderError.value = '';
    try {
        const page = await pdfDocument.getPage(activePdfPage.value);
        const viewport = page.getViewport({ scale: pdfScale.value });
        const canvas = pdfPageCanvas.value;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('PDF canvas context not available');
        }
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const renderContext = {
            canvasContext: context,
            viewport,
        };
        await page.render(renderContext).promise;
        const overlay = pdfOverlayCanvas.value;
        overlay.width = canvas.width;
        overlay.height = canvas.height;
        overlay.style.width = canvas.style.width;
        overlay.style.height = canvas.style.height;
        drawPdfOverlay();
    }
    catch (err) {
        pdfRenderError.value = 'PDF-Seite konnte nicht gerendert werden.';
        console.error('Error rendering PDF page:', err);
    }
    finally {
        isRenderingPdf.value = false;
    }
};
const getOverlayPoint = (event) => {
    const overlay = pdfOverlayCanvas.value;
    if (!overlay) {
        return null;
    }
    const bounds = overlay.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
        return null;
    }
    const x = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const y = Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height);
    return { x, y, width: bounds.width, height: bounds.height };
};
const onPdfOverlayMouseDown = (event) => {
    if (isRenderingPdf.value)
        return;
    const point = getOverlayPoint(event);
    if (!point)
        return;
    isDrawingPdfBox.value = true;
    drawStart.value = { x: point.x, y: point.y };
    drawCurrent.value = { x: point.x, y: point.y };
    drawPdfOverlay();
};
const onPdfOverlayMouseMove = (event) => {
    if (!isDrawingPdfBox.value)
        return;
    const point = getOverlayPoint(event);
    if (!point)
        return;
    drawCurrent.value = { x: point.x, y: point.y };
    drawPdfOverlay();
};
const finishPdfBoxDrawing = () => {
    const overlay = pdfOverlayCanvas.value;
    if (!overlay || !drawStart.value || !drawCurrent.value) {
        isDrawingPdfBox.value = false;
        drawStart.value = null;
        drawCurrent.value = null;
        return;
    }
    const rect = normalizeRect(drawStart.value, drawCurrent.value);
    if (rect.width >= 4 && rect.height >= 4) {
        const normalized = {
            x: rect.x / overlay.width,
            y: rect.y / overlay.height,
            width: rect.width / overlay.width,
            height: rect.height / overlay.height,
        };
        const existing = pdfPageBoxes.value[activePdfPage.value] || [];
        pdfPageBoxes.value[activePdfPage.value] = [...existing, normalized];
    }
    isDrawingPdfBox.value = false;
    drawStart.value = null;
    drawCurrent.value = null;
    drawPdfOverlay();
};
const onPdfOverlayMouseUp = () => {
    finishPdfBoxDrawing();
};
const onPdfOverlayMouseLeave = () => {
    if (!isDrawingPdfBox.value)
        return;
    finishPdfBoxDrawing();
};
const previousPdfPage = async () => {
    if (activePdfPage.value <= 1)
        return;
    activePdfPage.value -= 1;
    await renderCurrentPdfPage();
};
const nextPdfPage = async () => {
    if (activePdfPage.value >= pdfPageCount.value)
        return;
    activePdfPage.value += 1;
    await renderCurrentPdfPage();
};
const undoLastPdfBox = () => {
    const boxes = pdfPageBoxes.value[activePdfPage.value] || [];
    if (!boxes.length)
        return;
    pdfPageBoxes.value[activePdfPage.value] = boxes.slice(0, -1);
    drawPdfOverlay();
};
const clearCurrentPdfPageBoxes = () => {
    pdfPageBoxes.value[activePdfPage.value] = [];
    drawPdfOverlay();
};
const clearAllPdfBoxes = () => {
    pdfPageBoxes.value = {};
    drawPdfOverlay();
};
const generateRedactedPdf = async () => {
    if (!pdfSourceBytes.value)
        return;
    isProcessing.value = true;
    currentOperation.value = 'pdf_redaction';
    processingProgress.value = 0;
    processingStatus.value = 'Anonymisierte PDF wird erzeugt...';
    try {
        const { PDFDocument, rgb } = await import('pdf-lib');
        const doc = await PDFDocument.load(pdfSourceBytes.value);
        const pages = doc.getPages();
        Object.entries(pdfPageBoxes.value).forEach(([pageNumber, boxes]) => {
            const index = Number(pageNumber) - 1;
            if (!Number.isInteger(index) || index < 0 || index >= pages.length) {
                return;
            }
            const page = pages[index];
            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();
            for (const box of boxes) {
                page.drawRectangle({
                    x: box.x * pageWidth,
                    y: (1 - box.y - box.height) * pageHeight,
                    width: box.width * pageWidth,
                    height: box.height * pageHeight,
                    color: rgb(0, 0, 0),
                    borderWidth: 0,
                });
            }
        });
        const output = await doc.save();
        redactedPdfBytes.value = output;
        if (redactedPdfUrl.value) {
            URL.revokeObjectURL(redactedPdfUrl.value);
        }
        redactedPdfUrl.value = URL.createObjectURL(new Blob([output], { type: 'application/pdf' }));
        processingProgress.value = 100;
        processingStatus.value = 'Anonymisierte PDF erfolgreich erzeugt';
        processingHistory.value.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            operation: 'pdf_redaction',
            status: 'success',
            details: `${totalPdfBoxCount.value} Box(en) angewendet`,
        });
    }
    catch (err) {
        error.value = 'Fehler beim Erzeugen der anonymisierten PDF';
        console.error('Error generating redacted PDF:', err);
    }
    finally {
        isProcessing.value = false;
        currentOperation.value = '';
    }
};
const downloadRedactedPdf = () => {
    if (!redactedPdfBytes.value || !currentVideo.value)
        return;
    const fileName = String(currentVideo.value.filename || `document_${currentVideo.value.id}.pdf`);
    const baseName = fileName.toLowerCase().endsWith('.pdf')
        ? fileName.slice(0, -4)
        : fileName;
    const blob = new Blob([redactedPdfBytes.value], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}_anonymized.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
const uploadRedactedPdf = async () => {
    if (!redactedPdfBytes.value || !currentVideo.value)
        return;
    isProcessing.value = true;
    currentOperation.value = 'pdf_upload';
    processingProgress.value = 0;
    processingStatus.value = 'Anonymisierte PDF wird hochgeladen...';
    try {
        const originalName = String(currentVideo.value.filename || `document_${currentVideo.value.id}.pdf`);
        const uploadName = originalName.toLowerCase().endsWith('.pdf')
            ? `${originalName.slice(0, -4)}_anonymized.pdf`
            : `${originalName}_anonymized.pdf`;
        const file = new File([redactedPdfBytes.value], uploadName, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', file);
        const response = await axiosInstance.post(r('upload/'), formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        processingProgress.value = 100;
        processingStatus.value = 'Upload erfolgreich gestartet';
        processingHistory.value.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            operation: 'pdf_upload',
            status: 'success',
            details: `Upload-ID: ${response.data.upload_id || 'n/a'}`,
        });
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler beim Upload der anonymisierten PDF';
        console.error('Error uploading redacted PDF:', err);
    }
    finally {
        isProcessing.value = false;
        currentOperation.value = '';
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
        const response = await axiosInstance.post(r(`media/videos/${currentVideo.value.id}/analyze/`), {
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
        const response = await axiosInstance.post(r(`media/videos/${currentVideo.value.id}/apply-mask/`), payload);
        const taskId = response.data.task_id;
        if (taskId) {
            await pollTaskProgress(taskId, 'masking');
        }
        else {
            await finalizeCorrectionProcessing('masking', {
                output_path: response.data.output_file,
                summary: response.data.message || 'Maskierung erfolgreich abgeschlossen'
            });
        }
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
        const response = await axiosInstance.post(r(`media/videos/${currentVideo.value.id}/remove-frames/`), payload);
        const taskId = response.data.task_id;
        if (taskId) {
            await pollTaskProgress(taskId, 'frame_removal');
        }
        else {
            await finalizeCorrectionProcessing('frame_removal', {
                output_path: response.data.output_file,
                summary: response.data.message || 'Frame-Entfernung erfolgreich abgeschlossen'
            });
        }
    }
    catch (err) {
        error.value = err.response?.data?.error || 'Fehler bei der Frame-Entfernung';
        console.error('Error removing frames:', err);
        isProcessing.value = false;
        currentOperation.value = '';
    }
};
const markValidationFinishedRemoveOutside = async (videoId) => {
    await axiosInstance.post(r(`media/videos/${videoId}/segments/validation-status/`), {
        isValidated: true,
        notes: `Korrektur abgeschlossen am ${new Date().toLocaleString('de-DE')}`,
        informationSourceName: 'manual_correction',
    });
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
    const pollInterval = 5000; // Increased from 2000ms to 5000ms (5 seconds)
    const maxPolls = 300; // 10 minutes max
    let polls = 0;
    const poll = async () => {
        if (polls >= maxPolls) {
            throw new Error('Zeitüberschreitung bei der Verarbeitung');
        }
        try {
            const response = await axiosInstance.get(r(`media/videos/task-status/${taskId}/`));
            const { status, progress, message, result } = response.data;
            processingProgress.value = progress || 0;
            processingStatus.value = message || 'Verarbeitung läuft...';
            if (status === 'SUCCESS') {
                await finalizeCorrectionProcessing(operation, result);
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
const finalizeCorrectionProcessing = async (operation, result) => {
    if (!currentVideo.value)
        return;
    processingProgress.value = 100;
    processingStatus.value = 'Verarbeitung abgeschlossen';
    processingHistory.value.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        operation,
        status: 'success',
        details: result?.summary || 'Verarbeitung erfolgreich',
        outputPath: result?.output_path
    });
    await markValidationFinishedRemoveOutside(currentVideo.value.id);
    await refreshCurrentVideo();
    isProcessing.value = false;
    currentOperation.value = '';
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
        await axiosInstance.post(r(`media/videos/${currentVideo.value.id}/reprocess/`));
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
    const fileType = previewMode.value === 'processed' && hasProcessedVersion.value
        ? 'processed'
        : 'raw';
    return buildVideoStreamUrl(currentVideo.value.id, fileType);
};
const seekVideo = (seconds) => {
    if (videoElement.value) {
        videoElement.value.currentTime += seconds;
    }
};
const downloadResult = async (historyId) => {
    if (!currentVideo.value)
        return;
    try {
        const response = await axiosInstance.get(`/api/media/processed-videos/${currentVideo.value.id}/${historyId}/`, {
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
        'processing_anonymization': 'bg-warning',
        'done_processing_anonymization': 'bg-success',
        'validated': 'bg-success',
        'failed': 'bg-danger',
        'success': 'bg-success'
    };
    return classes[status] || 'bg-secondary';
};
const getStatusText = (status) => {
    const texts = {
        'not_started': 'Nicht gestartet',
        'processing': 'In Bearbeitung',
        'processing_anonymization': 'In Bearbeitung',
        'done_processing_anonymization': 'Fertig',
        'validated': 'Validiert',
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
        'reprocessing': 'Neuverarbeitung',
        'pdf_redaction': 'PDF-Redaktion',
        'pdf_upload': 'PDF-Upload'
    };
    return texts[operation] || operation;
};
const getOperationBadgeClass = (operation) => {
    const classes = {
        'analysis': 'bg-info',
        'masking': 'bg-warning',
        'frame_removal': 'bg-danger',
        'reprocessing': 'bg-primary',
        'pdf_redaction': 'bg-dark',
        'pdf_upload': 'bg-info'
    };
    return classes[operation] || 'bg-secondary';
};
// Lifecycle hooks
onMounted(async () => {
    if (!isNaN(props.fileId)) {
        mediaStore.setCurrentByKey(resolvedMediaType.value, props.fileId);
    }
    if (!isNaN(props.fileId)) {
        await loadCurrentItemDetails(props.fileId);
    }
    else {
        error.value = 'Ungültige Datei-ID';
    }
});
// Watchers
watch(() => props.fileId, async (newId) => {
    if (newId && !isNaN(newId)) {
        mediaStore.setCurrentByKey(resolvedMediaType.value, newId);
        await loadCurrentItemDetails(newId);
    }
});
watch(pdfScale, async () => {
    if (!isPdfCorrection.value || !pdfDocument)
        return;
    await renderCurrentPdfPage();
});
watch(activePdfPage, () => {
    if (!isPdfCorrection.value)
        return;
    drawPdfOverlay();
});
onUnmounted(() => {
    if (redactedPdfUrl.value) {
        URL.revokeObjectURL(redactedPdfUrl.value);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-preview-frame']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0 d-flex justify-content-between align-items-center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.goBack) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-arrow-left me-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshCurrentVideo) },
    ...{ class: "btn btn-outline-primary btn-sm" },
    disabled: (__VLS_ctx.isRefreshing),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "fas fa-sync-alt" },
    ...{ class: ({ 'fa-spin': __VLS_ctx.isRefreshing }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2" },
    });
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.error);
}
else if (!__VLS_ctx.currentVideo) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "fas fa-info-circle me-2" },
    });
}
else {
    if (__VLS_ctx.isPdfCorrection) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card bg-light" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-8" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "card-title" },
        });
        (__VLS_ctx.currentVideo.filename);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getStatusBadgeClass(__VLS_ctx.currentVideo.anonymizationStatus)) },
            ...{ class: "badge ms-1" },
        });
        (__VLS_ctx.getStatusText(__VLS_ctx.currentVideo.anonymizationStatus));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatFileSize(__VLS_ctx.currentVideo.fileSize ?? null));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatDate(__VLS_ctx.currentVideo.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4 text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-column gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.reloadPdfDocument) },
            ...{ class: "btn btn-outline-primary btn-sm" },
            disabled: (__VLS_ctx.isRenderingPdf),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-file-pdf me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.generateRedactedPdf) },
            ...{ class: "btn btn-success btn-sm" },
            disabled: (__VLS_ctx.isRenderingPdf || __VLS_ctx.totalPdfBoxCount === 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-shield-alt me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.downloadRedactedPdf) },
            ...{ class: "btn btn-outline-success btn-sm" },
            disabled: (!__VLS_ctx.redactedPdfUrl),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-download me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.uploadRedactedPdf) },
            ...{ class: "btn btn-outline-info btn-sm" },
            disabled: (!__VLS_ctx.redactedPdfBytes || __VLS_ctx.isProcessing),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-upload me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row g-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-xl-9" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header d-flex flex-wrap gap-2 align-items-center justify-content-between" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-center gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.previousPdfPage) },
            ...{ class: "btn btn-outline-secondary btn-sm" },
            disabled: (__VLS_ctx.activePdfPage <= 1 || __VLS_ctx.isRenderingPdf),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-chevron-left" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "small text-muted" },
        });
        (__VLS_ctx.activePdfPage);
        (__VLS_ctx.pdfPageCount || 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.nextPdfPage) },
            ...{ class: "btn btn-outline-secondary btn-sm" },
            disabled: (__VLS_ctx.activePdfPage >= __VLS_ctx.pdfPageCount || __VLS_ctx.isRenderingPdf),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-chevron-right" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3 d-flex flex-wrap gap-2 align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            type: "range",
            min: "0.75",
            max: "2.5",
            step: "0.25",
            ...{ class: "form-range pdf-zoom-range" },
        });
        (__VLS_ctx.pdfScale);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "small text-muted" },
        });
        (Math.round(__VLS_ctx.pdfScale * 100));
        if (__VLS_ctx.isRenderingPdf) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "text-center py-5" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "spinner-border text-primary" },
                role: "status",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "visually-hidden" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "mt-2 mb-0" },
            });
        }
        else if (__VLS_ctx.pdfRenderError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "alert alert-danger mb-0" },
                role: "alert",
            });
            (__VLS_ctx.pdfRenderError);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "pdf-editor-stage" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
                ref: "pdfPageCanvas",
                ...{ class: "pdf-page-canvas" },
            });
            /** @type {typeof __VLS_ctx.pdfPageCanvas} */ ;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.canvas, __VLS_intrinsicElements.canvas)({
                ...{ onMousedown: (__VLS_ctx.onPdfOverlayMouseDown) },
                ...{ onMousemove: (__VLS_ctx.onPdfOverlayMouseMove) },
                ...{ onMouseup: (__VLS_ctx.onPdfOverlayMouseUp) },
                ...{ onMouseleave: (__VLS_ctx.onPdfOverlayMouseLeave) },
                ref: "pdfOverlayCanvas",
                ...{ class: "pdf-overlay-canvas" },
            });
            /** @type {typeof __VLS_ctx.pdfOverlayCanvas} */ ;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-xl-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body d-flex flex-column gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.getCurrentPageBoxCount());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.totalPdfBoxCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.undoLastPdfBox) },
            ...{ class: "btn btn-outline-secondary btn-sm" },
            disabled: (__VLS_ctx.getCurrentPageBoxCount() === 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-undo me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearCurrentPdfPageBoxes) },
            ...{ class: "btn btn-outline-warning btn-sm" },
            disabled: (__VLS_ctx.getCurrentPageBoxCount() === 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-eraser me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearAllPdfBoxes) },
            ...{ class: "btn btn-outline-danger btn-sm" },
            disabled: (__VLS_ctx.totalPdfBoxCount === 0),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-trash me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.hr, __VLS_intrinsicElements.hr)({
            ...{ class: "my-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "small text-muted mb-0" },
        });
        if (__VLS_ctx.redactedPdfUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row mt-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-12" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                ...{ class: "mb-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe, __VLS_intrinsicElements.iframe)({
                src: (__VLS_ctx.redactedPdfUrl),
                ...{ class: "pdf-preview-frame" },
                title: "Anonymisierte PDF Vorschau",
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card bg-light" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-8" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "card-title" },
        });
        (__VLS_ctx.currentVideo.filename);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-sm-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getStatusBadgeClass(__VLS_ctx.currentVideo.anonymizationStatus)) },
            ...{ class: "badge ms-1" },
        });
        (__VLS_ctx.getStatusText(__VLS_ctx.currentVideo.anonymizationStatus));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatFileSize(__VLS_ctx.currentVideo.fileSize ?? null));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatDate(__VLS_ctx.currentVideo.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-sm-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.videoMetadata.sensitiveFrameCount || 'Unbekannt');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.videoMetadata.totalFrames || 'Unbekannt');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getSensitivityBadgeClass(__VLS_ctx.videoMetadata.sensitiveRatio)) },
        });
        (__VLS_ctx.formatPercentage(__VLS_ctx.videoMetadata.sensitiveRatio));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4 text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-column gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.analyzeVideo) },
            ...{ class: "btn btn-outline-info btn-sm" },
            disabled: (__VLS_ctx.isProcessing),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-search me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.reprocessVideo) },
            ...{ class: "btn btn-outline-warning btn-sm" },
            disabled: (__VLS_ctx.isProcessing),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-redo me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row mb-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-mask me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.maskConfig.type),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "device_default",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "roi_based",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "custom",
        });
        if (__VLS_ctx.maskConfig.type === 'device_default') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.maskConfig.deviceName),
                ...{ class: "form-select" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "olympus_cv_1500",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "olympus_cv_190",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "pentax_epk_i7010",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "fujifilm_vp_4450hd",
            });
        }
        if (__VLS_ctx.maskConfig.type === 'custom') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: "number",
                ...{ class: "form-control" },
                min: "0",
            });
            (__VLS_ctx.maskConfig.endoscopeX);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: "number",
                ...{ class: "form-control" },
                min: "0",
            });
            (__VLS_ctx.maskConfig.endoscopeY);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row mt-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: "number",
                ...{ class: "form-control" },
                min: "1",
            });
            (__VLS_ctx.maskConfig.endoscopeWidth);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-6" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                type: "number",
                ...{ class: "form-control" },
                min: "1",
            });
            (__VLS_ctx.maskConfig.endoscopeHeight);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: "form-check-input" },
            type: "radio",
            value: "streaming",
            id: "maskStreaming",
        });
        (__VLS_ctx.maskConfig.processingMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "maskStreaming",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: "form-check-input" },
            type: "radio",
            value: "direct",
            id: "maskDirect",
        });
        (__VLS_ctx.maskConfig.processingMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "maskDirect",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.applyMasking) },
            ...{ class: "btn btn-warning w-100" },
            disabled: (__VLS_ctx.isProcessing || !__VLS_ctx.canApplyMask),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-mask me-2" },
        });
        if (__VLS_ctx.isProcessing && __VLS_ctx.currentOperation === 'masking') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-spinner fa-spin me-1" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-6" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-cut me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: "form-check-input" },
            type: "radio",
            value: "automatic",
            id: "frameAutomatic",
        });
        (__VLS_ctx.frameConfig.selectionMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "frameAutomatic",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: "form-check-input" },
            type: "radio",
            value: "manual",
            id: "frameManual",
        });
        (__VLS_ctx.frameConfig.selectionMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "frameManual",
        });
        if (__VLS_ctx.frameConfig.selectionMethod === 'manual') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                value: (__VLS_ctx.frameConfig.manualFrames),
                ...{ class: "form-control" },
                rows: "3",
                placeholder: "z.B. 10,25,30-35,100",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "form-text text-muted" },
            });
        }
        if (__VLS_ctx.frameConfig.selectionMethod === 'automatic') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mb-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.frameConfig.detectionEngine),
                ...{ class: "form-select" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "minicpm",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "traditional",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "hybrid",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: "form-check-input" },
            type: "radio",
            value: "streaming",
            id: "frameStreaming",
        });
        (__VLS_ctx.frameConfig.processingMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "frameStreaming",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ class: "form-check-input" },
            type: "radio",
            value: "traditional",
            id: "frameTraditional",
        });
        (__VLS_ctx.frameConfig.processingMethod);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-check-label" },
            for: "frameTraditional",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.removeFrames) },
            ...{ class: "btn btn-danger w-100" },
            disabled: (__VLS_ctx.isProcessing || !__VLS_ctx.canRemoveFrames),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-cut me-2" },
        });
        if (__VLS_ctx.isProcessing && __VLS_ctx.currentOperation === 'frame_removal') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-spinner fa-spin me-1" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        if (__VLS_ctx.isProcessing) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row mb-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-12" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card border-warning" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex align-items-center" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "spinner-border spinner-border-sm text-warning me-3" },
                role: "status",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "visually-hidden" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "flex-grow-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: "mb-1" },
            });
            (__VLS_ctx.getOperationText(__VLS_ctx.currentOperation));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "progress" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "progress-bar progress-bar-striped progress-bar-animated" },
                ...{ style: ({ width: __VLS_ctx.processingProgress + '%' }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted mt-1" },
            });
            (__VLS_ctx.processingStatus);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.cancelProcessing) },
                ...{ class: "btn btn-outline-danger btn-sm" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-times me-1" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-12" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: "mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex gap-2 mt-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!!(!__VLS_ctx.currentVideo))
                        return;
                    if (!!(__VLS_ctx.isPdfCorrection))
                        return;
                    __VLS_ctx.previewMode = 'original';
                } },
            ...{ class: "btn btn-sm" },
            ...{ class: (__VLS_ctx.previewMode === 'original' ? 'btn-primary' : 'btn-outline-primary') },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!!(!__VLS_ctx.currentVideo))
                        return;
                    if (!!(__VLS_ctx.isPdfCorrection))
                        return;
                    __VLS_ctx.previewMode = 'processed';
                } },
            ...{ class: "btn btn-sm" },
            ...{ class: (__VLS_ctx.previewMode === 'processed' ? 'btn-primary' : 'btn-outline-primary') },
            disabled: (!__VLS_ctx.hasProcessedVersion),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-container" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onError: (__VLS_ctx.onVideoError) },
            ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
            ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
            ref: "videoElement",
            controls: true,
            width: "100%",
            height: "600px",
            src: (__VLS_ctx.getVideoUrl()),
        });
        /** @type {typeof __VLS_ctx.videoElement} */ ;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 d-flex justify-content-between align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!!(!__VLS_ctx.currentVideo))
                        return;
                    if (!!(__VLS_ctx.isPdfCorrection))
                        return;
                    __VLS_ctx.seekVideo(-10);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-backward me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!!(!__VLS_ctx.currentVideo))
                        return;
                    if (!!(__VLS_ctx.isPdfCorrection))
                        return;
                    __VLS_ctx.seekVideo(10);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "fas fa-forward me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.previewMode === 'original' ? 'Original-Video' : 'Verarbeitetes Video');
        if (__VLS_ctx.processingHistory.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "row mt-4" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "col-12" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                ...{ class: "mb-0" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "table-responsive" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
                ...{ class: "table table-sm" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
            for (const [entry] of __VLS_getVForSourceType((__VLS_ctx.processingHistory))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                    key: (entry.id),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                (__VLS_ctx.formatDate(entry.timestamp));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge" },
                    ...{ class: (__VLS_ctx.getOperationBadgeClass(entry.operation)) },
                });
                (__VLS_ctx.getOperationText(entry.operation));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge" },
                    ...{ class: (__VLS_ctx.getStatusBadgeClass(entry.status)) },
                });
                (__VLS_ctx.getStatusText(entry.status));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: "text-muted" },
                });
                (entry.details);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
                if (entry.status === 'success' && entry.outputPath) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(__VLS_ctx.loading))
                                    return;
                                if (!!(__VLS_ctx.error))
                                    return;
                                if (!!(!__VLS_ctx.currentVideo))
                                    return;
                                if (!!(__VLS_ctx.isPdfCorrection))
                                    return;
                                if (!(__VLS_ctx.processingHistory.length))
                                    return;
                                if (!(entry.status === 'success' && entry.outputPath))
                                    return;
                                __VLS_ctx.downloadResult(entry.id);
                            } },
                        ...{ class: "btn btn-outline-primary btn-sm" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: "fas fa-download" },
                    });
                }
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-arrow-left']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-sync-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-info-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-file-pdf']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-shield-alt']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-download']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-upload']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-9']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-chevron-left']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-chevron-right']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-range']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-zoom-range']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-editor-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-page-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-overlay-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-undo']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-eraser']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-trash']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['my-2']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['pdf-preview-frame']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-info']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-search']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-redo']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-mask']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-cut']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-text']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-cut']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['border-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['progress']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar-striped']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar-animated']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-times']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-backward']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-forward']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-download']} */ ;
var __VLS_dollars;
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
            pdfPageCanvas: pdfPageCanvas,
            pdfOverlayCanvas: pdfOverlayCanvas,
            pdfRenderError: pdfRenderError,
            isRenderingPdf: isRenderingPdf,
            pdfPageCount: pdfPageCount,
            activePdfPage: activePdfPage,
            pdfScale: pdfScale,
            redactedPdfBytes: redactedPdfBytes,
            redactedPdfUrl: redactedPdfUrl,
            canApplyMask: canApplyMask,
            canRemoveFrames: canRemoveFrames,
            hasProcessedVersion: hasProcessedVersion,
            isPdfCorrection: isPdfCorrection,
            totalPdfBoxCount: totalPdfBoxCount,
            goBack: goBack,
            refreshCurrentVideo: refreshCurrentVideo,
            reloadPdfDocument: reloadPdfDocument,
            getCurrentPageBoxCount: getCurrentPageBoxCount,
            onPdfOverlayMouseDown: onPdfOverlayMouseDown,
            onPdfOverlayMouseMove: onPdfOverlayMouseMove,
            onPdfOverlayMouseUp: onPdfOverlayMouseUp,
            onPdfOverlayMouseLeave: onPdfOverlayMouseLeave,
            previousPdfPage: previousPdfPage,
            nextPdfPage: nextPdfPage,
            undoLastPdfBox: undoLastPdfBox,
            clearCurrentPdfPageBoxes: clearCurrentPdfPageBoxes,
            clearAllPdfBoxes: clearAllPdfBoxes,
            generateRedactedPdf: generateRedactedPdf,
            downloadRedactedPdf: downloadRedactedPdf,
            uploadRedactedPdf: uploadRedactedPdf,
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
});
; /* PartiallyEnd: #4569/main.vue */
