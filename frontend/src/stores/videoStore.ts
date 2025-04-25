import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance, { r } from '../api/axiosInstance';
import videoAxiosInstance from '../api/videoAxiosInstance';
import type { VideoResponse } from '../api/videoAxiosInstance';
import type { AxiosError } from 'axios';

export interface Segment {
  id: string;
  label: string;
  label_display: string;
  startTime: number;
  endTime: number;
  avgConfidence: number; // value between 0 and 1
}

export interface VideoAnnotation {
  isAnnotated: boolean;
  errorMessage: string;
  segments: Segment[];
  videoUrl: string;
  id: string;
  status: 'in_progress' | 'available' | 'completed'; // Status des Videos
  assignedUser: string | null; // Zugewiesener Benutzer
}

export interface VideoLabelResponse {
  label: string;
  time_segments: Array<{
    segment_start: number;
    segment_end: number;
    start_time: number;
    end_time: number;
    frames: Record<
      string,
      {
        frame_filename: string;
        frame_file_path: string;
        predictions: Record<string, number>;
      }
    >;
  }>;
}

export interface VideoMeta {
  id: number; // API returns a number for id
  original_file_name: string;
  status: string;
  assignedUser?: string | null; // Optional, damit es mit bestehenden Daten kompatibel ist
  anonymized: boolean; // Geändert von string zu boolean
}

export interface LabelMeta {
  id: number; // API returns a number for id
  name: string;
}

export interface VideoList {
  videos: VideoMeta[];
  labels: LabelMeta[];
}

const translationMap: Record<string, string> = {
  appendix: 'Appendix',
  blood: 'Blut',
  diverticule: 'Divertikel',
  grasper: 'Greifer',
  ileocaecalvalve: 'Ileozäkalklappe',
  ileum: 'Ileum',
  low_quality: 'Niedrige Bildqualität',
  nbi: 'Narrow Band Imaging',
  needle: 'Nadel',
  outside: 'Außerhalb',
  polyp: 'Polyp',
  snare: 'Snare',
  water_jet: 'Wasserstrahl',
  wound: 'Wunde',
};

// Optional: default segments per label if needed at startup
const defaultSegments: Record<string, Segment[]> = Object.keys(translationMap).reduce(
  (acc, key) => {
    acc[key] = [
      {
        id: `default-${key}`,
        label: key,
        label_display: translationMap[key],
        startTime: 0,
        endTime: 0,
        avgConfidence: 1,
      },
    ];
    return acc;
  },
  {} as Record<string, Segment[]>
);

export const useVideoStore = defineStore('video', () => {
  // State
  const currentVideo = ref<VideoAnnotation | null>(null);
  const errorMessage = ref('');
  const videoUrl = ref('');
  // Store segments keyed by label
  const segmentsByLabel = ref<Record<string, Segment[]>>({ ...defaultSegments });
  const videoList = ref<VideoList>({ videos: [], labels: [] });

  function fetchAllVideos() {
    axiosInstance
      .get(r('videos/'))
      .then((response: { data: { videos: { id: string; original_file_name: string; status?: string; anonymized?: boolean; }[]; labels: { id: string; name: string; }[]; }; }) => {
        videoList.value = {
          videos: response.data.videos.map(video => ({
            id: parseInt(video.id),
            original_file_name: video.original_file_name,
            status: video.status || 'available', // Default-Status falls nicht vorhanden
            assignedUser: null, // Default-Wert für assignedUser
            anonymized: video.anonymized || false // Default-Wert für anonymized ist false
          })),
          labels: response.data.labels.map(label => ({
            id: parseInt(label.id),
            name: label.name,
          })),
        };
        console.log("Fetched videos:", videoList.value);
      })
      .catch((error: any) => {
        console.error('Error loading videos:', error);
      });
  }
  
  // A computed property to combine all segments (if needed for timeline display)
  const allSegments = computed(() =>
    Object.values(segmentsByLabel.value).flat()
  );

  // Actions
  function clearVideo(): void {
    currentVideo.value = null;
  }
  
  function setVideo(video: VideoAnnotation): void {
    currentVideo.value = video;
  }
  
  async function fetchVideoUrl() {
    try {
      const response = await videoAxiosInstance.get<VideoResponse>(
        currentVideo.value?.id || '1',
        { headers: { 'Accept': 'application/json' } }
      );
      if (response.data.video_url) {
        videoUrl.value = response.data.video_url;
        console.log("Fetched video URL:", videoUrl.value);
      } else {
        console.warn("No video URL returned; waiting for upload.");
        errorMessage.value = "Invalid video response received.";
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error loading video:", axiosError.response?.data || axiosError.message);
      errorMessage.value = "Error loading video. Please check the API endpoint or try again later.";
    }
  }

  // Fetch segments for a specific label and store them under that label key.
  async function fetchSegmentsByLabel(id: string, label: string = 'outside'): Promise<void> {
    try {
      const response = await axiosInstance.get<VideoLabelResponse>(
        r(`video/${id}/label/${label}/`),
        { headers: { 'Accept': 'application/json' } }
      );
      // Map the API response into our Segment structure.
      const segmentsForLabel: Segment[] = response.data.time_segments.map((segment, index) => ({
        id: `${label}-segment${index + 1}`,
        label: response.data.label, // or simply use the passed label
        label_display: getTranslationForLabel(response.data.label),
        startTime: segment.start_time,
        endTime: segment.end_time,
        avgConfidence: 1, // Default value since API doesn't provide it.
      }));
      segmentsByLabel.value[label] = segmentsForLabel;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error loading segments for label " + label + ":", axiosError.response?.data || axiosError.message);
      errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`;
    }
  }

  // Optionally, fetch segments for all labels concurrently.
  async function fetchAllSegments(id: string): Promise<void> {
    const labels = Object.keys(translationMap);
    await Promise.all(labels.map(label => fetchSegmentsByLabel(id, label)));
  }

  async function saveAnnotations() {
    try {
      // Combine all segments from all labels if needed.
      const combinedSegments = Object.values(segmentsByLabel.value).flat();
      const response = await axiosInstance.post(r('annotations/'), { segments: combinedSegments });
      console.log('Annotations saved:', response.data);
    } catch (error) {
      console.error('Error saving annotations:', error);
    }
  }
  
  function getSegmentStyle(segment: Segment, duration: number): Record<string, string> {
    if (segment.startTime < 0) {
      throw new Error('Startpunkt des Segments ist ungültig.');
    }
    if (segment.endTime > duration) {
      throw new Error('Endzeitpunkt des Segments ist ungültig.');
    }
    if (segment.endTime < segment.startTime) {
      throw new Error('Endzeitpunkt des Segments ist vor dem Startzeitpunkt.');
    }
    const leftPercentage = (segment.startTime / duration) * 100;
    const widthPercentage = ((segment.endTime - segment.startTime) / duration) * 100;
    return {
      position: 'absolute',
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`,
      backgroundColor: getColorForLabel(segment.label),
    };
  }
  
  function getColorForLabel(label: string): string {
    const colorMap: Record<string, string> = {
      appendix: '#ff9800',
      blood: '#f44336',
      diverticule: '#9c27b0',
      grasper: '#CBEDCA',
      ileocaecalvalve: '#3f51b5',
      ileum: '#2196f3',
      low_quality: '#9e9e9e',
      nbi: '#795548',
      needle: '#e91e63',
      outside: '#00bcd4',
      polyp: '#8bc34a',
      snare: '#ff5722',
      water_jet: '#03a9f4',
      wound: '#607d8b',
    };
    return colorMap[label] || '#757575';
  }
  
  function getTranslationForLabel(label: string): string {
    return translationMap[label] || label;
  }
  
  function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void {
    if (videoElement) {
      videoElement.currentTime = segment.startTime;
    }
  }

  async function updateVideoStatus(status: 'in_progress' | 'available' | 'completed'): Promise<void> {
    if (currentVideo.value) {
      try {
        currentVideo.value.status = status;
        // Senden des aktualisierten Status an den Server
        const response = await axiosInstance.post(r(`video/${currentVideo.value.id}/status/`), {
          status: status
        });
        console.log(`Video-Status aktualisiert: ${status}`, response.data);
      } catch (error) {
        console.error('Fehler beim Aktualisieren des Video-Status:', error);
        errorMessage.value = 'Fehler beim Aktualisieren des Video-Status.';
      }
    }
  }

  async function assignUserToVideo(user: string): Promise<void> {
    if (currentVideo.value) {
      try {
        currentVideo.value.assignedUser = user;
        // Senden der Benutzerzuweisung an den Server
        const response = await axiosInstance.post(r(`video/${currentVideo.value.id}/assign/`), {
          user: user
        });
        console.log(`Benutzer ${user} wurde dem Video zugewiesen.`, response.data);
      } catch (error) {
        console.error('Fehler bei der Benutzerzuweisung:', error);
        errorMessage.value = 'Fehler bei der Benutzerzuweisung.';
      }
    }
  }

  const uploadRevert = (
    uniqueFileId: string,
    load: () => void,
    error: (message: string) => void
  ) => {
    axiosInstance
      .delete(r(`upload-video/${uniqueFileId}/`))
      .then(() => {
        videoUrl.value = '';
        load();
      });
  };

  const uploadProcess = (
    fieldName: string,
    file: File,
    metadata: any,
    load: (serverFileId: string) => void,
    error: (message: string) => void
  ) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    axiosInstance
      .post(r('upload-video/'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response: { data: { video_url: any; }; }) => {
        const url = response.data.video_url;
        videoUrl.value = url;
        load(url); // Pass the URL as the server id
      })
      .catch((err: any) => {   
        error("Upload failed");
      });
  };
  
  // Return state and actions for consumption in components
  return {
    currentVideo,
    errorMessage,
    videoUrl,
    segmentsByLabel,
    allSegments,
    videoList,
    fetchAllVideos,
    uploadRevert,
    uploadProcess,
    clearVideo,
    setVideo,
    fetchVideoUrl,
    fetchSegmentsByLabel,
    fetchAllSegments,
    saveAnnotations,
    getSegmentStyle,
    getColorForLabel,
    getTranslationForLabel,
    jumpToSegment,
    updateVideoStatus,
    assignUserToVideo,
  };
});