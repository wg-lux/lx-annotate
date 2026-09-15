<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0">Fallauflösung</h5>
        <small class="text-muted">
          Bestehenden Patientenfall zuordnen oder eine minimale Patientenuntersuchung vorbereiten
        </small>
      </div>
      <span
        class="badge"
        :class="linkageStatusPresentation.badgeClass"
      >
        {{ linkageStatusPresentation.label }}
      </span>
    </div>
    <div class="card-body">
      <div
        v-if="returnToPath"
        class="alert alert-info py-2"
      >
        Diese Seite wurde aus der Anonymisierungsvalidierung geöffnet. Sie können nach der
        Fallauflösung direkt zur Validierung zurückkehren.
      </div>
      <div
        v-if="successMessage"
        class="alert alert-success py-2"
      >
        {{ successMessage }}
      </div>
      <div
        v-if="errorMessage"
        class="alert alert-danger py-2"
      >
        {{ errorMessage }}
      </div>

      <div class="row g-3 mb-3">
        <div class="col-md-6">
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">Pseudo-Patient</div>
            <div>{{ pseudoPatientDisplay }}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">PatientExamination</div>
            <div>{{ patientExaminationDisplay }}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">Status</div>
            <div>{{ linkageStatusDescription }}</div>
          </div>
        </div>
        <div
          v-if="patientHashDisplay || examinationHashDisplay"
          class="col-md-6"
        >
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">Hashes</div>
            <div class="small">
              <div>
                <code>{{ patientHashDisplay || 'n/a' }}</code>
              </div>
              <div>
                <code>{{ examinationHashDisplay || 'n/a' }}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 align-items-end">
        <div class="col-lg-4">
          <label class="form-label">Bestehenden Patienten wählen</label>
          <select
            v-model="selectedCasePatientId"
            class="form-select"
            :disabled="isCaseDataLoading"
          >
            <option value="">
              {{ isCaseDataLoading ? 'Patienten werden geladen...' : 'Bitte Patient wählen' }}
            </option>
            <option
              v-for="patient in availablePatientOptions"
              :key="patient.id"
              :value="String(patient.id)"
            >
              {{ patient.displayName }}
            </option>
          </select>
        </div>

        <div class="col-lg-4">
          <label class="form-label">Bestehende Patientenuntersuchung</label>
          <select
            v-model="selectedExistingPatientExaminationId"
            class="form-select"
            :disabled="isLoadingCasePatientExaminations"
          >
            <option value="">
              {{
                isLoadingCasePatientExaminations
                  ? 'Patientenuntersuchungen werden geladen...'
                  : 'Bitte Patientenuntersuchung wählen'
              }}
            </option>
            <option
              v-for="option in casePatientExaminationDropdownOptions"
              :key="option.id"
              :value="String(option.id)"
            >
              {{ option.label }}
            </option>
          </select>
          <small class="form-text text-muted">
            Vorschläge aus der Fallauflösung werden hier mit angezeigt.
          </small>
        </div>

        <div class="col-lg-4">
          <button
            class="btn btn-outline-primary w-100"
            :disabled="!selectedExistingPatientExaminationId"
            @click="useSelectedExistingPatientExamination"
          >
            Bestehende Untersuchung übernehmen
          </button>
        </div>

        <div class="col-lg-4">
          <label class="form-label">Neue Untersuchung anlegen</label>
          <select
            v-model="selectedNewCaseExaminationId"
            class="form-select"
            :disabled="isCaseDataLoading"
          >
            <option value="">
              {{
                isCaseDataLoading ? 'Untersuchungen werden geladen...' : 'Bitte Untersuchung wählen'
              }}
            </option>
            <option
              v-for="exam in availableExaminationOptions"
              :key="exam.id"
              :value="String(exam.id)"
            >
              {{ exam.displayName }}
            </option>
          </select>
          <small class="form-text text-muted">
            Minimalfälle wie Koloskopie reichen aus. Befunde können später ergänzt werden.
          </small>
        </div>

        <div class="col-lg-4">
          <button
            class="btn btn-outline-secondary w-100"
            :disabled="isCreatingPatientFromMetadata || !patientDraftAvailable"
            @click="createPatientFromMetadata"
          >
            <span
              v-if="isCreatingPatientFromMetadata"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
            Patienten aus Metadaten anlegen
          </button>
        </div>

        <div class="col-lg-4">
          <button
            class="btn btn-primary w-100"
            :disabled="
              isCreatingPatientExamination ||
              !selectedCasePatientId ||
              !selectedNewCaseExaminationId
            "
            @click="createPatientExaminationFromSelection"
          >
            <span
              v-if="isCreatingPatientExamination"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
            />
            Neue Untersuchung für Patienten anlegen
          </button>
        </div>
      </div>

      <div class="row g-3 mt-1">
        <div class="col-lg-6">
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">Aktueller Patient</div>
            <div>{{ selectedCasePatientLabel }}</div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">
              Aktuelle Patientenuntersuchung
            </div>
            <div>{{ selectedCasePatientExaminationLabel }}</div>
          </div>
        </div>
      </div>

      <div class="mt-3 d-flex flex-wrap gap-2">
        <RouterLink
          class="btn btn-outline-secondary btn-sm"
          :to="caseSetupRoute"
        >
          Im Fall-Setup Fallkontext starten
        </RouterLink>
        <RouterLink
          v-if="returnToPath"
          class="btn btn-outline-secondary btn-sm"
          :to="returnToPath"
        >
          Zurück zur Validierung
        </RouterLink>
        <RouterLink
          v-if="flow.patientExaminationId"
          class="btn btn-dark btn-sm"
          :to="nextRoute"
        >
          Zur klinischen Dokumentation
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useExaminationStore, type Examination } from '@/stores/examinationStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import type { PatientExamination } from '@/stores/patientExaminationStore'
import { usePatientStore } from '@/stores/patientStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'
import type { Patient, PatientFormData } from '@/types/patient'
import type { PatientExaminationOption } from '@/types/patientExamination'
import { DateConverter } from '@/utils/dateHelpers'
import { reportingApiErrorMessage } from './reportingError'
import { createRuntimeLogger } from '@/utils/runtimeLogger'
import { requireResolvedReportingExamination } from './reportingExaminationResolution'

const logger = createRuntimeLogger('case-resolution')

type MediaScope = 'pdf' | 'video'

type CaseResolutionMatch = {
  id: number
  patientId?: number | null
  examinationName?: string | null
  dateStart?: string | null
}

type CaseResolutionPayload = {
  patientHashDisplay?: string | null
  examinationHashDisplay?: string | null
  pseudoPatient?: {
    id?: number | null
    matchCount?: number | null
  } | null
  pseudoExamination?: {
    id?: number | null
    linkedPatientExaminationId?: number | null
  } | null
  matchStatus?: string | null
  suggestedMatchCount?: number | null
  recommendedPatientExaminationId?: number | null
  patientExaminationMatches?: CaseResolutionMatch[]
}

const route = useRoute()
const flow = useReportingFlowStore()
const patientStore = usePatientStore()
const examinationStore = useExaminationStore()
const patientExaminationStore = usePatientExaminationStore()
const anonymizationStore = useAnonymizationStore()

const caseResolution = ref<CaseResolutionPayload | null>(null)
const casePatientExaminationOptions = ref<PatientExaminationOption[]>([])
const selectedCasePatientId = ref('')
const selectedExistingPatientExaminationId = ref('')
const selectedNewCaseExaminationId = ref('')
const isCreatingPatientFromMetadata = ref(false)
const isCreatingPatientExamination = ref(false)
const isLoadingCasePatientExaminations = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const targetFileId = computed(() => toPositiveInteger(route.query.fileId))
const targetScope = computed<MediaScope | null>(() => {
  const value = route.query.mediaType
  return value === 'pdf' || value === 'video' ? value : null
})
const returnToPath = computed(() => {
  const rawValue = route.query.returnTo
  return typeof rawValue === 'string' && rawValue.trim() ? rawValue : null
})
const isCaseDataLoading = computed(() => patientStore.loading || examinationStore.loading)
const currentItem = computed(() => anonymizationStore.current)
const availablePatientOptions = computed(() => patientStore.patientsWithDisplayName)
const availableExaminationOptions = computed(() => examinationStore.examinationsDropdown)
const availableCenterOptions = computed(() => patientStore.centers)
const selectedCasePatientIdNumber = computed(() => toPositiveInteger(selectedCasePatientId.value))

const caseResolutionSuggestedPatientExaminationOptions = computed<PatientExaminationOption[]>(
  () => {
    const matches = caseResolution.value?.patientExaminationMatches ?? []
    return matches
      .map((match) => {
        const examinationId = toPositiveInteger(match.id)
        if (examinationId === null) {
          return null
        }
        const examName = match.examinationName?.trim() || 'Untersuchung'
        const dateStart = normalizeDateInputToGerman(match.dateStart)
        return {
          id: examinationId,
          label: dateStart
            ? `#${String(examinationId)} · ${examName} · ${dateStart}`
            : `#${String(examinationId)} · ${examName}`
        }
      })
      .filter((entry): entry is PatientExaminationOption => entry !== null)
  }
)

const casePatientExaminationDropdownOptions = computed<PatientExaminationOption[]>(() => {
  const byId = new Map<number, PatientExaminationOption>()
  for (const option of casePatientExaminationOptions.value) {
    byId.set(option.id, option)
  }
  for (const option of caseResolutionSuggestedPatientExaminationOptions.value) {
    if (!byId.has(option.id)) {
      byId.set(option.id, option)
    }
  }
  return [...byId.values()].sort((left, right) => right.id - left.id)
})

const patientHashDisplay = computed(
  () => caseResolution.value?.patientHashDisplay ?? currentItem.value?.patientHashDisplay ?? null
)
const examinationHashDisplay = computed(
  () =>
    caseResolution.value?.examinationHashDisplay ??
    currentItem.value?.examinationHashDisplay ??
    null
)
const pseudoPatientId = computed(() => {
  const value =
    caseResolution.value?.pseudoPatient?.id ??
    currentItem.value?.pseudoPatientId ??
    currentItem.value?.patientId ??
    null
  return typeof value === 'number' && value > 0 ? value : null
})
const linkedPatientExaminationId = computed(() => {
  const value =
    caseResolution.value?.pseudoExamination?.linkedPatientExaminationId ??
    currentItem.value?.patientExaminationId ??
    caseResolution.value?.recommendedPatientExaminationId ??
    null
  return typeof value === 'number' && value > 0 ? value : null
})

function explicitLinkageStatus(
  value: string | null | undefined
): 'linked' | 'deferred' | 'suggested' | null {
  const explicitStatuses = new Set(['linked', 'deferred', 'suggested'])
  return explicitStatuses.has(value || '') ? (value as 'linked' | 'deferred' | 'suggested') : null
}

const linkageStatus = computed<'not_linked' | 'suggested' | 'linked' | 'deferred'>(() => {
  const explicitStatus = explicitLinkageStatus(caseResolution.value?.matchStatus)
  if (explicitStatus) {
    return explicitStatus
  }
  if (linkedPatientExaminationId.value !== null) {
    return 'linked'
  }
  if (patientHashDisplay.value || examinationHashDisplay.value || pseudoPatientId.value !== null) {
    return 'suggested'
  }
  return 'not_linked'
})
const linkagePresentation = {
  not_linked: {
    label: 'Nicht verknüpft',
    badgeClass: 'bg-secondary',
    description: 'Derzeit liegt noch keine erkennbare Fallverknüpfung vor.'
  },
  suggested: {
    label: 'Vorgeschlagen',
    badgeClass: 'bg-warning text-dark',
    description:
      'Hash- oder Pseudo-Patient-Hinweise sind vorhanden, die Zuordnung ist aber noch nicht final.'
  },
  linked: {
    label: 'Verknüpft',
    badgeClass: 'bg-success',
    description: 'Eine bestehende Fallverknüpfung ist bereits vorhanden oder wurde ausgewählt.'
  },
  deferred: {
    label: 'Zurückgestellt',
    badgeClass: 'bg-info text-dark',
    description: 'Die Fallzuordnung wurde bewusst vertagt und kann später abgeschlossen werden.'
  }
} as const
const linkageStatusPresentation = computed(() => linkagePresentation[linkageStatus.value])
const suggestedMatchCount = computed(() => caseResolution.value?.suggestedMatchCount ?? 0)
const linkageStatusDescription = computed(() => {
  if (linkageStatus.value !== 'suggested' || caseResolution.value?.matchStatus !== 'suggested') {
    return linkageStatusPresentation.value.description
  }
  if (suggestedMatchCount.value > 1) {
    return 'Mehrere passende PatientExaminations wurden gefunden. Eine explizite Auswahl ist erforderlich.'
  }
  if (suggestedMatchCount.value === 1) {
    return 'Eine passende PatientExamination wurde vorgeschlagen, ist aber noch nicht final bestätigt.'
  }
  return linkageStatusPresentation.value.description
})
const pseudoPatientDisplay = computed(() => {
  if (pseudoPatientId.value !== null) {
    const matchCount = caseResolution.value?.pseudoPatient?.matchCount
    return typeof matchCount === 'number' && matchCount > 0
      ? `#${String(pseudoPatientId.value)} (${String(matchCount)} Treffer)`
      : `#${String(pseudoPatientId.value)}`
  }
  return 'Nicht verknüpft'
})
const patientExaminationDisplay = computed(() => {
  if (linkedPatientExaminationId.value !== null) {
    return `#${String(linkedPatientExaminationId.value)}`
  }
  const suggestedId = caseResolution.value?.recommendedPatientExaminationId
  return typeof suggestedId === 'number' && suggestedId > 0
    ? `Vorschlag: #${String(suggestedId)}`
    : 'Noch keine Zuordnung'
})
const selectedCasePatientLabel = computed(() => {
  const patientId = selectedCasePatientIdNumber.value
  if (patientId === null) {
    return 'Kein Patient ausgewählt'
  }
  const patient = patientStore.getPatientById(patientId)
  return patient
    ? `${patient.firstName || ''} ${patient.lastName || ''} (ID: ${String(patient.id)})`.trim()
    : `Patient #${String(patientId)}`
})
const selectedCasePatientExaminationLabel = computed(() => {
  const selectedId = toPositiveInteger(selectedExistingPatientExaminationId.value)
  if (selectedId !== null) {
    const option = casePatientExaminationDropdownOptions.value.find(
      (entry) => entry.id === selectedId
    )
    return option?.label ?? `#${String(selectedId)}`
  }
  if (flow.patientExaminationId) {
    return `#${String(flow.patientExaminationId)}`
  }
  return 'Keine Patientenuntersuchung vorgemerkt'
})
const patientDraftAvailable = computed(() => {
  const item = currentItem.value
  if (!item) {
    return false
  }
  return Boolean(
    item.patientFirstName?.trim() &&
    item.patientLastName?.trim() &&
    DateConverter.toISO(item.patientDob)
  )
})
const caseSetupRoute = computed(() => ({
  path: '/reporting/case-setup',
  query: {
    ...(returnToPath.value ? { returnTo: returnToPath.value } : {}),
    preferredExamination:
      typeof route.query.preferredExamination === 'string'
        ? route.query.preferredExamination
        : 'colonoscopy'
  }
}))
const nextRoute = computed(() =>
  flow.patientExaminationId
    ? `/reporting/${String(flow.patientExaminationId)}/findings`
    : '/reporting/case-setup'
)

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function readListPayload(value: unknown): unknown[] {
  if (isUnknownArray(value)) {
    return value
  }
  const results = readRecord(value).results
  if (isUnknownArray(results)) {
    return results
  }
  throw new TypeError('Patient examination list response must contain an array.')
}

function clearMessages(): void {
  errorMessage.value = null
  successMessage.value = null
}

function normalizeDateInputToGerman(value?: string | null): string {
  const isoDate = DateConverter.toISO(value)
  return isoDate ? DateConverter.toGerman(isoDate) : ''
}

function normalizePatientExaminationOption(rawValue: unknown): PatientExaminationOption | null {
  const examinationRecord = readRecord(rawValue)
  const examinationId = toPositiveInteger(examinationRecord.id)
  if (examinationId === null) {
    return null
  }
  const examinationName =
    (typeof examinationRecord.examination_name === 'string' &&
      examinationRecord.examination_name.trim()) ||
    (typeof examinationRecord.examination === 'string' && examinationRecord.examination.trim()) ||
    'Untersuchung'
  const dateStartRaw =
    typeof examinationRecord.date_start === 'string' ? examinationRecord.date_start : ''
  const dateStart = normalizeDateInputToGerman(dateStartRaw)
  return {
    id: examinationId,
    label: dateStart
      ? `#${String(examinationId)} · ${examinationName} · ${dateStart}`
      : `#${String(examinationId)} · ${examinationName}`
  }
}

function addOrReplacePatientExaminationOption(
  target: PatientExaminationOption[],
  option: PatientExaminationOption
): void {
  const existingIndex = target.findIndex((entry) => entry.id === option.id)
  if (existingIndex >= 0) {
    target[existingIndex] = option
    return
  }
  target.push(option)
}

async function initializeCurrentItemFromRouteContext(): Promise<void> {
  const fileId = targetFileId.value
  const scope = targetScope.value
  if (fileId === null || scope === null) {
    return
  }
  if (!anonymizationStore.overview.length) {
    await anonymizationStore.fetchOverview()
  }
  await anonymizationStore.setCurrentForValidation(fileId, scope)
}

async function fetchCaseResolution(): Promise<void> {
  const fileId = targetFileId.value
  const scope = targetScope.value
  caseResolution.value = null
  if (fileId === null || scope === null) {
    return
  }
  const endpoint =
    scope === 'pdf'
      ? endpoints.media.pdfCaseResolution(fileId)
      : endpoints.media.videoCaseResolution(fileId)
  try {
    const { data } = await axiosInstance.get<CaseResolutionPayload>(r(endpoint))
    caseResolution.value = data
  } catch (_error) {
    logger.warn('lookup-failed')
  }
}

async function fetchCasePatientExaminations(patientId: number): Promise<void> {
  if (patientId <= 0) {
    casePatientExaminationOptions.value = []
    return
  }
  isLoadingCasePatientExaminations.value = true
  clearMessages()
  try {
    const response = await axiosInstance.get<unknown>(
      r(endpoints.examination.patientExaminationList),
      { params: { patient_id: patientId } }
    )
    const rows = readListPayload(response.data)
    casePatientExaminationOptions.value = rows
      .map((examinationRecord: unknown) => normalizePatientExaminationOption(examinationRecord))
      .filter(
        (entry: PatientExaminationOption | null): entry is PatientExaminationOption =>
          entry !== null
      )
      .sort((a: PatientExaminationOption, b: PatientExaminationOption) => b.id - a.id)
  } catch (error: unknown) {
    casePatientExaminationOptions.value = []
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Patientenuntersuchungen konnten nicht geladen werden.'
    )
  } finally {
    isLoadingCasePatientExaminations.value = false
  }
}

function syncFlowPatientSelection(patientId: number | null, examinationId?: number | null): void {
  flow.setCaseSelection({
    selectedPatientId: patientId,
    ...(examinationId !== undefined ? { selectedExaminationId: examinationId } : {})
  })
}

function applySelectedPatientExamination(patientExaminationId: number): void {
  const normalizedId = toPositiveInteger(patientExaminationId)
  if (normalizedId === null) {
    return
  }
  const option = casePatientExaminationDropdownOptions.value.find(
    (entry) => entry.id === normalizedId
  ) ?? {
    id: normalizedId,
    label: `#${String(normalizedId)}`
  }
  addOrReplacePatientExaminationOption(casePatientExaminationOptions.value, option)
  selectedExistingPatientExaminationId.value = String(normalizedId)
  flow.setPatientExaminationContext({
    patientExaminationId: normalizedId,
    selectedPatientId: selectedCasePatientIdNumber.value,
    preserveTemplateSelection: true
  })
  patientExaminationStore.setCurrentPatientExaminationId(normalizedId)
}

function useSelectedExistingPatientExamination(): void {
  clearMessages()
  const patientExaminationId = toPositiveInteger(selectedExistingPatientExaminationId.value)
  const patientId = selectedCasePatientIdNumber.value
  if (patientExaminationId === null) {
    errorMessage.value = 'Bitte wählen Sie zuerst eine bestehende Patientenuntersuchung.'
    return
  }
  syncFlowPatientSelection(patientId)
  applySelectedPatientExamination(patientExaminationId)
  successMessage.value =
    'Die ausgewählte Patientenuntersuchung wurde in den Reporting-Flow übernommen.'
}

function normalizeGenderForPatientCreate(value?: string | null): string | null {
  if (!value) {
    return null
  }
  const normalized = value.trim().toLowerCase()
  const genderAliases: Record<string, string> = {
    männlich: 'male',
    male: 'male',
    m: 'male',
    weiblich: 'female',
    female: 'female',
    w: 'female',
    f: 'female',
    divers: 'unknown',
    unknown: 'unknown'
  }
  return (genderAliases[normalized] ?? normalized) || null
}

function resolveCenterKeyFromMetadataCenterName(centerName?: string | null): string | null {
  const normalizedCenterName = centerName?.trim()
  if (!normalizedCenterName) {
    return null
  }

  const match = availableCenterOptions.value.find((center) => {
    const name = typeof center.name === 'string' ? center.name.trim() : ''
    const displayName =
      typeof center.nameDe === 'string'
        ? center.nameDe.trim()
        : typeof center.nameEn === 'string'
          ? center.nameEn.trim()
          : ''
    return (
      name.localeCompare(normalizedCenterName, undefined, { sensitivity: 'accent' }) === 0 ||
      (displayName &&
        displayName.localeCompare(normalizedCenterName, undefined, { sensitivity: 'accent' }) === 0)
    )
  })

  return typeof match?.centerKey === 'string' && match.centerKey.trim()
    ? match.centerKey.trim()
    : null
}

type PatientCreateResolution =
  { data: PatientFormData; error: null } | { data: null; error: string }

function unresolvedCenterError(centerName: string, centerKey: string | null): string | null {
  if (!centerName || centerKey) {
    return null
  }
  return `Das Zentrum "${centerName}" konnte nicht auf einen center_key abgebildet werden.`
}

function resolvePatientCreateData(): PatientCreateResolution {
  const item = currentItem.value
  const patientDob = item?.patientDob ? DateConverter.toISO(item.patientDob) : null
  if (!item?.patientFirstName || !item.patientLastName || !patientDob) {
    return {
      data: null,
      error:
        'Für einen neuen Patienten werden mindestens Vorname, Nachname und ein gültiges Geburtsdatum benötigt.'
    }
  }
  const centerName = item.centerName?.trim() || ''
  const resolvedCenterKey = resolveCenterKeyFromMetadataCenterName(item.centerName)
  const centerError = unresolvedCenterError(centerName, resolvedCenterKey)
  if (centerError) {
    return {
      data: null,
      error: centerError
    }
  }
  return {
    error: null,
    data: {
      firstName: item.patientFirstName.trim(),
      lastName: item.patientLastName.trim(),
      dob: patientDob,
      gender: normalizeGenderForPatientCreate(item.patientGenderName),
      centerKey: resolvedCenterKey,
      email: '',
      phone: '',
      patientHash: '',
      comments: '',
      isRealPerson: true
    }
  }
}

async function createPatientFromMetadata(): Promise<void> {
  clearMessages()
  const resolution = resolvePatientCreateData()
  if (!resolution.data) {
    errorMessage.value = resolution.error
    return
  }
  isCreatingPatientFromMetadata.value = true
  try {
    const createdPatient: unknown = await patientStore.createPatient(resolution.data)
    const patientId = toPositiveInteger(readRecord(createdPatient).id)
    if (patientId !== null) {
      selectedCasePatientId.value = String(patientId)
      syncFlowPatientSelection(patientId)
      await fetchCasePatientExaminations(patientId)
    }
    successMessage.value =
      'Ein neuer Patient wurde aus den vorhandenen Metadaten angelegt. Sie können jetzt direkt eine Untersuchung auswählen oder anlegen.'
  } catch (error: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Der Patient konnte nicht angelegt werden.'
    )
  } finally {
    isCreatingPatientFromMetadata.value = false
  }
}

function formatDateOnly(value?: string | null): string | null {
  const isoDate = DateConverter.toISO(value)
  return isoDate || null
}

type PatientExaminationCreationSelection =
  | {
      patientId: number
      examinationId: number
      patient: Patient
      examination: Examination
      error: null
    }
  | { error: string }

function resolvePatientExaminationCreationSelection(): PatientExaminationCreationSelection {
  const patientId = selectedCasePatientIdNumber.value
  const examinationId = toPositiveInteger(selectedNewCaseExaminationId.value)
  if (patientId === null) {
    return { error: 'Bitte wählen Sie zuerst einen Patienten aus.' }
  }
  if (examinationId === null) {
    return { error: 'Bitte wählen Sie zuerst eine Untersuchung aus.' }
  }
  const patient = patientStore.getPatientById(patientId)
  const examination = availableExaminationOptions.value.find((exam) => exam.id === examinationId)
  if (!patient || !examination) {
    return {
      error:
        'Patient oder Untersuchung konnten nicht aufgelöst werden. Bitte laden Sie die Seite neu.'
    }
  }
  return { patientId, examinationId, patient, examination, error: null }
}

function patientExaminationCreatePayload(patient: Patient, examination: Examination) {
  const examinationDate =
    formatDateOnly(currentItem.value?.examinationDate) ||
    formatDateOnly(new Date().toISOString()) ||
    ''
  return {
    patient: patient.patientHash || `patient_${String(patient.id)}`,
    examination: examination.name,
    dateStart: examinationDate,
    patientBirthDate: formatDateOnly(patient.dob),
    patientGender: patient.gender || null
  }
}

async function createPatientExaminationFromSelection(): Promise<void> {
  clearMessages()
  const selection = resolvePatientExaminationCreationSelection()
  if (!('patient' in selection)) {
    errorMessage.value = selection.error
    return
  }
  isCreatingPatientExamination.value = true
  try {
    const response = await axiosInstance.post<PatientExamination>(
      r(endpoints.examination.patientExaminationCreate),
      patientExaminationCreatePayload(selection.patient, selection.examination)
    )
    const createdPatientExaminationId = toPositiveInteger(response.data.id)
    if (createdPatientExaminationId === null) {
      throw new Error('Die neue Patientenuntersuchung konnte nicht identifiziert werden.')
    }
    syncFlowPatientSelection(selection.patientId, selection.examinationId)
    addOrReplacePatientExaminationOption(casePatientExaminationOptions.value, {
      id: createdPatientExaminationId,
      label: `#${String(createdPatientExaminationId)} · ${selection.examination.displayName || selection.examination.name}`
    })
    patientExaminationStore.addPatientExamination(response.data)
    applySelectedPatientExamination(createdPatientExaminationId)
    await fetchCasePatientExaminations(selection.patientId)
    selectedNewCaseExaminationId.value = ''
    successMessage.value =
      'Die neue Patientenuntersuchung wurde angelegt und in den Reporting-Flow übernommen.'
  } catch (error: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Die Patientenuntersuchung konnte nicht angelegt werden.'
    )
  } finally {
    isCreatingPatientExamination.value = false
  }
}

function applyPreferredExaminationSelection(): void {
  const preferredRaw = route.query.preferredExamination
  if (typeof preferredRaw !== 'string' || !preferredRaw.trim() || flow.selectedExaminationId) {
    return
  }
  try {
    const match = requireResolvedReportingExamination({
      catalog: availableExaminationOptions.value,
      selectedExaminationId: null,
      examinationName: preferredRaw
    })
    selectedNewCaseExaminationId.value = String(match.id)
    syncFlowPatientSelection(flow.selectedPatientId, match.id)
  } catch (error: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Die bevorzugte Untersuchung konnte nicht aufgelöst werden.'
    )
  }
}

watch(selectedCasePatientId, async (nextPatientId) => {
  selectedExistingPatientExaminationId.value = ''
  const patientId = toPositiveInteger(nextPatientId)
  syncFlowPatientSelection(patientId)
  if (patientId === null) {
    casePatientExaminationOptions.value = []
    return
  }
  await fetchCasePatientExaminations(patientId)
})

onMounted(async () => {
  await Promise.all([
    patientStore.fetchPatients(),
    patientStore.fetchCenters(),
    examinationStore.fetchExaminations()
  ])
  applyPreferredExaminationSelection()
  await initializeCurrentItemFromRouteContext()
  await fetchCaseResolution()
  if (flow.selectedPatientId) {
    selectedCasePatientId.value = String(flow.selectedPatientId)
  } else if (pseudoPatientId.value !== null) {
    selectedCasePatientId.value = String(pseudoPatientId.value)
  }
  if (flow.patientExaminationId) {
    selectedExistingPatientExaminationId.value = String(flow.patientExaminationId)
  } else if (linkedPatientExaminationId.value !== null) {
    selectedExistingPatientExaminationId.value = String(linkedPatientExaminationId.value)
  }
})
</script>
