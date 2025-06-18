import { defineStore } from 'pinia';
import axios from 'axios';
export const useAnnotationStatsStore = defineStore('annotationStats', {
    state: () => ({
        stats: {
            // Segment annotations
            segmentPending: 0,
            segmentInProgress: 0,
            segmentCompleted: 0,
            // Examination annotations
            examinationPending: 0,
            examinationInProgress: 0,
            examinationCompleted: 0,
            // Sensitive meta annotations
            sensitiveMetaPending: 0,
            sensitiveMetaInProgress: 0,
            sensitiveMetaCompleted: 0,
            // Totals
            totalPending: 0,
            totalInProgress: 0,
            totalCompleted: 0,
            totalAnnotations: 0,
        },
        loading: false,
        error: null,
        lastUpdated: null,
    }),
    getters: {
        // Legacy getter for compatibility
        pendingCount: (state) => state.stats.totalPending,
        // New unified getters
        isLoading: (state) => state.loading,
        hasError: (state) => state.error !== null,
        needsRefresh: (state) => {
            if (!state.lastUpdated)
                return true;
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return state.lastUpdated < fiveMinutesAgo;
        },
        // Get breakdown by type
        annotationBreakdown: (state) => [
            {
                type: 'segment',
                pending: state.stats.segmentPending,
                inProgress: state.stats.segmentInProgress,
                completed: state.stats.segmentCompleted,
                total: state.stats.segmentPending + state.stats.segmentInProgress + state.stats.segmentCompleted,
            },
            {
                type: 'examination',
                pending: state.stats.examinationPending,
                inProgress: state.stats.examinationInProgress,
                completed: state.stats.examinationCompleted,
                total: state.stats.examinationPending + state.stats.examinationInProgress + state.stats.examinationCompleted,
            },
            {
                type: 'sensitive_meta',
                pending: state.stats.sensitiveMetaPending,
                inProgress: state.stats.sensitiveMetaInProgress,
                completed: state.stats.sensitiveMetaCompleted,
                total: state.stats.sensitiveMetaPending + state.stats.sensitiveMetaInProgress + state.stats.sensitiveMetaCompleted,
            },
        ],
        // Get stats by status
        pendingByType: (state) => ({
            segment: state.stats.segmentPending,
            examination: state.stats.examinationPending,
            sensitive_meta: state.stats.sensitiveMetaPending,
        }),
        inProgressByType: (state) => ({
            segment: state.stats.segmentInProgress,
            examination: state.stats.examinationInProgress,
            sensitive_meta: state.stats.sensitiveMetaInProgress,
        }),
        completedByType: (state) => ({
            segment: state.stats.segmentCompleted,
            examination: state.stats.examinationCompleted,
            sensitive_meta: state.stats.sensitiveMetaCompleted,
        }),
        // Progress percentages
        completionPercentage: (state) => {
            const total = state.stats.totalAnnotations;
            return total > 0 ? Math.round((state.stats.totalCompleted / total) * 100) : 0;
        },
        inProgressPercentage: (state) => {
            const total = state.stats.totalAnnotations;
            return total > 0 ? Math.round((state.stats.totalInProgress / total) * 100) : 0;
        },
        pendingPercentage: (state) => {
            const total = state.stats.totalAnnotations;
            return total > 0 ? Math.round((state.stats.totalPending / total) * 100) : 0;
        },
    },
    actions: {
        async fetchAnnotationStats() {
            if (this.loading)
                return; // Prevent multiple simultaneous requests
            try {
                this.loading = true;
                this.error = null;
                // Fetch all annotation statistics in parallel
                const [segmentResponse, examinationResponse, sensitiveMetaResponse] = await Promise.all([
                    axios.get('/api/video-segments/stats/').catch(() => ({ data: { pending: 0, in_progress: 0, completed: 0 } })),
                    axios.get('/api/examinations/stats/').catch(() => ({ data: { pending: 0, in_progress: 0, completed: 0 } })),
                    axios.get('/api/video/sensitivemeta/stats/').catch(() => ({ data: { pending: 0, in_progress: 0, completed: 0 } }))
                ]);
                // Process segment annotation stats
                const segmentStats = segmentResponse.data;
                this.stats.segmentPending = segmentStats.pending || 0;
                this.stats.segmentInProgress = segmentStats.in_progress || 0;
                this.stats.segmentCompleted = segmentStats.completed || 0;
                // Process examination annotation stats
                const examinationStats = examinationResponse.data;
                this.stats.examinationPending = examinationStats.pending || 0;
                this.stats.examinationInProgress = examinationStats.in_progress || 0;
                this.stats.examinationCompleted = examinationStats.completed || 0;
                // Process sensitive meta annotation stats
                const sensitiveMetaStats = sensitiveMetaResponse.data;
                this.stats.sensitiveMetaPending = sensitiveMetaStats.pending || 0;
                this.stats.sensitiveMetaInProgress = sensitiveMetaStats.in_progress || 0;
                this.stats.sensitiveMetaCompleted = sensitiveMetaStats.completed || 0;
                // Calculate totals
                this.calculateTotals();
                this.lastUpdated = new Date();
            }
            catch (error) {
                console.error('Error fetching unified annotation statistics:', error);
                this.error = error.response?.data?.error || error.message || 'Failed to fetch annotation statistics';
                // Set fallback values on error
                this.resetStats();
            }
            finally {
                this.loading = false;
            }
        },
        calculateTotals() {
            this.stats.totalPending =
                this.stats.segmentPending +
                    this.stats.examinationPending +
                    this.stats.sensitiveMetaPending;
            this.stats.totalInProgress =
                this.stats.segmentInProgress +
                    this.stats.examinationInProgress +
                    this.stats.sensitiveMetaInProgress;
            this.stats.totalCompleted =
                this.stats.segmentCompleted +
                    this.stats.examinationCompleted +
                    this.stats.sensitiveMetaCompleted;
            this.stats.totalAnnotations =
                this.stats.totalPending +
                    this.stats.totalInProgress +
                    this.stats.totalCompleted;
        },
        resetStats() {
            this.stats = {
                segmentPending: 0,
                segmentInProgress: 0,
                segmentCompleted: 0,
                examinationPending: 0,
                examinationInProgress: 0,
                examinationCompleted: 0,
                sensitiveMetaPending: 0,
                sensitiveMetaInProgress: 0,
                sensitiveMetaCompleted: 0,
                totalPending: 0,
                totalInProgress: 0,
                totalCompleted: 0,
                totalAnnotations: 0,
            };
        },
        async refreshIfNeeded() {
            if (this.needsRefresh) {
                await this.fetchAnnotationStats();
            }
        },
        // Method to manually refresh stats (e.g., after completing an annotation)
        async forceRefresh() {
            await this.fetchAnnotationStats();
        },
        // Update stats when annotations are modified
        updateAnnotationStatus(type, fromStatus, toStatus, count = 1) {
            // Decrement from old status
            if (fromStatus) {
                this.decrementCount(type, fromStatus, count);
            }
            // Increment to new status
            this.incrementCount(type, toStatus, count);
            // Recalculate totals
            this.calculateTotals();
        },
        incrementCount(type, status, count = 1) {
            const key = `${type}${status.charAt(0).toUpperCase() + status.slice(1)}`;
            if (typeof this.stats[key] === 'number') {
                this.stats[key] += count;
            }
        },
        decrementCount(type, status, count = 1) {
            const key = `${type}${status.charAt(0).toUpperCase() + status.slice(1)}`;
            if (typeof this.stats[key] === 'number') {
                this.stats[key] = Math.max(0, this.stats[key] - count);
            }
        },
        // Legacy methods for backward compatibility
        incrementPending(type = 'video') {
            if (type === 'video') {
                this.updateAnnotationStatus('sensitive_meta', null, 'pending');
            }
            else {
                this.updateAnnotationStatus('sensitive_meta', null, 'pending');
            }
        },
        decrementPending(type = 'video') {
            if (type === 'video') {
                this.updateAnnotationStatus('sensitive_meta', 'pending', 'completed');
            }
            else {
                this.updateAnnotationStatus('sensitive_meta', 'pending', 'completed');
            }
        },
        clearError() {
            this.error = null;
        }
    },
});
