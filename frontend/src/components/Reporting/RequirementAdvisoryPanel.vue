<template>
  <div class="d-flex flex-column gap-3">
    <div class="alert alert-info py-2 mb-0">
      Hinweise aus Anforderungen sind beratend und blockieren das finale Speichern nicht.
    </div>

    <div v-if="candidateConfidence != null">
      <div class="alert mb-0" :class="candidateConfidence < 0.35 ? 'alert-warning' : 'alert-secondary'">
        Kandidaten-Konfidenz: <strong>{{ candidateConfidence }}</strong>
        <span v-if="candidateConfidence < 0.35"> (niedrige Konfidenz)</span>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-lg-6">
        <div class="card h-100 border">
          <div class="card-header bg-light">
            <h6 class="mb-0">Nicht erfüllte Anforderungssets</h6>
          </div>
          <div class="card-body">
            <ul v-if="failedRequirementSets.length" class="mb-0">
              <li v-for="setId in failedRequirementSets" :key="`set-${setId}`">Set {{ setId }}</li>
            </ul>
            <div v-else class="text-muted small">Keine unerfüllten Sets bekannt.</div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100 border">
          <div class="card-header bg-light">
            <h6 class="mb-0">Nicht erfüllte Anforderungen</h6>
          </div>
          <div class="card-body">
            <ul v-if="failedRequirements.length" class="mb-0">
              <li v-for="reqId in failedRequirements" :key="`req-${reqId}`">Anforderung {{ reqId }}</li>
            </ul>
            <div v-else class="text-muted small">Keine unerfüllten Anforderungen bekannt.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card border" v-if="Object.keys(suggestedActions || {}).length">
      <div class="card-header bg-light">
        <h6 class="mb-0">Empfohlene Aktionen</h6>
      </div>
      <div class="card-body">
        <div v-for="(actions, key) in suggestedActions" :key="`action-${key}`" class="mb-3">
          <div class="fw-semibold mb-1">Anforderung {{ key }}</div>
          <ul class="mb-0">
            <li v-for="(action, idx) in actions" :key="idx">
              <code>{{ action?.type || 'unknown' }}</code>
              <span class="text-muted"> · {{ summarizeAction(action) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="card border" v-if="showDebug && (lookupRaw || requirementGuidanceRaw)">
      <div class="card-header bg-light">
        <h6 class="mb-0">Debug / Rohdaten (advisory)</h6>
      </div>
      <div class="card-body">
        <div class="mb-2" v-if="lookupRaw">
          <div class="fw-semibold small">`lookupSnapshot` (shared state)</div>
          <pre class="small bg-light p-2 rounded mb-0">{{ lookupRaw }}</pre>
        </div>
        <div v-if="requirementGuidanceRaw" class="mt-2">
          <div class="fw-semibold small">`lastRequirementGuidance` (shared state)</div>
          <pre class="small bg-light p-2 rounded mb-0">{{ requirementGuidanceRaw }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    failedRequirementSets: string[]
    failedRequirements: string[]
    suggestedActions: Record<string, any[]>
    candidateConfidence?: number | null
    lookupRaw?: string
    requirementGuidanceRaw?: string
    showDebug?: boolean
  }>(),
  {
    candidateConfidence: null,
    lookupRaw: '',
    requirementGuidanceRaw: '',
    showDebug: true
  }
)

function summarizeAction(action: any): string {
  if (!action || typeof action !== 'object') return 'unbekannte Aktion'
  const entries = Object.entries(action).filter(([k]) => k !== 'type')
  if (!entries.length) return 'keine Zusatzdaten'
  return entries
    .slice(0, 3)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ')
}
</script>
