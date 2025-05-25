"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vue_1 = require("vue");
const examinationStore_1 = require("@/stores/examinationStore");
const reportService_1 = require("@/api/reportService");
const ClassificationCard_vue_1 = __importDefault(require("./ClassificationCard.vue"));
const pinia_1 = require("pinia");
exports.default = (0, vue_1.defineComponent)({
    components: { ClassificationCard: ClassificationCard_vue_1.default },
    setup() {
        const examStore = (0, examinationStore_1.useExaminationStore)();
        const reportService = (0, reportService_1.useReportService)();
        const { loading, error } = (0, pinia_1.storeToRefs)(examStore);
        const examinations = (0, vue_1.ref)([]);
        const selectedExamId = (0, vue_1.ref)(null);
        const activeCategory = (0, vue_1.ref)('locationChoices');
        const form = (0, vue_1.ref)({
            selectedLocations: [],
            selectedInterventions: [],
            selectedFindings: [],
        });
        const tempSelection = (0, vue_1.ref)({
            locationChoiceId: undefined,
            interventionId: undefined,
            findingId: undefined,
        });
        const colourMap = {
            locationChoices: 'border-success',
            findings: 'border-success',
            interventions: 'border-success',
        };
        async function loadExams() {
            try {
                examinations.value = await reportService.getExaminations();
                if (examinations.value.length) {
                    selectedExamId.value = examinations.value[0].id;
                    await onExamChange();
                    activeCategory.value = Object.keys(categoryLabels)[0];
                }
            }
            catch (err) {
                console.error("Fehler beim Laden der initialen Daten:", err);
            }
        }
        async function onExamChange() {
            if (!selectedExamId.value)
                return;
            await examStore.fetchSubcategoriesForExam(selectedExamId.value);
            form.value = {
                selectedLocations: [],
                selectedInterventions: [],
                selectedFindings: [],
            };
            tempSelection.value = {
                locationChoiceId: undefined,
                interventionId: undefined,
                findingId: undefined,
            };
        }
        const subcategories = (0, vue_1.computed)(() => {
            return selectedExamId.value !== null
                ? examStore.getCategories(selectedExamId.value)
                : { locationChoices: [], interventions: [], findings: [] };
        });
        const categoryLabels = {
            locationChoices: 'Lokalisierung',
            findings: 'Findings',
            interventions: 'Interventionen',
        };
        (0, vue_1.onMounted)(loadExams);
        return {
            examinations,
            selectedExamId,
            activeCategory,
            form,
            tempSelection,
            subcategories,
            categoryLabels,
            onExamChange,
            colourMap,
            loading,
            error,
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    const __VLS_componentsOption = { ClassificationCard: ClassificationCard_vue_1.default };
    let __VLS_components;
    let __VLS_directives;
    ['editor-panel',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("examination-view") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("exam-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("exam-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        for: ("examSelect"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onExamChange) },
        id: ("examSelect"),
        value: ((__VLS_ctx.selectedExamId)),
        ...{ class: ("form-select") },
        disabled: ((__VLS_ctx.loading)),
    });
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((exam.id)),
            value: ((exam.id)),
        });
        (exam.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.onExamChange) },
        ...{ class: ("refresh-btn") },
        disabled: ((__VLS_ctx.loading)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-info mt-2") },
        });
    }
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger mt-2") },
        });
        (__VLS_ctx.error);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("exam-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: ("categories-panel") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("list-group") },
    });
    for (const [label, key] of __VLS_getVForSourceType((__VLS_ctx.categoryLabels))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.activeCategory = key;
                } },
            key: ((key)),
            ...{ class: ((['list-group-item', __VLS_ctx.activeCategory === key ? 'active' : ''])) },
        });
        (label);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: ("editor-panel") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("category-editor") },
        ...{ class: ((__VLS_ctx.colourMap[__VLS_ctx.activeCategory])) },
    });
    if (__VLS_ctx.activeCategory === 'locationChoices') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.tempSelection.locationChoiceId)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((undefined)),
        });
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.locationChoices))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((opt.id)),
                value: ((opt.id)),
            });
            (opt.name);
        }
    }
    else if (__VLS_ctx.activeCategory === 'findings') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.tempSelection.findingId)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((undefined)),
        });
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.findings))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((opt.id)),
                value: ((opt.id)),
            });
            (opt.name);
        }
    }
    else if (__VLS_ctx.activeCategory === 'interventions') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.interventions))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((opt.id)),
                ...{ class: ("form-check") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                type: ("checkbox"),
                id: ((`int-${opt.id}`)),
                value: ((opt.id)),
                ...{ class: ("form-check-input") },
            });
            (__VLS_ctx.form.selectedInterventions);
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                for: ((`int-${opt.id}`)),
                ...{ class: ("form-check-label") },
            });
            (opt.name);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-container") },
    });
    const __VLS_0 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Lokalisierung"),
        options: ((__VLS_ctx.subcategories.locationChoices)),
        modelValue: ((__VLS_ctx.form.selectedLocations)),
        tempValue: ((__VLS_ctx.tempSelection.locationChoiceId)),
        compact: (true),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Lokalisierung"),
        options: ((__VLS_ctx.subcategories.locationChoices)),
        modelValue: ((__VLS_ctx.form.selectedLocations)),
        tempValue: ((__VLS_ctx.tempSelection.locationChoiceId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_6;
    const __VLS_7 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.locationChoiceId = $event;
        }
    };
    let __VLS_3;
    let __VLS_4;
    var __VLS_5;
    const __VLS_8 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Findings"),
        options: ((__VLS_ctx.subcategories.findings)),
        modelValue: ((__VLS_ctx.form.selectedFindings)),
        tempValue: ((__VLS_ctx.tempSelection.findingId)),
        compact: (true),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Findings"),
        options: ((__VLS_ctx.subcategories.findings)),
        modelValue: ((__VLS_ctx.form.selectedFindings)),
        tempValue: ((__VLS_ctx.tempSelection.findingId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_14;
    const __VLS_15 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.findingId = $event;
        }
    };
    let __VLS_11;
    let __VLS_12;
    var __VLS_13;
    const __VLS_16 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Interventionen"),
        options: ((__VLS_ctx.subcategories.interventions)),
        modelValue: ((__VLS_ctx.form.selectedInterventions)),
        tempValue: ((__VLS_ctx.tempSelection.interventionId)),
        compact: (true),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Interventionen"),
        options: ((__VLS_ctx.subcategories.interventions)),
        modelValue: ((__VLS_ctx.form.selectedInterventions)),
        tempValue: ((__VLS_ctx.tempSelection.interventionId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_22;
    const __VLS_23 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.interventionId = $event;
        }
    };
    let __VLS_19;
    let __VLS_20;
    var __VLS_21;
    ['examination-view', 'exam-header', 'exam-select', 'form-select', 'refresh-btn', 'alert', 'alert-info', 'mt-2', 'alert', 'alert-danger', 'mt-2', 'exam-body', 'categories-panel', 'list-group', 'list-group-item', 'editor-panel', 'category-editor', 'form-select', 'form-select', 'form-check', 'form-check-input', 'form-check-label', 'card-container',];
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
