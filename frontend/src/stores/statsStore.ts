

// This store is set to interact with the stats API
// It should speed up the process of counting the current annotations

import { defineStore } from 'pinia';
import axiosInstance, { r } from '@/api/axiosInstance';


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

function fetchStatsApi() {
    return axiosInstance.get(r('stats/')).then(res => res.data);
  }
  function fetchVideoStatsApi() {
    return axiosInstance.get(r('stats/videos/')).then(res => res.data);
  }
  function fetchImageStatsApi() {
    return axiosInstance.get(r('stats/images/')).then(res => res.data);
  }
  function fetchPatientStatsApi() {
    return axiosInstance.get(r('stats/patients/')).then(res => res.data);
  }
  
  export const useStatsStore = defineStore('stats', {
    state: () => ({
      stats: {} as Stats,
      videoStats: {} as VideoStats,
      imageStats: {} as ImageStats,
      patientStats: {} as PatientStats,
    }),
  
    actions: {
      // ---- FETCH ----
      async fetchStats() {
        this.stats = await fetchStatsApi();
      },
  
      async fetchVideoStats() {
        this.videoStats = await fetchVideoStatsApi();
      },
  
      async fetchImageStats() {
        this.imageStats = await fetchImageStatsApi();
      },
  
      async fetchPatientStats() {
        this.patientStats = await fetchPatientStatsApi();
      },
  
      // ---- UPDATE (just re-use the same helpers) ----
      async updateStats() {
        this.stats = await fetchStatsApi();
      },
  
      async updateVideoStats() {
        this.videoStats = await fetchVideoStatsApi();
      },
  
      async updateImageStats() {
        this.imageStats = await fetchImageStatsApi();
      },
  
      async updatePatientStats() {
        this.patientStats = await fetchPatientStatsApi();
      },
    },
  
    getters: {
      getStats: state => state.stats,
      getVideoStats: state => state.videoStats,
      getImageStats: state => state.imageStats,
      getPatientStats: state => state.patientStats,
    }
  });