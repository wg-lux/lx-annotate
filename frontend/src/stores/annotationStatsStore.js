import { defineStore } from 'pinia';
import axios from 'axios';
export const useAnnotationStatsStore = defineStore('annotationStats', {
    state: () => ({
        // Main statistics data
        stats: null,
        userStats: [],
        realtimeStats: null,
        // Loading states
        loading: false,
        userStatsLoading: false,
        realtimeLoading: false,
        // Error states
        error: null,
        userStatsError: null,
        realtimeError: null,
        // Filters
        filters: {
            period: 'month',
            start_date: undefined,
            end_date: undefined,
            user_id: undefined
        },
        // Cache timestamps
        lastStatsUpdate: null,
        lastRealtimeUpdate: null,
        // Auto-refresh settings
        autoRefreshEnabled: false,
        autoRefreshInterval: null,
        refreshIntervalMs: 30000, // 30 seconds
    }),
    getters: {
        /**
         * Formatiert die Dauer von Sekunden in lesbares Format
         */
        formatDuration: () => (seconds) => {
            if (!seconds || isNaN(seconds))
                return 'Unbekannt';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            return `${minutes}m`;
        },
        /**
         * Berechnet die Gesamt-Completion-Rate
         */
        overallCompletionRate: (state) => {
            if (!state.stats?.overview)
                return 0;
            return state.stats.overview.completion_rate;
        },
        /**
         * Gibt die aktuellsten Produktivitätsmetriken zurück
         */
        currentProductivity: (state) => {
            return state.stats?.productivity_metrics || null;
        },
        /**
         * Prüft ob die Daten aktuell sind (weniger als 5 Minuten alt)
         */
        isDataFresh: (state) => {
            if (!state.lastStatsUpdate)
                return false;
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return state.lastStatsUpdate > fiveMinutesAgo;
        },
        /**
         * Gibt die Top 5 aktivsten Benutzer zurück
         */
        topActiveUsers: (state) => {
            return state.userStats
                .slice()
                .sort((a, b) => (b.video_count + b.examination_count) - (a.video_count + a.examination_count))
                .slice(0, 5);
        },
        /**
         * Timeline-Daten für Charts aufbereitet
         */
        chartTimelineData: (state) => {
            if (!state.stats?.timeline_data)
                return null;
            return {
                labels: state.stats.timeline_data.video_annotations.map(point => new Date(point.period).toLocaleDateString('de-DE')),
                datasets: [
                    {
                        label: 'Video-Annotationen',
                        data: state.stats.timeline_data.video_annotations.map(point => point.count),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                    },
                    {
                        label: 'Abgeschlossene Videos',
                        data: state.stats.timeline_data.video_annotations.map(point => point.completed || 0),
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                    },
                    {
                        label: 'Untersuchungen',
                        data: state.stats.timeline_data.examinations.map(point => point.count),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                    }
                ]
            };
        },
        /**
         * Status-Verteilung für Pie-Charts
         */
        statusDistributionChart: (state) => {
            if (!state.stats?.video_stats?.status_distribution)
                return null;
            const distribution = state.stats.video_stats.status_distribution;
            return {
                labels: ['Ausstehend', 'In Bearbeitung', 'Abgeschlossen', 'Validiert', 'Überprüfung erforderlich'],
                datasets: [{
                        data: [
                            distribution.pending,
                            distribution.in_progress,
                            distribution.completed,
                            distribution.validated,
                            distribution.requires_review
                        ],
                        backgroundColor: [
                            '#ffc107', // Gelb für ausstehend
                            '#17a2b8', // Blau für in Bearbeitung
                            '#28a745', // Grün für abgeschlossen
                            '#007bff', // Blau für validiert
                            '#dc3545' // Rot für Überprüfung erforderlich
                        ]
                    }]
            };
        }
    },
    actions: {
        /**
         * Lädt die Haupt-Statistiken mit optionalen Filtern
         */
        async fetchStats(customFilters) {
            this.loading = true;
            this.error = null;
            try {
                // Verschiedene Statistiken von verschiedenen Endpunkten laden
                const [generalResponse, examinationResponse, videoSegmentResponse, sensitiveMetaResponse] = await Promise.all([
                    axios.get('/api/stats/'),
                    axios.get('/api/examinations/stats/'),
                    axios.get('/api/video-segments/stats/'),
                    axios.get('/api/video/sensitivemeta/stats/')
                ]);
                // Daten kombinieren und an die erwartete Struktur anpassen
                this.stats = {
                    overview: {
                        total_videos: generalResponse.data.overview.total_videos,
                        total_raw_videos: generalResponse.data.overview.total_videos, // Fallback
                        total_pdfs: 0, // TODO: Noch nicht implementiert
                        total_patients: generalResponse.data.overview.total_patients,
                        total_examinations: generalResponse.data.overview.total_examinations,
                        total_findings: 0, // TODO: Noch nicht implementiert
                        total_annotatable_items: generalResponse.data.overview.total_segments,
                        completion_rate: generalResponse.data.system_status.processing_completion_percent,
                        status_counts: {
                            pending: 0, // TODO: Berechnen basierend auf verfügbaren Daten
                            in_progress: 0,
                            completed: videoSegmentResponse.data.videos_with_segments,
                            validated: 0
                        }
                    },
                    video_stats: {
                        duration_stats: {
                            total_duration: 0, // TODO: Noch nicht implementiert
                            avg_duration: 0,
                            total_count: generalResponse.data.overview.total_videos
                        },
                        status_distribution: {
                            pending: generalResponse.data.overview.total_videos - videoSegmentResponse.data.videos_with_segments,
                            in_progress: 0,
                            completed: videoSegmentResponse.data.videos_with_segments,
                            validated: 0,
                            requires_review: 0
                        },
                        segment_stats: {
                            total_segments: videoSegmentResponse.data.total_segments,
                            avg_segments_per_video: videoSegmentResponse.data.total_videos > 0
                                ? Math.round(videoSegmentResponse.data.total_segments / videoSegmentResponse.data.total_videos * 100) / 100
                                : 0
                        },
                        videos_with_segments: videoSegmentResponse.data.videos_with_segments
                    },
                    pdf_stats: {}, // TODO: Implementieren wenn PDF-Stats verfügbar
                    patient_stats: {
                        total_patients: generalResponse.data.overview.total_patients,
                        age_distribution: [], // TODO: Implementieren
                        gender_distribution: [] // TODO: Implementieren
                    },
                    examination_stats: examinationResponse.data,
                    finding_stats: {}, // TODO: Implementieren
                    timeline_data: {
                        video_annotations: [], // TODO: Implementieren
                        examinations: []
                    },
                    status_distribution: videoSegmentResponse.data.label_distribution,
                    productivity_metrics: {
                        daily_averages: {
                            videos_per_day: 0, // TODO: Berechnen
                            examinations_per_day: 0,
                            findings_per_day: 0,
                            completed_videos_per_day: 0
                        },
                        efficiency_metrics: {
                            completion_rate: generalResponse.data.system_status.processing_completion_percent,
                            findings_per_examination: 0 // TODO: Berechnen
                        }
                    }
                };
                this.lastStatsUpdate = new Date();
                // Filter aktualisieren falls custom filters übergeben wurden
                if (customFilters) {
                    this.filters = { ...this.filters, ...customFilters };
                }
            }
            catch (error) {
                console.error('Fehler beim Laden der Statistiken:', error);
                this.error = error.response?.data?.error || error.message || 'Fehler beim Laden der Statistiken';
            }
            finally {
                this.loading = false;
            }
        },
        /**
         * Lädt Benutzer-Statistiken - Placeholder da Backend-Endpunkt nicht existiert
         */
        async fetchUserStats(userId) {
            this.userStatsLoading = true;
            this.userStatsError = null;
            try {
                // TODO: Implementieren wenn Backend-Endpunkt verfügbar ist
                console.warn('User stats endpoint /api/stats/users/ nicht implementiert');
                this.userStats = [];
            }
            catch (error) {
                console.error('Fehler beim Laden der Benutzer-Statistiken:', error);
                this.userStatsError = error.response?.data?.error || error.message || 'Fehler beim Laden der Benutzer-Statistiken';
            }
            finally {
                this.userStatsLoading = false;
            }
        },
        /**
         * Lädt Echtzeit-Statistiken - Placeholder da Backend-Endpunkt nicht existiert
         */
        async fetchRealtimeStats() {
            this.realtimeLoading = true;
            this.realtimeError = null;
            try {
                // TODO: Implementieren wenn Backend-Endpunkt verfügbar ist
                console.warn('Realtime stats endpoint /api/stats/realtime/ nicht implementiert');
                this.realtimeStats = {
                    today: {
                        videos_added: 0,
                        examinations_created: 0,
                        findings_created: 0,
                        videos_completed: 0
                    },
                    current_status: {
                        pending_videos: 0,
                        in_progress_videos: 0,
                        pending_examinations: 0,
                        active_users: 0
                    },
                    last_updated: new Date().toISOString()
                };
            }
            catch (error) {
                console.error('Fehler beim Laden der Echtzeit-Statistiken:', error);
                this.realtimeError = error.response?.data?.error || error.message || 'Fehler beim Laden der Echtzeit-Statistiken';
            }
            finally {
                this.realtimeLoading = false;
            }
        },
        /**
         * Lädt alle Statistiken neu
         */
        async refreshAllStats() {
            await Promise.all([
                this.fetchStats(),
                this.fetchUserStats(),
                this.fetchRealtimeStats()
            ]);
        },
        /**
         * Startet automatische Aktualisierung
         */
        startAutoRefresh() {
            if (this.autoRefreshInterval) {
                this.stopAutoRefresh();
            }
            this.autoRefreshEnabled = true;
            this.autoRefreshInterval = setInterval(() => {
                // Nur Echtzeit-Statistiken automatisch aktualisieren
                this.fetchRealtimeStats();
            }, this.refreshIntervalMs);
        },
        /**
         * Stoppt automatische Aktualisierung
         */
        stopAutoRefresh() {
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
                this.autoRefreshInterval = null;
            }
            this.autoRefreshEnabled = false;
        },
        /**
         * Setzt Filter und lädt Daten neu
         */
        async updateFilters(newFilters) {
            this.filters = { ...this.filters, ...newFilters };
            await this.fetchStats();
        },
        /**
         * Setzt alle Filter zurück
         */
        async resetFilters() {
            this.filters = {
                period: 'month',
                start_date: undefined,
                end_date: undefined,
                user_id: undefined
            };
            await this.fetchStats();
        },
        /**
         * Exportiert Statistiken als JSON
         */
        exportStatsAsJson() {
            const exportData = {
                stats: this.stats,
                userStats: this.userStats,
                realtimeStats: this.realtimeStats,
                filters: this.filters,
                exported_at: new Date().toISOString()
            };
            return JSON.stringify(exportData, null, 2);
        },
        /**
         * Lädt initiale Daten beim Store-Setup
         */
        async initialize() {
            await this.refreshAllStats();
            this.startAutoRefresh();
        },
        /**
         * Cleanup beim Verlassen der Komponente
         */
        cleanup() {
            this.stopAutoRefresh();
        },
        /**
         * Fehler zurücksetzen
         */
        clearErrors() {
            this.error = null;
            this.userStatsError = null;
            this.realtimeError = null;
        }
    }
});
export default useAnnotationStatsStore;
