import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axiosInstance, { r } from '@/api/axiosInstance';
import { findingsApi } from '@/api/findingsApi';
import { fetchPatientExaminationDraft } from '@/api/reportDraftApi';
import { buildReportTemplateRuntimePayload, fetchReportTemplatesByExamination } from '@/api/reportTemplatesApi';
import { endpoints } from '@/types/api/endpoints';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
import { useTerminologyStore } from '@/stores/terminologyStore';
import { fetchPatientTimelineLatest, pickPreferredStream } from '@/api/reportingTimelineApi';
const route = useRoute();
const router = useRouter();
const flow = useReportingFlowStore();
const terminology = useTerminologyStore();
const selectedVideoStreamUrl = ref(null);
const selectedFrameStreamUrl = ref(null);
const isContextPanelOpen = ref(true);
const terminologyLoadPromise = ref(null);
const terminologyZipInput = ref(null);
const terminologyImportMessage = ref('');
const patientExaminationOptions = ref([]);
const patientExaminationOptionsLoading = ref(false);
const patientExaminationOptionsError = ref(null);
const draftBootstrapInFlight = ref(null);
const draftBootstrapError = ref(null);
const routePatientExaminationId = computed(() => {
    const parsed = Number(route.params.patient_examination_id);
    if (!Number.isFinite(parsed))
        return null;
    return parsed > 0 ? parsed : null;
});
const selectedPatientExaminationId = computed(() => routePatientExaminationId.value ?? flow.patientExaminationId ?? '');
const pe = computed(() => flow.patientExaminationId || ':patient_examination_id');
const navItems = computed(() => [
    {
        label: 'Berichtsvorlagen',
        to: '/reporting/template-builder',
        requiresPatientExamination: false
    },
    { label: 'Arbeitsliste', to: '/reporting', requiresPatientExamination: false },
    { label: 'Falldaten', to: '/reporting/case-setup', requiresPatientExamination: false },
    { label: 'Befunde', to: `/reporting/${pe.value}/findings`, requiresPatientExamination: true },
    {
        label: 'Bericht schreiben',
        to: `/reporting/${pe.value}/report-editor`,
        requiresPatientExamination: true
    },
    {
        label: 'Bilder auswählen',
        to: `/reporting/${pe.value}/frame-selector`,
        requiresPatientExamination: true
    },
    { label: 'Abschluss', to: `/reporting/${pe.value}/finalized`, requiresPatientExamination: true }
]);
const preferredReportStream = computed(() => pickPreferredStream(flow.mediaPreload?.latestReport?.streamOptions || []));
const preferredReportDownload = computed(() => preferredReportStream.value
    ? `${preferredReportStream.value}${preferredReportStream.value.includes('?') ? '&' : '?'}download=1`
    : null);
const preferredVideoStream = computed(() => pickPreferredStream(flow.mediaPreload?.latestVideo?.streamOptions || []));
const activeKbModule = computed(() => terminology.activeBundle
    ? terminology.activeModuleName
    : flow.selectedKbModule || 'report_template_examples');
const draftSummaryLabel = computed(() => {
    const draft = flow.currentRuntimeDraft;
    if (!draft)
        return 'leer';
    return draft.hydratedFrom === 'session_storage' || draft.hydratedFrom === 'draft_api'
        ? 'wiederhergestellt'
        : 'initialisiert';
});
const selectedPatientExaminationLabel = computed(() => {
    const selected = patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
        patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
        null;
    if (selected)
        return selected.label;
    return flow.patientExaminationId ? `#${flow.patientExaminationId}` : 'Noch nicht gewählt';
});
const selectedTemplateLabel = computed(() => flow.selectedTemplateName || 'Noch keine Vorlage gewählt');
const selectedTerminologyLabel = computed(() => {
    const field = terminology.medicalFieldLabel;
    const bundle = terminology.activeBundle ? terminology.activeBundleLabel : 'Standard-Terminologie';
    return `${field} · ${bundle}`;
});
const currentStepLabel = computed(() => {
    const current = navItems.value.find((item) => isActive(item.to));
    return current?.label || 'Arbeitsbereich';
});
const mediaPreloadLabel = computed(() => {
    if (flow.mediaPreloadStatus === 'idle')
        return 'nicht geladen';
    if (flow.mediaPreloadStatus === 'loading')
        return 'wird geladen';
    if (flow.mediaPreloadStatus === 'error')
        return 'Fehler';
    return 'bereit';
});
const nextStepHint = computed(() => {
    if (!flow.patientExaminationId) {
        return 'Wählen Sie zuerst eine Patientenuntersuchung, um Befunde und Bericht zu bearbeiten.';
    }
    if (!flow.currentRuntimeDraft) {
        return 'Der Entwurf wird vorbereitet. Danach können Sie direkt mit den Befunden starten.';
    }
    if (route.path.includes('/report-editor')) {
        return 'Bericht prüfen, Text ergänzen und anschließend zum Abschluss wechseln.';
    }
    if (route.path.includes('/frame-selector')) {
        return 'Passende Bilder auswählen und danach den Bericht abschließen.';
    }
    return 'Beginnen Sie mit den Befunden und arbeiten Sie sich dann zum Bericht vor.';
});
function openUrl(url) {
    if (!url)
        return;
    window.open(url, '_blank', 'noopener,noreferrer');
}
function selectVideoStream(url) {
    selectedVideoStreamUrl.value = url;
}
function selectFrameStream(url) {
    selectedFrameStreamUrl.value = url;
}
function openTerminologyZipPicker() {
    terminologyImportMessage.value = '';
    terminologyZipInput.value?.click();
}
async function importTerminologyZip(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    terminologyImportMessage.value = '';
    try {
        await terminology.importBundle(file);
        terminologyImportMessage.value = 'Terminologiepaket importiert und geladen.';
    }
    catch (error) {
        terminologyImportMessage.value =
            terminology.error ||
                error?.response?.data?.detail ||
                error?.message ||
                'Terminologiepaket konnte nicht importiert werden.';
    }
    finally {
        input.value = '';
    }
}
function ensureTerminologyBundlesLoaded() {
    if (terminology.activeBundle || terminology.bundles.length || terminology.error) {
        return Promise.resolve();
    }
    if (terminologyLoadPromise.value)
        return terminologyLoadPromise.value;
    const task = terminology
        .loadBundles()
        .catch((error) => {
        console.error('Failed to load terminology bundles:', error);
    })
        .finally(() => {
        terminologyLoadPromise.value = null;
    });
    terminologyLoadPromise.value = task;
    return task;
}
function toPositiveInteger(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function resolvePatientKey(raw, patientExaminationId) {
    const patient = raw.patient && typeof raw.patient === 'object' ? raw.patient : null;
    const patientHash = (typeof patient?.patient_hash === 'string' && patient.patient_hash.trim()) ||
        (typeof patient?.patientHash === 'string' && patient.patientHash.trim()) ||
        (typeof raw.patient_hash === 'string' && raw.patient_hash.trim()) ||
        (typeof raw.patientHash === 'string' && raw.patientHash.trim());
    if (patientHash)
        return patientHash;
    const patientId = toPositiveInteger(patient?.id ?? raw.patient_id ?? raw.patientId);
    return patientId ? `patient_${patientId}` : `patient_examination_${patientExaminationId}`;
}
function extractExaminers(raw) {
    const candidates = [
        raw.examiners,
        raw.examiner_names,
        raw.examinerNames,
        raw.examination?.examiners,
        raw.examination?.examiner_names,
        raw.examination?.examinerNames
    ];
    const values = candidates.flatMap((candidate) => {
        if (!Array.isArray(candidate))
            return [];
        return candidate
            .map((entry) => {
            if (typeof entry === 'string') {
                const normalized = entry.trim();
                return normalized || null;
            }
            if (!entry || typeof entry !== 'object')
                return null;
            const row = entry;
            const examinerKey = (typeof row.examiner_hash === 'string' && row.examiner_hash.trim()) ||
                (typeof row.examinerHash === 'string' && row.examinerHash.trim()) ||
                (typeof row.username === 'string' && row.username.trim()) ||
                (typeof row.email === 'string' && row.email.trim()) ||
                (typeof row.display_name === 'string' && row.display_name.trim()) ||
                (typeof row.displayName === 'string' && row.displayName.trim()) ||
                (typeof row.full_name === 'string' && row.full_name.trim()) ||
                (typeof row.fullName === 'string' && row.fullName.trim()) ||
                (typeof row.name === 'string' && row.name.trim());
            if (examinerKey)
                return examinerKey;
            const firstName = (typeof row.first_name === 'string' && row.first_name.trim()) ||
                (typeof row.firstName === 'string' && row.firstName.trim()) ||
                '';
            const lastName = (typeof row.last_name === 'string' && row.last_name.trim()) ||
                (typeof row.lastName === 'string' && row.lastName.trim()) ||
                '';
            const fullName = `${firstName} ${lastName}`.trim();
            if (fullName)
                return fullName;
            const examinerId = toPositiveInteger(row.id);
            return examinerId ? `examiner_${examinerId}` : null;
        })
            .filter((value) => Boolean(value));
    });
    return Array.from(new Set(values));
}
function extractExaminationName(raw) {
    return ((typeof raw.examination?.name === 'string' && raw.examination.name.trim()) ||
        (typeof raw.examination_name === 'string' && raw.examination_name.trim()) ||
        (typeof raw.examination === 'string' && raw.examination.trim()) ||
        '');
}
function isGastroenterologyExaminationName(value) {
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return false;
    return [
        'gastro',
        'kolon',
        'colon',
        'colo',
        'rekt',
        'rect',
        'endoskop',
        'endoscop',
        'gastroskop',
        'gastroscop',
        'koloskop',
        'colonoscop',
        'colonoscopy',
        'magen',
        'darm',
        'duoden',
        'sigmo',
        'procto',
        'ösoph',
        'oesoph',
        'esoph',
        'egd',
        'ercp',
        'eus',
        'upper gi',
        'lower gi'
    ].some((keyword) => normalized.includes(keyword));
}
function isPatientExaminationAllowedForMedicalField(option) {
    if (terminology.selectedMedicalField !== 'gastroenterology')
        return true;
    return isGastroenterologyExaminationName(option.examinationName);
}
function extractPatientId(raw) {
    return toPositiveInteger(raw.patient?.id ?? raw.patient_id ?? raw.patientId);
}
function extractExaminationId(raw) {
    return toPositiveInteger(raw.examination?.id ?? raw.examination_id ?? raw.examinationId);
}
function extractDraftDate(raw) {
    const value = (typeof raw.date_start === 'string' && raw.date_start) ||
        (typeof raw.dateStart === 'string' && raw.dateStart) ||
        (typeof raw.date === 'string' && raw.date) ||
        null;
    if (!value)
        return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}
function extractIndicationRows(raw) {
    const nestedExamination = raw.examination && typeof raw.examination === 'object'
        ? raw.examination
        : null;
    const candidates = [
        raw.indications,
        raw.examination_indications,
        raw.examinationIndications,
        nestedExamination?.indications,
        nestedExamination?.examination_indications,
        nestedExamination?.examinationIndications
    ];
    const rows = candidates.flatMap((candidate) => {
        if (!Array.isArray(candidate))
            return [];
        return candidate
            .map((entry) => {
            if (!entry || typeof entry !== 'object')
                return null;
            const row = entry;
            const examinationIndicationId = toPositiveInteger(row.examinationIndicationId ??
                row.examination_indication_id ??
                row.indicationId ??
                row.indication_id ??
                row.id);
            const indicationChoiceId = toPositiveInteger(row.indicationChoiceId ??
                row.indication_choice_id ??
                row.choiceId ??
                row.choice_id ??
                row.choice?.id);
            if (examinationIndicationId == null)
                return null;
            return {
                examinationIndicationId,
                indicationChoiceId
            };
        })
            .filter((row) => row !== null);
    });
    if (!rows.length) {
        return [{ examinationIndicationId: null, indicationChoiceId: null }];
    }
    const seen = new Set();
    return rows.filter((row) => {
        const key = `${row.examinationIndicationId}:${row.indicationChoiceId ?? 'null'}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function isRuntimePayload(value) {
    if (!value || typeof value !== 'object')
        return false;
    const payload = value;
    return (typeof payload.patient === 'string' &&
        Array.isArray(payload.examiners) &&
        typeof payload.examination === 'string' &&
        Array.isArray(payload.patientFindings));
}
function stringField(record, ...keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return null;
}
function normalizePatientExaminationOption(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const row = raw;
    const id = toPositiveInteger(row.id);
    if (id === null)
        return null;
    const examinationName = (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
        (typeof row.examination?.name === 'string' && row.examination.name.trim()) ||
        (typeof row.examination === 'string' && row.examination.trim()) ||
        'Untersuchung';
    const dateStartRaw = typeof row.date_start === 'string'
        ? row.date_start
        : typeof row.dateStart === 'string'
            ? row.dateStart
            : '';
    const dateLabel = dateStartRaw ? new Date(dateStartRaw).toLocaleDateString('de-DE') : '';
    return {
        id,
        label: dateLabel ? `#${id} · ${examinationName} · ${dateLabel}` : `#${id} · ${examinationName}`,
        examinationName,
        patientId: toPositiveInteger(row.patient?.id ?? row.patient_id ?? row.patientId),
        examinationId: toPositiveInteger(row.examination?.id ?? row.examination_id ?? row.examinationId)
    };
}
function upsertPatientExaminationOption(option) {
    if (!isPatientExaminationAllowedForMedicalField(option))
        return;
    const next = patientExaminationOptions.value.slice();
    const index = next.findIndex((entry) => entry.id === option.id);
    if (index >= 0)
        next[index] = option;
    else
        next.push(option);
    patientExaminationOptions.value = next.sort((left, right) => right.id - left.id);
}
async function fetchPatientExaminationOptions(patientId) {
    patientExaminationOptionsLoading.value = true;
    patientExaminationOptionsError.value = null;
    try {
        const response = await axiosInstance.get(r(endpoints.examination.patientExaminationList), {
            params: { patient_id: patientId }
        });
        const rows = Array.isArray(response.data?.results)
            ? response.data.results
            : Array.isArray(response.data)
                ? response.data
                : [];
        patientExaminationOptions.value = rows
            .map(normalizePatientExaminationOption)
            .filter((option) => option !== null)
            .filter(isPatientExaminationAllowedForMedicalField)
            .sort((left, right) => right.id - left.id);
    }
    catch (error) {
        patientExaminationOptions.value = [];
        patientExaminationOptionsError.value =
            error?.response?.data?.detail ||
                error?.message ||
                'Patientenuntersuchungen konnten nicht geladen werden.';
    }
    finally {
        patientExaminationOptionsLoading.value = false;
    }
}
async function ensureCurrentPatientExaminationOption(patientExaminationId) {
    const exists = patientExaminationOptions.value.some((entry) => entry.id === patientExaminationId);
    if (exists)
        return;
    try {
        const response = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
        const option = normalizePatientExaminationOption(response.data);
        if (option)
            upsertPatientExaminationOption(option);
    }
    catch {
        // Keep the selector usable even if detail hydration fails.
    }
}
function getNavigationTargetForPatientExamination(patientExaminationId) {
    const match = route.path.match(/^\/reporting\/[^/]+\/(.+)$/);
    return match
        ? `/reporting/${patientExaminationId}/${match[1]}`
        : `/reporting/${patientExaminationId}/findings`;
}
async function onPatientExaminationSelect(rawValue) {
    const patientExaminationId = toPositiveInteger(rawValue);
    if (patientExaminationId === null)
        return;
    const selectedOption = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) ?? null;
    flow.setPatientExaminationContext({
        patientExaminationId,
        selectedPatientId: selectedOption?.patientId ?? flow.selectedPatientId,
        selectedExaminationId: selectedOption?.examinationId ?? flow.selectedExaminationId
    });
    await router.push(getNavigationTargetForPatientExamination(patientExaminationId));
}
async function bootstrapRuntimeDraft(patientExaminationId, option) {
    const detailResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
    const detail = detailResponse.data && typeof detailResponse.data === 'object'
        ? detailResponse.data
        : {};
    const detailPatientId = extractPatientId(detail);
    const detailExaminationId = extractExaminationId(detail);
    flow.setCaseSelection({
        selectedPatientId: option?.patientId ?? detailPatientId ?? flow.selectedPatientId,
        selectedExaminationId: option?.examinationId ?? detailExaminationId ?? flow.selectedExaminationId
    });
    const examinationName = extractExaminationName(detail);
    const templates = examinationName
        ? await fetchReportTemplatesByExamination(activeKbModule.value, examinationName)
        : [];
    const selectedTemplate = (flow.selectedTemplateName &&
        templates.find((template) => template.name === flow.selectedTemplateName)) ||
        templates[0] ||
        null;
    const selectedExaminationId = option?.examinationId ?? detailExaminationId;
    const findingCatalog = selectedExaminationId
        ? await findingsApi.getExaminationFindings(selectedExaminationId)
        : [];
    const findingsById = new Map((Array.isArray(findingCatalog) ? findingCatalog : []).map((finding) => [finding.id, finding]));
    const payload = await buildReportTemplateRuntimePayload({
        moduleName: activeKbModule.value,
        patientExaminationId,
        patient: resolvePatientKey(detail, patientExaminationId),
        examiners: extractExaminers(detail),
        examination: selectedTemplate?.examination || examinationName,
        getFindingById: (findingId) => findingsById.get(findingId)
    });
    flow.setTemplateSelection({
        moduleName: activeKbModule.value,
        templateName: selectedTemplate?.name || null
    });
    flow.setIndications(extractIndicationRows(detail));
    flow.setRuntimeDraft({
        draftId: `draft_${patientExaminationId}`,
        patientExaminationId,
        moduleName: activeKbModule.value,
        templateName: selectedTemplate?.name || null,
        payload: {
            ...payload,
            ...(extractDraftDate(detail) ? { date: extractDraftDate(detail) } : {})
        },
        hydratedFrom: 'backend_context',
        updatedAt: new Date().toISOString()
    });
}
async function hydrateRuntimeDraftFromDraftApi(patientExaminationId) {
    const response = await fetchPatientExaminationDraft(patientExaminationId);
    const draft = response?.draft && typeof response.draft === 'object' ? response.draft : {};
    const draftModuleName = stringField(draft, 'moduleName', 'module_name') || activeKbModule.value;
    const draftTemplateName = stringField(draft, 'templateName', 'template_name');
    const updatedAt = response?.updatedAt ?? response?.updated_at ?? null;
    if (!isRuntimePayload(draft.payload)) {
        flow.markDraftPersistenceHydrated(updatedAt);
        return false;
    }
    flow.setTemplateSelection({
        moduleName: draftModuleName,
        templateName: draftTemplateName
    });
    flow.setRuntimeDraft({
        draftId: `draft_${patientExaminationId}`,
        patientExaminationId,
        moduleName: draftModuleName,
        templateName: draftTemplateName,
        payload: draft.payload,
        hydratedFrom: 'draft_api',
        updatedAt: updatedAt || new Date().toISOString()
    });
    flow.markDraftPersistenceHydrated(updatedAt);
    return true;
}
async function ensureRuntimeDraft(patientExaminationId) {
    const existingDraft = flow.runtimeDraftsByPatientExaminationId[String(patientExaminationId)] || null;
    if (existingDraft) {
        try {
            const detailResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
            const detail = detailResponse.data && typeof detailResponse.data === 'object'
                ? detailResponse.data
                : {};
            flow.setCaseSelection({
                selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
                selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
            });
            flow.setIndications(extractIndicationRows(detail));
        }
        catch {
            // Keep the local draft usable even if detail hydration fails.
        }
        flow.setTemplateSelection({
            moduleName: existingDraft.moduleName,
            templateName: existingDraft.templateName
        });
        return;
    }
    const restoredFromDraftApi = await hydrateRuntimeDraftFromDraftApi(patientExaminationId);
    if (restoredFromDraftApi) {
        try {
            const detailResponse = await axiosInstance.get(r(endpoints.examination.patientExaminationDetail(patientExaminationId)));
            const detail = detailResponse.data && typeof detailResponse.data === 'object'
                ? detailResponse.data
                : {};
            flow.setCaseSelection({
                selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
                selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
            });
            flow.setIndications(extractIndicationRows(detail));
        }
        catch {
            // Keep persisted draft usable even if detail hydration fails.
        }
        return;
    }
    const option = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null;
    await bootstrapRuntimeDraft(patientExaminationId, option);
    flow.markDraftPersistenceHydrated(null);
}
async function hydrateDraftForRoutePatientExamination(patientExaminationId) {
    if (draftBootstrapInFlight.value) {
        await draftBootstrapInFlight.value;
        return;
    }
    const option = patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null;
    if (flow.patientExaminationId !== patientExaminationId ||
        (option?.patientId ?? flow.selectedPatientId) !== flow.selectedPatientId ||
        (option?.examinationId ?? flow.selectedExaminationId) !== flow.selectedExaminationId) {
        flow.setPatientExaminationContext({
            patientExaminationId,
            selectedPatientId: option?.patientId ?? flow.selectedPatientId,
            selectedExaminationId: option?.examinationId ?? flow.selectedExaminationId,
            preserveTemplateSelection: true
        });
    }
    const task = (async () => {
        draftBootstrapError.value = null;
        try {
            await ensureTerminologyBundlesLoaded();
            await ensureRuntimeDraft(patientExaminationId);
        }
        catch (error) {
            draftBootstrapError.value =
                error?.response?.data?.detail ||
                    error?.message ||
                    'Der lokale Reporting-Entwurf konnte nicht initialisiert werden.';
        }
        finally {
            draftBootstrapInFlight.value = null;
        }
    })();
    draftBootstrapInFlight.value = task;
    await task;
}
async function refreshMediaPreload() {
    if (!flow.selectedPatientId) {
        flow.clearMediaPreload();
        return;
    }
    const patientExaminationId = routePatientExaminationId.value || flow.patientExaminationId;
    flow.setMediaPreloadLoading();
    try {
        const payload = await fetchPatientTimelineLatest({
            patientId: flow.selectedPatientId,
            patientExaminationId
        });
        flow.setMediaPreload(payload);
        selectedVideoStreamUrl.value = pickPreferredStream(payload.latestVideo?.streamOptions || []);
        selectedFrameStreamUrl.value = payload.latestFrames[0]?.streamUrl || null;
    }
    catch (error) {
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail || error?.message;
        const message = status === 404
            ? 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
            : status === 400
                ? 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.'
                : status === 403
                    ? 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.'
                    : `Fehler beim Laden der Medien: ${detail || 'unbekannt'}`;
        flow.setMediaPreloadError(message);
    }
}
function isActive(path) {
    return route.path === path;
}
function isStepDisabled(item) {
    return Boolean(item.requiresPatientExamination && !flow.patientExaminationId);
}
function stepStatusLabel(item) {
    if (isActive(item.to))
        return 'Aktuell';
    if (isStepDisabled(item))
        return 'Fall wählen';
    if (item.requiresPatientExamination)
        return 'Bereit';
    return 'Verfügbar';
}
watch([() => flow.selectedPatientId, routePatientExaminationId], async ([patientId, patientExaminationId]) => {
    if (patientId) {
        await fetchPatientExaminationOptions(patientId);
    }
    else {
        patientExaminationOptions.value = [];
        patientExaminationOptionsError.value = null;
    }
    if (patientExaminationId) {
        await ensureCurrentPatientExaminationOption(patientExaminationId);
        await hydrateDraftForRoutePatientExamination(patientExaminationId);
    }
}, { immediate: true });
watch(() => terminology.selectedMedicalField, async () => {
    if (flow.selectedPatientId) {
        await fetchPatientExaminationOptions(flow.selectedPatientId);
    }
});
watch([() => flow.selectedPatientId, () => flow.patientExaminationId, routePatientExaminationId], async ([patientId]) => {
    if (!patientId) {
        flow.clearMediaPreload();
        return;
    }
    await refreshMediaPreload();
}, { immediate: true });
onMounted(() => {
    ensureTerminologyBundlesLoaded();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['is-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-inactive']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['is-disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-index']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['context-quick-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-shell container-fluid py-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "reporting-command-bar mb-3" },
    'aria-label': "Reporting-Kontext",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "reporting-command-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "small text-uppercase text-muted fw-semibold tracking-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
    ...{ class: "mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-case-select" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label form-label-sm mb-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "d-flex flex-column flex-lg-row gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.onPatientExaminationSelect($event.target.value);
        } },
    ...{ class: "form-select" },
    'data-testid': "patient-examination-select",
    value: (__VLS_ctx.selectedPatientExaminationId),
    disabled: (__VLS_ctx.patientExaminationOptionsLoading || !__VLS_ctx.patientExaminationOptions.length),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "",
});
(__VLS_ctx.patientExaminationOptionsLoading
    ? 'Patientenuntersuchungen werden geladen...'
    : __VLS_ctx.patientExaminationOptions.length
        ? 'Bitte Patientenuntersuchung wählen'
        : 'Keine Patientenuntersuchungen verfügbar');
for (const [option] of __VLS_getVForSourceType((__VLS_ctx.patientExaminationOptions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (option.id),
        value: (option.id),
    });
    (option.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.importTerminologyZip) },
    ref: "terminologyZipInput",
    ...{ class: "visually-hidden" },
    type: "file",
    accept: ".zip,application/zip",
});
/** @type {typeof __VLS_ctx.terminologyZipInput} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openTerminologyZipPicker) },
    ...{ class: "btn btn-outline-secondary" },
    type: "button",
    disabled: (__VLS_ctx.terminology.importing),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-single-copy-04 me-1" },
    'aria-hidden': "true",
});
(__VLS_ctx.terminology.importing ? 'Terminologie wird importiert…' : 'Terminologie importieren');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refreshMediaPreload) },
    ...{ class: "btn btn-outline-secondary" },
    disabled: (__VLS_ctx.flow.mediaPreloadStatus === 'loading' || !__VLS_ctx.flow.selectedPatientId),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-refresh-02 me-1" },
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.isContextPanelOpen = !__VLS_ctx.isContextPanelOpen;
        } },
    ...{ class: "btn btn-outline-secondary" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "ni ni-settings-gear-65 me-1" },
    'aria-hidden': "true",
});
(__VLS_ctx.isContextPanelOpen ? 'Kontext ausblenden' : 'Kontext einblenden');
if (__VLS_ctx.patientExaminationOptionsError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-danger mt-1" },
    });
    (__VLS_ctx.patientExaminationOptionsError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item is-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.currentStepLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedPatientExaminationLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedTemplateLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedTerminologyLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.draftSummaryLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "context-summary-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "context-summary-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.mediaPreloadLabel);
if (__VLS_ctx.terminologyImportMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "small text-muted mt-2" },
    });
    (__VLS_ctx.terminologyImportMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row g-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card shadow-sm workflow-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-header d-flex align-items-center justify-content-between gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
    ...{ class: "mb-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "small text-muted" },
});
(__VLS_ctx.currentStepLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body p-3" },
});
if (__VLS_ctx.draftBootstrapError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning py-2 mb-3" },
    });
    (__VLS_ctx.draftBootstrapError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "nav flex-column gap-1" },
});
for (const [item, index] of __VLS_getVForSourceType((__VLS_ctx.navItems))) {
    (item.to);
    if (!__VLS_ctx.isStepDisabled(item)) {
        const __VLS_0 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            to: (item.to),
            ...{ class: "workflow-step-btn btn btn-sm text-start" },
            'aria-current': (__VLS_ctx.isActive(item.to) ? 'page' : undefined),
            ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
        }));
        const __VLS_2 = __VLS_1({
            to: (item.to),
            ...{ class: "workflow-step-btn btn btn-sm text-start" },
            'aria-current': (__VLS_ctx.isActive(item.to) ? 'page' : undefined),
            ...{ class: (__VLS_ctx.isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        __VLS_3.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-index" },
        });
        (index + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-meta" },
        });
        (__VLS_ctx.stepStatusLabel(item));
        var __VLS_3;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "workflow-step-btn btn btn-sm text-start is-disabled" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-index" },
        });
        (index + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "workflow-step-meta" },
        });
        (__VLS_ctx.stepStatusLabel(item));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "col-lg-9" },
});
if (__VLS_ctx.isContextPanelOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card shadow-sm mb-3 context-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-header d-flex justify-content-between align-items-center gap-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h6, __VLS_intrinsicElements.h6)({
        ...{ class: "mb-0" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "context-status-pill" },
        ...{ class: (`is-${__VLS_ctx.flow.mediaPreloadStatus}`) },
    });
    (__VLS_ctx.mediaPreloadLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-quick-grid mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.draftSummaryLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.selectedPatientExaminationLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.selectedTemplateLabel);
    if (__VLS_ctx.draftBootstrapError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning py-2 mt-2 mb-0" },
        });
        (__VLS_ctx.draftBootstrapError);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.mediaPreloadLabel);
    if (__VLS_ctx.flow.mediaPreloadError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning py-2 mt-2 mb-0" },
        });
        (__VLS_ctx.flow.mediaPreloadError);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.flow.mediaPreload ? 'Bericht, Video und Frames geladen' : 'Noch leer');
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-tile" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.nextStepHint);
    if (__VLS_ctx.flow.mediaPreload) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "row g-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "media-context-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-1" },
        });
        if (__VLS_ctx.flow.mediaPreload.latestReport) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (__VLS_ctx.flow.mediaPreload.latestReport.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (__VLS_ctx.flow.mediaPreload.latestReport.documentType || 'n/a');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-flex flex-wrap gap-2" },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestReport.streamOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isContextPanelOpen))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                                return;
                            __VLS_ctx.openUrl(option.url);
                        } },
                    key: (`report-${option.type}`),
                    ...{ class: "btn btn-outline-secondary btn-sm" },
                });
                (option.type);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-grid gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isContextPanelOpen))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                            return;
                        __VLS_ctx.openUrl(__VLS_ctx.preferredReportStream);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
                disabled: (!__VLS_ctx.preferredReportStream),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isContextPanelOpen))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestReport))
                            return;
                        __VLS_ctx.openUrl(__VLS_ctx.preferredReportDownload);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
                disabled: (!__VLS_ctx.preferredReportDownload),
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "media-context-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-1" },
        });
        if (__VLS_ctx.flow.mediaPreload.latestVideo) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            (__VLS_ctx.flow.mediaPreload.latestVideo.id);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-flex flex-wrap gap-2" },
            });
            for (const [option] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestVideo.streamOptions))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isContextPanelOpen))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload.latestVideo))
                                return;
                            __VLS_ctx.selectVideoStream(option.url);
                        } },
                    key: (`video-${option.type}`),
                    ...{ class: "btn btn-outline-secondary btn-sm" },
                });
                (option.type);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "mt-2 d-grid gap-2" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.isContextPanelOpen))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload))
                            return;
                        if (!(__VLS_ctx.flow.mediaPreload.latestVideo))
                            return;
                        __VLS_ctx.selectVideoStream(__VLS_ctx.preferredVideoStream);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
                disabled: (!__VLS_ctx.preferredVideoStream),
            });
            if (__VLS_ctx.selectedVideoStreamUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
                    ...{ class: "w-100 mt-2 rounded border" },
                    controls: true,
                    src: (__VLS_ctx.selectedVideoStreamUrl),
                });
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "col-md-4" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "media-context-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "fw-semibold mb-1" },
        });
        if (__VLS_ctx.flow.mediaPreload.latestFrames.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small d-grid gap-2" },
            });
            for (const [frame] of __VLS_getVForSourceType((__VLS_ctx.flow.mediaPreload.latestFrames))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.isContextPanelOpen))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload))
                                return;
                            if (!(__VLS_ctx.flow.mediaPreload.latestFrames.length))
                                return;
                            __VLS_ctx.selectFrameStream(frame.streamUrl);
                        } },
                    key: (`${frame.videoId}-${frame.frameNumber}`),
                    ...{ class: "btn btn-outline-secondary btn-sm text-start" },
                });
                (frame.frameNumber);
                (frame.category || 'fallback');
            }
            if (__VLS_ctx.selectedFrameStreamUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    ...{ class: "img-fluid rounded border mt-1" },
                    src: (__VLS_ctx.selectedFrameStreamUrl),
                    alt: "Selected frame stream preview",
                });
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "small text-muted" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "small text-muted" },
        });
    }
}
const __VLS_4 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {__VLS_StyleScopedClasses['reporting-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['container-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['py-4']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['reporting-command-main']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['context-case-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-lg-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-single-copy-04']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-refresh-02']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['ni']} */ ;
/** @type {__VLS_StyleScopedClasses['ni-settings-gear-65']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['is-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['context-summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-3']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['nav']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-index']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['is-disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-index']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-step-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-9']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['context-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['card-header']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-between']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['context-status-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['context-quick-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['context-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['g-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-4']} */ ;
/** @type {__VLS_StyleScopedClasses['media-context-card']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['d-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-start']} */ ;
/** @type {__VLS_StyleScopedClasses['img-fluid']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            flow: flow,
            terminology: terminology,
            selectedVideoStreamUrl: selectedVideoStreamUrl,
            selectedFrameStreamUrl: selectedFrameStreamUrl,
            isContextPanelOpen: isContextPanelOpen,
            terminologyZipInput: terminologyZipInput,
            terminologyImportMessage: terminologyImportMessage,
            patientExaminationOptions: patientExaminationOptions,
            patientExaminationOptionsLoading: patientExaminationOptionsLoading,
            patientExaminationOptionsError: patientExaminationOptionsError,
            draftBootstrapError: draftBootstrapError,
            selectedPatientExaminationId: selectedPatientExaminationId,
            navItems: navItems,
            preferredReportStream: preferredReportStream,
            preferredReportDownload: preferredReportDownload,
            preferredVideoStream: preferredVideoStream,
            draftSummaryLabel: draftSummaryLabel,
            selectedPatientExaminationLabel: selectedPatientExaminationLabel,
            selectedTemplateLabel: selectedTemplateLabel,
            selectedTerminologyLabel: selectedTerminologyLabel,
            currentStepLabel: currentStepLabel,
            mediaPreloadLabel: mediaPreloadLabel,
            nextStepHint: nextStepHint,
            openUrl: openUrl,
            selectVideoStream: selectVideoStream,
            selectFrameStream: selectFrameStream,
            openTerminologyZipPicker: openTerminologyZipPicker,
            importTerminologyZip: importTerminologyZip,
            onPatientExaminationSelect: onPatientExaminationSelect,
            refreshMediaPreload: refreshMediaPreload,
            isActive: isActive,
            isStepDisabled: isStepDisabled,
            stepStatusLabel: stepStatusLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
