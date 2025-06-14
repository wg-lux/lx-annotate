import { defineStore } from 'pinia';
import { ref, computed, reactive, toRefs } from 'vue';
export var AnnotationType;
(function (AnnotationType) {
    AnnotationType["TEXT"] = "text";
    AnnotationType["REGION"] = "region";
    AnnotationType["POINT"] = "point";
    AnnotationType["SEGMENT"] = "segment";
    AnnotationType["CLASSIFICATION"] = "classification";
    AnnotationType["DETECTION"] = "detection";
})(AnnotationType || (AnnotationType = {}));
export const useAnnotationStore = defineStore('annotation', () => {
    // State
    const state = reactive({
        annotations: [],
        currentAnnotation: null,
        selectedAnnotations: [],
        filter: {},
        isLoading: false,
        error: null,
        currentVideoId: null,
        playbackTime: 0,
        isEditing: false,
        isDirty: false
    });
    // Computed properties
    const filteredAnnotations = computed(() => {
        let filtered = state.annotations;
        if (state.filter.videoId) {
            filtered = filtered.filter(a => a.videoId === state.filter.videoId);
        }
        if (state.filter.type) {
            filtered = filtered.filter(a => a.type === state.filter.type);
        }
        if (state.filter.userId) {
            filtered = filtered.filter(a => a.userId === state.filter.userId);
        }
        if (state.filter.tags && state.filter.tags.length > 0) {
            filtered = filtered.filter(a => state.filter.tags.some(tag => a.tags.includes(tag)));
        }
        if (state.filter.timeRange) {
            const { start, end } = state.filter.timeRange;
            filtered = filtered.filter(a => a.startTime >= start && a.endTime <= end);
        }
        if (state.filter.isPublic !== undefined) {
            filtered = filtered.filter(a => a.isPublic === state.filter.isPublic);
        }
        return filtered.sort((a, b) => a.startTime - b.startTime);
    });
    const currentVideoAnnotations = computed(() => {
        if (!state.currentVideoId)
            return [];
        return state.annotations.filter(a => a.videoId === state.currentVideoId);
    });
    const annotationsAtCurrentTime = computed(() => {
        if (!state.currentVideoId)
            return [];
        return currentVideoAnnotations.value.filter(a => state.playbackTime >= a.startTime && state.playbackTime <= a.endTime);
    });
    const totalAnnotations = computed(() => state.annotations.length);
    const selectedAnnotationObjects = computed(() => state.annotations.filter(a => state.selectedAnnotations.includes(a.id)));
    // Actions
    async function loadAnnotations(videoId) {
        state.isLoading = true;
        state.error = null;
        try {
            const url = videoId
                ? `/api/annotations/?video_id=${videoId}`
                : '/api/annotations/';
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            state.annotations = data.map((item) => ({
                ...item,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt)
            }));
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : 'Failed to load annotations';
            console.error('Error loading annotations:', error);
        }
        finally {
            state.isLoading = false;
        }
    }
    async function createAnnotation(annotationData) {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await fetch('/api/annotations/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(annotationData)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const newAnnotation = await response.json();
            newAnnotation.createdAt = new Date(newAnnotation.createdAt);
            newAnnotation.updatedAt = new Date(newAnnotation.updatedAt);
            state.annotations.push(newAnnotation);
            state.isDirty = false;
            return newAnnotation;
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : 'Failed to create annotation';
            console.error('Error creating annotation:', error);
            throw error;
        }
        finally {
            state.isLoading = false;
        }
    }
    async function updateAnnotation(id, updates) {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await fetch(`/api/annotations/${id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const updatedAnnotation = await response.json();
            updatedAnnotation.updatedAt = new Date(updatedAnnotation.updatedAt);
            const index = state.annotations.findIndex(a => a.id === id);
            if (index !== -1) {
                state.annotations[index] = { ...state.annotations[index], ...updatedAnnotation };
            }
            if (state.currentAnnotation?.id === id) {
                state.currentAnnotation = { ...state.currentAnnotation, ...updatedAnnotation };
            }
            state.isDirty = false;
            return updatedAnnotation;
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : 'Failed to update annotation';
            console.error('Error updating annotation:', error);
            throw error;
        }
        finally {
            state.isLoading = false;
        }
    }
    async function deleteAnnotation(id) {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await fetch(`/api/annotations/${id}/`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            state.annotations = state.annotations.filter(a => a.id !== id);
            state.selectedAnnotations = state.selectedAnnotations.filter(selectedId => selectedId !== id);
            if (state.currentAnnotation?.id === id) {
                state.currentAnnotation = null;
            }
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : 'Failed to delete annotation';
            console.error('Error deleting annotation:', error);
            throw error;
        }
        finally {
            state.isLoading = false;
        }
    }
    async function bulkDeleteAnnotations(ids) {
        state.isLoading = true;
        state.error = null;
        try {
            const response = await fetch('/api/annotations/bulk-delete/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            state.annotations = state.annotations.filter(a => !ids.includes(a.id));
            state.selectedAnnotations = state.selectedAnnotations.filter(id => !ids.includes(id));
            if (state.currentAnnotation && ids.includes(state.currentAnnotation.id)) {
                state.currentAnnotation = null;
            }
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : 'Failed to delete annotations';
            console.error('Error bulk deleting annotations:', error);
            throw error;
        }
        finally {
            state.isLoading = false;
        }
    }
    function setCurrentAnnotation(annotation) {
        state.currentAnnotation = annotation;
        state.isEditing = false;
        state.isDirty = false;
    }
    function selectAnnotation(id) {
        if (!state.selectedAnnotations.includes(id)) {
            state.selectedAnnotations.push(id);
        }
    }
    function deselectAnnotation(id) {
        state.selectedAnnotations = state.selectedAnnotations.filter(selectedId => selectedId !== id);
    }
    function toggleAnnotationSelection(id) {
        if (state.selectedAnnotations.includes(id)) {
            deselectAnnotation(id);
        }
        else {
            selectAnnotation(id);
        }
    }
    function selectAllAnnotations() {
        state.selectedAnnotations = filteredAnnotations.value.map(a => a.id);
    }
    function clearSelection() {
        state.selectedAnnotations = [];
    }
    function setFilter(filter) {
        state.filter = { ...state.filter, ...filter };
    }
    function clearFilter() {
        state.filter = {};
    }
    function setCurrentVideoId(videoId) {
        state.currentVideoId = videoId;
        if (videoId) {
            setFilter({ videoId });
        }
    }
    function setPlaybackTime(time) {
        state.playbackTime = time;
    }
    function startEditing() {
        state.isEditing = true;
    }
    function stopEditing() {
        state.isEditing = false;
        state.isDirty = false;
    }
    function markDirty() {
        state.isDirty = true;
    }
    function seekToAnnotation(annotation) {
        setPlaybackTime(annotation.startTime);
        setCurrentAnnotation(annotation);
    }
    async function exportAnnotations(format = 'json') {
        try {
            const queryParams = new URLSearchParams();
            if (state.filter.videoId)
                queryParams.append('video_id', state.filter.videoId);
            if (state.filter.type)
                queryParams.append('type', state.filter.type);
            queryParams.append('format', format);
            const response = await fetch(`/api/annotations/export/?${queryParams}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `annotations.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }
        catch (error) {
            state.error = error instanceof Error ? error.message : 'Failed to export annotations';
            console.error('Error exporting annotations:', error);
        }
    }
    function clearError() {
        state.error = null;
    }
    function reset() {
        state.annotations = [];
        state.currentAnnotation = null;
        state.selectedAnnotations = [];
        state.filter = {};
        state.isLoading = false;
        state.error = null;
        state.currentVideoId = null;
        state.playbackTime = 0;
        state.isEditing = false;
        state.isDirty = false;
    }
    return {
        // State
        ...toRefs(state),
        // Computed
        filteredAnnotations,
        currentVideoAnnotations,
        annotationsAtCurrentTime,
        totalAnnotations,
        selectedAnnotationObjects,
        // Actions
        loadAnnotations,
        createAnnotation,
        updateAnnotation,
        deleteAnnotation,
        bulkDeleteAnnotations,
        setCurrentAnnotation,
        selectAnnotation,
        deselectAnnotation,
        toggleAnnotationSelection,
        selectAllAnnotations,
        clearSelection,
        setFilter,
        clearFilter,
        setCurrentVideoId,
        setPlaybackTime,
        startEditing,
        stopEditing,
        markDirty,
        seekToAnnotation,
        exportAnnotations,
        clearError,
        reset
    };
});
// Helper functions
export function createDefaultAnnotation(videoId, type, startTime, endTime, userId) {
    return {
        videoId,
        startTime,
        endTime,
        type,
        text: '',
        tags: [],
        userId,
        isPublic: false,
        metadata: {}
    };
}
export function validateAnnotation(annotation) {
    const errors = [];
    if (!annotation.videoId)
        errors.push('Video ID is required');
    if (annotation.startTime === undefined || annotation.startTime < 0) {
        errors.push('Start time must be a non-negative number');
    }
    if (annotation.endTime === undefined || annotation.endTime < 0) {
        errors.push('End time must be a non-negative number');
    }
    if (annotation.startTime !== undefined && annotation.endTime !== undefined &&
        annotation.startTime >= annotation.endTime) {
        errors.push('End time must be greater than start time');
    }
    if (!annotation.type || !Object.values(AnnotationType).includes(annotation.type)) {
        errors.push('Valid annotation type is required');
    }
    if (!annotation.userId)
        errors.push('User ID is required');
    return errors;
}
