import { ref, computed, watch } from 'vue';
import axiosInstance, { r } from '@/api/axiosInstance';
const url = r('evaluate-requirements/');
const props = defineProps();
const loading = ref(false);
const error = ref(null);
const results = ref([]);
// fetcher
async function fetchRequirements() {
    if (!props.patientExaminationId) {
        results.value = [];
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        const payload = {
            patient_examination_id: props.patientExaminationId,
        };
        if (props.requirementSetIds && props.requirementSetIds.length > 0) {
            payload.requirement_set_ids = props.requirementSetIds;
        }
        const { data } = await axiosInstance.post(url, payload);
        // Store all results; we filter later
        results.value = data.results ?? [];
        // High-level backend errors can be shown as banner
        if (!data.ok && data.errors?.length) {
            error.value = data.errors.join(' | ');
        }
    }
    catch (e) {
        error.value =
            e?.response?.data?.detail ||
                e?.message ||
                'Unbekannter Fehler bei der Anforderungsprüfung';
    }
    finally {
        loading.value = false;
    }
}
// visible at all only if we have a PE id
const visible = computed(() => !!props.patientExaminationId);
// filter for issues (unmet or errored)
const issueList = computed(() => (props.showOnlyUnmet ?? true)
    ? results.value.filter((r) => !r.met || r.error)
    : results.value);
const hasIssues = computed(() => issueList.value.length > 0);
// group by requirement_set_name
const groupedIssues = computed(() => {
    const groups = {};
    for (const res of issueList.value) {
        const key = res.requirement_set_name || 'Allgemein';
        if (!groups[key])
            groups[key] = [];
        groups[key].push(res);
    }
    return groups;
});
// reload when PE or selected sets change
watch(() => [props.patientExaminationId, props.requirementSetIds], () => {
    if (visible.value) {
        fetchRequirements();
    }
    else {
        results.value = [];
    }
}, { deep: true, immediate: true });
// allow parent to trigger reload manually
const __VLS_exposed = { reload: fetchRequirements };
defineExpose(__VLS_exposed);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
if (__VLS_ctx.visible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "container-fluid" },
    });
    if (__VLS_ctx.loading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "spinner-border spinner-border-sm me-2" },
            role: "status",
            'aria-hidden': "true",
        });
    }
    else if (__VLS_ctx.hasIssues) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        for (const [group, setName] of __VLS_getVForSourceType((__VLS_ctx.groupedIssues))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (setName),
                ...{ class: "mt-3" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
                ...{ class: "mb-1" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "fas fa-folder-open me-1" },
            });
            (setName);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "mb-0 ps-3" },
            });
            for (const [issue] of __VLS_getVForSourceType((group))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (issue.requirement_name),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "fw-semibold" },
                });
                (issue.requirement_name);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "text-muted" },
                });
                (issue.details);
                if (issue.error) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "text-danger" },
                    });
                    (issue.error);
                }
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    }
}
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-info']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-border-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fas']} */ ;
/** @type {__VLS_StyleScopedClasses['fa-folder-open']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['ps-3']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            visible: visible,
            hasIssues: hasIssues,
            groupedIssues: groupedIssues,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {
            ...__VLS_exposed,
        };
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
