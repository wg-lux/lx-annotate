<template>
    <div class="addable-finding-card card mb-3 border-primary">
        <div class="card-header d-flex justify-content-between align-items-center bg-light">
            <div class="d-flex align-items-center gap-2">
                <i class="fas fa-plus-circle text-primary"></i>
                <h6 class="card-title mb-0">Befunde verwalten</h6>
            </div>
            <ul class="nav nav-tabs card-header-tabs">
                <li class="nav-item">
                    <a class="nav-link" :class="{ active: activeTab === 'available' }" @click.prevent="activeTab = 'available'" href="#">
                        <i class="fas fa-list me-1"></i> Verfügbare Befunde
                        <span class="badge rounded-pill bg-primary ms-1">{{ availableFindings.length }}</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" :class="{ active: activeTab === 'added' }" @click.prevent="activeTab = 'added'" href="#">
                        <i class="fas fa-check-circle me-1"></i> Hinzugefügte Befunde
                        <span class="badge rounded-pill bg-success ms-1">{{ addedFindings.length }}</span>
                    </a>
                </li>
            </ul>
        </div>

        <div class="card-body">
            <!-- Tab: Verfügbare Befunde -->
            <div v-show="activeTab === 'available'">
                <div class="d-flex justify-content-end mb-3">
                    <button
                        class="btn btn-sm btn-primary"
                        @click="showFindingSelector = !showFindingSelector"
                        :disabled="loading"
                    >
                        <i class="fas" :class="showFindingSelector ? 'fa-minus' : 'fa-plus'"></i>
                        {{ showFindingSelector ? 'Auswahl ausblenden' : 'Befund auswählen' }}
                    </button>
                </div>

                <!-- Finding Selector -->
                <div v-if="showFindingSelector" class="mb-3 finding-selector">
                    <label class="form-label fw-bold">Verfügbare Befunde:</label>
                    <div v-if="availableFindings.length === 0" class="text-center py-3 text-muted">
                        <i class="fas fa-info-circle fa-2x mb-2"></i>
                        <p>Keine Befunde für diese Untersuchung verfügbar.</p>
                    </div>
                    <div v-else class="row g-3">
                        <div
                            v-for="finding in availableFindings"
                            :key="finding.id"
                            class="col-12 col-sm-6 col-md-4"
                        >
                            <div
                                class="finding-option card h-100 cursor-pointer"
                                :class="{ 'border-primary shadow-sm': selectedFindingId === finding.id }"
                                @click="selectFinding(finding.id)"
                            >
                                <div class="card-body p-3">
                                    <h6 class="card-title small fw-bold">{{ finding.nameDe || finding.name }}</h6>
                                    <p v-if="finding.description" class="card-text small text-muted mb-0">
                                        {{ finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Selected Finding Configuration -->
                <div v-if="selectedFindingId" class="selected-finding-config mt-4 p-4 border rounded bg-light">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">
                            <i class="fas fa-cog text-primary me-2"></i>
                            Befund konfigurieren: <strong>{{ selectedFinding?.nameDe || selectedFinding?.name }}</strong>
                        </h6>
                        <button class="btn btn-sm btn-outline-secondary" @click="clearSelection" title="Auswahl zurücksetzen">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Classifications Configuration -->
                    <div v-if="findingClassifications.length > 0" class="mb-3">
                        <h6>Klassifikationen:</h6>
                        <div class="classification-config-list">
                            <div v-for="classification in findingClassifications" :key="classification.id" class="classification-config-item mb-3 p-3 border rounded">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <strong>{{ classification.name }}</strong>
                                    <div class="d-flex align-items-center gap-2">
                                        <span v-if="classification.required" class="badge bg-warning text-dark" title="Erforderlich">
                                            <i class="fas fa-exclamation-triangle"></i> Erforderlich
                                        </span>
                                        <span v-if="selectedChoices[classification.id]" class="badge bg-success" title="Ausgewählt">
                                            <i class="fas fa-check"></i> Ausgewählt
                                        </span>
                                    </div>
                                </div>
                                <p v-if="classification.description" class="text-muted small mb-2">{{ classification.description }}</p>
                                <select class="form-select form-select-sm" :value="selectedChoices[classification.id] || ''" @change="updateChoice(classification.id, $event)" :class="{ 'border-success': selectedChoices[classification.id], 'border-warning': !selectedChoices[classification.id] && classification.required }">
                                    <option value="">Bitte wählen...</option>
                                    <option v-if="!classification.choices || classification.choices.length === 0" value="" disabled>Keine Auswahl</option>
                                    <option v-else v-for="choice in classification.choices" :key="choice.id" :value="choice.id">{{ choice.name }}</option>
                                </select>
                            </div>
                        </div>
                        <!-- Classification Progress -->
                        <div class="classification-progress">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <small class="text-muted">Erforderliche Klassifikationen:</small>
                                <small class="fw-semibold" :class="classificationProgress.complete ? 'text-success' : 'text-warning'">
                                    {{ classificationProgress.selected }}/{{ classificationProgress.required }}
                                </small>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar" :class="classificationProgress.complete ? 'bg-success' : 'bg-warning'" :style="{ width: classificationProgress.percentage + '%' }"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Add Button -->
                    <div class="text-end mt-3">
                        <button class="btn btn-success" @click="addFindingToExamination" :disabled="loading || !canAddFinding" :title="canAddFinding ? 'Befund zur Untersuchung hinzufügen' : 'Bitte alle erforderlichen Klassifikationen auswählen'">
                            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                            <i class="fas fa-plus me-2"></i>
                            Befund hinzufügen
                        </button>
                    </div>
                </div>

                <!-- Empty State -->
                <div v-else-if="!showFindingSelector" class="text-center py-5 text-muted">
                    <i class="fas fa-plus-circle fa-3x mb-3 opacity-50"></i>
                    <p>Klicken Sie auf "Befund auswählen", um einen neuen Befund hinzuzufügen.</p>
                </div>
            </div>

            <!-- Tab: Hinzugefügte Befunde -->
            <div v-show="activeTab === 'added'">
                <div v-if="addedFindings.length === 0" class="text-center py-5 text-muted">
                    <i class="fas fa-folder-open fa-3x mb-3"></i>
                    <p>Noch keine Befunde zu dieser Untersuchung hinzugefügt.</p>
                </div>
                <div v-else class="row g-3">
                    <div v-for="finding in addedFindings" :key="finding.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
                        <div class="card h-100 border-success">
                            <div class="card-body p-3">
                                <div class="d-flex align-items-start gap-2">
                                    <i class="fas fa-check-circle text-success mt-1"></i>
                                    <div class="flex-grow-1">
                                        <h6 class="card-title small fw-bold text-success">{{ finding.nameDe || finding.name }}</h6>
                                        <p v-if="finding.description" class="card-text small text-muted mb-2">
                                            {{ finding.description.length > 80 ? finding.description.substring(0, 80) + '...' : finding.description }}
                                        </p>
                                        <span class="badge bg-info text-dark small">ID: {{ finding.id }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { extractFindingId, type Finding, type FindingClassification } from '@/api/findings.contract'
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors'
import { parseFindingsApiError } from '@/api/findingsApi'
import { useExaminationStore } from '@/stores/examinationStore'
import { useFindingClassificationStore } from '@/stores/findingClassificationStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import { usePatientFindingStore } from '@/stores/patientFindingStore'

const patientExaminationStore = usePatientExaminationStore()
const findingClassificationStore = useFindingClassificationStore()
const patientFindingStore = usePatientFindingStore()
const examinationStore = useExaminationStore()
const { ensurePatientFindingsLoaded, getFindingById, getAttachedFindingIds } = useFindingSelectors()

interface Props {
  patientExaminationId?: number
  examinationId?: number
}

const props = withDefaults(defineProps<Props>(), {
  patientExaminationId: undefined,
  examinationId: undefined
})

const emit = defineEmits<{
  'finding-added': [findingId: number, findingName: string]
  'finding-error': [error: string]
}>()

const loading = ref(false)
const activeTab = ref<'available' | 'added'>('available')
const showFindingSelector = ref(false)
const selectedFindingId = ref<number | null>(null)
const findingClassifications = ref<FindingClassification[]>([])
const selectedChoices = ref<Record<number, number>>({})
const availableExaminationFindings = ref<Finding[]>([])
const addedFindings = ref<Finding[]>([])

const effectivePatientExaminationId = computed<number | null>(() => {
  if (props.patientExaminationId) return props.patientExaminationId
  return patientExaminationStore.getCurrentPatientExaminationId()
})

const availableFindings = computed(() => {
  const addedIds = new Set(addedFindings.value.map((finding) => finding.id))
  return availableExaminationFindings.value.filter((finding) => !addedIds.has(finding.id))
})

const selectedFinding = computed((): Finding | undefined => {
  if (!selectedFindingId.value) return undefined
  return (
    availableFindings.value.find((entry) => entry.id === selectedFindingId.value) ||
    findingClassificationStore.getFindingById(selectedFindingId.value)
  )
})

const hasAllRequiredClassifications = computed(() => {
  if (!findingClassifications.value.length) return true
  return findingClassifications.value
    .filter((classification) => classification.required)
    .every((classification) => selectedChoices.value[classification.id])
})

const canAddFinding = computed(() =>
  Boolean(
    selectedFindingId.value &&
      hasAllRequiredClassifications.value &&
      effectivePatientExaminationId.value &&
      !loading.value
  )
)

const classificationProgress = computed(() => {
  const required = findingClassifications.value.filter((entry) => entry.required).length
  const selected = findingClassifications.value.filter(
    (entry) => entry.required && selectedChoices.value[entry.id]
  ).length
  return {
    required,
    selected,
    complete: selected === required,
    percentage: required > 0 ? Math.round((selected / required) * 100) : 100
  }
})

function normalizeFindingsList(value: unknown): Finding[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is Finding => {
    if (!entry || typeof entry !== 'object') return false
    return Number.isFinite(Number((entry as any).id))
  })
}

function dedupeFindings(findings: Finding[]): Finding[] {
  return Array.from(new Map(findings.map((finding) => [finding.id, finding])).values())
}

function resolveFindingById(findingId: number): Finding | undefined {
  return (
    availableExaminationFindings.value.find((entry) => entry.id === findingId) ||
    findingClassificationStore.getFindingById(findingId) ||
    getFindingById(findingId)
  )
}

const selectFinding = async (findingId: number) => {
  selectedFindingId.value = findingId
  showFindingSelector.value = false
  await loadFindingClassifications(findingId)
}

const clearSelection = () => {
  selectedFindingId.value = null
  findingClassifications.value = []
  selectedChoices.value = {}
}

const updateChoice = (classificationId: number, event: Event) => {
  const target = event.target as HTMLSelectElement
  const choiceId = target.value ? Number.parseInt(target.value, 10) : undefined
  if (choiceId) {
    selectedChoices.value[classificationId] = choiceId
    return
  }
  delete selectedChoices.value[classificationId]
}

const loadFindingClassifications = async (findingId: number) => {
  try {
    loading.value = true
    const classifications = findingClassificationStore.getClassificationsForFinding(findingId)
    findingClassifications.value = Array.isArray(classifications) ? classifications : []
  } catch {
    emit('finding-error', 'Fehler beim Laden der Klassifikationen')
  } finally {
    loading.value = false
  }
}

async function loadAddedFindingsForCurrentExam() {
  const patientExaminationId = effectivePatientExaminationId.value
  if (!patientExaminationId) {
    addedFindings.value = []
    return
  }

  await ensurePatientFindingsLoaded(patientExaminationId)
  const findings = getAttachedFindingIds(patientExaminationId)
    .map((findingId) => resolveFindingById(findingId))
    .filter((entry): entry is Finding => Boolean(entry))
  addedFindings.value = dedupeFindings(findings)
}

async function loadAvailableFindings() {
  let examinationId = props.examinationId
  if (!examinationId && effectivePatientExaminationId.value) {
    const patientExamination = patientExaminationStore.getPatientExaminationById(
      effectivePatientExaminationId.value
    )
    examinationId = patientExamination?.examination?.id
  }

  if (!examinationId) {
    availableExaminationFindings.value = []
    return
  }

  const findings = normalizeFindingsList(
    await examinationStore.loadFindingsForExamination(examinationId)
  )
  findingClassificationStore.setClassificationChoicesFromLookup(findings)
  availableExaminationFindings.value = dedupeFindings(findings)
}

async function refreshFindingsContext() {
  try {
    loading.value = true
    await loadAvailableFindings()
    await loadAddedFindingsForCurrentExam()
  } catch {
    emit('finding-error', 'Fehler beim Laden der verfügbaren Befunde')
  } finally {
    loading.value = false
  }
}

const addFindingToExamination = async () => {
  if (
    !canAddFinding.value ||
    !selectedFinding.value ||
    !effectivePatientExaminationId.value ||
    !selectedFindingId.value
  ) {
    return
  }

  try {
    loading.value = true
    const newPatientFinding = await patientFindingStore.createPatientFinding({
      patientExamination: effectivePatientExaminationId.value,
      finding: selectedFindingId.value,
      classifications: Object.entries(selectedChoices.value).map(([classificationId, choiceId]) => ({
        classification: Number.parseInt(classificationId, 10),
        choice: choiceId
      }))
    })

    const findingId = extractFindingId(newPatientFinding.finding) ?? selectedFindingId.value
    const createdFinding = findingClassificationStore.getFindingById(findingId) || selectedFinding.value

    if (createdFinding && !addedFindings.value.some((entry) => entry.id === createdFinding.id)) {
      addedFindings.value.push(createdFinding)
    }

    await loadAddedFindingsForCurrentExam()
    emit('finding-added', findingId, selectedFinding.value.nameDe || selectedFinding.value.name)
    clearSelection()
    showFindingSelector.value = false
  } catch (error: any) {
    const parsed = parseFindingsApiError(error)
    emit(
      'finding-error',
      patientFindingStore.error || parsed.message || 'Fehler beim Hinzufügen des Befunds'
    )
  } finally {
    loading.value = false
  }
}

watch(
  [effectivePatientExaminationId, () => props.examinationId],
  async () => {
    await refreshFindingsContext()
  },
  { immediate: true }
)
</script>
