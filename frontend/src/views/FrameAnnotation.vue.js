import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { v7 as uuidv7 } from 'uuid';
import axiosInstance, { r } from '@/api/axiosInstance';
import { fetchAiDatasetOptions } from '@/api/aiDatasetApi';
import { endpoints } from '@/types/api/endpoints';
import { useAnnotationQueueStore } from '@/stores/annotationQueue';
import { useAuthKcStore } from '@/stores/auth_kc';
import { clearAnnotatorOverride, getAnnotatorPrincipalFromAuthUser, loadAnnotatorOverride, saveAnnotatorOverride } from '@/utils/annotationPrincipal';
const ANONYMIZER_INFORMATION_SOURCE = 'lx_anonymizer_evaluation';
const PHI_REGION_MODE_QUERY_VALUE = 'phi_region';
const PHI_REGION_LABEL_NAME = 'sensitive_region';
const PHI_REGION_DATASET_MODEL_TYPE = 'phi_region_detector';
const NO_DATASET_OPTION = '__none__';
const FRAME_IMAGE_RETRY_LIMIT = 3;
const FRAME_IMAGE_RETRY_DELAY_MS = 1200;
const PHI_REGION_LABEL_ALIASES = [
    PHI_REGION_LABEL_NAME,
    'phi',
    'phi_region',
    'protected_health_information',
    'protected health information',
    'patient_data_region',
    'patient data region',
    'anonymization_region',
    'anonymization region',
    'sensitive_ui_region',
    'sensitive ui region',
    'patienten_daten',
    'patientendaten',
    'sensible_region'
];
const ANONYMIZER_FIELD_DEFINITIONS = [
    {
        key: 'endoscope_image',
        label: 'Endoskop-Bild',
        aliases: ['endoscope_image', 'endoscope image', 'endoscopy image', 'endo image'],
        sensitive: false
    },
    {
        key: 'examination_date',
        label: 'Untersuchungsdatum',
        aliases: ['examination_date', 'examination date', 'exam date', 'date'],
        sensitive: true
    },
    {
        key: 'examination_time',
        label: 'Untersuchungszeit',
        aliases: ['examination_time', 'examination time', 'exam time', 'time'],
        sensitive: true
    },
    {
        key: 'patient_first_name',
        label: 'Vorname',
        aliases: ['patient_first_name', 'patient first name', 'first name', 'vorname'],
        sensitive: true
    },
    {
        key: 'patient_last_name',
        label: 'Nachname',
        aliases: ['patient_last_name', 'patient last name', 'last name', 'nachname'],
        sensitive: true
    },
    {
        key: 'patient_dob',
        label: 'Geburtsdatum',
        aliases: ['patient_dob', 'patient dob', 'date of birth', 'birth date', 'geburtsdatum'],
        sensitive: true
    },
    {
        key: 'endoscope_type',
        label: 'Endoskop-Typ',
        aliases: ['endoscope_type', 'endoscope type', 'scope type'],
        sensitive: false
    },
    {
        key: 'endoscope_sn',
        label: 'Endoskop-Seriennummer',
        aliases: [
            'endoscope_sn',
            'endoscope serial number',
            'scope serial number',
            'serial number'
        ],
        sensitive: false
    }
];
const queueStore = useAnnotationQueueStore();
const authStore = useAuthKcStore();
const isLoadingTask = ref(false);
const isSubmitting = ref(false);
const currentTask = ref(null);
const selectedLabelIds = ref([]);
const errorMessage = ref(null);
const isLoadingLabelGroups = ref(false);
const labelGroupLoadError = ref(null);
const labelGroupOptions = ref([]);
const aiDatasetOptions = ref([]);
const isLoadingAiDatasets = ref(false);
const aiDatasetLoadError = ref(null);
const annotatorOverride = ref(null);
const annotatorOverrideInput = ref('');
const frameImageElement = ref(null);
const frameStageElement = ref(null);
const frameImageRequestUrl = ref('');
const frameImageLoadState = ref('idle');
const frameImageRetryCount = ref(0);
const selectedBoxLabelId = ref(null);
const boxAnnotations = ref([]);
const draftBox = ref(null);
const activeBoxClientId = ref(null);
const isLoadingBoxAnnotations = ref(false);
const isSavingBoxAnnotations = ref(false);
const boxAnnotationError = ref(null);
const initialRouteQuery = new URLSearchParams(window.location.search);
let boxDraftStart = null;
let frameImageRetryTimer = null;
let frameImageProbeGeneration = 0;
let isReloadingAnnotationQueue = false;
let isBootstrappingAnnotationQueue = true;
const selectedLabelGroupId = computed({
    get: () => queueStore.selectedLabelGroupId ?? '',
    set: (value) => queueStore.setSelectedLabelGroupId(value.trim() || null)
});
const taskMode = computed({
    get: () => queueStore.taskMode,
    set: (value) => queueStore.setTaskMode(value === 'filtered' ? 'filtered' : 'random')
});
const targetLabelName = computed({
    get: () => queueStore.targetLabelName,
    set: (value) => queueStore.setTargetLabelName(value)
});
const filterLabelName = computed({
    get: () => queueStore.filterLabelName ?? '',
    set: (value) => queueStore.setFilterLabelName(value.trim() || null)
});
const allowRandomFallback = computed({
    get: () => queueStore.allowRandomFallback,
    set: (value) => queueStore.setAllowRandomFallback(value)
});
const selectedAiDatasetId = computed({
    get: () => {
        const match = aiDatasetOptions.value.find((dataset) => dataset.label === queueStore.aiDatasetName &&
            dataset.datasetType === queueStore.aiDatasetType);
        return match ? String(match.id) : NO_DATASET_OPTION;
    },
    set: (value) => {
        if (value === NO_DATASET_OPTION) {
            queueStore.setAiDataset(null, null);
            return;
        }
        const selected = aiDatasetOptions.value.find((dataset) => String(dataset.id) === value);
        queueStore.setAiDataset(selected?.label ?? null, selected?.datasetType ?? null);
    }
});
const informationSource = computed({
    get: () => queueStore.informationSource,
    set: (value) => queueStore.setInformationSource(value)
});
const annotationLabelOptions = computed(() => currentTask.value?.data.labelOptions ?? []);
const selectedBoxLabel = computed(() => annotationLabelOptions.value.find((label) => label.id === selectedBoxLabelId.value) ?? null);
const routePhiRegionMode = computed(() => {
    const mode = normalizeAnonymizerLabelName(initialRouteQuery.get('mode') ?? '');
    const targetLabel = normalizeAnonymizerLabelName(initialRouteQuery.get('targetLabel') ?? '');
    return mode === PHI_REGION_MODE_QUERY_VALUE || targetLabel === PHI_REGION_LABEL_NAME;
});
const isPhiRegionMode = computed(() => routePhiRegionMode.value ||
    normalizeAnonymizerLabelName(targetLabelName.value) === PHI_REGION_LABEL_NAME);
const phiRegionReturnRoute = computed(() => initialRouteQuery.get('returnTo')?.trim() || '');
const phiRegionBoxLabel = computed(() => findLabelByAliases(PHI_REGION_LABEL_ALIASES));
const isPhiRegionBoxLabelMissing = computed(() => isPhiRegionMode.value &&
    annotationLabelOptions.value.length > 0 &&
    phiRegionBoxLabel.value === null);
const selectedAiDataset = computed(() => aiDatasetOptions.value.find((dataset) => dataset.label === queueStore.aiDatasetName &&
    dataset.datasetType === queueStore.aiDatasetType) ?? null);
const isPhiDatasetSelected = computed(() => selectedAiDataset.value?.aiModelType === PHI_REGION_DATASET_MODEL_TYPE);
const isPatienteninformationenDatasetSelected = computed(() => isPhiDatasetSelected.value);
const showFrameImageStatus = computed(() => !!currentTask.value && frameImageLoadState.value !== 'loaded');
const frameImageStatusMessage = computed(() => {
    if (frameImageLoadState.value === 'pending') {
        return `Frame wird extrahiert... neuer Versuch ${frameImageRetryCount.value}/${FRAME_IMAGE_RETRY_LIMIT}`;
    }
    if (frameImageLoadState.value === 'failed') {
        return 'Frame konnte nicht geladen werden. Bitte Aufgabe neu laden oder spaeter erneut versuchen.';
    }
    return 'Frame wird bereitgestellt...';
});
const visibleErrorMessage = computed(() => errorMessage.value || queueStore.lastError);
const baseAnnotatorPrincipal = computed(() => getAnnotatorPrincipalFromAuthUser(authStore.user));
const annotatorOverrideScope = computed(() => `frame:${queueStore.selectedLabelGroupId ?? 'all'}:${informationSource.value}`);
const activeAnnotatorPrincipal = computed(() => annotatorOverride.value || baseAnnotatorPrincipal.value);
const isAnnotatorOverrideActive = computed(() => annotatorOverride.value !== null);
const canApplyAnnotatorOverride = computed(() => {
    const normalized = annotatorOverrideInput.value.trim();
    return (!!normalized &&
        normalized !== activeAnnotatorPrincipal.value &&
        normalized !== baseAnnotatorPrincipal.value);
});
const activeAnnotatorLabel = computed(() => isAnnotatorOverrideActive.value
    ? `${activeAnnotatorPrincipal.value} (Override)`
    : activeAnnotatorPrincipal.value);
const manualAnnotationState = computed(() => Object.fromEntries((currentTask.value?.data.manualAnnotations ?? []).map((annotation) => [
    annotation.labelId,
    annotation
])));
const predictionAnnotationState = computed(() => Object.fromEntries((currentTask.value?.data.predictionAnnotations ?? []).map((annotation) => [
    annotation.labelId,
    annotation
])));
const labelOptionByNormalizedName = computed(() => {
    const byName = new Map();
    for (const label of annotationLabelOptions.value) {
        byName.set(normalizeAnonymizerLabelName(label.name), label);
    }
    return byName;
});
const anonymizerFieldRows = computed(() => ANONYMIZER_FIELD_DEFINITIONS.map((definition) => {
    const label = findAnonymizerLabelForDefinition(definition);
    return {
        ...definition,
        labelId: label?.id ?? null,
        labelName: label?.name ?? '',
        selected: label ? selectedLabelIds.value.includes(label.id) : false
    };
}));
const hasAnyAnonymizerLabels = computed(() => anonymizerFieldRows.value.some((field) => field.labelId !== null));
const hasAnonymizerSensitiveLabels = computed(() => anonymizerFieldRows.value.some((field) => field.sensitive && field.labelId !== null));
const missingAnonymizerFieldLabels = computed(() => anonymizerFieldRows.value
    .filter((field) => field.labelId === null)
    .map((field) => field.key));
function syncSelectedLabelsFromTask(task) {
    if (!task) {
        selectedLabelIds.value = [];
        return;
    }
    const manualSelected = (task.data.manualAnnotations ?? [])
        .filter((annotation) => annotation.value)
        .map((annotation) => annotation.labelId);
    if (manualSelected.length > 0) {
        selectedLabelIds.value = [...new Set(manualSelected)];
        return;
    }
    selectedLabelIds.value = [...new Set(task.data.suggestedLabelIds ?? [])];
}
function clearSelectedLabels() {
    selectedLabelIds.value = [];
}
function applySuggestedLabels() {
    selectedLabelIds.value = [...new Set(currentTask.value?.data.suggestedLabelIds ?? [])];
}
function normalizeAnonymizerLabelName(value) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}
function findLabelByAliases(aliases) {
    for (const alias of aliases) {
        const normalizedAlias = normalizeAnonymizerLabelName(alias);
        if (!normalizedAlias)
            continue;
        const label = labelOptionByNormalizedName.value.get(normalizedAlias);
        if (label)
            return label;
    }
    return null;
}
function findAnonymizerLabelForDefinition(definition) {
    return findLabelByAliases(definition.aliases);
}
function getCheckboxChecked(event) {
    return event.target?.checked ?? false;
}
function setLabelSelection(labelId, selected) {
    const nextSelection = new Set(selectedLabelIds.value);
    if (selected) {
        nextSelection.add(labelId);
    }
    else {
        nextSelection.delete(labelId);
    }
    selectedLabelIds.value = [...nextSelection];
}
function setAnonymizerFieldSelected(fieldKey, selected) {
    const field = anonymizerFieldRows.value.find((row) => row.key === fieldKey);
    if (field?.labelId === null || field?.labelId === undefined)
        return;
    setLabelSelection(field.labelId, selected);
}
function setAnonymizerFields(rows, selected) {
    const nextSelection = new Set(selectedLabelIds.value);
    for (const field of rows) {
        if (field.labelId === null)
            continue;
        if (selected) {
            nextSelection.add(field.labelId);
        }
        else {
            nextSelection.delete(field.labelId);
        }
    }
    selectedLabelIds.value = [...nextSelection];
}
function markSensitiveAnonymizerLabels(selected) {
    setAnonymizerFields(anonymizerFieldRows.value.filter((field) => field.sensitive), selected);
}
function markAllAnonymizerLabels(selected) {
    setAnonymizerFields(anonymizerFieldRows.value, selected);
}
function clearAnonymizerLabels() {
    markAllAnonymizerLabels(false);
}
function useAnonymizerInformationSource() {
    informationSource.value = ANONYMIZER_INFORMATION_SOURCE;
}
function usePhiRegionAnnotationPreset() {
    taskMode.value = 'random';
    targetLabelName.value = PHI_REGION_LABEL_NAME;
    informationSource.value = ANONYMIZER_INFORMATION_SOURCE;
    ensureSelectedBoxLabel();
}
function applyRoutePreset() {
    if (!routePhiRegionMode.value)
        return;
    const queryTaskMode = initialRouteQuery.get('taskMode');
    const queryTargetLabel = initialRouteQuery.get('targetLabel')?.trim();
    const queryInformationSource = initialRouteQuery.get('informationSource')?.trim();
    const queryLabelGroupId = initialRouteQuery.get('labelGroupId')?.trim();
    taskMode.value = queryTaskMode === 'filtered' ? 'filtered' : 'random';
    targetLabelName.value = queryTargetLabel || PHI_REGION_LABEL_NAME;
    informationSource.value = queryInformationSource || ANONYMIZER_INFORMATION_SOURCE;
    if (queryLabelGroupId) {
        selectedLabelGroupId.value = queryLabelGroupId;
    }
}
function ensureSelectedBoxLabel() {
    if (isPhiRegionMode.value) {
        selectedBoxLabelId.value = phiRegionBoxLabel.value?.id ?? null;
        return;
    }
    if (selectedBoxLabelId.value !== null &&
        annotationLabelOptions.value.some((label) => label.id === selectedBoxLabelId.value)) {
        return;
    }
    selectedBoxLabelId.value = annotationLabelOptions.value[0]?.id ?? null;
}
function resetBoxAnnotationState() {
    boxAnnotations.value = [];
    draftBox.value = null;
    activeBoxClientId.value = null;
    boxAnnotationError.value = null;
    boxDraftStart = null;
    ensureSelectedBoxLabel();
}
function clearFrameImageRetryTimer() {
    if (frameImageRetryTimer !== null) {
        clearTimeout(frameImageRetryTimer);
        frameImageRetryTimer = null;
    }
}
function withCacheBuster(url) {
    if (!url)
        return '';
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}cb=${Date.now()}`;
}
function resetFrameImageState(task) {
    clearFrameImageRetryTimer();
    frameImageProbeGeneration += 1;
    frameImageRetryCount.value = 0;
    if (!task) {
        frameImageRequestUrl.value = '';
        frameImageLoadState.value = 'idle';
        return;
    }
    frameImageRequestUrl.value = '';
    frameImageLoadState.value = 'probing';
}
function syncFrameImageMetrics() {
    if (!frameImageElement.value)
        return;
    cancelBoxDraft();
}
function handleFrameImageLoad() {
    clearFrameImageRetryTimer();
    frameImageLoadState.value = 'loaded';
    syncFrameImageMetrics();
}
function scheduleFrameImageRetry(task) {
    clearFrameImageRetryTimer();
    frameImageRetryTimer = setTimeout(() => {
        void probeFrameImage(task);
    }, FRAME_IMAGE_RETRY_DELAY_MS);
}
function handleFrameImageError() {
    if (!currentTask.value) {
        frameImageLoadState.value = 'failed';
        return;
    }
    if (frameImageRetryCount.value >= FRAME_IMAGE_RETRY_LIMIT) {
        clearFrameImageRetryTimer();
        frameImageLoadState.value = 'failed';
        return;
    }
    frameImageRetryCount.value += 1;
    frameImageLoadState.value = 'pending';
    frameImageRequestUrl.value = '';
    scheduleFrameImageRetry(currentTask.value);
}
function readBlobText(blob) {
    if (typeof blob.text === 'function') {
        return blob.text();
    }
    return Promise.resolve('');
}
async function extractPendingMessage(blob) {
    try {
        const text = await readBlobText(blob);
        if (!text)
            return null;
        const payload = JSON.parse(text);
        const status = typeof payload.status === 'string' ? payload.status : null;
        if (status === 'frame_extraction_failed') {
            return 'Frame konnte nicht extrahiert werden. Bitte spaeter erneut versuchen.';
        }
        return null;
    }
    catch {
        return null;
    }
}
async function probeFrameImage(task) {
    const probeGeneration = ++frameImageProbeGeneration;
    frameImageLoadState.value = frameImageRetryCount.value > 0 ? 'pending' : 'probing';
    try {
        const response = await axiosInstance.get(task.data.imageUrl, {
            responseType: 'blob',
            validateStatus: () => true
        });
        if (probeGeneration !== frameImageProbeGeneration || currentTask.value?.id !== task.id)
            return;
        const contentType = String(response.headers?.['content-type'] ?? '').toLowerCase();
        if (response.status === 200 && contentType.startsWith('image/')) {
            frameImageRequestUrl.value = withCacheBuster(task.data.imageUrl);
            frameImageLoadState.value = 'loading';
            return;
        }
        if (response.status === 202) {
            if (frameImageRetryCount.value >= FRAME_IMAGE_RETRY_LIMIT) {
                frameImageLoadState.value = 'failed';
                return;
            }
            frameImageRetryCount.value += 1;
            frameImageLoadState.value = 'pending';
            scheduleFrameImageRetry(task);
            return;
        }
        if (response.status === 409) {
            errorMessage.value = (await extractPendingMessage(response.data)) ?? errorMessage.value;
            frameImageLoadState.value = 'failed';
            return;
        }
        frameImageLoadState.value = 'failed';
    }
    catch {
        if (probeGeneration !== frameImageProbeGeneration || currentTask.value?.id !== task.id)
            return;
        frameImageLoadState.value = 'failed';
    }
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function imagePointFromPointerEvent(event) {
    const image = frameImageElement.value;
    if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0)
        return null;
    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0)
        return null;
    const displayX = clamp(event.clientX - rect.left, 0, rect.width);
    const displayY = clamp(event.clientY - rect.top, 0, rect.height);
    return {
        x: (displayX / rect.width) * image.naturalWidth,
        y: (displayY / rect.height) * image.naturalHeight,
        imageWidth: image.naturalWidth,
        imageHeight: image.naturalHeight
    };
}
function buildBoxDraft(start, current) {
    if (!currentTask.value || !selectedBoxLabel.value)
        return null;
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    const width = Math.abs(current.x - start.x);
    const height = Math.abs(current.y - start.y);
    return {
        id: null,
        clientId: uuidv7(),
        frameId: currentTask.value.data.frameId,
        labelId: selectedBoxLabel.value.id,
        labelName: selectedBoxLabel.value.name,
        value: true,
        floatValue: null,
        x,
        y,
        width,
        height,
        imageWidth: current.imageWidth,
        imageHeight: current.imageHeight,
        annotator: activeAnnotatorPrincipal.value,
        externalAnnotationId: uuidv7()
    };
}
function startBoxDraft(event) {
    if (!selectedBoxLabel.value || isSavingBoxAnnotations.value)
        return;
    const point = imagePointFromPointerEvent(event);
    if (!point)
        return;
    boxDraftStart = point;
    draftBox.value = buildBoxDraft(point, point);
    boxAnnotationError.value = null;
    const target = event.currentTarget;
    target?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
}
function updateBoxDraft(event) {
    if (!boxDraftStart)
        return;
    const point = imagePointFromPointerEvent(event);
    if (!point)
        return;
    draftBox.value = buildBoxDraft(boxDraftStart, point);
    event.preventDefault();
}
function finishBoxDraft(event) {
    if (!boxDraftStart || !draftBox.value)
        return;
    const finishedBox = draftBox.value;
    boxDraftStart = null;
    draftBox.value = null;
    if (event) {
        const target = event.currentTarget;
        target?.releasePointerCapture?.(event.pointerId);
    }
    if (finishedBox.width < 3 || finishedBox.height < 3)
        return;
    boxAnnotations.value = [...boxAnnotations.value, finishedBox];
    activeBoxClientId.value = finishedBox.clientId;
}
function cancelBoxDraft() {
    boxDraftStart = null;
    draftBox.value = null;
}
function boxAnnotationStyle(box) {
    const imageWidth = box.imageWidth || 1;
    const imageHeight = box.imageHeight || 1;
    return {
        left: `${(box.x / imageWidth) * 100}%`,
        top: `${(box.y / imageHeight) * 100}%`,
        width: `${(box.width / imageWidth) * 100}%`,
        height: `${(box.height / imageHeight) * 100}%`
    };
}
function formatBoxAnnotation(box) {
    return [
        `x ${Math.round(box.x)}`,
        `y ${Math.round(box.y)}`,
        `w ${Math.round(box.width)}`,
        `h ${Math.round(box.height)}`
    ].join(' / ');
}
function removeBoxAnnotation(clientId) {
    boxAnnotations.value = boxAnnotations.value.filter((box) => box.clientId !== clientId);
    if (activeBoxClientId.value === clientId) {
        activeBoxClientId.value = null;
    }
}
function clearBoxAnnotations() {
    boxAnnotations.value = [];
    activeBoxClientId.value = null;
    cancelBoxDraft();
}
async function submitEmptyPhiBackgroundFrame() {
    usePhiRegionAnnotationPreset();
    clearBoxAnnotations();
    await submitBoxAnnotations();
}
function extractBoxAnnotationPayload(payload) {
    if (Array.isArray(payload)) {
        return payload.filter((item) => !!item && typeof item === 'object');
    }
    if (!payload || typeof payload !== 'object')
        return [];
    const obj = payload;
    if (Array.isArray(obj.annotations)) {
        return obj.annotations.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.results)) {
        return obj.results.filter((item) => !!item && typeof item === 'object');
    }
    return [];
}
function parseBoxAnnotation(raw) {
    const id = parseOptionalNumber(raw.id);
    const frameId = parseOptionalNumber(raw.frameId ?? raw.frame_id);
    const labelId = parseOptionalNumber(raw.labelId ?? raw.label_id);
    const x = parseOptionalNumber(raw.x);
    const y = parseOptionalNumber(raw.y);
    const width = parseOptionalNumber(raw.width);
    const height = parseOptionalNumber(raw.height);
    const imageWidth = parseOptionalNumber(raw.imageWidth ?? raw.image_width);
    const imageHeight = parseOptionalNumber(raw.imageHeight ?? raw.image_height);
    const labelNameRaw = raw.labelName ?? raw.label_name;
    const labelName = typeof labelNameRaw === 'string' ? labelNameRaw.trim() : '';
    if (frameId === null ||
        labelId === null ||
        x === null ||
        y === null ||
        width === null ||
        height === null ||
        imageWidth === null ||
        imageHeight === null ||
        !labelName) {
        return null;
    }
    const externalRaw = raw.externalAnnotationId ?? raw.external_annotation_id;
    const annotatorRaw = raw.annotator;
    const floatValue = parseOptionalNumber(raw.floatValue ?? raw.float_value);
    return {
        id,
        clientId: id !== null ? `box-${id}` : uuidv7(),
        frameId,
        labelId,
        labelName,
        value: raw.value !== false,
        floatValue,
        x,
        y,
        width,
        height,
        imageWidth,
        imageHeight,
        annotator: typeof annotatorRaw === 'string' ? annotatorRaw : activeAnnotatorPrincipal.value,
        externalAnnotationId: typeof externalRaw === 'string' && externalRaw.trim() ? externalRaw.trim() : uuidv7()
    };
}
async function loadBoxAnnotationsForTask(task) {
    if (!task) {
        resetBoxAnnotationState();
        return;
    }
    isLoadingBoxAnnotations.value = true;
    boxAnnotationError.value = null;
    try {
        const res = await axiosInstance.get(r(endpoints.annotation.frameBoxes), {
            params: {
                frame_id: task.data.frameId,
                information_source_name: informationSource.value,
                annotator: activeAnnotatorPrincipal.value
            }
        });
        boxAnnotations.value = extractBoxAnnotationPayload(res.data)
            .map((item) => parseBoxAnnotation(item))
            .filter((box) => box !== null);
        activeBoxClientId.value = boxAnnotations.value[0]?.clientId ?? null;
        ensureSelectedBoxLabel();
    }
    catch (error) {
        boxAnnotations.value = [];
        boxAnnotationError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Box-Annotationen konnten nicht geladen werden.';
    }
    finally {
        isLoadingBoxAnnotations.value = false;
    }
}
async function submitBoxAnnotations() {
    if (!currentTask.value)
        return;
    const task = currentTask.value;
    isSavingBoxAnnotations.value = true;
    boxAnnotationError.value = null;
    try {
        await axiosInstance.post(r(endpoints.annotation.frameBoxes), {
            frame_id: task.data.frameId,
            replace: true,
            information_source_name: informationSource.value,
            annotator: activeAnnotatorPrincipal.value,
            annotations: boxAnnotations.value.map((box) => ({
                id: box.id,
                frame_id: task.data.frameId,
                label_id: box.labelId,
                value: box.value,
                float_value: box.floatValue,
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height),
                image_width: Math.round(box.imageWidth),
                image_height: Math.round(box.imageHeight),
                information_source_name: informationSource.value,
                annotator: activeAnnotatorPrincipal.value,
                external_annotation_id: box.externalAnnotationId,
                model_meta_id: null
            }))
        });
        await loadBoxAnnotationsForTask(task);
    }
    catch (error) {
        boxAnnotationError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Box-Annotationen konnten nicht gespeichert werden.';
    }
    finally {
        isSavingBoxAnnotations.value = false;
    }
}
function formatConfidence(value) {
    if (typeof value !== 'number' || Number.isNaN(value))
        return '';
    return `${Math.round(value * 100)}%`;
}
function syncAnnotatorOverrideFromStorage() {
    annotatorOverride.value = loadAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value);
    annotatorOverrideInput.value = annotatorOverride.value ?? '';
}
function applyActiveAnnotatorToQueue() {
    queueStore.setAnnotatorPrincipal?.(activeAnnotatorPrincipal.value);
}
async function reloadAnnotationQueue() {
    isReloadingAnnotationQueue = true;
    try {
        queueStore.clearQueue();
        await loadNextTask();
    }
    finally {
        isReloadingAnnotationQueue = false;
    }
}
async function restartAnnotationAsOverride() {
    const normalized = annotatorOverrideInput.value.trim();
    if (!normalized)
        return;
    saveAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value, normalized);
    annotatorOverride.value = normalized;
    await reloadAnnotationQueue();
}
async function revertAnnotatorOverride() {
    clearAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value);
    annotatorOverride.value = null;
    annotatorOverrideInput.value = '';
    await reloadAnnotationQueue();
}
function extractListPayload(payload) {
    if (Array.isArray(payload)) {
        return payload.filter((item) => !!item && typeof item === 'object');
    }
    if (!payload || typeof payload !== 'object')
        return [];
    const obj = payload;
    if (Array.isArray(obj.results)) {
        return obj.results.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.labels)) {
        return obj.labels.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.labelSets)) {
        return obj.labelSets.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.label_sets)) {
        return obj.label_sets.filter((item) => !!item && typeof item === 'object');
    }
    if (Array.isArray(obj.groups)) {
        return obj.groups.filter((item) => !!item && typeof item === 'object');
    }
    return [];
}
function parseOptionalNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}
function parseGroupOption(raw) {
    const nestedLabelGroup = raw.labelGroup && typeof raw.labelGroup === 'object'
        ? raw.labelGroup
        : raw.label_group && typeof raw.label_group === 'object'
            ? raw.label_group
            : null;
    const groupIdRaw = raw.labelGroupId ??
        raw.label_group_id ??
        raw.groupId ??
        raw.group_id ??
        nestedLabelGroup?.id ??
        raw.id;
    if (groupIdRaw === null ||
        groupIdRaw === undefined ||
        (typeof groupIdRaw !== 'string' && typeof groupIdRaw !== 'number')) {
        return null;
    }
    const id = String(groupIdRaw).trim();
    if (!id)
        return null;
    const nameRaw = raw.labelGroupName ??
        raw.label_group_name ??
        raw.groupName ??
        raw.group_name ??
        nestedLabelGroup?.name ??
        raw.name;
    const name = typeof nameRaw === 'string' && nameRaw.trim() ? nameRaw.trim() : `Group ${id}`;
    const version = parseOptionalNumber(raw.version ?? nestedLabelGroup?.version);
    const labelCount = parseOptionalNumber(raw.labelCount ??
        raw.label_count ??
        nestedLabelGroup?.labelCount ??
        nestedLabelGroup?.label_count);
    const displayParts = [name];
    if (version !== null)
        displayParts.push(`v${version}`);
    if (labelCount !== null)
        displayParts.push(`${labelCount} Labels`);
    return { id, name, version, labelCount, displayName: displayParts.join(' - ') };
}
async function loadLabelGroups() {
    isLoadingLabelGroups.value = true;
    labelGroupLoadError.value = null;
    try {
        const res = await axiosInstance.get(r(endpoints.media.videoLabelSetsList));
        const rows = extractListPayload(res.data);
        const byId = new Map();
        for (const row of rows) {
            const parsed = parseGroupOption(row);
            if (!parsed)
                continue;
            if (!byId.has(parsed.id)) {
                byId.set(parsed.id, parsed);
            }
        }
        labelGroupOptions.value = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
        if (!selectedLabelGroupId.value && labelGroupOptions.value.length > 0) {
            selectedLabelGroupId.value = labelGroupOptions.value[0].id;
        }
    }
    catch (error) {
        labelGroupOptions.value = [];
        labelGroupLoadError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Label-Gruppen konnten nicht geladen werden.';
    }
    finally {
        isLoadingLabelGroups.value = false;
    }
}
async function loadAiDatasets() {
    isLoadingAiDatasets.value = true;
    aiDatasetLoadError.value = null;
    try {
        aiDatasetOptions.value = await fetchAiDatasetOptions();
    }
    catch (error) {
        aiDatasetOptions.value = [];
        aiDatasetLoadError.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'KI-Datensätze konnten nicht geladen werden.';
    }
    finally {
        isLoadingAiDatasets.value = false;
    }
}
async function loadNextTask() {
    isLoadingTask.value = true;
    errorMessage.value = null;
    try {
        applyActiveAnnotatorToQueue();
        if (!queueStore.taskQueue.length) {
            await queueStore.fetchBatch(10);
        }
        currentTask.value = queueStore.popNextTask() ?? null;
        resetBoxAnnotationState();
        syncSelectedLabelsFromTask(currentTask.value);
        await loadBoxAnnotationsForTask(currentTask.value);
        if (!currentTask.value && queueStore.lastError) {
            errorMessage.value = queueStore.lastError;
        }
    }
    catch (error) {
        currentTask.value = null;
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Aufgabe konnte nicht geladen werden.';
    }
    finally {
        isLoadingTask.value = false;
    }
}
function getTargetLabelId(task) {
    const targetLabel = queueStore.targetLabelName.trim().toLowerCase();
    if (!targetLabel)
        return null;
    const match = (task.data.labelOptions ?? []).find((label) => label.name.trim().toLowerCase() === targetLabel);
    return match?.id ?? null;
}
async function submitLabelsWithSelection(selectedIds) {
    if (!currentTask.value)
        return;
    const task = currentTask.value;
    const labelOptions = task.data.labelOptions ?? [];
    if (labelOptions.length === 0) {
        errorMessage.value = 'Für diesen Frame sind keine Labels verfügbar.';
        return;
    }
    isSubmitting.value = true;
    errorMessage.value = null;
    const selectedSet = new Set(selectedIds);
    try {
        await axiosInstance.post(r(endpoints.annotation.bulkUpsert), labelOptions.map((label) => {
            const existingManual = (task.data.manualAnnotations ?? []).find((annotation) => annotation.labelId === label.id);
            return {
                frameId: task.data.frameId,
                labelId: label.id,
                value: selectedSet.has(label.id),
                floatValue: null,
                informationSourceName: informationSource.value,
                annotator: activeAnnotatorPrincipal.value,
                externalAnnotationId: existingManual?.externalAnnotationId ||
                    (task.data.existingExternalId && task.data.existingExternalId.trim()
                        ? `${task.data.existingExternalId}:${label.id}`
                        : uuidv7()),
                modelMetaId: null
            };
        }));
        await loadNextTask();
    }
    catch (error) {
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Annotation konnte nicht gespeichert werden.';
    }
    finally {
        isSubmitting.value = false;
    }
}
async function submitLabels() {
    await submitLabelsWithSelection(selectedLabelIds.value);
}
async function submitPositiveExample() {
    if (!currentTask.value)
        return;
    const targetLabelId = getTargetLabelId(currentTask.value);
    if (targetLabelId === null) {
        errorMessage.value = `Ziel-Label "${queueStore.targetLabelName}" ist für diesen Frame nicht verfügbar.`;
        return;
    }
    const nextSelection = new Set(selectedLabelIds.value);
    nextSelection.add(targetLabelId);
    selectedLabelIds.value = [...nextSelection];
    await submitLabelsWithSelection(selectedLabelIds.value);
}
async function submitNegativeExample() {
    if (!currentTask.value)
        return;
    const targetLabelId = getTargetLabelId(currentTask.value);
    if (targetLabelId === null) {
        errorMessage.value = `Ziel-Label "${queueStore.targetLabelName}" ist für diesen Frame nicht verfügbar.`;
        return;
    }
    const nextSelection = new Set(selectedLabelIds.value);
    nextSelection.delete(targetLabelId);
    selectedLabelIds.value = [...nextSelection];
    await submitLabelsWithSelection(selectedLabelIds.value);
}
async function skipTask() {
    if (!currentTask.value)
        return;
    isSubmitting.value = true;
    errorMessage.value = null;
    try {
        await axiosInstance.post(r(endpoints.annotation.skip), {
            frameId: currentTask.value.data.frameId,
            annotator: activeAnnotatorPrincipal.value
        });
        await loadNextTask();
    }
    catch (error) {
        errorMessage.value =
            error?.response?.data?.detail ||
                error?.response?.data?.error ||
                error?.message ||
                'Aufgabe konnte nicht übersprungen werden.';
    }
    finally {
        isSubmitting.value = false;
    }
}
watch([baseAnnotatorPrincipal, annotatorOverrideScope], () => {
    syncAnnotatorOverrideFromStorage();
    applyActiveAnnotatorToQueue();
}, { immediate: true });
watch(() => currentTask.value?.id, async () => {
    resetFrameImageState(currentTask.value);
    syncSelectedLabelsFromTask(currentTask.value);
    ensureSelectedBoxLabel();
    if (currentTask.value) {
        await probeFrameImage(currentTask.value);
    }
});
watch(() => [queueStore.selectedLabelGroupId, queueStore.taskQuerySignature], async () => {
    if (isBootstrappingAnnotationQueue || isReloadingAnnotationQueue)
        return;
    queueStore.clearQueue();
    await loadNextTask();
});
onMounted(async () => {
    try {
        applyRoutePreset();
        await loadAiDatasets();
        await loadLabelGroups();
        await loadNextTask();
    }
    finally {
        isBootstrappingAnnotationQueue = false;
    }
});
onUnmounted(() => {
    clearFrameImageRetryTimer();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['box-annotation-rect']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-muted mb-3" },
});
if (__VLS_ctx.isPhiRegionMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning d-flex align-items-center justify-content-between flex-wrap gap-2 py-2" },
        role: "alert",
        'data-test': "phi-region-mode-alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.PHI_REGION_LABEL_NAME);
    (__VLS_ctx.ANONYMIZER_INFORMATION_SOURCE);
    if (__VLS_ctx.phiRegionReturnRoute) {
        const __VLS_0 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
            to: (__VLS_ctx.phiRegionReturnRoute),
        }));
        const __VLS_2 = __VLS_1({
            ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
            to: (__VLS_ctx.phiRegionReturnRoute),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_3.slots.default;
        var __VLS_3;
    }
}
if (__VLS_ctx.queueStore.aiDatasetName && __VLS_ctx.queueStore.aiDatasetType) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-primary mb-0" },
    });
    (__VLS_ctx.queueStore.aiDatasetName);
    (__VLS_ctx.queueStore.aiDatasetType);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "ai-dataset-id",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "ai-dataset-id",
    value: (__VLS_ctx.selectedAiDatasetId),
    ...{ class: "form-select" },
    'data-test': "frame-ai-dataset-select",
    disabled: (__VLS_ctx.isLoadingAiDatasets || __VLS_ctx.isSubmitting),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (__VLS_ctx.NO_DATASET_OPTION),
});
for (const [datasetOption] of __VLS_getVForSourceType((__VLS_ctx.aiDatasetOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (datasetOption.id),
        value: (String(datasetOption.id)),
    });
    (datasetOption.label);
    (datasetOption.datasetType);
    (datasetOption.id);
}
if (__VLS_ctx.isPatienteninformationenDatasetSelected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-warning d-block mt-1" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted d-block mt-1" },
    });
}
if (__VLS_ctx.aiDatasetLoadError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-danger d-block mt-1" },
    });
    (__VLS_ctx.aiDatasetLoadError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "label-group-id",
    ...{ class: "form-label" },
});
if (__VLS_ctx.labelGroupOptions.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: "label-group-id",
        value: (__VLS_ctx.selectedLabelGroupId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.labelGroupOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (group.id),
            value: (group.id),
        });
        (group.displayName);
        (group.id);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "label-group-id",
        value: (__VLS_ctx.selectedLabelGroupId),
        type: "text",
        ...{ class: "form-control" },
        placeholder: "e.g. 1",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex align-items-center gap-2 mt-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadLabelGroups) },
    ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
    disabled: (__VLS_ctx.isLoadingLabelGroups),
});
(__VLS_ctx.isLoadingLabelGroups ? 'Gruppen werden geladen...' : 'Gruppen neu laden');
if (__VLS_ctx.labelGroupOptions.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.labelGroupOptions.length);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
}
if (__VLS_ctx.labelGroupLoadError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-danger d-block mt-1" },
    });
    (__VLS_ctx.labelGroupLoadError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "task-mode",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "task-mode",
    value: (__VLS_ctx.taskMode),
    ...{ class: "form-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "random",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "filtered",
});
if (__VLS_ctx.taskMode === 'random') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted d-block mt-1" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "target-label-name",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    id: "target-label-name",
    value: (__VLS_ctx.targetLabelName),
    type: "text",
    ...{ class: "form-control" },
    placeholder: "Optional, z. B. polyp",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-md-6 col-lg-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "information-source",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    id: "information-source",
    value: (__VLS_ctx.informationSource),
    type: "text",
    ...{ class: "form-control" },
    placeholder: "manual_annotation",
    list: "information-source-options",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.datalist, __VLS_intrinsicElements.datalist)({
    id: "information-source-options",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "manual_annotation",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "human_annotation",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "frame_annotation_frontend",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "lx_anonymizer_evaluation",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option)({
    value: "model_prediction",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-lg-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    for: "frame-annotator-override",
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-wrap gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    id: "frame-annotator-override",
    value: (__VLS_ctx.annotatorOverrideInput),
    type: "text",
    ...{ class: "form-control annotator-override-input" },
    'data-test': "annotator-override-input",
    placeholder: (__VLS_ctx.baseAnnotatorPrincipal),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.restartAnnotationAsOverride) },
    type: "button",
    ...{ class: "btn btn-outline-primary mb-0" },
    disabled: (__VLS_ctx.isSubmitting || !__VLS_ctx.canApplyAnnotatorOverride),
    'data-test': "annotator-override-apply",
});
if (__VLS_ctx.isAnnotatorOverrideActive) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.revertAnnotatorOverride) },
        type: "button",
        ...{ class: "btn btn-outline-secondary mb-0" },
        disabled: (__VLS_ctx.isSubmitting),
        'data-test': "annotator-override-revert",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
    ...{ class: "text-muted d-block mt-1" },
});
(__VLS_ctx.activeAnnotatorLabel);
if (__VLS_ctx.taskMode === 'filtered') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-6 col-lg-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "filter-label-name",
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "filter-label-name",
        value: (__VLS_ctx.filterLabelName),
        type: "text",
        ...{ class: "form-control" },
        placeholder: "z. B. Blut",
    });
}
if (__VLS_ctx.taskMode === 'filtered') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-6 col-lg-4 d-flex align-items-end" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-check mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "random-fallback",
        ...{ class: "form-check-input" },
        type: "checkbox",
    });
    (__VLS_ctx.allowRandomFallback);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-check-label" },
        for: "random-fallback",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 col-xl-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card frame-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.isLoadingTask) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else if (!__VLS_ctx.currentTask) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-muted" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "task-meta mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-light text-dark me-2" },
    });
    (__VLS_ctx.currentTask.data.frameId);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-light text-dark" },
    });
    (__VLS_ctx.currentTask.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onPointerdown: (__VLS_ctx.startBoxDraft) },
        ...{ onPointermove: (__VLS_ctx.updateBoxDraft) },
        ...{ onPointerup: (__VLS_ctx.finishBoxDraft) },
        ...{ onPointercancel: (__VLS_ctx.cancelBoxDraft) },
        ...{ onPointerleave: (__VLS_ctx.finishBoxDraft) },
        ref: "frameStageElement",
        ...{ class: "frame-image-stage rounded border" },
        'data-test': "frame-box-stage",
    });
    /** @type {typeof __VLS_ctx.frameStageElement} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        ...{ onLoad: (__VLS_ctx.handleFrameImageLoad) },
        ...{ onError: (__VLS_ctx.handleFrameImageError) },
        ref: "frameImageElement",
        src: (__VLS_ctx.frameImageRequestUrl),
        ...{ class: "img-fluid rounded frame-image" },
        alt: "Zu annotierender Frame",
        draggable: "false",
    });
    /** @type {typeof __VLS_ctx.frameImageElement} */ ;
    if (__VLS_ctx.showFrameImageStatus) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "frame-image-status" },
            'data-test': "frame-image-status",
        });
        (__VLS_ctx.frameImageStatusMessage);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "box-annotation-layer" },
        'aria-hidden': "true",
    });
    for (const [box] of __VLS_getVForSourceType((__VLS_ctx.boxAnnotations))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onPointerdown: (...[$event]) => {
                    if (!!(__VLS_ctx.isLoadingTask))
                        return;
                    if (!!(!__VLS_ctx.currentTask))
                        return;
                    __VLS_ctx.activeBoxClientId = box.clientId;
                } },
            key: (box.clientId),
            ...{ class: "box-annotation-rect" },
            ...{ class: ({ 'box-annotation-rect-active': __VLS_ctx.activeBoxClientId === box.clientId }) },
            ...{ style: (__VLS_ctx.boxAnnotationStyle(box)) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (box.labelName);
    }
    if (__VLS_ctx.draftBox) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "box-annotation-rect box-annotation-rect-draft" },
            ...{ style: (__VLS_ctx.boxAnnotationStyle(__VLS_ctx.draftBox)) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.applySuggestedLabels) },
        ...{ class: "btn btn-outline-primary btn-sm mb-0" },
        disabled: (__VLS_ctx.isSubmitting),
    });
    if (__VLS_ctx.annotationLabelOptions.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-muted" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "label-grid" },
        });
        for (const [label] of __VLS_getVForSourceType((__VLS_ctx.annotationLabelOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (label.id),
                ...{ class: "label-option border rounded p-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-check mb-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                id: (`frame-label-${label.id}`),
                ...{ class: "form-check-input" },
                type: "checkbox",
                value: (label.id),
            });
            (__VLS_ctx.selectedLabelIds);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "form-check-label" },
            });
            (label.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "d-flex gap-1 flex-wrap" },
            });
            if (__VLS_ctx.manualAnnotationState[label.id]?.value) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-success-subtle text-success-emphasis" },
                });
            }
            else if (__VLS_ctx.manualAnnotationState[label.id]) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-secondary-subtle text-secondary-emphasis" },
                });
            }
            if (__VLS_ctx.predictionAnnotationState[label.id]?.value) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "badge bg-info-subtle text-info-emphasis" },
                });
                if (__VLS_ctx.predictionAnnotationState[label.id]?.floatValue !== null) {
                    (__VLS_ctx.formatConfidence(__VLS_ctx.predictionAnnotationState[label.id]?.floatValue));
                }
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 box-annotation-panel border rounded p-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex gap-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.useAnonymizerInformationSource) },
        type: "button",
        ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
        disabled: (__VLS_ctx.informationSource === __VLS_ctx.ANONYMIZER_INFORMATION_SOURCE),
        'data-test': "anonymizer-source-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.usePhiRegionAnnotationPreset) },
        type: "button",
        ...{ class: "btn btn-outline-primary btn-sm mb-0" },
        disabled: (__VLS_ctx.isSavingBoxAnnotations),
        'data-test': "phi-region-mode-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitBoxAnnotations) },
        type: "button",
        ...{ class: "btn btn-outline-success btn-sm mb-0" },
        disabled: (__VLS_ctx.isSavingBoxAnnotations || !__VLS_ctx.currentTask),
        'data-test': "box-save-button",
    });
    if (__VLS_ctx.isPhiRegionMode) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.submitEmptyPhiBackgroundFrame) },
            type: "button",
            ...{ class: "btn btn-outline-warning btn-sm mb-0" },
            disabled: (__VLS_ctx.isSavingBoxAnnotations || !__VLS_ctx.currentTask),
            'data-test': "phi-empty-background-button",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearBoxAnnotations) },
        type: "button",
        ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
        disabled: (__VLS_ctx.isSavingBoxAnnotations || __VLS_ctx.boxAnnotations.length === 0),
        'data-test': "box-clear-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-2 align-items-end mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "box-label-id",
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: "box-label-id",
        value: (__VLS_ctx.selectedBoxLabelId),
        ...{ class: "form-select" },
        'data-test': "box-label-select",
        disabled: (__VLS_ctx.annotationLabelOptions.length === 0 || __VLS_ctx.isPhiRegionMode),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.annotationLabelOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (label.id),
            value: (label.id),
        });
        (label.name);
    }
    if (__VLS_ctx.isPhiRegionMode && __VLS_ctx.phiRegionBoxLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block mt-1" },
        });
        (__VLS_ctx.phiRegionBoxLabel.name);
    }
    else if (__VLS_ctx.isPhiRegionBoxLabelMissing) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-danger d-block mt-1" },
        });
        (__VLS_ctx.PHI_REGION_LABEL_NAME);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-light text-dark" },
    });
    (__VLS_ctx.boxAnnotations.length);
    if (__VLS_ctx.isLoadingBoxAnnotations) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-light text-dark" },
        });
    }
    if (__VLS_ctx.boxAnnotations.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "box-annotation-list mb-3" },
        });
        for (const [box] of __VLS_getVForSourceType((__VLS_ctx.boxAnnotations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.isLoadingTask))
                            return;
                        if (!!(!__VLS_ctx.currentTask))
                            return;
                        if (!(__VLS_ctx.boxAnnotations.length > 0))
                            return;
                        __VLS_ctx.activeBoxClientId = box.clientId;
                    } },
                key: (`list-${box.clientId}`),
                ...{ class: "box-annotation-list-item" },
                ...{ class: ({ 'box-annotation-list-item-active': __VLS_ctx.activeBoxClientId === box.clientId }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (box.labelName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted d-block" },
            });
            (__VLS_ctx.formatBoxAnnotation(box));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.isLoadingTask))
                            return;
                        if (!!(!__VLS_ctx.currentTask))
                            return;
                        if (!(__VLS_ctx.boxAnnotations.length > 0))
                            return;
                        __VLS_ctx.removeBoxAnnotation(box.clientId);
                    } },
                type: "button",
                ...{ class: "btn btn-outline-danger btn-sm mb-0" },
                disabled: (__VLS_ctx.isSavingBoxAnnotations),
            });
        }
    }
    if (__VLS_ctx.boxAnnotationError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-danger d-block mb-3" },
        });
        (__VLS_ctx.boxAnnotationError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex gap-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isLoadingTask))
                    return;
                if (!!(!__VLS_ctx.currentTask))
                    return;
                __VLS_ctx.markSensitiveAnonymizerLabels(true);
            } },
        type: "button",
        ...{ class: "btn btn-outline-primary btn-sm mb-0" },
        disabled: (!__VLS_ctx.hasAnonymizerSensitiveLabels),
        'data-test': "anonymizer-sensitive-present-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isLoadingTask))
                    return;
                if (!!(!__VLS_ctx.currentTask))
                    return;
                __VLS_ctx.markSensitiveAnonymizerLabels(false);
            } },
        type: "button",
        ...{ class: "btn btn-outline-primary btn-sm mb-0" },
        disabled: (!__VLS_ctx.hasAnonymizerSensitiveLabels),
        'data-test': "anonymizer-sensitive-absent-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isLoadingTask))
                    return;
                if (!!(!__VLS_ctx.currentTask))
                    return;
                __VLS_ctx.markAllAnonymizerLabels(true);
            } },
        type: "button",
        ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
        disabled: (!__VLS_ctx.hasAnyAnonymizerLabels),
        'data-test': "anonymizer-all-visible-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearAnonymizerLabels) },
        type: "button",
        ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
        disabled: (!__VLS_ctx.hasAnyAnonymizerLabels),
        'data-test': "anonymizer-clear-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "anonymizer-field-grid" },
    });
    for (const [field] of __VLS_getVForSourceType((__VLS_ctx.anonymizerFieldRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            key: (field.key),
            ...{ class: "anonymizer-field-option border rounded p-2" },
            ...{ class: ({ 'anonymizer-field-option-missing': field.labelId === null }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!!(__VLS_ctx.isLoadingTask))
                        return;
                    if (!!(!__VLS_ctx.currentTask))
                        return;
                    __VLS_ctx.setAnonymizerFieldSelected(field.key, __VLS_ctx.getCheckboxChecked($event));
                } },
            id: (`anonymizer-field-${field.key}`),
            ...{ class: "form-check-input" },
            type: "checkbox",
            checked: (field.selected),
            disabled: (field.labelId === null),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "form-check-label" },
        });
        (field.label);
        if (field.labelName) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-muted" },
            });
            (field.labelName);
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge bg-warning-subtle text-warning-emphasis" },
            });
        }
    }
    if (__VLS_ctx.missingAnonymizerFieldLabels.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block mt-2" },
        });
        (__VLS_ctx.missingAnonymizerFieldLabels.join(', '));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 d-flex gap-2 flex-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitLabels) },
        ...{ class: "btn btn-success sidebar-action-button" },
        disabled: (__VLS_ctx.isSubmitting),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitPositiveExample) },
        ...{ class: "btn btn-outline-success sidebar-action-button" },
        disabled: (__VLS_ctx.isSubmitting),
        'data-test': "positive-example-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitNegativeExample) },
        ...{ class: "btn btn-outline-danger sidebar-action-button" },
        disabled: (__VLS_ctx.isSubmitting),
        'data-test': "negative-example-button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSelectedLabels) },
        ...{ class: "btn btn-outline-secondary sidebar-action-button" },
        disabled: (__VLS_ctx.isSubmitting),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.skipTask) },
        ...{ class: "btn btn-outline-warning sidebar-action-button" },
        disabled: (__VLS_ctx.isSubmitting),
        'data-test': "exclude-dataset-button",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
if (__VLS_ctx.visibleErrorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger mb-0" },
        role: "alert",
    });
    (__VLS_ctx.visibleErrorMessage);
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-8']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['annotator-override-input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-8']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['task-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-image-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-image']} */ ;
/** @type {__VLS_StyleScopedClasses['frame-image-status']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-layer']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-rect']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-rect-active']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-rect']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-rect-draft']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['label-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['label-option']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-secondary-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-info-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-6']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-list']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-list-item']} */ ;
/** @type {__VLS_StyleScopedClasses['box-annotation-list-item-active']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymizer-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymizer-field-option']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymizer-field-option-missing']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning-subtle']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning-emphasis']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ANONYMIZER_INFORMATION_SOURCE: ANONYMIZER_INFORMATION_SOURCE,
            PHI_REGION_LABEL_NAME: PHI_REGION_LABEL_NAME,
            NO_DATASET_OPTION: NO_DATASET_OPTION,
            queueStore: queueStore,
            isLoadingTask: isLoadingTask,
            isSubmitting: isSubmitting,
            currentTask: currentTask,
            selectedLabelIds: selectedLabelIds,
            isLoadingLabelGroups: isLoadingLabelGroups,
            labelGroupLoadError: labelGroupLoadError,
            labelGroupOptions: labelGroupOptions,
            aiDatasetOptions: aiDatasetOptions,
            isLoadingAiDatasets: isLoadingAiDatasets,
            aiDatasetLoadError: aiDatasetLoadError,
            annotatorOverrideInput: annotatorOverrideInput,
            frameImageElement: frameImageElement,
            frameStageElement: frameStageElement,
            frameImageRequestUrl: frameImageRequestUrl,
            selectedBoxLabelId: selectedBoxLabelId,
            boxAnnotations: boxAnnotations,
            draftBox: draftBox,
            activeBoxClientId: activeBoxClientId,
            isLoadingBoxAnnotations: isLoadingBoxAnnotations,
            isSavingBoxAnnotations: isSavingBoxAnnotations,
            boxAnnotationError: boxAnnotationError,
            selectedLabelGroupId: selectedLabelGroupId,
            taskMode: taskMode,
            targetLabelName: targetLabelName,
            filterLabelName: filterLabelName,
            allowRandomFallback: allowRandomFallback,
            selectedAiDatasetId: selectedAiDatasetId,
            informationSource: informationSource,
            annotationLabelOptions: annotationLabelOptions,
            isPhiRegionMode: isPhiRegionMode,
            phiRegionReturnRoute: phiRegionReturnRoute,
            phiRegionBoxLabel: phiRegionBoxLabel,
            isPhiRegionBoxLabelMissing: isPhiRegionBoxLabelMissing,
            isPatienteninformationenDatasetSelected: isPatienteninformationenDatasetSelected,
            showFrameImageStatus: showFrameImageStatus,
            frameImageStatusMessage: frameImageStatusMessage,
            visibleErrorMessage: visibleErrorMessage,
            baseAnnotatorPrincipal: baseAnnotatorPrincipal,
            isAnnotatorOverrideActive: isAnnotatorOverrideActive,
            canApplyAnnotatorOverride: canApplyAnnotatorOverride,
            activeAnnotatorLabel: activeAnnotatorLabel,
            manualAnnotationState: manualAnnotationState,
            predictionAnnotationState: predictionAnnotationState,
            anonymizerFieldRows: anonymizerFieldRows,
            hasAnyAnonymizerLabels: hasAnyAnonymizerLabels,
            hasAnonymizerSensitiveLabels: hasAnonymizerSensitiveLabels,
            missingAnonymizerFieldLabels: missingAnonymizerFieldLabels,
            clearSelectedLabels: clearSelectedLabels,
            applySuggestedLabels: applySuggestedLabels,
            getCheckboxChecked: getCheckboxChecked,
            setAnonymizerFieldSelected: setAnonymizerFieldSelected,
            markSensitiveAnonymizerLabels: markSensitiveAnonymizerLabels,
            markAllAnonymizerLabels: markAllAnonymizerLabels,
            clearAnonymizerLabels: clearAnonymizerLabels,
            useAnonymizerInformationSource: useAnonymizerInformationSource,
            usePhiRegionAnnotationPreset: usePhiRegionAnnotationPreset,
            handleFrameImageLoad: handleFrameImageLoad,
            handleFrameImageError: handleFrameImageError,
            startBoxDraft: startBoxDraft,
            updateBoxDraft: updateBoxDraft,
            finishBoxDraft: finishBoxDraft,
            cancelBoxDraft: cancelBoxDraft,
            boxAnnotationStyle: boxAnnotationStyle,
            formatBoxAnnotation: formatBoxAnnotation,
            removeBoxAnnotation: removeBoxAnnotation,
            clearBoxAnnotations: clearBoxAnnotations,
            submitEmptyPhiBackgroundFrame: submitEmptyPhiBackgroundFrame,
            submitBoxAnnotations: submitBoxAnnotations,
            formatConfidence: formatConfidence,
            restartAnnotationAsOverride: restartAnnotationAsOverride,
            revertAnnotatorOverride: revertAnnotatorOverride,
            loadLabelGroups: loadLabelGroups,
            submitLabels: submitLabels,
            submitPositiveExample: submitPositiveExample,
            submitNegativeExample: submitNegativeExample,
            skipTask: skipTask,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
