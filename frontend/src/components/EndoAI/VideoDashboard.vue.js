import { ref, computed, onMounted, watch } from 'vue';
import { useVideoStore } from '@/stores/videoStore';
const videoStore = useVideoStore();
const { videoUrl, currentVideo, videoMeta, allSegments, videoList, duration, fetchVideoUrl, fetchAllSegments, fetchAllVideos, fetchVideoMeta, getColorForLabel, getTranslationForLabel, jumpToSegment: storeJumpToSegment, getSegmentStyle } = videoStore;
// Local state
const loading = ref(false);
const videoElement = ref(null);
const timelineRef = ref(null);
const currentVideoMeta = ref(null);
const anonymizationFilter = ref('all');
const currentVideoAnonymizationDetails = ref(null);
// Computed properties
const sortedSegments = computed(() => {
    return [...allSegments].sort((a, b) => a.startTime - b.startTime);
});
const filteredVideos = computed(() => {
    return videoList.videos.filter((video) => {
        if (anonymizationFilter.value === 'all')
            return true;
        if (anonymizationFilter.value === 'anonymized')
            return video.anonymized;
        if (anonymizationFilter.value === 'not_anonymized')
            return !video.anonymized;
        return true;
    });
});
// Statistik-Computed Properties
const anonymizedCount = computed(() => {
    return videoList.videos.filter((video) => video.anonymized).length;
});
const pendingCount = computed(() => {
    return videoList.videos.filter((video) => !video.anonymized && video.hasROI).length;
});
const inProgressCount = computed(() => {
    return videoList.videos.filter((video) => video.status === 'in_progress').length;
});
// Methods
const refreshData = async () => {
    loading.value = true;
    try {
        await fetchAllVideos();
    }
    catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
    }
    finally {
        loading.value = false;
    }
};
const selectVideo = async (video) => {
    loading.value = true;
    try {
        // Set video in store
        videoStore.setVideo({
            id: video.id.toString(),
            isAnnotated: true,
            errorMessage: '',
            segments: [],
            videoUrl: '',
            status: video.status,
            assignedUser: video.assignedUser || null
        });
        // Fetch video data
        await loadVideoData(video);
        await loadAnonymizationDetails(video.id);
    }
    catch (error) {
        console.error('Fehler beim Auswählen des Videos:', error);
    }
    finally {
        loading.value = false;
    }
};
const loadVideoData = async (video) => {
    loading.value = true;
    try {
        await fetchVideoMeta(video.id);
        await fetchVideoUrl(video.id);
        await fetchAllSegments(video.id.toString());
        currentVideoMeta.value = videoMeta;
    }
    catch (error) {
        console.error('Fehler beim Laden der Video-Daten:', error);
    }
    finally {
        loading.value = false;
    }
};
const loadAnonymizationDetails = async (videoId) => {
    try {
        // Simulierte API-Anfrage für Anonymisierungsdetails
        // In einer echten Anwendung würde dies eine tatsächliche API-Anfrage sein
        const response = await fetch(`/api/videos/${videoId}/anonymization-details`);
        if (!response.ok) {
            // Fallback-Daten wenn API nicht verfügbar
            const video = videoList.videos.find((v) => v.id === videoId);
            currentVideoAnonymizationDetails.value = {
                anonymized: video?.anonymized || false,
                hasROI: video?.hasROI || false,
                roi: { x: 100, y: 100, width: 300, height: 200 },
                outsideFrameCount: video?.outsideFrameCount || 0,
                totalFrameCount: 1000,
            };
        }
        else {
            const data = await response.json();
            currentVideoAnonymizationDetails.value = data;
        }
    }
    catch (error) {
        console.error('Fehler beim Laden der Anonymisierungsdetails:', error);
        // Fallback-Daten
        const video = videoList.videos.find((v) => v.id === videoId);
        currentVideoAnonymizationDetails.value = {
            anonymized: video?.anonymized || false,
            hasROI: video?.hasROI || false,
            roi: { x: 100, y: 100, width: 300, height: 200 },
            outsideFrameCount: video?.outsideFrameCount || 0,
            totalFrameCount: 1000,
        };
    }
};
const showSegments = async (video) => {
    await fetchAllSegments(video.id.toString());
};
const setAnonymizationFilter = (filter) => {
    anonymizationFilter.value = filter;
};
const getSegmentCountForVideo = (videoId) => {
    if (currentVideo?.id === videoId.toString()) {
        return allSegments.length;
    }
    return 0;
};
const jumpToSegment = (segment) => {
    storeJumpToSegment(segment, videoElement.value);
};
const onVideoLoaded = () => {
    console.log('Video geladen, Dauer:', videoElement.value?.duration);
};
// Anonymisierungsfunktionen
const startAnonymization = async () => {
    if (!currentVideo || !currentVideoAnonymizationDetails.value?.hasROI) {
        alert('ROI muss definiert sein, bevor die Anonymisierung gestartet werden kann.');
        return;
    }
    loading.value = true;
    try {
        const response = await fetch(`/api/videos/${currentVideo.id}/anonymize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                roi: currentVideoAnonymizationDetails.value.roi,
            }),
        });
        if (!response.ok) {
            throw new Error('Anonymisierung fehlgeschlagen');
        }
        // Aktualisiere die Anonymisierungsdetails
        await loadAnonymizationDetails(parseInt(currentVideo.id));
        // Aktualisiere die Videoliste
        await refreshData();
        alert('Anonymisierung erfolgreich gestartet!');
    }
    catch (error) {
        console.error('Fehler bei der Anonymisierung:', error);
        alert('Fehler bei der Anonymisierung. Bitte versuchen Sie es erneut.');
    }
    finally {
        loading.value = false;
    }
};
const startAnonymizationForVideo = async (video) => {
    await selectVideo(video);
    await startAnonymization();
};
const downloadAnonymizedVideo = () => {
    if (!currentVideo)
        return;
    const downloadUrl = `/api/videos/${currentVideo.id}/download-anonymized`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `anonymized_${currentVideoMeta.value?.originalFileName || 'video.mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
const editROI = () => {
    if (!currentVideo)
        return;
    // Hier würde ein ROI-Editor-Modal geöffnet werden
    alert('ROI-Editor wird implementiert. Aktuell können Sie die ROI-Koordinaten manuell anpassen.');
    // Beispiel für eine einfache ROI-Bearbeitung
    const newX = prompt('X-Koordinate:', currentVideoAnonymizationDetails.value?.roi.x?.toString() || '0');
    const newY = prompt('Y-Koordinate:', currentVideoAnonymizationDetails.value?.roi.y?.toString() || '0');
    const newWidth = prompt('Breite:', currentVideoAnonymizationDetails.value?.roi.width?.toString() || '100');
    const newHeight = prompt('Höhe:', currentVideoAnonymizationDetails.value?.roi.height?.toString() || '100');
    if (newX && newY && newWidth && newHeight && currentVideoAnonymizationDetails.value) {
        currentVideoAnonymizationDetails.value.roi = {
            x: parseInt(newX),
            y: parseInt(newY),
            width: parseInt(newWidth),
            height: parseInt(newHeight),
        };
        currentVideoAnonymizationDetails.value.hasROI = true;
    }
};
const getROIStyle = (roi) => {
    return {
        position: 'relative',
        width: '300px',
        height: '200px',
        border: '2px solid #007bff',
        borderRadius: '4px',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '10px 0',
    };
};
// Utility methods
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
const formatDuration = (seconds) => {
    if (!seconds)
        return 'Unbekannt';
    return formatTime(seconds);
};
const getStatusText = (status) => {
    const statusMap = {
        'available': 'Verfügbar',
        'in_progress': 'In Bearbeitung',
        'completed': 'Abgeschlossen'
    };
    return statusMap[status || 'available'] || status || 'Unbekannt';
};
const getStatusBadgeClass = (status) => {
    const classMap = {
        'available': 'badge bg-success',
        'in_progress': 'badge bg-warning',
        'completed': 'badge bg-primary'
    };
    return classMap[status || 'available'] || 'badge bg-secondary';
};
const getConfidenceClass = (confidence) => {
    if (confidence >= 0.8)
        return 'bg-success';
    if (confidence >= 0.6)
        return 'bg-warning';
    return 'bg-danger';
};
// Lifecycle
onMounted(async () => {
    await refreshData();
    // Load first video if available
    if (videoList.videos.length > 0) {
        await selectVideo(videoList.videos[0]);
    }
});
// Watch for video changes
watch(() => videoMeta, (newMeta) => {
    currentVideoMeta.value = newMeta;
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['segment-bar', 'anonymization-info', 'anonymization-info', 'anonymization-info', 'roi-info', 'roi-box', 'card', 'card', 'card', 'card', 'card', 'bg-primary', 'card', 'bg-success', 'card-body', 'card', 'bg-warning', 'card-body', 'card', 'bg-info', 'card-body', 'card', 'bg-primary', 'card', 'bg-success', 'card', 'bg-warning', 'card', 'bg-info', 'card', 'bg-primary', 'card', 'bg-success', 'card', 'bg-warning', 'card', 'bg-info', 'btn', 'btn-group', 'btn', 'btn-group', 'btn', 'btn-group', 'btn', 'table', 'table-hover', 'btn-group-sm', 'btn', 'btn-group-sm', 'btn', 'roi-box', 'card', 'bg-primary', 'card', 'bg-success', 'card', 'bg-warning', 'card', 'bg-info', 'btn-group', 'btn', 'badge', 'card', 'card', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: ("main-content border-radius-lg") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        id: ("app"),
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("card-title mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-video me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex gap-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("btn-group") },
        role: ("group"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setAnonymizationFilter('all');
            } },
        ...{ class: ("btn btn-sm") },
        ...{ class: ((__VLS_ctx.anonymizationFilter === 'all' ? 'btn-primary' : 'btn-outline-primary')) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setAnonymizationFilter('anonymized');
            } },
        ...{ class: ("btn btn-sm") },
        ...{ class: ((__VLS_ctx.anonymizationFilter === 'anonymized' ? 'btn-success' : 'btn-outline-success')) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setAnonymizationFilter('not_anonymized');
            } },
        ...{ class: ("btn btn-sm") },
        ...{ class: ((__VLS_ctx.anonymizationFilter === 'not_anonymized' ? 'btn-warning' : 'btn-outline-warning')) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshData) },
        ...{ class: ("btn btn-primary btn-sm") },
        disabled: ((__VLS_ctx.loading)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm me-2") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-refresh me-2") },
        });
    }
    (__VLS_ctx.loading ? 'Lade...' : 'Aktualisieren');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card bg-primary text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.videoList.videos.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-video fa-2x opacity-50") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card bg-success text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.anonymizedCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check-circle fa-2x opacity-50") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card bg-warning text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.pendingCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-clock fa-2x opacity-50") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card bg-info text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.inProgressCount);
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-cog fa-2x opacity-50") },
    });
    if (__VLS_ctx.videoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
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
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-play-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("video-player text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onLoadedmetadata: (__VLS_ctx.onVideoLoaded) },
            ref: ("videoElement"),
            controls: (true),
            src: ((__VLS_ctx.videoUrl)),
            ...{ class: ("rounded shadow") },
            ...{ style: ({}) },
        });
        // @ts-ignore navigation for `const videoElement = ref()`
        /** @type { typeof __VLS_ctx.videoElement } */ ;
        if (__VLS_ctx.currentVideoMeta) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("row") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentVideoMeta.originalFileName);
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.formatDuration(__VLS_ctx.currentVideoMeta.duration));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("col-md-6") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((__VLS_ctx.getStatusBadgeClass(__VLS_ctx.currentVideo?.status))) },
            });
            (__VLS_ctx.getStatusText(__VLS_ctx.currentVideo?.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.currentVideo?.assignedUser || 'Nicht zugewiesen');
        }
    }
    if (__VLS_ctx.currentVideo && __VLS_ctx.currentVideoAnonymizationDetails) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
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
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-shield-alt me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("anonymization-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-info-circle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: ("list-unstyled") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.currentVideoAnonymizationDetails.anonymized ? 'badge bg-success' : 'badge bg-warning')) },
        });
        (__VLS_ctx.currentVideoAnonymizationDetails.anonymized ? 'Anonymisiert' : 'Nicht anonymisiert');
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ((__VLS_ctx.currentVideoAnonymizationDetails.hasROI ? 'badge bg-success' : 'badge bg-danger')) },
        });
        (__VLS_ctx.currentVideoAnonymizationDetails.hasROI ? 'Ja' : 'Nein');
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-info") },
        });
        (__VLS_ctx.currentVideoAnonymizationDetails.outsideFrameCount);
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-secondary") },
        });
        (__VLS_ctx.currentVideoAnonymizationDetails.totalFrameCount);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        if (__VLS_ctx.currentVideoAnonymizationDetails.hasROI) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("roi-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-crop me-2") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("roi-visualization") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("roi-box") },
                ...{ style: ((__VLS_ctx.getROIStyle(__VLS_ctx.currentVideoAnonymizationDetails.roi))) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("roi-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.currentVideoAnonymizationDetails.roi.x);
            (__VLS_ctx.currentVideoAnonymizationDetails.roi.y);
            (__VLS_ctx.currentVideoAnonymizationDetails.roi.width);
            (__VLS_ctx.currentVideoAnonymizationDetails.roi.height);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-exclamation-triangle me-2") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mt-3 pt-3 border-top") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex gap-2") },
        });
        if (!__VLS_ctx.currentVideoAnonymizationDetails.anonymized) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.startAnonymization) },
                ...{ class: ("btn btn-success") },
                disabled: ((!__VLS_ctx.currentVideoAnonymizationDetails.hasROI || __VLS_ctx.loading)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-play me-2") },
            });
        }
        if (__VLS_ctx.currentVideoAnonymizationDetails.anonymized) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.downloadAnonymizedVideo) },
                ...{ class: ("btn btn-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-download me-2") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.editROI) },
            ...{ class: ("btn btn-outline-primary") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-edit me-2") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
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
        ...{ class: ("card-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-list me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge bg-secondary ms-2") },
    });
    (__VLS_ctx.filteredVideos.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    if (__VLS_ctx.filteredVideos.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("table-responsive") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: ("table table-hover table-striped") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: ("table-dark") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [video] of __VLS_getVForSourceType((__VLS_ctx.filteredVideos))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.filteredVideos.length)))
                            return;
                        __VLS_ctx.selectVideo(video);
                    } },
                key: ((video.id)),
                ...{ style: ({}) },
                ...{ class: (({ 'table-active': __VLS_ctx.currentVideo?.id === video.id.toString() })) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (video.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-video me-2 text-primary") },
            });
            (video.originalFileName);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((__VLS_ctx.getStatusBadgeClass(video.status))) },
            });
            (__VLS_ctx.getStatusText(video.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (video.assignedUser || 'Nicht zugewiesen');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((video.anonymized ? 'badge bg-success' : 'badge bg-warning')) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((video.anonymized ? 'fas fa-check' : 'fas fa-clock')) },
            });
            (video.anonymized ? 'Ja' : 'Nein');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((video.hasROI ? 'badge bg-success' : 'badge bg-danger')) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((video.hasROI ? 'fas fa-check' : 'fas fa-times')) },
            });
            (video.hasROI ? 'Ja' : 'Nein');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-warning") },
            });
            (video.outsideFrameCount || 0);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-info") },
            });
            (__VLS_ctx.getSegmentCountForVideo(video.id));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.filteredVideos.length)))
                            return;
                        __VLS_ctx.loadVideoData(video);
                    } },
                ...{ class: ("btn btn-outline-primary") },
                disabled: ((__VLS_ctx.loading)),
                title: ("Video laden"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-play") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.filteredVideos.length)))
                            return;
                        __VLS_ctx.showSegments(video);
                    } },
                ...{ class: ("btn btn-outline-info") },
                title: ("Segmente anzeigen"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-list") },
            });
            if (!video.anonymized && video.hasROI) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.filteredVideos.length)))
                                return;
                            if (!((!video.anonymized && video.hasROI)))
                                return;
                            __VLS_ctx.startAnonymizationForVideo(video);
                        } },
                    ...{ class: ("btn btn-outline-success") },
                    title: ("Anonymisierung starten"),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-shield-alt") },
                });
            }
        }
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-video fa-3x text-muted mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
    }
    if (__VLS_ctx.allSegments.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
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
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cut me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-info ms-2") },
        });
        (__VLS_ctx.allSegments.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.duration > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("timeline-container mb-4") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("timeline-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatDuration(__VLS_ctx.duration));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("timeline-track") },
                ref: ("timelineRef"),
            });
            // @ts-ignore navigation for `const timelineRef = ref()`
            /** @type { typeof __VLS_ctx.timelineRef } */ ;
            for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.allSegments))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!((__VLS_ctx.allSegments.length)))
                                return;
                            if (!((__VLS_ctx.duration > 0)))
                                return;
                            __VLS_ctx.jumpToSegment(segment);
                        } },
                    key: ((segment.id)),
                    ...{ style: ((__VLS_ctx.getSegmentStyle(segment, __VLS_ctx.duration))) },
                    ...{ class: ((`segment-bar segment-${segment.label}`)) },
                    title: ((`${__VLS_ctx.getTranslationForLabel(segment.label)}: ${__VLS_ctx.formatTime(segment.startTime)} - ${__VLS_ctx.formatTime(segment.endTime)}`)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("segment-label") },
                });
                (__VLS_ctx.getTranslationForLabel(segment.label));
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("timeline-labels") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatDuration(__VLS_ctx.duration));
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("table-responsive") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: ("table table-sm table-hover") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: ("table-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.sortedSegments))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((segment.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ style: (({ backgroundColor: __VLS_ctx.getColorForLabel(segment.label), color: 'white' })) },
            });
            (segment.label);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.getTranslationForLabel(segment.label));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatTime(segment.startTime));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatTime(segment.endTime));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatTime(segment.endTime - segment.startTime));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress") },
                ...{ style: ({}) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("progress-bar") },
                ...{ class: ((__VLS_ctx.getConfidenceClass(segment.avgConfidence))) },
                ...{ style: (({ width: (segment.avgConfidence * 100) + '%' })) },
            });
            (Math.round(segment.avgConfidence * 100));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.allSegments.length)))
                            return;
                        __VLS_ctx.jumpToSegment(segment);
                    } },
                ...{ class: ("btn btn-sm btn-outline-primary") },
                title: ("Zu Segment springen"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-play") },
            });
        }
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
        ...{ class: ("card-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-palette me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.videoList.labels))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((label.id)),
            ...{ class: ("col-md-3 col-sm-6 mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge me-2") },
            ...{ style: (({ backgroundColor: __VLS_ctx.getColorForLabel(label.name), color: 'white' })) },
        });
        (label.name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.getTranslationForLabel(label.name));
    }
    ['container-fluid', 'py-4', 'main-content', 'border-radius-lg', 'container-fluid', 'py-4', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'pb-0', 'd-flex', 'justify-content-between', 'align-items-center', 'card-title', 'mb-0', 'fas', 'fa-video', 'me-2', 'd-flex', 'gap-2', 'btn-group', 'btn', 'btn-sm', 'btn', 'btn-sm', 'btn', 'btn-sm', 'btn', 'btn-primary', 'btn-sm', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-refresh', 'me-2', 'row', 'mb-4', 'col-md-3', 'card', 'bg-primary', 'text-white', 'card-body', 'd-flex', 'justify-content-between', 'fas', 'fa-video', 'fa-2x', 'opacity-50', 'col-md-3', 'card', 'bg-success', 'text-white', 'card-body', 'd-flex', 'justify-content-between', 'fas', 'fa-check-circle', 'fa-2x', 'opacity-50', 'col-md-3', 'card', 'bg-warning', 'text-white', 'card-body', 'd-flex', 'justify-content-between', 'fas', 'fa-clock', 'fa-2x', 'opacity-50', 'col-md-3', 'card', 'bg-info', 'text-white', 'card-body', 'd-flex', 'justify-content-between', 'fas', 'fa-cog', 'fa-2x', 'opacity-50', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'card-title', 'fas', 'fa-play-circle', 'me-2', 'card-body', 'video-player', 'text-center', 'rounded', 'shadow', 'mt-3', 'row', 'col-md-6', 'col-md-6', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'card-title', 'fas', 'fa-shield-alt', 'me-2', 'card-body', 'row', 'col-md-6', 'anonymization-info', 'fas', 'fa-info-circle', 'me-2', 'list-unstyled', 'badge', 'bg-info', 'badge', 'bg-secondary', 'col-md-6', 'roi-info', 'fas', 'fa-crop', 'me-2', 'roi-visualization', 'roi-box', 'roi-label', 'text-muted', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'me-2', 'mt-3', 'pt-3', 'border-top', 'd-flex', 'gap-2', 'btn', 'btn-success', 'fas', 'fa-play', 'me-2', 'btn', 'btn-info', 'fas', 'fa-download', 'me-2', 'btn', 'btn-outline-primary', 'fas', 'fa-edit', 'me-2', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'card-title', 'fas', 'fa-list', 'me-2', 'badge', 'bg-secondary', 'ms-2', 'card-body', 'table-responsive', 'table', 'table-hover', 'table-striped', 'table-dark', 'table-active', 'd-flex', 'align-items-center', 'fas', 'fa-video', 'me-2', 'text-primary', 'badge', 'bg-warning', 'badge', 'bg-info', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-primary', 'fas', 'fa-play', 'btn', 'btn-outline-info', 'fas', 'fa-list', 'btn', 'btn-outline-success', 'fas', 'fa-shield-alt', 'text-center', 'py-4', 'fas', 'fa-video', 'fa-3x', 'text-muted', 'mb-3', 'text-muted', 'row', 'mb-4', 'col-12', 'card', 'card-header', 'card-title', 'fas', 'fa-cut', 'me-2', 'badge', 'bg-info', 'ms-2', 'card-body', 'timeline-container', 'mb-4', 'timeline-header', 'timeline-track', 'segment-label', 'timeline-labels', 'table-responsive', 'table', 'table-sm', 'table-hover', 'table-light', 'badge', 'progress', 'progress-bar', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-play', 'row', 'col-12', 'card', 'card-header', 'card-title', 'fas', 'fa-palette', 'me-2', 'card-body', 'row', 'col-md-3', 'col-sm-6', 'mb-2', 'd-flex', 'align-items-center', 'badge', 'me-2', 'text-muted',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoElement': __VLS_nativeElements['video'],
        'timelineRef': __VLS_nativeElements['div'],
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
            videoUrl: videoUrl,
            currentVideo: currentVideo,
            allSegments: allSegments,
            videoList: videoList,
            duration: duration,
            getColorForLabel: getColorForLabel,
            getTranslationForLabel: getTranslationForLabel,
            getSegmentStyle: getSegmentStyle,
            loading: loading,
            videoElement: videoElement,
            timelineRef: timelineRef,
            currentVideoMeta: currentVideoMeta,
            anonymizationFilter: anonymizationFilter,
            currentVideoAnonymizationDetails: currentVideoAnonymizationDetails,
            sortedSegments: sortedSegments,
            filteredVideos: filteredVideos,
            anonymizedCount: anonymizedCount,
            pendingCount: pendingCount,
            inProgressCount: inProgressCount,
            refreshData: refreshData,
            selectVideo: selectVideo,
            loadVideoData: loadVideoData,
            showSegments: showSegments,
            setAnonymizationFilter: setAnonymizationFilter,
            getSegmentCountForVideo: getSegmentCountForVideo,
            jumpToSegment: jumpToSegment,
            onVideoLoaded: onVideoLoaded,
            startAnonymization: startAnonymization,
            startAnonymizationForVideo: startAnonymizationForVideo,
            downloadAnonymizedVideo: downloadAnonymizedVideo,
            editROI: editROI,
            getROIStyle: getROIStyle,
            formatTime: formatTime,
            formatDuration: formatDuration,
            getStatusText: getStatusText,
            getStatusBadgeClass: getStatusBadgeClass,
            getConfidenceClass: getConfidenceClass,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
