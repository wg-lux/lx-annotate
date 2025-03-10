import axiosInstance from "./axiosInstance";
import { ref } from "vue";
import { AxiosError } from "axios";
import type { Segment } from '@/components/EndoAI/segments';

// Declare reactive state outside the object
const errorMessage = ref<string>('');
const videoUrl = ref<string>('');
const segments = ref<Segment[]>([]);

// Fetch video and segment data from Django API
async function fetchVideoUrl() {
  try {
    const response = await axiosInstance.get('video/1/', {
      headers: { 'Accept': 'application/json' }
    });
    if (response.data.video_url) {
      videoUrl.value = response.data.video_url;
      console.log("Fetched video URL:", videoUrl.value);
    } else {
      console.warn("No video URL returned; waiting for upload.");
      errorMessage.value = "Invalid video response received.";
    }
    if (response.data.classification_data) {
      segments.value = response.data.classification_data.map(
        (classification: { label: string; start_time: number; end_time: number; confidence: number }, index: number) => ({
          id: `segment${index + 1}`,
          label: classification.label,
          label_display: classification.label,
          startTime: classification.start_time,
          endTime: classification.end_time,
          avgConfidence: classification.confidence,
        })
      );
    }
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error("Error loading video:", axiosError.response?.data || axiosError.message);
    errorMessage.value = "Error loading video. Please check the API endpoint or try again later.";
  }
}

async function saveAnnotations() {
  try {
    const response = await axiosInstance.post('annotations/', {
      segments: segments.value,
    });
    console.log('Annotations saved:', response.data);
  } catch (error) {
    console.error('Error saving annotations:', error);
  }
}

const uploadRevert = (
  uniqueFileId: string,
  load: () => void,
  error: (message: string) => void
) => {
  axiosInstance
    .delete(`upload-video/${uniqueFileId}/`)
    .then(() => {
      videoUrl.value = '';
      load();
    })
    .catch((err: any) => {
      console.error("Revert error:", err);
      error("Revert failed");
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
    .post('upload-video/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then((response: { data: { video_url: any; }; }) => {
      const url = response.data.video_url;
      videoUrl.value = url;
      load(url); // Pass the URL as the server id
    })
    .catch((err: any) => {
      console.error("Upload error:", err);
      error("Upload failed");
    });
};

// Export the service as an object
export const videoService = {
  errorMessage,
  videoUrl,
  segments,
  fetchVideoUrl,
  saveAnnotations,
  uploadRevert,
  uploadProcess,
};
