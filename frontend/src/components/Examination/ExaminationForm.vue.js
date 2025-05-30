import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportService } from '@/api/reportService';
import ClassificationCard from './ClassificationCard.vue';
import { storeToRefs } from 'pinia';
export default defineComponent({
    components: { ClassificationCard },
    setup() {
        const examStore = useExaminationStore();
        const reportService = useReportService();
        const { loading, error } = storeToRefs(examStore);
        const examinations = ref([]);
        const selectedExamId = ref(null);
        const activeCategory = ref('locationClassifications');
        const form = ref({
            selectedLocations: [],
            selectedInterventions: [],
            selectedFindings: [],
            selectedLocationClassifications: [],
            selectedMorphologyClassifications: [],
            selectedMorphologyChoices: [],
        });
        const tempSelection = ref({
            locationChoiceId: undefined,
            interventionId: undefined,
            morphologyChoiceId: undefined,
        });
        const selectedLocationClassificationId = ref(null);
        const selectedFindingId = ref(null);
        const selectedMorphologyClassificationId = ref(null);
        const colourMap = {
            locationClassifications: 'border-success',
            locationChoices: 'border-success',
            morphologyClassifications: 'border-success',
            morphologyChoices: 'border-success',
            findings: 'border-success',
            interventions: 'border-success'
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
            resetForm();
        }
        async function onLocationClassificationChange() {
            if (!selectedExamId.value || !selectedLocationClassificationId.value)
                return;
            await examStore.fetchLocationChoices(selectedExamId.value, selectedLocationClassificationId.value);
            form.value.selectedLocations = [];
            tempSelection.value.locationChoiceId = undefined;
            // Add the selected location classification to the form
            if (!form.value.selectedLocationClassifications.includes(selectedLocationClassificationId.value)) {
                form.value.selectedLocationClassifications.push(selectedLocationClassificationId.value);
            }
        }
        async function onMorphologyClassificationChange() {
            if (!selectedExamId.value || !selectedMorphologyClassificationId.value)
                return;
            await examStore.fetchMorphologyChoices(selectedExamId.value, selectedMorphologyClassificationId.value);
            form.value.selectedMorphologyChoices = [];
            tempSelection.value.morphologyChoiceId = undefined;
            // Add the selected morphology classification to the form
            if (!form.value.selectedMorphologyClassifications.includes(selectedMorphologyClassificationId.value)) {
                form.value.selectedMorphologyClassifications.push(selectedMorphologyClassificationId.value);
            }
        }
        async function onFindingChange() {
            if (!selectedExamId.value || !selectedFindingId.value)
                return;
            await examStore.fetchInterventions(selectedExamId.value, selectedFindingId.value);
            form.value.selectedInterventions = [];
            tempSelection.value.interventionId = undefined;
            // Add the selected finding to the form
            if (!form.value.selectedFindings.includes(selectedFindingId.value)) {
                form.value.selectedFindings.push(selectedFindingId.value);
            }
        }
        function resetForm() {
            form.value = {
                selectedLocations: [],
                selectedInterventions: [],
                selectedFindings: [],
                selectedLocationClassifications: [],
                selectedMorphologyClassifications: [],
                selectedMorphologyChoices: []
            };
            tempSelection.value = {
                locationChoiceId: undefined,
                interventionId: undefined,
                morphologyChoiceId: undefined
            };
            selectedLocationClassificationId.value = null;
            selectedFindingId.value = null;
            selectedMorphologyClassificationId.value = null;
        }
        const subcategories = computed(() => {
            return selectedExamId.value !== null
                ? examStore.getCategories(selectedExamId.value)
                : {
                    locationClassifications: [],
                    locationChoices: [],
                    morphologyClassifications: [],
                    morphologyChoices: [],
                    findings: [],
                    interventions: []
                };
        });
        const categoryLabels = {
            locationClassifications: 'Lokalisierung',
            morphologyClassifications: 'Morphologie',
            findings: 'Findings',
            interventions: 'Interventionen'
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
            onLocationClassificationChange,
            onMorphologyClassificationChange,
            onFindingChange,
            colourMap,
            selectedLocationClassificationId,
            selectedMorphologyClassificationId,
            selectedFindingId,
            loading,
            error,
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    const __VLS_componentsOption = { ClassificationCard };
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
    if (__VLS_ctx.activeCategory === 'locationClassifications') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onLocationClassificationChange) },
            value: ((__VLS_ctx.selectedLocationClassificationId)),
            ...{ class: ("form-select mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [cls] of __VLS_getVForSourceType((__VLS_ctx.subcategories.locationClassifications))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((cls.id)),
                value: ((cls.id)),
            });
            (cls.name);
        }
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
    else if (__VLS_ctx.activeCategory === 'morphologyClassifications') {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onMorphologyClassificationChange) },
            value: ((__VLS_ctx.selectedMorphologyClassificationId)),
            ...{ class: ("form-select mb-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [cls] of __VLS_getVForSourceType((__VLS_ctx.subcategories.morphologyClassifications))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((cls.id)),
                value: ((cls.id)),
            });
            (cls.name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.tempSelection.morphologyChoiceId)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((undefined)),
        });
        for (const [opt] of __VLS_getVForSourceType((__VLS_ctx.subcategories.morphologyChoices))) {
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
            ...{ onChange: (__VLS_ctx.onFindingChange) },
            value: ((__VLS_ctx.selectedFindingId)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ((null)),
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.subcategories.findings))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((finding.id)),
                value: ((finding.id)),
            });
            (finding.name);
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
        label: ("Morphologie"),
        options: ((__VLS_ctx.subcategories.morphologyChoices)),
        modelValue: ((__VLS_ctx.form.selectedMorphologyChoices)),
        tempValue: ((__VLS_ctx.tempSelection.morphologyChoiceId)),
        compact: (true),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onUpdate:tempValue': {} },
        label: ("Morphologie"),
        options: ((__VLS_ctx.subcategories.morphologyChoices)),
        modelValue: ((__VLS_ctx.form.selectedMorphologyChoices)),
        tempValue: ((__VLS_ctx.tempSelection.morphologyChoiceId)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_14;
    const __VLS_15 = {
        'onUpdate:tempValue': (...[$event]) => {
            __VLS_ctx.tempSelection.morphologyChoiceId = $event;
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
        label: ("Findings"),
        options: ((__VLS_ctx.subcategories.findings)),
        modelValue: ((__VLS_ctx.form.selectedFindings)),
        compact: (true),
    }));
    const __VLS_26 = __VLS_25({
        label: ("Findings"),
        options: ((__VLS_ctx.subcategories.findings)),
        modelValue: ((__VLS_ctx.form.selectedFindings)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_25));
    const __VLS_30 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
        label: ("Lokalisations Klassifikationen"),
        options: ((__VLS_ctx.subcategories.locationClassifications)),
        modelValue: ((__VLS_ctx.form.selectedLocationClassifications)),
        compact: (true),
    }));
    const __VLS_32 = __VLS_31({
        label: ("Lokalisations Klassifikationen"),
        options: ((__VLS_ctx.subcategories.locationClassifications)),
        modelValue: ((__VLS_ctx.form.selectedLocationClassifications)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_31));
    const __VLS_36 = {}.ClassificationCard;
    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
    // @ts-ignore
    const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
        label: ("Morphologie Klassifikationen"),
        options: ((__VLS_ctx.subcategories.morphologyClassifications)),
        modelValue: ((__VLS_ctx.form.selectedMorphologyClassifications)),
        compact: (true),
    }));
    const __VLS_38 = __VLS_37({
        label: ("Morphologie Klassifikationen"),
        options: ((__VLS_ctx.subcategories.morphologyClassifications)),
        modelValue: ((__VLS_ctx.form.selectedMorphologyClassifications)),
        compact: (true),
    }, ...__VLS_functionalComponentArgsRest(__VLS_37));
    ['examination-view', 'exam-header', 'exam-select', 'form-select', 'refresh-btn', 'alert', 'alert-info', 'mt-2', 'alert', 'alert-danger', 'mt-2', 'exam-body', 'categories-panel', 'list-group', 'list-group-item', 'editor-panel', 'category-editor', 'form-select', 'mb-2', 'form-select', 'form-select', 'mb-2', 'form-select', 'form-select', 'form-check', 'form-check-input', 'form-check-label', 'card-container',];
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
