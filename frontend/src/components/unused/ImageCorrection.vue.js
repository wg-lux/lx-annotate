import { ref, onMounted } from 'vue';
import axios from 'axios';
// Reactive state
const backgroundUrl = ref('');
const droppedNames = ref([]);
// Fetch data from API on component mount
onMounted(async () => {
    try {
        // Fetch background image URL
        const backgroundResponse = await axios.get('http://127.0.0.1:8000/api/background-image/');
        backgroundUrl.value = backgroundResponse.data.imageUrl;
        // Fetch dropped names data (assuming this includes image URLs and positions)
        const droppedNamesResponse = await axios.get('http://127.0.0.1:8000/api/dropped-names/');
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
            const response = await axios.post('http://127.0.0.1:8000/api/dropped-names/', newDroppedName);
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            backgroundUrl: backgroundUrl,
            droppedNames: droppedNames,
            handleDrop: handleDrop,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
