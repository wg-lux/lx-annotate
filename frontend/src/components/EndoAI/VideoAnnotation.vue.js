import { ref, computed, onMounted, onUnmounted } from 'vue';
import vueFilePond from 'vue-filepond';
import 'filepond/dist/filepond.min.css';
import { getColorForLabel } from '@/components/EndoAI/segments';
import { videoService } from '@/api/videoService';
// Destructure reactive properties and functions from videoService
const { videoUrl, errorMessage, segments, fetchVideoUrl, saveAnnotations, uploadRevert, uploadProcess } = videoService;
// Register FilePond component
const FilePond = vueFilePond();
// Local reactive references
const videoRef = ref(null);
const timelineRef = ref(null);
const currentTime = ref(0);
const duration = ref(100);
const canSave = ref(true);
const isResizing = ref(false);
const activeSegment = ref(null);
const startX = ref(0);
const initialWidthPercent = ref(0);
// For the dropdown
const selectedSegment = ref(null);
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
// Save the edited state of the selected segment locally
function saveSegmentState() {
    if (selectedSegment.value) {
        const index = segments.value.findIndex(seg => seg.id === selectedSegment.value.id);
        if (index !== -1) {
            // Update the segments array with the new state from selectedSegment
            segments.value[index] = { ...selectedSegment.value };
            console.log("Segment state saved locally:", segments.value[index]);
        }
    }
}
// Submit all annotations (send the updated segments to backend)
async function submitAnnotations() {
    await saveAnnotations();
}
onMounted(fetchVideoUrl);
onUnmounted(() => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
});
// FilePond callback
function handleProcessFile(error, file) {
    if (error) {
        console.error("File processing error:", error);
        return;
    }
    console.log("File processed:", file);
    if (file.serverId) {
        videoUrl.value = file.serverId;
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dropdown-container mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("segmentSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("segmentSelect"),
        value: ((__VLS_ctx.selectedSegment)),
    });
    for (const [segment] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((segment.id)),
            value: ((segment)),
        });
        (segment.label_display);
        (__VLS_ctx.formatTime(segment.startTime));
        (__VLS_ctx.formatTime(segment.endTime));
    }
    if (__VLS_ctx.selectedSegment) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("segment-editor") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("number"),
            step: ("0.1"),
        });
        (__VLS_ctx.selectedSegment.startTime);
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            type: ("number"),
            step: ("0.1"),
        });
        (__VLS_ctx.selectedSegment.endTime);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveSegmentState) },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("video-container mb-4 position-relative") },
    });
    if (__VLS_ctx.videoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)({
            ...{ onTimeupdate: (__VLS_ctx.handleTimeUpdate) },
            ...{ onLoadedmetadata: (__VLS_ctx.handleLoadedMetadata) },
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.errorMessage);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    if (__VLS_ctx.currentClassification) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("classification-label") },
            ...{ style: ((__VLS_ctx.getClassificationStyle())) },
        });
        (__VLS_ctx.currentClassification.label);
        ((__VLS_ctx.currentClassification.avgConfidence * 100).toFixed(1));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatTime(__VLS_ctx.currentTime));
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatTime(__VLS_ctx.duration));
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
        ...{ class: ("container-fluid py-4") },
    });
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
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("controls mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.submitAnnotations) },
        ...{ class: ("btn btn-success") },
        disabled: ((!__VLS_ctx.canSave)),
    });
    ['container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'card-header', 'pb-0', 'mb-0', 'container-fluid', 'py-4', 'dropdown-container', 'mb-3', 'segment-editor', 'container-fluid', 'py-4', 'video-container', 'mb-4', 'position-relative', 'w-100', 'container-fluid', 'py-4', 'container-fluid', 'py-4', 'classification-label', 'container-fluid', 'py-4', 'd-flex', 'justify-content-between', 'timeline-track', 'timeline-segment', 'resize-handle', 'container-fluid', 'py-4', 'table-responsive', 'table', 'table-striped', 'table-hover', 'container-fluid', 'py-4', 'controls', 'mt-4', 'btn', 'btn-success',];
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
            videoUrl: videoUrl,
            errorMessage: errorMessage,
            segments: segments,
            uploadRevert: uploadRevert,
            uploadProcess: uploadProcess,
            FilePond: FilePond,
            videoRef: videoRef,
            timelineRef: timelineRef,
            currentTime: currentTime,
            duration: duration,
            canSave: canSave,
            selectedSegment: selectedSegment,
            startResize: startResize,
            handleTimeUpdate: handleTimeUpdate,
            handleLoadedMetadata: handleLoadedMetadata,
            jumpTo: jumpTo,
            handleTimelineClick: handleTimelineClick,
            calculateLeftPercent: calculateLeftPercent,
            calculateWidthPercent: calculateWidthPercent,
            formatTime: formatTime,
            currentClassification: currentClassification,
            getClassificationStyle: getClassificationStyle,
            saveSegmentState: saveSegmentState,
            submitAnnotations: submitAnnotations,
            handleProcessFile: handleProcessFile,
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
