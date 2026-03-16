<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h5 class="mb-0">Fallauflösung</h5>
        <small class="text-muted">
          Bestehenden Patientenfall zuordnen oder eine minimale Patientenuntersuchung vorbereiten
        </small>
      </div>
      <span class="badge" :class="linkageStatusBadgeClass">
        {{ linkageStatusLabel }}
      </span>
    </div>
    <div class="card-body">
      <div v-if="returnToPath" class="alert alert-info py-2">
        Diese Seite wurde aus der Anonymisierungsvalidierung geöffnet. Sie können nach der
        Fallauflösung direkt zur Validierung zurückkehren.
      </div>
      <div v-if="successMessage" class="alert alert-success py-2">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="alert alert-danger py-2">
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
        <div v-if="patientHashDisplay || examinationHashDisplay" class="col-md-6">
          <div class="border rounded p-3 h-100 bg-light">
            <div class="small text-uppercase text-muted fw-semibold mb-1">Hashes</div>
            <div class="small">
              <div><code>{{ patientHashDisplay || 'n/a' }}</code></div>
              <div><code>{{ examinationHashDisplay || 'n/a' }}</code></div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 align-items-end">
        <div class="col-lg-4">
          <label class="form-label">Bestehenden Patienten wählen</label>
          <select
            class="form-select"
            v-model="selectedCasePatientId"
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
            class="form-select"
            v-model="selectedExistingPatientExaminationId"
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
            @click="useSelectedExistingPatientExamination"
            :disabled="!selectedExistingPatientExaminationId"
          >
            Bestehende Untersuchung übernehmen
          </button>
        </div>

        <div class="col-lg-4">
          <label class="form-label">Neue Untersuchung anlegen</label>
          <select
            class="form-select"
            v-model="selectedNewCaseExaminationId"
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
            @click="createPatientFromMetadata"
            :disabled="isCreatingPatientFromMetadata || !patientDraftAvailable"
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
            @click="createPatientExaminationFromSelection"
            :disabled="
              isCreatingPatientExamination || !selectedCasePatientId || !selectedNewCaseExaminationId
            "
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
        <RouterLink class="btn btn-outline-secondary btn-sm" :to="caseSetupRoute">
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
import { useExaminationStore } from '@/stores/examinationStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import { usePatientStore } from '@/stores/patientStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { endpoints } from '@/types/api/endpoints'
import { DateConverter } from '@/utils/dateHelpers'

type MediaScope = 'pdf' | 'video'

type PatientExaminationOption = {
  id: number
  label: string
}

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
  matchStatus?: 'linked' | 'deferred' | 'suggested' | 'unresolved' | string | null
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
  const raw = route.query.returnTo
  return typeof raw === 'string' && raw.trim() ? raw : null
})
const isCaseDataLoading = computed(() => patientStore.loading || examinationStore.loading)
const currentItem = computed(() => anonymizationStore.current)
const availablePatientOptions = computed(() => patientStore.patientsWithDisplayName)
const availableExaminationOptions = computed(() => examinationStore.examinationsDropdown)
const selectedCasePatientIdNumber = computed(() => toPositiveInteger(selectedCasePatientId.value))

const caseResolutionSuggestedPatientExaminationOptions = computed<PatientExaminationOption[]>(() => {
  const matches = caseResolution.value?.patientExaminationMatches ?? []
  return matches
    .map((match) => {
      const id = toPositiveInteger(match.id)
      if (id === null) return null
      const examName = match.examinationName?.trim() || 'Untersuchung'
      const dateStart = normalizeDateInputToGerman(match.dateStart)
      return {
        id,
        label: dateStart ? `#${id} · ${examName} · ${dateStart}` : `#${id} · ${examName}`
      }
    })
    .filter((entry): entry is PatientExaminationOption => entry !== null)
})

const casePatientExaminationDropdownOptions = computed<PatientExaminationOption[]>(() => {
  const byId = new Map<number, PatientExaminationOption>()
  for (const option of casePatientExaminationOptions.value) byId.set(option.id, option)
  for (const option of caseResolutionSuggestedPatientExaminationOptions.value) {
    if (!byId.has(option.id)) byId.set(option.id, option)
  }
  return [...byId.values()].sort((left, right) => right.id - left.id)
})

const patientHashDisplay = computed(
  () => caseResolution.value?.patientHashDisplay ?? currentItem.value?.patientHashDisplay ?? null
)
const examinationHashDisplay = computed(
  () => caseResolution.value?.examinationHashDisplay ?? currentItem.value?.examinationHashDisplay ?? null
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
const linkageStatus = computed<'not_linked' | 'suggested' | 'linked' | 'deferred'>(() => {
  if (caseResolution.value?.matchStatus === 'linked') return 'linked'
  if (caseResolution.value?.matchStatus === 'deferred') return 'deferred'
  if (caseResolution.value?.matchStatus === 'suggested') return 'suggested'
  if (linkedPatientExaminationId.value !== null) return 'linked'
  if (patientHashDisplay.value || examinationHashDisplay.value || pseudoPatientId.value !== null) {
    return 'suggested'
  }
  return 'not_linked'
})
const linkageStatusLabel = computed(() => {
  const labels = {
    not_linked: 'Nicht verknüpft',
    suggested: 'Vorgeschlagen',
    linked: 'Verknüpft',
    deferred: 'Zurückgestellt'
  } as const
  return labels[linkageStatus.value]
})
const linkageStatusDescription = computed(() => {
  if (linkageStatus.value === 'linked') {
    return 'Eine bestehende Fallverknüpfung ist bereits vorhanden oder wurde ausgewählt.'
  }
  if (linkageStatus.value === 'deferred') {
    return 'Die Fallzuordnung wurde bewusst vertagt und kann später abgeschlossen werden.'
  }
  if (
    caseResolution.value?.matchStatus === 'suggested' &&
    (caseResolution.value?.suggestedMatchCount ?? 0) > 1
  ) {
    return 'Mehrere passende PatientExaminations wurden gefunden. Eine explizite Auswahl ist erforderlich.'
  }
  if (
    caseResolution.value?.matchStatus === 'suggested' &&
    (caseResolution.value?.suggestedMatchCount ?? 0) === 1
  ) {
    return 'Eine passende PatientExamination wurde vorgeschlagen, ist aber noch nicht final bestätigt.'
  }
  if (linkageStatus.value === 'suggested') {
    return 'Hash- oder Pseudo-Patient-Hinweise sind vorhanden, die Zuordnung ist aber noch nicht final.'
  }
  return 'Derzeit liegt noch keine erkennbare Fallverknüpfung vor.'
})
const linkageStatusBadgeClass = computed(() => {
  const classes = {
    not_linked: 'bg-secondary',
    suggested: 'bg-warning text-dark',
    linked: 'bg-success',
    deferred: 'bg-info text-dark'
  } as const
  return classes[linkageStatus.value]
})
const pseudoPatientDisplay = computed(() => {
  if (pseudoPatientId.value !== null) {
    const matchCount = caseResolution.value?.pseudoPatient?.matchCount
    return typeof matchCount === 'number' && matchCount > 0
      ? `#${pseudoPatientId.value} (${matchCount} Treffer)`
      : `#${pseudoPatientId.value}`
  }
  return 'Nicht verknüpft'
})
const patientExaminationDisplay = computed(() => {
  if (linkedPatientExaminationId.value !== null) return `#${linkedPatientExaminationId.value}`
  const suggestedId = caseResolution.value?.recommendedPatientExaminationId
  return typeof suggestedId === 'number' && suggestedId > 0
    ? `Vorschlag: #${suggestedId}`
    : 'Noch keine Zuordnung'
})
const selectedCasePatientLabel = computed(() => {
  const patientId = selectedCasePatientIdNumber.value
  if (patientId === null) return 'Kein Patient ausgewählt'
  const patient = patientStore.getPatientById(patientId)
  return patient
    ? `${patient.firstName || ''} ${patient.lastName || ''} (ID: ${patient.id})`.trim()
    : `Patient #${patientId}`
})
const selectedCasePatientExaminationLabel = computed(() => {
  const selectedId = toPositiveInteger(selectedExistingPatientExaminationId.value)
  if (selectedId !== null) {
    const option = casePatientExaminationDropdownOptions.value.find((entry) => entry.id === selectedId)
    return option?.label ?? `#${selectedId}`
  }
  if (flow.patientExaminationId) return `#${flow.patientExaminationId}`
  return 'Keine Patientenuntersuchung vorgemerkt'
})
const patientDraftAvailable = computed(() => {
  const item = currentItem.value
  if (!item) return false
  return Boolean(item.patientFirstName?.trim() && item.patientLastName?.trim() && DateConverter.toISO(item.patientDob))
})
const caseSetupRoute = computed(() => ({
  path: '/reporting/case-setup',
  query: {
    ...(returnToPath.value ? { returnTo: returnToPath.value } : {}),
    preferredExamination: typeof route.query.preferredExamination === 'string'
      ? route.query.preferredExamination
      : 'colonoscopy'
  }
}))
const nextRoute = computed(() =>
  flow.patientExaminationId
    ? `/reporting/${flow.patientExaminationId}/findings`
    : '/reporting/case-setup'
)

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function clearMessages(): void {
  errorMessage.value = null
  successMessage.value = null
}

function normalizeDateInputToGerman(value?: string | null): string {
  const isoDate = DateConverter.toISO(value)
  return isoDate ? DateConverter.toGerman(isoDate) : ''
}

function normalizePatientExaminationOption(raw: unknown): PatientExaminationOption | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = toPositiveInteger(row.id)
  if (id === null) return null
  const examinationName =
    (typeof row.examination_name === 'string' && row.examination_name.trim()) ||
    (typeof row.examination === 'string' && row.examination.trim()) ||
    'Untersuchung'
  const dateStartRaw = typeof row.date_start === 'string' ? row.date_start : ''
  const dateStart = normalizeDateInputToGerman(dateStartRaw)
  return {
    id,
    label: dateStart ? `#${id} · ${examinationName} · ${dateStart}` : `#${id} · ${examinationName}`
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
  if (fileId === null || scope === null) return
  if (!anonymizationStore.overview.length) {
    await anonymizationStore.fetchOverview()
  }
  await anonymizationStore.setCurrentForValidation(fileId, scope)
}

async function fetchCaseResolution(): Promise<void> {
  const fileId = targetFileId.value
  const scope = targetScope.value
  caseResolution.value = null
  if (fileId === null || scope === null) return
  const endpoint =
    scope === 'pdf'
      ? endpoints.media.pdfCaseResolution(fileId)
      : endpoints.media.videoCaseResolution(fileId)
  try {
    const { data } = await axiosInstance.get<CaseResolutionPayload>(r(endpoint))
    caseResolution.value = data
  } catch (error) {
    console.warn('Case resolution lookup failed.', error)
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
    const response = await axiosInstance.get(r(endpoints.examination.patientExaminationList), {
      params: { patient_id: patientId }
    })
    const rows = Array.isArray(response.data?.results)
      ? response.data.results
      : Array.isArray(response.data)
        ? response.data
        : []
    casePatientExaminationOptions.value = rows
      .map((row: unknown) => normalizePatientExaminationOption(row))
      .filter((entry: PatientExaminationOption | null): entry is PatientExaminationOption => entry !== null)
      .sort((a: PatientExaminationOption, b: PatientExaminationOption) => b.id - a.id)
  } catch (error: any) {
    casePatientExaminationOptions.value = []
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Patientenuntersuchungen konnten nicht geladen werden.'
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
  if (normalizedId === null) return
  const option =
    casePatientExaminationDropdownOptions.value.find((entry) => entry.id === normalizedId) ?? {
      id: normalizedId,
      label: `#${normalizedId}`
    }
  addOrReplacePatientExaminationOption(casePatientExaminationOptions.value, option)
  selectedExistingPatientExaminationId.value = String(normalizedId)
  flow.setLookupSession({
    patientExaminationId: normalizedId,
    lookupToken: null,
    status: 'idle'
  })
  patientExaminationStore.setCurrentPatientExaminationId(normalizedId)
}

async function useSelectedExistingPatientExamination(): Promise<void> {
  clearMessages()
  const patientExaminationId = toPositiveInteger(selectedExistingPatientExaminationId.value)
  const patientId = selectedCasePatientIdNumber.value
  if (patientExaminationId === null) {
    errorMessage.value = 'Bitte wählen Sie zuerst eine bestehende Patientenuntersuchung.'
    return
  }
  syncFlowPatientSelection(patientId)
  applySelectedPatientExamination(patientExaminationId)
  successMessage.value = 'Die ausgewählte Patientenuntersuchung wurde in den Reporting-Flow übernommen.'
}

function normalizeGenderForPatientCreate(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'männlich' || normalized === 'male' || normalized === 'm') return 'male'
  if (normalized === 'weiblich' || normalized === 'female' || normalized === 'w' || normalized === 'f') return 'female'
  if (normalized === 'divers' || normalized === 'unknown') return 'unknown'
  return normalized || null
}

async function createPatientFromMetadata(): Promise<void> {
  clearMessages()
  const item = currentItem.value
  const patientDob = item?.patientDob ? DateConverter.toISO(item.patientDob) : null
  if (!item?.patientFirstName || !item?.patientLastName || !patientDob) {
    errorMessage.value =
      'Für einen neuen Patienten werden mindestens Vorname, Nachname und ein gültiges Geburtsdatum benötigt.'
    return
  }
  isCreatingPatientFromMetadata.value = true
  try {
    const createdPatient = await patientStore.createPatient({
      firstName: item.patientFirstName.trim(),
      lastName: item.patientLastName.trim(),
      dob: patientDob,
      gender: normalizeGenderForPatientCreate(item.patientGenderName),
      center: item.centerName?.trim() || null,
      email: '',
      phone: '',
      patientHash: '',
      comments: '',
      isRealPerson: true
    })
    const patientId = toPositiveInteger(createdPatient.id)
    if (patientId !== null) {
      selectedCasePatientId.value = String(patientId)
      syncFlowPatientSelection(patientId)
      await fetchCasePatientExaminations(patientId)
    }
    successMessage.value =
      'Ein neuer Patient wurde aus den vorhandenen Metadaten angelegt. Sie können jetzt direkt eine Untersuchung auswählen oder anlegen.'
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Der Patient konnte nicht angelegt werden.'
  } finally {
    isCreatingPatientFromMetadata.value = false
  }
}

function formatDateOnly(value?: string | null): string | null {
  const isoDate = DateConverter.toISO(value)
  return isoDate || null
}

async function createPatientExaminationFromSelection(): Promise<void> {
  clearMessages()
  const patientId = selectedCasePatientIdNumber.value
  const examinationId = toPositiveInteger(selectedNewCaseExaminationId.value)
  if (patientId === null) {
    errorMessage.value = 'Bitte wählen Sie zuerst einen Patienten aus.'
    return
  }
  if (examinationId === null) {
    errorMessage.value = 'Bitte wählen Sie zuerst eine Untersuchung aus.'
    return
  }
  const selectedPatient = patientStore.getPatientById(patientId)
  const selectedExam = availableExaminationOptions.value.find((exam) => exam.id === examinationId)
  if (!selectedPatient || !selectedExam) {
    errorMessage.value =
      'Patient oder Untersuchung konnten nicht aufgelöst werden. Bitte laden Sie die Seite neu.'
    return
  }
  isCreatingPatientExamination.value = true
  try {
    const response = await axiosInstance.post(r(endpoints.examination.patientExaminationCreate), {
      patient: selectedPatient.patientHash || `patient_${selectedPatient.id}`,
      examination: selectedExam.name,
      dateStart: formatDateOnly(currentItem.value?.examinationDate) || formatDateOnly(new Date().toISOString()) || '',
      patientBirthDate: formatDateOnly(selectedPatient.dob),
      patientGender: selectedPatient.gender || null
    })
    const createdPatientExaminationId = toPositiveInteger(response.data?.id)
    if (createdPatientExaminationId === null) {
      throw new Error('Die neue Patientenuntersuchung konnte nicht identifiziert werden.')
    }
    syncFlowPatientSelection(patientId, examinationId)
    addOrReplacePatientExaminationOption(casePatientExaminationOptions.value, {
      id: createdPatientExaminationId,
      label: `#${createdPatientExaminationId} · ${selectedExam.displayName || selectedExam.name}`
    })
    patientExaminationStore.addPatientExamination(response.data)
    applySelectedPatientExamination(createdPatientExaminationId)
    await fetchCasePatientExaminations(patientId)
    selectedNewCaseExaminationId.value = ''
    successMessage.value =
      'Die neue Patientenuntersuchung wurde angelegt und in den Reporting-Flow übernommen.'
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.message ||
      'Die Patientenuntersuchung konnte nicht angelegt werden.'
  } finally {
    isCreatingPatientExamination.value = false
  }
}

function applyPreferredExaminationSelection(): void {
  const preferredRaw = route.query.preferredExamination
  if (typeof preferredRaw !== 'string' || !preferredRaw.trim() || flow.selectedExaminationId) return
  const normalizedPreferred = preferredRaw.trim().toLowerCase()
  const match = availableExaminationOptions.value.find(
    (exam) => exam.name.trim().toLowerCase() === normalizedPreferred
  )
  if (match) {
    selectedNewCaseExaminationId.value = String(match.id)
    syncFlowPatientSelection(flow.selectedPatientId, match.id)
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
  await Promise.all([patientStore.fetchPatients(), examinationStore.fetchExaminations()])
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
