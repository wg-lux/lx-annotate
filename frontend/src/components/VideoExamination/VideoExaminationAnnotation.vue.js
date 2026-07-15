import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useMediaTypeStore } from '@/stores/mediaTypeStore';
import axiosInstance, { r } from '@/api/axiosInstance';
import { endpoints } from '@/types/api/endpoints';
import { fetchAiDatasetOptions } from '@/api/aiDatasetApi';
import Timeline from '@/components/VideoExamination/Timeline.vue';
import { storeToRefs } from 'pinia';
import { useToastStore } from '@/stores/toastStore';
import { formatTime, getTranslationForLabel, getColorForLabel } from '@/utils/videoUtils';
import { buildVideoStreamUrl } from '@/utils/mediaUrls';
import { useRoute, useRouter } from 'vue-router';
import { useAuthKcStore } from '@/stores/auth_kc';
import { clearAnnotatorOverride, getAnnotatorPrincipalFromAuthUser, loadAnnotatorOverride, saveAnnotatorOverride } from '@/utils/annotationPrincipal';
const route = useRoute(); // ①
const router = useRouter();
// ------------------------------------------------------------------
// pick the number once when the view is created
// ------------------------------------------------------------------
const initialVideoId = Number(route.query.video ?? '') || null;
// Store setup
const videoStore = useVideoStore();
const mediaStore = useMediaTypeStore();
const authStore = useAuthKcStore();
const videoStoreRefs = storeToRefs(videoStore);
const { videoList, videoStreamUrl, timelineSegments } = videoStoreRefs;
const predictionModels = videoStoreRefs.predictionModels ?? ref([]);
const defaultHuggingfaceModelId = videoStoreRefs.defaultHuggingfaceModelId ?? ref('');
const defaultPredictionLabelsetName = videoStoreRefs.defaultPredictionLabelsetName ?? ref('');
const videos = computed(() => videoList.value.videos);
const { allSegments: rawSegments } = storeToRefs(videoStore);
const anonymizationStore = useAnonymizationStore();
const { overview } = storeToRefs(anonymizationStore);
// Use spread operator to convert readonly array to mutable array
const timelineLabels = computed(() => {
    const storeLabels = videoStore.labels || [];
    return [...storeLabels]; // Convert readonly array to mutable array
});
function getVideoOverviewItem(videoId) {
    return overview.value.find((o) => o.id === videoId && o.mediaType === 'video');
}
function getVideoAnonymizationStatus(videoId) {
    return getVideoOverviewItem(videoId)?.anonymizationStatus || 'unknown';
}
function canViewProcessedVideo(videoId) {
    const item = getVideoOverviewItem(videoId);
    return (item?.anonymizationStatus === 'done_processing_anonymization' ||
        item?.anonymizationStatus === 'validated');
}
function canAnnotateSegments(videoId) {
    return (getVideoOverviewItem(videoId)?.anonymizationStatus === 'validated' ||
        isAnnotationFinished(videoId));
}
function isAnnotationFinished(videoId) {
    return getVideoSegmentAnnotationStatus(videoId) === 'validated';
}
function getVideoSegmentAnnotationStatus(videoId) {
    const video = videoList.value.videos.find((v) => v.id === videoId);
    if (video?.segmentAnnotationStatus)
        return video.segmentAnnotationStatus;
    return video?.segmentAnnotationsValidated ? 'validated' : 'not_started';
}
function isSegmentCleanupPending(videoId) {
    const status = getVideoSegmentAnnotationStatus(videoId);
    return status === 'cleanup_queued' || status === 'cleanup_running';
}
function isSegmentCleanupFailed(videoId) {
    const status = getVideoSegmentAnnotationStatus(videoId);
    return status === 'cleanup_failed' || status === 'cleanup_required';
}
// Reactive data
const selectedVideoId = ref(initialVideoId);
const currentTime = ref(0);
const duration = ref(0);
const fps = computed(() => videoStore.effectiveFps);
const isPlaying = ref(false); // ✅ NEW: Track video playing state
const examinationMarkers = ref([]);
const savedExaminations = ref([]);
const currentMarker = ref(null);
const selectedLabelType = ref('');
const isLabelSelectActive = ref(false);
const isMarkingLabel = ref(false);
const labelMarkingStart = ref(0);
const selectedSegmentId = ref(null);
const isInitialLoading = ref(true);
const lastValidationClickedVideoId = ref(null);
const validationRequestVideoId = ref(null);
const segmentSourceMode = ref('manual');
const segmentAiDatasetOptions = ref([]);
const isLoadingSegmentAiDatasets = ref(false);
const segmentAiDatasetError = ref('');
const isImportingPredictionSegments = ref(false);
const predictionModelMode = ref('local');
const selectedPredictionModelMetaId = ref(null);
const huggingFaceModelId = ref('');
const isRerunningPredictionSegments = ref(false);
const annotatorOverride = ref(null);
const annotatorOverrideInput = ref('');
// Video detail and metadata like VideoClassificationComponent
const videoDetail = ref(null);
const videoMeta = ref(null);
// Error and success messages for Bootstrap alerts
const errorMessage = ref('');
const messageTone = ref('hint');
const successMessage = ref('');
const isFullscreen = ref(false);
const isValidatingSegments = computed(() => validationRequestVideoId.value !== null);
const outsideBlackeningRequestVideoIds = ref(new Set());
const isBlackeningOutsideSegments = computed(() => selectedVideoId.value !== null &&
    outsideBlackeningRequestVideoIds.value.has(selectedVideoId.value));
const activeValidationIndicatorVideoId = computed(() => validationRequestVideoId.value ?? lastValidationClickedVideoId.value);
// Template refs
const videoRef = ref(null);
const videoContainerRef = ref(null);
const labelSelectRef = ref(null);
const timelineRef = ref(null);
const videoDropdownRef = ref(null);
const isVideoDropdownOpen = ref(false);
const videoDropdownSearch = ref('');
const videoDropdownFilter = ref('all');
const videoSensitiveMetaMap = ref({});
// Video Dropdown Watcher
const selectedSegmentAiDatasetId = computed({
    get: () => videoStore.segmentAiDatasetId ?? '',
    set: (value) => {
        videoStore.setSegmentAiDatasetId(value || null);
    }
});
async function loadSegmentAiDatasetOptions() {
    isLoadingSegmentAiDatasets.value = true;
    segmentAiDatasetError.value = '';
    try {
        segmentAiDatasetOptions.value = await fetchAiDatasetOptions();
    }
    catch (error) {
        console.error('[VideoExamination] AI dataset list could not be loaded:', error);
        segmentAiDatasetError.value = 'KI-Datensätze konnten nicht geladen werden.';
    }
    finally {
        isLoadingSegmentAiDatasets.value = false;
    }
}
const hasUnsavedChanges = computed(() => rawSegments.value.some((s) => s.isDirty &&
    s.videoID === selectedVideoId.value &&
    (segmentSourceMode.value === 'all' || s.segmentOrigin === segmentSourceMode.value)));
async function loadSelectedVideo() {
    if (selectedVideoId.value == null) {
        videoStore.clearVideo();
        videoDetail.value = null;
        videoMeta.value = null;
        return;
    }
    if (!canViewProcessedVideo(selectedVideoId.value)) {
        videoStore.clearVideo();
        videoDetail.value = null;
        videoMeta.value = null;
        duration.value = 0;
        savedExaminations.value = [];
        examinationMarkers.value = [];
        currentMarker.value = null;
        selectedSegmentId.value = null;
        showErrorMessage(`Video ${selectedVideoId.value} kann noch nicht in der Segmentansicht geöffnet werden. Status: ${getStatusText(getVideoAnonymizationStatus(selectedVideoId.value))}.`);
        return;
    }
    // Clear previous error messages when changing videos
    clearErrorMessage();
    clearSuccessMessage();
    try {
        await videoStore.loadVideo(selectedVideoId.value);
        await loadVideoDetail(selectedVideoId.value);
        await guarded(loadSavedExaminations());
        await guarded(loadVideoMetadata());
        console.log('Video fully loaded:', selectedVideoId.value);
    }
    catch (err) {
        console.error('loadSelectedVideo failed', err);
        await guarded(Promise.reject(err));
    }
}
function onVideoChange() {
    // handler for the <select>
    /** update the url so users can bookmark / refresh */
    router.replace({ query: { video: selectedVideoId.value } });
}
function toggleVideoDropdown() {
    if (!hasVideos.value)
        return;
    isVideoDropdownOpen.value = !isVideoDropdownOpen.value;
    if (isVideoDropdownOpen.value) {
        loadSensitiveMetaForVideos(videos.value.map((v) => v.id));
    }
}
function closeVideoDropdown() {
    isVideoDropdownOpen.value = false;
    videoDropdownSearch.value = '';
}
function selectVideoFromDropdown(videoId) {
    const selected = videos.value.find((video) => video.id === videoId);
    if (!selected)
        return;
    selectedVideoId.value = videoId;
    onVideoChange();
    closeVideoDropdown();
}
function enableSegmentEditing() {
    if (selectedVideoId.value === null)
        return;
    router.push({
        query: {
            ...route.query,
            video: String(selectedVideoId.value),
            editSegments: '1'
        }
    });
}
const handleDocumentClick = (event) => {
    const target = event.target;
    if (!(target instanceof Node))
        return;
    if (!videoDropdownRef.value)
        return;
    if (!videoDropdownRef.value.contains(target)) {
        closeVideoDropdown();
    }
};
const parseDobToDate = (rawDob) => {
    if (!rawDob)
        return null;
    const trimmed = rawDob.trim();
    if (!trimmed)
        return null;
    const isoCandidate = new Date(trimmed);
    if (!Number.isNaN(isoCandidate.getTime()))
        return isoCandidate;
    const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (deMatch) {
        const [, day, month, year] = deMatch;
        const parsed = new Date(Number(year), Number(month) - 1, Number(day));
        if (!Number.isNaN(parsed.getTime()))
            return parsed;
    }
    return null;
};
const getAgeFromDob = (rawDob) => {
    const dob = parseDobToDate(rawDob);
    if (!dob)
        return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDelta = today.getMonth() - dob.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age >= 0 ? age : null;
};
const normalizeGenderLabel = (value) => {
    if (!value)
        return 'Unbekannt';
    const normalized = value.toLowerCase();
    if (normalized === 'male' || normalized === 'männlich')
        return 'Männlich';
    if (normalized === 'female' || normalized === 'weiblich')
        return 'Weiblich';
    if (normalized === 'diverse')
        return 'Divers';
    return value;
};
const getVideoPatientGender = (videoId) => {
    return normalizeGenderLabel(videoSensitiveMetaMap.value[videoId]?.patient_gender_name);
};
const getVideoPatientAgeLabel = (videoId) => {
    const age = getAgeFromDob(videoSensitiveMetaMap.value[videoId]?.patient_dob);
    return age == null ? 'Unbekannt' : `${age} J.`;
};
const loadSensitiveMetaForVideos = async (videoIds) => {
    const missingIds = videoIds.filter((id) => !(id in videoSensitiveMetaMap.value));
    if (missingIds.length === 0)
        return;
    const results = await Promise.all(missingIds.map(async (id) => {
        try {
            const { data } = await axiosInstance.get(r(`media/videos/${id}/sensitive-metadata/`));
            return { id, data };
        }
        catch {
            return { id, data: { patient_dob: null, patient_gender_name: null } };
        }
    }));
    const nextMap = { ...videoSensitiveMetaMap.value };
    results.forEach(({ id, data }) => {
        nextMap[id] = {
            patient_dob: data?.patientDob ?? data?.patient_dob ?? null,
            patient_gender_name: data?.patientGenderName ?? data?.patient_gender_name ?? null
        };
    });
    videoSensitiveMetaMap.value = nextMap;
};
const selectableVideos = computed(() => videoList.value.videos);
const usableVideos = computed(() => videos.value.filter((v) => canViewProcessedVideo(v.id)));
const filteredSelectableVideos = computed(() => {
    const query = videoDropdownSearch.value.trim().toLowerCase();
    const statusFilteredVideos = selectableVideos.value.filter((video) => isVideoVisibleForDropdownFilter(video.id));
    if (!query)
        return statusFilteredVideos;
    return statusFilteredVideos.filter((video) => {
        const searchable = [
            String(video.id),
            video.original_file_name,
            video.centerName,
            video.centerKey,
            getVideoPatientGender(video.id),
            getVideoPatientAgeLabel(video.id),
            getVideoValidatedAnnotatorLabel(video.id),
            getVideoDropdownStatusText(video.id)
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return searchable.includes(query);
    });
});
const annotatableVideos = computed(() => usableVideos.value.filter((v) => !isAnnotationFinished(v.id)));
const pendingValidationVideos = computed(() => usableVideos.value.filter((v) => !v.segmentAnnotationsValidated));
const selectedVideo = computed(() => {
    if (selectedVideoId.value == null)
        return undefined;
    return selectableVideos.value.find((v) => v.id === selectedVideoId.value);
});
const isSelectedVideoValidated = computed(() => selectedVideoId.value != null && isAnnotationFinished(selectedVideoId.value));
const isSelectedVideoViewable = computed(() => selectedVideoId.value != null && canViewProcessedVideo(selectedVideoId.value));
const canAnnotateSelectedVideo = computed(() => selectedVideoId.value != null && canAnnotateSegments(selectedVideoId.value));
const selectedPostValidationRebuildDetails = computed(() => {
    const details = selectedVideo.value?.postValidationRebuild?.details;
    return typeof details === 'string' && details.trim() ? details.trim() : '';
});
const canBlackenOutsideSegments = computed(() => selectedVideoId.value !== null &&
    canAnnotateSelectedVideo.value &&
    !isSegmentCleanupPending(selectedVideoId.value) &&
    !outsideBlackeningRequestVideoIds.value.has(selectedVideoId.value));
const videoDropdownFilterOptions = computed(() => [
    { value: 'all', label: `Alle (${videos.value.length})` },
    { value: 'usable', label: `Nutzbar (${usableVideos.value.length})` },
    {
        value: 'pending_anonymization_validation',
        label: `Anonymisierung prüfen (${getVideoCountByDropdownStatus('pending_anonymization_validation')})`
    },
    {
        value: 'ready_for_annotation',
        label: `Bereit (${getVideoCountByDropdownStatus('ready_for_annotation')})`
    },
    {
        value: 'annotation_cleanup_pending',
        label: `Validierung läuft (${getVideoCountByDropdownStatus('annotation_cleanup_pending')})`
    },
    {
        value: 'annotation_cleanup_failed',
        label: `Validierung prüfen (${getVideoCountByDropdownStatus('annotation_cleanup_failed')})`
    },
    {
        value: 'annotation_validated',
        label: `Segmentvalidiert (${getVideoCountByDropdownStatus('annotation_validated')})`
    },
    {
        value: 'not_usable',
        label: `Nicht nutzbar (${getVideoCountByDropdownStatus('not_usable')})`
    }
]);
function isVideoVisibleForDropdownFilter(videoId) {
    const activeFilter = videoDropdownFilter.value;
    if (activeFilter === 'all')
        return true;
    if (activeFilter === 'usable')
        return canViewProcessedVideo(videoId);
    return getVideoDropdownStatus(videoId) === activeFilter;
}
const isSegmentEditingUnlocked = computed(() => route.query.editSegments === '1');
const baseAnnotatorPrincipal = computed(() => getAnnotatorPrincipalFromAuthUser(authStore.user));
const annotatorOverrideScope = computed(() => selectedVideoId.value == null ? 'video:none' : `video:${selectedVideoId.value}`);
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
function getVideoValidatedAnnotators(videoId) {
    const video = selectableVideos.value.find((v) => v.id === videoId);
    const annotators = video?.validatedAnnotators ?? [];
    return [...new Set(annotators.map((annotator) => String(annotator).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
function hasOtherValidatedAnnotator(videoId) {
    return getVideoValidatedAnnotators(videoId).some((annotator) => annotator !== activeAnnotatorPrincipal.value);
}
function getVideoValidatedAnnotatorLabel(videoId) {
    const annotators = getVideoValidatedAnnotators(videoId);
    if (!annotators.length)
        return '';
    const prefix = hasOtherValidatedAnnotator(videoId) ? 'Vorannotation von' : 'Validiert von';
    return `${prefix}: ${annotators.join(', ')}`;
}
const isSegmentReadOnlyByValidation = computed(() => isSelectedVideoValidated.value);
const hasSegmentEditOverride = computed(() => isSegmentEditingUnlocked.value || isAnnotatorOverrideActive.value);
const canMutateSelectedSegments = computed(() => canAnnotateSelectedVideo.value &&
    (selectedVideoId.value === null || !isSegmentCleanupPending(selectedVideoId.value)) &&
    (!isSegmentReadOnlyByValidation.value || hasSegmentEditOverride.value));
const predictionModelOptions = computed(() => predictionModels.value ?? []);
const selectedPredictionModel = computed(() => predictionModelOptions.value.find((model) => model.id === selectedPredictionModelMetaId.value) ?? null);
const canRerunPredictionSegments = computed(() => {
    if (selectedVideoId.value === null ||
        isRerunningPredictionSegments.value ||
        !canMutateSelectedSegments.value) {
        return false;
    }
    if (predictionModelMode.value === 'huggingface') {
        return huggingFaceModelId.value.trim().length > 0;
    }
    return selectedPredictionModel.value !== null;
});
function formatPredictionModelOption(model) {
    const activeSuffix = model.isActive ? ' · aktiv' : '';
    return `${model.modelName} / ${model.name} v${model.version}${activeSuffix}`;
}
const selectedVideoLabel = computed(() => {
    if (!selectableVideos.value.length)
        return 'Keine Videos verfügbar';
    if (selectedVideoId.value == null)
        return 'Bitte Video auswählen...';
    const video = selectableVideos.value.find((v) => v.id === selectedVideoId.value);
    if (!video)
        return `Video ${selectedVideoId.value}`;
    return video.original_file_name || `Video Nr. ${video.id}`;
});
watch(videos, (videos) => {
    if (!videos.length)
        return;
    loadSensitiveMetaForVideos(videos.map((v) => v.id));
}, { immediate: true });
watch(predictionModelOptions, (models) => {
    if (selectedPredictionModelMetaId.value !== null || models.length === 0)
        return;
    const activeModel = models.find((model) => model.isActive);
    selectedPredictionModelMetaId.value = activeModel?.id ?? models[0].id;
}, { immediate: true });
watch(defaultHuggingfaceModelId, (modelId) => {
    if (!huggingFaceModelId.value.trim()) {
        huggingFaceModelId.value = modelId;
    }
}, { immediate: true });
function syncAnnotatorOverrideFromStorage() {
    annotatorOverride.value = loadAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value);
    annotatorOverrideInput.value = annotatorOverride.value ?? '';
}
function restartVideoAnnotationAsOverride() {
    const normalized = annotatorOverrideInput.value.trim();
    if (!normalized)
        return;
    saveAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value, normalized);
    annotatorOverride.value = normalized;
    clearErrorMessage();
    clearSuccessMessage();
}
function revertVideoAnnotatorOverride() {
    clearAnnotatorOverride(annotatorOverrideScope.value, baseAnnotatorPrincipal.value);
    annotatorOverride.value = null;
    annotatorOverrideInput.value = '';
}
watch([baseAnnotatorPrincipal, annotatorOverrideScope], () => {
    syncAnnotatorOverrideFromStorage();
}, { immediate: true });
// Video streaming URL using MediaStore logic like AnonymizationValidationComponent
const anonymizedVideoSrc = computed(() => {
    if (!selectedVideoId.value)
        return undefined;
    if (!canViewProcessedVideo(selectedVideoId.value))
        return undefined;
    return buildVideoStreamUrl(selectedVideoId.value, 'processed');
});
const hasVideos = computed(() => {
    return videos.value.length > 0;
});
const noVideosMessage = computed(() => {
    if (videos.value.length === 0) {
        return 'Keine Videos verfügbar. Bitte laden Sie zuerst Videos hoch.';
    }
    return '';
});
const timelineSegmentsForSelectedVideo = computed(() => {
    if (!selectedVideoId.value)
        return [];
    return rawSegments.value.filter((s) => s.videoID === selectedVideoId.value);
});
const canStartLabeling = computed(() => {
    return (selectedVideoId.value &&
        anonymizedVideoSrc.value &&
        selectedLabelType.value &&
        !isMarkingLabel.value &&
        duration.value > 0 &&
        canMutateSelectedSegments.value);
});
// ✅ PRIORITY: Load labels first, then videos, then anonymization status
onMounted(async () => {
    console.log('🚀 [VideoExamination] Component mounted - loading data in priority order...');
    isInitialLoading.value = true;
    try {
        // Step 1: Load labels with high priority
        await videoStore.fetchLabels();
        console.log(`✅ [VideoExamination] Labels loaded: ${videoStore.labels.length}`);
        try {
            if (typeof videoStore.fetchPredictionModels === 'function') {
                await videoStore.fetchPredictionModels();
            }
        }
        catch (error) {
            console.warn('[VideoExamination] Prediction model list could not be loaded:', error);
        }
        await loadSegmentAiDatasetOptions();
        // Step 2: Load anonymization overview BEFORE videos (needed for filtering)
        await anonymizationStore.fetchOverview();
        console.log(`✅ [VideoExamination] Anonymization status loaded: ${overview.value.length} items`);
        // Step 3: Load videos after labels and anonymization status are available
        await videoStore.fetchAllVideos();
        pollExistingSegmentCleanupVideos();
        console.log(`✅ [VideoExamination] Videos loaded: ${videoStore.videoList.videos.length}`);
        console.log(`✅ [VideoExamination] Annotatable videos: ${annotatableVideos.value.length}`);
        if (selectedVideoId.value !== null) {
            videoStore.setCurrentVideo(selectedVideoId.value);
            await loadSelectedVideo();
            if (canViewProcessedVideo(selectedVideoId.value)) {
                await loadVideoSegments();
            }
        }
    }
    catch (error) {
        console.error('❌ [VideoExamination] Error during initial load:', error);
        showErrorMessage('Fehler beim Laden der Daten. Bitte Seite neu laden.');
    }
    finally {
        isInitialLoading.value = false;
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
});
onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
// Guarded function for error handling like VideoClassificationComponent
function isAbortLikeError(error) {
    const message = String(error?.message || error?.target?.error?.message || error || '').toLowerCase();
    const code = error?.code || error?.target?.error?.code;
    const mediaAbortCode = typeof MediaError !== 'undefined' ? MediaError.MEDIA_ERR_ABORTED : 1;
    return (code === 20 ||
        code === mediaAbortCode ||
        error?.name === 'AbortError' ||
        error?.code === 'ERR_CANCELED' ||
        message.includes('ns_binding_aborted') ||
        message.includes('binding aborted') ||
        message.includes('aborted') ||
        message.includes('canceled') ||
        message.includes('cancelled'));
}
async function guarded(p) {
    try {
        return await p;
    }
    catch (e) {
        if (isAbortLikeError(e)) {
            console.debug('[VideoExamination] Ignoring aborted request/media load:', e);
            return undefined;
        }
        const errorMsg = e?.response?.data?.detail || e?.response?.data?.error || e?.message || String(e);
        showErrorMessage(errorMsg);
        return undefined;
    }
}
watch(videoStreamUrl, (newUrl) => {
    console.log('Video stream URL updated:', newUrl);
});
// Alert management methods
const clearErrorMessage = () => {
    errorMessage.value = '';
    messageTone.value = 'hint';
};
const clearSuccessMessage = () => {
    successMessage.value = '';
};
const showSuccessMessage = (message) => {
    successMessage.value = message;
    // Auto-clear after 5 seconds
    setTimeout(() => {
        clearSuccessMessage();
    }, 5000);
};
const showErrorMessage = (message, tone = 'hint') => {
    errorMessage.value = message;
    messageTone.value = tone;
};
function getSegmentMutationBlockedMessage() {
    if (selectedVideoId.value !== null && !canAnnotateSegments(selectedVideoId.value)) {
        return 'Segmentbearbeitung ist erst nach validierter Anonymisierung möglich.';
    }
    return 'Dieses Video ist bereits validiert und wird schreibgeschützt angezeigt.';
}
// Load video detail from backend like VideoClassificationComponent
const loadVideoDetail = async (videoId) => {
    if (!videoId)
        return;
    try {
        console.log('Loading video detail for ID:', videoId);
        const response = await axiosInstance.get(r(endpoints.media.videoDetail(videoId)));
        console.log('Video detail response:', response.data);
        videoDetail.value = {};
        videoMeta.value = {
            duration: Number(response.data.duration ?? 0)
        };
        // Update MediaStore with the current video for consistent URL handling
        const currentVideo = selectableVideos.value.find((v) => v.id === videoId);
        if (currentVideo) {
            mediaStore.rememberType(videoId, 'video', 'video');
            mediaStore.setCurrentItem({
                ...currentVideo,
                id: videoId,
                scope: 'video',
                mediaType: 'video',
                filename: currentVideo.original_file_name,
                processedStreamUrl: buildVideoStreamUrl(videoId, 'processed')
            });
            console.log('MediaStore updated with video:', videoId);
        }
        // Update local duration if available
        if (videoMeta.value.duration > 0) {
            duration.value = videoMeta.value.duration;
        }
        console.log('Video meta loaded:', videoMeta.value);
        console.log('Stream source will be:', anonymizedVideoSrc.value);
    }
    catch (error) {
        console.error('Error loading video detail:', error);
        await guarded(Promise.reject(error));
    }
};
const loadSavedExaminations = async () => {
    // The deployed API has no per-video saved-examination resource. Keep this
    // optional legacy UI empty instead of issuing a guaranteed 404 request.
    savedExaminations.value = [];
    examinationMarkers.value = [];
};
const loadVideoMetadata = async () => {
    if (videoRef.value) {
        await new Promise((resolve) => {
            const video = videoRef.value;
            if (video.readyState >= 1) {
                duration.value = video.duration;
                resolve();
            }
            else {
                video.addEventListener('loadedmetadata', () => {
                    duration.value = video.duration;
                    resolve();
                }, { once: true });
            }
        });
    }
};
async function loadVideoSegments() {
    if (selectedVideoId.value === null)
        return;
    if (!canViewProcessedVideo(selectedVideoId.value))
        return;
    try {
        await videoStore.fetchAllSegments(selectedVideoId.value, true, {
            sourceKind: segmentSourceMode.value
        });
        console.log('Video segments loaded for video:', selectedVideoId.value);
        console.log('Timeline segments count:', rawSegments.value.length);
    }
    catch (error) {
        console.error('Error loading video segments:', error);
    }
}
const handleSegmentSourceChange = async () => {
    selectedSegmentId.value = null;
    await loadVideoSegments();
};
const onVideoLoaded = () => {
    if (videoRef.value) {
        duration.value = videoRef.value.duration;
        // ✅ NEW: Add play/pause event listeners for state tracking
        videoRef.value.addEventListener('play', () => {
            isPlaying.value = true;
        });
        videoRef.value.addEventListener('pause', () => {
            isPlaying.value = false;
        });
        videoRef.value.addEventListener('ended', () => {
            isPlaying.value = false;
        });
        console.log('🎥 Video loaded - Frontend');
        console.log(`- Video source URL: ${anonymizedVideoSrc.value}`);
        console.log(`- Legacy stream URL: ${videoStreamUrl.value}`);
        console.log(`- Video readyState: ${videoRef.value.readyState}`);
        console.log(`- Video networkState: ${videoRef.value.networkState}`);
        if (videoRef.value.videoWidth && videoRef.value.videoHeight) {
            console.log(`- Video dimensions: ${videoRef.value.videoWidth}x${videoRef.value.videoHeight}`);
        }
        if (duration.value < 10) {
            console.warn(`⚠️ WARNING: Video duration seems very short (${duration.value}s)`);
        }
        else {
            showSuccessMessage(`Video geladen: ${Math.round(duration.value)}s Dauer`);
        }
    }
};
const handleTimeUpdate = () => {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
    }
};
const handleTimelineClick = (event) => {
    if (!timelineRef.value || duration.value === 0)
        return;
    const rect = timelineRef.value.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration.value;
    seekToTime(newTime);
};
// TS2322-safe event handlers like VideoClassificationComponent
const handleTimelineSeek = (...args) => {
    const [time] = args;
    seekToTime(time);
};
// Play/pause handler for Timeline
const handlePlayPause = (...args) => {
    if (!videoRef.value)
        return;
    if (videoRef.value.paused) {
        videoRef.value.play().catch((error) => {
            console.error('Error playing video:', error);
            showErrorMessage('Fehler beim Abspielen des Videos');
        });
    }
    else {
        videoRef.value.pause();
    }
};
// Segment selection handler - detects click on segment and sets it for the timeline
const handleSegmentSelect = (...args) => {
    const [segmentId] = args;
    selectedSegmentId.value = segmentId;
    console.log('Segment selected:', segmentId);
};
const handleSegmentLabelChange = (...args) => {
    if (!canMutateSelectedSegments.value)
        return;
    const [segmentId, label, labelId] = args;
    if (!Number.isFinite(segmentId) || !label) {
        console.warn('[VideoExamination] Invalid segment label change:', args);
        return;
    }
    selectedLabelType.value = label;
    if (segmentId < 0) {
        videoStore.patchDraftSegment(segmentId, { label });
    }
    else {
        videoStore.patchSegmentLocally(segmentId, {
            label,
            labelID: labelId
        });
    }
};
const handleSegmentResize = (...args) => {
    if (!canMutateSelectedSegments.value)
        return;
    const [segmentId, newStart, newEnd, _mode, _final] = args;
    if (!Number.isFinite(segmentId)) {
        console.warn('[VideoExamination] Invalid segment ID for resize:', segmentId);
        return;
    }
    if (segmentId < 0) {
        // Draft segment: keep it purely frontend
        videoStore.patchDraftSegment(segmentId, {
            startTime: newStart,
            endTime: newEnd
        });
        videoStore.commitDraft();
    }
    else {
        // Existing segment: patch locally and mark isDirty
        videoStore.patchSegmentLocally(segmentId, {
            startTime: newStart,
            endTime: newEnd
        });
    }
    // ❌ Absolutely no backend call here, this should use the drafts because of the load on the backend.
};
const handleSegmentMove = (...args) => {
    if (!canMutateSelectedSegments.value)
        return;
    const [segmentId, newStart, newEnd, _final] = args;
    if (!Number.isFinite(segmentId)) {
        console.warn('[VideoExamination] Invalid segment ID for move:', segmentId);
        return;
    }
    if (segmentId < 0) {
        videoStore.patchDraftSegment(segmentId, {
            startTime: newStart,
            endTime: newEnd
        });
    }
    else {
        videoStore.patchSegmentLocally(segmentId, {
            startTime: newStart,
            endTime: newEnd
        });
    }
};
const handleTimeSelection = (...args) => {
    if (!canMutateSelectedSegments.value)
        return;
    const [data] = args;
    // ✅ FIXED: Only create segment if we have a selected label type
    if (selectedLabelType.value && selectedVideoId.value) {
        console.log(`Creating segment from time selection: ${formatTime(data.start)} - ${formatTime(data.end)} with label: ${selectedLabelType.value}`);
        handleCreateSegment({
            label: selectedLabelType.value,
            start: data.start,
            end: data.end
        });
    }
    else {
        console.warn('Cannot create segment: no label selected or no video selected');
        showErrorMessage('Bitte wählen Sie ein Label aus, bevor Sie ein Segment erstellen.');
    }
};
const handleCreateSegment = (...args) => {
    const [event] = args;
    return new Promise(async (resolve, reject) => {
        try {
            if (!canMutateSelectedSegments.value) {
                showErrorMessage(getSegmentMutationBlockedMessage());
                resolve();
                return;
            }
            if (segmentSourceMode.value === 'prediction') {
                showErrorMessage('Neue Segmente bitte erst nach dem Übernehmen in die manuellen Annotationen anlegen.');
                resolve();
                return;
            }
            if (selectedVideoId.value) {
                await videoStore.createSegment?.(selectedVideoId.value, event.label, event.start, event.end);
                showSuccessMessage(`Segment erstellt: ${getTranslationForLabel(event.label)}`);
            }
            resolve();
        }
        catch (error) {
            await guarded(Promise.reject(error));
            reject(error);
        }
    });
};
const handleSegmentDelete = (...args) => {
    const [segment] = args;
    return new Promise(async (resolve, reject) => {
        if (!canMutateSelectedSegments.value) {
            showErrorMessage(getSegmentMutationBlockedMessage());
            resolve();
            return;
        }
        if (!segment.id || typeof segment.id !== 'number') {
            console.warn('Cannot delete draft or temporary segment:', segment.id);
            resolve();
            return;
        }
        try {
            if (segmentSourceMode.value === 'prediction') {
                videoStore.removeSegment(segment.id);
                showSuccessMessage(`KI-Segment lokal entfernt: ${getTranslationForLabel(segment.label)}`);
                resolve();
                return;
            }
            const deleted = await videoStore.deleteSegment(segment.id);
            if (!deleted) {
                showErrorMessage(videoStore.errorMessage || 'Segment konnte nicht gelöscht werden.', 'danger');
                resolve();
                return;
            }
            showSuccessMessage(`Segment gelöscht: ${getTranslationForLabel(segment.label)}`);
            resolve();
        }
        catch (err) {
            console.error('Segment konnte nicht gelöscht werden:', err);
            const errorMsg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || String(err);
            showErrorMessage(errorMsg, 'danger');
            reject(err);
        }
    });
};
const seekToTime = (time) => {
    if (videoRef.value && time >= 0 && time <= duration.value) {
        videoRef.value.currentTime = time;
        currentTime.value = time;
    }
};
const onLabelSelect = () => {
    console.log('Label selected:', selectedLabelType.value);
};
const handleFullscreenChange = () => {
    isFullscreen.value = document.fullscreenElement === videoContainerRef.value;
};
const toggleFullscreen = async () => {
    const container = videoContainerRef.value;
    if (!container)
        return;
    try {
        if (document.fullscreenElement === container) {
            await document.exitFullscreen();
        }
        else {
            await container.requestFullscreen();
        }
    }
    catch (error) {
        console.error('Fullscreen toggle failed:', error);
    }
};
const closeLabelOverlay = () => {
    isLabelSelectActive.value = false;
    labelSelectRef.value?.blur();
};
const selectLabelFromOverlay = (labelName) => {
    selectedLabelType.value = labelName;
    closeLabelOverlay();
};
const isEditableTarget = (target) => {
    if (!(target instanceof HTMLElement))
        return false;
    if (target.isContentEditable)
        return true;
    if (target instanceof HTMLSelectElement && isLabelSelectActive.value)
        return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
};
const handleKeyDown = (event) => {
    if (isEditableTarget(event.target))
        return;
    const key = event.key.toLowerCase();
    if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'o') {
        event.preventDefault();
        event.stopPropagation();
        preselectLabelForOverlay();
        isLabelSelectActive.value = true;
        return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'f') {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen();
        return;
    }
    if (isLabelSelectActive.value) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            event.stopPropagation();
            const labels = timelineLabels.value;
            if (labels.length === 0)
                return;
            const currentIndex = labels.findIndex((l) => l.name === selectedLabelType.value);
            const delta = event.key === 'ArrowUp' ? -1 : 1;
            const startIndex = currentIndex === -1 ? (delta > 0 ? -1 : 0) : currentIndex;
            const nextIndex = (startIndex + delta + labels.length) % labels.length;
            selectedLabelType.value = labels[nextIndex].name;
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            closeLabelOverlay();
            return;
        }
    }
    if (event.key === 'Escape') {
        if (isLabelSelectActive.value) {
            event.preventDefault();
            event.stopPropagation();
            closeLabelOverlay();
            return;
        }
        if (isMarkingLabel.value) {
            event.preventDefault();
            cancelLabelMarking();
        }
        return;
    }
    const isPlus = event.key === '+' || event.code === 'NumpadAdd' || (event.code === 'Equal' && event.shiftKey);
    const isMinus = event.key === '-' || event.code === 'Minus' || event.code === 'NumpadSubtract';
    if (isPlus) {
        event.preventDefault();
        startLabelMarking();
        return;
    }
    if (isMinus) {
        event.preventDefault();
        finishLabelMarking();
    }
};
const preselectLabelForOverlay = () => {
    const segments = timelineSegmentsForSelectedVideo.value;
    if (segments.length === 0)
        return;
    if (selectedSegmentId.value !== null) {
        const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId.value);
        if (selectedSegment) {
            selectedLabelType.value = selectedSegment.label;
            return;
        }
    }
    const currentSegment = segments.find((segment) => currentTime.value >= segment.startTime && currentTime.value <= segment.endTime);
    if (currentSegment) {
        selectedLabelType.value = currentSegment.label;
    }
};
const startLabelMarking = () => {
    if (!canStartLabeling.value)
        return;
    if (selectedVideoId.value) {
        videoStore.setCurrentVideo(selectedVideoId.value);
    }
    isMarkingLabel.value = true;
    labelMarkingStart.value = currentTime.value;
    // FIX: Use startDraft statt startDraftSegment
    videoStore.startDraft(selectedLabelType.value, currentTime.value);
    console.log(`Draft gestartet: ${selectedLabelType.value} bei ${formatTime(currentTime.value)}`);
};
const finishLabelMarking = async () => {
    if (!isMarkingLabel.value || !selectedVideoId.value)
        return;
    if (!canMutateSelectedSegments.value) {
        showErrorMessage(getSegmentMutationBlockedMessage());
        cancelLabelMarking();
        return;
    }
    try {
        videoStore.setCurrentVideo(selectedVideoId.value);
        // FIX: Use updateDraftEnd und commitDraft statt finishDraftSegment
        videoStore.updateDraftEnd(currentTime.value);
        const createdSegment = await videoStore.commitDraft();
        if (!createdSegment) {
            showErrorMessage(videoStore.errorMessage || 'Label konnte nicht gespeichert werden.');
            return;
        }
        // Reset state (keep last selected label)
        isMarkingLabel.value = false;
        console.log('Label-Markierung abgeschlossen');
    }
    catch (error) {
        console.error('Error finishing label marking:', error);
    }
};
const cancelLabelMarking = () => {
    videoStore.cancelDraft();
    isMarkingLabel.value = false;
    console.log('Label-Markierung abgebrochen');
};
const jumpToExamination = (examination) => {
    seekToTime(examination.timestamp);
    currentMarker.value =
        examinationMarkers.value.find((m) => m.id === `exam-${examination.id}`) || null;
};
const deleteExamination = async (examinationId) => {
    try {
        await axiosInstance.delete(r(`examinations/${examinationId}/`));
        // Remove from local arrays
        savedExaminations.value = savedExaminations.value.filter((e) => e.id !== examinationId);
        examinationMarkers.value = examinationMarkers.value.filter((m) => m.id !== `exam-${examinationId}`);
        // Clear current marker if it was deleted
        if (currentMarker.value?.id === `exam-${examinationId}`) {
            currentMarker.value = null;
        }
        showSuccessMessage(`Untersuchung ${examinationId} gelöscht`);
        console.log('Examination deleted:', examinationId);
    }
    catch (error) {
        console.error('Error deleting examination:', error);
        const errorMsg = error?.response?.data?.detail ||
            error?.response?.data?.error ||
            error?.message ||
            String(error);
        showErrorMessage(errorMsg, 'danger');
    }
};
const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const segmentValidationPollingPromises = new Map();
const normalizeSegmentValidationResponse = (responseData) => {
    const postProcessingJob = responseData?.postProcessingJob ?? responseData?.post_processing_job;
    const segmentAnnotationStatus = responseData?.segmentAnnotationStatus ?? responseData?.segment_annotation_status;
    return {
        jobStatus: String(postProcessingJob?.status ?? responseData?.status ?? ''),
        segmentAnnotationStatus: (segmentAnnotationStatus ?? 'not_started'),
        message: String(responseData?.error ?? responseData?.message ?? '')
    };
};
const pollSegmentValidationStatus = (videoId, options = {}) => {
    const existingPromise = segmentValidationPollingPromises.get(videoId);
    if (existingPromise)
        return existingPromise;
    const showTerminalMessages = options.showTerminalMessages ?? true;
    const showValidatedMessage = options.showValidatedMessage ?? true;
    const maxAttempts = 120;
    const intervalMs = 5000;
    const pollingPromise = (async () => {
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            if (attempt > 0) {
                await sleep(intervalMs);
            }
            await videoStore.fetchAllVideos();
            const status = getVideoSegmentAnnotationStatus(videoId);
            if (status === 'validated') {
                videoRef.value?.load();
                if (showTerminalMessages && showValidatedMessage) {
                    showSuccessMessage('Segmentvalidierung abgeschlossen.');
                }
                return;
            }
            if (status === 'cleanup_failed') {
                const video = videoList.value.videos.find((v) => v.id === videoId);
                const details = video?.postValidationRebuild?.details;
                if (showTerminalMessages) {
                    showErrorMessage(`Segmentvalidierung fehlgeschlagen${details ? `: ${details}` : '.'}`, 'danger');
                }
                return;
            }
            if (status === 'cleanup_required' || status === 'not_started') {
                if (showTerminalMessages) {
                    showErrorMessage('Segmentvalidierung wartet auf die Nachverarbeitung.', 'danger');
                }
                return;
            }
        }
        if (showTerminalMessages) {
            showSuccessMessage('Segmentvalidierung läuft weiter. Die Videoliste aktualisiert den Status.');
        }
    })().finally(() => {
        segmentValidationPollingPromises.delete(videoId);
    });
    segmentValidationPollingPromises.set(videoId, pollingPromise);
    return pollingPromise;
};
const pollExistingSegmentCleanupVideos = () => {
    videoList.value.videos
        .filter((video) => isSegmentCleanupPending(video.id))
        .forEach((video) => {
        void pollSegmentValidationStatus(video.id, { showTerminalMessages: false });
    });
};
// Validate all video segments (complete video review)
const submitVideoSegments = async (videoId) => {
    if (segmentSourceMode.value === 'prediction') {
        showErrorMessage('KI-Vorhersagen müssen zuerst als manuelle Segmente übernommen werden.');
        return;
    }
    if (!videoId) {
        showErrorMessage('Kein Video ausgewählt');
        return;
    }
    if (!canMutateSelectedSegments.value) {
        showErrorMessage(getSegmentMutationBlockedMessage());
        return;
    }
    if (validationRequestVideoId.value !== null) {
        showErrorMessage(`Validierung für Video ${validationRequestVideoId.value} läuft bereits.`);
        return;
    }
    const segmentsForRequest = [...timelineSegmentsForSelectedVideo.value];
    const segmentCount = segmentsForRequest.length;
    if (segmentCount === 0) {
        showErrorMessage('Keine Segmente zum Validieren vorhanden');
        return;
    }
    validationRequestVideoId.value = videoId;
    // Confirm with user before validation
    if (!confirm(`Möchten Sie alle ${segmentCount} Segmentannotationen von Video ${videoId} als validiert markieren? Außerhalb-Segmente werden danach geschwärzt.`)) {
        validationRequestVideoId.value = null;
        return;
    }
    // Build payload including updated start/end times (in seconds)
    const segmentPayload = segmentsForRequest
        .filter((s) => typeof s.id === 'number')
        .map((s) => ({
        id: s.id,
        // assuming Segment has startTime/endTime in seconds
        start_time: s.startTime,
        end_time: s.endTime
    }));
    console.log('🔄 Sending segments to backend:', segmentPayload);
    try {
        console.log(`🔍 Validating all segments for video ${videoId}...`);
        const response = await axiosInstance.post(r(`media/videos/${videoId}/segments/validate-bulk/`), {
            segmentIds: segmentPayload.map((s) => s.id),
            segments: segmentPayload,
            isValidated: true,
            notes: `Vollständige Video-Review abgeschlossen am ${new Date().toLocaleString('de-DE')}`,
            informationSourceName: 'manual_annotation', // or 'manual_validation', see backend
            annotator: activeAnnotatorPrincipal.value
        });
        console.log('✅ Validation response:', response.data);
        const validationState = normalizeSegmentValidationResponse(response.data);
        if (validationState.jobStatus === 'queued' ||
            validationState.jobStatus === 'already_queued' ||
            validationState.segmentAnnotationStatus === 'cleanup_queued' ||
            validationState.segmentAnnotationStatus === 'cleanup_running') {
            showSuccessMessage('Segmentprüfung gespeichert. Nachverarbeitung läuft.');
            await pollSegmentValidationStatus(videoId);
        }
        else if (validationState.jobStatus === 'failed' ||
            validationState.segmentAnnotationStatus === 'cleanup_failed') {
            showErrorMessage(`Validierung fehlgeschlagen${validationState.message ? `: ${validationState.message}` : '.'}`, 'danger');
        }
        else {
            showSuccessMessage(`Erfolgreich! ${response.data.updatedCount} von ${response.data.totalSegments ?? response.data.requestedCount} Segmenten validiert.`);
            await videoStore.fetchAllVideos();
        }
        lastValidationClickedVideoId.value = videoId;
        // Reload segments to reflect validation status + updated times
        await loadVideoSegments();
    }
    catch (error) {
        console.error('❌ Error validating video segments:', error);
        const errorMsg = error?.response?.data?.error || error?.message || 'Unbekannter Fehler';
        showErrorMessage(`Validierung fehlgeschlagen: ${errorMsg}`);
    }
    finally {
        if (validationRequestVideoId.value === videoId) {
            validationRequestVideoId.value = null;
        }
    }
};
const handleValidateAndMark = async (videoId) => {
    if (!videoId) {
        showErrorMessage('Kein Video ausgewählt');
        return;
    }
    await submitVideoSegments(videoId);
};
const setOutsideBlackeningRequestState = (videoId, isPending) => {
    const nextRequestVideoIds = new Set(outsideBlackeningRequestVideoIds.value);
    if (isPending) {
        nextRequestVideoIds.add(videoId);
    }
    else {
        nextRequestVideoIds.delete(videoId);
    }
    outsideBlackeningRequestVideoIds.value = nextRequestVideoIds;
};
const normalizeOutsideBlackeningResponse = (responseData) => {
    const postProcessingJob = responseData?.postProcessingJob ?? responseData?.post_processing_job;
    return {
        outsideSegmentCount: Number(responseData?.outsideSegmentCount ?? responseData?.outside_segment_count ?? 0),
        jobStatus: String(postProcessingJob?.status ?? responseData?.status ?? ''),
        message: String(responseData?.error ?? responseData?.message ?? '')
    };
};
const handleOutsideBlackeningResponseState = (responseState, videoId) => {
    const { outsideSegmentCount, jobStatus, message } = responseState;
    if (jobStatus === 'completed') {
        videoRef.value?.load();
        void videoStore.fetchAllVideos();
        showSuccessMessage(`Außerhalb-Segmente geschwärzt (${outsideSegmentCount} Segmente).`);
        return true;
    }
    if (jobStatus === 'queued') {
        showSuccessMessage(`Schwärzung der Außerhalb-Segmente gestartet (${outsideSegmentCount} Segmente).`);
        void pollSegmentValidationStatus(videoId, { showValidatedMessage: false });
        return true;
    }
    if (jobStatus === 'already_queued') {
        showSuccessMessage('Schwärzung der Außerhalb-Segmente läuft bereits.');
        void pollSegmentValidationStatus(videoId, { showValidatedMessage: false });
        return true;
    }
    if (jobStatus === 'busy') {
        showErrorMessage('Ein anderer Verarbeitungsvorgang für dieses Video läuft bereits.');
        return true;
    }
    if (jobStatus === 'failed') {
        showErrorMessage(`Schwärzung der Außerhalb-Segmente fehlgeschlagen${message ? `: ${message}` : '.'}`, 'danger');
        void videoStore.fetchAllVideos();
        return true;
    }
    if (jobStatus === 'noop' || (!jobStatus && outsideSegmentCount === 0)) {
        showSuccessMessage('Keine Außerhalb-Segmente gefunden. Es wurde nichts gestartet.');
        return true;
    }
    return false;
};
const blackenOutsideSegmentsForSelectedVideo = async () => {
    const videoId = selectedVideoId.value;
    if (!videoId) {
        showErrorMessage('Kein Video ausgewählt');
        return;
    }
    if (!canAnnotateSegments(videoId)) {
        showErrorMessage('Außerhalb-Segmente können erst nach validierter Anonymisierung geschwärzt werden.');
        return;
    }
    if (outsideBlackeningRequestVideoIds.value.has(videoId)) {
        showErrorMessage(`Schwärzung für Video ${videoId} wird bereits gestartet.`);
        return;
    }
    if (!confirm(`Außerhalb-Segmente für Video ${videoId} erneut schwärzen?`)) {
        return;
    }
    setOutsideBlackeningRequestState(videoId, true);
    try {
        const response = await axiosInstance.post(r(endpoints.media.videoSegmentsBlackenOutside(videoId)), {
            onlyValidated: false
        });
        if (handleOutsideBlackeningResponseState(normalizeOutsideBlackeningResponse(response.data), videoId)) {
            return;
        }
        showErrorMessage('Unerwarteter Status beim Schwärzen der Außerhalb-Segmente.', 'danger');
    }
    catch (error) {
        const responseData = error?.response?.data;
        if (responseData &&
            handleOutsideBlackeningResponseState(normalizeOutsideBlackeningResponse(responseData), videoId)) {
            return;
        }
        console.error('Fehler beim Schwärzen der Außerhalb-Segmente:', error);
        await guarded(Promise.reject(error));
    }
    finally {
        setOutsideBlackeningRequestState(videoId, false);
    }
};
const saveSegmentChanges = async () => {
    if (!canMutateSelectedSegments.value) {
        showErrorMessage(getSegmentMutationBlockedMessage());
        return;
    }
    if (segmentSourceMode.value === 'prediction') {
        showErrorMessage('Änderungen an KI-Vorhersagen werden erst mit "Als manuelle Segmente übernehmen" persistiert.');
        return;
    }
    try {
        await videoStore.persistDirtySegments();
        showSuccessMessage('Segment-Änderungen gespeichert');
    }
    catch (error) {
        console.error('Fehler beim Speichern der Segment-Änderungen:', error);
        await guarded(Promise.reject(error));
    }
};
const discardSegmentChanges = () => {
    if (!canMutateSelectedSegments.value) {
        showErrorMessage(getSegmentMutationBlockedMessage());
        return;
    }
    if (segmentSourceMode.value === 'prediction') {
        void loadVideoSegments();
        showSuccessMessage('Lokale Änderungen an KI-Vorhersagen verworfen');
        return;
    }
    // simplest version: reload from backend
    if (!selectedVideoId.value)
        return;
    videoStore.fetchVideoSegments(selectedVideoId.value);
    showSuccessMessage('Lokale Änderungen verworfen');
};
const importPredictionSegmentsToManual = async () => {
    if (!selectedVideoId.value)
        return;
    if (!canMutateSelectedSegments.value) {
        showErrorMessage(getSegmentMutationBlockedMessage());
        return;
    }
    if (timelineSegmentsForSelectedVideo.value.length === 0) {
        showErrorMessage('Keine KI-Segmente zum Übernehmen vorhanden');
        return;
    }
    isImportingPredictionSegments.value = true;
    try {
        const payload = {
            replace_existing: true,
            segments: timelineSegmentsForSelectedVideo.value.map((segment) => ({
                label_name: segment.label,
                start_time: segment.startTime,
                end_time: segment.endTime,
                export_segment: Boolean(segment.exportSegment)
            }))
        };
        await axiosInstance.post(r(endpoints.media.videoSegmentsImportPredictions(selectedVideoId.value)), payload);
        segmentSourceMode.value = 'manual';
        await loadVideoSegments();
        showSuccessMessage('KI-Vorhersagen wurden als manuelle Segmente übernommen');
    }
    catch (error) {
        console.error('Error importing prediction segments:', error);
        await guarded(Promise.reject(error));
    }
    finally {
        isImportingPredictionSegments.value = false;
    }
};
const rerunPredictionSegmentsForSelectedVideo = async () => {
    if (!selectedVideoId.value || !canRerunPredictionSegments.value)
        return;
    isRerunningPredictionSegments.value = true;
    try {
        const payload = predictionModelMode.value === 'huggingface'
            ? {
                hfModelId: huggingFaceModelId.value.trim(),
                labelsetName: defaultPredictionLabelsetName.value,
                replacePredictionSegments: true,
                deleteFramesAfter: true
            }
            : {
                modelMetaId: selectedPredictionModelMetaId.value,
                replacePredictionSegments: true,
                deleteFramesAfter: true
            };
        const response = await videoStore.rerunPredictionSegments(selectedVideoId.value, payload);
        await videoStore.fetchPredictionModels();
        segmentSourceMode.value = 'prediction';
        await loadVideoSegments();
        showSuccessMessage(`KI-Vorhersagen neu berechnet (${response.predictionSegmentsCount} Segmente)`);
    }
    catch (error) {
        console.error('Error rerunning prediction segments:', error);
        await guarded(Promise.reject(error));
    }
    finally {
        isRerunningPredictionSegments.value = false;
    }
};
// Video event handlers from AnonymizationValidationComponent
const onVideoError = (event) => {
    if (isAbortLikeError(event)) {
        console.debug('[VideoExamination] Ignoring aborted video load:', event);
        return;
    }
    console.error('Video loading error:', event);
    const video = event.target;
    console.error('Video error details:', {
        error: video.error,
        networkState: video.networkState,
        readyState: video.readyState,
        currentSrc: video.currentSrc
    });
    showErrorMessage('Fehler beim Laden des Videos. Bitte versuchen Sie es erneut.');
};
const onVideoLoadStart = () => {
    console.log('Video loading started for:', anonymizedVideoSrc.value);
};
const onVideoCanPlay = () => {
    console.log('Video can play, loaded successfully');
};
const getVideoDropdownStatusText = (videoId) => {
    const status = getVideoDropdownStatus(videoId);
    if (status === 'not_usable') {
        return `Noch nicht nutzbar: ${getStatusText(getVideoAnonymizationStatus(videoId))}`;
    }
    if (status === 'annotation_validated')
        return 'Video bereits validiert';
    if (status === 'annotation_cleanup_pending')
        return 'Segmentvalidierung läuft';
    if (status === 'annotation_cleanup_failed')
        return 'Segmentvalidierung prüfen';
    if (status === 'ready_for_annotation')
        return 'Video startklar für Befundung!';
    return 'Zurück zu Schritt 1 - Anonymisierung validieren';
};
const getSegmentAnnotationStatusBadgeText = (videoId) => {
    const status = getVideoSegmentAnnotationStatus(videoId);
    if (status === 'cleanup_queued' || status === 'cleanup_running') {
        return 'Außerhalb-Frames werden geschwärzt';
    }
    if (status === 'cleanup_failed')
        return 'Außerhalb-Frame-Prüfung fehlgeschlagen';
    if (status === 'cleanup_required')
        return 'Außerhalb-Frame-Prüfung erforderlich';
    if (status === 'validated' || isAnnotationFinished(videoId)) {
        return 'Segmentvalidiert';
    }
    return '';
};
const getSegmentAnnotationStatusBadgeClass = (videoId) => {
    const status = getVideoSegmentAnnotationStatus(videoId);
    if (status === 'cleanup_queued' || status === 'cleanup_running')
        return 'bg-info text-dark';
    if (status === 'cleanup_failed' || status === 'cleanup_required')
        return 'bg-warning text-dark';
    if (status === 'validated' || isAnnotationFinished(videoId))
        return 'bg-success';
    return 'bg-secondary';
};
const getVideoDropdownStatusBadgeClass = (videoId) => {
    const status = getVideoDropdownStatus(videoId);
    if (status === 'not_usable')
        return 'badge-unusable';
    if (status === 'annotation_validated')
        return 'badge-validated';
    if (status === 'annotation_cleanup_pending')
        return 'badge-cleanup';
    if (status === 'annotation_cleanup_failed')
        return 'badge-pending';
    if (status === 'ready_for_annotation')
        return 'badge-ready';
    return 'badge-pending';
};
const getVideoDropdownItemClass = (videoId) => {
    const status = getVideoDropdownStatus(videoId);
    if (status === 'not_usable')
        return 'video-dropdown-item-unusable';
    if (status === 'annotation_validated')
        return 'video-dropdown-item-validated';
    if (status === 'annotation_cleanup_pending')
        return 'video-dropdown-item-cleanup';
    if (status === 'annotation_cleanup_failed')
        return 'video-dropdown-item-pending';
    if (status === 'ready_for_annotation')
        return 'video-dropdown-item-ready';
    return 'video-dropdown-item-pending';
};
const getVideoDropdownStatus = (videoId) => {
    // Keep anonymization validation and segment annotation validation separate:
    // filters decide visibility, while this resolver alone decides row color/text.
    if (!canViewProcessedVideo(videoId))
        return 'not_usable';
    const segmentStatus = getVideoSegmentAnnotationStatus(videoId);
    if (segmentStatus === 'cleanup_queued' || segmentStatus === 'cleanup_running') {
        return 'annotation_cleanup_pending';
    }
    if (segmentStatus === 'cleanup_failed' || segmentStatus === 'cleanup_required') {
        return 'annotation_cleanup_failed';
    }
    if (segmentStatus === 'validated')
        return 'annotation_validated';
    return isVideoValidated(videoId) ? 'ready_for_annotation' : 'pending_anonymization_validation';
};
function getVideoCountByDropdownStatus(status) {
    return videos.value.filter((video) => getVideoDropdownStatus(video.id) === status).length;
}
// ✅ NEW: Helper functions for video status display
const getVideoStatusIndicator = (videoId) => {
    if (!canViewProcessedVideo(videoId))
        return `Noch nicht nutzbar: ${getStatusText(getVideoAnonymizationStatus(videoId))}`;
    if (canAnnotateSegments(videoId) && isAnnotationFinished(videoId))
        return 'Video bereits validiert';
    const item = getVideoOverviewItem(videoId);
    if (!item)
        return '';
    const statusIndicators = {
        not_started: '⏳ Wartend',
        processing_anonymization: '🔄 In Verarbeitung',
        extracting_frames: '🎬 Frames',
        started: 'Gestartet',
        anonymized: 'Anonymisiert, Metadaten noch offen',
        done_processing_anonymization: 'Zurück zu Schritt 1 - Anonymisierung validieren',
        validated: 'Video startklar für Befundung!',
        unknown: 'Status unbekannt',
        failed: '❌ Fehler'
    };
    return statusIndicators[item.anonymizationStatus] || item.anonymizationStatus;
};
const getVideoCountByStatus = (status) => {
    return overview.value.filter((o) => o.mediaType === 'video' && o.anonymizationStatus === status)
        .length;
};
const getStatusBadgeClass = (status) => {
    const classes = {
        not_started: 'bg-secondary',
        processing_anonymization: 'bg-warning',
        extracting_frames: 'bg-info',
        predicting_segments: 'bg-info',
        started: 'bg-info',
        anonymized: 'bg-warning',
        done_processing_anonymization: 'bg-success',
        validated: 'bg-primary',
        unknown: 'bg-secondary',
        failed: 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
};
const getStatusText = (status) => {
    const texts = {
        not_started: 'Nicht gestartet',
        processing_anonymization: 'Anonymisierung läuft',
        extracting_frames: 'Frames extrahieren',
        predicting_segments: 'Segmente vorhersagen',
        started: 'Gestartet',
        anonymized: 'Anonymisiert',
        done_processing_anonymization: 'Fertig',
        validated: 'Validiert',
        unknown: 'Status unbekannt',
        failed: 'Fehlgeschlagen'
    };
    return texts[status] || status;
};
// Tracks anonymization validation. Segment annotation validation is tracked by isAnnotationFinished().
const isVideoValidated = (videoId) => {
    const item = getVideoOverviewItem(videoId);
    return item?.anonymizationStatus === 'validated';
};
// Fire loader whenever selectedVideoId changes programmatically.
// Keep this after all setup bindings it can call; immediate watchers run during setup.
watch(selectedVideoId, async (newId) => {
    console.log('Selected video ID changed, syncing store and loading details:', newId);
    if (typeof newId === 'number') {
        videoStore.setCurrentVideo(newId);
    }
    else if (newId !== null) {
        showErrorMessage('Invalid video ID');
        return;
    }
    await loadSelectedVideo();
    if (newId !== null && canViewProcessedVideo(newId)) {
        await loadVideoSegments();
    }
});
watch(() => route.query.video, (v) => {
    const id = Number(v ?? '') || null;
    if (id !== selectedVideoId.value)
        selectedVideoId.value = id;
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['fullscreen-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['examination-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge-container']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-filter-button']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-filter-button']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcuts-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['prediction-rerun-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['prediction-rerun-controls']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-dismissible fade show" },
        ...{ class: (__VLS_ctx.messageTone === 'danger' ? 'alert-danger' : 'alert-info hint-alert') },
        role: (__VLS_ctx.messageTone === 'danger' ? 'alert' : 'status'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni me-2" },
        ...{ class: (__VLS_ctx.messageTone === 'danger' ? 'ni-settings-gear-65' : 'ni-bulb-61') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.messageTone === 'danger' ? 'Achtung:' : 'Hinweis:');
    (__VLS_ctx.errorMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearErrorMessage) },
        type: "button",
        ...{ class: "btn-close" },
        'aria-label': "Close",
    });
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success alert-dismissible fade show" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-check-bold me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.successMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSuccessMessage) },
        type: "button",
        ...{ class: "btn-close" },
        'aria-label': "Close",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "videoDropdownRef",
    ...{ class: "video-dropdown" },
});
/** @type {typeof __VLS_ctx.videoDropdownRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleVideoDropdown) },
    type: "button",
    ...{ class: "video-dropdown-trigger" },
    disabled: (!__VLS_ctx.hasVideos),
    'aria-expanded': (__VLS_ctx.isVideoDropdownOpen ? 'true' : 'false'),
    'aria-haspopup': "listbox",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "video-dropdown-trigger-text" },
});
(__VLS_ctx.selectedVideoLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni" },
    ...{ class: (__VLS_ctx.isVideoDropdownOpen ? 'ni-bold-right' : 'ni-bold-right') },
});
if (__VLS_ctx.isVideoDropdownOpen && __VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "video-dropdown-menu" },
        role: "listbox",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "video-dropdown-search" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onClick: () => { } },
        ...{ onKeydown: () => { } },
        type: "search",
        ...{ class: "video-dropdown-search-input" },
        placeholder: "Video suchen...",
        'aria-label': "Video suchen",
    });
    (__VLS_ctx.videoDropdownSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "video-dropdown-filters" },
        role: "group",
        'aria-label': "Videofilter",
    });
    for (const [option] of __VLS_getVForSourceType((__VLS_ctx.videoDropdownFilterOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.isVideoDropdownOpen && __VLS_ctx.hasVideos))
                        return;
                    __VLS_ctx.videoDropdownFilter = option.value;
                } },
            key: (option.value),
            type: "button",
            ...{ class: "video-dropdown-filter-button" },
            ...{ class: ({ active: __VLS_ctx.videoDropdownFilter === option.value }) },
        });
        (option.label);
    }
    for (const [video] of __VLS_getVForSourceType((__VLS_ctx.filteredSelectableVideos))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.isVideoDropdownOpen && __VLS_ctx.hasVideos))
                        return;
                    __VLS_ctx.selectVideoFromDropdown(video.id);
                } },
            key: (video.id),
            type: "button",
            ...{ class: "video-dropdown-item" },
            ...{ class: ([
                    { 'video-dropdown-item-selected': __VLS_ctx.selectedVideoId === video.id },
                    __VLS_ctx.getVideoDropdownItemClass(video.id)
                ]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-dropdown-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "video-dropdown-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-button-play me-1" },
        });
        (video.original_file_name || 'Video Nr. ' + video.id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "video-dropdown-status-badge" },
            ...{ class: (__VLS_ctx.getVideoDropdownStatusBadgeClass(video.id)) },
        });
        (__VLS_ctx.getVideoDropdownStatusText(video.id));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-dropdown-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (video.centerName || 'Unbekannt');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getVideoPatientGender(video.id));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getVideoPatientAgeLabel(video.id));
        if (__VLS_ctx.getVideoValidatedAnnotatorLabel(video.id)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "video-dropdown-annotators" },
                ...{ class: ({
                        'video-dropdown-annotators-other': __VLS_ctx.hasOtherValidatedAnnotator(video.id)
                    }) },
                'data-test': "video-dropdown-annotators",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "ni ni-single-02 me-1" },
            });
            (__VLS_ctx.getVideoValidatedAnnotatorLabel(video.id));
        }
    }
    if (__VLS_ctx.filteredSelectableVideos.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "video-dropdown-empty" },
        });
    }
}
if (!__VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.noVideosMessage);
}
if (__VLS_ctx.videos.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2 align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-success" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-check-bold me-1" },
    });
    (__VLS_ctx.getVideoCountByStatus('done_processing_anonymization'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-check-bold me-1" },
    });
    (__VLS_ctx.getVideoCountByStatus('validated'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-user-run me-1" },
    });
    (__VLS_ctx.pendingValidationVideos.length);
}
if (__VLS_ctx.selectedVideoId && __VLS_ctx.canAnnotateSelectedVideo) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "annotation-scope-panel mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: "video-annotator-override",
        ...{ class: "form-label mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap gap-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        id: "video-annotator-override",
        value: (__VLS_ctx.annotatorOverrideInput),
        type: "text",
        ...{ class: "form-control form-control-sm annotator-override-input" },
        'data-test': "video-annotator-override-input",
        placeholder: (__VLS_ctx.baseAnnotatorPrincipal),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.restartVideoAnnotationAsOverride) },
        type: "button",
        ...{ class: "btn btn-outline-primary btn-sm mb-0" },
        disabled: (!__VLS_ctx.canApplyAnnotatorOverride),
        'data-test': "video-annotator-override-apply",
    });
    if (__VLS_ctx.isAnnotatorOverrideActive) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.revertVideoAnnotatorOverride) },
            type: "button",
            ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
            'data-test': "video-annotator-override-revert",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted d-block mt-1" },
    });
    (__VLS_ctx.activeAnnotatorLabel);
}
if (__VLS_ctx.validationRequestVideoId !== null || __VLS_ctx.lastValidationClickedVideoId !== null) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2 p-2 rounded validation-click-indicator" },
        ...{ class: (__VLS_ctx.selectedVideoId === __VLS_ctx.activeValidationIndicatorVideoId
                ? 'validation-click-indicator-active'
                : 'validation-click-indicator-muted') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "fw-semibold" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni me-1" },
        ...{ class: (__VLS_ctx.isValidatingSegments ? 'ni-settings-gear-65' : 'ni-single-copy-04') },
    });
    if (__VLS_ctx.isValidatingSegments) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.validationRequestVideoId);
    }
    else if (__VLS_ctx.activeValidationIndicatorVideoId &&
        __VLS_ctx.isSegmentCleanupPending(__VLS_ctx.activeValidationIndicatorVideoId)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.activeValidationIndicatorVideoId);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.lastValidationClickedVideoId);
    }
}
if (!__VLS_ctx.anonymizedVideoSrc && __VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-muted py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-button-play ni-3x" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2" },
    });
    (__VLS_ctx.selectedVideoId && !__VLS_ctx.isSelectedVideoViewable
        ? 'Dieses Video ist noch nicht für die Segmentansicht nutzbar'
        : 'Video auswählen, um mit der Betrachtung zu beginnen');
    if (__VLS_ctx.selectedVideoId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info mt-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-center justify-content-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-user-run me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-start" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedVideoId);
        (__VLS_ctx.getVideoStatusIndicator(__VLS_ctx.selectedVideoId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.isSelectedVideoViewable
            ? 'Die Ansicht wird vorbereitet.'
            : 'Bitte zuerst den erforderlichen Anonymisierungsschritt abschließen.');
    }
}
if (!__VLS_ctx.hasVideos) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center text-muted py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-collection ni-3x" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2" },
    });
    (__VLS_ctx.noVideosMessage);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
}
if (__VLS_ctx.anonymizedVideoSrc) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "videoContainerRef",
        ...{ class: "video-container" },
    });
    /** @type {typeof __VLS_ctx.videoContainerRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleFullscreen) },
        type: "button",
        ...{ class: "fullscreen-toggle" },
        title: (__VLS_ctx.isFullscreen ? 'Vollbild verlassen' : 'Vollbild'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni" },
        ...{ class: (__VLS_ctx.isFullscreen ? 'ni-settings-gear-65' : 'ni-tv-2') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
        ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
        ...{ onError: (__VLS_ctx.onVideoError) },
        ...{ onLoadstart: (__VLS_ctx.onVideoLoadStart) },
        ...{ onCanplay: (__VLS_ctx.onVideoCanPlay) },
        ref: "videoRef",
        'data-cy': "video-player",
        src: (__VLS_ctx.anonymizedVideoSrc),
        controls: true,
        ...{ class: "w-100" },
        ...{ style: {} },
    });
    /** @type {typeof __VLS_ctx.videoRef} */ ;
    if (__VLS_ctx.isLabelSelectActive) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.closeLabelOverlay) },
            ...{ class: "label-overlay" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "label-overlay-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "label-overlay-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeLabelOverlay) },
            type: "button",
            ...{ class: "label-overlay-close" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "label-overlay-hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "label-overlay-list" },
        });
        for (const [label] of __VLS_getVForSourceType((__VLS_ctx.timelineLabels))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.anonymizedVideoSrc))
                            return;
                        if (!(__VLS_ctx.isLabelSelectActive))
                            return;
                        __VLS_ctx.selectLabelFromOverlay(label.name);
                    } },
                key: (label.id),
                type: "button",
                ...{ class: "label-overlay-item" },
                ...{ class: ({ active: label.name === __VLS_ctx.selectedLabelType }) },
            });
            (__VLS_ctx.getTranslationForLabel(label.name));
        }
    }
    if (__VLS_ctx.selectedVideoId) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 p-3 rounded border video-status-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-8" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-button-play me-2 text-primary" },
        });
        (__VLS_ctx.selectedVideo?.original_file_name || `Video ${__VLS_ctx.selectedVideoId}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "status-badge-container mb-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (__VLS_ctx.getStatusBadgeClass(__VLS_ctx.overview.find((o) => o.id === __VLS_ctx.selectedVideoId && o.mediaType === 'video')?.anonymizationStatus || 'not_started')) },
            ...{ class: "badge" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-check-bold me-1" },
        });
        (__VLS_ctx.getStatusText(__VLS_ctx.overview.find((o) => o.id === __VLS_ctx.selectedVideoId && o.mediaType === 'video')?.anonymizationStatus || 'not_started'));
        if (__VLS_ctx.timelineSegmentsForSelectedVideo.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge bg-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "ni ni-single-copy-04 me-1" },
            });
            (__VLS_ctx.timelineSegmentsForSelectedVideo.length);
        }
        if (__VLS_ctx.savedExaminations.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge bg-warning" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "ni ni-user-run me-1" },
            });
            (__VLS_ctx.savedExaminations.length);
        }
        if (__VLS_ctx.selectedVideoId && __VLS_ctx.getSegmentAnnotationStatusBadgeText(__VLS_ctx.selectedVideoId)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "badge" },
                ...{ class: (__VLS_ctx.getSegmentAnnotationStatusBadgeClass(__VLS_ctx.selectedVideoId)) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "ni ni-settings-gear-65 me-1" },
            });
            (__VLS_ctx.getSegmentAnnotationStatusBadgeText(__VLS_ctx.selectedVideoId));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4 text-md-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block" },
        });
        (__VLS_ctx.selectedVideo?.centerName || 'Unbekannt');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted d-block" },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.duration));
    }
}
if (__VLS_ctx.duration > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-wrapper mt-3" },
    });
    /** @type {[typeof Timeline, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(Timeline, new Timeline({
        ...{ 'onSeek': {} },
        ...{ 'onPlayPause': {} },
        ...{ 'onSegmentSelect': {} },
        ...{ 'onSegmentLabelChange': {} },
        ...{ 'onSegmentResize': {} },
        ...{ 'onSegmentMove': {} },
        ...{ 'onSegmentCreate': {} },
        ...{ 'onSegmentDelete': {} },
        ...{ 'onTimeSelection': {} },
        video: ({ duration: __VLS_ctx.duration }),
        segments: (__VLS_ctx.timelineSegmentsForSelectedVideo),
        labels: (__VLS_ctx.timelineLabels),
        currentTime: (__VLS_ctx.currentTime),
        isPlaying: (__VLS_ctx.isPlaying),
        activeSegmentId: (__VLS_ctx.selectedSegmentId),
        showWaveform: (false),
        selectionMode: (__VLS_ctx.canMutateSelectedSegments),
        fps: (__VLS_ctx.fps),
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onSeek': {} },
        ...{ 'onPlayPause': {} },
        ...{ 'onSegmentSelect': {} },
        ...{ 'onSegmentLabelChange': {} },
        ...{ 'onSegmentResize': {} },
        ...{ 'onSegmentMove': {} },
        ...{ 'onSegmentCreate': {} },
        ...{ 'onSegmentDelete': {} },
        ...{ 'onTimeSelection': {} },
        video: ({ duration: __VLS_ctx.duration }),
        segments: (__VLS_ctx.timelineSegmentsForSelectedVideo),
        labels: (__VLS_ctx.timelineLabels),
        currentTime: (__VLS_ctx.currentTime),
        isPlaying: (__VLS_ctx.isPlaying),
        activeSegmentId: (__VLS_ctx.selectedSegmentId),
        showWaveform: (false),
        selectionMode: (__VLS_ctx.canMutateSelectedSegments),
        fps: (__VLS_ctx.fps),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onSeek: (__VLS_ctx.handleTimelineSeek)
    };
    const __VLS_7 = {
        onPlayPause: (__VLS_ctx.handlePlayPause)
    };
    const __VLS_8 = {
        onSegmentSelect: (__VLS_ctx.handleSegmentSelect)
    };
    const __VLS_9 = {
        onSegmentLabelChange: (__VLS_ctx.handleSegmentLabelChange)
    };
    const __VLS_10 = {
        onSegmentResize: (__VLS_ctx.handleSegmentResize)
    };
    const __VLS_11 = {
        onSegmentMove: (__VLS_ctx.handleSegmentMove)
    };
    const __VLS_12 = {
        onSegmentCreate: (__VLS_ctx.handleCreateSegment)
    };
    const __VLS_13 = {
        onSegmentDelete: (__VLS_ctx.handleSegmentDelete)
    };
    const __VLS_14 = {
        onTimeSelection: (__VLS_ctx.handleTimeSelection)
    };
    var __VLS_2;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
        ...{ class: "mt-2 text-muted shortcuts-details" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({
        ...{ class: "shortcuts-toggle" },
        'aria-label': "Shortcuts anzeigen",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "shortcuts-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-1 shortcuts-body" },
    });
    if (__VLS_ctx.selectedVideoId && __VLS_ctx.isSelectedVideoViewable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "mt-3 d-flex gap-2 flex-wrap align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.handleSegmentSourceChange) },
            value: (__VLS_ctx.segmentSourceMode),
            ...{ class: "form-select form-select-sm source-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "manual",
        });
        (__VLS_ctx.activeAnnotatorLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "prediction",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.selectedSegmentAiDatasetId),
            ...{ class: "form-select form-select-sm dataset-select" },
            'data-test': "segment-ai-dataset-select",
            disabled: (__VLS_ctx.isLoadingSegmentAiDatasets),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "",
        });
        for (const [dataset] of __VLS_getVForSourceType((__VLS_ctx.segmentAiDatasetOptions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (`${dataset.id}-${dataset.datasetType}`),
                value: (String(dataset.id)),
            });
            (dataset.label);
            (dataset.datasetType);
            (dataset.id);
        }
        if (__VLS_ctx.segmentAiDatasetError) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: "text-warning" },
            });
            (__VLS_ctx.segmentAiDatasetError);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.discardSegmentChanges) },
            ...{ class: "btn btn-outline-secondary" },
            disabled: (__VLS_ctx.segmentSourceMode === 'prediction' || !__VLS_ctx.canMutateSelectedSegments),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveSegmentChanges) },
            ...{ class: "btn" },
            ...{ class: (__VLS_ctx.hasUnsavedChanges ? 'btn-primary' : 'btn-outline-secondary') },
            disabled: (__VLS_ctx.segmentSourceMode === 'prediction' || !__VLS_ctx.canMutateSelectedSegments),
        });
        if (__VLS_ctx.segmentSourceMode === 'prediction') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.importPredictionSegmentsToManual) },
                ...{ class: "btn btn-primary" },
                disabled: (__VLS_ctx.timelineSegmentsForSelectedVideo.length === 0 ||
                    __VLS_ctx.isImportingPredictionSegments ||
                    !__VLS_ctx.canMutateSelectedSegments),
            });
            (__VLS_ctx.isImportingPredictionSegments
                ? 'Übernehme...'
                : 'Als manuelle Segmente übernehmen');
        }
    }
    if (__VLS_ctx.selectedVideoId && __VLS_ctx.isSelectedVideoViewable) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "prediction-rerun-controls mt-2 d-flex gap-2 flex-wrap align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.predictionModelMode),
            ...{ class: "form-select form-select-sm model-mode-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "local",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: "huggingface",
        });
        if (__VLS_ctx.predictionModelMode === 'local') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                value: (__VLS_ctx.selectedPredictionModelMetaId),
                ...{ class: "form-select form-select-sm prediction-model-select" },
                disabled: (__VLS_ctx.predictionModelOptions.length === 0 || __VLS_ctx.isRerunningPredictionSegments),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: (null),
            });
            for (const [model] of __VLS_getVForSourceType((__VLS_ctx.predictionModelOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: (model.id),
                    value: (model.id),
                });
                (__VLS_ctx.formatPredictionModelOption(model));
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ class: "form-control form-control-sm huggingface-model-input" },
                placeholder: "wg-lux/colo_segmentation_RegNetX800MF_base",
                disabled: (__VLS_ctx.isRerunningPredictionSegments),
            });
            (__VLS_ctx.huggingFaceModelId);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.rerunPredictionSegmentsForSelectedVideo) },
            ...{ class: "btn btn-outline-primary" },
            disabled: (!__VLS_ctx.canRerunPredictionSegments),
        });
        (__VLS_ctx.isRerunningPredictionSegments ? 'KI läuft...' : 'KI neu berechnen');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleTimelineClick) },
        ...{ class: "simple-timeline-track mt-2" },
        ref: "timelineRef",
    });
    /** @type {typeof __VLS_ctx.timelineRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "progress-bar" },
        ...{ style: ({ width: `${(__VLS_ctx.currentTime / __VLS_ctx.duration) * 100}%` }) },
    });
    for (const [marker] of __VLS_getVForSourceType((__VLS_ctx.examinationMarkers))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (marker.id),
            ...{ class: "examination-marker" },
            ...{ style: ({ left: `${(marker.timestamp / __VLS_ctx.duration) * 100}%` }) },
            title: (`Untersuchung bei ${__VLS_ctx.formatTime(marker.timestamp)}`),
        });
    }
}
if (__VLS_ctx.selectedVideoId && __VLS_ctx.isSelectedVideoViewable) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-controls mt-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-3" },
    });
    if (__VLS_ctx.segmentSourceMode === 'prediction') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning py-2 px-3 mb-0" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label mb-0 me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onLabelSelect) },
        ...{ onFocus: (...[$event]) => {
                if (!(__VLS_ctx.selectedVideoId && __VLS_ctx.isSelectedVideoViewable))
                    return;
                __VLS_ctx.isLabelSelectActive = true;
            } },
        ...{ onBlur: (...[$event]) => {
                if (!(__VLS_ctx.selectedVideoId && __VLS_ctx.isSelectedVideoViewable))
                    return;
                __VLS_ctx.isLabelSelectActive = false;
            } },
        ref: "labelSelectRef",
        value: (__VLS_ctx.selectedLabelType),
        ...{ class: "form-select form-select-sm control-select" },
        'data-cy': "label-select",
        disabled: (!__VLS_ctx.canMutateSelectedSegments),
    });
    /** @type {typeof __VLS_ctx.labelSelectRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.timelineLabels))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (label.id),
            value: (label.name),
        });
        (__VLS_ctx.getTranslationForLabel(label.name));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex align-items-center gap-2" },
    });
    if (!__VLS_ctx.isMarkingLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.startLabelMarking) },
            ...{ class: "btn btn-success btn-sm control-button" },
            disabled: (!__VLS_ctx.canStartLabeling),
            'data-cy': "start-label-button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-single-copy-04" },
        });
    }
    if (__VLS_ctx.isMarkingLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.finishLabelMarking) },
            ...{ class: "btn btn-warning btn-sm control-button" },
            'data-cy': "finish-label-button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-button-play" },
        });
    }
    if (__VLS_ctx.isMarkingLabel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.cancelLabelMarking) },
            ...{ class: "btn btn-outline-secondary btn-sm control-button" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ms-3 text-muted" },
    });
    if (__VLS_ctx.videoStore.draftSegment && __VLS_ctx.videoStore.draftSegment.startTime !== null) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mb-0" },
        });
        (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.startTime));
    }
    (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
    if (__VLS_ctx.videoStore.draftSegment) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info mt-2 mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-user-run align-middle me-1" },
            ...{ style: {} },
        });
        (__VLS_ctx.getTranslationForLabel(__VLS_ctx.videoStore.draftSegment.label));
        if (__VLS_ctx.videoStore.draftSegment.endTime) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.startTime));
            (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.endTime));
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatTime(__VLS_ctx.videoStore.draftSegment.startTime));
        }
    }
}
if (__VLS_ctx.selectedVideoId && __VLS_ctx.canAnnotateSelectedVideo) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    if (__VLS_ctx.isAnnotationFinished(__VLS_ctx.selectedVideoId)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-success d-flex align-items-center validation-status-alert" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-check-bold ni-2x me-3 text-success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "validation-status-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-chart-bar-32 me-1" },
        });
        (__VLS_ctx.canMutateSelectedSegments ? 'Segmentbearbeitung aktiv' : 'Video bereits validiert');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        if (__VLS_ctx.canMutateSelectedSegments) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.isAnnotatorOverrideActive
                ? 'Segmentänderungen laufen unter dem aktiven Annotator-Override. "Zurück zu meinem Nutzer" setzt den Scope zurück.'
                : 'Segmentänderungen sind wieder möglich. Der Zurück-Button des Browsers beendet diesen Modus.');
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.timelineSegmentsForSelectedVideo.length);
        }
        if (__VLS_ctx.isAnnotatorOverrideActive) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.selectedVideoId && __VLS_ctx.canAnnotateSelectedVideo))
                            return;
                        if (!(__VLS_ctx.isAnnotationFinished(__VLS_ctx.selectedVideoId)))
                            return;
                        if (!(__VLS_ctx.isAnnotatorOverrideActive))
                            return;
                        __VLS_ctx.handleValidateAndMark(__VLS_ctx.selectedVideoId);
                    } },
                type: "button",
                ...{ class: "btn btn-outline-primary btn-sm ms-auto validation-edit-button" },
                disabled: (__VLS_ctx.segmentSourceMode === 'prediction' || __VLS_ctx.isValidatingSegments),
                'aria-busy': (__VLS_ctx.isValidatingSegments ? 'true' : 'false'),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "ni me-1" },
                ...{ class: (__VLS_ctx.isValidatingSegments ? 'ni-settings-gear-65' : 'ni-check-bold') },
            });
            (__VLS_ctx.isValidatingSegments ? 'Validierung läuft...' : 'Annotation validieren');
        }
        else if (!__VLS_ctx.canMutateSelectedSegments) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.enableSegmentEditing) },
                type: "button",
                ...{ class: "btn btn-outline-success btn-sm ms-auto validation-edit-button" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "ni ni-single-copy-04 me-1" },
            });
        }
    }
    else if (__VLS_ctx.selectedVideoId !== null && __VLS_ctx.isSegmentCleanupPending(__VLS_ctx.selectedVideoId)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info d-flex align-items-center validation-processing-alert" },
            'data-test': "segment-cleanup-processing",
            role: "status",
            'aria-live': "polite",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-settings-gear-65 ni-2x me-3 text-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "validation-status-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-tv-2 me-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
    }
    else if (__VLS_ctx.selectedVideoId !== null && __VLS_ctx.isSegmentCleanupFailed(__VLS_ctx.selectedVideoId)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning d-flex align-items-center validation-failed-alert" },
            'data-test': "segment-cleanup-failed",
            role: "alert",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-settings ni-2x me-3 text-warning" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "validation-status-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: "mb-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        if (__VLS_ctx.selectedPostValidationRebuildDetails) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.selectedPostValidationRebuildDetails);
        }
    }
    if (__VLS_ctx.selectedVideoId !== null &&
        !__VLS_ctx.isSegmentCleanupPending(__VLS_ctx.selectedVideoId) &&
        !__VLS_ctx.isAnnotationFinished(__VLS_ctx.selectedVideoId)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex justify-content-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.selectedVideoId && __VLS_ctx.canAnnotateSelectedVideo))
                        return;
                    if (!(__VLS_ctx.selectedVideoId !== null &&
                        !__VLS_ctx.isSegmentCleanupPending(__VLS_ctx.selectedVideoId) &&
                        !__VLS_ctx.isAnnotationFinished(__VLS_ctx.selectedVideoId)))
                        return;
                    __VLS_ctx.handleValidateAndMark(__VLS_ctx.selectedVideoId);
                } },
            ...{ class: "btn validation-action-button d-inline-flex align-items-center justify-content-center gap-2" },
            ...{ class: ({
                    'validation-action-button-clicked': __VLS_ctx.selectedVideoId === __VLS_ctx.validationRequestVideoId
                }) },
            disabled: (__VLS_ctx.segmentSourceMode === 'prediction' ||
                __VLS_ctx.isValidatingSegments ||
                __VLS_ctx.isSegmentCleanupPending(__VLS_ctx.selectedVideoId)),
            'aria-busy': (__VLS_ctx.isValidatingSegments ? 'true' : 'false'),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni validation-action-icon" },
            ...{ class: (__VLS_ctx.isValidatingSegments ? 'ni-settings-gear-65' : 'ni-check-bold') },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.isValidatingSegments
            ? 'Validierung läuft...'
            : __VLS_ctx.selectedVideoId !== null && __VLS_ctx.isSegmentCleanupFailed(__VLS_ctx.selectedVideoId)
                ? `Validierung erneut starten (${__VLS_ctx.timelineSegmentsForSelectedVideo.length})`
                : `Alle Segmente validieren (${__VLS_ctx.timelineSegmentsForSelectedVideo.length})`);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-center mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.blackenOutsideSegmentsForSelectedVideo) },
        type: "button",
        ...{ class: "btn btn-outline-dark btn-sm d-inline-flex align-items-center justify-content-center gap-2" },
        'data-test': "blacken-outside-segments-button",
        disabled: (!__VLS_ctx.canBlackenOutsideSegments),
        'aria-busy': (__VLS_ctx.isBlackeningOutsideSegments ? 'true' : 'false'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni" },
        ...{ class: (__VLS_ctx.isBlackeningOutsideSegments ? 'ni-settings-gear-65' : 'ni-tv-2') },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.isBlackeningOutsideSegments
        ? 'Schwärzung wird gestartet...'
        : 'Außerhalb-Segmente schwärzen');
    if (!__VLS_ctx.isAnnotationFinished(__VLS_ctx.selectedVideoId) && __VLS_ctx.segmentSourceMode !== 'prediction') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted text-center mt-2 mb-0" },
            ...{ style: {} },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-user-run" },
            ...{ style: {} },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-12" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-single-copy-04 me-2" },
});
if (__VLS_ctx.currentMarker) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    (__VLS_ctx.formatTime(__VLS_ctx.currentMarker.timestamp));
}
if (__VLS_ctx.selectedVideoId && __VLS_ctx.canAnnotateSelectedVideo) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info alert-sm mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "ni ni-user-run me-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedVideoId);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "text-center text-muted py-5 px-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-collection ni-3x mb-3 text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "small text-muted mb-4" },
});
const __VLS_15 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ class: "btn btn-primary" },
    to: "/reporting/case-setup",
}));
const __VLS_17 = __VLS_16({
    ...{ class: "btn btn-primary" },
    to: "/reporting/case-setup",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
var __VLS_18;
if (__VLS_ctx.savedExaminations.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
        'data-cy': "saved-examinations",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-group list-group-flush" },
    });
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.savedExaminations))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (exam.id),
            ...{ class: "list-group-item d-flex justify-content-between align-items-center px-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
        (__VLS_ctx.formatTime(exam.timestamp));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (exam.examination_type || 'Untersuchung');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.savedExaminations.length > 0))
                        return;
                    __VLS_ctx.jumpToExamination(exam);
                } },
            ...{ class: "btn btn-sm btn-outline-primary me-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-button-play" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.savedExaminations.length > 0))
                        return;
                    __VLS_ctx.deleteExamination(exam.id);
                } },
            ...{ class: "btn btn-sm btn-outline-danger" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "ni ni-settings-gear-65" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['fade']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-dismissible']} */ ;
/** @type {__VLS_StyleScopedClasses['fade']} */ ;
/** @type {__VLS_StyleScopedClasses['show']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-check-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-close']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-trigger-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-search']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-filter-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-item']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-item-selected']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-main']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-button-play']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-annotators']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-annotators-other']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-02']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['video-dropdown-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-success']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-check-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-check-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-user-run']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['annotation-scope-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['annotator-override-input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-click-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-button-play']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-user-run']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-collection']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['video-container']} */ ;
/** @type {__VLS_StyleScopedClasses['fullscreen-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-card']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-header']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-close']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-list']} */ ;
/** @type {__VLS_StyleScopedClasses['label-overlay-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['video-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-8']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-button-play']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-check-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-copy-04']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-user-run']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-settings-gear-65']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['text-md-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcuts-details']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcuts-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcuts-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['shortcuts-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['source-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dataset-select']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['prediction-rerun-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['model-mode-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['prediction-model-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['huggingface-model-input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['simple-timeline-track']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['examination-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-select']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-copy-04']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-button-play']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['control-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-user-run']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-check-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-2x']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-success']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-chart-bar-32']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-edit-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-edit-button']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-copy-04']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-processing-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-settings-gear-65']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-2x']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-info']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-tv-2']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-failed-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-settings']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-2x']} */ ;
/** @type {__VLS_StyleScopedClasses['me-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-status-body']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-action-button']} */ ;
/** @type {__VLS_StyleScopedClasses['d-inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-action-button-clicked']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['validation-action-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['d-inline-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-user-run']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-12']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-copy-04']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-user-run']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-collection']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-3x']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-flush']} */ ;
/** @type {__VLS_StyleScopedClasses['list-group-item']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['px-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-button-play']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-settings-gear-65']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Timeline: Timeline,
            formatTime: formatTime,
            getTranslationForLabel: getTranslationForLabel,
            videoStore: videoStore,
            videos: videos,
            overview: overview,
            timelineLabels: timelineLabels,
            isAnnotationFinished: isAnnotationFinished,
            isSegmentCleanupPending: isSegmentCleanupPending,
            isSegmentCleanupFailed: isSegmentCleanupFailed,
            selectedVideoId: selectedVideoId,
            currentTime: currentTime,
            duration: duration,
            fps: fps,
            isPlaying: isPlaying,
            examinationMarkers: examinationMarkers,
            savedExaminations: savedExaminations,
            currentMarker: currentMarker,
            selectedLabelType: selectedLabelType,
            isLabelSelectActive: isLabelSelectActive,
            isMarkingLabel: isMarkingLabel,
            selectedSegmentId: selectedSegmentId,
            lastValidationClickedVideoId: lastValidationClickedVideoId,
            validationRequestVideoId: validationRequestVideoId,
            segmentSourceMode: segmentSourceMode,
            segmentAiDatasetOptions: segmentAiDatasetOptions,
            isLoadingSegmentAiDatasets: isLoadingSegmentAiDatasets,
            segmentAiDatasetError: segmentAiDatasetError,
            isImportingPredictionSegments: isImportingPredictionSegments,
            predictionModelMode: predictionModelMode,
            selectedPredictionModelMetaId: selectedPredictionModelMetaId,
            huggingFaceModelId: huggingFaceModelId,
            isRerunningPredictionSegments: isRerunningPredictionSegments,
            annotatorOverrideInput: annotatorOverrideInput,
            errorMessage: errorMessage,
            messageTone: messageTone,
            successMessage: successMessage,
            isFullscreen: isFullscreen,
            isValidatingSegments: isValidatingSegments,
            isBlackeningOutsideSegments: isBlackeningOutsideSegments,
            activeValidationIndicatorVideoId: activeValidationIndicatorVideoId,
            videoRef: videoRef,
            videoContainerRef: videoContainerRef,
            labelSelectRef: labelSelectRef,
            timelineRef: timelineRef,
            videoDropdownRef: videoDropdownRef,
            isVideoDropdownOpen: isVideoDropdownOpen,
            videoDropdownSearch: videoDropdownSearch,
            videoDropdownFilter: videoDropdownFilter,
            selectedSegmentAiDatasetId: selectedSegmentAiDatasetId,
            hasUnsavedChanges: hasUnsavedChanges,
            toggleVideoDropdown: toggleVideoDropdown,
            selectVideoFromDropdown: selectVideoFromDropdown,
            enableSegmentEditing: enableSegmentEditing,
            getVideoPatientGender: getVideoPatientGender,
            getVideoPatientAgeLabel: getVideoPatientAgeLabel,
            filteredSelectableVideos: filteredSelectableVideos,
            pendingValidationVideos: pendingValidationVideos,
            selectedVideo: selectedVideo,
            isSelectedVideoViewable: isSelectedVideoViewable,
            canAnnotateSelectedVideo: canAnnotateSelectedVideo,
            selectedPostValidationRebuildDetails: selectedPostValidationRebuildDetails,
            canBlackenOutsideSegments: canBlackenOutsideSegments,
            videoDropdownFilterOptions: videoDropdownFilterOptions,
            baseAnnotatorPrincipal: baseAnnotatorPrincipal,
            isAnnotatorOverrideActive: isAnnotatorOverrideActive,
            canApplyAnnotatorOverride: canApplyAnnotatorOverride,
            activeAnnotatorLabel: activeAnnotatorLabel,
            hasOtherValidatedAnnotator: hasOtherValidatedAnnotator,
            getVideoValidatedAnnotatorLabel: getVideoValidatedAnnotatorLabel,
            canMutateSelectedSegments: canMutateSelectedSegments,
            predictionModelOptions: predictionModelOptions,
            canRerunPredictionSegments: canRerunPredictionSegments,
            formatPredictionModelOption: formatPredictionModelOption,
            selectedVideoLabel: selectedVideoLabel,
            restartVideoAnnotationAsOverride: restartVideoAnnotationAsOverride,
            revertVideoAnnotatorOverride: revertVideoAnnotatorOverride,
            anonymizedVideoSrc: anonymizedVideoSrc,
            hasVideos: hasVideos,
            noVideosMessage: noVideosMessage,
            timelineSegmentsForSelectedVideo: timelineSegmentsForSelectedVideo,
            canStartLabeling: canStartLabeling,
            clearErrorMessage: clearErrorMessage,
            clearSuccessMessage: clearSuccessMessage,
            handleSegmentSourceChange: handleSegmentSourceChange,
            onVideoLoaded: onVideoLoaded,
            handleTimeUpdate: handleTimeUpdate,
            handleTimelineClick: handleTimelineClick,
            handleTimelineSeek: handleTimelineSeek,
            handlePlayPause: handlePlayPause,
            handleSegmentSelect: handleSegmentSelect,
            handleSegmentLabelChange: handleSegmentLabelChange,
            handleSegmentResize: handleSegmentResize,
            handleSegmentMove: handleSegmentMove,
            handleTimeSelection: handleTimeSelection,
            handleCreateSegment: handleCreateSegment,
            handleSegmentDelete: handleSegmentDelete,
            onLabelSelect: onLabelSelect,
            toggleFullscreen: toggleFullscreen,
            closeLabelOverlay: closeLabelOverlay,
            selectLabelFromOverlay: selectLabelFromOverlay,
            startLabelMarking: startLabelMarking,
            finishLabelMarking: finishLabelMarking,
            cancelLabelMarking: cancelLabelMarking,
            jumpToExamination: jumpToExamination,
            deleteExamination: deleteExamination,
            handleValidateAndMark: handleValidateAndMark,
            blackenOutsideSegmentsForSelectedVideo: blackenOutsideSegmentsForSelectedVideo,
            saveSegmentChanges: saveSegmentChanges,
            discardSegmentChanges: discardSegmentChanges,
            importPredictionSegmentsToManual: importPredictionSegmentsToManual,
            rerunPredictionSegmentsForSelectedVideo: rerunPredictionSegmentsForSelectedVideo,
            onVideoError: onVideoError,
            onVideoLoadStart: onVideoLoadStart,
            onVideoCanPlay: onVideoCanPlay,
            getVideoDropdownStatusText: getVideoDropdownStatusText,
            getSegmentAnnotationStatusBadgeText: getSegmentAnnotationStatusBadgeText,
            getSegmentAnnotationStatusBadgeClass: getSegmentAnnotationStatusBadgeClass,
            getVideoDropdownStatusBadgeClass: getVideoDropdownStatusBadgeClass,
            getVideoDropdownItemClass: getVideoDropdownItemClass,
            getVideoStatusIndicator: getVideoStatusIndicator,
            getVideoCountByStatus: getVideoCountByStatus,
            getStatusBadgeClass: getStatusBadgeClass,
            getStatusText: getStatusText,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
