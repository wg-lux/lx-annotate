<template>
  <div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">{{ title }}</h6>
        <small class="text-muted">{{ subtitle }}</small>
      </div>
      <span
        v-if="result"
        class="badge"
        :class="result.ok ? 'bg-success' : 'bg-warning text-dark'"
      >
        {{ result.ok ? 'Regeln erfüllt' : 'Prüfung mit Hinweisen' }}
      </span>
    </div>
    <div class="card-body">
      <div v-if="loading" class="text-muted small">Prüfe Vorlagenregeln...</div>
      <div v-else-if="errorMessage" class="alert alert-danger py-2 mb-0">{{ errorMessage }}</div>
      <div v-else-if="!result" class="text-muted small">
        Keine Eingabeprüfung verfügbar.
      </div>
      <template v-else>
        <div class="small text-muted mb-3">
          {{ result.evaluatedFindingsCount }} Befund(e) bewertet ·
          {{ result.findingsValidators.length }} Befundregel(n) ·
          {{ result.examinationValidators.length }} Untersuchungsregel(n)
        </div>

        <div v-if="result.issues.length" class="mb-3">
          <h6 class="small text-uppercase text-muted mb-2">Hinweise</h6>
          <div
            v-for="issue in result.issues"
            :key="`${issue.code}::${issue.message}`"
            class="border rounded p-2 mb-2"
          >
            <div class="d-flex justify-content-between gap-2">
              <strong>{{ issue.code }}</strong>
              <span class="badge" :class="issue.level === 'warning' ? 'bg-warning text-dark' : 'bg-danger'">
                {{ issue.level === 'warning' ? 'Warnung' : 'Fehler' }}
              </span>
            </div>
            <div class="small">{{ issue.message }}</div>
            <div v-if="issue.validatorName" class="small text-muted">
              {{ issue.validatorKind === 'template' ? 'Vorlage' : issue.validatorKind === 'examination_validator' ? 'Untersuchungsregel' : 'Befundregel' }}: {{ issue.validatorName }}
            </div>
          </div>
        </div>

        <div v-if="result.findingsValidators.length" class="mb-3">
          <h6 class="small text-uppercase text-muted mb-2">Befundregeln</h6>
          <div
            v-for="validator in result.findingsValidators"
            :key="validator.name"
            class="border rounded p-2 mb-2"
          >
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div>
                <strong>{{ validator.name }}</strong>
                <div class="small text-muted">{{ validator.finding }} · {{ validator.operator }}</div>
              </div>
              <span class="badge" :class="validator.ok ? 'bg-success' : 'bg-warning text-dark'">
                {{ validator.ok ? 'OK' : 'Offen' }}
              </span>
            </div>
            <div class="small mt-1">
              Treffer: {{ validator.matchedOccurrences }} · ausgelöst: {{ validator.triggeredOccurrences }}
            </div>
            <div v-if="validator.missingRequiredClassifications.length" class="small text-danger mt-1">
              Fehlende Pflicht-Klassifikationen:
              {{ validator.missingRequiredClassifications.join(', ') }}
            </div>
          </div>
        </div>

        <div v-if="result.examinationValidators.length">
          <h6 class="small text-uppercase text-muted mb-2">Untersuchungsregeln</h6>
          <div
            v-for="validator in result.examinationValidators"
            :key="validator.name"
            class="border rounded p-2 mb-2"
          >
            <div class="d-flex justify-content-between align-items-center gap-2">
              <strong>{{ validator.name }}</strong>
              <span class="badge" :class="validator.ok ? 'bg-success' : 'bg-warning text-dark'">
                {{ validator.ok ? 'OK' : 'Offen' }}
              </span>
            </div>
            <div v-if="validator.findingValidatorStatus.length" class="small mt-1">
              Abhängige Befundregeln:
              {{
                validator.findingValidatorStatus
                  .map((entry) => `${entry.name} (${entry.ok ? 'OK' : 'Fehler'})`)
                  .join(', ')
              }}
            </div>
            <div v-if="validator.examinationValidatorStatus.length" class="small mt-1">
              Abhängige Untersuchungsregeln:
              {{
                validator.examinationValidatorStatus
                  .map((entry) => `${entry.name} (${entry.ok ? 'OK' : 'Fehler'})`)
                  .join(', ')
              }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    loading?: boolean
    errorMessage?: string | null
    result?: ReportTemplateRuntimeValidationResult | null
  }>(),
  {
    title: 'Prüfung der Berichtsvorlage',
    subtitle: 'Auswertung der Vorlagenregeln für die aktuelle Befundlage',
    loading: false,
    errorMessage: null,
    result: null
  }
)
</script>
