import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patientStore';
import { patientService } from '@/api/patientService';
import PatientExaminationForm from './PatientExaminationForm.vue';
import PatientEditForm from './PatientEditForm.vue';
const props = defineProps();
const emit = defineEmits();
// Composables
const patientStore = usePatientStore();
// Reactive state
const activeTab = ref('overview');
const showEditForm = ref(false);
const loading = ref(false);
const examinations = ref([]);
const videos = ref([]);
const reports = ref([]);
const findings = ref([]);
// Computed
const genders = computed(() => patientStore.genders);
const centers = computed(() => patientStore.centers);
// Methods
const loadPatientData = async () => {
    try {
        loading.value = true;
        // Load all related data for the patient
        // Note: These endpoints would need to be implemented in the backend
        const [examinationsData, videosData, reportsData] = await Promise.all([
            // For now, we'll use mock data until the endpoints are available
            Promise.resolve({ data: [] }),
            Promise.resolve({ data: [] }),
            Promise.resolve({ data: [] })
        ]);
        examinations.value = examinationsData.data || [];
        videos.value = videosData.data || [];
        reports.value = reportsData.data || [];
    }
    catch (error) {
        console.error('Error loading patient data:', error);
    }
    finally {
        loading.value = false;
    }
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
    }
};
const onPatientUpdated = (updatedPatient) => {
    showEditForm.value = false;
    emit('patient-updated', updatedPatient);
};
const onExaminationCreated = (examination) => {
    // Add the new examination to the list
    examinations.value.unshift(examination);
    // Switch to examinations tab to show the result
    activeTab.value = 'examinations';
};
const formatDate = (dateString) => {
    if (!dateString)
        return 'Nicht angegeben';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch {
        return 'Ungültiges Datum';
    }
};
const formatDuration = (duration) => {
    if (!duration)
        return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
// Fixed: Handle both string and number gender types
const getGenderName = (gender) => {
    if (!gender)
        return 'Nicht angegeben';
    // If it's already a string (gender name), return it
    if (typeof gender === 'string') {
        const genderObj = genders.value.find(g => g.name === gender);
        return genderObj ? (genderObj.name_de || genderObj.name) : gender;
    }
    return 'Unbekannt';
};
// Fixed: Handle both string and number center types
const getCenterName = (center) => {
    if (!center)
        return 'Nicht zugeordnet';
    // If it's already a string (center name), return it
    if (typeof center === 'string') {
        const centerObj = centers.value.find(c => c.name === center);
        return centerObj ? (centerObj.name_de || centerObj.name) : center;
    }
    return 'Unbekanntes Zentrum';
};
const getReportStatusClass = (status) => {
    switch (status) {
        case 'completed': return 'badge-success';
        case 'pending': return 'badge-warning';
        case 'failed': return 'badge-danger';
        default: return 'badge-secondary';
    }
};
const getReportStatusText = (status) => {
    switch (status) {
        case 'completed': return 'Abgeschlossen';
        case 'pending': return 'In Bearbeitung';
        case 'failed': return 'Fehlgeschlagen';
        default: return 'Unbekannt';
    }
};
// Method to set active tab with debugging
const setActiveTab = (tabName) => {
    console.log('=== TAB SWITCHING DEBUG ===');
    console.log('🔄 Switching to tab:', tabName);
    console.log('📋 Current activeTab value:', activeTab.value);
    console.log('👤 Patient ID:', props.patient.id);
    console.log('📊 Patient object:', props.patient);
    activeTab.value = tabName;
    console.log('✅ New activeTab value:', activeTab.value);
    console.log('🎯 Tab is new-examination?', activeTab.value === 'new-examination');
    console.log('🔍 Will PatientExaminationForm render?', activeTab.value === 'new-examination' && true);
    console.log('=== END TAB SWITCHING DEBUG ===');
};
// Load data on mount
onMounted(() => {
    loadLookupData();
    loadPatientData();
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['patient-name', 'nav-link', 'nav-link', 'nav-link', 'info-item', 'info-item', 'stat-card', 'stat-content', 'empty-state', 'empty-state', 'examination-card', 'report-card', 'media-card', 'media-thumbnail', 'report-card', 'report-icon', 'report-info', 'detail-header', 'nav-tabs', 'media-grid', 'report-card',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-detail-view") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("detail-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-info") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: ("patient-name") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-user") },
    });
    (__VLS_ctx.patient.first_name);
    (__VLS_ctx.patient.last_name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("patient-meta") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("badge badge-primary") },
    });
    (__VLS_ctx.patient.id);
    if (__VLS_ctx.patient.age) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge badge-info") },
        });
        (__VLS_ctx.patient.age);
    }
    if (__VLS_ctx.patient.gender) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge badge-secondary") },
        });
        (__VLS_ctx.getGenderName(__VLS_ctx.patient.gender));
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("header-actions") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.showEditForm = !__VLS_ctx.showEditForm;
            } },
        ...{ class: ("btn btn-outline-primary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-edit") },
    });
    (__VLS_ctx.showEditForm ? 'Bearbeitung abbrechen' : 'Bearbeiten');
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('close');
            } },
        ...{ class: ("btn btn-outline-secondary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-times") },
    });
    if (__VLS_ctx.showEditForm) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
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
            ...{ 'onCancel': {} },
            patient: ((__VLS_ctx.patient)),
        }));
        const __VLS_1 = __VLS_0({
            ...{ 'onPatientUpdated': {} },
            ...{ 'onCancel': {} },
            patient: ((__VLS_ctx.patient)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        let __VLS_5;
        const __VLS_6 = {
            onPatientUpdated: (__VLS_ctx.onPatientUpdated)
        };
        const __VLS_7 = {
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("content-tabs") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: ("nav nav-tabs") },
        role: ("tablist"),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'overview';
            } },
        ...{ class: ((['nav-link', { active: __VLS_ctx.activeTab === 'overview' }])) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-info-circle") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'examinations';
            } },
        ...{ class: ((['nav-link', { active: __VLS_ctx.activeTab === 'examinations' }])) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-stethoscope") },
    });
    if (__VLS_ctx.examinations.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge badge-light ms-1") },
        });
        (__VLS_ctx.examinations.length);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'media';
            } },
        ...{ class: ((['nav-link', { active: __VLS_ctx.activeTab === 'media' }])) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-photo-video") },
    });
    if (__VLS_ctx.videos.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge badge-light ms-1") },
        });
        (__VLS_ctx.videos.length);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'reports';
            } },
        ...{ class: ((['nav-link', { active: __VLS_ctx.activeTab === 'reports' }])) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-file-medical") },
    });
    if (__VLS_ctx.reports.length) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge badge-light ms-1") },
        });
        (__VLS_ctx.reports.length);
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        ...{ class: ("nav-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setActiveTab('new-examination');
            } },
        ...{ class: ((['nav-link', { active: __VLS_ctx.activeTab === 'new-examination' }])) },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("tab-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ((['tab-pane fade', { 'show active': __VLS_ctx.activeTab === 'overview' }])) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'overview') }, null, null);
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
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
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
    (__VLS_ctx.patient.first_name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.patient.last_name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatDate(__VLS_ctx.patient.dob));
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.patient.age || 'Nicht berechnet');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.getGenderName(__VLS_ctx.patient.gender) || 'Nicht angegeben');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-6") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card info-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
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
    (__VLS_ctx.patient.email || 'Nicht angegeben');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.patient.phone || 'Nicht angegeben');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.getCenterName(__VLS_ctx.patient.center) || 'Nicht zugeordnet');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("font-mono") },
    });
    (__VLS_ctx.patient.patient_hash || 'Nicht generiert');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("info-item") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ((['badge', __VLS_ctx.patient.is_real_person ? 'badge-success' : 'badge-warning'])) },
    });
    (__VLS_ctx.patient.is_real_person ? 'Realer Patient' : 'Testdaten');
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row mt-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-stethoscope") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.examinations.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-video") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.videos.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-file-medical") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.reports.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-md-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-icon") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-search") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("stat-content") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.findings.length);
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ((['tab-pane fade', { 'show active': __VLS_ctx.activeTab === 'examinations' }])) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'examinations') }, null, null);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center mb-3") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.activeTab = 'new-examination';
            } },
        ...{ class: ("btn btn-primary") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus") },
    });
    if (__VLS_ctx.examinations.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("empty-state") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-stethoscope fa-3x text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!((__VLS_ctx.examinations.length === 0)))
                        return;
                    __VLS_ctx.activeTab = 'new-examination';
                } },
            ...{ class: ("btn btn-primary") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-plus") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("examinations-list") },
        });
        for (const [examination] of __VLS_getVForSourceType((__VLS_ctx.examinations))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((examination.id)),
                ...{ class: ("examination-card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("examination-header") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
            (examination.name_de || examination.name);
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("examination-date") },
            });
            (__VLS_ctx.formatDate(examination.date));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("examination-body") },
            });
            if (examination.description) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (examination.description_de || examination.description);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("examination-stats") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("stat-badge") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-search") },
            });
            (examination.findings_count || 0);
            if (examination.video_count) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: ("stat-badge") },
                });
                __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: ("fas fa-video") },
                });
                (examination.video_count);
            }
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("examination-actions") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: ("btn btn-sm btn-outline-primary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-eye") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: ("btn btn-sm btn-outline-secondary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-edit") },
            });
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ((['tab-pane fade', { 'show active': __VLS_ctx.activeTab === 'media' }])) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'media') }, null, null);
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    if (__VLS_ctx.videos.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("empty-state") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-photo-video fa-3x text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("media-grid") },
        });
        for (const [video] of __VLS_getVForSourceType((__VLS_ctx.videos))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((video.id)),
                ...{ class: ("media-card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("media-thumbnail") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-play-circle") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("media-duration") },
            });
            (__VLS_ctx.formatDuration(video.duration));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("media-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            (video.filename || `Video ${video.id}`);
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatDate(video.created_at));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("media-actions") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: ("btn btn-sm btn-primary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-play") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: ("btn btn-sm btn-outline-secondary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-download") },
            });
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ((['tab-pane fade', { 'show active': __VLS_ctx.activeTab === 'reports' }])) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'reports') }, null, null);
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    if (__VLS_ctx.reports.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("empty-state") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-file-medical fa-3x text-muted") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("reports-list") },
        });
        for (const [report] of __VLS_getVForSourceType((__VLS_ctx.reports))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((report.id)),
                ...{ class: ("report-card") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("report-icon") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-file-pdf") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("report-info") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({});
            (report.title || 'Unbenannter Report');
            __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatDate(report.created_at));
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((['badge', __VLS_ctx.getReportStatusClass(report.status)])) },
            });
            (__VLS_ctx.getReportStatusText(report.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("report-actions") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: ("btn btn-sm btn-outline-primary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-eye") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: ("btn btn-sm btn-outline-secondary") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("fas fa-download") },
            });
        }
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ((['tab-pane fade', { 'show active': __VLS_ctx.activeTab === 'new-examination' }])) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.activeTab === 'new-examination') }, null, null);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("fas fa-plus") },
    });
    (__VLS_ctx.patient.first_name);
    (__VLS_ctx.patient.last_name);
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body") },
    });
    // @ts-ignore
    /** @type { [typeof PatientExaminationForm, ] } */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(PatientExaminationForm, new PatientExaminationForm({
        ...{ 'onExaminationCreated': {} },
        ...{ 'onCancel': {} },
        patientId: ((__VLS_ctx.patient.id || 0)),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onExaminationCreated': {} },
        ...{ 'onCancel': {} },
        patientId: ((__VLS_ctx.patient.id || 0)),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_13;
    const __VLS_14 = {
        onExaminationCreated: (__VLS_ctx.onExaminationCreated)
    };
    const __VLS_15 = {
        onCancel: (...[$event]) => {
            __VLS_ctx.activeTab = 'overview';
        }
    };
    let __VLS_10;
    let __VLS_11;
    var __VLS_12;
    if (!__VLS_ctx.patient.id) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-warning mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("fas fa-exclamation-triangle me-2") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    }
    ['patient-detail-view', 'detail-header', 'patient-info', 'patient-name', 'fas', 'fa-user', 'patient-meta', 'badge', 'badge-primary', 'badge', 'badge-info', 'badge', 'badge-secondary', 'header-actions', 'btn', 'btn-outline-primary', 'fas', 'fa-edit', 'btn', 'btn-outline-secondary', 'fas', 'fa-times', 'card', 'mb-4', 'card-header', 'fas', 'fa-edit', 'card-body', 'content-tabs', 'nav', 'nav-tabs', 'nav-item', 'active', 'nav-link', 'fas', 'fa-info-circle', 'nav-item', 'active', 'nav-link', 'fas', 'fa-stethoscope', 'badge', 'badge-light', 'ms-1', 'nav-item', 'active', 'nav-link', 'fas', 'fa-photo-video', 'badge', 'badge-light', 'ms-1', 'nav-item', 'active', 'nav-link', 'fas', 'fa-file-medical', 'badge', 'badge-light', 'ms-1', 'nav-item', 'active', 'nav-link', 'fas', 'fa-plus', 'tab-content', 'tab-pane', 'fade', 'show', 'active', 'row', 'col-md-6', 'card', 'info-card', 'card-header', 'fas', 'fa-user', 'card-body', 'info-grid', 'info-item', 'info-item', 'info-item', 'info-item', 'info-item', 'col-md-6', 'card', 'info-card', 'card-header', 'fas', 'fa-address-book', 'card-body', 'info-grid', 'info-item', 'info-item', 'info-item', 'info-item', 'font-mono', 'info-item', 'badge', 'row', 'mt-4', 'col-md-3', 'stat-card', 'stat-icon', 'fas', 'fa-stethoscope', 'stat-content', 'col-md-3', 'stat-card', 'stat-icon', 'fas', 'fa-video', 'stat-content', 'col-md-3', 'stat-card', 'stat-icon', 'fas', 'fa-file-medical', 'stat-content', 'col-md-3', 'stat-card', 'stat-icon', 'fas', 'fa-search', 'stat-content', 'tab-pane', 'fade', 'show', 'active', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-3', 'btn', 'btn-primary', 'fas', 'fa-plus', 'empty-state', 'fas', 'fa-stethoscope', 'fa-3x', 'text-muted', 'text-muted', 'btn', 'btn-primary', 'fas', 'fa-plus', 'examinations-list', 'examination-card', 'examination-header', 'examination-date', 'examination-body', 'examination-stats', 'stat-badge', 'fas', 'fa-search', 'stat-badge', 'fas', 'fa-video', 'examination-actions', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-eye', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-edit', 'tab-pane', 'fade', 'show', 'active', 'empty-state', 'fas', 'fa-photo-video', 'fa-3x', 'text-muted', 'text-muted', 'media-grid', 'media-card', 'media-thumbnail', 'fas', 'fa-play-circle', 'media-duration', 'media-info', 'text-muted', 'media-actions', 'btn', 'btn-sm', 'btn-primary', 'fas', 'fa-play', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-download', 'tab-pane', 'fade', 'show', 'active', 'empty-state', 'fas', 'fa-file-medical', 'fa-3x', 'text-muted', 'text-muted', 'reports-list', 'report-card', 'report-icon', 'fas', 'fa-file-pdf', 'report-info', 'text-muted', 'badge', 'report-actions', 'btn', 'btn-sm', 'btn-outline-primary', 'fas', 'fa-eye', 'btn', 'btn-sm', 'btn-outline-secondary', 'fas', 'fa-download', 'tab-pane', 'fade', 'show', 'active', 'card', 'card-header', 'fas', 'fa-plus', 'card-body', 'alert', 'alert-warning', 'mt-3', 'fas', 'fa-exclamation-triangle', 'me-2',];
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
            PatientExaminationForm: PatientExaminationForm,
            PatientEditForm: PatientEditForm,
            activeTab: activeTab,
            showEditForm: showEditForm,
            examinations: examinations,
            videos: videos,
            reports: reports,
            findings: findings,
            onPatientUpdated: onPatientUpdated,
            onExaminationCreated: onExaminationCreated,
            formatDate: formatDate,
            formatDuration: formatDuration,
            getGenderName: getGenderName,
            getCenterName: getCenterName,
            getReportStatusClass: getReportStatusClass,
            getReportStatusText: getReportStatusText,
            setActiveTab: setActiveTab,
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
