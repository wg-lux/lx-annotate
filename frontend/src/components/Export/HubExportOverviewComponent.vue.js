import { computed, onMounted, ref, watch } from 'vue';
import { useHubExportStore } from '@/stores/hubExportStore';
const hubExportStore = useHubExportStore();
const selectedKeys = ref(new Set());
const selectedTargetNodeKey = ref(null);
const selectionKey = (item) => `${item.resourceKind}:${item.id}`;
const filteredItems = computed(() => hubExportStore.items.filter((item) => item.eligible || item.markedForUpload));
const selectableItems = computed(() => filteredItems.value.filter((item) => item.eligible));
const allSelectableChecked = computed(() => selectableItems.value.length > 0 &&
    selectableItems.value.every((item) => selectedKeys.value.has(selectionKey(item))));
const selectedEligibleItems = computed(() => filteredItems.value
    .filter((item) => selectedKeys.value.has(selectionKey(item)) && item.eligible && !item.markedForUpload)
    .map((item) => ({ id: item.id, resourceKind: item.resourceKind })));
const selectedMarkedItems = computed(() => filteredItems.value
    .filter((item) => selectedKeys.value.has(selectionKey(item)) && item.markedForUpload)
    .map((item) => ({ id: item.id, resourceKind: item.resourceKind })));
const refreshOverview = async () => {
    const queryTarget = hubExportStore.hubNodes.length === 1 ? selectedTargetNodeKey.value : null;
    const data = await hubExportStore.fetchOverview(queryTarget);
    selectedTargetNodeKey.value = data.selectedTargetNodeKey;
};
const toggleSelected = (item) => {
    const next = new Set(selectedKeys.value);
    const key = selectionKey(item);
    if (next.has(key)) {
        next.delete(key);
    }
    else {
        next.add(key);
    }
    selectedKeys.value = next;
};
const toggleSelectAll = () => {
    if (allSelectableChecked.value) {
        selectedKeys.value = new Set();
        return;
    }
    selectedKeys.value = new Set(selectableItems.value.map((item) => selectionKey(item)));
};
const markSelected = async () => {
    await hubExportStore.markResources(selectedEligibleItems.value);
    selectedKeys.value = new Set();
};
const unmarkSelected = async () => {
    await hubExportStore.unmarkResources(selectedMarkedItems.value);
    selectedKeys.value = new Set();
};
const statusLabel = (status) => {
    const labels = {
        anonymized: 'Anonymisiert',
        done_processing_anonymization: 'Fertig',
        validated: 'Validiert',
        processing_anonymization: 'In Bearbeitung',
        extracting_frames: 'Frames',
        failed: 'Fehlgeschlagen',
        not_started: 'Nicht gestartet'
    };
    return labels[status] || status;
};
const statusBadgeClass = (status) => {
    const classes = {
        anonymized: 'bg-success',
        done_processing_anonymization: 'bg-success',
        validated: 'bg-success',
        processing_anonymization: 'bg-warning',
        extracting_frames: 'bg-info',
        failed: 'bg-danger',
        not_started: 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
};
watch(() => hubExportStore.selectedTargetNodeKey, (next) => {
    if (next)
        selectedTargetNodeKey.value = next;
});
onMounted(async () => {
    await refreshOverview();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header pb-0 d-flex justify-content-between align-items-center flex-wrap gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-muted mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex align-items-center gap-2 flex-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (__VLS_ctx.refreshOverview) },
    value: (__VLS_ctx.selectedTargetNodeKey),
    ...{ class: "form-select form-select-sm hub-target-select" },
    disabled: (__VLS_ctx.hubExportStore.hubNodes.length !== 1),
    'data-test': "hub-export-target-select",
});
for (const [node] of __VLS_getVForSourceType((__VLS_ctx.hubExportStore.hubNodes))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (node.nodeKey),
        value: (node.nodeKey),
    });
    (node.displayName);
    (node.nodeKey);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshOverview) },
    ...{ class: "btn btn-outline-primary btn-sm" },
    disabled: (__VLS_ctx.hubExportStore.loading),
    'data-test': "hub-export-refresh",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body" },
});
if (__VLS_ctx.hubExportStore.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.hubExportStore.error);
}
if (!__VLS_ctx.hubExportStore.configReady) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning" },
        role: "alert",
        'data-test': "hub-export-config-warning",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.hubExportStore.configError || 'Es wird ein aktiver Site-Node und genau ein aktiver Central-Hub-Node benötigt.');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "text-sm text-muted" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "fw-semibold" },
});
(__VLS_ctx.hubExportStore.sourceNodeKey || 'nicht konfiguriert');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex gap-2 flex-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.markSelected) },
    ...{ class: "btn btn-outline-success btn-sm" },
    disabled: (!__VLS_ctx.selectedEligibleItems.length || !__VLS_ctx.hubExportStore.configReady),
    'data-test': "hub-export-mark-selected",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.unmarkSelected) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (!__VLS_ctx.selectedMarkedItems.length || !__VLS_ctx.hubExportStore.configReady),
    'data-test': "hub-export-unmark-selected",
});
if (!__VLS_ctx.filteredItems.length && !__VLS_ctx.hubExportStore.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-muted mb-0" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-responsive" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-hover" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({
        ...{ class: "table-light" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.toggleSelectAll) },
        type: "checkbox",
        ...{ class: "form-check-input" },
        checked: (__VLS_ctx.allSelectableChecked),
        'data-test': "hub-export-select-all",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (`${item.resourceKind}-${item.id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!!(!__VLS_ctx.filteredItems.length && !__VLS_ctx.hubExportStore.loading))
                        return;
                    __VLS_ctx.toggleSelected(item);
                } },
            type: "checkbox",
            ...{ class: "form-check-input" },
            disabled: (!item.eligible),
            checked: (__VLS_ctx.selectedKeys.has(__VLS_ctx.selectionKey(item))),
            'data-test': (`hub-export-select-${item.resourceKind}-${item.id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.filename);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge" },
            ...{ class: (item.resourceKind === 'video' ? 'bg-info' : 'bg-secondary') },
        });
        (item.resourceKind.toUpperCase());
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge" },
            ...{ class: (__VLS_ctx.statusBadgeClass(item.anonymizationStatus)) },
        });
        (__VLS_ctx.statusLabel(item.anonymizationStatus));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (item.processedMediaPresent ? 'text-success' : 'text-danger') },
        });
        (item.processedMediaPresent ? 'Ja' : 'Nein');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.sourceCenterKey || item.sourceCenterName || '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge" },
            ...{ class: (item.markedForUpload ? 'bg-success' : 'bg-light text-dark') },
        });
        (item.markedForUpload ? 'Ja' : 'Nein');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge" },
            ...{ class: (item.outboundStatus ? 'bg-primary' : 'bg-light text-dark') },
        });
        (item.outboundStatus || 'nicht markiert');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "text-danger small" },
        });
        (item.lastError || '-');
    }
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['hub-target-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['table-responsive']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-hover']} */ ;
/** @type {__VLS_StyleScopedClasses['table-light']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-check-input']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            hubExportStore: hubExportStore,
            selectedKeys: selectedKeys,
            selectedTargetNodeKey: selectedTargetNodeKey,
            selectionKey: selectionKey,
            filteredItems: filteredItems,
            allSelectableChecked: allSelectableChecked,
            selectedEligibleItems: selectedEligibleItems,
            selectedMarkedItems: selectedMarkedItems,
            refreshOverview: refreshOverview,
            toggleSelected: toggleSelected,
            toggleSelectAll: toggleSelectAll,
            markSelected: markSelected,
            unmarkSelected: unmarkSelected,
            statusLabel: statusLabel,
            statusBadgeClass: statusBadgeClass,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
