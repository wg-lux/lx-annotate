import axiosInstance, { r } from '@/api/axiosInstance';
import ClassificationCard from '../Examination/ClassificationCard.vue';
export default (await import('vue')).defineComponent({
    name: 'SimpleExaminationForm',
    components: {
        ClassificationCard
    },
    props: {
        videoTimestamp: {
            type: Number,
            required: true
        },
        videoId: {
            type: [Number, String],
            default: null
        }
    },
    emits: ['examination-saved'],
    data() {
        return {
            // Available data
            availableExaminations: [],
            availableFindings: [],
            locationClassifications: [],
            morphologyClassifications: [],
            // Current selections
            selectedExamination: null,
            selectedFinding: null,
            // Current finding data
            currentFindingData: null,
            // Form state
            notes: '',
            loading: false,
            error: null,
            examinationDataLoaded: false
        };
    },
    computed: {
        canSave() {
            return this.selectedExamination &&
                this.selectedFinding &&
                this.currentFindingData &&
                this.videoId !== null &&
                this.validationErrors.length === 0;
        },
        validationErrors() {
            const errors = [];
            if (!this.selectedExamination) {
                errors.push('Untersuchungstyp erforderlich');
            }
            if (!this.selectedFinding) {
                errors.push('Befund erforderlich');
            }
            // Check for required location classifications
            if (this.currentFindingData) {
                const requiredLocationClassifications = this.locationClassifications.filter(c => c.required);
                for (const classification of requiredLocationClassifications) {
                    const hasSelection = this.getSelectedLocationChoices(classification.id).length > 0;
                    if (!hasSelection) {
                        errors.push(`${classification.name_de || classification.name} erforderlich`);
                    }
                }
                // Check for required morphology classifications
                const requiredMorphologyClassifications = this.morphologyClassifications.filter(c => c.required);
                for (const classification of requiredMorphologyClassifications) {
                    const hasSelection = this.getSelectedMorphologyChoices(classification.id).length > 0;
                    if (!hasSelection) {
                        errors.push(`${classification.name_de || classification.name} erforderlich`);
                    }
                }
            }
            return errors;
        }
    },
    watch: {
        videoId() {
            this.resetForm();
        }
    },
    methods: {
        async loadExaminations() {
            try {
                this.loading = true;
                this.error = null;
                const response = await axiosInstance.get(r('examinations/'));
                this.availableExaminations = response.data || [];
                console.log('Loaded examinations:', this.availableExaminations);
            }
            catch (error) {
                console.error('Error loading examinations:', error);
                this.error = 'Fehler beim Laden der Untersuchungstypen';
            }
            finally {
                this.loading = false;
            }
        },
        async loadExaminationData() {
            if (!this.selectedExamination) {
                this.examinationDataLoaded = false;
                return;
            }
            try {
                this.loading = true;
                this.error = null;
                // Load findings
                const findingsResponse = await axiosInstance.get(r('findings/'));
                this.availableFindings = findingsResponse.data || [];
                // Load classifications
                const [locationResponse, morphologyResponse] = await Promise.all([
                    axiosInstance.get(r('location-classifications/')),
                    axiosInstance.get(r('morphology-classifications/'))
                ]);
                this.locationClassifications = locationResponse.data || [];
                this.morphologyClassifications = morphologyResponse.data || [];
                console.log('Loaded examination data:', {
                    findings: this.availableFindings.length,
                    locationClassifications: this.locationClassifications.length,
                    morphologyClassifications: this.morphologyClassifications.length
                });
                this.examinationDataLoaded = true;
                // Reset selections
                this.selectedFinding = null;
                this.currentFindingData = null;
            }
            catch (error) {
                console.error('Error loading examination data:', error);
                this.error = 'Fehler beim Laden der Untersuchungsdaten';
                this.examinationDataLoaded = false;
            }
            finally {
                this.loading = false;
            }
        },
        onFindingChange() {
            if (this.selectedFinding) {
                // Initialize finding data
                this.currentFindingData = {
                    findingId: this.selectedFinding,
                    selectedLocationChoices: [],
                    selectedMorphologyChoices: []
                };
            }
            else {
                this.currentFindingData = null;
            }
        },
        getLocationChoicesForClassification(classificationId) {
            const classification = this.locationClassifications.find(c => c.id === classificationId);
            if (!classification || !classification.choices)
                return [];
            return classification.choices.map(choice => ({
                id: choice.id,
                name: choice.name_de || choice.name
            }));
        },
        getMorphologyChoicesForClassification(classificationId) {
            const classification = this.morphologyClassifications.find(c => c.id === classificationId);
            if (!classification || !classification.choices)
                return [];
            return classification.choices.map(choice => ({
                id: choice.id,
                name: choice.name_de || choice.name
            }));
        },
        getSelectedLocationChoices(classificationId) {
            if (!this.currentFindingData)
                return [];
            const classification = this.locationClassifications.find(c => c.id === classificationId);
            if (!classification)
                return [];
            return this.currentFindingData.selectedLocationChoices.filter(choiceId => classification.choices && classification.choices.some(choice => choice.id === choiceId));
        },
        getSelectedMorphologyChoices(classificationId) {
            if (!this.currentFindingData)
                return [];
            const classification = this.morphologyClassifications.find(c => c.id === classificationId);
            if (!classification)
                return [];
            return this.currentFindingData.selectedMorphologyChoices.filter(choiceId => classification.choices && classification.choices.some(choice => choice.id === choiceId));
        },
        updateLocationChoices(classificationId, choiceIds) {
            if (!this.currentFindingData)
                return;
            const classification = this.locationClassifications.find(c => c.id === classificationId);
            if (!classification)
                return;
            // Remove all choices from this classification
            const otherChoices = this.currentFindingData.selectedLocationChoices.filter(choiceId => !classification.choices || !classification.choices.some(choice => choice.id === choiceId));
            // Add new choices
            this.currentFindingData.selectedLocationChoices = [...otherChoices, ...choiceIds];
        },
        updateMorphologyChoices(classificationId, choiceIds) {
            if (!this.currentFindingData)
                return;
            const classification = this.morphologyClassifications.find(c => c.id === classificationId);
            if (!classification)
                return;
            // Remove all choices from this classification
            const otherChoices = this.currentFindingData.selectedMorphologyChoices.filter(choiceId => !classification.choices || !classification.choices.some(choice => choice.id === choiceId));
            // Add new choices
            this.currentFindingData.selectedMorphologyChoices = [...otherChoices, ...choiceIds];
        },
        async saveExamination() {
            if (!this.canSave || !this.videoId)
                return;
            const examinationData = {
                video_id: this.videoId,
                examination_type_id: this.selectedExamination,
                finding_id: this.selectedFinding,
                timestamp: this.videoTimestamp,
                location_choices: this.currentFindingData.selectedLocationChoices,
                morphology_choices: this.currentFindingData.selectedMorphologyChoices,
                notes: this.notes,
                created_at: new Date().toISOString()
            };
            try {
                this.loading = true;
                const response = await axiosInstance.post(r('video-examinations/'), examinationData);
                this.$emit('examination-saved', response.data);
                // Reset form
                this.resetForm();
                // Show success feedback
                console.log('Examination saved successfully:', response.data);
            }
            catch (error) {
                console.error('Error saving examination:', error);
                this.error = 'Fehler beim Speichern der Untersuchung';
            }
            finally {
                this.loading = false;
            }
        },
        resetForm() {
            this.selectedExamination = null;
            this.selectedFinding = null;
            this.currentFindingData = null;
            this.notes = '';
            this.examinationDataLoaded = false;
            this.error = null;
        }
    },
    mounted() {
        this.loadExaminations();
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
        ...{ class: ("simple-examination-form") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-label") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        ...{ onChange: (__VLS_ctx.loadExaminationData) },
        value: ((__VLS_ctx.selectedExamination)),
        ...{ class: ("form-select") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (""),
    });
    for (const [exam] of __VLS_getVForSourceType((__VLS_ctx.availableExaminations))) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: ((exam.id)),
            value: ((exam.id)),
        });
        (exam.name);
    }
    if (__VLS_ctx.selectedExamination && __VLS_ctx.examinationDataLoaded) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("examination-details") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.onFindingChange) },
            value: ((__VLS_ctx.selectedFinding)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.availableFindings))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((finding.id)),
                value: ((finding.id)),
            });
            (finding.name_de || finding.name);
        }
        if (__VLS_ctx.selectedFinding && __VLS_ctx.currentFindingData) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("classification-section") },
            });
            if (__VLS_ctx.locationClassifications.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mb-4") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                    ...{ class: ("mb-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("classification-cards") },
                });
                for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.locationClassifications))) {
                    const __VLS_0 = {}.ClassificationCard;
                    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
                    // @ts-ignore
                    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
                        ...{ 'onUpdate:modelValue': {} },
                        key: ((`location-${classification.id}`)),
                        label: ((classification.name_de || classification.name)),
                        options: ((__VLS_ctx.getLocationChoicesForClassification(classification.id))),
                        modelValue: ((__VLS_ctx.getSelectedLocationChoices(classification.id))),
                        compact: ((true)),
                        singleSelect: ((false)),
                    }));
                    const __VLS_2 = __VLS_1({
                        ...{ 'onUpdate:modelValue': {} },
                        key: ((`location-${classification.id}`)),
                        label: ((classification.name_de || classification.name)),
                        options: ((__VLS_ctx.getLocationChoicesForClassification(classification.id))),
                        modelValue: ((__VLS_ctx.getSelectedLocationChoices(classification.id))),
                        compact: ((true)),
                        singleSelect: ((false)),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
                    let __VLS_6;
                    const __VLS_7 = {
                        'onUpdate:modelValue': (...[$event]) => {
                            if (!((__VLS_ctx.selectedExamination && __VLS_ctx.examinationDataLoaded)))
                                return;
                            if (!((__VLS_ctx.selectedFinding && __VLS_ctx.currentFindingData)))
                                return;
                            if (!((__VLS_ctx.locationClassifications.length > 0)))
                                return;
                            __VLS_ctx.updateLocationChoices(classification.id, $event);
                        }
                    };
                    let __VLS_3;
                    let __VLS_4;
                    var __VLS_5;
                }
            }
            if (__VLS_ctx.morphologyClassifications.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("mb-4") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                    ...{ class: ("mb-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("classification-cards") },
                });
                for (const [classification] of __VLS_getVForSourceType((__VLS_ctx.morphologyClassifications))) {
                    const __VLS_8 = {}.ClassificationCard;
                    /** @type { [typeof __VLS_components.ClassificationCard, ] } */ ;
                    // @ts-ignore
                    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                        ...{ 'onUpdate:modelValue': {} },
                        key: ((`morphology-${classification.id}`)),
                        label: ((classification.name_de || classification.name)),
                        options: ((__VLS_ctx.getMorphologyChoicesForClassification(classification.id))),
                        modelValue: ((__VLS_ctx.getSelectedMorphologyChoices(classification.id))),
                        compact: ((true)),
                        singleSelect: ((false)),
                    }));
                    const __VLS_10 = __VLS_9({
                        ...{ 'onUpdate:modelValue': {} },
                        key: ((`morphology-${classification.id}`)),
                        label: ((classification.name_de || classification.name)),
                        options: ((__VLS_ctx.getMorphologyChoicesForClassification(classification.id))),
                        modelValue: ((__VLS_ctx.getSelectedMorphologyChoices(classification.id))),
                        compact: ((true)),
                        singleSelect: ((false)),
                    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
                    let __VLS_14;
                    const __VLS_15 = {
                        'onUpdate:modelValue': (...[$event]) => {
                            if (!((__VLS_ctx.selectedExamination && __VLS_ctx.examinationDataLoaded)))
                                return;
                            if (!((__VLS_ctx.selectedFinding && __VLS_ctx.currentFindingData)))
                                return;
                            if (!((__VLS_ctx.morphologyClassifications.length > 0)))
                                return;
                            __VLS_ctx.updateMorphologyChoices(classification.id, $event);
                        }
                    };
                    let __VLS_11;
                    let __VLS_12;
                    var __VLS_13;
                }
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                value: ((__VLS_ctx.notes)),
                ...{ class: ("form-control") },
                rows: ("3"),
                placeholder: ("Zusätzliche Bemerkungen..."),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-grid") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.saveExamination) },
                ...{ class: ("btn btn-primary") },
                disabled: ((!__VLS_ctx.canSave)),
            });
            if (__VLS_ctx.validationErrors.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("alert alert-warning mt-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                    ...{ class: ("mb-0 mt-1") },
                });
                for (const [error] of __VLS_getVForSourceType((__VLS_ctx.validationErrors))) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                        key: ((error)),
                    });
                    (error);
                }
            }
        }
        else if (__VLS_ctx.selectedExamination && __VLS_ctx.availableFindings.length === 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons me-2") },
            });
        }
    }
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border spinner-border-sm") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("ms-2") },
        });
    }
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons me-2") },
        });
        (__VLS_ctx.error);
    }
    ['simple-examination-form', 'mb-3', 'form-label', 'form-select', 'examination-details', 'mb-3', 'form-label', 'form-select', 'classification-section', 'mb-4', 'mb-3', 'classification-cards', 'mb-4', 'mb-3', 'classification-cards', 'mb-3', 'form-label', 'form-control', 'd-grid', 'btn', 'btn-primary', 'alert', 'alert-warning', 'mt-3', 'text-muted', 'mb-0', 'mt-1', 'alert', 'alert-info', 'material-icons', 'me-2', 'text-center', 'py-3', 'spinner-border', 'spinner-border-sm', 'visually-hidden', 'ms-2', 'alert', 'alert-danger', 'material-icons', 'me-2',];
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
