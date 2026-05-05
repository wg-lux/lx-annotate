import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchTerminologyBundles, importTerminologyBundle, MEDICAL_FIELD_OPTIONS, selectTerminologyBundle } from '@/api/terminologyApi';
const MEDICAL_FIELD_STORAGE_KEY = 'terminologyMedicalField.v1';
const DEFAULT_KB_MODULE = 'report_template_examples';
function loadPersistedMedicalField() {
    try {
        const value = localStorage.getItem(MEDICAL_FIELD_STORAGE_KEY);
        if (value === 'gastroenterology')
            return value;
    }
    catch { }
    return 'gastroenterology';
}
function bundleKey(bundle) {
    return `${bundle.moduleName}@@${bundle.version}`;
}
export const useTerminologyStore = defineStore('terminology', () => {
    const bundles = ref([]);
    const activeBundle = ref(null);
    const registryPath = ref('');
    const loading = ref(false);
    const selecting = ref(false);
    const importing = ref(false);
    const error = ref(null);
    const selectedMedicalField = ref(loadPersistedMedicalField());
    const lastSelectionCounts = ref(null);
    const activeModuleName = computed(() => activeBundle.value?.moduleName || DEFAULT_KB_MODULE);
    const activeBundleKey = computed(() => (activeBundle.value ? bundleKey(activeBundle.value) : ''));
    const activeBundleLabel = computed(() => {
        if (!activeBundle.value)
            return 'Standard-Terminologie';
        return `${activeBundle.value.moduleName} · ${activeBundle.value.version}`;
    });
    const filteredBundles = computed(() => bundles.value.filter((bundle) => !bundle.medicalField || bundle.medicalField === selectedMedicalField.value));
    const medicalFieldLabel = computed(() => MEDICAL_FIELD_OPTIONS.find((option) => option.value === selectedMedicalField.value)?.label ||
        'Gastroenterologie');
    async function loadBundles() {
        loading.value = true;
        error.value = null;
        try {
            const response = await fetchTerminologyBundles();
            bundles.value = response.bundles;
            activeBundle.value = response.active;
            registryPath.value = response.registryPath;
            lastSelectionCounts.value = null;
        }
        catch (caught) {
            error.value =
                caught?.response?.data?.detail ||
                    caught?.message ||
                    'Terminologiepakete konnten nicht geladen werden.';
            throw caught;
        }
        finally {
            loading.value = false;
        }
    }
    async function selectBundle(bundle) {
        selecting.value = true;
        error.value = null;
        try {
            const response = await selectTerminologyBundle({
                moduleName: bundle.moduleName,
                version: bundle.version
            });
            activeBundle.value = response.active;
            lastSelectionCounts.value = response.counts;
            bundles.value = bundles.value.map((candidate) => ({
                ...candidate,
                isActive: candidate.moduleName === response.active.moduleName &&
                    candidate.version === response.active.version
            }));
            return response;
        }
        catch (caught) {
            error.value =
                caught?.response?.data?.detail ||
                    caught?.message ||
                    'Terminologiepaket konnte nicht aktiviert werden.';
            throw caught;
        }
        finally {
            selecting.value = false;
        }
    }
    async function importBundle(file) {
        importing.value = true;
        error.value = null;
        try {
            const response = await importTerminologyBundle(file);
            const imported = response.imported;
            activeBundle.value = imported;
            registryPath.value = response.registryPath;
            lastSelectionCounts.value = response.counts;
            const withoutImported = bundles.value.filter((candidate) => candidate.moduleName !== imported.moduleName || candidate.version !== imported.version);
            bundles.value = [
                ...withoutImported.map((candidate) => ({ ...candidate, isActive: false })),
                imported
            ].sort((left, right) => `${left.moduleName}@@${left.version}`.localeCompare(`${right.moduleName}@@${right.version}`));
            return response;
        }
        catch (caught) {
            error.value =
                caught?.response?.data?.detail ||
                    caught?.message ||
                    'Terminologiepaket konnte nicht importiert werden.';
            throw caught;
        }
        finally {
            importing.value = false;
        }
    }
    function setMedicalField(value) {
        selectedMedicalField.value = value;
        try {
            localStorage.setItem(MEDICAL_FIELD_STORAGE_KEY, value);
        }
        catch { }
    }
    function findBundleByKey(key) {
        return bundles.value.find((bundle) => bundleKey(bundle) === key) || null;
    }
    return {
        bundles,
        activeBundle,
        registryPath,
        loading,
        selecting,
        importing,
        error,
        selectedMedicalField,
        lastSelectionCounts,
        activeModuleName,
        activeBundleKey,
        activeBundleLabel,
        filteredBundles,
        medicalFieldLabel,
        medicalFieldOptions: MEDICAL_FIELD_OPTIONS,
        bundleKey,
        findBundleByKey,
        importBundle,
        loadBundles,
        selectBundle,
        setMedicalField
    };
});
