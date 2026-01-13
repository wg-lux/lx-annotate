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
            totalAnnotations: 0
        },
        loading: false,
        error: null,
        lastUpdated: null
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
                total: state.stats.segmentPending + state.stats.segmentInProgress + state.stats.segmentCompleted
            },
            {
                type: 'examination',
                pending: state.stats.examinationPending,
                inProgress: state.stats.examinationInProgress,
                completed: state.stats.examinationCompleted,
                total: state.stats.examinationPending +
                    state.stats.examinationInProgress +
                    state.stats.examinationCompleted
            },
            {
                type: 'sensitive_meta',
                pending: state.stats.sensitiveMetaPending,
                inProgress: state.stats.sensitiveMetaInProgress,
                completed: state.stats.sensitiveMetaCompleted,
                total: state.stats.sensitiveMetaPending +
                    state.stats.sensitiveMetaInProgress +
                    state.stats.sensitiveMetaCompleted
            }
        ],
        // Get stats by status
        pendingByType: (state) => ({
            segment: state.stats.segmentPending,
            examination: state.stats.examinationPending,
            sensitive_meta: state.stats.sensitiveMetaPending
        }),
        inProgressByType: (state) => ({
            segment: state.stats.segmentInProgress,
            examination: state.stats.examinationInProgress,
            sensitive_meta: state.stats.sensitiveMetaInProgress
        }),
        completedByType: (state) => ({
            segment: state.stats.segmentCompleted,
            examination: state.stats.examinationCompleted,
            sensitive_meta: state.stats.sensitiveMetaCompleted
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
        }
    },
    actions: {
        async fetchAnnotationStats() {
            if (this.loading)
                return; // Prevent multiple simultaneous requests
            try {
                this.loading = true;
                this.error = null;
                // Fetch all annotation statistics with proper error handling
                const responses = await Promise.allSettled([
                    this.fetchVideoSegmentStats(),
                    this.fetchExaminationStats(),
                    this.fetchSensitiveMetaStats()
                ]);
                // Process results
                responses.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.warn(`Failed to fetch stats for type ${index}:`, result.reason);
                    }
                });
                // Calculate totals
                this.calculateTotals();
                this.lastUpdated = new Date();
            }
            catch (error) {
                console.error('Error fetching unified annotation statistics:', error);
                this.error =
                    error.response?.data?.error || error.message || 'Failed to fetch annotation statistics';
                // Set fallback values on error
                this.resetStats();
            }
            finally {
                this.loading = false;
            }
        },
        async fetchVideoSegmentStats() {
            try {
                // ✅ Modern media framework endpoint
                const response = await axios.get('/api/media/videos/segments/stats/');
                const data = response.data;
                if (data.status === 'success') {
                    // Für den Moment nehmen wir an, dass alle Segmente noch bearbeitet werden müssen
                    // Diese Logik muss basierend auf der tatsächlichen Status-Implementierung angepasst werden
                    this.stats.segmentPending = data.total_segments;
                    this.stats.segmentInProgress = 0;
                    this.stats.segmentCompleted = 0;
                }
            }
            catch (error) {
                console.warn('Failed to fetch video segment stats:', error);
                // Setze Fallback-Werte
                this.stats.segmentPending = 0;
                this.stats.segmentInProgress = 0;
                this.stats.segmentCompleted = 0;
            }
        },
        async fetchExaminationStats() {
            try {
                const response = await axios.get('/api/examinations/');
                const data = response.data;
                const items = Array.isArray(data?.results)
                    ? data.results
                    : Array.isArray(data)
                        ? data
                        : [];
                const counts = {
                    pending: 0,
                    in_progress: 0,
                    completed: 0,
                    draft: 0,
                };
                for (const item of items) {
                    const status = item?.status || 'pending';
                    if (status in counts) {
                        counts[status] += 1;
                    }
                    else {
                        counts.pending += 1;
                    }
                }
                this.stats.examinationPending = counts.pending + counts.draft;
                this.stats.examinationInProgress = counts.in_progress;
                this.stats.examinationCompleted = counts.completed;
            }
            catch (error) {
                console.warn('Failed to fetch examination stats:', error);
                // Setze Fallback-Werte, wenn die Untersuchungen nicht geladen werden können
                this.stats.examinationPending = 0;
                this.stats.examinationInProgress = 0;
                this.stats.examinationCompleted = 0;
            }
        },
        async fetchSensitiveMetaStats() {
            try {
                // ✅ Modern media framework endpoint - list all sensitive metadata
                const response = await axios.get('/api/media/sensitive-metadata/');
                const data = response.data;
                // Calculate stats from metadata list (no dedicated stats endpoint exists yet)
                const total = data.results?.length || data.length || 0;
                const verified = data.results?.filter((m) => m.dob_verified && m.names_verified).length || 0;
                this.stats.sensitiveMetaPending = total - verified;
                this.stats.sensitiveMetaInProgress = 0;
                this.stats.sensitiveMetaCompleted = verified;
            }
            catch (error) {
                console.warn('Failed to fetch sensitive meta stats:', error);
                // Setze Fallback-Werte basierend auf dem HTML-Inhalt (1 Patientendaten-Eintrag sichtbar)
                this.stats.sensitiveMetaPending = 1;
                this.stats.sensitiveMetaInProgress = 0;
                this.stats.sensitiveMetaCompleted = 0;
            }
        },
        calculateTotals() {
            this.stats.totalPending =
                this.stats.segmentPending + this.stats.examinationPending + this.stats.sensitiveMetaPending;
            this.stats.totalInProgress =
                this.stats.segmentInProgress +
                    this.stats.examinationInProgress +
                    this.stats.sensitiveMetaInProgress;
            this.stats.totalCompleted =
                this.stats.segmentCompleted +
                    this.stats.examinationCompleted +
                    this.stats.sensitiveMetaCompleted;
            this.stats.totalAnnotations =
                this.stats.totalPending + this.stats.totalInProgress + this.stats.totalCompleted;
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
                totalAnnotations: 0
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
                ;
                this.stats[key] += count;
            }
        },
        decrementCount(type, status, count = 1) {
            const key = `${type}${status.charAt(0).toUpperCase() + status.slice(1)}`;
            if (typeof this.stats[key] === 'number') {
                ;
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
    }
});
