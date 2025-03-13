import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axiosInstance from '../api/axiosInstance';
import videoAxiosInstance from '../api/videoAxiosInstance';
const translationMap = {
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
const defaultSegments = Object.keys(translationMap).reduce((acc, key) => {
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
}, {});
export const useVideoStore = defineStore('video', () => {
    // State
    const currentVideo = ref(null);
    const errorMessage = ref('');
    const videoUrl = ref('');
    // Store segments keyed by label
    const segmentsByLabel = ref({ ...defaultSegments });
    // A computed property to combine all segments (if needed for timeline display)
    const allSegments = computed(() => Object.values(segmentsByLabel.value).flat());
    // Actions
    function clearVideo() {
        currentVideo.value = null;
    }
    function setVideo(video) {
        currentVideo.value = video;
    }
    async function fetchVideoUrl() {
        try {
            const response = await videoAxiosInstance.get(currentVideo.value?.videoID || '1', { headers: { 'Accept': 'application/json' } });
            if (response.data.video_url) {
                videoUrl.value = response.data.video_url;
                console.log("Fetched video URL:", videoUrl.value);
            }
            else {
                console.warn("No video URL returned; waiting for upload.");
                errorMessage.value = "Invalid video response received.";
            }
        }
        catch (error) {
            const axiosError = error;
            console.error("Error loading video:", axiosError.response?.data || axiosError.message);
            errorMessage.value = "Error loading video. Please check the API endpoint or try again later.";
        }
    }
    // Fetch segments for a specific label and store them under that label key.
    async function fetchSegmentsByLabel(videoID, label = 'outside') {
        try {
            const response = await axiosInstance.get(`api/video/${videoID}/label/${label}/`, { headers: { 'Accept': 'application/json' } });
            // Map the API response into our Segment structure.
            const segmentsForLabel = response.data.time_segments.map((segment, index) => ({
                id: `${label}-segment${index + 1}`,
                label: response.data.label, // or simply use the passed label
                label_display: getTranslationForLabel(response.data.label),
                startTime: segment.start_time,
                endTime: segment.end_time,
                avgConfidence: 1, // Default value since API doesn't provide it.
            }));
            segmentsByLabel.value[label] = segmentsForLabel;
        }
        catch (error) {
            const axiosError = error;
            console.error("Error loading segments for label " + label + ":", axiosError.response?.data || axiosError.message);
            errorMessage.value = `Error loading segments for label ${label}. Please check the API endpoint or try again later.`;
        }
    }
    // Optionally, fetch segments for all labels concurrently.
    async function fetchAllSegments(videoID) {
        const labels = Object.keys(translationMap);
        await Promise.all(labels.map(label => fetchSegmentsByLabel(videoID, label)));
    }
    async function saveAnnotations() {
        try {
            // Combine all segments from all labels if needed.
            const combinedSegments = Object.values(segmentsByLabel.value).flat();
            const response = await axiosInstance.post('annotations/', { segments: combinedSegments });
            console.log('Annotations saved:', response.data);
        }
        catch (error) {
            console.error('Error saving annotations:', error);
        }
    }
    function getSegmentStyle(segment, duration) {
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
    function getColorForLabel(label) {
        const colorMap = {
            appendix: '#ff9800',
            blood: '#f44336',
            diverticule: '#9c27b0',
            grasper: '#4caf50',
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
    function getTranslationForLabel(label) {
        const translationMap = {
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
        return translationMap[label] || '#757575';
    }
    function jumpToSegment(segment, videoElement) {
        if (videoElement) {
            videoElement.currentTime = segment.startTime;
        }
    }
    const uploadRevert = (uniqueFileId, load, error) => {
        axiosInstance
            .delete(`upload-video/${uniqueFileId}/`)
            .then(() => {
            videoUrl.value = '';
            load();
        });
    };
    const uploadProcess = (fieldName, file, metadata, load, error) => {
        const formData = new FormData();
        formData.append(fieldName, file);
        axiosInstance
            .post('upload-video/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
            .then((response) => {
            const url = response.data.video_url;
            videoUrl.value = url;
            load(url); // Pass the URL as the server id
        })
            .catch((err) => {
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
    };
});
