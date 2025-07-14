import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnotationStatsStore } from '@/stores/annotationStats';
import AnnotationStatsComponent from '@/components/AnnotationStatsComponent.vue';
import { useToastStore } from '@/stores/toastStore'; // Assuming you have a toast store for notifications
import axiosInstance from '@/api/axiosInstance';
const toast = useToastStore(); // Use your notification system here
const router = useRouter();
const annotationStatsStore = useAnnotationStatsStore();
// State for detailed data
const segments = ref([]);
const examinations = ref([]);
const sensitiveMetaData = ref([]);
// Loading states
const loadingSegments = ref(false);
const loadingExaminations = ref(false);
const loadingSensitiveMeta = ref(false);
// Methods for fetching detailed data
// Add at the top of script setup
const showError = (message) => {
    // Use your notification system here
    console.error(message);
    toast.error(message);
};
// Methods for fetching detailed data
const refreshSegments = async () => {
    loadingSegments.value = true;
    try {
        const response = await axiosInstance.get('/api/video-segments/');
        segments.value = response.data.results || response.data || [];
    }
    catch (error) {
        showError('Fehler beim Laden der Video-Segmente');
        segments.value = [];
    }
    finally {
        loadingSegments.value = false;
    }
};
const refreshExaminations = async () => {
    loadingExaminations.value = true;
    try {
        const response = await axiosInstance.get('/api/examinations/');
        examinations.value = response.data.results || response.data || [];
    }
    catch (error) {
        console.error('Fehler beim Laden der Untersuchungen:', error);
        examinations.value = [];
    }
    finally {
        loadingExaminations.value = false;
    }
};
const refreshSensitiveMeta = async () => {
    loadingSensitiveMeta.value = true;
    try {
        // Combine video and PDF sensitive meta data
        const [videoResponse, pdfResponse] = await Promise.all([
            axiosInstance.get('/api/media/videos/').catch(() => ({ data: [] })),
            axiosInstance.get('/api/pdf/sensitivemeta/').catch(() => ({ data: [] }))
        ]);
        const videoData = Array.isArray(videoResponse.data) ? videoResponse.data :
            videoResponse.data ? [{ ...videoResponse.data, content_type: 'video' }] : [];
        const pdfData = Array.isArray(pdfResponse.data) ? pdfResponse.data :
            pdfResponse.data ? [{ ...pdfResponse.data, content_type: 'pdf' }] : [];
        // Add content type identifier
        videoData.forEach(item => item.content_type = 'video');
        pdfData.forEach(item => item.content_type = 'pdf');
        sensitiveMetaData.value = [...videoData, ...pdfData];
    }
    catch (error) {
        console.error('Fehler beim Laden der Patientendaten:', error);
        sensitiveMetaData.value = [];
    }
    finally {
        loadingSensitiveMeta.value = false;
    }
};
// Status helper methods
const getSegmentStatusClass = (status) => {
    const classes = {
        'pending': 'bg-warning',
        'in_progress': 'bg-info',
        'completed': 'bg-success',
        'rejected': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
};
const getSegmentStatusText = (status) => {
    const texts = {
        'pending': 'Ausstehend',
        'in_progress': 'In Bearbeitung',
        'completed': 'Abgeschlossen',
        'rejected': 'Abgelehnt'
    };
    return texts[status] || status;
};
const getExaminationStatusClass = (status) => {
    const classes = {
        'pending': 'bg-warning',
        'in_progress': 'bg-info',
        'completed': 'bg-success',
        'draft': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
};
const getExaminationStatusText = (status) => {
    const texts = {
        'pending': 'Ausstehend',
        'in_progress': 'In Bearbeitung',
        'completed': 'Abgeschlossen',
        'draft': 'Entwurf'
    };
    return texts[status] || status;
};
const getSensitiveMetaStatusClass = (status) => {
    const classes = {
        'pending_validation': 'bg-warning',
        'validated_pending_anonymization': 'bg-info',
        'anonymized': 'bg-success',
        'no_sensitive_data': 'bg-primary'
    };
    return classes[status] || 'bg-secondary';
};
const getSensitiveMetaStatusText = (status) => {
    const texts = {
        'pending_validation': 'Validierung ausstehend',
        'validated_pending_anonymization': 'Validiert - Anonymisierung ausstehend',
        'anonymized': 'Anonymisiert',
        'no_sensitive_data': 'Keine sensitiven Daten'
    };
    return texts[status] || status;
};
// Action methods
const editSegment = (segment) => {
    router.push({
        name: 'Frame Annotation',
        query: { videoId: segment.video_id, segmentId: segment.id }
    });
};
const markSegmentComplete = async (segment) => {
    try {
        await axiosInstance.patch(`/api/video-segments/${segment.id}/`, { status: 'completed' });
        annotationStatsStore.updateAnnotationStatus('segment', 'in_progress', 'completed');
        await refreshSegments();
    }
    catch (error) {
        console.error('Fehler beim Markieren des Segments als abgeschlossen:', error);
    }
};
const editExamination = (examination) => {
    router.push({
        name: 'Untersuchung',
        query: { examinationId: examination.id }
    });
};
const markExaminationComplete = async (examination) => {
    try {
        await axiosInstance.patch(`/api/examinations/${examination.id}/`, { status: 'completed' });
        annotationStatsStore.updateAnnotationStatus('examination', 'in_progress', 'completed');
        await refreshExaminations();
    }
    catch (error) {
        console.error('Fehler beim Markieren der Untersuchung als abgeschlossen:', error);
    }
};
const validateSensitiveMeta = (meta) => {
    if (meta.content_type === 'video') {
        router.push('/video-meta-annotation');
    }
    else if (meta.content_type === 'pdf') {
        router.push('/pdf-meta-annotation');
    }
};
const markSensitiveMetaComplete = async (meta) => {
    try {
        const endpoint = meta.content_type === 'video'
            ? `/api/media/videos/`
            : `/api/media/pdf/`;
        await axiosInstance.patch(endpoint, {
            sensitive_meta_id: meta.id,
            requires_validation: false,
            anonymization_status: 'validated_pending_anonymization'
        });
        annotationStatsStore.updateAnnotationStatus('sensitive_meta', 'pending', 'completed');
        await refreshSensitiveMeta();
    }
    catch (error) {
        console.error('Fehler beim Markieren der Patientendaten als validiert:', error);
    }
};
// Utility methods
const formatDate = (dateString) => {
    if (!dateString)
        return 'Nicht verfügbar';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch (error) {
        return 'Ungültiges Datum';
    }
};
// Initialize data on mount
onMounted(async () => {
    // Load statistics first
    await annotationStatsStore.fetchAnnotationStats();
    // Load detailed data in parallel
    await Promise.all([
        refreshSegments(),
        refreshExaminations(),
        refreshSensitiveMeta()
    ]);
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['table', 'table', 'header-actions',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    // @ts-ignore
    /** @type { [typeof AnnotationStatsComponent, ] } */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(AnnotationStatsComponent, new AnnotationStatsComponent({}));
    const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12 mb-4") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-video text-primary me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshSegments) },
        ...{ class: ("btn btn-outline-primary btn-sm me-2") },
        disabled: ((__VLS_ctx.loadingSegments)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.loadingSegments })) },
    });
    const __VLS_5 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
        to: ("/frame-annotation"),
        ...{ class: ("btn btn-primary btn-sm") },
    }));
    const __VLS_7 = __VLS_6({
        to: ("/frame-annotation"),
        ...{ class: ("btn btn-primary btn-sm") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus me-1") },
    });
    __VLS_10.slots.default;
    var __VLS_10;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
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
    if (__VLS_ctx.loadingSegments) {
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
    else if (__VLS_ctx.segments.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-video fa-2x mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
    }
    else {
        for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((segment.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (segment.videoId);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (segment.startTime);
            (segment.endTime);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-info") },
            });
            (segment.labelName);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ class: ((__VLS_ctx.getSegmentStatusClass(segment.status))) },
            });
            (__VLS_ctx.getSegmentStatusText(segment.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (segment.annotated_by || 'Nicht zugewiesen');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (__VLS_ctx.formatDate(segment.updated_at));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingSegments))))
                            return;
                        if (!(!((__VLS_ctx.segments.length === 0))))
                            return;
                        __VLS_ctx.editSegment(segment);
                    } },
                ...{ class: ("btn btn-outline-primary") },
                title: (('Segment bearbeiten')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingSegments))))
                            return;
                        if (!(!((__VLS_ctx.segments.length === 0))))
                            return;
                        __VLS_ctx.markSegmentComplete(segment);
                    } },
                ...{ class: ("btn btn-outline-success") },
                disabled: ((segment.status === 'completed')),
                title: (('Als abgeschlossen markieren')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check") },
            });
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12 mb-4") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-stethoscope text-success me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshExaminations) },
        ...{ class: ("btn btn-outline-primary btn-sm me-2") },
        disabled: ((__VLS_ctx.loadingExaminations)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.loadingExaminations })) },
    });
    const __VLS_11 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
        to: ("/untersuchung"),
        ...{ class: ("btn btn-success btn-sm") },
    }));
    const __VLS_13 = __VLS_12({
        to: ("/untersuchung"),
        ...{ class: ("btn btn-success btn-sm") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus me-1") },
    });
    __VLS_16.slots.default;
    var __VLS_16;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
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
    if (__VLS_ctx.loadingExaminations) {
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
    else if (__VLS_ctx.examinations.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-stethoscope fa-2x mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
    }
    else {
        for (const [examination] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((examination.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (examination.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (examination.patient?.first_name);
            (examination.patient?.last_name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDate(examination.examination_date));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            for (const [finding] of __VLS_getVForSourceType((examination.findings?.slice(0, 2)))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-secondary me-1") },
                    key: ((finding.id)),
                });
                (finding.name);
            }
            if (examination.findings?.length > 2) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-light text-dark") },
                });
                (examination.findings.length - 2);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ class: ((__VLS_ctx.getExaminationStatusClass(examination.status))) },
            });
            (__VLS_ctx.getExaminationStatusText(examination.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (examination.created_by || 'Unbekannt');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingExaminations))))
                            return;
                        if (!(!((__VLS_ctx.examinations.length === 0))))
                            return;
                        __VLS_ctx.editExamination(examination);
                    } },
                ...{ class: ("btn btn-outline-primary") },
                title: (('Untersuchung bearbeiten')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingExaminations))))
                            return;
                        if (!(!((__VLS_ctx.examinations.length === 0))))
                            return;
                        __VLS_ctx.markExaminationComplete(examination);
                    } },
                ...{ class: ("btn btn-outline-success") },
                disabled: ((examination.status === 'completed')),
                title: (('Als abgeschlossen markieren')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check") },
            });
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12 mb-4") },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user-shield text-warning me-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshSensitiveMeta) },
        ...{ class: ("btn btn-outline-primary btn-sm me-2") },
        disabled: ((__VLS_ctx.loadingSensitiveMeta)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-sync-alt") },
        ...{ class: (({ 'fa-spin': __VLS_ctx.loadingSensitiveMeta })) },
    });
    const __VLS_17 = {}.RouterLink;
    /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent(__VLS_17, new __VLS_17({
        to: ("/video-meta-annotation"),
        ...{ class: ("btn btn-warning btn-sm") },
    }));
    const __VLS_19 = __VLS_18({
        to: ("/video-meta-annotation"),
        ...{ class: ("btn btn-warning btn-sm") },
    }, ...__VLS_functionalComponentArgsRest(__VLS_18));
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-play me-1") },
    });
    __VLS_22.slots.default;
    var __VLS_22;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
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
    if (__VLS_ctx.loadingSensitiveMeta) {
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
    else if (__VLS_ctx.sensitiveMetaData.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: ("7"),
            ...{ class: ("text-center text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user-shield fa-2x mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.br, __VLS_intrinsicElements.br)({});
    }
    else {
        for (const [meta] of __VLS_getVForSourceType((__VLS_ctx.sensitiveMetaData))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((meta.id)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (meta.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ class: ((meta.content_type === 'video' ? 'bg-primary' : 'bg-danger')) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((meta.content_type === 'video' ? 'fas fa-video' : 'fas fa-file-pdf')) },
            });
            (meta.content_type?.toUpperCase() || 'UNBEKANNT');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (meta.patient_first_name);
            (meta.patient_last_name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatDate(meta.examination_date));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge") },
                ...{ class: ((__VLS_ctx.getSensitiveMetaStatusClass(meta.anonymization_status))) },
            });
            (__VLS_ctx.getSensitiveMetaStatusText(meta.anonymization_status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((meta.requires_validation ? 'text-warning' : 'text-success')) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((meta.requires_validation ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle')) },
            });
            (meta.requires_validation ? 'Ja' : 'Nein');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group btn-group-sm") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingSensitiveMeta))))
                            return;
                        if (!(!((__VLS_ctx.sensitiveMetaData.length === 0))))
                            return;
                        __VLS_ctx.validateSensitiveMeta(meta);
                    } },
                ...{ class: ("btn btn-outline-primary") },
                title: (('Patientendaten validieren')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(!((__VLS_ctx.loadingSensitiveMeta))))
                            return;
                        if (!(!((__VLS_ctx.sensitiveMetaData.length === 0))))
                            return;
                        __VLS_ctx.markSensitiveMetaComplete(meta);
                    } },
                ...{ class: ("btn btn-outline-success") },
                disabled: ((!meta.requires_validation)),
                title: (('Als validiert markieren')),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check") },
            });
        }
    }
    ['container-fluid', 'py-4', 'row', 'mt-4', 'col-12', 'mb-4', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-video', 'text-primary', 'me-2', 'header-actions', 'btn', 'btn-outline-primary', 'btn-sm', 'me-2', 'fas', 'fa-sync-alt', 'fa-spin', 'btn', 'btn-primary', 'btn-sm', 'fas', 'fa-plus', 'me-1', 'card-body', 'table-responsive', 'table', 'table-hover', 'table-dark', 'text-center', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'fas', 'fa-video', 'fa-2x', 'mb-2', 'badge', 'bg-info', 'badge', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-primary', 'fas', 'fa-edit', 'btn', 'btn-outline-success', 'fas', 'fa-check', 'col-12', 'mb-4', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-stethoscope', 'text-success', 'me-2', 'header-actions', 'btn', 'btn-outline-primary', 'btn-sm', 'me-2', 'fas', 'fa-sync-alt', 'fa-spin', 'btn', 'btn-success', 'btn-sm', 'fas', 'fa-plus', 'me-1', 'card-body', 'table-responsive', 'table', 'table-hover', 'table-dark', 'text-center', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'fas', 'fa-stethoscope', 'fa-2x', 'mb-2', 'badge', 'bg-secondary', 'me-1', 'badge', 'bg-light', 'text-dark', 'badge', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-primary', 'fas', 'fa-edit', 'btn', 'btn-outline-success', 'fas', 'fa-check', 'col-12', 'mb-4', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-user-shield', 'text-warning', 'me-2', 'header-actions', 'btn', 'btn-outline-primary', 'btn-sm', 'me-2', 'fas', 'fa-sync-alt', 'fa-spin', 'btn', 'btn-warning', 'btn-sm', 'fas', 'fa-play', 'me-1', 'card-body', 'table-responsive', 'table', 'table-hover', 'table-dark', 'text-center', 'spinner-border', 'text-primary', 'visually-hidden', 'text-center', 'text-muted', 'fas', 'fa-user-shield', 'fa-2x', 'mb-2', 'badge', 'badge', 'btn-group', 'btn-group-sm', 'btn', 'btn-outline-primary', 'fas', 'fa-edit', 'btn', 'btn-outline-success', 'fas', 'fa-check',];
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
            AnnotationStatsComponent: AnnotationStatsComponent,
            segments: segments,
            examinations: examinations,
            sensitiveMetaData: sensitiveMetaData,
            loadingSegments: loadingSegments,
            loadingExaminations: loadingExaminations,
            loadingSensitiveMeta: loadingSensitiveMeta,
            refreshSegments: refreshSegments,
            refreshExaminations: refreshExaminations,
            refreshSensitiveMeta: refreshSensitiveMeta,
            getSegmentStatusClass: getSegmentStatusClass,
            getSegmentStatusText: getSegmentStatusText,
            getExaminationStatusClass: getExaminationStatusClass,
            getExaminationStatusText: getExaminationStatusText,
            getSensitiveMetaStatusClass: getSensitiveMetaStatusClass,
            getSensitiveMetaStatusText: getSensitiveMetaStatusText,
            editSegment: editSegment,
            markSegmentComplete: markSegmentComplete,
            editExamination: editExamination,
            markExaminationComplete: markExaminationComplete,
            validateSensitiveMeta: validateSensitiveMeta,
            markSensitiveMetaComplete: markSensitiveMetaComplete,
            formatDate: formatDate,
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
