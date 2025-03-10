import { ref, computed, onMounted, onUnmounted } from 'vue';
import axios, { AxiosError } from 'axios';
import vueFilePond from 'vue-filepond';
import 'filepond/dist/filepond.min.css';
import { getColorForLabel } from '@/components/EndoAI/segments';
// Register the FilePond component (no plugins added in this example)
const FilePond = vueFilePond();
// Reactive references
const videoUrl = ref('');
const videoRef = ref(null);
const errorMessage = ref('');
const timelineRef = ref(null);
const currentTime = ref(0);
const duration = ref(100);
const canSave = ref(true);
const segments = ref([]);
const isResizing = ref(false);
const activeSegment = ref(null);
const startX = ref(0);
const initialWidthPercent = ref(0);
// Global event listeners for resizing
function startResize(segment, event) {
    isResizing.value = true;
    activeSegment.value = segment;
    startX.value = event.clientX;
    initialWidthPercent.value = calculateWidthPercent(segment);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}
function onMouseMove(event) {
    if (!isResizing.value || !activeSegment.value || !timelineRef.value)
        return;
    const timelineRect = timelineRef.value.getBoundingClientRect();
    const deltaPx = event.clientX - startX.value;
    const deltaPercent = (deltaPx / timelineRect.width) * 100;
    const newWidthPercent = initialWidthPercent.value + deltaPercent;
    if (newWidthPercent > 0 && (calculateLeftPercent(activeSegment.value) + newWidthPercent) <= 100) {
        const segmentDuration = (newWidthPercent / 100) * duration.value;
        activeSegment.value.endTime = activeSegment.value.startTime + segmentDuration;
    }
}
function onMouseUp() {
    isResizing.value = false;
    activeSegment.value = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}
// Video event handlers
function handleVideoError(event) {
    console.error("Error loading the video:", event);
    alert("Failed to load video. Please check the source URL.");
}
function handleTimeUpdate() {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
    }
}
function handleLoadedMetadata() {
    if (videoRef.value) {
        duration.value = videoRef.value.duration;
    }
}
function jumpTo(segment) {
    if (videoRef.value) {
        videoRef.value.currentTime = segment.startTime;
    }
}
function handleTimelineClick(event) {
    if (timelineRef.value && videoRef.value) {
        const rect = timelineRef.value.getBoundingClientRect();
        const clickPosition = event.clientX - rect.left;
        const percentage = clickPosition / rect.width;
        videoRef.value.currentTime = percentage * duration.value;
    }
}
// Helper functions for timeline
function calculateLeftPercent(segment) {
    return (segment.startTime / duration.value) * 100;
}
function calculateWidthPercent(segment) {
    return ((segment.endTime - segment.startTime) / duration.value) * 100;
}
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
// Current classification computed from segments
const currentClassification = computed(() => {
    return segments.value.find(segment => currentTime.value >= segment.startTime && currentTime.value <= segment.endTime) || null;
});
function getClassificationStyle() {
    return {
        backgroundColor: "Green",
        color: "white",
        fontSize: "20px",
        fontWeight: "bold",
        padding: "12px",
        borderRadius: "6px",
        textTransform: "uppercase",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)",
        textAlign: "center",
        width: "100%"
    };
}
// Fetch video and segment data from Django API
async function fetchVideoUrl() {
    try {
        const response = await axios.get('http://127.0.0.1:8000/api/video/1/', {
            headers: { 'Accept': 'application/json' }
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
                avgConfidence: classification.confidence
            }));
        }
    }
    catch (error) {
        const axiosError = error;
        console.error("Error loading video:", axiosError.response?.data || axiosError.message);
        errorMessage.value = "Error loading video. Please check the API endpoint or try again later.";
    }
}
onMounted(fetchVideoUrl);
onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
});
// Vue FilePond uploader server endpoints configuration
// When the user uploads a video, FilePond will send it to this Django endpoint.
const uploadProcess = (fieldName, file, metadata, load, error) => {
    const formData = new FormData();
    formData.append(fieldName, file);
    axios.post('http://127.0.0.1:8000/api/upload-video/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
        .then(response => {
        // Assume the Django view returns { video_url: "<url>" }
        const url = response.data.video_url;
        // Update our reactive videoUrl so the video tag will be shown.
        videoUrl.value = url;
        load(url); // Pass the URL as the server id
    })
        .catch(err => {
        console.error("Upload error:", err);
        error("Upload failed");
    });
};
const uploadRevert = (uniqueFileId, load, error) => {
    // Optionally implement revert logic if needed
    axios.delete(`http://127.0.0.1:8000/api/upload-video/${uniqueFileId}/`)
        .then(() => {
        videoUrl.value = '';
        load();
    })
        .catch(err => {
        console.error("Revert error:", err);
        error("Revert failed");
    });
};
// Callback when FilePond finishes processing a file.
// This callback can be used to do additional processing if needed.
function handleProcessFile(error, file) {
    if (error) {
        console.error("File processing error:", error);
        return;
    }
    console.log("File processed:", file);
    // The server response (stored in file.serverId) is used to set the video URL.
    if (file.serverId) {
        videoUrl.value = file.serverId;
    }
}
async function saveAnnotations() {
    try {
        const response = await axios.post('http://127.0.0.1:8000/api/annotations/', {
            segments: segments.value,
        });
        console.log('Annotations saved:', response.data);
    }
    catch (error) {
        console.error('Error saving annotations:', error);
    }
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid h-100 w-100 py-1 px-4") },
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
        ...{ class: ("video-container mb-4 position-relative") },
    });
    if (__VLS_ctx.videoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
            ...{ onLoadedmetadata: (__VLS_ctx.handleLoadedMetadata) },
            ...{ onError: (__VLS_ctx.handleVideoError) },
            ref: ("videoRef"),
            controls: (true),
            ...{ class: ("w-100") },
            src: ((__VLS_ctx.videoUrl)),
        });
        // @ts-ignore navigation for `const videoRef = ref()`
        /** @type { typeof __VLS_ctx.videoRef } */ ;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        const __VLS_0 = {}.FilePond;
        /** @type { [typeof __VLS_components.FilePond, ] } */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            ...{ 'onProcessfile': {} },
            ref: ("pond"),
            allowMultiple: ((false)),
            acceptedFileTypes: ("['video/*']"),
            labelIdle: ("Drag & Drop your video or <span class='filepond--label-action'>Browse</span>"),
            server: (({
                process: __VLS_ctx.uploadProcess,
                revert: __VLS_ctx.uploadRevert
            })),
        }));
        const __VLS_2 = __VLS_1({
            ...{ 'onProcessfile': {} },
            ref: ("pond"),
            allowMultiple: ((false)),
            acceptedFileTypes: ("['video/*']"),
            labelIdle: ("Drag & Drop your video or <span class='filepond--label-action'>Browse</span>"),
            server: (({
                process: __VLS_ctx.uploadProcess,
                revert: __VLS_ctx.uploadRevert
            })),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        // @ts-ignore navigation for `const pond = ref()`
        /** @type { typeof __VLS_ctx.pond } */ ;
        var __VLS_6 = {};
        let __VLS_7;
        const __VLS_8 = {
            onProcessfile: (__VLS_ctx.handleProcessFile)
        };
        let __VLS_3;
        let __VLS_4;
        var __VLS_5;
    }
    {
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.errorMessage);
    }
    if (__VLS_ctx.currentClassification) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("classification-label") },
            ...{ style: ((__VLS_ctx.getClassificationStyle())) },
        });
        (__VLS_ctx.currentClassification.label);
        ((__VLS_ctx.currentClassification.avgConfidence * 100).toFixed(1));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.handleTimelineClick) },
        ...{ class: ("timeline-track") },
        ref: ("timelineRef"),
    });
    // @ts-ignore navigation for `const timelineRef = ref()`
    /** @type { typeof __VLS_ctx.timelineRef } */ ;
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ((segment.id)),
            ...{ class: ("timeline-segment") },
            ...{ style: (({
                    left: __VLS_ctx.calculateLeftPercent(segment) + '%',
                    width: __VLS_ctx.calculateWidthPercent(segment) + '%'
                })) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onMousedown: (...[$event]) => {
                    __VLS_ctx.startResize(segment, $event);
                } },
            ...{ class: ("resize-handle") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("table-responsive") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: ("table table-striped table-hover") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.jumpTo(segment);
                } },
            key: ((segment.id)),
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ style: (({ backgroundColor: __VLS_ctx.getColorForLabel(segment.label), color: '#fff' })) },
        });
        (segment.label_display);
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatTime(segment.startTime));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatTime(segment.endTime));
        __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        ((segment.avgConfidence * 100).toFixed(1));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("controls mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAnnotations) },
        ...{ class: ("btn btn-success") },
        disabled: ((!__VLS_ctx.canSave)),
    });
    ['container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'card-header', 'pb-0', 'mb-0', 'card-body', 'video-container', 'mb-4', 'position-relative', 'w-100', 'classification-label', 'timeline-track', 'timeline-segment', 'resize-handle', 'table-responsive', 'table', 'table-striped', 'table-hover', 'controls', 'mt-4', 'btn', 'btn-success',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
        'pond': __VLS_6,
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
            getColorForLabel: getColorForLabel,
            FilePond: FilePond,
            videoUrl: videoUrl,
            videoRef: videoRef,
            errorMessage: errorMessage,
            timelineRef: timelineRef,
            canSave: canSave,
            segments: segments,
            startResize: startResize,
            handleVideoError: handleVideoError,
            handleTimeUpdate: handleTimeUpdate,
            handleLoadedMetadata: handleLoadedMetadata,
            jumpTo: jumpTo,
            handleTimelineClick: handleTimelineClick,
            calculateLeftPercent: calculateLeftPercent,
            calculateWidthPercent: calculateWidthPercent,
            formatTime: formatTime,
            currentClassification: currentClassification,
            getClassificationStyle: getClassificationStyle,
            uploadProcess: uploadProcess,
            uploadRevert: uploadRevert,
            handleProcessFile: handleProcessFile,
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
