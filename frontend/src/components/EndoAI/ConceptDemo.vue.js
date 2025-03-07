import { ref, onMounted, computed } from 'vue';
import { getColorForLabel, jumpToSegment as utilJumpToSegment } from '@/components/EndoAI/segments';
import axios, { AxiosError } from 'axios';
//  Declare missing variables properly
const videoUrl = ref('');
const videoRef = ref(null);
const timelineRef = ref(null); //  
const currentTime = ref(0);
const duration = ref(100);
const canSave = ref(true); //  Add missing canSave ref
const segments = ref([]); //  Declare segments properly
const classificationData = ref(null);
const isResizing = ref(false);
const activeSegment = ref(null);
const startX = ref(0);
const initialWidthPercent = ref(0);
function startResize(segment, event) {
    isResizing.value = true;
    activeSegment.value = segment;
    startX.value = event.clientX;
    // Store the initial width (in percentage) of this segment
    initialWidthPercent.value = calculateWidthPercent(segment);
    // Add global mousemove and mouseup listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}
function onMouseMove(event) {
    if (!isResizing.value || !activeSegment.value || !timelineRef.value)
        return;
    const timelineRect = timelineRef.value.getBoundingClientRect();
    // Calculate how many percent of the timeline width the mouse has moved
    const deltaPx = event.clientX - startX.value;
    const deltaPercent = (deltaPx / timelineRect.width) * 100;
    // Calculate new width percentage and update the segment's endTime
    const newWidthPercent = initialWidthPercent.value + deltaPercent;
    // Ensure newWidthPercent stays within valid bounds (e.g., >0 and not beyond timeline)
    if (newWidthPercent > 0 && (calculateLeftPercent(activeSegment.value) + newWidthPercent) <= 100) {
        // Update segment endTime based on new width
        // duration.value holds total video duration
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
//  Handle Video Errors
function handleVideoError(event) {
    console.error("Error loading the video:", event);
    alert("Failed to load video. Please check the source URL.");
}
//  Fetch Video from Django API
// Updated function to fetch video and segment data from backend
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
            console.error("Invalid video response:", response.data);
        }
        if (response.data.classification_data) {
            // Loop through classification_data from backend and update segments array
            segments.value = response.data.classification_data.map((classification, index) => ({
                id: `segment${index + 1}`, // Unique ID
                label: classification.label,
                label_display: classification.label, // Modify if needed for translations
                startTime: classification.start_time,
                endTime: classification.end_time,
                avgConfidence: classification.confidence
            }));
        }
    }
    catch (error) {
        const axiosError = error;
        console.error("Error loading video:", axiosError.response?.data || axiosError.message);
    }
}
// Call the function on component mount
onMounted(fetchVideoUrl);
//  Track Current Classification Based on Video Time
const currentClassification = computed(() => {
    return segments.value.find(segment => currentTime.value >= segment.startTime &&
        currentTime.value <= segment.endTime) || null; // Returns null if no matching segment is found
});
function handleTimeUpdate() {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
    }
}
// Helper Functions
function calculateLeftPercent(segment) {
    return (segment.startTime / duration.value) * 100;
}
function calculateWidthPercent(segment) {
    return ((segment.endTime - segment.startTime) / duration.value) * 100;
}
function calculateRightPercent(segment) {
    return 100 - calculateLeftPercent(segment) - calculateWidthPercent(segment);
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
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
function getClassificationStyle() {
    return {
        backgroundColor: "Green", /* Standard background color */
        color: "white",
        fontSize: "20px",
        fontWeight: "bold",
        padding: "12px",
        borderRadius: "6px",
        textTransform: "uppercase",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.5)",
        textAlign: "center",
        width: "100%", /* Ensure it spans the full width below the video */
    };
}
//  Load video & segments on component mount
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
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
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
            videoUrl: videoUrl,
            videoRef: videoRef,
            timelineRef: timelineRef,
            canSave: canSave,
            segments: segments,
            startResize: startResize,
            handleVideoError: handleVideoError,
            currentClassification: currentClassification,
            handleTimeUpdate: handleTimeUpdate,
            calculateLeftPercent: calculateLeftPercent,
            calculateWidthPercent: calculateWidthPercent,
            handleLoadedMetadata: handleLoadedMetadata,
            jumpTo: jumpTo,
            saveAnnotations: saveAnnotations,
            formatTime: formatTime,
            getClassificationStyle: getClassificationStyle,
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
