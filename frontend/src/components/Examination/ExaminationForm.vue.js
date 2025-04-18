import { defineComponent, ref, computed, onMounted } from 'vue';
import { useExaminationStore } from '@/stores/examinationStore';
import { useReportService } from '@/api/reportService';
export default defineComponent({
    setup() {
        const examStore = useExaminationStore();
        const reportService = useReportService();
        const examinations = ref([]);
        const selectedExamId = ref(null);
        const activeCategory = ref('morphologyChoices');
        const form = ref({
            morphologyChoiceId: null,
            locationChoiceId: null,
            selectedInterventions: [],
            selectedInstruments: [],
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
            // reset form
            form.value = { morphologyChoiceId: null, locationChoiceId: null, selectedInterventions: [], selectedInstruments: [] };
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
            subcategories,
            categoryLabels,
            onExamChange,
        };
    }
});
; /* PartiallyEnd: #3632/script.vue */
function __VLS_template() {
    const __VLS_ctx = {};
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
            value: ((__VLS_ctx.form.morphologyChoiceId)),
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
            value: ((__VLS_ctx.form.locationChoiceId)),
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
    ['examination-grid', 'exam-select', 'form-select', 'categories-panel', 'list-group', 'list-group-item', 'options-panel', 'form-select', 'form-select', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label',];
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
