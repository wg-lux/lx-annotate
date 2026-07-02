import { computed, ref } from 'vue';
import { extractFindingId, getFindingDisplayName } from '@/api/findings.contract';
import { findingsApi } from '@/api/findingsApi';
import { usePatientFindingStore } from '@/stores/patientFindingStore';
const isActivePatientFinding = (row) => row.isActive !== false && row.is_active !== false;
const getPatientExaminationIdFromRow = (row) => {
    const candidate = row.patientExamination ?? row.patient_examination;
    return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
};
export function useFindingSelectors() {
    const patientFindingStore = usePatientFindingStore();
    const catalogState = useFindingCatalogState();
    const catalogFindings = computed(() => catalogState.findings.value);
    const loading = computed(() => catalogState.loading.value || patientFindingStore.loading);
    const ensureCatalogLoaded = async () => {
        if (!catalogState.findings.value.length) {
            await catalogState.fetchFindings();
        }
        return catalogState.findings.value;
    };
    const ensurePatientFindingsLoaded = async (patientExaminationId) => {
        if (!patientExaminationId)
            return [];
        await patientFindingStore.fetchPatientFindings(patientExaminationId);
        return patientFindingStore.patientFindings;
    };
    const getFindingById = (findingId) => catalogState.findingsById.value.get(findingId);
    const getFindingNameById = (findingId, fallbackName) => {
        if (fallbackName)
            return fallbackName;
        return getFindingDisplayName(getFindingById(findingId) ?? { id: findingId, name: `Befund ${findingId}` });
    };
    const getAttachedFindingIds = (patientExaminationId) => {
        if (!patientExaminationId)
            return [];
        const rows = patientFindingStore.patientFindings.filter((row) => isActivePatientFinding(row) && getPatientExaminationIdFromRow(row) === patientExaminationId);
        const ids = rows
            .map((row) => extractFindingId(row.finding))
            .filter((findingId) => findingId !== null);
        if (ids.length > 0) {
            catalogState.patientFindingIdsByPatientExamination.value.set(patientExaminationId, Array.from(new Set(ids)));
            return ids;
        }
        return catalogState.patientFindingIdsByPatientExamination.value.get(patientExaminationId) ?? [];
    };
    const isFindingAttached = (patientExaminationId, findingId) => getAttachedFindingIds(patientExaminationId).includes(findingId);
    return {
        catalogFindings,
        loading,
        ensureCatalogLoaded,
        ensurePatientFindingsLoaded,
        getFindingById,
        getFindingNameById,
        getAttachedFindingIds,
        isFindingAttached
    };
}
const catalogFindingsState = ref([]);
const catalogFindingsByIdState = ref(new Map());
const patientFindingIdsByPatientExaminationState = ref(new Map());
const catalogLoadingState = ref(false);
const catalogErrorState = ref(null);
function useFindingCatalogState() {
    const fetchFindings = async () => {
        try {
            catalogLoadingState.value = true;
            catalogErrorState.value = null;
            const nextFindings = await findingsApi.listFindings();
            catalogFindingsState.value = nextFindings;
            catalogFindingsByIdState.value = new Map(nextFindings.map((finding) => [finding.id, finding]));
            return catalogFindingsState.value;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown findings error';
            catalogErrorState.value = `Fehler beim Laden der Befunde: ${message}`;
            console.error('Fetch findings error:', error);
            return [];
        }
        finally {
            catalogLoadingState.value = false;
        }
    };
    return {
        findings: catalogFindingsState,
        findingsById: catalogFindingsByIdState,
        patientFindingIdsByPatientExamination: patientFindingIdsByPatientExaminationState,
        loading: catalogLoadingState,
        error: catalogErrorState,
        fetchFindings
    };
}
