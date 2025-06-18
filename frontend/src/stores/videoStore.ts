import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
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
  id: string | number; // Allow both string and number IDs
  label: string;
  label_display: string;
  startTime: number;
  endTime: number;
  avgConfidence: number; // value between 0 and 1
  // New fields for API integration
  video_id?: number;
  label_id?: number;
  start_frame_number?: number;
  end_frame_number?: number;
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
  hasROI?: boolean; // Gibt an, ob eine ROI definiert ist
  outsideFrameCount?: number; // Anzahl der Outside-Frames
  totalFrameCount?: number; // Gesamtanzahl der Frames
  anonymizationProgress?: number; // Fortschritt der Anonymisierung (0-100)
  lastAnonymizationDate?: string; // Datum der letzten Anonymisierung
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
const defaultSegments: Record<string, Segment[]> = {}; // Changed: Remove dummy segments

export const useVideoStore = defineStore('video', () => {
  // State
  const currentVideo = ref<VideoAnnotation | null>(null);
  const errorMessage = ref('');
  const videoUrl = ref('');
  // Store segments keyed by label - Fix: Use reactive() instead of ref({})
  const segmentsByLabel = reactive<Record<string, Segment[]>>({ ...defaultSegments });  const videoList = ref<VideoList>({ videos: [], labels: [] });
  const videoMeta = ref<VideoFileMeta | null>(null);
  
  // 🔸 Selection state for active segment
  const activeSegmentId = ref<number | string | null>(null);

  // Computed properties
  const hasVideo = computed(() => !!currentVideo.value);
  const duration = computed(() => {
    if (videoMeta.value && videoMeta.value.duration) {
      return videoMeta.value.duration;
    }
    return 0; // Default value if duration is not available
  });

  // A computed property to combine all segments (if needed for timeline display)
  const allSegments = computed(() =>
    Object.values(segmentsByLabel).flat()
  );

  // 🔸 Segment options for dropdown
  const segmentOptions = computed(() =>
    allSegments.value.map((segment) => ({
      id: segment.id,
      label: segment.label_display,
      startTime: segment.startTime,
      endTime: segment.endTime,
      display: `${segment.label_display}: ${formatTime(segment.startTime)} – ${formatTime(segment.endTime)}`,
    }))
  );

  // 🔸 Active segment computed property
  const activeSegment = computed(() =>
    allSegments.value.find(s => s.id === activeSegmentId.value) || null
  );

  // Helper function for time formatting (moved from Timeline component)
  function formatTime(seconds: number): string {
    seconds = Number(seconds); // Ensure seconds is a number
    if (Number.isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Translation function for label names
  function getTranslationForLabel(label: string): string {
    return translationMap[label] || label;
  }

  // Color mapping for labels
  function getColorForLabel(label: string): string {
    const colorMap: Record<string, string> = {
      outside: '#e74c3c',
      polyp: '#f39c12',
      needle: '#3498db',
      blood: '#e74c3c',
      snare: '#9b59b6',
      grasper: '#2ecc71',
      water_jet: '#1abc9c',
      appendix: '#f1c40f',
      ileum: '#e67e22',
      diverticule: '#34495e',
      ileocaecalvalve: '#95a5a6',
      nbi: '#8e44ad',
      low_quality: '#7f8c8d',
      wound: '#c0392b',
    };
    return colorMap[label] || '#95a5a6';
  }

  // Set active segment
  function setActiveSegment(segmentId: number | string | null): void {
    activeSegmentId.value = segmentId;
  }

  // Jump to segment in video
  function jumpToSegment(segment: Segment, videoElement: HTMLVideoElement | null): void {
    if (videoElement && segment.startTime) {
      videoElement.currentTime = segment.startTime;
      videoElement.play();
    }
  }

  // Get segment style for timeline
  function getSegmentStyle(segment: Segment, duration: number): Record<string, string> {
    const startPercent = (segment.startTime / duration) * 100;
    const widthPercent = ((segment.endTime - segment.startTime) / duration) * 100;
    
    return {
      left: `${startPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: getColorForLabel(segment.label),
    };
  }

  // Enhanced segment style
  function getEnhancedSegmentStyle(segment: Segment, duration: number): Record<string, string> {
    const baseStyle = getSegmentStyle(segment, duration);
    return {
      ...baseStyle,
      opacity: segment.avgConfidence.toString(),
      border: segment.id === activeSegmentId.value ? '2px solid #fff' : 'none',
    };
  }

  // Update segment in store
  function updateSegment(segmentId: number | string, updates: Partial<Segment>): void {
    for (const label in segmentsByLabel) {
      const segmentIndex = segmentsByLabel[label].findIndex(s => s.id === segmentId);
      if (segmentIndex !== -1) {
        Object.assign(segmentsByLabel[label][segmentIndex], updates);
        break;
      }
    }
  }

  // Video meta functions
  async function fetchVideoMeta(lastId?: number): Promise<VideoFileMeta | null> {
    try {
      const url = lastId ? r(`video/sensitivemeta/?last_id=${lastId}`) : r('video/sensitivemeta/');
      const response = await axiosInstance.get(url);
      videoMeta.value = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching video meta:', error);
      return null;
    }
  }

  async function updateSensitiveMeta(payload: SensitiveMetaUpdatePayload): Promise<boolean> {
    try {
      await axiosInstance.patch(r('video/update_sensitivemeta/'), payload);
      return true;
    } catch (error) {
      console.error('Error updating sensitive meta:', error);
      return false;
    }
  }

  function clearVideoMeta(): void {
    videoMeta.value = null;
  }

  // Upload functions
  function uploadRevert(uniqueFileId: string, load: () => void, error: (message: string) => void): void {
    // Implementation for file upload revert
    load();
  }

  function uploadProcess(fieldName: string, file: File, metadata: any, load: (serverFileId: string) => void, error: (message: string) => void): void {
    // Implementation for file upload process
    load(file.name);
  }

  // Fetch all segments
  async function fetchAllSegments(id: string): Promise<void> {
    await fetchVideoSegments(id);
  }

  // Save annotations
  async function saveAnnotations(): Promise<void> {
    // Implementation for saving annotations
    console.log('Saving annotations...');
  }

  // Update video status
  async function updateVideoStatus(status: 'in_progress' | 'available' | 'completed'): Promise<void> {
    if (currentVideo.value) {
      currentVideo.value.status = status;
    }
  }

  // Assign user to video
  async function assignUserToVideo(user: string): Promise<void> {
    if (currentVideo.value) {
      currentVideo.value.assignedUser = user;
    }
  }

  // URL helper
  function urlFor(path: string): string {
    return r(path);
  }

  // Get segment options
  function getSegmentOptions(): any[] {
    return segmentOptions.value;
  }

  // Clear segments
  function clearSegments(): void {
    Object.keys(segmentsByLabel).forEach(key => {
      delete segmentsByLabel[key];
    });
  }

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
      
      console.log(`[video ${id}] API response for label ${label}:`, response.data);
      
      // Map the API response into our Segment structure.
      const segmentsForLabel: Segment[] = response.data.time_segments.map((segment, index) => {
        // Use the correct field names from the API response
        const startTime = Number(segment.start_time ?? segment.segment_start ?? 0);
        const endTime = Number(segment.end_time ?? segment.segment_end ?? 0);
        
        return {
          // Use a temporary ID for segments from VideoLabelResponse (these don't have real IDs yet)
          id: `temp-${label}-${Date.now()}-${index}`,
          label: response.data.label,
          label_display: getTranslationForLabel(response.data.label), // ✅ Set proper display name
          startTime: startTime, // ✅ Use correct field name
          endTime: endTime,     // ✅ Use correct field name
          avgConfidence: 1,
          // Store frame information for potential future use
          start_frame_number: segment.segment_start,
          end_frame_number: segment.segment_end,
        };
      });
      
      // Runtime check to catch missing fields early
      if (segmentsForLabel.length > 0 && Number.isNaN(segmentsForLabel[0]?.startTime)) {
        console.warn(`[video ${id}] ${label}: start/endTime missing or NaN`, response.data);
      }
      
      console.log(`[video ${id}] Mapped ${segmentsForLabel.length} segments for label ${label}:`, segmentsForLabel);
      
      segmentsByLabel[label] = segmentsForLabel;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error loading segments for label " + label + ":", axiosError.response?.data || axiosError.message);
      errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`;
    }
  }

  // NEW: Fetch actual segment entities from backend API
  async function fetchVideoSegments(videoId: string): Promise<void> {
    try {
      const response = await axiosInstance.get(
        r(`video-segments/?video_id=${videoId}`),
        { headers: { 'Accept': 'application/json' } }
      );
      
      // Clear existing segments
      Object.keys(segmentsByLabel).forEach(key => {
        delete segmentsByLabel[key];
      });
      
      console.log('Raw API response:', response.data);
      
      // Group segments by label
      response.data.forEach((segment: any) => {
        const labelName = segment.label_name || `label_${segment.label_id}`;
        if (!segmentsByLabel[labelName]) {
          segmentsByLabel[labelName] = [];
        }
        
        // Use the calculated time fields from the API
        segmentsByLabel[labelName].push({
          id: segment.id, // Use real backend ID
          label: labelName,
          label_display: getTranslationForLabel(labelName),
          startTime: segment.start_time || 0, // Use calculated time from backend
          endTime: segment.end_time || 0,     // Use calculated time from backend
          avgConfidence: 1,
          video_id: parseInt(videoId),
          label_id: segment.label_id,
          start_frame_number: segment.start_frame_number,
          end_frame_number: segment.end_frame_number,
        });
      });
      
      console.log('Processed segments by label:', segmentsByLabel);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error loading video segments:", axiosError.response?.data || axiosError.message);
      errorMessage.value = "Error loading video segments. Please try again later.";
    }
  }

  // NEW: Create a new segment via API
  async function createSegment(videoId: string, labelName: string, startTime: number, endTime: number): Promise<Segment | null> {
    try {
      // Get label ID first
      const labelResponse = await axiosInstance.get(r(`labels/?name=${labelName}`));
      const labelId = labelResponse.data.results?.[0]?.id;
      
      if (!labelId) {
        console.error(`Label ${labelName} not found`);
        errorMessage.value = `Label ${labelName} not found`;
        return null;
      }

      // Calculate frame numbers (assuming 30 FPS as default)
      const fps = duration.value > 0 ? (videoMeta.value?.duration || 30) : 30;
      const startFrame = Math.floor(startTime * fps);
      const endFrame = Math.floor(endTime * fps);

      const segmentData = {
        video_file: parseInt(videoId),
        label: labelId,
        start_frame_number: startFrame,
        end_frame_number: endFrame,
      };

      const response = await axiosInstance.post(r('video-segments/'), segmentData);
      
      const newSegment: Segment = {
        id: response.data.id, // Real backend ID
        label: labelName,
        label_display: getTranslationForLabel(labelName),
        startTime: response.data.start_time,
        endTime: response.data.end_time,
        avgConfidence: 1,
        video_id: parseInt(videoId),
        label_id: labelId,
        start_frame_number: response.data.start_frame_number,
        end_frame_number: response.data.end_frame_number,
      };

      // Add to store
      if (!segmentsByLabel[labelName]) {
        segmentsByLabel[labelName] = [];
      }
      segmentsByLabel[labelName].push(newSegment);
      
      console.log('Created segment:', newSegment);
      return newSegment;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error creating segment:", axiosError.response?.data || axiosError.message);
      errorMessage.value = "Error creating segment. Please try again.";
      return null;
    }
  }

  // NEW: Update an existing segment
  async function updateSegmentAPI(segmentId: number, updates: Partial<Segment>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.startTime !== undefined || updates.endTime !== undefined) {
        const fps = 30; // Default FPS, should be retrieved from video metadata
        if (updates.startTime !== undefined) {
          updateData.start_frame_number = Math.floor(updates.startTime * fps);
        }
        if (updates.endTime !== undefined) {
          updateData.end_frame_number = Math.floor(updates.endTime * fps);
        }
      }

      const response = await axiosInstance.patch(r(`video-segments/${segmentId}/`), updateData);
      
      // Update local store
      updateSegment(segmentId, {
        startTime: response.data.start_time,
        endTime: response.data.end_time,
        start_frame_number: response.data.start_frame_number,
        end_frame_number: response.data.end_frame_number,
      });
      
      return true;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error updating segment:", axiosError.response?.data || axiosError.message);
      errorMessage.value = "Error updating segment. Please try again.";
      return false;
    }
  }

  // NEW: Delete a segment
  async function deleteSegment(segmentId: number): Promise<boolean> {
    try {
      await axiosInstance.delete(r(`video-segments/${segmentId}/`));
      
      // Remove from local store
      for (const label in segmentsByLabel) {
        const index = segmentsByLabel[label].findIndex(s => s.id === segmentId);
        if (index !== -1) {
          segmentsByLabel[label].splice(index, 1);
          break;
        }
      }
      
      return true;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      console.error("Error deleting segment:", axiosError.response?.data || axiosError.message);
      errorMessage.value = "Error deleting segment. Please try again.";
      return false;
    }
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
    // 🔸 New selection state exports
    activeSegmentId,
    activeSegment,
    segmentOptions,
    setActiveSegment,
    formatTime,
    getColorForLabel,
    // Existing actions
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
    getTranslationForLabel,
    jumpToSegment,
    updateVideoStatus,
    assignUserToVideo,
    updateSegment,
    urlFor,
    getSegmentOptions,
    clearSegments,
    // NEW: Segment management with real backend integration
    fetchVideoSegments,
    createSegment,
    updateSegmentAPI,
    deleteSegment,
  };
});