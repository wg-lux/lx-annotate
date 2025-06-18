import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAnnotationStatsStore } from '@/stores/annotationStats';
const router = useRouter();
const annotationStatsStore = useAnnotationStatsStore();
// Computed properties for individual stats
const segmentStats = computed(() => ({
    pending: annotationStatsStore.stats.segmentPending,
    inProgress: annotationStatsStore.stats.segmentInProgress,
    completed: annotationStatsStore.stats.segmentCompleted,
    total: annotationStatsStore.stats.segmentPending +
        annotationStatsStore.stats.segmentInProgress +
        annotationStatsStore.stats.segmentCompleted
}));
const examinationStats = computed(() => ({
    pending: annotationStatsStore.stats.examinationPending,
    inProgress: annotationStatsStore.stats.examinationInProgress,
    completed: annotationStatsStore.stats.examinationCompleted,
    total: annotationStatsStore.stats.examinationPending +
        annotationStatsStore.stats.examinationInProgress +
        annotationStatsStore.stats.examinationCompleted
}));
const sensitiveMetaStats = computed(() => ({
    pending: annotationStatsStore.stats.sensitiveMetaPending,
    inProgress: annotationStatsStore.stats.sensitiveMetaInProgress,
    completed: annotationStatsStore.stats.sensitiveMetaCompleted,
    total: annotationStatsStore.stats.sensitiveMetaPending +
        annotationStatsStore.stats.sensitiveMetaInProgress +
        annotationStatsStore.stats.sensitiveMetaCompleted
}));
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
    await annotationStatsStore.forceRefresh();
};
// Navigation methods
const navigateToSegments = () => {
    // Scroll to segments section in the same dashboard
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
    router.push('/examination/new');
};
const navigateToValidation = () => {
    router.push('/validation');
};
// Load stats on component mount
onMounted(async () => {
    // Stats will be loaded automatically by the store
    // or call the correct method if it exists, e.g.:
    // await annotationStatsStore.loadStats();
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
        ...{ style: (({ width: __VLS_ctx.annotationStatsStore.completionPercentage + '%' })) },
        'aria-valuenow': ((__VLS_ctx.annotationStatsStore.completionPercentage)),
        'aria-valuemin': ("0"),
        'aria-valuemax': ("100"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("progress-text") },
    });
    (__VLS_ctx.annotationStatsStore.completionPercentage);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-bar bg-info") },
        role: ("progressbar"),
        ...{ style: (({ width: __VLS_ctx.annotationStatsStore.inProgressPercentage + '%' })) },
        'aria-valuenow': ((__VLS_ctx.annotationStatsStore.inProgressPercentage)),
        'aria-valuemin': ("0"),
        'aria-valuemax': ("100"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("progress-text") },
    });
    (__VLS_ctx.annotationStatsStore.inProgressPercentage);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-bar bg-warning") },
        role: ("progressbar"),
        ...{ style: (({ width: __VLS_ctx.annotationStatsStore.pendingPercentage + '%' })) },
        'aria-valuenow': ((__VLS_ctx.annotationStatsStore.pendingPercentage)),
        'aria-valuemin': ("0"),
        'aria-valuemax': ("100"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("progress-text") },
    });
    (__VLS_ctx.annotationStatsStore.pendingPercentage);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-legend d-flex justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("text-muted") },
    });
    (__VLS_ctx.annotationStatsStore.stats.totalAnnotations);
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
    ['annotation-stats-overview', 'row', 'mb-4', 'col-12', 'card', 'bg-gradient-primary', 'text-white', 'card-body', 'row', 'align-items-center', 'col-8', 'text-white', 'mb-1', 'fas', 'fa-chart-pie', 'me-2', 'text-white', 'opacity-8', 'mb-0', 'col-4', 'text-end', 'btn', 'btn-outline-light', 'btn-sm', 'fas', 'fa-sync-alt', 'fa-spin', 'row', 'mb-4', 'col-12', 'card', 'card-body', 'card-title', 'mb-3', 'fas', 'fa-tasks', 'me-2', 'progress-container', 'progress', 'mb-2', 'progress-bar', 'bg-success', 'progress-text', 'progress-bar', 'bg-info', 'progress-text', 'progress-bar', 'bg-warning', 'progress-text', 'progress-legend', 'd-flex', 'justify-content-between', 'text-muted', 'text-muted', 'row', 'mb-4', 'col-md-4', 'mb-3', 'card', 'h-100', 'annotation-type-card', 'card-header', 'bg-primary', 'text-white', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-video', 'me-2', 'badge', 'bg-light', 'text-primary', 'card-body', 'stats-grid', 'stat-item', 'pending', 'stat-icon', 'fas', 'fa-clock', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'in-progress', 'stat-icon', 'fas', 'fa-cogs', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'completed', 'stat-icon', 'fas', 'fa-check-circle', 'stat-info', 'stat-number', 'stat-label', 'mini-progress', 'mt-3', 'progress', 'progress-bar', 'bg-success', 'text-muted', 'mt-1', 'd-block', 'col-md-4', 'mb-3', 'card', 'h-100', 'annotation-type-card', 'card-header', 'bg-success', 'text-white', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-stethoscope', 'me-2', 'badge', 'bg-light', 'text-success', 'card-body', 'stats-grid', 'stat-item', 'pending', 'stat-icon', 'fas', 'fa-clock', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'in-progress', 'stat-icon', 'fas', 'fa-cogs', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'completed', 'stat-icon', 'fas', 'fa-check-circle', 'stat-info', 'stat-number', 'stat-label', 'mini-progress', 'mt-3', 'progress', 'progress-bar', 'bg-success', 'text-muted', 'mt-1', 'd-block', 'col-md-4', 'mb-3', 'card', 'h-100', 'annotation-type-card', 'card-header', 'bg-warning', 'text-dark', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'fas', 'fa-user-shield', 'me-2', 'badge', 'bg-dark', 'text-warning', 'card-body', 'stats-grid', 'stat-item', 'pending', 'stat-icon', 'fas', 'fa-clock', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'in-progress', 'stat-icon', 'fas', 'fa-cogs', 'stat-info', 'stat-number', 'stat-label', 'stat-item', 'completed', 'stat-icon', 'fas', 'fa-check-circle', 'stat-info', 'stat-number', 'stat-label', 'mini-progress', 'mt-3', 'progress', 'progress-bar', 'bg-success', 'text-muted', 'mt-1', 'd-block', 'row', 'col-12', 'card', 'card-header', 'mb-0', 'fas', 'fa-bolt', 'me-2', 'card-body', 'row', 'col-md-4', 'quick-action-item', 'action-icon', 'bg-primary', 'fas', 'fa-plus', 'action-content', 'text-muted', 'col-md-4', 'quick-action-item', 'action-icon', 'bg-success', 'fas', 'fa-plus', 'action-content', 'text-muted', 'col-md-4', 'quick-action-item', 'action-icon', 'bg-warning', 'fas', 'fa-play', 'action-content', 'text-muted', 'alert', 'alert-danger', 'mt-3', 'fas', 'fa-exclamation-triangle', 'me-2', 'btn-close',];
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
