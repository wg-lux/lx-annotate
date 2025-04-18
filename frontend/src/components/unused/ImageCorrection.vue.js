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
import { ref, onMounted } from 'vue';
import axios from 'axios';
// Reactive state
var backgroundUrl = ref('');
var droppedNames = ref([]);
// Fetch data from API on component mount
onMounted(function () { return __awaiter(void 0, void 0, void 0, function () {
    var backgroundResponse, droppedNamesResponse, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, axios.get('http://127.0.0.1:8000/api/background-image/')];
            case 1:
                backgroundResponse = _a.sent();
                backgroundUrl.value = backgroundResponse.data.imageUrl;
                return [4 /*yield*/, axios.get('http://127.0.0.1:8000/api/dropped-names/')];
            case 2:
                droppedNamesResponse = _a.sent();
                droppedNames.value = droppedNamesResponse.data.names;
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('Error fetching data:', error_1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Handle the drop event
var handleDrop = function (event) { return __awaiter(void 0, void 0, void 0, function () {
    var nameLabel, imageUrl, newDroppedName, response, error_2;
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                event.preventDefault();
                nameLabel = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.getData('nameLabel');
                imageUrl = (_b = event.dataTransfer) === null || _b === void 0 ? void 0 : _b.getData('imageUrl');
                if (!(nameLabel && imageUrl)) return [3 /*break*/, 4];
                newDroppedName = {
                    label: nameLabel,
                    imageUrl: imageUrl,
                    x: event.offsetX,
                    y: event.offsetY
                };
                droppedNames.value.push(newDroppedName);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 3, , 4]);
                return [4 /*yield*/, axios.post('http://127.0.0.1:8000/api/dropped-names/', newDroppedName)];
            case 2:
                response = _c.sent();
                console.log('Dropped name saved:', response.data);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _c.sent();
                console.error('Error saving dropped name:', error_2);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    var __VLS_ctx = {};
    var __VLS_components;
    var __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)(__assign(__assign(__assign({ onDrop: (__VLS_ctx.handleDrop) }, { onDragover: function () { } }), { id: ("background-image") }), { class: ("card mb-4") }));
    if (__VLS_ctx.backgroundUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)(__assign(__assign({ src: ((__VLS_ctx.backgroundUrl)) }, { class: ("img-fluid") }), { alt: ("Background") }));
    }
    for (var _i = 0, _a = __VLS_getVForSourceType((__VLS_ctx.droppedNames)); _i < _a.length; _i++) {
        var _b = _a[_i], droppedName = _b[0], index = _b[1];
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)(__assign(__assign(__assign({ key: ((index)), src: ((droppedName.imageUrl)) }, { style: (({ top: droppedName.y + 'px', left: droppedName.x + 'px', position: 'absolute' })) }), { class: ("dropped-name") }), { alt: ((droppedName.label)) }));
    }
    ['card', 'mb-4', 'img-fluid', 'dropped-name',];
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
var __VLS_self = (await import('vue')).defineComponent({
    setup: function () {
        return {
            backgroundUrl: backgroundUrl,
            droppedNames: droppedNames,
            handleDrop: handleDrop,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup: function () {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
