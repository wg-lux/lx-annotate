var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import vueFilePond from 'vue-filepond';
import 'filepond/dist/filepond.min.css';
import { useVideoStore } from '@/stores/videoStore';
// Use the video store
var videoStore = useVideoStore();
var _a = storeToRefs(videoStore), videoUrl = _a.videoUrl, errorMessage = _a.errorMessage, segmentsByLabel = _a.segmentsByLabel, allSegments = _a.allSegments, currentVideo = _a.currentVideo;
var fetchAllVideos = videoStore.fetchAllVideos, fetchVideoUrl = videoStore.fetchVideoUrl, fetchAllSegments = videoStore.fetchAllSegments, saveAnnotations = videoStore.saveAnnotations, uploadRevert = videoStore.uploadRevert, uploadProcess = videoStore.uploadProcess, getColorForLabel = videoStore.getColorForLabel, assignUserToVideo = videoStore.assignUserToVideo, updateVideoStatus = videoStore.updateVideoStatus;
var videoList = videoStore.videoList;
// Register FilePond component
var FilePond = vueFilePond();
// Local reactive references
var videoRef = ref(null);
var timelineRef = ref(null);
var currentTime = ref(0);
var duration = ref(100);
var canSave = ref(true);
var isResizing = ref(false);
var activeSegment = ref(null);
var startX = ref(0);
var initialWidthPercent = ref(0);
// For the dropdown
var selectedSegment = ref(null);
var selectedVideo = ref(null);
function reloadData() {
    var _a;
    fetchAllVideos();
    fetchAllSegments(String(((_a = selectedVideo.value) === null || _a === void 0 ? void 0 : _a.id) || "1"));
}
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
    var timelineRect = timelineRef.value.getBoundingClientRect();
    var deltaPx = event.clientX - startX.value;
    var deltaPercent = (deltaPx / timelineRect.width) * 100;
    var newWidthPercent = initialWidthPercent.value + deltaPercent;
    if (newWidthPercent > 0 && (calculateLeftPercent(activeSegment.value) + newWidthPercent) <= 100) {
        var segmentDuration = (newWidthPercent / 100) * duration.value;
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
        var rect = timelineRef.value.getBoundingClientRect();
        var clickPosition = event.clientX - rect.left;
        var percentage = clickPosition / rect.width;
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
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return "".concat(mins, ":").concat(secs.toString().padStart(2, '0'));
}
// Current classification computed from all segments
var currentClassification = computed(function () {
    return allSegments.value.find(function (segment) {
        return currentTime.value >= segment.startTime && currentTime.value <= segment.endTime;
    }) || null;
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
// Save the edited state of the selected segment locally by updating the store's segmentsByLabel
function updateSegmentState() {
    if (selectedSegment.value) {
        for (var label in segmentsByLabel.value) {
            var index = segmentsByLabel.value[label].findIndex(function (seg) { return seg.id === selectedSegment.value.id; });
            if (index !== -1) {
                segmentsByLabel.value[label][index] = __assign({}, selectedSegment.value);
                console.log("Segment state saved locally:", segmentsByLabel.value[label][index]);
                break;
            }
        }
    }
}
// Submit all annotations (send the updated segments to backend)
function submitAnnotations() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, saveAnnotations()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
onMounted(function () { return __awaiter(void 0, void 0, void 0, function () {
    var id;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, fetchVideoUrl()];
            case 1:
                _b.sent();
                // Fetch segments for all labels once the video is loaded.
                // If currentVideo is not yet set, default to video id '1'
                return [4 /*yield*/, fetchAllVideos()];
            case 2:
                // Fetch segments for all labels once the video is loaded.
                // If currentVideo is not yet set, default to video id '1'
                _b.sent();
                id = ((_a = videoStore.currentVideo) === null || _a === void 0 ? void 0 : _a.id) || '1';
                return [4 /*yield*/, fetchAllSegments(id)];
            case 3:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
onUnmounted(function () {
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
var assignedUser = ref(null);
var videoStatus = ref('available');
// Initialwerte setzen, wenn currentVideo sich ändert
watchEffect(function () {
    if (currentVideo.value) {
        assignedUser.value = currentVideo.value.assignedUser || null;
        videoStatus.value = currentVideo.value.status;
    }
});
function updateStatus() {
    if (currentVideo.value) {
        updateVideoStatus(videoStatus.value);
    }
}
function assignUser() {
    if (assignedUser.value && currentVideo.value) {
        assignUserToVideo(assignedUser.value);
    }
}
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid h-100 w-100 py-1 px-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-header pb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)(__assign({ class: ("mb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    if (__VLS_ctx.videoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("dropdown-container mb-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("segmentSelect"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            id: ("segmentSelect"),
            value: ((__VLS_ctx.selectedSegment)),
        });
        for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.allSegments)); _i < _a.length; _i++) {
            var segment = _a[_i][0];
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((segment.id)),
                value: ((segment)),
            });
            (segment.label_display);
            (__VLS_ctx.formatTime(segment.startTime));
            (__VLS_ctx.formatTime(segment.endTime));
        }
        if (__VLS_ctx.selectedSegment) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("segment-editor") }));
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
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.updateSegmentState) }));
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("dropdown-container mb-3") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("videoSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        id: ("videoSelect"),
        value: ((__VLS_ctx.selectedVideo)),
    });
    for (var _b = 0, _c = __VLS_getVForSourceType((__VLS_ctx.videoList.videos)); _b < _c.length; _b++) {
        var video = _c[_b][0];
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((video.id)),
            value: ((video)),
        });
        (video.original_file_name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("video-container mb-4 position-relative") }));
    if (__VLS_ctx.videoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)(__assign(__assign(__assign(__assign({ onTimeupdate: (__VLS_ctx.handleTimeUpdate) }, { onLoadedmetadata: (__VLS_ctx.handleLoadedMetadata) }), { ref: ("videoRef"), controls: (true) }), { style: ({}) }), { src: ((__VLS_ctx.videoUrl)) }));
        // @ts-ignore navigation for `const videoRef = ref()`
        /** @type { typeof __VLS_ctx.videoRef } */ ;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        var __VLS_0 = {}.FilePond;
        /** @type { [typeof __VLS_components.FilePond, ] } */ ;
        // @ts-ignore
        var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0(__assign({ 'onProcessfile': {} }, { ref: ("pond"), allowMultiple: ((false)), acceptedFileTypes: ("['video/*']"), labelIdle: ("Drag & Drop your video or <span class='filepond--label-action'>Browse</span>"), server: (({
                process: __VLS_ctx.uploadProcess,
                revert: __VLS_ctx.uploadRevert
            })) })));
        var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([__assign({ 'onProcessfile': {} }, { ref: ("pond"), allowMultiple: ((false)), acceptedFileTypes: ("['video/*']"), labelIdle: ("Drag & Drop your video or <span class='filepond--label-action'>Browse</span>"), server: (({
                    process: __VLS_ctx.uploadProcess,
                    revert: __VLS_ctx.uploadRevert
                })) })], __VLS_functionalComponentArgsRest(__VLS_1), false));
        // @ts-ignore navigation for `const pond = ref()`
        /** @type { typeof __VLS_ctx.pond } */ ;
        var __VLS_6 = {};
        var __VLS_7 = void 0;
        var __VLS_8 = {
            onProcessfile: (__VLS_ctx.handleProcessFile)
        };
        var __VLS_3 = void 0;
        var __VLS_4 = void 0;
        var __VLS_5;
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.errorMessage);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    if (__VLS_ctx.currentClassification) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("classification-label") }, { style: ((__VLS_ctx.getClassificationStyle())) }));
        (__VLS_ctx.currentClassification.label);
        ((__VLS_ctx.currentClassification.avgConfidence * 100).toFixed(1));
    }
    if (__VLS_ctx.videoUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("table-responsive") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)(__assign({ class: ("table table-striped table-hover") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        var _loop_1 = function (segment) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)(__assign(__assign({ onClick: function () {
                    var _a = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _a[_i] = arguments[_i];
                    }
                    var $event = _a[0];
                    if (!((__VLS_ctx.videoUrl)))
                        return;
                    __VLS_ctx.jumpTo(segment);
                } }, { key: ((segment.id)) }), { style: ({}) }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)(__assign({ style: (({ backgroundColor: __VLS_ctx.getColorForLabel(segment.label), color: '#fff' })) }));
            (segment.label_display);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatTime(segment.startTime));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.formatTime(segment.endTime));
        };
        for (var _d = 0, _e = __VLS_getVForSourceType((__VLS_ctx.allSegments)); _d < _e.length; _d++) {
            var segment = _e[_d][0];
            _loop_1(segment);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("controls mt-4") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.submitAnnotations) }, { class: ("btn btn-success") }), { disabled: ((!__VLS_ctx.canSave)) }));
    }
    if (__VLS_ctx.currentVideo) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("status-container") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("statusSelect"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ onChange: (__VLS_ctx.updateStatus) }, { id: ("statusSelect"), value: ((__VLS_ctx.videoStatus)) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("in_progress"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("available"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("completed"),
        });
    }
    if (__VLS_ctx.currentVideo) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("user-container") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            for: ("userInput"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
            id: ("userInput"),
            placeholder: ("Benutzername eingeben"),
        });
        (__VLS_ctx.assignedUser);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: (__VLS_ctx.assignUser) }));
    }
    ['container-fluid', 'h-100', 'w-100', 'py-1', 'px-4', 'card-header', 'pb-0', 'mb-0', 'container-fluid', 'py-4', 'dropdown-container', 'mb-3', 'segment-editor', 'container-fluid', 'py-4', 'dropdown-container', 'mb-3', 'container-fluid', 'py-4', 'video-container', 'mb-4', 'position-relative', 'container-fluid', 'py-4', 'container-fluid', 'py-4', 'classification-label', 'container-fluid', 'py-4', 'container-fluid', 'py-4', 'table-responsive', 'table', 'table-striped', 'table-hover', 'container-fluid', 'py-4', 'controls', 'mt-4', 'btn', 'btn-success', 'status-container', 'user-container',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {
        'videoRef': __VLS_nativeElements['video'],
        'pond': __VLS_6,
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
var __VLS_self = (await import('vue')).defineComponent({
    setup: function () {
        return {
            videoUrl: videoUrl,
            errorMessage: errorMessage,
            allSegments: allSegments,
            currentVideo: currentVideo,
            uploadRevert: uploadRevert,
            uploadProcess: uploadProcess,
            getColorForLabel: getColorForLabel,
            videoList: videoList,
            FilePond: FilePond,
            videoRef: videoRef,
            canSave: canSave,
            selectedSegment: selectedSegment,
            selectedVideo: selectedVideo,
            handleTimeUpdate: handleTimeUpdate,
            handleLoadedMetadata: handleLoadedMetadata,
            jumpTo: jumpTo,
            formatTime: formatTime,
            currentClassification: currentClassification,
            getClassificationStyle: getClassificationStyle,
            updateSegmentState: updateSegmentState,
            submitAnnotations: submitAnnotations,
            handleProcessFile: handleProcessFile,
            assignedUser: assignedUser,
            videoStatus: videoStatus,
            updateStatus: updateStatus,
            assignUser: assignUser,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup: function () {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
