import { computed, defineComponent, h, onMounted, reactive, watch } from 'vue';
import { useAnonymizationMetricsStore } from '@/stores/anonymizationMetricsStore';
const MetricsStatusTable = defineComponent({
    name: 'MetricsStatusTable',
    props: {
        rows: {
            type: Array,
            required: true
        },
        emptyLabel: {
            type: String,
            required: true
        }
    },
    setup(props) {
        return () => props.rows.length
            ? h('div', { class: 'table-responsive' }, [
                h('table', { class: 'table align-items-center mb-0' }, [
                    h('thead', [
                        h('tr', [
                            h('th', 'Status'),
                            h('th', { class: 'text-end' }, 'Anzahl')
                        ])
                    ]),
                    h('tbody', props.rows.map((row) => h('tr', { key: row.status }, [
                        h('td', row.label),
                        h('td', { class: 'text-end' }, formatInteger(row.count))
                    ])))
                ])
            ])
            : h('p', { class: 'text-muted mb-0' }, props.emptyLabel);
    }
});
const FIELD_LABELS = {
    patient_first_name: 'Vorname',
    patientFirstName: 'Vorname',
    patient_last_name: 'Nachname',
    patientLastName: 'Nachname',
    patient_dob: 'Geburtsdatum',
    patientDob: 'Geburtsdatum',
    patient_gender: 'Geschlecht',
    patientGender: 'Geschlecht',
    examination_date: 'Untersuchungsdatum',
    examinationDate: 'Untersuchungsdatum',
    casenumber: 'Fallnummer',
    center_name: 'Zentrum',
    centerName: 'Zentrum',
    external_id: 'Externe ID',
    externalId: 'Externe ID',
    document_type: 'Dokumenttyp',
    documentType: 'Dokumenttyp'
};
const STATUS_LABELS = {
    not_started: 'Nicht gestartet',
    notStarted: 'Nicht gestartet',
    processing_anonymization: 'Anonymisierung läuft',
    processingAnonymization: 'Anonymisierung läuft',
    done_processing_anonymization: 'Bereit zur Validierung',
    doneProcessingAnonymization: 'Bereit zur Validierung',
    failed: 'Fehlgeschlagen',
    lost: 'LOST',
    validated: 'Validiert',
    pending: 'Ausstehend',
    in_progress: 'In Bearbeitung',
    inProgress: 'In Bearbeitung'
};
const metricsStore = useAnonymizationMetricsStore();
const filterForm = reactive({
    ...metricsStore.filters
});
function syncFilterForm(filters) {
    filterForm.dateFrom = filters.dateFrom || '';
    filterForm.dateTo = filters.dateTo || '';
    filterForm.mediaType = filters.mediaType || 'all';
    filterForm.centerId = filters.centerId ?? '';
    filterForm.documentType = filters.documentType || '';
    filterForm.sourceSystem = filters.sourceSystem || '';
}
watch(() => metricsStore.filters, (filters) => syncFilterForm(filters), { deep: true });
onMounted(() => {
    syncFilterForm(metricsStore.filters);
    metricsStore.fetchMetrics();
});
const workflow = computed(() => metricsStore.data?.workflow);
const fieldQualityRows = computed(() => metricsStore.data?.fieldQuality ?? []);
const workflowCards = computed(() => [
    {
        key: 'pending-validation',
        label: 'Wartet auf Validierung',
        value: formatInteger(workflow.value?.pendingValidation ?? 0),
        icon: 'ni ni-time-alarm',
        iconClass: 'metric-icon-warning'
    },
    {
        key: 'validated',
        label: 'Validiert',
        value: formatInteger(workflow.value?.validated ?? 0),
        icon: 'ni ni-check-bold',
        iconClass: 'metric-icon-success'
    },
    {
        key: 'failed-lost',
        label: 'Fehler / LOST',
        value: formatInteger(workflow.value?.failedLost ?? 0),
        icon: 'ni ni-fat-remove',
        iconClass: 'metric-icon-danger'
    },
    {
        key: 'median-time',
        label: 'Median bis Validierung',
        value: formatDuration(workflow.value?.medianTimeToValidationSeconds ?? null),
        icon: 'ni ni-watch-time',
        iconClass: 'metric-icon-info'
    }
]);
const anonymizationStatusRows = computed(() => statusRows(workflow.value?.totalsByAnonymizationStatus ?? {}));
const validationStatusRows = computed(() => statusRows(workflow.value?.totalsByValidationStatus ?? {}));
const phiRegionCards = computed(() => {
    const phi = metricsStore.data?.phiRegions;
    return [
        {
            key: 'proposal-count',
            label: 'Vorschläge',
            value: formatInteger(phi?.proposalCount ?? 0)
        },
        {
            key: 'human-count',
            label: 'Human-Annotationen',
            value: formatInteger(phi?.humanAnnotationCount ?? 0)
        },
        {
            key: 'matched-count',
            label: 'Treffer',
            value: formatInteger(phi?.matchedCount ?? 0)
        },
        {
            key: 'precision',
            label: 'Precision',
            value: formatPercent(phi?.precision ?? null),
            help: phi?.precision == null ? 'Nicht genug Human-Annotationen' : ''
        },
        {
            key: 'recall',
            label: 'Recall',
            value: formatPercent(phi?.recall ?? null),
            help: phi?.recall == null ? 'Nicht genug Human-Annotationen' : ''
        }
    ];
});
function fieldLabel(fieldName) {
    return FIELD_LABELS[fieldName] || humanizeKey(fieldName);
}
function statusLabel(status) {
    return STATUS_LABELS[status] || humanizeKey(status);
}
function humanizeKey(value) {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_:-]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}
function statusRows(record) {
    return Object.entries(record)
        .map(([status, count]) => ({
        status,
        label: statusLabel(status),
        count
    }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
function formatInteger(value) {
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value);
}
function formatPercent(value) {
    if (value === null || value === undefined)
        return '-';
    const normalized = value > 1 ? value / 100 : value;
    return new Intl.NumberFormat('de-DE', {
        style: 'percent',
        maximumFractionDigits: 1
    }).format(normalized);
}
function formatDuration(seconds) {
    if (seconds === null)
        return 'Keine Daten';
    if (seconds < 60)
        return `${Math.round(seconds)} s`;
    const minutes = seconds / 60;
    if (minutes < 60)
        return `${Math.round(minutes)} min`;
    const hours = minutes / 60;
    if (hours < 48) {
        const formattedHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
        return `${formattedHours} h`;
    }
    const days = hours / 24;
    return `${days.toFixed(1).replace('.', ',')} d`;
}
function formatDateTime(date) {
    return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(date);
}
async function applyFilters() {
    await metricsStore.updateFilters({ ...filterForm });
}
async function resetFilters() {
    metricsStore.resetFilters();
    syncFilterForm(metricsStore.filters);
    await metricsStore.fetchMetrics();
}
async function refreshMetrics() {
    await metricsStore.fetchMetrics();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['phi-metric-box']} */ ;
/** @type {__VLS_StyleScopedClasses['metrics-page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['metrics-page-header']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4 anonymization-metrics-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "metrics-page-header mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-muted mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshMetrics) },
    ...{ class: "btn btn-outline-primary btn-sm" },
    type: "button",
    disabled: (__VLS_ctx.metricsStore.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-bold-right me-1" },
    ...{ class: ({ 'ni-spin': __VLS_ctx.metricsStore.loading }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "metrics-filter-band mb-4" },
    'aria-label': "Filter",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.applyFilters) },
    ...{ class: "row g-3 align-items-end" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
    for: "metrics-date-from",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    id: "metrics-date-from",
    type: "date",
    ...{ class: "form-control" },
});
(__VLS_ctx.filterForm.dateFrom);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
    for: "metrics-date-to",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    id: "metrics-date-to",
    type: "date",
    ...{ class: "form-control" },
});
(__VLS_ctx.filterForm.dateTo);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
    for: "metrics-media-type",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    id: "metrics-media-type",
    value: (__VLS_ctx.filterForm.mediaType),
    ...{ class: "form-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "all",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "pdf",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "video",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
    for: "metrics-center-id",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    id: "metrics-center-id",
    value: (__VLS_ctx.filterForm.centerId),
    type: "text",
    inputmode: "numeric",
    ...{ class: "form-control" },
    placeholder: "Alle",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
    for: "metrics-document-type",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    id: "metrics-document-type",
    value: (__VLS_ctx.filterForm.documentType),
    type: "text",
    ...{ class: "form-control" },
    placeholder: "Alle",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-md-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
    for: "metrics-source-system",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    id: "metrics-source-system",
    value: (__VLS_ctx.filterForm.sourceSystem),
    type: "text",
    ...{ class: "form-control" },
    placeholder: "Alle",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-12 d-flex gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "btn btn-primary btn-sm mb-0" },
    type: "submit",
    disabled: (__VLS_ctx.metricsStore.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetFilters) },
    ...{ class: "btn btn-outline-secondary btn-sm mb-0" },
    type: "button",
    disabled: (__VLS_ctx.metricsStore.loading),
});
if (__VLS_ctx.metricsStore.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.metricsStore.error);
}
if (__VLS_ctx.metricsStore.loading && !__VLS_ctx.metricsStore.data) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-border text-primary" },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mt-2 text-muted" },
    });
}
else if (__VLS_ctx.metricsStore.data) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3 mb-4" },
    });
    for (const [card] of __VLS_getVForSourceType((__VLS_ctx.workflowCards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (card.key),
            ...{ class: "col-sm-6 col-xl-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card metric-summary-card h-100" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex align-items-center justify-content-between gap-2" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "metric-label" },
        });
        (card.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "metric-value" },
        });
        (card.value);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "metric-icon" },
            ...{ class: (card.iconClass) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: (card.icon) },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-4 mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-lg-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    const __VLS_0 = {}.MetricsStatusTable;
    /** @type {[typeof __VLS_components.MetricsStatusTable, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        rows: (__VLS_ctx.anonymizationStatusRows),
        emptyLabel: "Keine Anonymisierungsstatus vorhanden",
    }));
    const __VLS_2 = __VLS_1({
        rows: (__VLS_ctx.anonymizationStatusRows),
        emptyLabel: "Keine Anonymisierungsstatus vorhanden",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-lg-6" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card h-100" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    const __VLS_4 = {}.MetricsStatusTable;
    /** @type {[typeof __VLS_components.MetricsStatusTable, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
        rows: (__VLS_ctx.validationStatusRows),
        emptyLabel: "Keine Validierungsstatus vorhanden",
    }));
    const __VLS_6 = __VLS_5({
        rows: (__VLS_ctx.validationStatusRows),
        emptyLabel: "Keine Validierungsstatus vorhanden",
    }, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    if (__VLS_ctx.fieldQualityRows.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "table-responsive" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "table align-items-center mb-0" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({
            ...{ class: "text-end" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [row] of __VLS_getVForSourceType((__VLS_ctx.fieldQualityRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (row.fieldName),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (__VLS_ctx.fieldLabel(row.fieldName));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-end" },
            });
            (__VLS_ctx.formatInteger(row.support));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-end" },
            });
            (__VLS_ctx.formatPercent(row.changedRate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-end" },
            });
            (__VLS_ctx.formatPercent(row.exactMatchRate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-end" },
            });
            (__VLS_ctx.formatPercent(row.meanSimilarity));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                ...{ class: "text-end" },
            });
            (__VLS_ctx.formatInteger(row.missingAfterValidationCount));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mb-0" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header pb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row g-3" },
    });
    for (const [metric] of __VLS_getVForSourceType((__VLS_ctx.phiRegionCards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (metric.key),
            ...{ class: "col-sm-6 col-xl" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "phi-metric-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "metric-label" },
        });
        (metric.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "metric-value" },
        });
        (metric.value);
        if (metric.help) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
            (metric.help);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted mt-3" },
    });
    (__VLS_ctx.metricsStore.data.schemaVersion);
    if (__VLS_ctx.metricsStore.lastUpdated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDateTime(__VLS_ctx.metricsStore.lastUpdated));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-info" },
        role: "alert",
    });
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['anonymization-metrics-page']} */ ;
/** @type {__VLS_StyleScopedClasses['metrics-page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-bold-right']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-spin']} */ ;
/** @type {__VLS_StyleScopedClasses['metrics-filter-band']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-end']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-6']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-6']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-sm-6']} */ ;
/** @type {__VLS_StyleScopedClasses['col-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['phi-metric-box']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-label']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-value']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MetricsStatusTable: MetricsStatusTable,
            metricsStore: metricsStore,
            filterForm: filterForm,
            fieldQualityRows: fieldQualityRows,
            workflowCards: workflowCards,
            anonymizationStatusRows: anonymizationStatusRows,
            validationStatusRows: validationStatusRows,
            phiRegionCards: phiRegionCards,
            fieldLabel: fieldLabel,
            formatInteger: formatInteger,
            formatPercent: formatPercent,
            formatDateTime: formatDateTime,
            applyFilters: applyFilters,
            resetFilters: resetFilters,
            refreshMetrics: refreshMetrics,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
