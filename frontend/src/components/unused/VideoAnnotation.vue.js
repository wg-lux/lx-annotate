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
import { ref, computed, onMounted } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
var API_BASE = 'http://127.0.0.1:8000/api';
// Refs
var videoRef = ref(null);
var labels = ref([]);
var currentTime = ref(0);
var duration = ref(0);
var availableVideos = ref([]);
var currentVideo = ref(null);
var activeLabel = ref(null);
// Computed
var sortedLabels = computed(function () {
    return __spreadArray([], labels.value, true).sort(function (a, b) { return a.startTime - b.startTime; });
});
var currentVideoUrl = computed(function () {
    var _a;
    return ((_a = currentVideo.value) === null || _a === void 0 ? void 0 : _a.url) || '';
});
var canSave = computed(function () {
    return labels.value.length > 0 && labels.value.every(function (l) { return l.isComplete; });
});
// Methods
function fetchVideos() {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios.get("".concat(API_BASE, "/videos/"))];
                case 1:
                    response = _a.sent();
                    availableVideos.value = response.data;
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Failed to fetch videos:', error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function handleFileSelect(event) {
    return __awaiter(this, void 0, void 0, function () {
        var file, formData, response, error_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
                    if (!file)
                        return [2 /*return*/];
                    formData = new FormData();
                    formData.append('video', file);
                    formData.append('center_name', 'your_center');
                    formData.append('processor_name', 'your_processor');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios.post("".concat(API_BASE, "/videos/upload/"), formData)];
                case 2:
                    response = _b.sent();
                    console.log('Upload response:', response.data);
                    if (response.data.url) {
                        currentVideo.value = response.data;
                        // Video source will update automatically due to binding
                    }
                    else {
                        console.error('No URL in response:', response.data);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _b.sent();
                    console.error('Upload failed:', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function handleTimeUpdate() {
    if (videoRef.value) {
        currentTime.value = videoRef.value.currentTime;
        duration.value = videoRef.value.duration;
    }
}
function handleTimelineClick(event) {
    var timeline = event.currentTarget;
    if (timeline && videoRef.value) {
        var rect = timeline.getBoundingClientRect();
        var clickPosition = event.clientX - rect.left;
        var percentage = clickPosition / rect.width;
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
        var newLabel = {
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
    var label = labels.value.find(function (l) { return l.id === id; });
    if (label === activeLabel.value) {
        activeLabel.value = null;
    }
    labels.value = labels.value.filter(function (l) { return l.id !== id; });
}
function getTimelineSpanStyle(label) {
    var startPercentage = (label.startTime / duration.value) * 100;
    var endPercentage = label.endTime
        ? (label.endTime / duration.value) * 100
        : (currentTime.value / duration.value) * 100;
    return {
        left: "".concat(startPercentage, "%"),
        width: "".concat(endPercentage - startPercentage, "%")
    };
}
function formatTime(seconds) {
    var mins = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    var ms = Math.floor((seconds % 1) * 1000);
    return "".concat(mins.toString().padStart(2, '0'), ":").concat(secs.toString().padStart(2, '0'), ".").concat(ms.toString().padStart(3, '0'));
}
function selectLabel(label) {
    // For example, set the current time to the label's start time
    if (videoRef.value) {
        videoRef.value.currentTime = label.startTime;
    }
}
function saveAnnotations() {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!currentVideo.value)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios.post("".concat(API_BASE, "/annotations/"), {
                            video_id: currentVideo.value.id,
                            labels: labels.value.map(function (label) { return ({
                                start_time: label.startTime,
                                end_time: label.endTime,
                                label_type: 'outside_body'
                            }); })
                        })];
                case 2:
                    _a.sent();
                    // Clear labels after successful save
                    labels.value = [];
                    activeLabel.value = null;
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    console.error('Failed to save annotations:', error_3);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Lifecycle
onMounted(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetchVideos()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    ['label-span',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-header pb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)(__assign({ class: ("mb-0") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("card-body") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("form-group mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-control-label") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ onChange: (__VLS_ctx.handleFileSelect) }, { type: ("file"), accept: ("video/*") }), { class: ("form-control") }));
    if (__VLS_ctx.availableVideos.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ value: ((__VLS_ctx.currentVideo)) }, { class: ("form-select mt-3") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.availableVideos)); _i < _a.length; _i++) {
            var video = _a[_i][0];
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((video.id)),
                value: ((video)),
            });
            (video.center_name);
            (video.processor_name);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("video-container") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.video, __VLS_intrinsicElements.video)(__assign(__assign(__assign({ onTimeupdate: (__VLS_ctx.handleTimeUpdate) }, { ref: ("videoRef"), controls: (true) }), { class: ("w-100") }), { src: ((__VLS_ctx.currentVideoUrl)) }));
    // @ts-ignore navigation for `const videoRef = ref()`
    /** @type { typeof __VLS_ctx.videoRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("timeline mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign({ onClick: (__VLS_ctx.handleTimelineClick) }, { class: ("timeline-track") }), { ref: ("timelineRef") }));
    // @ts-ignore navigation for `const timelineRef = ref()`
    /** @type { typeof __VLS_ctx.timelineRef } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("progress-bar") }, { style: (({ width: "".concat((__VLS_ctx.currentTime / __VLS_ctx.duration) * 100, "%") })) }));
    var _loop_1 = function (label) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.selectLabel(label);
            } }, { key: ((label.id)) }), { class: ("timeline-label") }), { style: ((__VLS_ctx.getTimelineSpanStyle(label))) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("label-span") }, { class: (({ 'recording': !label.isComplete })) }));
    };
    for (var _b = 0, _c = __VLS_getVForSourceType((__VLS_ctx.labels)); _b < _c.length; _b++) {
        var label = _c[_b][0];
        _loop_1(label);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("controls mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.toggleLabel) }, { class: ("btn") }), { class: ((__VLS_ctx.activeLabel ? 'btn-danger' : 'btn-primary')) }));
    (__VLS_ctx.activeLabel ? 'End Recording' : '+ Start Recording');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("labels-overview mt-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)(__assign({ class: ("font-weight-bolder mb-3") }));
    var _loop_2 = function (label) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ key: ((label.id)) }, { class: ("label-item") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatTime(label.startTime));
        (label.endTime ? '- ' + __VLS_ctx.formatTime(label.endTime) : '(Recording...)');
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.deleteLabel(label.id);
            } }, { disabled: ((!label.isComplete)) }), { class: ("btn btn-link text-danger p-0") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)(__assign({ class: ("fas fa-trash") }));
    };
    for (var _d = 0, _e = __VLS_getVForSourceType((__VLS_ctx.sortedLabels)); _d < _e.length; _d++) {
        var label = _e[_d][0];
        _loop_2(label);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.saveAnnotations) }, { class: ("btn btn-success mt-4") }), { disabled: ((!__VLS_ctx.canSave)) }));
    ['card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'form-group', 'mb-4', 'form-control-label', 'form-control', 'form-select', 'mt-3', 'video-container', 'w-100', 'timeline', 'mt-4', 'timeline-track', 'progress-bar', 'timeline-label', 'label-span', 'recording', 'controls', 'mt-4', 'btn', 'labels-overview', 'mt-4', 'font-weight-bolder', 'mb-3', 'label-item', 'btn', 'btn-link', 'text-danger', 'p-0', 'fas', 'fa-trash', 'btn', 'btn-success', 'mt-4',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {
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
var __VLS_self = (await import('vue')).defineComponent({
    setup: function () {
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
    setup: function () {
        return {};
    },
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
