import { ref, computed, onMounted } from 'vue';
const props = withDefaults(defineProps(), {
    maxFrames: 1000
});
const emit = defineEmits();
// Reactive state
const loading = ref(false);
const analyzing = ref(false);
const processing = ref(false);
const error = ref('');
const successMessage = ref('');
// Analysis controls
const frameNumber = ref(null);
const checkNames = ref(true);
const checkDates = ref(true);
const autoCrop = ref(false);
// Results
const analysisResult = ref(null);
// Computed
const statusClass = computed(() => {
    const status = props.patientData?.anonymization_status;
    switch (status) {
        case 'anonymized': return 'status-success';
        case 'validated_pending_anonymization': return 'status-warning';
        case 'pending_validation': return 'status-danger';
        default: return 'status-info';
    }
});
const statusIcon = computed(() => {
    const status = props.patientData?.anonymization_status;
    switch (status) {
        case 'anonymized': return 'fas fa-check-circle';
        case 'validated_pending_anonymization': return 'fas fa-clock';
        case 'pending_validation': return 'fas fa-exclamation-triangle';
        default: return 'fas fa-question-circle';
    }
});
const statusText = computed(() => {
    const status = props.patientData?.anonymization_status;
    switch (status) {
        case 'anonymized': return 'Anonymisiert';
        case 'validated_pending_anonymization': return 'Validiert - Anonymisierung ausstehend';
        case 'pending_validation': return 'Validierung erforderlich';
        case 'no_sensitive_data': return 'Keine sensitiven Daten';
        default: return 'Status unbekannt';
    }
});
const canCompleteValidation = computed(() => {
    return analysisResult.value && !analysisResult.value.sensitive_data_found;
});
const showCompleteButton = computed(() => {
    return props.patientData?.requires_validation && analysisResult.value;
});
// Methods
const generateNewPseudonyms = async () => {
    if (!props.patientData?.sensitive_meta_id) {
        error.value = 'Keine SensitiveMeta-ID verfügbar';
        return;
    }
    try {
        loading.value = true;
        error.value = '';
        const response = await fetch('/api/generate-temporary-pseudonym/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sensitive_meta_id: props.patientData.sensitive_meta_id,
                regenerate: true
            })
        });
        if (!response.ok) {
            throw new Error('Fehler beim Generieren der Pseudonamen');
        }
        const data = await response.json();
        // Update patient data mit neuen Pseudonamen
        const updatedData = {
            ...props.patientData,
            pseudonym_first_name: data.pseudonym_first_name,
            pseudonym_last_name: data.pseudonym_last_name
        };
        emit('patient-data-updated', updatedData);
        successMessage.value = 'Neue temporäre Pseudonamen generiert!';
        setTimeout(() => {
            successMessage.value = '';
        }, 3000);
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Generieren der Pseudonamen';
    }
    finally {
        loading.value = false;
    }
};
const analyzeFrame = async () => {
    try {
        analyzing.value = true;
        error.value = '';
        analysisResult.value = null;
        const response = await fetch('/api/validate-video-anonymization/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                video_id: props.videoId,
                frame_number: frameNumber.value,
                check_names: checkNames.value,
                check_dates: checkDates.value,
                auto_crop: autoCrop.value
            })
        });
        if (!response.ok) {
            throw new Error('Fehler bei der Frame-Analyse');
        }
        const data = await response.json();
        analysisResult.value = data;
        if (data.analysis?.sensitive_data_found) {
            error.value = `Sensitive Daten im Frame ${data.frame_number} gefunden!`;
        }
        else {
            successMessage.value = `Frame ${data.frame_number} erfolgreich validiert - keine sensitiven Daten gefunden.`;
            setTimeout(() => {
                successMessage.value = '';
            }, 5000);
        }
    }
    catch (err) {
        error.value = err.message || 'Fehler bei der Frame-Analyse';
    }
    finally {
        analyzing.value = false;
    }
};
const completeValidation = async () => {
    try {
        processing.value = true;
        // Hier würde die Logik zur Validierung-Abschluss implementiert
        // z.B. SensitiveMeta als validiert markieren
        successMessage.value = 'Validierung erfolgreich abgeschlossen!';
        emit('validation-completed');
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Abschließen der Validierung';
    }
    finally {
        processing.value = false;
    }
};
const requiresCropping = () => {
    emit('cropping-required');
};
const formatDate = (dateString) => {
    if (!dateString)
        return 'Nicht verfügbar';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }
    catch {
        return 'Ungültig';
    }
};
const getIssueTypeText = (type) => {
    const typeMap = {
        'patient_first_name': 'Vorname',
        'patient_last_name': 'Nachname',
        'patient_dob': 'Geburtsdatum',
        'examination_date': 'Untersuchungsdatum'
    };
    return typeMap[type] || type;
};
const getRecommendationIcon = (priority) => {
    switch (priority.toLowerCase()) {
        case 'high': return 'fas fa-exclamation-triangle text-danger';
        case 'medium': return 'fas fa-exclamation-circle text-warning';
        case 'low': return 'fas fa-info-circle text-info';
        default: return 'fas fa-info-circle';
    }
};
// Lifecycle
onMounted(() => {
    // Auto-generate pseudonyms if not available
    if (props.patientData?.sensitive_meta_id &&
        (!props.patientData?.pseudonym_first_name || !props.patientData?.pseudonym_last_name)) {
        generateNewPseudonyms();
    }
}); /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    maxFrames: 1000
});
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['validator-title', 'card-title', 'data-item', 'data-item', 'validator-header', 'action-buttons',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("anonymization-validator") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("validator-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: ("validator-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-shield-alt") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("status-badge") },
        ...{ class: ((__VLS_ctx.statusClass)) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ((__VLS_ctx.statusIcon)) },
    });
    (__VLS_ctx.statusText);
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle") },
        });
        (__VLS_ctx.error);
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-check-circle") },
        });
        (__VLS_ctx.successMessage);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-comparison") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card real-data-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user text-danger") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge bg-danger") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("sensitive-data") },
    });
    (__VLS_ctx.patientData?.patient_first_name || 'Nicht verfügbar');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("sensitive-data") },
    });
    (__VLS_ctx.patientData?.patient_last_name || 'Nicht verfügbar');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("sensitive-data") },
    });
    (__VLS_ctx.formatDate(__VLS_ctx.patientData?.patient_dob));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("sensitive-data") },
    });
    (__VLS_ctx.formatDate(__VLS_ctx.patientData?.examination_date));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card pseudo-data-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user-secret text-success") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge bg-success") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("pseudo-data") },
    });
    (__VLS_ctx.patientData?.pseudonym_first_name || 'Wird generiert...');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("pseudo-data") },
    });
    (__VLS_ctx.patientData?.pseudonym_last_name || 'Wird generiert...');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("text-info") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("data-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.generateNewPseudonyms) },
        ...{ class: ("btn btn-outline-primary btn-sm") },
        disabled: ((__VLS_ctx.loading)),
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm me-1") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-refresh") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("frame-analysis-section") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: ("card-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-search") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("analysis-controls") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        type: ("number"),
        ...{ class: ("form-control") },
        min: ((1)),
        max: ((__VLS_ctx.maxFrames)),
        placeholder: ("Auto (zufällig)"),
    });
    (__VLS_ctx.frameNumber);
    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: ("text-muted") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ class: ("form-check-input") },
        type: ("checkbox"),
        id: ("checkNames"),
    });
    (__VLS_ctx.checkNames);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-check-label") },
        for: ("checkNames"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ class: ("form-check-input") },
        type: ("checkbox"),
        id: ("checkDates"),
    });
    (__VLS_ctx.checkDates);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-check-label") },
        for: ("checkDates"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.analyzeFrame) },
        ...{ class: ("btn btn-primary") },
        disabled: ((__VLS_ctx.analyzing)),
    });
    if (__VLS_ctx.analyzing) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("spinner-border spinner-border-sm me-1") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-magnifying-glass") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("form-check mt-2") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ class: ("form-check-input") },
        type: ("checkbox"),
        id: ("autoCrop"),
    });
    (__VLS_ctx.autoCrop);
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: ("form-check-label") },
        for: ("autoCrop"),
    });
    if (__VLS_ctx.analysisResult) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("analysis-results mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("result-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
        if (__VLS_ctx.analysisResult.sensitive_data_found) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-danger") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-exclamation-triangle") },
            });
            (__VLS_ctx.analysisResult.issue_count);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-success") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check") },
            });
        }
        if (__VLS_ctx.analysisResult.issues && __VLS_ctx.analysisResult.issues.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("issues-list") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: ("text-danger") },
            });
            for (const [issue] of __VLS_getVForSourceType((__VLS_ctx.analysisResult.issues))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("alert alert-warning") },
                    key: ((issue.type)),
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-exclamation-triangle") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.getIssueTypeText(issue.type));
                (issue.message);
            }
        }
        if (__VLS_ctx.analysisResult.recommendations) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("recommendations") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            for (const [rec] of __VLS_getVForSourceType((__VLS_ctx.analysisResult.recommendations))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: ((rec.action)),
                    ...{ class: ("recommendation") },
                    ...{ class: ((`priority-${rec.priority.toLowerCase()}`)) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ((__VLS_ctx.getRecommendationIcon(rec.priority))) },
                });
                (rec.message);
            }
        }
        if (__VLS_ctx.analysisResult.crop_result) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("crop-result") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert") },
                ...{ class: ((__VLS_ctx.analysisResult.crop_result.status === 'success' ? 'alert-success' : 'alert-danger')) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((__VLS_ctx.analysisResult.crop_result.status === 'success' ? 'fas fa-check' : 'fas fa-times')) },
            });
            (__VLS_ctx.analysisResult.crop_result.message || __VLS_ctx.analysisResult.crop_result.error);
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("action-buttons") },
    });
    if (__VLS_ctx.showCompleteButton) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.completeValidation) },
            ...{ class: ("btn btn-success") },
            disabled: ((!__VLS_ctx.canCompleteValidation || __VLS_ctx.processing)),
        });
        if (__VLS_ctx.processing) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-check-double") },
            });
        }
    }
    if (__VLS_ctx.analysisResult?.sensitive_data_found && !__VLS_ctx.analysisResult?.crop_result) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.requiresCropping) },
            ...{ class: ("btn btn-warning") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-crop") },
        });
    }
    ['anonymization-validator', 'validator-header', 'validator-title', 'fas', 'fa-shield-alt', 'status-badge', 'alert', 'alert-danger', 'fas', 'fa-exclamation-triangle', 'alert', 'alert-success', 'fas', 'fa-check-circle', 'patient-comparison', 'row', 'col-md-6', 'card', 'real-data-card', 'card-header', 'card-title', 'fas', 'fa-user', 'text-danger', 'badge', 'bg-danger', 'card-body', 'data-item', 'sensitive-data', 'data-item', 'sensitive-data', 'data-item', 'sensitive-data', 'data-item', 'sensitive-data', 'col-md-6', 'card', 'pseudo-data-card', 'card-header', 'card-title', 'fas', 'fa-user-secret', 'text-success', 'badge', 'bg-success', 'card-body', 'data-item', 'pseudo-data', 'data-item', 'pseudo-data', 'data-item', 'text-info', 'data-item', 'btn', 'btn-outline-primary', 'btn-sm', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-refresh', 'frame-analysis-section', 'card', 'card-header', 'card-title', 'fas', 'fa-search', 'card-body', 'analysis-controls', 'row', 'col-md-4', 'form-group', 'form-control', 'text-muted', 'col-md-4', 'form-group', 'form-check', 'form-check-input', 'form-check-label', 'form-check', 'form-check-input', 'form-check-label', 'col-md-4', 'form-group', 'btn', 'btn-primary', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-magnifying-glass', 'form-check', 'mt-2', 'form-check-input', 'form-check-label', 'analysis-results', 'mt-4', 'result-header', 'badge', 'bg-danger', 'fas', 'fa-exclamation-triangle', 'badge', 'bg-success', 'fas', 'fa-check', 'issues-list', 'text-danger', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'recommendations', 'recommendation', 'crop-result', 'alert', 'action-buttons', 'btn', 'btn-success', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-check-double', 'btn', 'btn-warning', 'fas', 'fa-crop',];
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
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            analyzing: analyzing,
            processing: processing,
            error: error,
            successMessage: successMessage,
            frameNumber: frameNumber,
            checkNames: checkNames,
            checkDates: checkDates,
            autoCrop: autoCrop,
            analysisResult: analysisResult,
            statusClass: statusClass,
            statusIcon: statusIcon,
            statusText: statusText,
            canCompleteValidation: canCompleteValidation,
            showCompleteButton: showCompleteButton,
            generateNewPseudonyms: generateNewPseudonyms,
            analyzeFrame: analyzeFrame,
            completeValidation: completeValidation,
            requiresCropping: requiresCropping,
            formatDate: formatDate,
            getIssueTypeText: getIssueTypeText,
            getRecommendationIcon: getRecommendationIcon,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
