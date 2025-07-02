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
exports.default = (await Promise.resolve().then(() => __importStar(require('vue')))).defineComponent({
    data() {
        return {
            randomNames: [], // Array to store multiple random names
            selectedGender: "", // Default gender selection (empty string)
            femaleFirstNames: [],
            femaleLastNames: [],
            maleFirstNames: [],
            maleLastNames: [],
            errorMessage: "" // Variable to store error messages
        };
    },
    methods: {
        async loadNames() {
            const loadNameFile = async (filePath) => {
                const response = await fetch(filePath);
                const text = await response.text();
                // Ersetzen von \r\n durch \n und dann Splitten
                return text.replace(/\r\n/g, '\n').split('\n').map(name => name.trim()).filter(name => name.length > 0);
            };
            // Load female and male names
            this.femaleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_female_ascii.txt');
            this.femaleLastNames = await loadNameFile('./assets/names-dictionary/last_names_female_ascii.txt');
            this.maleFirstNames = await loadNameFile('./assets/names-dictionary/first_names_male_ascii.txt');
            this.maleLastNames = await loadNameFile('./assets/names-dictionary/last_names_male_ascii.txt');
            // Validation: Ensure first names and last names arrays have equal lengths
            if (this.femaleFirstNames.length !== this.femaleLastNames.length) {
                this.errorMessage = "Female first names and last names are not of the same length.";
                return;
            }
            if (this.maleFirstNames.length !== this.maleLastNames.length) {
                this.errorMessage = "Male first names and last names are not of the same length.";
                return;
            }
            // Clear any previous error message after successful load
            this.errorMessage = "";
        },
        getRandomIndex(array) {
            // Return a random index from the array
            return Math.floor(Math.random() * array.length);
        },
        generateRandomName(gender) {
            if (!this.selectedGender) {
                this.errorMessage = 'Please specify the gender before adding a random name.';
                return;
            }
            let firstNameArray, lastNameArray;
            switch (gender) {
                case 'male':
                    firstNameArray = this.maleFirstNames;
                    lastNameArray = this.maleLastNames;
                    break;
                case 'female':
                    firstNameArray = this.femaleFirstNames;
                    lastNameArray = this.femaleLastNames;
                    break;
                default:
                    this.errorMessage = 'Invalid gender selected.';
                    return;
            }
            // Clear the error message if everything is fine
            this.errorMessage = "";
            // Ensure arrays are not empty and have the same length (validated earlier)
            const randomIndex = this.getRandomIndex(firstNameArray);
            // Return the first name and last name at the same index
            const firstNameSelected = firstNameArray[randomIndex];
            const lastNameSelected = lastNameArray[randomIndex];
            return `${firstNameSelected} ${lastNameSelected}`;
        },
        handleAddRandomName() {
            const randomName = this.generateRandomName(this.selectedGender); // Pass the selected gender
            if (randomName) {
                this.randomNames.push(randomName); // Add to the array of random names if valid
            }
        },
        removeName(index) {
            this.randomNames.splice(index, 1); // Remove the name at the given index
        }
    },
    async created() {
        await this.loadNames(); // Load names when the component is created
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['name-item',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        value: ("male"),
    });
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
        type: ("radio"),
        value: ("female"),
    });
    (__VLS_ctx.selectedGender);
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleAddRandomName) },
        ...{ class: ("btn btn-success") },
    });
    if (__VLS_ctx.errorMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ style: ({}) },
        });
        (__VLS_ctx.errorMessage);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("name-list") },
    });
    const __VLS_0 = {}.KeepAlive;
    /** @type { [typeof __VLS_components.KeepAlive, typeof __VLS_components.keepAlive, typeof __VLS_components.KeepAlive, typeof __VLS_components.keepAlive, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    for (const [name, index] of __VLS_getVForSourceType((__VLS_ctx.randomNames))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: ((index)),
            ...{ class: ("name-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("highlighted-name") },
        });
        (name);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.removeName(index);
                } },
            ...{ class: ("btn btn-danger btn-sm") },
        });
    }
    __VLS_5.slots.default;
    var __VLS_5;
    ['btn', 'btn-success', 'name-list', 'name-item', 'highlighted-name', 'btn', 'btn-danger', 'btn-sm',];
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
let __VLS_self;
