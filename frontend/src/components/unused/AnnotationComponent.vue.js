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
Object.defineProperty(exports, "__esModule", { value: true });
const API_URL = 'http://127.0.0.1:8000/api';
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    name: 'UnifiedAnnotationComponent',
    data() {
        return {
            selectedGender: '',
            randomFirstNames: [],
            randomLastNames: [],
            randomFullNames: [],
            droppedNames: [],
            errorMessage: '',
            uploadedFile: null,
            processedImageUrl: null,
            originalImageUrl: null,
            showOriginal: false,
            femaleFirstNames: [],
            femaleLastNames: [],
            maleFirstNames: [],
            maleLastNames: []
        };
    },
    computed: {
        canSubmit() {
            return this.processedImageUrl && this.droppedNames.length > 0;
        },
        displayedImageUrl() {
            return this.showOriginal ? this.originalImageUrl : this.processedImageUrl;
        }
    },
    methods: {
        async loadNames() {
            const loadNameFile = async (filePath) => {
                try {
                    const response = await fetch(filePath);
                    const text = await response.text();
                    return text.replace(/\r\n/g, '\n')
                        .split('\n')
                        .map(name => name.trim())
                        .filter(name => name.length > 0);
                }
                catch (error) {
                    console.error(`Error loading names from ${filePath}:`, error);
                    throw error;
                }
            };
            try {
                // Load all name files
                this.femaleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_female_ascii.txt');
                this.femaleLastNames = await loadNameFile('./assets/names-dictionary/last_names_female_ascii.txt');
                this.maleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_male_ascii.txt');
                this.maleLastNames = await loadNameFile('./assets/names-dictionary/last_names_male_ascii.txt');
                // Validate loaded names
                if (!this.femaleFirstNames.length || !this.femaleLastNames.length ||
                    !this.maleFirstNames.length || !this.maleLastNames.length) {
                    throw new Error("One or more name lists are empty");
                }
                this.errorMessage = "";
            }
            catch (error) {
                this.errorMessage = `Failed to load names: ${error.message}`;
            }
        },
        getRandomName(array) {
            return array[Math.floor(Math.random() * array.length)];
        },
        handleAddRandomFirstName() {
            if (!this.selectedGender) {
                this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
                return;
            }
            const nameArray = this.selectedGender === 'male' ? this.maleFirstNames : this.femaleFirstNames;
            const randomName = this.getRandomName(nameArray);
            this.randomFirstNames.push(randomName);
        },
        handleAddRandomLastName() {
            if (!this.selectedGender) {
                this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
                return;
            }
            const nameArray = this.selectedGender === 'male' ? this.maleLastNames : this.femaleLastNames;
            const randomName = this.getRandomName(nameArray);
            this.randomLastNames.push(randomName);
        },
        handleAddRandomFullName() {
            if (!this.selectedGender) {
                this.errorMessage = 'Bitte wählen Sie ein Geschlecht aus.';
                return;
            }
            const firstNames = this.selectedGender === 'male' ? this.maleFirstNames : this.femaleFirstNames;
            const lastNames = this.selectedGender === 'male' ? this.maleLastNames : this.femaleLastNames;
            const firstName = this.getRandomName(firstNames);
            const lastName = this.getRandomName(lastNames);
            this.randomFullNames.push(`${firstName} ${lastName}`);
        },
        removeName(type, index) {
            switch (type) {
                case 'firstName':
                    this.randomFirstNames.splice(index, 1);
                    break;
                case 'lastName':
                    this.randomLastNames.splice(index, 1);
                    break;
                case 'fullName':
                    this.randomFullNames.splice(index, 1);
                    break;
            }
        },
        handleDragStart(nameData, event) {
            event.dataTransfer.setData('text/plain', JSON.stringify(nameData));
        },
        handleDrop(event) {
            const rect = this.$refs.imageCard.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const nameData = JSON.parse(event.dataTransfer.getData('text/plain'));
            this.droppedNames.push({
                ...nameData,
                x,
                y,
                displayText: nameData.name
            });
        },
        toggleImage() {
            this.showOriginal = !this.showOriginal;
        },
        async handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file)
                return;
            const formData = new FormData();
            formData.append('file', file);
            formData.append('validation', 'true');
            try {
                const response = await fetch(`${API_URL}/process-file/`, {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok)
                    throw new Error('Upload failed');
                const data = await response.json();
                this.processedImageUrl = data.processed_file_url;
                this.originalImageUrl = data.original_image_url;
                this.uploadedFile = file;
                if (data.gender_pars) {
                    this.selectedGender = data.gender_pars.toLowerCase();
                }
                this.errorMessage = '';
            }
            catch (error) {
                this.errorMessage = `Upload failed: ${error.message}`;
            }
        },
        async saveAnnotation() {
            if (!this.canSubmit)
                return;
            const annotationData = {
                image_name: this.uploadedFile?.name,
                original_image_url: this.originalImageUrl,
                processed_image_url: this.processedImageUrl,
                dropped_names: this.droppedNames.map(({ name, type, x, y }) => ({
                    name,
                    type,
                    x,
                    y
                }))
            };
            try {
                const response = await fetch(`${API_URL}/annotations/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify(annotationData)
                });
                if (!response.ok)
                    throw new Error('Failed to save annotation');
                this.$emit('annotation-saved', await response.json());
                this.resetForm();
            }
            catch (error) {
                this.errorMessage = `Failed to save: ${error.message}`;
            }
        },
        getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2)
                return parts.pop().split(';').shift();
        },
        resetForm() {
            this.randomFirstNames = [];
            this.randomLastNames = [];
            this.randomFullNames = [];
            this.droppedNames = [];
            this.uploadedFile = null;
            this.processedImageUrl = null;
            this.originalImageUrl = null;
            this.showOriginal = false;
            this.errorMessage = '';
        }
    },
    async created() {
        await this.loadNames();
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['image-container', 'name-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
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
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-control-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.handleFileUpload) },
        type: ("file"),
        ...{ class: ("form-control") },
        accept: ("image/*"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDrop: (__VLS_ctx.handleDrop) },
        ...{ onDragover: () => { } },
        ...{ class: ("card mb-4 position-relative") },
        ref: ("imageCard"),
    });
    // @ts-ignore navigation for `const imageCard = ref()`
    /** @type { typeof __VLS_ctx.imageCard } */ ;
    if (__VLS_ctx.displayedImageUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
            src: ((__VLS_ctx.displayedImageUrl)),
            ...{ class: ("img-fluid") },
            alt: ("Displayed Image"),
        });
    }
    if (__VLS_ctx.originalImageUrl) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("position-absolute top-0 end-0 m-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.toggleImage) },
            ...{ class: ("btn btn-info btn-sm") },
        });
        (__VLS_ctx.showOriginal ? 'Show Processed' : 'Show Original');
    }
    for (const [nameData, index] of __VLS_getVForSourceType((__VLS_ctx.droppedNames))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onDragstart: (...[$event]) => {
                    __VLS_ctx.handleDragStart(nameData, $event);
                } },
            key: ((index)),
            ...{ style: (({
                    top: nameData.y + 'px',
                    left: nameData.x + 'px',
                    position: 'absolute',
                    cursor: 'move'
                })) },
            ...{ class: ("dropped-name") },
            draggable: ("true"),
        });
        (nameData.displayText);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card bg-light") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check form-check-inline") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ class: ("form-check-input") },
        type: ("radio"),
        id: ("male"),
        value: ("male"),
    });
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-check-label") },
        for: ("male"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check form-check-inline") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ class: ("form-check-input") },
        type: ("radio"),
        id: ("female"),
        value: ("female"),
    });
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-check-label") },
        for: ("female"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleAddRandomFirstName) },
        ...{ class: ("btn btn-info me-2") },
        disabled: ((!__VLS_ctx.selectedGender)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleAddRandomLastName) },
        ...{ class: ("btn btn-info me-2") },
        disabled: ((!__VLS_ctx.selectedGender)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleAddRandomFullName) },
        ...{ class: ("btn btn-info") },
        disabled: ((!__VLS_ctx.selectedGender)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("name-lists mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("name-list mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    for (const [name, index] of __VLS_getVForSourceType((__VLS_ctx.randomFirstNames))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onDragstart: (...[$event]) => {
                    __VLS_ctx.handleDragStart({ type: 'firstName', name }, $event);
                } },
            key: (('first-' + index)),
            ...{ class: ("name-item card p-3 d-flex flex-row align-items-center mb-2") },
            draggable: ("true"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.removeName('firstName', index);
                } },
            ...{ class: ("btn btn-danger btn-sm ms-auto") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("name-list mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    for (const [name, index] of __VLS_getVForSourceType((__VLS_ctx.randomLastNames))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onDragstart: (...[$event]) => {
                    __VLS_ctx.handleDragStart({ type: 'lastName', name }, $event);
                } },
            key: (('last-' + index)),
            ...{ class: ("name-item card p-3 d-flex flex-row align-items-center mb-2") },
            draggable: ("true"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.removeName('lastName', index);
                } },
            ...{ class: ("btn btn-danger btn-sm ms-auto") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("name-list") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    for (const [name, index] of __VLS_getVForSourceType((__VLS_ctx.randomFullNames))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onDragstart: (...[$event]) => {
                    __VLS_ctx.handleDragStart({ type: 'fullName', name }, $event);
                } },
            key: (('full-' + index)),
            ...{ class: ("name-item card p-3 d-flex flex-row align-items-center mb-2") },
            draggable: ("true"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        (name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.removeName('fullName', index);
                } },
            ...{ class: ("btn btn-danger btn-sm ms-auto") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAnnotation) },
        ...{ class: ("btn btn-primary") },
        disabled: ((!__VLS_ctx.canSubmit)),
    });
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-3") },
            role: ("alert"),
        });
        (__VLS_ctx.errorMessage);
    }
    ['container-fluid', 'py-4', 'card', 'card-header', 'pb-0', 'mb-0', 'card-body', 'row', 'mb-4', 'col-12', 'form-group', 'form-control-label', 'form-control', 'row', 'mb-4', 'col-12', 'card', 'mb-4', 'position-relative', 'img-fluid', 'position-absolute', 'top-0', 'end-0', 'm-2', 'btn', 'btn-info', 'btn-sm', 'dropped-name', 'row', 'mb-4', 'col-12', 'card', 'bg-light', 'card-body', 'card-title', 'mb-3', 'form-label', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'form-check', 'form-check-inline', 'form-check-input', 'form-check-label', 'mb-3', 'btn', 'btn-info', 'me-2', 'btn', 'btn-info', 'me-2', 'btn', 'btn-info', 'name-lists', 'mt-4', 'name-list', 'mb-3', 'name-item', 'card', 'p-3', 'd-flex', 'flex-row', 'align-items-center', 'mb-2', 'btn', 'btn-danger', 'btn-sm', 'ms-auto', 'name-list', 'mb-3', 'name-item', 'card', 'p-3', 'd-flex', 'flex-row', 'align-items-center', 'mb-2', 'btn', 'btn-danger', 'btn-sm', 'ms-auto', 'name-list', 'name-item', 'card', 'p-3', 'd-flex', 'flex-row', 'align-items-center', 'mb-2', 'btn', 'btn-danger', 'btn-sm', 'ms-auto', 'row', 'col-12', 'btn', 'btn-primary', 'alert', 'alert-danger', 'mt-3',];
    var __VLS_slots;
    var $slots;
    let __VLS_inheritedAttrs;
    var $attrs;
    const __VLS_refs = {
        'imageCard': __VLS_nativeElements['div'],
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
let __VLS_self;
