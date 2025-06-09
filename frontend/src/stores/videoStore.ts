import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance, { r } from '../api/axiosInstance';
import { AxiosError } from 'axios';

export interface VideoResponse {
  id: string;
  videoUrl: string;
  status: 'in_progress' | 'available' | 'completed';
  assignedUser: string | null;
  isAnnotated: boolean;
  errorMessage: string;
  segments: Segment[];
}

export interface VideoFileMeta {
  id: number;
  originalFileName: string;
  file: string | null;                // relative path
  videoUrl: string | null;
  fullVideoPath: string | null;      // absolute server path (may be unused on frontend)
  sensitiveMetaId: number;
  patientFirstName: string | null;
  patientLastName: string | null;
  patientDob: string | null;         // ISO date string
  examinationDate: string | null;    // ISO date string
  duration: number | null;           // seconds
}

export interface SensitiveMetaUpdatePayload {
  sensitiveMetaId: number;
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  examinationDate: string;
}

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
  originalFileName: string;
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
  const videoMeta = ref<VideoFileMeta | null>(null);
  const hasVideo = computed(() => !!currentVideo.value);
  const duration = computed(() => {
    if (videoMeta.value && videoMeta.value.duration) {
      return videoMeta.value.duration;
    }
    return 0; // Default value if duration is not available
  });


  function fetchAllVideos() {
    console.log('Fetching all videos...');
    return axiosInstance
      .get(r('videos/'))
      .then((response: { data: { videos: { id: string; original_file_name: string; status?: string; anonymized?: boolean; assignedUser?: string; }[]; labels: { id: string; name: string; }[]; }; }) => {
        console.log('API Response:', response.data);
        
        videoList.value = {
          videos: response.data.videos.map(video => ({
            id: parseInt(video.id),
            originalFileName: video.original_file_name, // Korrigiere Feldname
            status: video.status || 'available',
            assignedUser: video.assignedUser || null,
            anonymized: video.anonymized || false,
            // Add video_url for compatibility
            video_url: `${axiosInstance.defaults.baseURL}video/${video.id}/`
          })),
          labels: response.data.labels.map(label => ({
            id: parseInt(label.id),
            name: label.name,
          })),
        };
        console.log("Processed videos:", videoList.value);
        return videoList.value;
      })
      .catch((error: any) => {
        console.error('Error loading videos:', error);
        // Setze leere Werte bei Fehler
        videoList.value = { videos: [], labels: [] };
        throw error;
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
  
  async function fetchVideoUrl(videoId?: number) {
    try {
      // Use the video ID from parameter or current video
      const id = videoId || currentVideo.value?.id;
      if (!id) {
        console.warn("No video ID available for fetching video URL");
        errorMessage.value = "No video selected.";
        return;
      }

      // Use the correct API endpoint that we know works
      const response = await axiosInstance.get(
        r(`video/${id}/`),
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (response.data.video_url) {
        videoUrl.value = response.data.video_url;
        console.log("Fetched video URL:", videoUrl.value);
      } else {
        console.warn("No video URL returned from API response:", response.data);
        errorMessage.value = "Video URL not available.";
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error loading video URL:", axiosError.response?.data || axiosError.message);
      errorMessage.value = "Error loading video URL. Please check the API endpoint or try again later.";
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
  async function fetchVideoMeta(id: number): Promise<void> {
    try {
      const resp = await axiosInstance.get(
        r(`video/${id}/`),
        { headers: { 'Accept': 'application/json' } }
      );
      videoMeta.value = {
        id: resp.data.id,
        originalFileName: resp.data.original_file_name, // Korrigiere Feldname
        file: resp.data.file,
        videoUrl: resp.data.video_url, // Korrigiere Feldname
        fullVideoPath: resp.data.full_video_path, // Korrigiere Feldname
        duration: resp.data.duration,
        // Remove fields that don't exist in the current API
        sensitiveMetaId: 0, // Default value since not in API
        patientFirstName: null,
        patientLastName: null,
        patientDob: null,
        examinationDate: null,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      console.error('Error fetching video meta:', axiosErr.response?.data || axiosErr.message);
      errorMessage.value = 'Could not load video metadata.';
    }
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
  
  function getSegmentStyle(segment: Segment, duration: number, verticalOffset?: number): Record<string, string> {
    if (segment.startTime < 0) {
      console.warn('Startpunkt des Segments ist ungültig:', segment);
      return { display: 'none' };
    }
    if (segment.endTime > duration) {
      console.warn('Endzeitpunkt des Segments ist ungültig:', segment);
      return { display: 'none' };
    }
    if (segment.endTime < segment.startTime) {
      console.warn('Endzeitpunkt des Segments ist vor dem Startzeitpunkt:', segment);
      return { display: 'none' };
    }
    
    const leftPercentage = (segment.startTime / duration) * 100;
    const widthPercentage = ((segment.endTime - segment.startTime) / duration) * 100;
    
    return {
      position: 'absolute',
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`,
      top: verticalOffset ? `${12 + verticalOffset}px` : '12px',
      backgroundColor: getColorForLabel(segment.label),
    };
  }

  // Enhanced segment style with vertical positioning
  function getEnhancedSegmentStyle(segment: Segment, allSegments?: Segment[]): Record<string, string> {
    const segments = allSegments || Object.values(segmentsByLabel.value).flat().sort((a, b) => a.startTime - b.startTime);
    const currentIndex = segments.findIndex(s => s.id === segment.id);
    const segmentsBefore = segments.slice(0, currentIndex);
    
    // Find segments that overlap with current segment
    const overlappingSegments = segmentsBefore.filter(s => 
      (s.startTime < segment.endTime && s.endTime > segment.startTime)
    );
    
    // Calculate row based on overlaps (max 3 rows)
    const row = overlappingSegments.length % 3;
    const verticalOffset = row * 28; // 28px per row (24px height + 4px gap)
    
    return getSegmentStyle(segment, duration.value, verticalOffset);
  }

  function updateSegment(id: string, partial: Partial<Segment>) {
    const labelKeys = Object.keys(segmentsByLabel.value);
    for (const label of labelKeys) {
      const segmentIndex = segmentsByLabel.value[label].findIndex((s) => s.id === id);
      if (segmentIndex !== -1) {
        segmentsByLabel.value[label][segmentIndex] = {
          ...segmentsByLabel.value[label][segmentIndex],
          ...partial,
        };
        break;
      }
    }
  }

  async function updateSensitiveMeta(payload: SensitiveMetaUpdatePayload): Promise<void> {
    try {
      const body = {
        sensitiveMetaId: payload.sensitiveMetaId,
        patientFirstName: payload.patientFirstName,
        patientLastName:  payload.patientLastName,
        patientDob:         payload.patientDob,
        examinationDate:    payload.examinationDate,
      };
      await axiosInstance.put(
        r(`sensitive-meta/${payload.sensitiveMetaId}/`),
        body,
        { headers: { 'Content-Type': 'application/json' } }
      );
      // Reflect changes locally
      if (videoMeta.value && videoMeta.value.sensitiveMetaId === payload.sensitiveMetaId) {
        videoMeta.value = {
          ...videoMeta.value,
          patientFirstName: payload.patientFirstName,
          patientLastName:  payload.patientLastName,
          patientDob:       payload.patientDob,
          examinationDate:  payload.examinationDate,
        };
      }
    } catch (err) {
      const axiosErr = err as AxiosError;
      console.error('Error updating sensitive meta:', axiosErr.response?.data || axiosErr.message);
      errorMessage.value = 'Could not update patient information.';
    }
  }
  function clearVideoMeta(): void {
    videoMeta.value = null;
    errorMessage.value = '';
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
      .then((response: { data: { videoUrl: any; }; }) => {
        const url = response.data.videoUrl;
        videoUrl.value = url;
        load(url); // Pass the URL as the server id
      })
      .catch((err: any) => {   
        error("Upload failed");
      });
  };
  
  function urlFor(id: number) {
    return `http://127.0.0.1:8000/api/videostream/${id}/stream/`;  
  }
  
  // Return state and actions for consumption in components
  return {
    currentVideo,
    errorMessage,
    videoUrl,
    segmentsByLabel,
    allSegments,
    videoList,
    videoMeta,
    hasVideo,
    duration,
    fetchVideoMeta,
    updateSensitiveMeta,    
    clearVideoMeta,
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
    getEnhancedSegmentStyle,
    getColorForLabel,
    getTranslationForLabel,
    jumpToSegment,
    updateVideoStatus,
    assignUserToVideo,
    updateSegment,
    urlFor,
  };
});