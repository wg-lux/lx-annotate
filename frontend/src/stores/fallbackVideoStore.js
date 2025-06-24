import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// Fallback data for when backend is not available or no videos are imported
const FALLBACK_VIDEO = {
    id: 1,
    original_file_name: 'lux-gastro-video.mp4', // Corrected property name
    status: 'available',
    assignedUser: null,
    anonymized: false,
};
const FALLBACK_LABELS = [
    { id: 1, name: 'outside' },
    { id: 2, name: 'appendix' },
    { id: 3, name: 'blood' },
    { id: 4, name: 'diverticule' },
    { id: 5, name: 'grasper' },
    { id: 6, name: 'ileocaecalvalve' },
    { id: 7, name: 'ileum' },
    { id: 8, name: 'low_quality' },
    { id: 9, name: 'nbi' },
    { id: 10, name: 'needle' },
    { id: 11, name: 'polyp' },
    { id: 12, name: 'snare' },
    { id: 13, name: 'water_jet' },
    { id: 14, name: 'wound' },
];
const FALLBACK_SEGMENTS = [
    {
        id: 'outside-segment1',
        label: 'outside',
        label_name: 'outside', // Added: Required field for API compatibility
        label_display: 'Außerhalb',
        startTime: 0,
        endTime: 15,
        avgConfidence: 0.9,
    },
    {
        id: 'ileum-segment1',
        label: 'ileum',
        label_name: 'ileum', // Added: Required field for API compatibility
        label_display: 'Ileum',
        startTime: 15,
        endTime: 45,
        avgConfidence: 0.85,
    },
    {
        id: 'polyp-segment1',
        label: 'polyp',
        label_name: 'polyp', // Added: Required field for API compatibility
        label_display: 'Polyp',
        startTime: 45,
        endTime: 60,
        avgConfidence: 0.92,
    },
    {
        id: 'outside-segment2',
        label: 'outside',
        label_name: 'outside', // Added: Required field for API compatibility
        label_display: 'Außerhalb',
        startTime: 60,
        endTime: 120,
        avgConfidence: 0.88,
    },
];
export const useFallbackVideoStore = defineStore('fallbackVideo', () => {
    const isEnabled = ref(false);
    const fallbackDuration = ref(120); // 2 minutes
    // Computed properties
    const fallbackVideoList = computed(() => ({
        videos: [FALLBACK_VIDEO],
        labels: FALLBACK_LABELS,
    }));
    const fallbackSegments = computed(() => FALLBACK_SEGMENTS);
    // Methods
    function enableFallback() {
        isEnabled.value = true;
        console.log('Fallback video data enabled');
    }
    function disableFallback() {
        isEnabled.value = false;
        console.log('Fallback video data disabled');
    }
    function getFallbackVideoUrl() {
        // Return a placeholder or test video URL
        return '/media/fallback/lux-gastro-video.mp4';
    }
    function createFallbackSegment(label, startTime, endTime) {
        const labelTranslations = {
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
        return {
            id: `${label}-segment-${Date.now()}`,
            label,
            label_name: label, // Added: Required field for API compatibility
            label_display: labelTranslations[label] || label,
            startTime,
            endTime,
            avgConfidence: 0.8 + Math.random() * 0.2, // Random confidence between 0.8-1.0
        };
    }
    return {
        isEnabled,
        fallbackDuration,
        fallbackVideoList,
        fallbackSegments,
        enableFallback,
        disableFallback,
        getFallbackVideoUrl,
        createFallbackSegment,
    };
});
