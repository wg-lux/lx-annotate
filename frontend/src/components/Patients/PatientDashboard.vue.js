import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { patientService } from '@/api/patientService';
import PatientCreateForm from './PatientCreateForm.vue';
import PatientDetailView from './PatientDetailView.vue';
// Composables
const patientStore = usePatientStore();
// Reactive state
const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const showCreateForm = ref(false);
const selectedPatient = ref(null);
const searchTerm = ref('');
// Computed
const patients = computed(() => patientStore.patients);
const genders = computed(() => patientStore.genders);
const centers = computed(() => patientStore.centers);
const filteredPatients = computed(() => {
    if (!searchTerm.value)
        return patients.value;
    const term = searchTerm.value.toLowerCase();
    return patients.value.filter(patient => patient.firstName?.toLowerCase().includes(term) ||
        patient.lastName?.toLowerCase().includes(term) ||
        patient.email?.toLowerCase().includes(term) ||
        `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(term));
});
// Methods
const loadData = async () => {
    try {
        loading.value = true;
        error.value = '';
        await Promise.all([
            loadPatients(),
            loadLookupData()
        ]);
    }
    catch (err) {
        error.value = err.message || 'Fehler beim Laden der Daten';
        console.error('Error loading dashboard data:', err);
    }
    finally {
        loading.value = false;
    }
};
const loadPatients = async () => {
    const patientsData = await patientService.getPatients();
    patientStore.patients = patientsData;
};
const loadLookupData = async () => {
    try {
        // Load genders and centers if not already loaded
        if (genders.value.length === 0) {
            const gendersData = await patientService.getGenders();
            patientStore.genders = gendersData;
        }
        if (centers.value.length === 0) {
            const centersData = await patientService.getCenters();
            patientStore.centers = centersData;
        }
    }
    catch (error) {
        console.error('Error loading lookup data:', error);
        // Either re-throw to show error to user or implement fallback
        // throw new Error('Fehler beim Laden der Nachschlagedaten')
    }
};
const selectPatient = (patient) => {
    selectedPatient.value = patient;
};
const onPatientCreated = (patient) => {
    showCreateForm.value = false;
    selectedPatient.value = patient;
    successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich erstellt!`;
    // Clear success message after 5 seconds
    setTimeout(() => {
        successMessage.value = '';
    }, 5000);
};
const onPatientUpdated = (patient) => {
    selectedPatient.value = patient;
    // Update in patients list
    const index = patientStore.patients.findIndex(p => p.id === patient.id);
    if (index !== -1) {
        patientStore.patients[index] = patient;
    }
    successMessage.value = `Patient "${patient.firstName} ${patient.lastName}" wurde erfolgreich aktualisiert!`;
    // Clear success message after 5 seconds
    setTimeout(() => {
        successMessage.value = '';
    }, 5000);
};
const onPatientDeleted = (patientId) => {
    // Remove patient from store
    const index = patientStore.patients.findIndex(p => p.id === patientId);
    if (index !== -1) {
        const deletedPatient = patientStore.patients[index];
        patientStore.patients.splice(index, 1);
        successMessage.value = `Patient "${deletedPatient.firstName} ${deletedPatient.lastName}" wurde erfolgreich gelöscht!`;
    }
    // Close detail view
    selectedPatient.value = null;
    // Clear success message after 5 seconds
    setTimeout(() => {
        successMessage.value = '';
    }, 5000);
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
const getGenderName = (genderValue) => {
    if (!genderValue)
        return 'Nicht angegeben';
    const gender = genders.value.find(g => g.name === genderValue);
    return gender?.nameDe || gender?.name || genderValue;
};
const getCenterName = (centerValue) => {
    if (!centerValue)
        return 'Nicht zugeordnet';
    const center = centers.value.find(c => c.name === centerValue);
    return center?.nameDe || center?.name || centerValue;
};
// Lifecycle
onMounted(() => {
    loadData();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['dashboard-title', 'card-title', 'patient-card', 'patient-card', 'info-item', 'info-item', 'empty-state', 'empty-state', 'loading-container', 'btn-primary', 'btn-close', 'patient-dashboard', 'dashboard-header', 'patients-grid', 'search-box', 'patient-card', 'patient-card-header',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-dashboard") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("dashboard-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: ("dashboard-title") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-users") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showCreateForm = true;
            } },
        ...{ class: ("btn btn-primary") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus") },
    });
    if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.error)))
                        return;
                    __VLS_ctx.error = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.successMessage) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-success alert-dismissible") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.successMessage);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.successMessage)))
                        return;
                    __VLS_ctx.successMessage = '';
                } },
            type: ("button"),
            ...{ class: ("btn-close") },
        });
    }
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("loading-container") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    }
    if (__VLS_ctx.showCreateForm && !__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card form-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: ("card-title") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-user-plus") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        // @ts-ignore
        /** @type { [typeof PatientCreateForm, ] } */ ;
        // @ts-ignore
        const __VLS_0 = __VLS_asFunctionalComponent(PatientCreateForm, new PatientCreateForm({
            ...{ 'onPatientCreated': {} },
            ...{ 'onCancel': {} },
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onPatientCreated': {} },
            ...{ 'onCancel': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onPatientCreated: (__VLS_ctx.onPatientCreated)
        };
        const __VLS_7 = {
            onCancel: (...[$event]) => {
                if (!((__VLS_ctx.showCreateForm && !__VLS_ctx.loading)))
                    return;
                __VLS_ctx.showCreateForm = false;
            }
        };
        let __VLS_2;
        let __VLS_3;
        var __VLS_4;
    }
    if (!__VLS_ctx.loading && !__VLS_ctx.showCreateForm) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card patients-card") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("d-flex justify-content-between align-items-center") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: ("card-title mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-list") },
        });
        (__VLS_ctx.patients.length);
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("search-box") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.searchTerm)),
            type: ("text"),
            ...{ class: ("form-control") },
            placeholder: ("Patienten suchen..."),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        if (__VLS_ctx.filteredPatients.length > 0) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("patients-grid") },
            });
            for (const [patient] of __VLS_getVForSourceType((__VLS_ctx.filteredPatients))) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ onClick: (...[$event]) => {
                            if (!((!__VLS_ctx.loading && !__VLS_ctx.showCreateForm)))
                                return;
                            if (!((__VLS_ctx.filteredPatients.length > 0)))
                                return;
                            __VLS_ctx.selectPatient(patient);
                        } },
                    key: ((patient.id)),
                    ...{ class: ("patient-card") },
                    ...{ class: (({ 'selected': __VLS_ctx.selectedPatient?.id === patient.id })) },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("patient-card-header") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
                    ...{ class: ("patient-name") },
                });
                (patient.firstName);
                (patient.lastName);
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("patient-id") },
                });
                (patient.id);
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("patient-card-body") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("patient-info") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("info-item") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-birthday-cake") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatDate(patient.dob));
                if (patient.age) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
                    (patient.age);
                }
                if (patient.gender) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("info-item") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-venus-mars") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (__VLS_ctx.getGenderName(patient.gender));
                }
                if (patient.center) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("info-item") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-hospital") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (__VLS_ctx.getCenterName(patient.center));
                }
                if (patient.email) {
                    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: ("info-item") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                        ...{ class: ("fas fa-envelope") },
                    });
                    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (patient.email);
                }
                __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: ("patient-card-footer") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("text-muted") },
                });
            }
        }
        else if (!__VLS_ctx.loading) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("empty-state") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-users fa-3x text-muted") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.searchTerm ? 'Keine Patienten entsprechen der Suche.' : 'Erstellen Sie den ersten Patienten.');
            if (!__VLS_ctx.searchTerm) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!((!__VLS_ctx.loading && !__VLS_ctx.showCreateForm)))
                                return;
                            if (!(!((__VLS_ctx.filteredPatients.length > 0))))
                                return;
                            if (!((!__VLS_ctx.loading)))
                                return;
                            if (!((!__VLS_ctx.searchTerm)))
                                return;
                            __VLS_ctx.showCreateForm = true;
                        } },
                    ...{ class: ("btn btn-primary") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-plus") },
                });
            }
        }
    }
    if (__VLS_ctx.selectedPatient && !__VLS_ctx.showCreateForm && !__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("patient-detail-section") },
        });
        // @ts-ignore
        /** @type { [typeof PatientDetailView, ] } */ ;
        // @ts-ignore
        const __VLS_8 = __VLS_asFunctionalComponent(PatientDetailView, new PatientDetailView({
            ...{ 'onPatientUpdated': {} },
            ...{ 'onPatientDeleted': {} },
            ...{ 'onClose': {} },
            patient: ((__VLS_ctx.selectedPatient)),
        }));
        const __VLS_9 = __VLS_8({
            ...{ 'onPatientUpdated': {} },
            ...{ 'onPatientDeleted': {} },
            ...{ 'onClose': {} },
            patient: ((__VLS_ctx.selectedPatient)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_8));
        let __VLS_13;
        const __VLS_14 = {
            onPatientUpdated: (__VLS_ctx.onPatientUpdated)
        };
        const __VLS_15 = {
            onPatientDeleted: (__VLS_ctx.onPatientDeleted)
        };
        const __VLS_16 = {
            onClose: (...[$event]) => {
                if (!((__VLS_ctx.selectedPatient && !__VLS_ctx.showCreateForm && !__VLS_ctx.loading)))
                    return;
                __VLS_ctx.selectedPatient = null;
            }
        };
        let __VLS_10;
        let __VLS_11;
        var __VLS_12;
    }
    ['patient-dashboard', 'dashboard-header', 'dashboard-title', 'fas', 'fa-users', 'header-actions', 'btn', 'btn-primary', 'fas', 'fa-plus', 'alert', 'alert-danger', 'alert-dismissible', 'btn-close', 'alert', 'alert-success', 'alert-dismissible', 'btn-close', 'loading-container', 'spinner-border', 'text-primary', 'visually-hidden', 'card', 'form-card', 'card-header', 'card-title', 'fas', 'fa-user-plus', 'card-body', 'card', 'patients-card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'card-title', 'mb-0', 'fas', 'fa-list', 'search-box', 'form-control', 'card-body', 'patients-grid', 'patient-card', 'selected', 'patient-card-header', 'patient-name', 'patient-id', 'patient-card-body', 'patient-info', 'info-item', 'fas', 'fa-birthday-cake', 'info-item', 'fas', 'fa-venus-mars', 'info-item', 'fas', 'fa-hospital', 'info-item', 'fas', 'fa-envelope', 'patient-card-footer', 'text-muted', 'empty-state', 'fas', 'fa-users', 'fa-3x', 'text-muted', 'text-muted', 'btn', 'btn-primary', 'fas', 'fa-plus', 'patient-detail-section',];
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
            PatientCreateForm: PatientCreateForm,
            PatientDetailView: PatientDetailView,
            loading: loading,
            error: error,
            successMessage: successMessage,
            showCreateForm: showCreateForm,
            selectedPatient: selectedPatient,
            searchTerm: searchTerm,
            patients: patients,
            filteredPatients: filteredPatients,
            selectPatient: selectPatient,
            onPatientCreated: onPatientCreated,
            onPatientUpdated: onPatientUpdated,
            onPatientDeleted: onPatientDeleted,
            formatDate: formatDate,
            getGenderName: getGenderName,
            getCenterName: getCenterName,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEl: {},
});
; /* PartiallyEnd: #4569/main.vue */
