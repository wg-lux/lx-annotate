import { ref, computed, nextTick } from 'vue';
const props = withDefaults(defineProps(), {
    acceptedFileTypes: '*',
    isUploading: false
});
const emit = defineEmits();
// Template refs
const dropZone = ref();
const fileInput = ref();
// Reactive state
const isDragOver = ref(false);
const hasValidationError = ref(false);
const statusMessage = ref('');
const dragCounter = ref(0); // Track nested drag events
// Computed
const isInteractive = computed(() => !props.isUploading);
// Methods
const triggerFileInput = () => {
    if (!isInteractive.value)
        return;
    fileInput.value?.click();
};
const handleFileSelect = (event) => {
    const target = event.target;
    const files = target.files;
    if (files) {
        processFiles(Array.from(files));
    }
};
const handleDragEnter = (event) => {
    if (!isInteractive.value)
        return;
    dragCounter.value++;
    event.dataTransfer.dropEffect = 'copy';
    if (dragCounter.value === 1) {
        isDragOver.value = true;
        statusMessage.value = 'Datei über der Drop-Zone. Loslassen zum Hochladen.';
    }
};
const handleDragOver = (event) => {
    if (!isInteractive.value)
        return;
    event.dataTransfer.dropEffect = 'copy';
};
const handleDragLeave = (event) => {
    if (!isInteractive.value)
        return;
    dragCounter.value--;
    if (dragCounter.value === 0) {
        isDragOver.value = false;
        statusMessage.value = '';
    }
};
const handleDrop = (event) => {
    if (!isInteractive.value)
        return;
    dragCounter.value = 0;
    isDragOver.value = false;
    const files = event.dataTransfer?.files;
    if (files) {
        processFiles(Array.from(files));
        statusMessage.value = `${files.length} Datei(en) ausgewählt.`;
    }
};
const processFiles = (files) => {
    // Console check für leere Datei-Arrays
    if (!(files && files.length)) {
        console.warn('handleFilesSelected: empty file array');
        hasValidationError.value = true;
        statusMessage.value = 'Keine Datei ausgewählt. Bitte versuchen Sie es erneut.';
        return;
    }
    // Clear validation error
    hasValidationError.value = false;
    // Emit the files
    emit('files-selected', files);
    // Clear file input for next use
    if (fileInput.value) {
        fileInput.value.value = '';
    }
};
// Expose public methods if needed
const __VLS_exposed = {
    triggerFileInput,
    clearValidationError: () => {
        hasValidationError.value = false;
    }
};
defineExpose({
    triggerFileInput,
    clearValidationError: () => {
        hasValidationError.value = false;
    }
});
; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    acceptedFileTypes: '*',
    isUploading: false
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['file-drop-zone', 'file-drop-zone', 'file-drop-zone', 'file-drop-zone', 'border-primary', 'file-drop-zone',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.triggerFileInput) },
        ...{ onKeydown: (__VLS_ctx.triggerFileInput) },
        ...{ onKeydown: (__VLS_ctx.triggerFileInput) },
        ...{ onDragenter: (__VLS_ctx.handleDragEnter) },
        ...{ onDragover: (__VLS_ctx.handleDragOver) },
        ...{ onDragleave: (__VLS_ctx.handleDragLeave) },
        ...{ onDrop: (__VLS_ctx.handleDrop) },
        ref: ("dropZone"),
        ...{ class: ("file-drop-zone border border-2 border-dashed rounded p-4 text-center position-relative") },
        ...{ class: (({
                'border-primary bg-light': __VLS_ctx.isDragOver,
                'border-secondary': !__VLS_ctx.isDragOver,
                'border-danger': __VLS_ctx.hasValidationError
            })) },
        role: ("button"),
        tabindex: ("0"),
    });
    // @ts-ignore navigation for `const dropZone = ref()`
    /** @type { typeof __VLS_ctx.dropZone } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.handleFileSelect) },
        ref: ("fileInput"),
        type: ("file"),
        multiple: (true),
        ...{ class: ("d-none") },
        accept: ((__VLS_ctx.acceptedFileTypes)),
    });
    // @ts-ignore navigation for `const fileInput = ref()`
    /** @type { typeof __VLS_ctx.fileInput } */ ;
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("drop-zone-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-cloud-upload-alt fa-3x mb-3") },
        ...{ class: ((__VLS_ctx.isDragOver ? 'text-primary' : 'text-muted')) },
    });
    if (__VLS_ctx.isDragOver) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("h5 text-primary") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("h5 mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted mb-0") },
        });
    }
    if (__VLS_ctx.hasValidationError) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-3 mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle me-2") },
        });
    }
    if (__VLS_ctx.isUploading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary mb-2") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("fw-bold") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("visually-hidden") },
        'aria-live': ("assertive"),
        'aria-atomic': ("true"),
    });
    (__VLS_ctx.statusMessage);
    ['file-drop-zone', 'border', 'border-2', 'border-dashed', 'rounded', 'p-4', 'text-center', 'position-relative', 'border-primary', 'bg-light', 'border-secondary', 'border-danger', 'd-none', 'drop-zone-content', 'fas', 'fa-cloud-upload-alt', 'fa-3x', 'mb-3', 'h5', 'text-primary', 'h5', 'mb-2', 'text-muted', 'mb-0', 'alert', 'alert-danger', 'mt-3', 'mb-0', 'fas', 'fa-exclamation-triangle', 'me-2', 'position-absolute', 'top-0', 'start-0', 'w-100', 'h-100', 'd-flex', 'align-items-center', 'justify-content-center', 'bg-white', 'bg-opacity-75', 'text-center', 'spinner-border', 'text-primary', 'mb-2', 'visually-hidden', 'fw-bold', 'visually-hidden',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'dropZone': __VLS_nativeElements['div'],
        'fileInput': __VLS_nativeElements['input'],
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
            dropZone: dropZone,
            fileInput: fileInput,
            isDragOver: isDragOver,
            hasValidationError: hasValidationError,
            statusMessage: statusMessage,
            triggerFileInput: triggerFileInput,
            handleFileSelect: handleFileSelect,
            handleDragEnter: handleDragEnter,
            handleDragOver: handleDragOver,
            handleDragLeave: handleDragLeave,
            handleDrop: handleDrop,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
    __typeRefs: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
