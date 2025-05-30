import axiosInstance, { r } from '@/api/axiosInstance';
export default (await import('vue')).defineComponent({
    name: 'SimpleExaminationForm',
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
            availableExaminations: [],
            selectedExamination: null,
            locationClassifications: [],
            findings: [],
            interventions: [],
            selectedLocation: null,
            selectedFinding: null,
            selectedInterventions: [],
            notes: ''
        };
    },
    computed: {
        canSave() {
            return this.selectedExamination &&
                (this.selectedLocation || this.selectedFinding) &&
                this.videoId !== null; // Ensure we have a valid video ID
        },
        hasSelections() {
            return this.selectedLocation || this.selectedFinding || this.selectedInterventions.length > 0;
        }
    },
    watch: {
        videoId() {
            this.resetForm();
            this.selectedExamination = null;
        }
    },
    methods: {
        async loadExaminations() {
            try {
                const response = await axiosInstance.get(r('examinations/'));
                this.availableExaminations = response.data;
            }
            catch (error) {
                console.error('Error loading examinations:', error);
            }
        },
        async loadExaminationData() {
            if (!this.selectedExamination)
                return;
            try {
                // Load location classifications
                const locationResponse = await axiosInstance.get(r(`examination/${this.selectedExamination}/location-classifications/`));
                this.locationClassifications = locationResponse.data;
                // Load findings
                const findingsResponse = await axiosInstance.get(r(`examination/${this.selectedExamination}/findings/`));
                this.findings = findingsResponse.data;
                // Reset selections
                this.selectedLocation = null;
                this.selectedFinding = null;
                this.selectedInterventions = [];
                this.interventions = [];
            }
            catch (error) {
                console.error('Error loading examination data:', error);
            }
        },
        async loadInterventions() {
            if (!this.selectedExamination || !this.selectedFinding)
                return;
            try {
                const response = await axiosInstance.get(r(`examination/${this.selectedExamination}/finding/${this.selectedFinding}/interventions/`));
                this.interventions = response.data;
                this.selectedInterventions = [];
            }
            catch (error) {
                console.error('Error loading interventions:', error);
            }
        },
        async saveExamination() {
            if (!this.canSave || !this.videoId)
                return;
            const examinationData = {
                video_id: this.videoId,
                examination_type_id: this.selectedExamination,
                timestamp: this.videoTimestamp,
                location_classification_id: this.selectedLocation,
                finding_id: this.selectedFinding,
                intervention_ids: this.selectedInterventions,
                notes: this.notes,
                created_at: new Date().toISOString()
            };
            try {
                const response = await axiosInstance.post(r('video-examinations/'), examinationData);
                this.$emit('examination-saved', response.data);
                // Reset form
                this.resetForm();
                // Show success feedback
                alert('Untersuchung erfolgreich gespeichert!');
            }
            catch (error) {
                console.error('Error saving examination:', error);
                alert('Fehler beim Speichern der Untersuchung');
            }
        },
        resetForm() {
            this.selectedLocation = null;
            this.selectedFinding = null;
            this.selectedInterventions = [];
            this.notes = '';
        },
        // Helper functions for display names
        getLocationName(id) {
            return this.locationClassifications.find(l => l.id === id)?.name || '';
        },
        getFindingName(id) {
            return this.findings.find(f => f.id === id)?.name || '';
        },
        getInterventionName(id) {
            return this.interventions.find(i => i.id === id)?.name || '';
        }
    },
    mounted() {
        this.loadExaminations();
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
    if (__VLS_ctx.selectedExamination) {
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
            value: ((__VLS_ctx.selectedLocation)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        for (const [location] of __VLS_getVForSourceType((__VLS_ctx.locationClassifications))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((location.id)),
                value: ((location.id)),
            });
            (location.name);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("mb-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (__VLS_ctx.loadInterventions) },
            value: ((__VLS_ctx.selectedFinding)),
            ...{ class: ("form-select") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        for (const [finding] of __VLS_getVForSourceType((__VLS_ctx.findings))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: ((finding.id)),
                value: ((finding.id)),
            });
            (finding.name);
        }
        if (__VLS_ctx.selectedFinding && __VLS_ctx.interventions.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mb-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: ("form-label") },
            });
            for (const [intervention] of __VLS_getVForSourceType((__VLS_ctx.interventions))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((intervention.id)),
                    ...{ class: ("form-check") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
                    type: ("checkbox"),
                    id: ((`intervention-${intervention.id}`)),
                    value: ((intervention.id)),
                    ...{ class: ("form-check-input") },
                });
                (__VLS_ctx.selectedInterventions);
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    for: ((`intervention-${intervention.id}`)),
                    ...{ class: ("form-check-label") },
                });
                (intervention.name);
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
        if (__VLS_ctx.hasSelections) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3 p-2 bg-light rounded") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("mb-0 mt-1") },
            });
            if (__VLS_ctx.selectedLocation) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.getLocationName(__VLS_ctx.selectedLocation));
            }
            if (__VLS_ctx.selectedFinding) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.getFindingName(__VLS_ctx.selectedFinding));
            }
            if (__VLS_ctx.selectedInterventions.length > 0) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
                (__VLS_ctx.selectedInterventions.map(id => __VLS_ctx.getInterventionName(id)).join(', '));
            }
        }
    }
    ['simple-examination-form', 'mb-3', 'form-label', 'form-select', 'examination-details', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-select', 'mb-3', 'form-label', 'form-check', 'form-check-input', 'form-check-label', 'mb-3', 'form-label', 'form-control', 'd-grid', 'btn', 'btn-primary', 'mt-3', 'p-2', 'bg-light', 'rounded', 'text-muted', 'mb-0', 'mt-1',];
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
