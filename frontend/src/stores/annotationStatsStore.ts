import { defineStore } from 'pinia';
import axios from 'axios';

// Interfaces für verschiedene Statistik-Typen
export interface OverviewStats {
  total_videos: number;
  total_raw_videos: number;
  total_pdfs: number;
  total_patients: number;
  total_examinations: number;
  total_findings: number;
  total_annotatable_items: number;
  completion_rate: number;
  status_counts: {
    pending: number;
    in_progress: number;
    completed: number;
    validated: number;
  };
}

export interface VideoStats {
  duration_stats: {
    total_duration: number;
    avg_duration: number;
    total_count: number;
  };
  status_distribution: {
    pending: number;
    in_progress: number;
    completed: number;
    validated: number;
    requires_review: number;
  };
  segment_stats: {
    total_segments: number;
    avg_segments_per_video: number;
  };
  videos_with_segments: number;
}

export interface PatientStats {
  total_patients: number;
  age_distribution: Array<{
    age_group: string;
    count: number;
  }>;
  gender_distribution: Array<{
    [key: string]: number;
  }>;
}

export interface TimelineDataPoint {
  period: string;
  count: number;
  completed?: number;
}

export interface TimelineData {
  video_annotations: TimelineDataPoint[];
  examinations: TimelineDataPoint[];
}

export interface ProductivityMetrics {
  daily_averages: {
    videos_per_day: number;
    examinations_per_day: number;
    findings_per_day: number;
    completed_videos_per_day: number;
  };
  efficiency_metrics: {
    completion_rate: number;
    findings_per_examination: number;
  };
}

export interface UserStats {
  user_id: number;
  username: string;
  full_name: string;
  video_count: number;
  examination_count: number;
  finding_count: number;
  completed_videos: number;
  completion_rate: number;
}

export interface RealtimeStats {
  today: {
    videos_added: number;
    examinations_created: number;
    findings_created: number;
    videos_completed: number;
  };
  current_status: {
    pending_videos: number;
    in_progress_videos: number;
    pending_examinations: number;
    active_users: number;
  };
  last_updated: string;
}

export interface AnnotationStatsData {
  overview: OverviewStats;
  video_stats: VideoStats;
  pdf_stats: any;
  patient_stats: PatientStats;
  examination_stats: any;
  finding_stats: any;
  timeline_data: TimelineData;
  status_distribution: any;
  productivity_metrics: ProductivityMetrics;
}

export interface StatsFilters {
  period: 'day' | 'week' | 'month' | 'year';
  start_date?: string;
  end_date?: string;
  user_id?: number;
}

export const useAnnotationStatsStore = defineStore('annotationStats', {
  state: () => ({
    // Main statistics data
    stats: null as AnnotationStatsData | null,
    userStats: [] as UserStats[],
    realtimeStats: null as RealtimeStats | null,
    
    // Loading states
    loading: false,
    userStatsLoading: false,
    realtimeLoading: false,
    
    // Error states
    error: null as string | null,
    userStatsError: null as string | null,
    realtimeError: null as string | null,
    
    // Filters
    filters: {
      period: 'month',
      start_date: undefined,
      end_date: undefined,
      user_id: undefined
    } as StatsFilters,
    
    // Cache timestamps
    lastStatsUpdate: null as Date | null,
    lastRealtimeUpdate: null as Date | null,
    
    // Auto-refresh settings
    autoRefreshEnabled: false,
    autoRefreshInterval: null as ReturnType<typeof setInterval> | null,
    refreshIntervalMs: 30000, // 30 seconds
  }),

  getters: {
    /**
     * Formatiert die Dauer von Sekunden in lesbares Format
     */
    formatDuration: () => (seconds: number): string => {
      if (!seconds || isNaN(seconds)) return 'Unbekannt';
      
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
    overallCompletionRate: (state): number => {
      if (!state.stats?.overview) return 0;
      return state.stats.overview.completion_rate;
    },

    /**
     * Gibt die aktuellsten Produktivitätsmetriken zurück
     */
    currentProductivity: (state): ProductivityMetrics | null => {
      return state.stats?.productivity_metrics || null;
    },

    /**
     * Prüft ob die Daten aktuell sind (weniger als 5 Minuten alt)
     */
    isDataFresh: (state): boolean => {
      if (!state.lastStatsUpdate) return false;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return state.lastStatsUpdate > fiveMinutesAgo;
    },

    /**
     * Gibt die Top 5 aktivsten Benutzer zurück
     */
    topActiveUsers: (state): UserStats[] => {
      return state.userStats
        .slice()
        .sort((a, b) => (b.video_count + b.examination_count) - (a.video_count + a.examination_count))
        .slice(0, 5);
    },

    /**
     * Timeline-Daten für Charts aufbereitet
     */
    chartTimelineData: (state) => {
      if (!state.stats?.timeline_data) return null;
      
      return {
        labels: state.stats.timeline_data.video_annotations.map(point => 
          new Date(point.period).toLocaleDateString('de-DE')
        ),
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
      if (!state.stats?.video_stats?.status_distribution) return null;
      
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
            '#dc3545'  // Rot für Überprüfung erforderlich
          ]
        }]
      };
    }
  },

  actions: {
    /**
     * Lädt die Haupt-Statistiken mit optionalen Filtern
     */
    async fetchStats(customFilters?: Partial<StatsFilters>) {
      this.loading = true;
      this.error = null;

      try {
        const params = new URLSearchParams();
        const filters = { ...this.filters, ...customFilters };

        // Parameter hinzufügen
        params.append('period', filters.period);
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.user_id) params.append('user_id', filters.user_id.toString());

        const response = await axios.get(`/api/stats/annotations/?${params.toString()}`);
        
        this.stats = response.data;
        this.lastStatsUpdate = new Date();
        
        // Filter aktualisieren falls custom filters übergeben wurden
        if (customFilters) {
          this.filters = { ...this.filters, ...customFilters };
        }

      } catch (error: any) {
        console.error('Fehler beim Laden der Statistiken:', error);
        this.error = error.response?.data?.error || error.message || 'Fehler beim Laden der Statistiken';
      } finally {
        this.loading = false;
      }
    },

    /**
     * Lädt Benutzer-Statistiken
     */
    async fetchUserStats(userId?: number) {
      this.userStatsLoading = true;
      this.userStatsError = null;

      try {
        const url = userId ? `/api/stats/users/${userId}/` : '/api/stats/users/';
        const response = await axios.get(url);
        
        if (userId) {
          // Einzelner Benutzer - Update/Add zu userStats
          const userStat = response.data;
          const existingIndex = this.userStats.findIndex(u => u.user_id === userId);
          
          if (existingIndex >= 0) {
            this.userStats[existingIndex] = userStat;
          } else {
            this.userStats.push(userStat);
          }
        } else {
          // Alle Benutzer
          this.userStats = response.data.user_stats;
        }

      } catch (error: any) {
        console.error('Fehler beim Laden der Benutzer-Statistiken:', error);
        this.userStatsError = error.response?.data?.error || error.message || 'Fehler beim Laden der Benutzer-Statistiken';
      } finally {
        this.userStatsLoading = false;
      }
    },

    /**
     * Lädt Echtzeit-Statistiken
     */
    async fetchRealtimeStats() {
      this.realtimeLoading = true;
      this.realtimeError = null;

      try {
        const response = await axios.get('/api/stats/realtime/');
        this.realtimeStats = response.data;
        this.lastRealtimeUpdate = new Date();

      } catch (error: any) {
        console.error('Fehler beim Laden der Echtzeit-Statistiken:', error);
        this.realtimeError = error.response?.data?.error || error.message || 'Fehler beim Laden der Echtzeit-Statistiken';
      } finally {
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
    async updateFilters(newFilters: Partial<StatsFilters>) {
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
    exportStatsAsJson(): string {
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