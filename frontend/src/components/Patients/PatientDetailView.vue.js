import { ref, computed } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { patientService } from '@/api/patientService';
import PatientEditForm from './PatientEditForm.vue';
import camelcaseKeys from 'camelcase-keys';
const props = defineProps();
const emit = defineEmits();
// Composables
const patientStore = usePatientStore();
// Reactive state
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const showEditForm = ref(false);
const showDeletionModal = ref(false);
const deleting = ref(false);
const deletionCheck = ref(null);
const generatingPseudonym = ref(false);
// Computed
const genders = computed(() => patientStore.genders);
const centers = computed(() => patientStore.centers);
// Methods
const checkDeletionSafety = async () => {
    try {
        loading.value = true;
        error.value = '';
        // Call the backend safety check endpoint
        const response = await fetch(`/api/patients/${props.patient.id}/check_deletion_safety/`);
        if (!response.ok) {
            throw new Error('Fehler beim Prüfen der Löschbarkeit');
        }
        deletionCheck.value = await response.json();
        showDeletionModal.value = true;
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Prüfen der Löschbarkeit';
    }
    finally {
        loading.value = false;
    }
};
const confirmDeletion = async () => {
    try {
        deleting.value = true;
        await patientService.deletePatient(props.patient.id);
        successMessage.value = `Patient "${props.patient.firstName} ${props.patient.lastName}" wurde erfolgreich gelöscht.`;
        emit('patient-deleted', props.patient.id);
        closeDeletionModal();
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Löschen des Patienten';
    }
    finally {
        deleting.value = false;
    }
};
const closeDeletionModal = () => {
    showDeletionModal.value = false;
    deletionCheck.value = null;
};
const onPatientUpdated = (updatedPatient) => {
    showEditForm.value = false;
    successMessage.value = `Patient wurde erfolgreich aktualisiert.`;
    emit('patient-updated', updatedPatient);
    // Clear success message after 5 seconds
    setTimeout(() => {
        successMessage.value = '';
    }, 5000);
};
const onPatientDeleted = (patientId) => {
    showEditForm.value = false;
    emit('patient-deleted', patientId);
};
const formatDate = (dateString) => {
    if (!dateString)
        return 'Nicht angegeben';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE');
    }
    catch {
        return 'Ungültig';
    }
};
const formatDateTime = (dateString) => {
    if (!dateString)
        return 'Nicht angegeben';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('de-DE');
    }
    catch {
        return 'Ungültig';
    }
};
const getGenderDisplay = (genderValue) => {
    if (!genderValue)
        return 'Nicht angegeben';
    const gender = genders.value.find(g => g.name === genderValue);
    return gender?.nameDe || gender?.name || genderValue;
};
const getCenterDisplay = (centerValue) => {
    if (!centerValue)
        return 'Nicht zugeordnet';
    const center = centers.value.find(c => c.name === centerValue);
    return center?.nameDe || center?.name || centerValue;
};
// Pseudonamen-Funktionalität
const generatePseudonym = async () => {
    try {
        generatingPseudonym.value = true;
        error.value = '';
        const response = await fetch('/api/patients/${props.patient.id}/pseudonym//', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sensitive_meta_id: props.patient.sensitiveMetaId,
                regenerate: false
            })
        });
        if (!response.ok) {
            throw new Error('Fehler beim Generieren der Pseudonamen');
        }
        const data = await response.json();
        // Convert snake_case to camelCase
        const convertedData = camelcaseKeys(data, { deep: true });
        // Update patient data mit neuen Pseudonamen
        const updatedPatient = {
            ...props.patient,
            pseudonymFirstName: convertedData.pseudonymFirstName,
            pseudonymLastName: convertedData.pseudonymLastName
        };
        emit('patient-updated', updatedPatient);
        successMessage.value = 'Pseudonamen erfolgreich generiert!';
        setTimeout(() => {
            successMessage.value = '';
        }, 3000);
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Generieren der Pseudonamen';
    }
    finally {
        generatingPseudonym.value = false;
    }
};
const regeneratePseudonym = async () => {
    try {
        generatingPseudonym.value = true;
        error.value = '';
        const response = await fetch('/api/patients/${props.patient.id}/pseudonym//', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sensitive_meta_id: props.patient.sensitiveMetaId,
                regenerate: true
            })
        });
        if (!response.ok) {
            throw new Error('Fehler beim Regenerieren der Pseudonamen');
        }
        const data = await response.json();
        // Convert snake_case to camelCase
        const convertedData = camelcaseKeys(data, { deep: true });
        // Update patient data mit neuen Pseudonamen
        const updatedPatient = {
            ...props.patient,
            pseudonymFirstName: convertedData.pseudonymFirstName,
            pseudonymLastName: convertedData.pseudonymLastName
        };
        emit('patient-updated', updatedPatient);
        successMessage.value = 'Neue Pseudonamen erfolgreich generiert!';
        setTimeout(() => {
            successMessage.value = '';
        }, 3000);
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Regenerieren der Pseudonamen';
    }
    finally {
        generatingPseudonym.value = false;
    }
}; /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['patient-title', 'card-title', 'info-item', 'info-item', 'link', 'badge', 'object-count', 'detail-header', 'patient-header-info', 'detail-actions', 'modal-dialog',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-detail-view") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-header-info") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("patient-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user") },
    });
    (__VLS_ctx.patient.firstName);
    (__VLS_ctx.patient.lastName);
    if (__VLS_ctx.patient.isRealPerson) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-success") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-shield-alt") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-secondary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user-secret") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('close');
            } },
        ...{ class: ("btn btn-secondary btn-sm") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-times") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showEditForm = true;
            } },
        ...{ class: ("btn btn-primary btn-sm") },
        disabled: ((__VLS_ctx.loading || __VLS_ctx.showEditForm)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-edit") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.checkDeletionSafety) },
        ...{ class: ("btn btn-outline-danger btn-sm") },
        disabled: ((__VLS_ctx.loading || __VLS_ctx.showEditForm)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-trash") },
    });
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
    if (__VLS_ctx.showEditForm) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("edit-section") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-edit") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        // @ts-ignore
        /** @type { [typeof PatientEditForm, ] } */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(PatientEditForm, new PatientEditForm({
            ...{ 'onPatientUpdated': {} },
            ...{ 'onPatientDeleted': {} },
            ...{ 'onCancel': {} },
            patient: ((__VLS_ctx.patient)),
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onPatientUpdated': {} },
            ...{ 'onPatientDeleted': {} },
            ...{ 'onCancel': {} },
            patient: ((__VLS_ctx.patient)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onPatientUpdated: (__VLS_ctx.onPatientUpdated)
        };
        const __VLS_7 = {
            onPatientDeleted: (__VLS_ctx.onPatientDeleted)
        };
        const __VLS_8 = {
            onCancel: (...[$event]) => {
                if (!((__VLS_ctx.showEditForm)))
                    return;
                __VLS_ctx.showEditForm = false;
            }
        };
        let __VLS_2;
        let __VLS_3;
        var __VLS_4;
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-info-display") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card info-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-grid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.patient.firstName || 'Nicht angegeben');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.patient.lastName || 'Nicht angegeben');
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        if (__VLS_ctx.patient.pseudonymFirstName && __VLS_ctx.patient.pseudonymLastName) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("pseudonym-names") },
            });
            (__VLS_ctx.patient.pseudonymFirstName);
            (__VLS_ctx.patient.pseudonymLastName);
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.regeneratePseudonym) },
                ...{ class: ("btn btn-outline-secondary btn-sm ms-2") },
                disabled: ((__VLS_ctx.generatingPseudonym)),
                title: ("Neue Pseudonamen generieren"),
            });
            if (__VLS_ctx.generatingPseudonym) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("spinner-border spinner-border-sm me-1") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-refresh") },
                });
            }
            (__VLS_ctx.generatingPseudonym ? 'Generiere...' : 'Neu');
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.generatePseudonym) },
                ...{ class: ("btn btn-outline-primary btn-sm") },
                disabled: ((__VLS_ctx.generatingPseudonym)),
            });
            if (__VLS_ctx.generatingPseudonym) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("spinner-border spinner-border-sm me-1") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-user-secret") },
                });
            }
            (__VLS_ctx.generatingPseudonym ? 'Generiere...' : 'Pseudonym generieren');
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.patient.dob));
        if (__VLS_ctx.patient.age) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.patient.age);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getGenderDisplay(__VLS_ctx.patient.gender));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card info-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-address-book") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-grid") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        if (__VLS_ctx.patient.email) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((`mailto:${__VLS_ctx.patient.email}`)),
                ...{ class: ("link") },
            });
            (__VLS_ctx.patient.email);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-muted") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        if (__VLS_ctx.patient.phone) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: ((`tel:${__VLS_ctx.patient.phone}`)),
                ...{ class: ("link") },
            });
            (__VLS_ctx.patient.phone);
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-muted") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.getCenterDisplay(__VLS_ctx.patient.center));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex align-items-center gap-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("font-mono") },
        });
        (__VLS_ctx.patient.patientHash || 'Nicht generiert');
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.generatePseudonym) },
            ...{ class: ("btn btn-sm btn-outline-primary") },
            disabled: ((__VLS_ctx.generatingPseudonym)),
            title: ("Pseudonym-Hash generieren"),
        });
        if (__VLS_ctx.generatingPseudonym) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("spinner-border spinner-border-sm me-1") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-key me-1") },
            });
        }
        (__VLS_ctx.generatingPseudonym ? 'Generiere...' : (__VLS_ctx.patient.patientHash ? 'Aktualisieren' : 'Generieren'));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-12") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card info-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-cog") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("font-mono") },
        });
        (__VLS_ctx.patient.id);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        if (__VLS_ctx.patient.isRealPerson) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-success") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-shield-alt") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-secondary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-user-secret") },
            });
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-6") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDateTime(__VLS_ctx.patient.createdAt));
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("info-item") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDateTime(__VLS_ctx.patient.updatedAt));
    }
    if (__VLS_ctx.showDeletionModal) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-overlay") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-dialog") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-content") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
            ...{ class: ("modal-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle text-warning") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-body") },
        });
        if (__VLS_ctx.deletionCheck?.can_delete) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-info-circle") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("mb-0 mt-2") },
            });
        }
        else {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("alert alert-warning") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-exclamation-triangle") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: ("mt-2 mb-0") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.template, __VLS_intrinsicElements.template)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patient-detail-view") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("detail-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patient-header-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
                ...{ class: ("patient-title") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-user") },
            });
            (__VLS_ctx.patient.firstName);
            (__VLS_ctx.patient.lastName);
            if (__VLS_ctx.patient.isRealPerson) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-success") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-shield-alt") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("badge bg-secondary") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-user-secret") },
                });
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("detail-actions") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.showDeletionModal)))
                            return;
                        if (!(!((__VLS_ctx.deletionCheck?.can_delete))))
                            return;
                        __VLS_ctx.$emit('close');
                    } },
                ...{ class: ("btn btn-secondary btn-sm") },
                disabled: ((__VLS_ctx.loading)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-times") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!((__VLS_ctx.showDeletionModal)))
                            return;
                        if (!(!((__VLS_ctx.deletionCheck?.can_delete))))
                            return;
                        __VLS_ctx.showEditForm = true;
                    } },
                ...{ class: ("btn btn-primary btn-sm") },
                disabled: ((__VLS_ctx.loading || __VLS_ctx.showEditForm)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.checkDeletionSafety) },
                ...{ class: ("btn btn-outline-danger btn-sm") },
                disabled: ((__VLS_ctx.loading || __VLS_ctx.showEditForm)),
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-trash") },
            });
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
            if (__VLS_ctx.showEditForm) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("edit-section") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
                    ...{ class: ("card-title") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-edit") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body") },
                });
                // @ts-ignore
                /** @type { [typeof PatientEditForm, ] } */ ;
                // @ts-ignore
                const __VLS_9 = __VLS_asFunctionalComponent(PatientEditForm, new PatientEditForm({
                    ...{ 'onPatientUpdated': {} },
                    ...{ 'onPatientDeleted': {} },
                    ...{ 'onCancel': {} },
                    patient: ((__VLS_ctx.patient)),
                }));
                const __VLS_10 = __VLS_9({
                    ...{ 'onPatientUpdated': {} },
                    ...{ 'onPatientDeleted': {} },
                    ...{ 'onCancel': {} },
                    patient: ((__VLS_ctx.patient)),
                }, ...__VLS_functionalComponentArgsRest(__VLS_9));
                let __VLS_14;
                const __VLS_15 = {
                    onPatientUpdated: (__VLS_ctx.onPatientUpdated)
                };
                const __VLS_16 = {
                    onPatientDeleted: (__VLS_ctx.onPatientDeleted)
                };
                const __VLS_17 = {
                    onCancel: (...[$event]) => {
                        if (!((__VLS_ctx.showDeletionModal)))
                            return;
                        if (!(!((__VLS_ctx.deletionCheck?.can_delete))))
                            return;
                        if (!((__VLS_ctx.showEditForm)))
                            return;
                        __VLS_ctx.showEditForm = false;
                    }
                };
                let __VLS_11;
                let __VLS_12;
                var __VLS_13;
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("patient-info-display") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card info-card") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                    ...{ class: ("card-title") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-user") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-grid") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.patient.firstName || 'Nicht angegeben');
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.patient.lastName || 'Nicht angegeben');
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                if (__VLS_ctx.patient.pseudonymFirstName && __VLS_ctx.patient.pseudonymLastName) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("pseudonym-names") },
                    });
                    (__VLS_ctx.patient.pseudonymFirstName);
                    (__VLS_ctx.patient.pseudonymLastName);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (__VLS_ctx.regeneratePseudonym) },
                        ...{ class: ("btn btn-outline-secondary btn-sm ms-2") },
                        disabled: ((__VLS_ctx.generatingPseudonym)),
                        title: ("Neue Pseudonamen generieren"),
                    });
                    if (__VLS_ctx.generatingPseudonym) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: ("spinner-border spinner-border-sm me-1") },
                        });
                    }
                    else {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                            ...{ class: ("fas fa-refresh") },
                        });
                    }
                    (__VLS_ctx.generatingPseudonym ? 'Generiere...' : 'Neu');
                }
                else {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (__VLS_ctx.generatePseudonym) },
                        ...{ class: ("btn btn-outline-primary btn-sm") },
                        disabled: ((__VLS_ctx.generatingPseudonym)),
                    });
                    if (__VLS_ctx.generatingPseudonym) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: ("spinner-border spinner-border-sm me-1") },
                        });
                    }
                    else {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                            ...{ class: ("fas fa-user-secret") },
                        });
                    }
                    (__VLS_ctx.generatingPseudonym ? 'Generiere...' : 'Pseudonym generieren');
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatDate(__VLS_ctx.patient.dob));
                if (__VLS_ctx.patient.age) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                        ...{ class: ("text-muted") },
                    });
                    (__VLS_ctx.patient.age);
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.getGenderDisplay(__VLS_ctx.patient.gender));
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card info-card") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                    ...{ class: ("card-title") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-address-book") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-grid") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                if (__VLS_ctx.patient.email) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                        href: ((`mailto:${__VLS_ctx.patient.email}`)),
                        ...{ class: ("link") },
                    });
                    (__VLS_ctx.patient.email);
                }
                else {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("text-muted") },
                    });
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                if (__VLS_ctx.patient.phone) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                        href: ((`tel:${__VLS_ctx.patient.phone}`)),
                        ...{ class: ("link") },
                    });
                    (__VLS_ctx.patient.phone);
                }
                else {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("text-muted") },
                    });
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.getCenterDisplay(__VLS_ctx.patient.center));
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("font-mono") },
                });
                (__VLS_ctx.patient.patientHash || 'Nicht generiert');
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row mt-3") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-12") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card info-card") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                    ...{ class: ("card-title") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-cog") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("card-body") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("row") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("font-mono") },
                });
                (__VLS_ctx.patient.id);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                if (__VLS_ctx.patient.isRealPerson) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-success") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-shield-alt") },
                    });
                }
                else {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: ("badge bg-secondary") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-user-secret") },
                    });
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("col-md-6") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatDateTime(__VLS_ctx.patient.createdAt));
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatDateTime(__VLS_ctx.patient.updatedAt));
            }
            if (__VLS_ctx.showDeletionModal) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("modal-overlay") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("modal-dialog") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("modal-content") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("modal-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                    ...{ class: ("modal-title") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-exclamation-triangle text-warning") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("modal-body") },
                });
                if (__VLS_ctx.deletionCheck?.can_delete) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("alert alert-info") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-info-circle") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                        ...{ class: ("mb-0 mt-2") },
                    });
                }
                else {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("alert alert-warning") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-exclamation-triangle") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                        ...{ class: ("mt-2 mb-0") },
                    });
                    for (const [warning] of __VLS_getVForSourceType((__VLS_ctx.deletionCheck?.warnings?.filter((w) => w)))) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                            key: ((warning)),
                        });
                        (warning);
                    }
                }
                if (__VLS_ctx.deletionCheck?.related_objects) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("mt-3") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("related-objects") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("object-count") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-stethoscope") },
                    });
                    (__VLS_ctx.deletionCheck.related_objects.examinations);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("object-count") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-search") },
                    });
                    (__VLS_ctx.deletionCheck.related_objects.findings);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("object-count") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-video") },
                    });
                    (__VLS_ctx.deletionCheck.related_objects.videos);
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("object-count") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-file-pdf") },
                    });
                    (__VLS_ctx.deletionCheck.related_objects.reports);
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("modal-footer") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (__VLS_ctx.closeDeletionModal) },
                    type: ("button"),
                    ...{ class: ("btn btn-secondary") },
                    disabled: ((__VLS_ctx.deleting)),
                });
                if (__VLS_ctx.deletionCheck?.can_delete) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (__VLS_ctx.confirmDeletion) },
                        type: ("button"),
                        ...{ class: ("btn btn-danger") },
                        disabled: ((__VLS_ctx.deleting)),
                    });
                    if (__VLS_ctx.deleting) {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: ("spinner-border spinner-border-sm me-2") },
                        });
                    }
                    else {
                        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                            ...{ class: ("fas fa-trash me-2") },
                        });
                    }
                    (__VLS_ctx.deleting ? 'Wird gelöscht...' : 'Endgültig löschen');
                }
            }
        }
        if (__VLS_ctx.deletionCheck?.related_objects) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("mt-3") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("related-objects") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("object-count") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-stethoscope") },
            });
            (__VLS_ctx.deletionCheck.related_objects.examinations);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("object-count") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-search") },
            });
            (__VLS_ctx.deletionCheck.related_objects.findings);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("object-count") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-video") },
            });
            (__VLS_ctx.deletionCheck.related_objects.videos);
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("object-count") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-file-pdf") },
            });
            (__VLS_ctx.deletionCheck.related_objects.reports);
        }
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("modal-footer") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeDeletionModal) },
            type: ("button"),
            ...{ class: ("btn btn-secondary") },
            disabled: ((__VLS_ctx.deleting)),
        });
        if (__VLS_ctx.deletionCheck?.can_delete) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.confirmDeletion) },
                type: ("button"),
                ...{ class: ("btn btn-danger") },
                disabled: ((__VLS_ctx.deleting)),
            });
            if (__VLS_ctx.deleting) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("spinner-border spinner-border-sm me-2") },
                });
            }
            else {
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-trash me-2") },
                });
            }
            (__VLS_ctx.deleting ? 'Wird gelöscht...' : 'Endgültig löschen');
        }
    }
    ['patient-detail-view', 'detail-header', 'patient-header-info', 'patient-title', 'fas', 'fa-user', 'badge', 'bg-success', 'fas', 'fa-shield-alt', 'badge', 'bg-secondary', 'fas', 'fa-user-secret', 'detail-actions', 'btn', 'btn-secondary', 'btn-sm', 'fas', 'fa-times', 'btn', 'btn-primary', 'btn-sm', 'fas', 'fa-edit', 'btn', 'btn-outline-danger', 'btn-sm', 'fas', 'fa-trash', 'alert', 'alert-danger', 'fas', 'fa-exclamation-triangle', 'alert', 'alert-success', 'fas', 'fa-check-circle', 'edit-section', 'card', 'card-header', 'card-title', 'fas', 'fa-edit', 'card-body', 'patient-info-display', 'row', 'col-md-6', 'card', 'info-card', 'card-header', 'card-title', 'fas', 'fa-user', 'card-body', 'info-grid', 'info-item', 'info-item', 'info-item', 'pseudonym-names', 'btn', 'btn-outline-secondary', 'btn-sm', 'ms-2', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-refresh', 'btn', 'btn-outline-primary', 'btn-sm', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-user-secret', 'info-item', 'text-muted', 'info-item', 'col-md-6', 'card', 'info-card', 'card-header', 'card-title', 'fas', 'fa-address-book', 'card-body', 'info-grid', 'info-item', 'link', 'text-muted', 'info-item', 'link', 'text-muted', 'info-item', 'info-item', 'd-flex', 'align-items-center', 'gap-2', 'font-mono', 'btn', 'btn-sm', 'btn-outline-primary', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-key', 'me-1', 'row', 'mt-3', 'col-12', 'card', 'info-card', 'card-header', 'card-title', 'fas', 'fa-cog', 'card-body', 'row', 'col-md-6', 'info-item', 'font-mono', 'info-item', 'badge', 'bg-success', 'fas', 'fa-shield-alt', 'badge', 'bg-secondary', 'fas', 'fa-user-secret', 'col-md-6', 'info-item', 'info-item', 'modal-overlay', 'modal-dialog', 'modal-content', 'modal-header', 'modal-title', 'fas', 'fa-exclamation-triangle', 'text-warning', 'modal-body', 'alert', 'alert-info', 'fas', 'fa-info-circle', 'mb-0', 'mt-2', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'mt-2', 'mb-0', 'patient-detail-view', 'detail-header', 'patient-header-info', 'patient-title', 'fas', 'fa-user', 'badge', 'bg-success', 'fas', 'fa-shield-alt', 'badge', 'bg-secondary', 'fas', 'fa-user-secret', 'detail-actions', 'btn', 'btn-secondary', 'btn-sm', 'fas', 'fa-times', 'btn', 'btn-primary', 'btn-sm', 'fas', 'fa-edit', 'btn', 'btn-outline-danger', 'btn-sm', 'fas', 'fa-trash', 'alert', 'alert-danger', 'fas', 'fa-exclamation-triangle', 'alert', 'alert-success', 'fas', 'fa-check-circle', 'edit-section', 'card', 'card-header', 'card-title', 'fas', 'fa-edit', 'card-body', 'patient-info-display', 'row', 'col-md-6', 'card', 'info-card', 'card-header', 'card-title', 'fas', 'fa-user', 'card-body', 'info-grid', 'info-item', 'info-item', 'info-item', 'pseudonym-names', 'btn', 'btn-outline-secondary', 'btn-sm', 'ms-2', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-refresh', 'btn', 'btn-outline-primary', 'btn-sm', 'spinner-border', 'spinner-border-sm', 'me-1', 'fas', 'fa-user-secret', 'info-item', 'text-muted', 'info-item', 'col-md-6', 'card', 'info-card', 'card-header', 'card-title', 'fas', 'fa-address-book', 'card-body', 'info-grid', 'info-item', 'link', 'text-muted', 'info-item', 'link', 'text-muted', 'info-item', 'info-item', 'font-mono', 'row', 'mt-3', 'col-12', 'card', 'info-card', 'card-header', 'card-title', 'fas', 'fa-cog', 'card-body', 'row', 'col-md-6', 'info-item', 'font-mono', 'info-item', 'badge', 'bg-success', 'fas', 'fa-shield-alt', 'badge', 'bg-secondary', 'fas', 'fa-user-secret', 'col-md-6', 'info-item', 'info-item', 'modal-overlay', 'modal-dialog', 'modal-content', 'modal-header', 'modal-title', 'fas', 'fa-exclamation-triangle', 'text-warning', 'modal-body', 'alert', 'alert-info', 'fas', 'fa-info-circle', 'mb-0', 'mt-2', 'alert', 'alert-warning', 'fas', 'fa-exclamation-triangle', 'mt-2', 'mb-0', 'mt-3', 'related-objects', 'object-count', 'fas', 'fa-stethoscope', 'object-count', 'fas', 'fa-search', 'object-count', 'fas', 'fa-video', 'object-count', 'fas', 'fa-file-pdf', 'modal-footer', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-trash', 'me-2', 'mt-3', 'related-objects', 'object-count', 'fas', 'fa-stethoscope', 'object-count', 'fas', 'fa-search', 'object-count', 'fas', 'fa-video', 'object-count', 'fas', 'fa-file-pdf', 'modal-footer', 'btn', 'btn-secondary', 'btn', 'btn-danger', 'spinner-border', 'spinner-border-sm', 'me-2', 'fas', 'fa-trash', 'me-2',];
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
            PatientEditForm: PatientEditForm,
            loading: loading,
            error: error,
            successMessage: successMessage,
            showEditForm: showEditForm,
            showDeletionModal: showDeletionModal,
            deleting: deleting,
            deletionCheck: deletionCheck,
            generatingPseudonym: generatingPseudonym,
            checkDeletionSafety: checkDeletionSafety,
            confirmDeletion: confirmDeletion,
            closeDeletionModal: closeDeletionModal,
            onPatientUpdated: onPatientUpdated,
            onPatientDeleted: onPatientDeleted,
            formatDate: formatDate,
            formatDateTime: formatDateTime,
            getGenderDisplay: getGenderDisplay,
            getCenterDisplay: getCenterDisplay,
            generatePseudonym: generatePseudonym,
            regeneratePseudonym: regeneratePseudonym,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
