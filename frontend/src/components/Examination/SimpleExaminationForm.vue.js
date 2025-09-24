import axiosInstance, { r } from '@/api/axiosInstance';
export default (await import('vue')).defineComponent({
    name: 'SimpleExaminationForm',
    props: {
        videoTimestamp: {
            type: Number,
            default: 0
        },
        videoId: {
            type: Number,
            required: true
        }
    },
    emits: ['examination-saved'],
    data() {
        return {
            loading: false,
            error: null,
            // Data arrays
            examinations: [],
            findings: [],
            locationClassifications: [],
            locationChoices: [],
            morphologyClassifications: [],
            morphologyChoices: [],
            interventions: [],
            // Selected IDs
            selectedExaminationId: null,
            selectedFindingId: null,
            selectedLocationClassificationId: null,
            selectedLocationChoiceId: null,
            selectedMorphologyClassificationId: null,
            selectedMorphologyChoiceId: null,
            selectedInterventions: [],
            // Form data
            notes: ''
        };
    },
    computed: {
        selectedExamination() {
            return this.examinations.find(e => e.id === this.selectedExaminationId) || null;
        },
        selectedFinding() {
            return this.findings.find(f => f.id === this.selectedFindingId) || null;
        },
        selectedLocationClassification() {
            return this.locationClassifications.find(lc => lc.id === this.selectedLocationClassificationId) || null;
        },
        selectedLocationChoice() {
            return this.locationChoices.find(lc => lc.id === this.selectedLocationChoiceId) || null;
        },
        selectedMorphologyClassification() {
            return this.morphologyClassifications.find(mc => mc.id === this.selectedMorphologyClassificationId) || null;
        },
        selectedMorphologyChoice() {
            return this.morphologyChoices.find(mc => mc.id === this.selectedMorphologyChoiceId) || null;
        },
        canSave() {
            return this.selectedExaminationId && this.selectedFindingId;
        },
        hasSelections() {
            return this.selectedExaminationId || this.selectedFindingId || this.selectedLocationClassificationId ||
                this.selectedMorphologyClassificationId || this.selectedInterventions.length > 0;
        }
    },
    methods: {
        async loadExaminations() {
            try {
                this.loading = true;
                this.error = null;
                const response = await axiosInstance.get(r('examinations/'));
                this.examinations = response.data;
            }
            catch (error) {
                this.error = 'Fehler beim Laden der Untersuchungstypen: ' + error.message;
                console.error('Error loading examinations:', error);
            }
            finally {
                this.loading = false;
            }
        },
        async onExaminationChange() {
            this.resetLowerLevels('examination');
            if (!this.selectedExaminationId)
                return;
            try {
                this.loading = true;
                this.error = null;
                // Load findings and location classifications for this examination
                const [findingsResponse, locationClassResponse] = await Promise.all([
                    axiosInstance.get(r(`examination/${this.selectedExaminationId}/findings/`)),
                    axiosInstance.get(r(`examination/${this.selectedExaminationId}/location-classifications/`))
                ]);
                this.findings = findingsResponse.data;
                this.locationClassifications = locationClassResponse.data;
                // Try to load morphology classifications (might not exist for all examinations)
                try {
                    const morphologyResponse = await axiosInstance.get(r(`examination/${this.selectedExaminationId}/morphology-classifications/`));
                    this.morphologyClassifications = morphologyResponse.data;
                }
                catch (err) {
                    console.warn('Morphology classifications not available for this examination:', err);
                    this.morphologyClassifications = [];
                }
            }
            catch (error) {
                this.error = 'Fehler beim Laden der Findings: ' + error.message;
                console.error('Error loading findings:', error);
            }
            finally {
                this.loading = false;
            }
        },
        async onFindingChange() {
            this.resetLowerLevels('finding');
            if (!this.selectedFindingId || !this.selectedExaminationId)
                return;
            try {
                this.loading = true;
                this.error = null;
                // Load interventions for this finding
                const response = await axiosInstance.get(r(`examination/${this.selectedExaminationId}/finding/${this.selectedFindingId}/interventions/`));
                this.interventions = response.data;
            }
            catch (error) {
                this.error = 'Fehler beim Laden der Interventionen: ' + error.message;
                console.error('Error loading interventions:', error);
            }
            finally {
                this.loading = false;
            }
        },
        async onLocationClassificationChange() {
            this.resetLowerLevels('locationClassification');
            if (!this.selectedLocationClassificationId || !this.selectedExaminationId)
                return;
            try {
                this.loading = true;
                this.error = null;
                // Load location choices for this classification
                const response = await axiosInstance.get(r(`examination/${this.selectedExaminationId}/location-classification/${this.selectedLocationClassificationId}/choices/`));
                this.locationChoices = response.data;
            }
            catch (error) {
                this.error = 'Fehler beim Laden der Lokalisationen: ' + error.message;
                console.error('Error loading location choices:', error);
            }
            finally {
                this.loading = false;
            }
        },
        async onMorphologyClassificationChange() {
            this.resetLowerLevels('morphologyClassification');
            if (!this.selectedMorphologyClassificationId || !this.selectedExaminationId)
                return;
            try {
                this.loading = true;
                this.error = null;
                // Load morphology choices for this classification
                const response = await axiosInstance.get(r(`examination/${this.selectedExaminationId}/morphology-classification/${this.selectedMorphologyClassificationId}/choices/`));
                this.morphologyChoices = response.data;
            }
            catch (error) {
                this.error = 'Fehler beim Laden der Morphologien: ' + error.message;
                console.error('Error loading morphology choices:', error);
            }
            finally {
                this.loading = false;
            }
        },
        resetLowerLevels(fromLevel) {
            switch (fromLevel) {
                case 'examination':
                    this.selectedFindingId = null;
                    this.findings = [];
                    this.locationClassifications = [];
                    this.morphologyClassifications = [];
                // Fall through
                case 'finding':
                    this.selectedLocationClassificationId = null;
                    this.selectedMorphologyClassificationId = null;
                    this.locationChoices = [];
                    this.morphologyChoices = [];
                    this.interventions = [];
                    this.selectedInterventions = [];
                // Fall through
                case 'locationClassification':
                    this.selectedLocationChoiceId = null;
                    this.locationChoices = [];
                    break;
                case 'morphologyClassification':
                    this.selectedMorphologyChoiceId = null;
                    this.morphologyChoices = [];
                    break;
            }
        },
        async saveExamination() {
            if (!this.canSave)
                return;
            try {
                this.loading = true;
                this.error = null;
                const examinationData = {
                    videoId: this.videoId,
                    timestamp: this.videoTimestamp,
                    examinationTypeId: this.selectedExaminationId,
                    findingId: this.selectedFindingId,
                    locationClassificationId: this.selectedLocationClassificationId || null,
                    locationChoiceId: this.selectedLocationChoiceId || null,
                    morphologyClassificationId: this.selectedMorphologyClassificationId || null,
                    morphologyChoiceId: this.selectedMorphologyChoiceId || null,
                    interventionIds: this.selectedInterventions,
                    notes: this.notes || null
                };
                const response = await axiosInstance.post(r('examinations/'), examinationData);
                this.$emit('examination-saved', response.data);
                this.resetForm();
            }
            catch (error) {
                this.error = 'Fehler beim Speichern: ' + error.message;
                console.error('Error saving examination:', error);
            }
            finally {
                this.loading = false;
            }
        },
        resetForm() {
            this.selectedExaminationId = null;
            this.selectedFindingId = null;
            this.selectedLocationClassificationId = null;
            this.selectedLocationChoiceId = null;
            this.selectedMorphologyClassificationId = null;
            this.selectedMorphologyChoiceId = null;
            this.selectedInterventions = [];
            this.notes = '';
            this.findings = [];
            this.locationClassifications = [];
            this.locationChoices = [];
            this.morphologyClassifications = [];
            this.morphologyChoices = [];
            this.interventions = [];
        }
    },
    mounted() {
        this.loadExaminations();
    }
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "examination-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-3" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
    });
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
    });
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.onExaminationChange) },
    value: (__VLS_ctx.selectedExaminationId),
    ...{ class: "form-select" },
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (null),
});
for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (exam.id),
        value: (exam.id),
    });
    (exam.name);
}
if (__VLS_ctx.selectedExaminationId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onFindingChange) },
        value: (__VLS_ctx.selectedFindingId),
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.findings.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.findings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (finding.id),
            value: (finding.id),
        });
        (finding.name);
    }
}
if (__VLS_ctx.selectedFindingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onLocationClassificationChange) },
        value: (__VLS_ctx.selectedLocationClassificationId),
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.locationClassifications.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [lc] of __VLS_getVForSourceType((__VLS_ctx.locationClassifications))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (lc.id),
            value: (lc.id),
        });
        (lc.name);
    }
}
if (__VLS_ctx.selectedLocationClassificationId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedLocationChoiceId),
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.locationChoices.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [choice] of __VLS_getVForSourceType((__VLS_ctx.locationChoices))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (choice.id),
            value: (choice.id),
        });
        (choice.name);
    }
}
if (__VLS_ctx.selectedFindingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.onMorphologyClassificationChange) },
        value: (__VLS_ctx.selectedMorphologyClassificationId),
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.morphologyClassifications.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [mc] of __VLS_getVForSourceType((__VLS_ctx.morphologyClassifications))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (mc.id),
            value: (mc.id),
        });
        (mc.name);
    }
}
if (__VLS_ctx.selectedMorphologyClassificationId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedMorphologyChoiceId),
        ...{ class: "form-select" },
        disabled: (__VLS_ctx.loading || !__VLS_ctx.morphologyChoices.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (null),
    });
    for (const [choice] of __VLS_getVForSourceType((__VLS_ctx.morphologyChoices))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (choice.id),
            value: (choice.id),
        });
        (choice.name);
    }
}
if (__VLS_ctx.selectedFindingId) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    if (__VLS_ctx.interventions.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-check-group" },
        });
        for (const [intervention] of __VLS_getVForSourceType((__VLS_ctx.interventions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (intervention.id),
                ...{ class: "form-check" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "checkbox",
                id: (`intervention-${intervention.id}`),
                value: (intervention.id),
                ...{ class: "form-check-input" },
            });
            (__VLS_ctx.selectedInterventions);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                for: (`intervention-${intervention.id}`),
                ...{ class: "form-check-label" },
            });
            (intervention.name);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "text-muted" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.notes),
    ...{ class: "form-control" },
    rows: "3",
    placeholder: "Zusätzliche Bemerkungen...",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveExamination) },
    disabled: (!__VLS_ctx.canSave || __VLS_ctx.loading),
    ...{ class: "btn btn-primary" },
});
(__VLS_ctx.loading ? 'Speichere...' : 'Untersuchung speichern');
if (__VLS_ctx.hasSelections) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 p-3 bg-light rounded" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "list-unstyled mb-0" },
    });
    if (__VLS_ctx.selectedExamination) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedExamination.name);
    }
    if (__VLS_ctx.selectedFinding) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedFinding.name);
    }
    if (__VLS_ctx.selectedLocationClassification) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedLocationClassification.name);
    }
    if (__VLS_ctx.selectedLocationChoice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedLocationChoice.name);
    }
    if (__VLS_ctx.selectedMorphologyClassification) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedMorphologyClassification.name);
    }
    if (__VLS_ctx.selectedMorphologyChoice) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedMorphologyChoice.name);
    }
    if (__VLS_ctx.selectedInterventions.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.interventions.filter(i => __VLS_ctx.selectedInterventions.includes(i.id)).map(i => i.name).join(', '));
    }
}
/** @type {__VLS_StyleScopedClasses['examination-form']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-label']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['list-unstyled']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
var __VLS_dollars;
let __VLS_self;
