import { ref, onMounted, computed } from 'vue';
import { useAnnotationStore } from '@/stores/annotationStore';
import { useVideoStore } from '@/stores/videoStore';
import { useImageStore } from '@/stores/imageStore';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'vue-router';
const annotationStore = useAnnotationStore();
const videoStore = useVideoStore();
const imageStore = useImageStore();
const anonymizationStore = useAnonymizationStore();
const userStore = useUserStore();
const router = useRouter();
const videoStats = ref({
    total: 0,
    inProgress: 0,
    completed: 0,
    available: 0,
});
const imageStats = ref({
    total: 0,
    inProgress: 0,
    completed: 0,
});
const anonymizationStats = ref({
    total: 0,
    inProgress: 0,
    completed: 0,
});
const videoAnonymizations = ref([]);
const loadingVideoAnonymizations = ref(false);
const pdfAnnotations = ref([]);
const loadingPdfAnnotations = ref(false);
// Computed Properties für Video-Anonymisierung
const videoAnonymizationStats = computed(() => {
    const stats = {
        total: videoAnonymizations.value.length,
        pending: 0,
        processing: 0,
        anonymized: 0
    };
    videoAnonymizations.value.forEach(video => {
        switch (video.status) {
            case 'pending':
            case 'uploaded':
            case 'frames_extracted':
                stats.pending++;
                break;
            case 'processing':
            case 'segmenting':
            case 'anonymizing':
                stats.processing++;
                break;
            case 'anonymized':
            case 'completed':
                stats.anonymized++;
                break;
        }
    });
    return stats;
});
// Computed Properties für PDF-Annotationen
const pdfAnnotationStats = computed(() => {
    const stats = {
        total: pdfAnnotations.value.length,
        pending: 0,
        inProgress: 0,
        completed: 0,
    };
    pdfAnnotations.value.forEach(pdf => {
        switch (pdf.status) {
            case 'pending':
                stats.pending++;
                break;
            case 'in_progress':
                stats.inProgress++;
                break;
            case 'completed':
                stats.completed++;
                break;
        }
    });
    return stats;
});
// Check if userStore is empty and add a default user
// This is a fallback in case the userStore is empty
// #TODO: Remove this when userStore is properly populated
const users = ref([]);
if (!userStore.users || userStore.users.length === 0) {
    const currentUser = {
        id: 'current-session-user',
        name: 'Aktueller User',
        videoAnnotations: 0,
        imageAnnotations: 0,
        anonymizationAnnotations: 0,
    };
    users.value = [currentUser];
}
onMounted(async () => {
    console.log('Dashboard mounted, fetching data...');
    try {
        // Fetch video annotations
        await videoStore.fetchAllVideos();
        const videos = videoStore.videoList.videos;
        console.log('Videos loaded:', videos);
        videoStats.value.total = videos.length;
        videoStats.value.inProgress = videos.filter(v => v.status === 'in_progress').length;
        videoStats.value.completed = videos.filter(v => v.status === 'completed').length;
        videoStats.value.available = videos.filter(v => v.status === 'available').length;
        console.log('Video stats calculated:', videoStats.value);
        // Fetch image annotations
        imageStats.value.total = imageStore.data.length;
        imageStats.value.inProgress = imageStore.data.filter(img => img.status === 'in_progress').length;
        imageStats.value.completed = imageStore.data.filter(img => img.status === 'completed').length;
        // Fetch anonymization annotations
        await anonymizationStore.fetchPendingAnonymizations();
        const anonymizations = anonymizationStore.pendingAnonymizations;
        anonymizationStats.value.total = anonymizations.length;
        anonymizationStats.value.inProgress = anonymizations.filter(a => a.status === 'in_progress').length;
        anonymizationStats.value.completed = anonymizations.filter(a => a.status === 'completed').length;
        // Fetch users and their annotation counts
        await userStore.fetchUsers();
        users.value = userStore.users.map(user => ({
            id: user.id,
            name: user.name,
            videoAnnotations: videos.filter(v => v.assignedUser === user.name).length,
            imageAnnotations: imageStore.data.filter(img => img.assignedUser === user.name).length,
            anonymizationAnnotations: anonymizations.filter(a => a.report_meta?.patient_first_name === user.name).length,
        }));
        console.log('Users with annotation counts:', users.value);
    }
    catch (error) {
        console.error('Error loading dashboard data:', error);
    }
});
// Video-Anonymisierungs-Methoden
const refreshVideoAnonymizations = async () => {
    loadingVideoAnonymizations.value = true;
    try {
        await videoStore.fetchVideosForAnonymization();
        videoAnonymizations.value = videoStore.videosForAnonymization || [];
    }
    catch (error) {
        console.error('Fehler beim Laden der Video-Anonymisierungen:', error);
    }
    finally {
        loadingVideoAnonymizations.value = false;
    }
};
const refreshAnnotations = async () => {
    // Existing annotation refresh logic
};
const refreshPdfAnnotations = async () => {
    loadingPdfAnnotations.value = true;
    try {
        // Use the existing PDF serializer endpoint
        const response = await fetch('/api/pdf/sensitivemeta/', {
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            pdfAnnotations.value = Array.isArray(data) ? data : [data];
        }
        else {
            pdfAnnotations.value = [];
        }
    }
    catch (error) {
        console.error('Fehler beim Laden der PDF-Annotationen:', error);
        pdfAnnotations.value = [];
    }
    finally {
        loadingPdfAnnotations.value = false;
    }
};
const getStatusBadgeClass = (status) => {
    const statusClasses = {
        'pending': 'bg-secondary',
        'uploaded': 'bg-info',
        'frames_extracted': 'bg-primary',
        'processing': 'bg-warning',
        'segmenting': 'bg-warning',
        'anonymizing': 'bg-warning',
        'anonymized': 'bg-success',
        'completed': 'bg-success',
        'error': 'bg-danger',
        'failed': 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
};
const getStatusDisplayText = (status) => {
    const statusTexts = {
        'pending': 'Wartend',
        'uploaded': 'Hochgeladen',
        'frames_extracted': 'Frames extrahiert',
        'processing': 'In Bearbeitung',
        'segmenting': 'Segmentierung',
        'anonymizing': 'Anonymisierung',
        'anonymized': 'Anonymisiert',
        'completed': 'Abgeschlossen',
        'error': 'Fehler',
        'failed': 'Fehlgeschlagen'
    };
    return statusTexts[status] || status;
};
const getPdfStatusBadgeClass = (status) => {
    const statusClasses = {
        'pending': 'bg-secondary',
        'in_progress': 'bg-warning',
        'completed': 'bg-success',
        'error': 'bg-danger',
        'failed': 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
};
const getPdfStatusDisplayText = (status) => {
    const statusTexts = {
        'pending': 'Wartend',
        'in_progress': 'In Bearbeitung',
        'completed': 'Abgeschlossen',
        'error': 'Fehler',
        'failed': 'Fehlgeschlagen'
    };
    return statusTexts[status] || status;
};
const formatDate = (dateString) => {
    if (!dateString)
        return 'Nicht verfügbar';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch (error) {
        return 'Ungültig';
    }
};
const formatFileSize = (size) => {
    if (typeof size !== 'number')
        return 'Unbekannt';
    const units = ['B', 'kB', 'MB', 'GB'];
    let index = 0;
    let formattedSize = size;
    while (formattedSize >= 1024 && index < units.length - 1) {
        formattedSize /= 1024;
        index++;
    }
    return `${formattedSize.toFixed(1)} ${units[index]}`;
};
const viewVideoDetails = (video) => {
    // Navigation zu Video-Details
    router.push({
        name: 'Video Annotation',
        params: { videoId: video.id }
    });
};
const annotateVideo = (video) => {
    // Navigation zur Video-Annotation
    router.push({
        name: 'Video Annotation',
        query: {
            videoId: video.id,
            mode: 'annotate'
        }
    });
};
const processAnonymization = async (video) => {
    try {
        await videoStore.startAnonymization(video.id);
        await refreshVideoAnonymizations();
        // Optional: Success notification
    }
    catch (error) {
        console.error('Fehler beim Starten der Anonymisierung:', error);
        // Optional: Error notification
    }
};
// Add PDF-specific methods
const viewPdfDetails = (pdf) => {
    // Navigation zu PDF-Details
    router.push({
        name: 'PDF Patienten Annotation',
        params: { pdfId: pdf.id }
    });
};
const annotatePdf = (pdf) => {
    // Navigation zur PDF-Annotation
    router.push({
        name: 'PDF Patienten Annotation',
        query: {
            pdfId: pdf.id,
            mode: 'annotate'
        }
    });
};
const viewAnonymizedText = (pdf) => {
    // Navigation zur Anzeige des anonymisierten Texts
    router.push({
        name: 'PDF Patienten Annotation',
        params: { pdfId: pdf.id },
        query: { tab: 'anonymized' }
    });
};
// Add PDF-specific utility method
const getFileName = (filePath) => {
    if (!filePath)
        return 'Unbekannt';
    return filePath.split('/').pop() || filePath;
};
// Initialisierung
onMounted(async () => {
    await Promise.all([
        refreshAnnotations(),
        refreshVideoAnonymizations(),
        refreshPdfAnnotations()
    ]);
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['table', 'table', 'table-dark', 'table-dark',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-4") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.videoStats.total);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.videoStats.inProgress);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.videoStats.completed);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.videoStats.available);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-4") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.imageStats.total);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.imageStats.inProgress);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.imageStats.completed);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-4") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.anonymizationStats.total);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.anonymizationStats.inProgress);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.anonymizationStats.completed);
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
        ...{ class: ("card-header d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshVideoAnonymizations) },
        ...{ class: ("btn btn-primary btn-sm") },
        disabled: ((__VLS_ctx.loadingVideoAnonymizations)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.loadingVideoAnonymizations })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-info text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-video") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.videoAnonymizationStats.total);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-warning text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-clock") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.videoAnonymizationStats.pending);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-primary text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-cogs") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.videoAnonymizationStats.processing);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-success text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check-circle") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.videoAnonymizationStats.anonymized);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-responsive") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-hover") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    if (__VLS_ctx.loadingVideoAnonymizations) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
    }
    else if (__VLS_ctx.videoAnonymizations.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center text-muted") },
        });
    }
    else {
        for (const [video] of __VLS_getVForSourceType((__VLS_ctx.videoAnonymizations))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((video.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (video.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-truncate") },
                ...{ style: ({}) },
                title: ((video.originalFileName)),
            });
            (video.originalFileName);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (video.patientFirstName || video.patientLastName) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                (video.patientFirstName);
                (video.patientLastName);
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (video.examinationDate) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                (__VLS_ctx.formatDate(video.examinationDate));
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ class: ((__VLS_ctx.getStatusBadgeClass(video.status))) },
            });
            (__VLS_ctx.getStatusDisplayText(video.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (video.segments && video.segments.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                (video.segments.length);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mt-1") },
                });
                for (const [segment] of __VLS_getVForSourceType((video.segments.slice(0, 3)))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        key: ((segment.id)),
                        ...{ class: ("badge bg-secondary me-1 mb-1") },
                        ...{ style: ({}) },
                    });
                    (segment.label_display || segment.label);
                }
                if (video.segments.length > 3) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-light text-dark") },
                    });
                    (video.segments.length - 3);
                }
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
                role: ("group"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingVideoAnonymizations))))
                            return;
                        if (!(!((__VLS_ctx.videoAnonymizations.length === 0))))
                            return;
                        __VLS_ctx.viewVideoDetails(video);
                    } },
                ...{ class: ("btn btn-outline-primary") },
                title: (('Details für Video ' + video.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-eye") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingVideoAnonymizations))))
                            return;
                        if (!(!((__VLS_ctx.videoAnonymizations.length === 0))))
                            return;
                        __VLS_ctx.annotateVideo(video);
                    } },
                ...{ class: ("btn btn-outline-success") },
                disabled: ((video.status === 'anonymized')),
                title: (('Video ' + video.id + ' annotieren')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
            if (video.status !== 'anonymized') {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(!((__VLS_ctx.loadingVideoAnonymizations))))
                                return;
                            if (!(!((__VLS_ctx.videoAnonymizations.length === 0))))
                                return;
                            if (!((video.status !== 'anonymized')))
                                return;
                            __VLS_ctx.processAnonymization(video);
                        } },
                    ...{ class: ("btn btn-outline-warning") },
                    title: (('Anonymisierung für Video ' + video.id + ' starten')),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-user-secret") },
                });
            }
        }
    }
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
        ...{ class: ("card-header d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshPdfAnnotations) },
        ...{ class: ("btn btn-primary btn-sm") },
        disabled: ((__VLS_ctx.loadingPdfAnnotations)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.loadingPdfAnnotations })) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-info text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-file-pdf") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.pdfAnnotationStats.total);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-warning text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-clock") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.pdfAnnotationStats.pending);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-primary text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-edit") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.pdfAnnotationStats.inProgress);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card bg-success text-white") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-check-circle") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.pdfAnnotationStats.completed);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-responsive") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-hover") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    if (__VLS_ctx.loadingPdfAnnotations) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
    }
    else if (__VLS_ctx.pdfAnnotations.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center text-muted") },
        });
    }
    else {
        for (const [pdf] of __VLS_getVForSourceType((__VLS_ctx.pdfAnnotations))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((pdf.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (pdf.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("text-truncate") },
                ...{ style: ({}) },
                title: ((pdf.originalFileName || pdf.file)),
            });
            (__VLS_ctx.getFileName(pdf.file));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (pdf.patient_first_name || pdf.patient_last_name) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                (pdf.patient_first_name);
                (pdf.patient_last_name);
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (pdf.examination_date) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                (__VLS_ctx.formatDate(pdf.examination_date));
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ class: ((__VLS_ctx.getPdfStatusBadgeClass(pdf.status))) },
            });
            (__VLS_ctx.getPdfStatusDisplayText(pdf.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            if (pdf.file_size) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                (__VLS_ctx.formatFileSize(pdf.file_size));
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
                role: ("group"),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingPdfAnnotations))))
                            return;
                        if (!(!((__VLS_ctx.pdfAnnotations.length === 0))))
                            return;
                        __VLS_ctx.viewPdfDetails(pdf);
                    } },
                ...{ class: ("btn btn-outline-primary") },
                title: (('Details für PDF ' + pdf.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-eye") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingPdfAnnotations))))
                            return;
                        if (!(!((__VLS_ctx.pdfAnnotations.length === 0))))
                            return;
                        __VLS_ctx.annotatePdf(pdf);
                    } },
                ...{ class: ("btn btn-outline-success") },
                title: (('PDF ' + pdf.id + ' annotieren')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingPdfAnnotations))))
                            return;
                        if (!(!((__VLS_ctx.pdfAnnotations.length === 0))))
                            return;
                        __VLS_ctx.viewAnonymizedText(pdf);
                    } },
                ...{ class: ("btn btn-outline-info") },
                title: (('Anonymisierten Text für PDF ' + pdf.id + ' anzeigen')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-user-secret") },
            });
        }
    }
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-bordered") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [user] of __VLS_getVForSourceType((__VLS_ctx.users))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: ((user.id)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.videoAnnotations);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.imageAnnotations);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (user.anonymizationAnnotations);
    }
    ['container-fluid', 'py-4', 'row', 'col-md-4', 'card', 'card-header', 'mb-0', 'card-body', 'col-md-4', 'card', 'card-header', 'mb-0', 'card-body', 'col-md-4', 'card', 'card-header', 'mb-0', 'card-body', 'row', 'mt-4', 'col-12', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-primary', 'btn-sm', 'fas', 'fa-sync-alt', 'fa-spin', 'card-body', 'row', 'mb-3', 'col-md-3', 'stat-card', 'bg-info', 'text-white', 'stat-icon', 'fas', 'fa-video', 'stat-content', 'col-md-3', 'stat-card', 'bg-warning', 'text-white', 'stat-icon', 'fas', 'fa-clock', 'stat-content', 'col-md-3', 'stat-card', 'bg-primary', 'text-white', 'stat-icon', 'fas', 'fa-cogs', 'stat-content', 'col-md-3', 'stat-card', 'bg-success', 'text-white', 'stat-icon', 'fas', 'fa-check-circle', 'stat-content', 'table-responsive', 'table', 'table-hover', 'table-dark', 'text-center', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'text-truncate', 'text-muted', 'text-muted', 'badge', 'mt-1', 'badge', 'bg-secondary', 'me-1', 'mb-1', 'badge', 'bg-light', 'text-dark', 'text-muted', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-primary', 'fas', 'fa-eye', 'btn', 'btn-outline-success', 'fas', 'fa-edit', 'btn', 'btn-outline-warning', 'fas', 'fa-user-secret', 'row', 'mt-4', 'col-12', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'btn', 'btn-primary', 'btn-sm', 'fas', 'fa-sync-alt', 'fa-spin', 'card-body', 'row', 'mb-3', 'col-md-3', 'stat-card', 'bg-info', 'text-white', 'stat-icon', 'fas', 'fa-file-pdf', 'stat-content', 'col-md-3', 'stat-card', 'bg-warning', 'text-white', 'stat-icon', 'fas', 'fa-clock', 'stat-content', 'col-md-3', 'stat-card', 'bg-primary', 'text-white', 'stat-icon', 'fas', 'fa-edit', 'stat-content', 'col-md-3', 'stat-card', 'bg-success', 'text-white', 'stat-icon', 'fas', 'fa-check-circle', 'stat-content', 'table-responsive', 'table', 'table-hover', 'table-dark', 'text-center', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'text-truncate', 'text-muted', 'text-muted', 'badge', 'text-muted', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-primary', 'fas', 'fa-eye', 'btn', 'btn-outline-success', 'fas', 'fa-edit', 'btn', 'btn-outline-info', 'fas', 'fa-user-secret', 'row', 'mt-4', 'col-12', 'card', 'card-header', 'mb-0', 'card-body', 'table', 'table-bordered',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {};
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
            videoStats: videoStats,
            imageStats: imageStats,
            anonymizationStats: anonymizationStats,
            videoAnonymizations: videoAnonymizations,
            loadingVideoAnonymizations: loadingVideoAnonymizations,
            pdfAnnotations: pdfAnnotations,
            loadingPdfAnnotations: loadingPdfAnnotations,
            videoAnonymizationStats: videoAnonymizationStats,
            pdfAnnotationStats: pdfAnnotationStats,
            users: users,
            refreshVideoAnonymizations: refreshVideoAnonymizations,
            refreshPdfAnnotations: refreshPdfAnnotations,
            getStatusBadgeClass: getStatusBadgeClass,
            getStatusDisplayText: getStatusDisplayText,
            getPdfStatusBadgeClass: getPdfStatusBadgeClass,
            getPdfStatusDisplayText: getPdfStatusDisplayText,
            formatDate: formatDate,
            formatFileSize: formatFileSize,
            viewVideoDetails: viewVideoDetails,
            annotateVideo: annotateVideo,
            processAnonymization: processAnonymization,
            viewPdfDetails: viewPdfDetails,
            annotatePdf: annotatePdf,
            viewAnonymizedText: viewAnonymizedText,
            getFileName: getFileName,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
