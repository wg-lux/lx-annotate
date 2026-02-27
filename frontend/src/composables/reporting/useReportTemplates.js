import { computed, ref } from 'vue';
import axiosInstance from '@/api/axiosInstance';
const REPORT_TEMPLATE_BASE = '/base_api/report-templates';
function titleFromSectionName(name) {
    return name
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
function normalizeSections(sections) {
    return (sections || [])
        .slice()
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((section) => {
        const findings = Array.isArray(section.findings) ? section.findings : [];
        const requiredFindingsCount = findings.filter((f) => !!f.required).length;
        const optionalFindingsCount = Math.max(0, findings.length - requiredFindingsCount);
        const requiredClassificationsCount = findings.reduce((acc, finding) => acc + (finding.classifications || []).filter((classification) => !!classification.required).length, 0);
        return {
            name: section.name,
            position: section.position,
            title: titleFromSectionName(section.name),
            subtitle: `${findings.length} Befunde · ${requiredFindingsCount} erforderlich`,
            findings,
            requiredFindingsCount,
            optionalFindingsCount,
            requiredClassificationsCount
        };
    });
}
export function useReportTemplates(params) {
    const moduleName = ref(params?.initialModuleName || 'report_template_examples');
    const selectedTemplateName = ref(params?.initialTemplateName || null);
    const templateOptions = ref([]);
    const selectedTemplate = ref(null);
    const loading = ref(false);
    const errorMessage = ref(null);
    const sectionBlocks = computed(() => normalizeSections(selectedTemplate.value?.reportSections));
    function clearError() {
        errorMessage.value = null;
    }
    function setModuleName(next) {
        moduleName.value = next || 'report_template_examples';
    }
    async function fetchTemplateByName(templateName, opts) {
        const useModule = opts?.moduleOverride || moduleName.value;
        if (!templateName || !useModule)
            return null;
        loading.value = true;
        clearError();
        try {
            const res = await axiosInstance.get(`${REPORT_TEMPLATE_BASE}/${encodeURIComponent(useModule)}/${encodeURIComponent(templateName)}`);
            const payload = res.data;
            const existingIndex = templateOptions.value.findIndex((item) => item.name === payload.name);
            if (existingIndex >= 0) {
                templateOptions.value.splice(existingIndex, 1, payload);
            }
            else {
                templateOptions.value = [payload, ...templateOptions.value];
            }
            if (opts?.setAsSelected ?? true) {
                selectedTemplate.value = payload;
                selectedTemplateName.value = payload.name;
            }
            return payload;
        }
        catch (e) {
            errorMessage.value =
                e?.response?.data?.detail || e?.message || 'Fehler beim Laden des Report-Templates.';
            return null;
        }
        finally {
            loading.value = false;
        }
    }
    async function fetchTemplatesByExamination(examinationName, opts) {
        const useModule = opts?.moduleOverride || moduleName.value;
        if (!examinationName || !useModule) {
            templateOptions.value = [];
            selectedTemplate.value = null;
            return [];
        }
        loading.value = true;
        clearError();
        try {
            const res = await axiosInstance.get(`${REPORT_TEMPLATE_BASE}/by-examination/${encodeURIComponent(useModule)}/${encodeURIComponent(examinationName)}`);
            const templates = Array.isArray(res.data) ? res.data : [];
            templateOptions.value = templates;
            const preferredName = selectedTemplateName.value;
            const preferredTemplate = (preferredName && templates.find((item) => item.name === preferredName)) || templates[0] || null;
            selectedTemplate.value = preferredTemplate;
            selectedTemplateName.value = preferredTemplate?.name || null;
            return templates;
        }
        catch (e) {
            errorMessage.value =
                e?.response?.data?.detail ||
                    e?.message ||
                    'Fehler beim Laden der Report-Templates für die Untersuchung.';
            templateOptions.value = [];
            selectedTemplate.value = null;
            return [];
        }
        finally {
            loading.value = false;
        }
    }
    async function selectTemplateByName(name) {
        if (!name) {
            selectedTemplateName.value = null;
            selectedTemplate.value = null;
            return;
        }
        selectedTemplateName.value = name;
        const local = templateOptions.value.find((item) => item.name === name) || null;
        if (local) {
            selectedTemplate.value = local;
            return;
        }
        await fetchTemplateByName(name, { setAsSelected: true });
    }
    return {
        moduleName,
        selectedTemplateName,
        templateOptions,
        selectedTemplate,
        sectionBlocks,
        loading,
        errorMessage,
        clearError,
        setModuleName,
        fetchTemplateByName,
        fetchTemplatesByExamination,
        selectTemplateByName
    };
}
