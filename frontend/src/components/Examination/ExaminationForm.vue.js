import { defineComponent, ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportService } from '@/api/reportService';
import ClassificationCard from './ClassificationCard.vue';
export default defineComponent({
    components: {
        ClassificationCard
    },
    setup() {
        const examStore = useExaminationStore();
        const reportService = useReportService();
        const examinations = ref([]);
        const selectedExamId = ref(null);
        const activeCategory = ref('morphologyChoices');
        const form = ref({
            selectedMorphologies: [],
            selectedLocations: [],
            selectedInterventions: [],
            selectedInstruments: [],
        });
        const tempSelection = ref({
            morphologyChoiceId: undefined,
            locationChoiceId: undefined,
            interventionId: undefined,
            instrumentId: undefined,
        });
        async function loadExams() {
            examinations.value = await reportService.getExaminations();
            if (examinations.value.length) {
                selectedExamId.value = examinations.value[0].id;
                await onExamChange();
            }
        }
        async function onExamChange() {
            if (!selectedExamId.value)
                return;
            await examStore.fetchSubcategoriesForExam(selectedExamId.value);
            form.value = {
                selectedMorphologies: [],
                selectedLocations: [],
                selectedInterventions: [],
                selectedInstruments: [],
            };
            tempSelection.value = {
                morphologyChoiceId: undefined,
                locationChoiceId: undefined,
                interventionId: undefined,
                instrumentId: undefined,
            };
        }
        const subcategories = computed(() => {
            return selectedExamId.value !== null
                ? examStore.getCategories(selectedExamId.value)
                : { morphologyChoices: [], locationChoices: [], interventions: [], instruments: [] };
        });
        const categoryLabels = {
            morphologyChoices: 'Morphologie',
            locationChoices: 'Lokalisierung',
            interventions: 'Interventionen',
            instruments: 'Instrumente',
        };
        onMounted(loadExams);
        return {
            examinations,
            selectedExamId,
            activeCategory,
            form,
            tempSelection,
            subcategories,
            categoryLabels,
            onExamChange,
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    const __VLS_componentsOption = {
        ClassificationCard
    };
    let __VLS_components;
    let __VLS_directives;
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("examination-grid") },
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
    });
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((exam.id)),
            value: ((exam.id)),
        });
        (exam.name);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("options-panel") },
    });
    if (__VLS_ctx.activeCategory === 'morphologyChoices') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.tempSelection.morphologyChoiceId)),
            ...{ class: ("form-select") },
        });
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.morphologyChoices))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((opt.id)),
                value: ((opt.id)),
            });
            (opt.name);
        }
    }
    else if (__VLS_ctx.activeCategory === 'locationChoices') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.tempSelection.locationChoiceId)),
            ...{ class: ("form-select") },
        });
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.locationChoices))) {
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
    else if (__VLS_ctx.activeCategory === 'instruments') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.instruments))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((opt.id)),
                ...{ class: ("form-check") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.input)({
                type: ("checkbox"),
                id: ((`inst-${opt.id}`)),
                value: ((opt.id)),
                ...{ class: ("form-check-input") },
            });
            (__VLS_ctx.form.selectedInstruments);
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                for: ((`inst-${opt.id}`)),
                ...{ class: ("form-check-label") },
            });
            (opt.name);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("selected-summary mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-container") },
    });
    const __VLS_0 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Morphologie"),
        options: ((__VLS_ctx.subcategories.morphologyChoices)),
        modelValue: ((__VLS_ctx.form.selectedMorphologies)),
        tempValue: ((__VLS_ctx.tempSelection.morphologyChoiceId)),
        compact: (true),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Morphologie"),
        options: ((__VLS_ctx.subcategories.morphologyChoices)),
        modelValue: ((__VLS_ctx.form.selectedMorphologies)),
        tempValue: ((__VLS_ctx.tempSelection.morphologyChoiceId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_6;
    const __VLS_7 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.morphologyChoiceId = $event;
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
        label: ("Lokalisierung"),
        options: ((__VLS_ctx.subcategories.locationChoices)),
        modelValue: ((__VLS_ctx.form.selectedLocations)),
        tempValue: ((__VLS_ctx.tempSelection.locationChoiceId)),
        compact: (true),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Lokalisierung"),
        options: ((__VLS_ctx.subcategories.locationChoices)),
        modelValue: ((__VLS_ctx.form.selectedLocations)),
        tempValue: ((__VLS_ctx.tempSelection.locationChoiceId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_14;
    const __VLS_15 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.locationChoiceId = $event;
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
    const __VLS_24 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Instrumente"),
        options: ((__VLS_ctx.subcategories.instruments)),
        modelValue: ((__VLS_ctx.form.selectedInstruments)),
        tempValue: ((__VLS_ctx.tempSelection.instrumentId)),
        compact: (true),
    }));
    const __VLS_26 = __VLS_25({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Instrumente"),
        options: ((__VLS_ctx.subcategories.instruments)),
        modelValue: ((__VLS_ctx.form.selectedInstruments)),
        tempValue: ((__VLS_ctx.tempSelection.instrumentId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    let __VLS_30;
    const __VLS_31 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.instrumentId = $event;
        }
    };
    let __VLS_27;
    let __VLS_28;
    var __VLS_29;
    ['examination-grid', 'exam-select', 'form-select', 'categories-panel', 'list-group', 'list-group-item', 'options-panel', 'form-select', 'form-select', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'selected-summary', 'mt-4', 'card-container',];
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
