import { computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnotationStatsStore } from '@/stores/annotationStats';
const router = useRouter();
const annotationStatsStore = useAnnotationStatsStore();
// Enhanced computed properties with fallback values
const segmentStats = computed(() => ({
    pending: annotationStatsStore.stats.segmentPending || 0,
    inProgress: annotationStatsStore.stats.segmentInProgress || 0,
    completed: annotationStatsStore.stats.segmentCompleted || 0,
    total: (annotationStatsStore.stats.segmentPending || 0) +
        (annotationStatsStore.stats.segmentInProgress || 0) +
        (annotationStatsStore.stats.segmentCompleted || 0)
}));
const examinationStats = computed(() => ({
    pending: annotationStatsStore.stats.examinationPending || 0,
    inProgress: annotationStatsStore.stats.examinationInProgress || 0,
    completed: annotationStatsStore.stats.examinationCompleted || 0,
    total: (annotationStatsStore.stats.examinationPending || 0) +
        (annotationStatsStore.stats.examinationInProgress || 0) +
        (annotationStatsStore.stats.examinationCompleted || 0)
}));
const sensitiveMetaStats = computed(() => ({
    pending: annotationStatsStore.stats.sensitiveMetaPending || 0,
    inProgress: annotationStatsStore.stats.sensitiveMetaInProgress || 0,
    completed: annotationStatsStore.stats.sensitiveMetaCompleted || 0,
    total: (annotationStatsStore.stats.sensitiveMetaPending || 0) +
        (annotationStatsStore.stats.sensitiveMetaInProgress || 0) +
        (annotationStatsStore.stats.sensitiveMetaCompleted || 0)
}));
// Global computed properties for the main progress bar
const completionPercentage = computed(() => {
    return annotationStatsStore.completionPercentage || 0;
});
const inProgressPercentage = computed(() => {
    return annotationStatsStore.inProgressPercentage || 0;
});
const pendingPercentage = computed(() => {
    return annotationStatsStore.pendingPercentage || 0;
});
const totalAnnotations = computed(() => {
    return annotationStatsStore.stats.totalAnnotations || 0;
});
// Check if we have any data to show
const hasAnyData = computed(() => {
    return annotationStatsStore.stats.totalAnnotations > 0 ||
        annotationStatsStore.lastUpdated !== null;
});
const lastUpdateText = computed(() => {
    if (!annotationStatsStore.lastUpdated)
        return 'Nie';
    const now = new Date();
    const diff = now.getTime() - annotationStatsStore.lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1)
        return 'Gerade eben';
    if (minutes < 60)
        return `vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag(en)`;
});
// Helper methods
const getCompletionPercentage = (stats) => {
    return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
};
const refreshStats = async () => {
    try {
        await annotationStatsStore.forceRefresh();
    }
    catch (error) {
        console.error('Failed to refresh stats:', error);
    }
};
// Navigation methods
const navigateToSegments = () => {
    const segmentSection = document.querySelector('[data-section="segments"]');
    if (segmentSection) {
        segmentSection.scrollIntoView({ behavior: 'smooth' });
    }
    else {
        router.push('/segments');
    }
};
const navigateToExaminations = () => {
    router.push('/examinations');
};
const navigateToSensitiveMeta = () => {
    router.push('/sensitive-meta');
};
const navigateToFrameAnnotation = () => {
    router.push('/frame-annotation');
};
const navigateToExamination = () => {
    router.push('/examination');
};
const navigateToValidation = () => {
    router.push('/validation');
};
// Load stats on component mount and watch for changes
onMounted(async () => {
    await annotationStatsStore.fetchAnnotationStats();
});
// Auto-refresh when needed
watch(() => annotationStatsStore.needsRefresh, async (needsRefresh) => {
    if (needsRefresh) {
        await annotationStatsStore.refreshIfNeeded();
    }
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['annotation-type-card', 'stat-item', 'stat-item', 'stat-item', 'stat-item', 'pending', 'stat-icon', 'stat-item', 'in-progress', 'stat-icon', 'stat-item', 'completed', 'stat-icon', 'quick-action-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("annotation-stats-overview") },
    });
    if (__VLS_ctx.annotationStatsStore.isLoading && !__VLS_ctx.hasAnyData) {
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
            ...{ class: ("mt-3 text-muted") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card bg-gradient-primary text-white") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-8") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("text-white mb-1") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-chart-pie me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-white opacity-8 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-4 text-end") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.refreshStats) },
            ...{ class: ("btn btn-outline-light btn-sm") },
            disabled: ((__VLS_ctx.annotationStatsStore.isLoading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-sync-alt") },
            ...{ class: (({ 'fa-spin': __VLS_ctx.annotationStatsStore.isLoading })) },
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
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("card-title mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-tasks me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress mb-2") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar bg-success") },
            role: ("progressbar"),
            ...{ style: (({ width: __VLS_ctx.completionPercentage + '%' })) },
            'aria-valuenow': ((__VLS_ctx.completionPercentage)),
            'aria-valuemin': ("0"),
            'aria-valuemax': ("100"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("progress-text") },
        });
        (__VLS_ctx.completionPercentage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar bg-info") },
            role: ("progressbar"),
            ...{ style: (({ width: __VLS_ctx.inProgressPercentage + '%' })) },
            'aria-valuenow': ((__VLS_ctx.inProgressPercentage)),
            'aria-valuemin': ("0"),
            'aria-valuemax': ("100"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("progress-text") },
        });
        (__VLS_ctx.inProgressPercentage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar bg-warning") },
            role: ("progressbar"),
            ...{ style: (({ width: __VLS_ctx.pendingPercentage + '%' })) },
            'aria-valuenow': ((__VLS_ctx.pendingPercentage)),
            'aria-valuemin': ("0"),
            'aria-valuemax': ("100"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("progress-text") },
        });
        (__VLS_ctx.pendingPercentage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-legend d-flex justify-content-between") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.totalAnnotations);
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.lastUpdateText);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4 mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.navigateToSegments) },
            ...{ class: ("card h-100 annotation-type-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header bg-primary text-white") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-video me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-light text-primary") },
        });
        (__VLS_ctx.segmentStats.total);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stats-grid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item pending") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-clock") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.segmentStats.pending);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item in-progress") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cogs") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.segmentStats.inProgress);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item completed") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.segmentStats.completed);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mini-progress mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar bg-success") },
            ...{ style: (({ width: __VLS_ctx.getCompletionPercentage(__VLS_ctx.segmentStats) + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted mt-1 d-block") },
        });
        (__VLS_ctx.getCompletionPercentage(__VLS_ctx.segmentStats));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4 mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.navigateToExaminations) },
            ...{ class: ("card h-100 annotation-type-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header bg-success text-white") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-stethoscope me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-light text-success") },
        });
        (__VLS_ctx.examinationStats.total);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stats-grid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item pending") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-clock") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.examinationStats.pending);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item in-progress") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cogs") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.examinationStats.inProgress);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item completed") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.examinationStats.completed);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mini-progress mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar bg-success") },
            ...{ style: (({ width: __VLS_ctx.getCompletionPercentage(__VLS_ctx.examinationStats) + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted mt-1 d-block") },
        });
        (__VLS_ctx.getCompletionPercentage(__VLS_ctx.examinationStats));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4 mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.navigateToSensitiveMeta) },
            ...{ class: ("card h-100 annotation-type-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header bg-warning text-dark") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user-shield me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-dark text-warning") },
        });
        (__VLS_ctx.sensitiveMetaStats.total);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stats-grid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item pending") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-clock") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.sensitiveMetaStats.pending);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item in-progress") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cogs") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.sensitiveMetaStats.inProgress);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-item completed") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-icon") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-info") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-number") },
        });
        (__VLS_ctx.sensitiveMetaStats.completed);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("stat-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mini-progress mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("progress-bar bg-success") },
            ...{ style: (({ width: __VLS_ctx.getCompletionPercentage(__VLS_ctx.sensitiveMetaStats) + '%' })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted mt-1 d-block") },
        });
        (__VLS_ctx.getCompletionPercentage(__VLS_ctx.sensitiveMetaStats));
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-bolt me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.navigateToFrameAnnotation) },
            ...{ class: ("quick-action-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-icon bg-primary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.navigateToExamination) },
            ...{ class: ("quick-action-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-icon bg-success") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.navigateToValidation) },
            ...{ class: ("quick-action-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-icon bg-warning") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-play") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("action-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: ("text-muted") },
        });
    }
    if (__VLS_ctx.annotationStatsStore.hasError) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.annotationStatsStore.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.annotationStatsStore.hasError)))
                        return;
                    __VLS_ctx.annotationStatsStore.clearError();
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    ['annotation-stats-overview', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-3', 'text-muted', 'row', 'mb-4', 'col-12', 'card', 'bg-gradient-primary', 'text-white', 'card-body', 'row', 'align-items-center', 'col-8', 'text-white', 'mb-1', 'fas', 'fa-chart-pie', 'me-2', 'text-white', 'opacity-8', 'mb-0', 'col-4', 'text-end', 'btn', 'btn-outline-light', 'btn-sm', 'fas', 'fa-sync-alt', 'fa-spin', 'row', 'mb-4', 'col-12', 'card', 'card-body', 'card-title', 'mb-3', 'fas', 'fa-tasks', 'me-2', 'progress-container', 'progress', 'mb-2', 'progress-bar', 'bg-success', 'progress-text', 'progress-bar', 'bg-info', 'progress-text', 'progress-bar', 'bg-warning', 'progress-text', 'progress-legend', 'd-flex', 'justify-content-between', 'text-muted', 'text-muted', 'row', 'mb-4', 'col-md-4', 'mb-3', 'card', 'h-100', 'annotation-type-card', 'card-header', 'bg-primary', 'text-white', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-video', 'me-2', 'badge', 'bg-light', 'text-primary', 'card-body', 'stats-grid', 'stat-item', 'pending', 'stat-icon', 'fas', 'fa-clock', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'in-progress', 'stat-icon', 'fas', 'fa-cogs', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'completed', 'stat-icon', 'fas', 'fa-check-circle', 'stat-info', 'stat-number', 'stat-label', 'mini-progress', 'mt-3', 'progress', 'progress-bar', 'bg-success', 'text-muted', 'mt-1', 'd-block', 'col-md-4', 'mb-3', 'card', 'h-100', 'annotation-type-card', 'card-header', 'bg-success', 'text-white', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-stethoscope', 'me-2', 'badge', 'bg-light', 'text-success', 'card-body', 'stats-grid', 'stat-item', 'pending', 'stat-icon', 'fas', 'fa-clock', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'in-progress', 'stat-icon', 'fas', 'fa-cogs', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'completed', 'stat-icon', 'fas', 'fa-check-circle', 'stat-info', 'stat-number', 'stat-label', 'mini-progress', 'mt-3', 'progress', 'progress-bar', 'bg-success', 'text-muted', 'mt-1', 'd-block', 'col-md-4', 'mb-3', 'card', 'h-100', 'annotation-type-card', 'card-header', 'bg-warning', 'text-dark', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-user-shield', 'me-2', 'badge', 'bg-dark', 'text-warning', 'card-body', 'stats-grid', 'stat-item', 'pending', 'stat-icon', 'fas', 'fa-clock', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'in-progress', 'stat-icon', 'fas', 'fa-cogs', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'completed', 'stat-icon', 'fas', 'fa-check-circle', 'stat-info', 'stat-number', 'stat-label', 'mini-progress', 'mt-3', 'progress', 'progress-bar', 'bg-success', 'text-muted', 'mt-1', 'd-block', 'row', 'col-12', 'card', 'card-header', 'mb-0', 'fas', 'fa-bolt', 'me-2', 'card-body', 'row', 'col-md-4', 'quick-action-item', 'action-icon', 'bg-primary', 'fas', 'fa-plus', 'action-content', 'text-muted', 'col-md-4', 'quick-action-item', 'action-icon', 'bg-success', 'fas', 'fa-plus', 'action-content', 'text-muted', 'col-md-4', 'quick-action-item', 'action-icon', 'bg-warning', 'fas', 'fa-play', 'action-content', 'text-muted', 'alert', 'alert-danger', 'mt-3', 'fas', 'fa-exclamation-triangle', 'me-2', 'btn-close',];
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
            annotationStatsStore: annotationStatsStore,
            segmentStats: segmentStats,
            examinationStats: examinationStats,
            sensitiveMetaStats: sensitiveMetaStats,
            completionPercentage: completionPercentage,
            inProgressPercentage: inProgressPercentage,
            pendingPercentage: pendingPercentage,
            totalAnnotations: totalAnnotations,
            hasAnyData: hasAnyData,
            lastUpdateText: lastUpdateText,
            getCompletionPercentage: getCompletionPercentage,
            refreshStats: refreshStats,
            navigateToSegments: navigateToSegments,
            navigateToExaminations: navigateToExaminations,
            navigateToSensitiveMeta: navigateToSensitiveMeta,
            navigateToFrameAnnotation: navigateToFrameAnnotation,
            navigateToExamination: navigateToExamination,
            navigateToValidation: navigateToValidation,
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
