import { defineStore } from 'pinia';
import { ref } from 'vue';
import axiosInstance from '../api/axiosInstance';
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
const defaultSegments = Object.keys(translationMap).map((key, index) => ({
    id: `default-${index}`,
    label: key,
    label_display: translationMap[key],
    startTime: 0,
    endTime: 0,
    avgConfidence: 1,
}));
export const useVideoStore = defineStore('video', () => {
    // State
    const currentVideo = ref(null);
    const errorMessage = ref('');
    const videoUrl = ref('');
    const segments = ref(defaultSegments);
    // Actions
    function clearVideo() {
        currentVideo.value = null;
    }
    function setVideo(video) {
        currentVideo.value = video;
    }
    async function fetchVideoUrl() {
        try {
            const response = await axiosInstance.get('api/video/1/', {
                headers: { 'Accept': 'video/mp4' }
            });
            if (response.data.video_url) {
                videoUrl.value = response.data.video_url;
                console.log("Fetched video URL:", videoUrl.value);
            }
            else {
                console.warn("No video URL returned; waiting for upload.");
                errorMessage.value = "Invalid video response received.";
            }
            if (response.data.classification_data) {
                segments.value = response.data.classification_data.map((classification, index) => ({
                    id: `segment${index + 1}`,
                    label: classification.label,
                    label_display: classification.label,
                    startTime: classification.start_time,
                    endTime: classification.end_time,
                    avgConfidence: classification.confidence,
                }));
            }
        }
        catch (error) {
            const axiosError = error;
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
        segments,
        uploadRevert,
        uploadProcess,
        clearVideo,
        setVideo,
        fetchVideoUrl,
        saveAnnotations,
        getSegmentStyle,
        getColorForLabel,
        getTranslationForLabel,
        jumpToSegment,
    };
});
