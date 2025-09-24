/// <reference types="node" />
/// <reference types="node" />
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
export declare const useAnnotationStatsStore: import("pinia").StoreDefinition<"annotationStats", {
    stats: AnnotationStatsData | null;
    userStats: UserStats[];
    realtimeStats: RealtimeStats | null;
    loading: boolean;
    userStatsLoading: boolean;
    realtimeLoading: boolean;
    error: string | null;
    userStatsError: string | null;
    realtimeError: string | null;
    filters: StatsFilters;
    lastStatsUpdate: Date | null;
    lastRealtimeUpdate: Date | null;
    autoRefreshEnabled: boolean;
    autoRefreshInterval: NodeJS.Timeout | null;
    refreshIntervalMs: number;
}, {
    /**
     * Formatiert die Dauer von Sekunden in lesbares Format
     */
    formatDuration: () => (seconds: number) => string;
    /**
     * Berechnet die Gesamt-Completion-Rate
     */
    overallCompletionRate: (state: {
        stats: {
            overview: {
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
            };
            video_stats: {
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
            };
            pdf_stats: any;
            patient_stats: {
                total_patients: number;
                age_distribution: {
                    age_group: string;
                    count: number;
                }[];
                gender_distribution: Array<{
                    [key: string]: number;
                }>;
            };
            examination_stats: any;
            finding_stats: any;
            timeline_data: {
                video_annotations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
                examinations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
            };
            status_distribution: any;
            productivity_metrics: {
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
            };
        } | null;
        userStats: {
            user_id: number;
            username: string;
            full_name: string;
            video_count: number;
            examination_count: number;
            finding_count: number;
            completed_videos: number;
            completion_rate: number;
        }[];
        realtimeStats: {
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
        } | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: {
            period: 'day' | 'week' | 'month' | 'year';
            start_date?: string | undefined;
            end_date?: string | undefined;
            user_id?: number | undefined;
        };
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: {
            close: () => NodeJS.Timeout;
            hasRef: () => boolean;
            ref: () => NodeJS.Timeout;
            refresh: () => NodeJS.Timeout;
            unref: () => NodeJS.Timeout;
            _onTimeout: (...args: any[]) => void;
            [Symbol.toPrimitive]: () => number;
            [Symbol.dispose]: () => void;
        } | null;
        refreshIntervalMs: number;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: AnnotationStatsData | null;
        userStats: UserStats[];
        realtimeStats: RealtimeStats | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: StatsFilters;
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: NodeJS.Timeout | null;
        refreshIntervalMs: number;
    }>) => number;
    /**
     * Gibt die aktuellsten Produktivitätsmetriken zurück
     */
    currentProductivity: (state: {
        stats: {
            overview: {
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
            };
            video_stats: {
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
            };
            pdf_stats: any;
            patient_stats: {
                total_patients: number;
                age_distribution: {
                    age_group: string;
                    count: number;
                }[];
                gender_distribution: Array<{
                    [key: string]: number;
                }>;
            };
            examination_stats: any;
            finding_stats: any;
            timeline_data: {
                video_annotations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
                examinations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
            };
            status_distribution: any;
            productivity_metrics: {
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
            };
        } | null;
        userStats: {
            user_id: number;
            username: string;
            full_name: string;
            video_count: number;
            examination_count: number;
            finding_count: number;
            completed_videos: number;
            completion_rate: number;
        }[];
        realtimeStats: {
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
        } | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: {
            period: 'day' | 'week' | 'month' | 'year';
            start_date?: string | undefined;
            end_date?: string | undefined;
            user_id?: number | undefined;
        };
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: {
            close: () => NodeJS.Timeout;
            hasRef: () => boolean;
            ref: () => NodeJS.Timeout;
            refresh: () => NodeJS.Timeout;
            unref: () => NodeJS.Timeout;
            _onTimeout: (...args: any[]) => void;
            [Symbol.toPrimitive]: () => number;
            [Symbol.dispose]: () => void;
        } | null;
        refreshIntervalMs: number;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: AnnotationStatsData | null;
        userStats: UserStats[];
        realtimeStats: RealtimeStats | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: StatsFilters;
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: NodeJS.Timeout | null;
        refreshIntervalMs: number;
    }>) => ProductivityMetrics | null;
    /**
     * Prüft ob die Daten aktuell sind (weniger als 5 Minuten alt)
     */
    isDataFresh: (state: {
        stats: {
            overview: {
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
            };
            video_stats: {
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
            };
            pdf_stats: any;
            patient_stats: {
                total_patients: number;
                age_distribution: {
                    age_group: string;
                    count: number;
                }[];
                gender_distribution: Array<{
                    [key: string]: number;
                }>;
            };
            examination_stats: any;
            finding_stats: any;
            timeline_data: {
                video_annotations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
                examinations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
            };
            status_distribution: any;
            productivity_metrics: {
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
            };
        } | null;
        userStats: {
            user_id: number;
            username: string;
            full_name: string;
            video_count: number;
            examination_count: number;
            finding_count: number;
            completed_videos: number;
            completion_rate: number;
        }[];
        realtimeStats: {
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
        } | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: {
            period: 'day' | 'week' | 'month' | 'year';
            start_date?: string | undefined;
            end_date?: string | undefined;
            user_id?: number | undefined;
        };
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: {
            close: () => NodeJS.Timeout;
            hasRef: () => boolean;
            ref: () => NodeJS.Timeout;
            refresh: () => NodeJS.Timeout;
            unref: () => NodeJS.Timeout;
            _onTimeout: (...args: any[]) => void;
            [Symbol.toPrimitive]: () => number;
            [Symbol.dispose]: () => void;
        } | null;
        refreshIntervalMs: number;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: AnnotationStatsData | null;
        userStats: UserStats[];
        realtimeStats: RealtimeStats | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: StatsFilters;
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: NodeJS.Timeout | null;
        refreshIntervalMs: number;
    }>) => boolean;
    /**
     * Gibt die Top 5 aktivsten Benutzer zurück
     */
    topActiveUsers: (state: {
        stats: {
            overview: {
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
            };
            video_stats: {
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
            };
            pdf_stats: any;
            patient_stats: {
                total_patients: number;
                age_distribution: {
                    age_group: string;
                    count: number;
                }[];
                gender_distribution: Array<{
                    [key: string]: number;
                }>;
            };
            examination_stats: any;
            finding_stats: any;
            timeline_data: {
                video_annotations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
                examinations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
            };
            status_distribution: any;
            productivity_metrics: {
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
            };
        } | null;
        userStats: {
            user_id: number;
            username: string;
            full_name: string;
            video_count: number;
            examination_count: number;
            finding_count: number;
            completed_videos: number;
            completion_rate: number;
        }[];
        realtimeStats: {
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
        } | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: {
            period: 'day' | 'week' | 'month' | 'year';
            start_date?: string | undefined;
            end_date?: string | undefined;
            user_id?: number | undefined;
        };
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: {
            close: () => NodeJS.Timeout;
            hasRef: () => boolean;
            ref: () => NodeJS.Timeout;
            refresh: () => NodeJS.Timeout;
            unref: () => NodeJS.Timeout;
            _onTimeout: (...args: any[]) => void;
            [Symbol.toPrimitive]: () => number;
            [Symbol.dispose]: () => void;
        } | null;
        refreshIntervalMs: number;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: AnnotationStatsData | null;
        userStats: UserStats[];
        realtimeStats: RealtimeStats | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: StatsFilters;
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: NodeJS.Timeout | null;
        refreshIntervalMs: number;
    }>) => UserStats[];
    /**
     * Timeline-Daten für Charts aufbereitet
     */
    chartTimelineData: (state: {
        stats: {
            overview: {
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
            };
            video_stats: {
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
            };
            pdf_stats: any;
            patient_stats: {
                total_patients: number;
                age_distribution: {
                    age_group: string;
                    count: number;
                }[];
                gender_distribution: Array<{
                    [key: string]: number;
                }>;
            };
            examination_stats: any;
            finding_stats: any;
            timeline_data: {
                video_annotations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
                examinations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
            };
            status_distribution: any;
            productivity_metrics: {
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
            };
        } | null;
        userStats: {
            user_id: number;
            username: string;
            full_name: string;
            video_count: number;
            examination_count: number;
            finding_count: number;
            completed_videos: number;
            completion_rate: number;
        }[];
        realtimeStats: {
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
        } | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: {
            period: 'day' | 'week' | 'month' | 'year';
            start_date?: string | undefined;
            end_date?: string | undefined;
            user_id?: number | undefined;
        };
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: {
            close: () => NodeJS.Timeout;
            hasRef: () => boolean;
            ref: () => NodeJS.Timeout;
            refresh: () => NodeJS.Timeout;
            unref: () => NodeJS.Timeout;
            _onTimeout: (...args: any[]) => void;
            [Symbol.toPrimitive]: () => number;
            [Symbol.dispose]: () => void;
        } | null;
        refreshIntervalMs: number;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: AnnotationStatsData | null;
        userStats: UserStats[];
        realtimeStats: RealtimeStats | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: StatsFilters;
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: NodeJS.Timeout | null;
        refreshIntervalMs: number;
    }>) => {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor: string;
            borderColor: string;
        }[];
    } | null;
    /**
     * Status-Verteilung für Pie-Charts
     */
    statusDistributionChart: (state: {
        stats: {
            overview: {
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
            };
            video_stats: {
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
            };
            pdf_stats: any;
            patient_stats: {
                total_patients: number;
                age_distribution: {
                    age_group: string;
                    count: number;
                }[];
                gender_distribution: Array<{
                    [key: string]: number;
                }>;
            };
            examination_stats: any;
            finding_stats: any;
            timeline_data: {
                video_annotations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
                examinations: {
                    period: string;
                    count: number;
                    completed?: number | undefined;
                }[];
            };
            status_distribution: any;
            productivity_metrics: {
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
            };
        } | null;
        userStats: {
            user_id: number;
            username: string;
            full_name: string;
            video_count: number;
            examination_count: number;
            finding_count: number;
            completed_videos: number;
            completion_rate: number;
        }[];
        realtimeStats: {
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
        } | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: {
            period: 'day' | 'week' | 'month' | 'year';
            start_date?: string | undefined;
            end_date?: string | undefined;
            user_id?: number | undefined;
        };
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: {
            close: () => NodeJS.Timeout;
            hasRef: () => boolean;
            ref: () => NodeJS.Timeout;
            refresh: () => NodeJS.Timeout;
            unref: () => NodeJS.Timeout;
            _onTimeout: (...args: any[]) => void;
            [Symbol.toPrimitive]: () => number;
            [Symbol.dispose]: () => void;
        } | null;
        refreshIntervalMs: number;
    } & import("pinia").PiniaCustomStateProperties<{
        stats: AnnotationStatsData | null;
        userStats: UserStats[];
        realtimeStats: RealtimeStats | null;
        loading: boolean;
        userStatsLoading: boolean;
        realtimeLoading: boolean;
        error: string | null;
        userStatsError: string | null;
        realtimeError: string | null;
        filters: StatsFilters;
        lastStatsUpdate: Date | null;
        lastRealtimeUpdate: Date | null;
        autoRefreshEnabled: boolean;
        autoRefreshInterval: NodeJS.Timeout | null;
        refreshIntervalMs: number;
    }>) => {
        labels: string[];
        datasets: {
            data: number[];
            backgroundColor: string[];
        }[];
    } | null;
}, {
    /**
     * Lädt die Haupt-Statistiken mit optionalen Filtern
     */
    fetchStats(customFilters?: Partial<StatsFilters>): Promise<void>;
    /**
     * Lädt Benutzer-Statistiken - Placeholder da Backend-Endpunkt nicht existiert
     */
    fetchUserStats(userId?: number): Promise<void>;
    /**
     * Lädt Echtzeit-Statistiken - Placeholder da Backend-Endpunkt nicht existiert
     */
    fetchRealtimeStats(): Promise<void>;
    /**
     * Lädt alle Statistiken neu
     */
    refreshAllStats(): Promise<void>;
    /**
     * Startet automatische Aktualisierung
     */
    startAutoRefresh(): void;
    /**
     * Stoppt automatische Aktualisierung
     */
    stopAutoRefresh(): void;
    /**
     * Setzt Filter und lädt Daten neu
     */
    updateFilters(newFilters: Partial<StatsFilters>): Promise<void>;
    /**
     * Setzt alle Filter zurück
     */
    resetFilters(): Promise<void>;
    /**
     * Exportiert Statistiken als JSON
     */
    exportStatsAsJson(): string;
    /**
     * Lädt initiale Daten beim Store-Setup
     */
    initialize(): Promise<void>;
    /**
     * Cleanup beim Verlassen der Komponente
     */
    cleanup(): void;
    /**
     * Fehler zurücksetzen
     */
    clearErrors(): void;
}>;
export default useAnnotationStatsStore;
