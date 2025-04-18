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
import { defineComponent, ref, computed, onMounted } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import { useImageStore } from '@/stores/imageStore';
import { getSegmentStyle, getTranslationForLabel, getColorForLabel, useLabelStore } from '@/stores/labelStore';
export default defineComponent({
    name: 'ScrollingFrames',
    components: {
        DynamicScroller: DynamicScroller,
        DynamicScrollerItem: DynamicScrollerItem,
    },
    setup: function () {
        var _this = this;
        // Stores
        var imageStore = useImageStore();
        var labelStore = useLabelStore();
        // UI state
        var showAnnotationModal = ref(false);
        var selectedFrame = ref(null);
        var newSegment = ref({
            id: 'segment-' + Math.random().toString(36).substr(2, 9),
            label: 'outside',
            startTime: 0,
            endTime: 1,
            avgConfidence: 1,
            frameId: ''
        });
        // Translation map for the dropdown
        var translationMap = computed(function () {
            var map = {};
            ['appendix', 'blood', 'diverticule', 'grasper', 'ileocaecalvalve', 'ileum',
                'low_quality', 'nbi', 'needle', 'outside', 'polyp', 'snare', 'water_jet', 'wound']
                .forEach(function (label) {
                map[label] = getTranslationForLabel(label);
            });
            return map;
        });
        // Fetch frames and segments on component mount
        onMounted(function () { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, imageStore.fetchImages()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, labelStore.fetchSegments()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Fehler beim Laden der Daten:', error_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        var frames = computed(function () { return imageStore.data; });
        // Function to annotate a frame
        var annotateFrame = function (frame) {
            selectedFrame.value = frame;
            newSegment.value = {
                id: 'segment-' + Math.random().toString(36).substr(2, 9),
                label: 'outside',
                startTime: 0,
                endTime: 10,
                avgConfidence: 1,
                frameId: frame.id
            };
            showAnnotationModal.value = true;
        };
        // Function to select a segment (for editing)
        var selectSegment = function (segment, frame) {
            selectedFrame.value = frame;
            newSegment.value = __assign({}, segment);
            showAnnotationModal.value = true;
        };
        // Save the new segment
        var saveNewSegment = function () { return __awaiter(_this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!selectedFrame.value) return [3 /*break*/, 2];
                        newSegment.value.frameId = selectedFrame.value.id;
                        return [4 /*yield*/, labelStore.saveSegment(newSegment.value)];
                    case 1:
                        _a.sent();
                        showAnnotationModal.value = false;
                        _a.label = 2;
                    case 2: return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        console.error('Fehler beim Speichern des Segments:', error_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        return {
            frames: frames,
            annotateFrame: annotateFrame,
            selectSegment: selectSegment,
            getSegmentStyle: getSegmentStyle,
            getTranslationForLabel: getTranslationForLabel,
            getColorForLabel: getColorForLabel,
            getSegmentsForFrame: labelStore.getSegmentsForFrame,
            showAnnotationModal: showAnnotationModal,
            selectedFrame: selectedFrame,
            newSegment: newSegment,
            saveNewSegment: saveNewSegment,
            translationMap: translationMap
        };
    },
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_componentsOption = {
        DynamicScroller: DynamicScroller,
        DynamicScrollerItem: DynamicScrollerItem,
    };
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("container-fluid py-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col-12 bg-light mb-4") }));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("overflow-auto") }, { style: ({}) }));
    var __VLS_0 = {}.DynamicScroller;
    /** @type { [typeof __VLS_components.DynamicScroller, typeof __VLS_components.DynamicScroller, ] } */ ;
    // @ts-ignore
    var __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        items: ((__VLS_ctx.frames)),
        minItemSize: ((150)),
        keyField: ("id"),
    }));
    var __VLS_2 = __VLS_1.apply(void 0, __spreadArray([{
            items: ((__VLS_ctx.frames)),
            minItemSize: ((150)),
            keyField: ("id"),
        }], __VLS_functionalComponentArgsRest(__VLS_1), false));
    {
        var __VLS_thisSlot = __VLS_5.slots.default;
        var item_1 = __VLS_getSlotParams(__VLS_thisSlot)[0].item;
        var __VLS_6 = {}.DynamicScrollerItem;
        /** @type { [typeof __VLS_components.DynamicScrollerItem, typeof __VLS_components.DynamicScrollerItem, ] } */ ;
        // @ts-ignore
        var __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
            item: ((item_1)),
        }));
        var __VLS_8 = __VLS_7.apply(void 0, __spreadArray([{
                item: ((item_1)),
            }], __VLS_functionalComponentArgsRest(__VLS_7), false));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("frame-item position-relative") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)(__assign({ src: ((item_1.imageUrl)), alt: ("Frame") }, { class: ("img-fluid") }));
        var _loop_1 = function (segment) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onClick: function () {
                    var _a = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        _a[_i] = arguments[_i];
                    }
                    var $event = _a[0];
                    __VLS_ctx.selectSegment(segment, item_1);
                } }, { key: ((segment.id)) }), { class: ("segment-overlay") }), { style: ((__VLS_ctx.getSegmentStyle(segment, item_1.duration || 10))) }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)(__assign({ class: ("segment-label") }));
            (__VLS_ctx.getTranslationForLabel(segment.label));
        };
        for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.getSegmentsForFrame(item_1.id))); _i < _a.length; _i++) {
            var segment = _a[_i][0];
            _loop_1(segment);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                __VLS_ctx.annotateFrame(item_1);
            } }, { class: ("btn btn-primary btn-sm mt-2") }));
        __VLS_11.slots.default;
        var __VLS_11;
        __VLS_5.slots['' /* empty slot name completion */];
    }
    var __VLS_5;
    if (__VLS_ctx.showAnnotationModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign({ class: ("modal fade show") }, { tabindex: ("-1") }), { style: ({}) }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("modal-dialog modal-lg") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("modal-content") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("modal-header") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)(__assign({ class: ("modal-title") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                if (!((__VLS_ctx.showAnnotationModal)))
                    return;
                __VLS_ctx.showAnnotationModal = false;
            } }, { type: ("button") }), { class: ("btn-close") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("modal-body") }));
        if (__VLS_ctx.selectedFrame) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)(__assign({ src: ((__VLS_ctx.selectedFrame.imageUrl)), alt: ("Selected Frame") }, { class: ("img-fluid mb-3") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("mb-3") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)(__assign({ value: ((__VLS_ctx.newSegment.label)) }, { class: ("form-select") }));
            for (var _b = 0, _c = __VLS_getVForSourceType((__VLS_ctx.translationMap)); _b < _c.length; _b++) {
                var _d = _c[_b], translation = _d[0], label = _d[1];
                __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    key: ((label)),
                    value: ((label)),
                });
                (translation);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("row mb-3") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("number") }, { class: ("form-control") }), { min: ("0") }));
            (__VLS_ctx.newSegment.startTime);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("number") }, { class: ("form-control") }), { min: ("0") }));
            (__VLS_ctx.newSegment.endTime);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("col") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)(__assign({ class: ("form-label") }));
            __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)(__assign(__assign({ type: ("number") }, { class: ("form-control") }), { min: ("0"), max: ("1"), step: ("0.1") }));
            (__VLS_ctx.newSegment.avgConfidence);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign({ class: ("modal-footer") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: function () {
                var _a = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    _a[_i] = arguments[_i];
                }
                var $event = _a[0];
                if (!((__VLS_ctx.showAnnotationModal)))
                    return;
                __VLS_ctx.showAnnotationModal = false;
            } }, { type: ("button") }), { class: ("btn btn-secondary") }));
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)(__assign(__assign({ onClick: (__VLS_ctx.saveNewSegment) }, { type: ("button") }), { class: ("btn btn-primary") }));
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'bg-light', 'mb-4', 'overflow-auto', 'frame-item', 'position-relative', 'img-fluid', 'segment-overlay', 'segment-label', 'btn', 'btn-primary', 'btn-sm', 'mt-2', 'modal', 'fade', 'show', 'modal-dialog', 'modal-lg', 'modal-content', 'modal-header', 'modal-title', 'btn-close', 'modal-body', 'img-fluid', 'mb-3', 'mb-3', 'form-label', 'form-select', 'row', 'mb-3', 'col', 'form-label', 'form-control', 'col', 'form-label', 'form-control', 'col', 'form-label', 'form-control', 'modal-footer', 'btn', 'btn-secondary', 'btn', 'btn-primary',];
    var __VLS_slots;
    var $slots;
    var __VLS_inheritedAttrs;
    var $attrs;
    var __VLS_refs = {};
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
var __VLS_self;
