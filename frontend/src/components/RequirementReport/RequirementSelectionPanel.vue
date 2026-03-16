<template>
  <div class="col-12 col-xl-6">
    <div class="card h-100">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h2 class="h5 mb-0">2. Dokumentationsregeln auswählen</h2>
          <small class="text-muted">{{ selectedRequirementSetIds.length }} Regelsätze aktiv</small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" :disabled="loading" @click="emit('refresh')">
            Stand laden
          </button>
          <button class="btn btn-sm btn-outline-info" :disabled="loading || !caseActive" @click="emit('recompute')">
            Neu prüfen
          </button>
          <button class="btn btn-sm btn-outline-danger" :disabled="loading || !caseActive" @click="emit('resetSession')">
            Fall zurücksetzen
          </button>
        </div>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6 col-xl-3">
            <div class="workflow-stat">
              <div class="workflow-stat__label">Patient</div>
              <div class="workflow-stat__value">{{ selectedPatientDisplayName }}</div>
            </div>
          </div>
          <div class="col-md-6 col-xl-3">
            <div class="workflow-stat">
              <div class="workflow-stat__label">Untersuchung</div>
              <div class="workflow-stat__value">{{ selectedExaminationDisplayName }}</div>
            </div>
          </div>
          <div class="col-md-6 col-xl-3">
            <div class="workflow-stat">
              <div class="workflow-stat__label">Regelsätze</div>
              <div class="workflow-stat__value">
                {{ selectedRequirementSetIds.length }} / {{ requirementSets.length }} ausgewählt
              </div>
            </div>
          </div>
          <div class="col-md-6 col-xl-3">
            <div class="workflow-stat">
              <div class="workflow-stat__label">Prüfstatus</div>
              <div class="workflow-stat__value">
                {{ unmetRequirementCount }} offen · {{ suggestedActionCount }} Hinweise
              </div>
            </div>
          </div>
        </div>

        <div class="workflow-callout mt-3">
          <strong>Nächster Schritt:</strong> {{ nextStepMessage }}
        </div>

        <div v-if="candidateRequirementSetIds.length" class="mt-3">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <div class="small text-muted">
              Empfohlene Regelsätze aus der Wissensbasis
              <span v-if="candidateRequirementSetConfidence !== null">
                · Treffsicherheit {{ Math.round(candidateRequirementSetConfidence * 100) }}%
              </span>
            </div>
            <button
              class="btn btn-sm btn-outline-primary"
              :disabled="loading || !caseActive"
              @click="emit('applyRecommended')"
            >
              Empfohlene Sets übernehmen
            </button>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <span
              v-for="setId in candidateRequirementSetIds"
              :key="`recommended-${setId}`"
              class="badge"
              :class="selectedRequirementSetIdSet.has(setId) ? 'bg-primary' : 'bg-light text-dark border'"
            >
              {{ getRequirementSetName(setId) }}
            </span>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mt-3">
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="loading || !caseActive || !requirementSets.length"
            @click="emit('selectAll')"
          >
            Alle Sets auswählen
          </button>
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="loading || !caseActive || !selectedRequirementSetIds.length"
            @click="emit('clearSelection')"
          >
            Auswahl leeren
          </button>
          <button
            class="btn btn-outline-success btn-sm"
            :disabled="loading || !caseActive || !selectedRequirementSetIds.length"
            @click="emit('evaluateAll')"
          >
            Wissensbasis prüfen
          </button>
        </div>

        <div v-if="!candidateRequirementSetIds.length && caseActive" class="alert alert-light border mt-3">
          <strong>Hinweis:</strong> Für diesen Fall wurden keine empfohlenen Regelsätze vorgeschlagen.
          Die Auswahl kann trotzdem manuell erfolgen.
        </div>

        <ul class="list-group list-group-flush mt-3">
          <li
            v-for="rs in requirementSets"
            :key="rs.id"
            class="list-group-item d-flex justify-content-between align-items-center"
          >
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fw-semibold">{{ rs.name }}</span>
                <div class="d-flex align-items-center gap-2">
                  <template v-if="requirementSetStatus[rs.id]">
                    <span
                      class="badge"
                      :class="requirementSetStatus[rs.id]!.met ? 'bg-success' : 'bg-warning'"
                    >
                      {{ requirementSetStatus[rs.id]!.met ? 'Erfüllt' : 'Offen' }}
                    </span>
                  </template>
                  <button
                    class="btn btn-sm btn-outline-info"
                    :disabled="loading"
                    title="Dieses Set prüfen"
                    @click="emit('evaluateSet', rs.id)"
                  >
                    Prüfen
                  </button>
                </div>
              </div>
              <small class="text-muted d-block">Typ: {{ rs.type }}</small>
              <div v-if="requirementSetStatus[rs.id]" class="mt-2">
                <small class="text-muted">
                  {{ requirementSetStatus[rs.id]!.metRequirementsCount }} /
                  {{ requirementSetStatus[rs.id]!.totalRequirementsCount }} Anforderungen erfüllt
                </small>
              </div>
            </div>
            <div class="form-check form-switch ms-3">
              <input
                class="form-check-input"
                type="checkbox"
                :checked="selectedRequirementSetIdSet.has(rs.id)"
                @change="emit('toggleSet', rs.id, ($event.target as HTMLInputElement).checked)"
              />
            </div>
          </li>
          <li v-if="!requirementSets.length" class="list-group-item text-muted">
            Keine Regelsätze gefunden.
          </li>
        </ul>

        <div v-if="evaluationSummary && evaluationSummary.totalSets > 0" class="mt-3 p-3 bg-light rounded">
          <h6 class="mb-2">Prüfübersicht</h6>
          <div class="progress mb-2" style="height: 10px;">
            <div
              class="progress-bar"
              :class="evaluationSummary.completionPercentage === 100 ? 'bg-success' : 'bg-info'"
              :style="{ width: evaluationSummary.completionPercentage + '%' }"
            ></div>
          </div>
          <small class="text-muted">
            {{ evaluationSummary.evaluatedSets }} von {{ evaluationSummary.totalSets }} Sets geprüft
            ({{ evaluationSummary.completionPercentage }}%)
          </small>
        </div>

        <div v-if="suggestedActionEntries.length" class="mt-3 p-3 border rounded bg-light-subtle">
          <h6 class="mb-2">Empfohlene Maßnahmen</h6>
          <ul class="mb-0 ps-3">
            <li v-for="entry in suggestedActionEntries" :key="entry.requirementId">
              <span class="fw-semibold">{{ entry.requirementLabel }}</span>
              <span class="text-muted"> – {{ entry.summary }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type RequirementSetLite = { id: number; name: string; type: string }
type RequirementStatusSummary = {
  met: boolean
  metRequirementsCount: number
  totalRequirementsCount: number
}
type SuggestedActionEntry = {
  requirementId: string
  requirementLabel: string
  summary: string
}

const props = defineProps<{
  loading: boolean
  caseActive: boolean
  selectedPatientDisplayName: string
  selectedExaminationDisplayName: string
  selectedRequirementSetIds: number[]
  selectedRequirementSetIdSet: Set<number>
  requirementSets: RequirementSetLite[]
  unmetRequirementCount: number
  suggestedActionCount: number
  nextStepMessage: string
  candidateRequirementSetIds: number[]
  candidateRequirementSetConfidence: number | null
  suggestedActionEntries: SuggestedActionEntry[]
  evaluationSummary: { totalSets: number; evaluatedSets: number; completionPercentage: number } | null
  requirementSetStatus: Record<number, RequirementStatusSummary | null>
}>()

const emit = defineEmits<{
  refresh: []
  recompute: []
  resetSession: []
  applyRecommended: []
  selectAll: []
  clearSelection: []
  evaluateAll: []
  evaluateSet: [id: number]
  toggleSet: [id: number, checked: boolean]
}>()

function getRequirementSetName(id: number): string {
  return props.requirementSets.find((entry) => entry.id === id)?.name || `Set ${id}`
}
</script>
