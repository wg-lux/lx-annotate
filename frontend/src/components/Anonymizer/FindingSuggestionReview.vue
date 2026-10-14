<template>
  <section class="card mb-4" aria-label="Erkannte Befunde prüfen">
    <div class="card-body">
      <h5>Erkannte Befunde prüfen</h5>
      <p class="text-muted">Vorschläge werden erst nach Ihrer Bestätigung als Befund übernommen. Die Anonymisierungsfreigabe ist davon unabhängig.</p>
      <p v-if="loading" role="status">Befundvorschläge werden geladen…</p>
      <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
      <p v-if="!loading && payload && !payload.examination" class="alert alert-info">
        Verknüpfen Sie das Medium zuerst mit einer Untersuchung und laden Sie die Vorschläge erneut.
      </p>
      <p v-if="!loading && payload && !payload.candidates.length">
        {{ payload.reason || 'Keine zugeordneten Befundvorschläge vorhanden.' }}
      </p>
      <ul v-if="payload?.candidates.length" class="list-group mb-3">
        <li v-for="candidate in payload.candidates" :key="candidate.instance" class="list-group-item">
          <strong>{{ candidate.title || candidate.name }}</strong>
          <span class="badge bg-secondary ms-2">{{ candidate.source === 'report' ? 'Berichtimport' : 'Bild-KI' }}</span>
          <span class="ms-2">{{ presence_label[candidate.presence] }}</span>
          <ul class="small mt-2">
            <li v-for="evidence in candidate.evidence" :key="evidence">{{ evidence }}</li>
          </ul>
          <span v-if="candidate.approved" class="text-success" role="status">Als Befund übernommen</span>
          <button
            v-else type="button" class="btn btn-outline-primary btn-sm mt-2"
            :disabled="busy || loading || !payload.examination || candidate.presence !== 'present'"
            @click="approve(candidate)">
            Als Befund übernehmen
          </button>
        </li>
      </ul>
      <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="loading || busy" @click="reload">
        Vorschläge neu laden
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { load_finding_suggestions, type FindingSuggestion, type FindingSuggestions } from '@/api/findingSuggestions'
import { findingsApi, parseFindingsApiError } from '@/api/findingsApi'

const props = defineProps<{ media: 'pdf' | 'video'; id: number }>()
const payload = ref<FindingSuggestions | null>(null)
const loading = ref(false)
const busy = ref(false)
const error = ref('')
let generation = 0
const presence_label = { present: 'Vorhanden erkannt', absent: 'Verneint', uncertain: 'Unsicher / widersprüchlich' }

async function reload(): Promise<void> {
  const request_generation = ++generation
  payload.value = null
  error.value = ''
  busy.value = false
  loading.value = true
  try {
    const result = await load_finding_suggestions(props.media, props.id)
    if (request_generation === generation) payload.value = result
  } catch (failure: unknown) {
    if (request_generation === generation) {
      error.value = parseFindingsApiError(failure).message
    }
  } finally {
    if (request_generation === generation) loading.value = false
  }
}

async function approve(candidate: FindingSuggestion): Promise<void> {
  const examination = payload.value?.examination
  if (!can_approve(candidate) || !examination) return
  const request_generation = generation
  busy.value = true
  error.value = ''
  try {
    await findingsApi.createPatientFinding({
      patientExamination: examination, finding: candidate.id,
      instance_id: candidate.instance, classifications: []
    })
    if (request_generation === generation) candidate.approved = true
  } catch (failure: unknown) {
    if (request_generation === generation) error.value = parseFindingsApiError(failure).message
  } finally {
    if (request_generation === generation) busy.value = false
  }
}

function can_approve(candidate: FindingSuggestion): boolean {
  return !busy.value && !loading.value && !candidate.approved && candidate.presence === 'present'
}

watch(() => [props.media, props.id], reload, { immediate: true })
onBeforeUnmount(() => { generation += 1 })
</script>
