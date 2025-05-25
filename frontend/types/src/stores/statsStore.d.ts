export interface Stats {
    totalCases: number;
    totalAnnotations: number;
    totalAnonymizations: number;
    totalVideos: number;
    totalImages: number;
}
export interface VideoStats {
    totalVideos: number;
    totalAnonymVideos: number;
    totalVideosCompleted: number;
    totalVideosInProgress: number;
    totalVideosNotStarted: number;
}
export interface ImageStats {
    totalImages: number;
    totalAnonymImages: number;
    totalImagesCompleted: number;
    totalImagesInProgress: number;
    totalImagesNotStarted: number;
}
export interface PatientStats {
    totalPatients: number;
    totalAnonymPatients: number;
    totalPatientsCompleted: number;
    totalPatientsInProgress: number;
    totalPatientsNotStarted: number;
}
export declare const useStatsStore: import("pinia").StoreDefinition<"stats", {
    stats: Stats;
    videoStats: VideoStats;
    imageStats: ImageStats;
    patientStats: PatientStats;
}, {
    getStats: (state: {
        stats: {
            totalCases: number;
            totalAnnotations: number;
            totalAnonymizations: number;
            totalVideos: number;
            totalImages: number;
        };
        videoStats: {
            totalVideos: number;
            totalAnonymVideos: number;
            totalVideosCompleted: number;
            totalVideosInProgress: number;
            totalVideosNotStarted: number;
        };
        imageStats: {
            totalImages: number;
            totalAnonymImages: number;
            totalImagesCompleted: number;
            totalImagesInProgress: number;
            totalImagesNotStarted: number;
        };
        patientStats: {
            totalPatients: number;
            totalAnonymPatients: number;
            totalPatientsCompleted: number;
            totalPatientsInProgress: number;
            totalPatientsNotStarted: number;
        };
    } & import("pinia").PiniaCustomStateProperties<{
        stats: Stats;
        videoStats: VideoStats;
        imageStats: ImageStats;
        patientStats: PatientStats;
    }>) => {
        totalCases: number;
        totalAnnotations: number;
        totalAnonymizations: number;
        totalVideos: number;
        totalImages: number;
    };
    getVideoStats: (state: {
        stats: {
            totalCases: number;
            totalAnnotations: number;
            totalAnonymizations: number;
            totalVideos: number;
            totalImages: number;
        };
        videoStats: {
            totalVideos: number;
            totalAnonymVideos: number;
            totalVideosCompleted: number;
            totalVideosInProgress: number;
            totalVideosNotStarted: number;
        };
        imageStats: {
            totalImages: number;
            totalAnonymImages: number;
            totalImagesCompleted: number;
            totalImagesInProgress: number;
            totalImagesNotStarted: number;
        };
        patientStats: {
            totalPatients: number;
            totalAnonymPatients: number;
            totalPatientsCompleted: number;
            totalPatientsInProgress: number;
            totalPatientsNotStarted: number;
        };
    } & import("pinia").PiniaCustomStateProperties<{
        stats: Stats;
        videoStats: VideoStats;
        imageStats: ImageStats;
        patientStats: PatientStats;
    }>) => {
        totalVideos: number;
        totalAnonymVideos: number;
        totalVideosCompleted: number;
        totalVideosInProgress: number;
        totalVideosNotStarted: number;
    };
    getImageStats: (state: {
        stats: {
            totalCases: number;
            totalAnnotations: number;
            totalAnonymizations: number;
            totalVideos: number;
            totalImages: number;
        };
        videoStats: {
            totalVideos: number;
            totalAnonymVideos: number;
            totalVideosCompleted: number;
            totalVideosInProgress: number;
            totalVideosNotStarted: number;
        };
        imageStats: {
            totalImages: number;
            totalAnonymImages: number;
            totalImagesCompleted: number;
            totalImagesInProgress: number;
            totalImagesNotStarted: number;
        };
        patientStats: {
            totalPatients: number;
            totalAnonymPatients: number;
            totalPatientsCompleted: number;
            totalPatientsInProgress: number;
            totalPatientsNotStarted: number;
        };
    } & import("pinia").PiniaCustomStateProperties<{
        stats: Stats;
        videoStats: VideoStats;
        imageStats: ImageStats;
        patientStats: PatientStats;
    }>) => {
        totalImages: number;
        totalAnonymImages: number;
        totalImagesCompleted: number;
        totalImagesInProgress: number;
        totalImagesNotStarted: number;
    };
    getPatientStats: (state: {
        stats: {
            totalCases: number;
            totalAnnotations: number;
            totalAnonymizations: number;
            totalVideos: number;
            totalImages: number;
        };
        videoStats: {
            totalVideos: number;
            totalAnonymVideos: number;
            totalVideosCompleted: number;
            totalVideosInProgress: number;
            totalVideosNotStarted: number;
        };
        imageStats: {
            totalImages: number;
            totalAnonymImages: number;
            totalImagesCompleted: number;
            totalImagesInProgress: number;
            totalImagesNotStarted: number;
        };
        patientStats: {
            totalPatients: number;
            totalAnonymPatients: number;
            totalPatientsCompleted: number;
            totalPatientsInProgress: number;
            totalPatientsNotStarted: number;
        };
    } & import("pinia").PiniaCustomStateProperties<{
        stats: Stats;
        videoStats: VideoStats;
        imageStats: ImageStats;
        patientStats: PatientStats;
    }>) => {
        totalPatients: number;
        totalAnonymPatients: number;
        totalPatientsCompleted: number;
        totalPatientsInProgress: number;
        totalPatientsNotStarted: number;
    };
}, {
    fetchStats(): Promise<void>;
    fetchVideoStats(): Promise<void>;
    fetchImageStats(): Promise<void>;
    fetchPatientStats(): Promise<void>;
    updateStats(): Promise<void>;
    updateVideoStats(): Promise<void>;
    updateImageStats(): Promise<void>;
    updatePatientStats(): Promise<void>;
}>;
