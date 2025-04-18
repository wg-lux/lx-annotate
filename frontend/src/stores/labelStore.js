import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
// Farbzuordnungen und Übersetzungen für Labels
const colorMap = {
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
// Hilfsfunktionen für die Segmentdarstellung
export function getSegmentStyle(segment, duration) {
    if (!duration)
        return { display: 'none' }; // Vermeidet Division durch Null
    const leftPercentage = (segment.startTime / duration) * 100;
    const widthPercentage = ((segment.endTime - segment.startTime) / duration) * 100;
    return {
        position: 'absolute',
        left: `${leftPercentage}%`,
        width: `${widthPercentage}%`,
        backgroundColor: getColorForLabel(segment.label),
    };
}
export function getColorForLabel(label) {
    return colorMap[label] || '#757575';
}
export function getTranslationForLabel(label) {
    return translationMap[label] || label;
}
export function jumpToSegment(segment, videoElement) {
    if (videoElement) {
        videoElement.currentTime = segment.startTime;
    }
}
// Der eigentliche Store
export const useLabelStore = defineStore('label', () => {
    const segments = ref([]);
    const loading = ref(false);
    const error = ref(null);
    // Segmente nach frameId gruppieren
    const segmentsByFrame = computed(() => {
        const result = {};
        segments.value.forEach(segment => {
            if (segment.frameId) {
                if (!result[segment.frameId]) {
                    result[segment.frameId] = [];
                }
                result[segment.frameId].push(segment);
            }
        });
        return result;
    });
    // Segmente für einen bestimmten Frame abrufen
    const getSegmentsForFrame = (frameId) => {
        return segments.value.filter(segment => segment.frameId === frameId);
    };
    // Segmente vom Server laden
    async function fetchSegments(videoId) {
        loading.value = true;
        error.value = null;
        try {
            let url = '/api/segments/';
            if (videoId) {
                url = `/api/video/${videoId}/segments/`;
            }
            const response = await axios.get(url);
            segments.value = response.data.map((seg) => ({
                id: seg.id || `segment-${Math.random().toString(36).substr(2, 9)}`,
                label: seg.label,
                label_display: getTranslationForLabel(seg.label),
                startTime: seg.start_time || 0,
                endTime: seg.end_time || 0,
                avgConfidence: seg.confidence || 1,
                frameId: seg.frame_id
            }));
        }
        catch (err) {
            error.value = err.message || 'Fehler beim Laden der Segmente';
        }
        finally {
            loading.value = false;
        }
    }
    // Segment hinzufügen oder aktualisieren
    async function saveSegment(segment) {
        loading.value = true;
        error.value = null;
        try {
            const payload = {
                label: segment.label,
                start_time: segment.startTime,
                end_time: segment.endTime,
                confidence: segment.avgConfidence,
                frame_id: segment.frameId
            };
            let response;
            if (segment.id.startsWith('segment-')) {
                // Neues Segment
                response = await axios.post('/api/segments/', payload);
                const newSegment = {
                    ...segment,
                    id: response.data.id,
                    label_display: getTranslationForLabel(segment.label)
                };
                segments.value.push(newSegment);
            }
            else {
                // Bestehendes Segment aktualisieren
                response = await axios.put(`/api/segments/${segment.id}/`, payload);
                const index = segments.value.findIndex(s => s.id === segment.id);
                if (index !== -1) {
                    segments.value[index] = {
                        ...segment,
                        label_display: getTranslationForLabel(segment.label)
                    };
                }
            }
            return response.data;
        }
        catch (err) {
            error.value = err.message || 'Fehler beim Speichern des Segments';
            throw err;
        }
        finally {
            loading.value = false;
        }
    }
    // Segment löschen
    async function deleteSegment(segmentId) {
        loading.value = true;
        error.value = null;
        try {
            await axios.delete(`/api/segments/${segmentId}/`);
            segments.value = segments.value.filter(s => s.id !== segmentId);
        }
        catch (err) {
            error.value = err.message || 'Fehler beim Löschen des Segments';
            throw err;
        }
        finally {
            loading.value = false;
        }
    }
    return {
        segments,
        loading,
        error,
        segmentsByFrame,
        getSegmentsForFrame,
        fetchSegments,
        saveSegment,
        deleteSegment
    };
});
