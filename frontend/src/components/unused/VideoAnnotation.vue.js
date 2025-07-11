import { ref, computed, onMounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
const API_BASE = 'http://127.0.0.1:8000';
const API_ENDPOINT = `${API_BASE}/api/videos`; // JSON API
const STREAM_ENDPOINT = `${API_BASE}/videos`; // Raw video streaming
// Refs
const videoRef = ref(null);
const labels = ref([]);
const currentTime = ref(0);
const duration = ref(0);
const availableVideos = ref([]);
const currentVideo = ref(null);
const activeLabel = ref(null);
// Computed
const sortedLabels = computed(() => {
    return [...labels.value].sort((a, b) => a.startTime - b.startTime);
});
const currentVideoUrl = computed(() => {
    // Use the dedicated streaming endpoint
    if (currentVideo.value?.id) {
        return `${STREAM_ENDPOINT}/${currentVideo.value.id}`;
    }
    return '';
});
const canSave = computed(() => {
    return labels.value.length > 0 && labels.value.every(l => l.isComplete);
});
// Methods
async function fetchVideos() {
    try {
        // Use the JSON API endpoint
        const response = await axios.get(`${API_ENDPOINT}/`);
        console.log('Fetched videos:', response.data);
        if (response.data.videos) {
            availableVideos.value = response.data.videos.map((video) => ({
                id: video.id,
                url: `${STREAM_ENDPOINT}/${video.id}/`, // Streaming URL
                center_name: video.center_name || 'Unknown Center',
                processor_name: video.processor_name || 'Unknown Processor'
            }));
        }
    }
    catch (error) {
        console.error('Failed to fetch videos:', error);
    }
}
async function fetchVideoMetadata(videoId) {
    try {
        // Fetch metadata using the JSON API endpoint
        const response = await axios.get(`${API_ENDPOINT}/${videoId}/`);
        return response.data;
    }
    catch (error) {
        console.error('Failed to fetch video metadata:', error);
        return null;
    }
}
async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file)
        return;
    const formData = new FormData();
    formData.append('video', file);
    formData.append('center_name', 'your_center');
    formData.append('processor_name', 'your_processor');
    try {
        const response = await axios.post(`${API_BASE}/videos/upload/`, formData);
        console.log('Upload response:', response.data);
        if (response.data.url) {
            currentVideo.value = response.data;
            // Video source will update automatically due to binding
        }
        else {
            console.error('No URL in response:', response.data);
        }
    }
    catch (error) {
        console.error('Upload failed:', error);
    }
}
function handleTimeUpdate() {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
        duration.value = videoRef.value.duration;
    }
}
function handleTimelineClick(event) {
    const timeline = event.currentTarget;
    if (timeline && videoRef.value) {
        const rect = timeline.getBoundingClientRect();
        const clickPosition = event.clientX - rect.left;
        const percentage = clickPosition / rect.width;
        videoRef.value.currentTime = percentage * duration.value;
    }
}
function toggleLabel() {
    if (!videoRef.value)
        return;
    if (activeLabel.value) {
        // Complete existing label
        activeLabel.value.endTime = videoRef.value.currentTime;
        activeLabel.value.isComplete = true;
        activeLabel.value = null;
    }
    else {
        // Start new label
        const newLabel = {
            id: uuidv4(),
            startTime: videoRef.value.currentTime,
            endTime: null,
            isComplete: false
        };
        labels.value.push(newLabel);
        activeLabel.value = newLabel;
    }
}
function deleteLabel(id) {
    const label = labels.value.find(l => l.id === id);
    if (label === activeLabel.value) {
        activeLabel.value = null;
    }
    labels.value = labels.value.filter(l => l.id !== id);
}
function getTimelineSpanStyle(label) {
    const startPercentage = (label.startTime / duration.value) * 100;
    const endPercentage = label.endTime
        ? (label.endTime / duration.value) * 100
        : (currentTime.value / duration.value) * 100;
    return {
        left: `${startPercentage}%`,
        width: `${endPercentage - startPercentage}%`
    };
}
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
function selectLabel(label) {
    // For example, set the current time to the label's start time
    if (videoRef.value) {
        videoRef.value.currentTime = label.startTime;
    }
}
async function saveAnnotations() {
    if (!currentVideo.value)
        return;
    try {
        await axios.post(`${API_BASE}/annotations/`, {
            video_id: currentVideo.value.id,
            labels: labels.value.map(label => ({
                start_time: label.startTime,
                end_time: label.endTime,
                label_type: 'outside_body'
            }))
        });
        // Clear labels after successful save
        labels.value = [];
        activeLabel.value = null;
    }
    catch (error) {
        console.error('Failed to save annotations:', error);
    }
}
// Lifecycle
onMounted(async () => {
    await fetchVideos();
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['label-span',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-control-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.handleFileSelect) },
        type: ("file"),
        accept: ("video/*"),
        ...{ class: ("form-control") },
    });
    if (__VLS_ctx.availableVideos.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.currentVideo)),
            ...{ class: ("form-select mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        for (const [video] of __VLS_getVForSourceType((__VLS_ctx.availableVideos))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((video.id)),
                value: ((video)),
            });
            (video.center_name);
            (video.processor_name);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("video-container") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
        ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
        ref: ("videoRef"),
        controls: (true),
        ...{ class: ("w-100") },
        src: ((__VLS_ctx.currentVideoUrl)),
    });
    // @ts-ignore navigation for `const videoRef = ref()`
    /** @type { typeof __VLS_ctx.videoRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("timeline mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleTimelineClick) },
        ...{ class: ("timeline-track") },
        ref: ("timelineRef"),
    });
    // @ts-ignore navigation for `const timelineRef = ref()`
    /** @type { typeof __VLS_ctx.timelineRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("progress-bar") },
        ...{ style: (({ width: `${(__VLS_ctx.currentTime / __VLS_ctx.duration) * 100}%` })) },
    });
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.labels))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.selectLabel(label);
                } },
            key: ((label.id)),
            ...{ class: ("timeline-label") },
            ...{ style: ((__VLS_ctx.getTimelineSpanStyle(label))) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("label-span") },
            ...{ class: (({ 'recording': !label.isComplete })) },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("controls mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleLabel) },
        ...{ class: ("btn") },
        ...{ class: ((__VLS_ctx.activeLabel ? 'btn-danger' : 'btn-primary')) },
    });
    (__VLS_ctx.activeLabel ? 'End Recording' : '+ Start Recording');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("labels-overview mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("font-weight-bolder mb-3") },
    });
    for (const [label] of __VLS_getVForSourceType((__VLS_ctx.sortedLabels))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((label.id)),
            ...{ class: ("label-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatTime(label.startTime));
        (label.endTime ? '- ' + __VLS_ctx.formatTime(label.endTime) : '(Recording...)');
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.deleteLabel(label.id);
                } },
            disabled: ((!label.isComplete)),
            ...{ class: ("btn btn-link text-danger p-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-trash") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAnnotations) },
        ...{ class: ("btn btn-success mt-4") },
        disabled: ((!__VLS_ctx.canSave)),
    });
    ['card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'form-group', 'mb-4', 'form-control-label', 'form-control', 'form-select', 'mt-3', 'video-container', 'w-100', 'timeline', 'mt-4', 'timeline-track', 'progress-bar', 'timeline-label', 'label-span', 'recording', 'controls', 'mt-4', 'btn', 'labels-overview', 'mt-4', 'font-weight-bolder', 'mb-3', 'label-item', 'btn', 'btn-link', 'text-danger', 'p-0', 'fas', 'fa-trash', 'btn', 'btn-success', 'mt-4',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
        'timelineRef': __VLS_nativeElements['div'],
    };
    var $refs;
    var $el;
    return {
        attrs: {},
        slots: __VLS_slots,
        refs: $refs,
        rootEl: $el,
    };
}
;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            videoRef: videoRef,
            labels: labels,
            currentTime: currentTime,
            duration: duration,
            availableVideos: availableVideos,
            currentVideo: currentVideo,
            activeLabel: activeLabel,
            sortedLabels: sortedLabels,
            currentVideoUrl: currentVideoUrl,
            canSave: canSave,
            handleFileSelect: handleFileSelect,
            handleTimeUpdate: handleTimeUpdate,
            handleTimelineClick: handleTimelineClick,
            toggleLabel: toggleLabel,
            deleteLabel: deleteLabel,
            getTimelineSpanStyle: getTimelineSpanStyle,
            formatTime: formatTime,
            selectLabel: selectLabel,
            saveAnnotations: saveAnnotations,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
