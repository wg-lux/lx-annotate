import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import reportListService, {} from '@/api/reportListService';
// Router
const router = useRouter();
// Reactive state
const loading = ref(false);
const error = ref('');
const reportList = ref([]);
const totalReports = ref(0);
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = ref(20);
const showFilters = ref(false);
const showDebugInfo = ref(import.meta.env.DEV); // Nur in Entwicklung
const debugInfo = ref([]);
// Filters
const filters = reactive({
    status: '',
    file_type: '',
    patient_name: '',
    casenumber: '',
    date_from: '',
    date_to: ''
});
// Computed properties
const hasActiveFilters = computed(() => {
    return Object.values(filters).some(value => value !== '');
});
// Methods
async function loadReports(page = 1) {
    loading.value = true;
    error.value = '';
    debugInfo.value = [];
    try {
        let response;
        // Versuche zuerst die neue API
        try {
            if (hasActiveFilters.value) {
                // Filtere leere Werte heraus und konvertiere Typen korrekt
                const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
                    if (value !== '') {
                        if (key === 'status' && (value === 'pending' || value === 'approved' || value === 'rejected')) {
                            acc.status = value;
                        }
                        else if (key !== 'status') {
                            acc[key] = value;
                        }
                    }
                    return acc;
                }, {});
                cleanFilters.page = page;
                cleanFilters.page_size = pageSize.value;
                response = await reportListService.getFilteredReports(cleanFilters);
            }
            else {
                response = await reportListService.getReports(page, pageSize.value);
            }
            debugInfo.value.push({
                source: 'Neue API',
                message: `${response.results.length} Reports geladen`,
                success: true,
                details: `Seite ${page}, Total: ${response.count}`
            });
            reportList.value = response.results;
            totalReports.value = response.count;
            currentPage.value = page;
            totalPages.value = Math.ceil(response.count / pageSize.value);
        }
        catch (apiError) {
            console.warn('Neue API nicht verfügbar, versuche Legacy-API:', apiError);
            debugInfo.value.push({
                source: 'Neue API',
                message: 'Nicht verfügbar',
                success: false,
                details: String(apiError)
            });
            // Fallback auf Legacy-API
            const legacyReports = await reportListService.getLegacyReports();
            debugInfo.value.push({
                source: 'Legacy API',
                message: `${legacyReports.length} Reports geladen`,
                success: true
            });
            // Simuliere Paginierung für Legacy-Daten
            const startIndex = (page - 1) * pageSize.value;
            const endIndex = startIndex + pageSize.value;
            reportList.value = legacyReports.slice(startIndex, endIndex);
            totalReports.value = legacyReports.length;
            currentPage.value = page;
            totalPages.value = Math.ceil(legacyReports.length / pageSize.value);
        }
    }
    catch (err) {
        console.error('Fehler beim Laden der Reports:', err);
        error.value = err.message || 'Unbekannter Fehler beim Laden der Reports';
        debugInfo.value.push({
            source: 'Fehler',
            message: error.value,
            success: false
        });
    }
    finally {
        loading.value = false;
    }
}
async function refreshReports() {
    await loadReports(currentPage.value);
}
async function retryLoad() {
    await loadReports(1);
}
function toggleFilters() {
    showFilters.value = !showFilters.value;
}
async function applyFilters() {
    currentPage.value = 1;
    await loadReports(1);
}
function clearFilters() {
    Object.keys(filters).forEach(key => {
        // @ts-ignore
        filters[key] = '';
    });
    applyFilters();
}
async function nextPage() {
    if (currentPage.value < totalPages.value) {
        await loadReports(currentPage.value + 1);
    }
}
async function previousPage() {
    if (currentPage.value > 1) {
        await loadReports(currentPage.value - 1);
    }
}
// Utility functions
function formatPatientName(meta) {
    if (meta.patient_first_name || meta.patient_last_name) {
        return `${meta.patient_first_name || ''} ${meta.patient_last_name || ''}`.trim();
    }
    return 'Unbekannter Patient';
}
function formatDate(dateString) {
    if (!dateString)
        return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('de-DE');
    }
    catch {
        return 'Ungültiges Datum';
    }
}
function formatDateTime(dateString) {
    if (!dateString)
        return 'N/A';
    try {
        return new Date(dateString).toLocaleString('de-DE');
    }
    catch {
        return 'Ungültiges Datum';
    }
}
function getStatusColor(status) {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'danger';
        case 'pending': return 'warning';
        default: return 'secondary';
    }
}
function getStatusLabel(status) {
    switch (status) {
        case 'approved': return 'Genehmigt';
        case 'rejected': return 'Abgelehnt';
        case 'pending': return 'Ausstehend';
        default: return 'Unbekannt';
    }
}
function getFileTypeIcon(fileType) {
    switch (fileType?.toLowerCase()) {
        case 'pdf': return 'picture_as_pdf';
        case 'image':
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif': return 'image';
        case 'text':
        case 'txt': return 'description';
        default: return 'description';
    }
}
function getFileTypeColor(fileType) {
    switch (fileType?.toLowerCase()) {
        case 'pdf': return 'danger';
        case 'image':
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif': return 'info';
        case 'text':
        case 'txt': return 'secondary';
        default: return 'secondary';
    }
}
// Lifecycle
onMounted(async () => {
    console.log('Report Overview mounted - lade Reports...');
    await loadReports(1);
}); /* PartiallyEnd: #3632/scriptSetup.vue */
function __VLS_template() {
    const __VLS_ctx = {};
    let __VLS_components;
    let __VLS_directives;
    ['table', 'btn-group', 'btn-group', 'btn',];
    // CSS variable injection 
    // CSS variable injection end 
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("container-fluid py-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("row") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("col-12") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card mb-4") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header pb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center justify-content-between") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_elementAsFunction(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
        ...{ class: ("mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: ("text-muted mb-0") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("btn-group") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.refreshReports) },
        ...{ class: ("btn btn-outline-secondary btn-sm") },
        disabled: ((__VLS_ctx.loading)),
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.toggleFilters) },
        ...{ class: ("btn btn-primary btn-sm") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: ("material-icons") },
    });
    if (__VLS_ctx.showFilters) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mb-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("row") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.filters.status)),
            ...{ class: ("form-select form-select-sm") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("pending"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("approved"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("rejected"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: ((__VLS_ctx.filters.file_type)),
            ...{ class: ("form-select form-select-sm") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (""),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("pdf"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("image"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: ("text"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            value: ((__VLS_ctx.filters.patient_name)),
            type: ("text"),
            ...{ class: ("form-control form-control-sm") },
            placeholder: ("Name oder Fallnummer..."),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("col-md-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: ("form-label") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("btn-group d-block") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.applyFilters) },
            ...{ class: ("btn btn-primary btn-sm me-2") },
            disabled: ((__VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearFilters) },
            ...{ class: ("btn btn-outline-secondary btn-sm") },
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-header") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex justify-content-between align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: ("mb-0") },
    });
    if (__VLS_ctx.reportList.length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("badge bg-secondary ms-2") },
        });
        (__VLS_ctx.reportList.length);
        (__VLS_ctx.totalReports > __VLS_ctx.reportList.length ? ` von ${__VLS_ctx.totalReports}` : '');
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("d-flex align-items-center") },
    });
    __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: ("text-muted me-3") },
    });
    (__VLS_ctx.pageSize);
    if (__VLS_ctx.totalPages > 1) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("btn-group") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.previousPage) },
            ...{ class: ("btn btn-outline-secondary btn-sm") },
            disabled: ((__VLS_ctx.currentPage <= 1 || __VLS_ctx.loading)),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("btn btn-outline-secondary btn-sm disabled") },
        });
        (__VLS_ctx.currentPage);
        (__VLS_ctx.totalPages);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.nextPage) },
            ...{ class: ("btn btn-outline-secondary btn-sm") },
            disabled: ((__VLS_ctx.currentPage >= __VLS_ctx.totalPages || __VLS_ctx.loading)),
        });
    }
    __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: ("card-body p-0") },
    });
    if (__VLS_ctx.loading) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("spinner-border text-primary") },
            role: ("status"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: ("visually-hidden") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mt-2 text-muted") },
        });
    }
    else if (__VLS_ctx.error) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("alert alert-danger m-3") },
            role: ("alert"),
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("alert-heading") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("mb-2") },
        });
        (__VLS_ctx.error);
        __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.retryLoad) },
            ...{ class: ("btn btn-outline-danger btn-sm") },
        });
    }
    else if (__VLS_ctx.reportList.length === 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("text-center py-5") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: ("material-icons text-muted") },
            ...{ style: ({}) },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mt-3") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: ("text-muted") },
        });
        (__VLS_ctx.hasActiveFilters ? 'Keine Reports entsprechen den aktuellen Filterkriterien.' : 'Es sind noch keine Reports verfügbar.');
        if (__VLS_ctx.hasActiveFilters) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.clearFilters) },
                ...{ class: ("btn btn-outline-primary") },
            });
        }
    }
    else {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("table-responsive") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: ("table table-hover mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
            ...{ class: ("bg-light") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            scope: ("col"),
            ...{ class: ("border-0 text-end") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [report] of __VLS_getVForSourceType((__VLS_ctx.reportList))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: ((report.id)),
                ...{ class: ("align-middle") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("fw-bold text-primary") },
            });
            (report.id);
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex flex-column") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("fw-medium") },
            });
            (__VLS_ctx.formatPatientName(report.report_meta));
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatDate(report.report_meta.patient_dob));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("badge bg-light text-dark") },
            });
            (report.report_meta.casenumber || 'N/A');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ((`badge bg-${__VLS_ctx.getStatusColor(report.status)}`)) },
            });
            (__VLS_ctx.getStatusLabel(report.status));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex align-items-center") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ((`material-icons me-1 text-${__VLS_ctx.getFileTypeColor(report.file_type)}`)) },
                ...{ style: ({}) },
            });
            (__VLS_ctx.getFileTypeIcon(report.file_type));
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("text-uppercase small") },
            });
            (report.file_type || 'N/A');
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("d-flex flex-column") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: ("small") },
            });
            (__VLS_ctx.formatDateTime(report.updated_at));
            __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                ...{ class: ("text-muted") },
            });
            (__VLS_ctx.formatDate(report.created_at));
            __VLS_elementAsFunction(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: ("text-end") },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: ("btn-group") },
            });
            const __VLS_0 = {}.RouterLink;
            /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
            // @ts-ignore
            const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
                to: (({ name: 'ReportDetail', params: { id: report.id } })),
                ...{ class: ("btn btn-outline-primary btn-sm") },
                title: ((`Report ${report.id} anzeigen`)),
            }));
            const __VLS_2 = __VLS_1({
                to: (({ name: 'ReportDetail', params: { id: report.id } })),
                ...{ class: ("btn btn-outline-primary btn-sm") },
                title: ((`Report ${report.id} anzeigen`)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_1));
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
                ...{ style: ({}) },
            });
            __VLS_5.slots.default;
            var __VLS_5;
            const __VLS_6 = {}.RouterLink;
            /** @type { [typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ] } */ ;
            // @ts-ignore
            const __VLS_7 = __VLS_asFunctionalComponent(__VLS_6, new __VLS_6({
                to: (({ name: 'ReportDetail', params: { id: report.id } })),
                ...{ class: ("btn btn-primary btn-sm") },
                title: ((`Report ${report.id} bearbeiten`)),
            }));
            const __VLS_8 = __VLS_7({
                to: (({ name: 'ReportDetail', params: { id: report.id } })),
                ...{ class: ("btn btn-primary btn-sm") },
                title: ((`Report ${report.id} bearbeiten`)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_7));
            __VLS_elementAsFunction(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: ("material-icons") },
                ...{ style: ({}) },
            });
            __VLS_11.slots.default;
            var __VLS_11;
        }
    }
    if (__VLS_ctx.showDebugInfo && __VLS_ctx.debugInfo.length > 0) {
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card mt-4") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-header") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
            ...{ class: ("mb-0") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("card-body") },
        });
        __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ("list-group") },
        });
        for (const [info, index] of __VLS_getVForSourceType((__VLS_ctx.debugInfo))) {
            __VLS_elementAsFunction(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: ((index)),
                ...{ class: ((`list-group-item ${info.success ? 'list-group-item-success' : 'list-group-item-warning'}`)) },
            });
            __VLS_elementAsFunction(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (info.source);
            (info.message);
            if (info.details) {
                __VLS_elementAsFunction(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
                    ...{ class: ("d-block text-muted mt-1") },
                });
                (info.details);
            }
        }
    }
    ['container-fluid', 'py-4', 'row', 'col-12', 'card', 'mb-4', 'card-header', 'pb-0', 'd-flex', 'align-items-center', 'justify-content-between', 'mb-0', 'text-muted', 'mb-0', 'btn-group', 'btn', 'btn-outline-secondary', 'btn-sm', 'material-icons', 'btn', 'btn-primary', 'btn-sm', 'material-icons', 'card', 'mb-4', 'card-header', 'mb-0', 'card-body', 'row', 'col-md-3', 'form-label', 'form-select', 'form-select-sm', 'col-md-3', 'form-label', 'form-select', 'form-select-sm', 'col-md-3', 'form-label', 'form-control', 'form-control-sm', 'col-md-3', 'form-label', 'btn-group', 'd-block', 'btn', 'btn-primary', 'btn-sm', 'me-2', 'btn', 'btn-outline-secondary', 'btn-sm', 'card', 'card-header', 'd-flex', 'justify-content-between', 'align-items-center', 'mb-0', 'badge', 'bg-secondary', 'ms-2', 'd-flex', 'align-items-center', 'text-muted', 'me-3', 'btn-group', 'btn', 'btn-outline-secondary', 'btn-sm', 'btn', 'btn-outline-secondary', 'btn-sm', 'disabled', 'btn', 'btn-outline-secondary', 'btn-sm', 'card-body', 'p-0', 'text-center', 'py-5', 'spinner-border', 'text-primary', 'visually-hidden', 'mt-2', 'text-muted', 'alert', 'alert-danger', 'm-3', 'alert-heading', 'material-icons', 'mb-2', 'btn', 'btn-outline-danger', 'btn-sm', 'text-center', 'py-5', 'material-icons', 'text-muted', 'mt-3', 'text-muted', 'btn', 'btn-outline-primary', 'table-responsive', 'table', 'table-hover', 'mb-0', 'bg-light', 'border-0', 'border-0', 'border-0', 'border-0', 'border-0', 'border-0', 'border-0', 'text-end', 'align-middle', 'fw-bold', 'text-primary', 'd-flex', 'flex-column', 'fw-medium', 'text-muted', 'badge', 'bg-light', 'text-dark', 'd-flex', 'align-items-center', 'text-uppercase', 'small', 'd-flex', 'flex-column', 'small', 'text-muted', 'text-end', 'btn-group', 'btn', 'btn-outline-primary', 'btn-sm', 'material-icons', 'btn', 'btn-primary', 'btn-sm', 'material-icons', 'card', 'mt-4', 'card-header', 'mb-0', 'card-body', 'list-group', 'd-block', 'text-muted', 'mt-1',];
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
            error: error,
            reportList: reportList,
            totalReports: totalReports,
            currentPage: currentPage,
            totalPages: totalPages,
            pageSize: pageSize,
            showFilters: showFilters,
            showDebugInfo: showDebugInfo,
            debugInfo: debugInfo,
            filters: filters,
            hasActiveFilters: hasActiveFilters,
            refreshReports: refreshReports,
            retryLoad: retryLoad,
            toggleFilters: toggleFilters,
            applyFilters: applyFilters,
            clearFilters: clearFilters,
            nextPage: nextPage,
            previousPage: previousPage,
            formatPatientName: formatPatientName,
            formatDate: formatDate,
            formatDateTime: formatDateTime,
            getStatusColor: getStatusColor,
            getStatusLabel: getStatusLabel,
            getFileTypeIcon: getFileTypeIcon,
            getFileTypeColor: getFileTypeColor,
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
