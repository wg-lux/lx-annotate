"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = require("vue");
const axios_1 = __importDefault(require("axios"));
// Reactive state
const backgroundUrl = (0, vue_1.ref)('');
const droppedNames = (0, vue_1.ref)([]);
// Fetch data from API on component mount
(0, vue_1.onMounted)(async () => {
    try {
        // Fetch background image URL
        const backgroundResponse = await axios_1.default.get('http://127.0.0.1:8000/api/background-image/');
        backgroundUrl.value = backgroundResponse.data.imageUrl;
        // Fetch dropped names data (assuming this includes image URLs and positions)
        const droppedNamesResponse = await axios_1.default.get('http://127.0.0.1:8000/api/dropped-names/');
        droppedNames.value = droppedNamesResponse.data.names;
    }
    catch (error) {
        console.error('Error fetching data:', error);
    }
});
// Handle the drop event
const handleDrop = async (event) => {
    event.preventDefault();
    const nameLabel = event.dataTransfer?.getData('nameLabel');
    const imageUrl = event.dataTransfer?.getData('imageUrl'); // Assuming you transfer image URL as well
    if (nameLabel && imageUrl) {
        const newDroppedName = {
            label: nameLabel,
            imageUrl: imageUrl,
            x: event.offsetX,
            y: event.offsetY
        };
        droppedNames.value.push(newDroppedName);
        try {
            const response = await axios_1.default.post('http://127.0.0.1:8000/api/dropped-names/', newDroppedName);
            console.log('Dropped name saved:', response.data);
        }
        catch (error) {
            console.error('Error saving dropped name:', error);
        }
    }
};
; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDrop: (__VLS_ctx.handleDrop) },
        ...{ onDragover: () => { } },
        id: ("background-image"),
        ...{ class: ("card mb-4") },
    });
    if (__VLS_ctx.backgroundUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: ((__VLS_ctx.backgroundUrl)),
            ...{ class: ("img-fluid") },
            alt: ("Background"),
        });
    }
    for (const [droppedName, index] of __VLS_getVForSourceType((__VLS_ctx.droppedNames))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            key: ((index)),
            src: ((droppedName.imageUrl)),
            ...{ style: (({ top: droppedName.y + 'px', left: droppedName.x + 'px', position: 'absolute' })) },
            ...{ class: ("dropped-name") },
            alt: ((droppedName.label)),
        });
    }
    ['card', 'mb-4', 'img-fluid', 'dropped-name',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {};
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
const __VLS_self = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    setup() {
        return {
            backgroundUrl: backgroundUrl,
            droppedNames: droppedNames,
            handleDrop: handleDrop,
        };
    },
});
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
