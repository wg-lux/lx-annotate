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
          {{ result.classificationValidators.length }} Klassifikationsregel(n) ·
          {{ result.interventionValidators.length }} Interventionsregel(n) ·
          {{ result.findingsValidators.length }} Befundregel(n) ·
          {{ result.examinationValidators.length }} Untersuchungsregel(n) ·
          {{ result.unitValidators.length }} Einheitenregel(n)
        </div>

        <div v-if="pendingDataIssues.length" class="alert alert-warning py-2 mb-3">
          <h6 class="small text-uppercase mb-2">Ausstehende Daten</h6>
          <div
            v-for="issue in pendingDataIssues"
            :key="`${issue.validatorName || 'validator'}::${issue.message}`"
            class="small mb-2"
          >
            <div>{{ issue.message }}</div>
            <div
              v-if="missingConditionClassifications(issue).length"
              class="text-muted"
            >
              Nachzutragen:
              {{ missingConditionClassifications(issue).join(', ') }}
            </div>
            <div v-if="issueFindingAnchor(issue)" class="mt-1">
              <a :href="`#${issueFindingAnchor(issue)}`">Zum betroffenen Befund springen</a>
            </div>
          </div>
        </div>

        <div v-if="generalIssues.length" class="mb-3">
          <h6 class="small text-uppercase text-muted mb-2">Hinweise</h6>
          <div
            v-for="issue in generalIssues"
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
              {{ validatorKindLabel(issue.validatorKind) }}: {{ issue.validatorName }}
            </div>
            <div v-if="issueFindingAnchor(issue)" class="small mt-1">
              <a :href="`#${issueFindingAnchor(issue)}`">Zum betroffenen Befund springen</a>
            </div>
          </div>
        </div>

        <div v-if="result.classificationValidators.length" class="mb-3">
          <h6 class="small text-uppercase text-muted mb-2">Klassifikationsregeln</h6>
          <div
            v-for="validator in result.classificationValidators"
            :key="validator.name"
            class="border rounded p-2 mb-2"
          >
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div>
                <strong>{{ validator.name }}</strong>
                <div class="small text-muted">
                  {{ validator.finding }} · {{ validator.classification }} · {{ validator.operator }}
                </div>
              </div>
              <span class="badge" :class="validator.ok ? 'bg-success' : 'bg-warning text-dark'">
                {{ validator.ok ? 'OK' : 'Offen' }}
              </span>
            </div>
            <div class="small mt-1">
              Treffer: {{ validator.matchedOccurrences }} · ausgelöst: {{ validator.triggeredOccurrences }}
            </div>
          </div>
        </div>

        <div v-if="result.interventionValidators.length" class="mb-3">
          <h6 class="small text-uppercase text-muted mb-2">Interventionsregeln</h6>
          <div
            v-for="validator in result.interventionValidators"
            :key="validator.name"
            class="border rounded p-2 mb-2"
          >
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div>
                <strong>{{ validator.name }}</strong>
                <div class="small text-muted">
                  {{ validator.finding }} · {{ validator.intervention }} · {{ validator.operator }}
                </div>
              </div>
              <span class="badge" :class="validator.ok ? 'bg-success' : 'bg-warning text-dark'">
                {{ validator.ok ? 'OK' : 'Offen' }}
              </span>
            </div>
            <div class="small mt-1">
              Treffer: {{ validator.matchedOccurrences }} · ausgelöst: {{ validator.triggeredOccurrences }}
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

        <div v-if="result.examinationValidators.length" class="mb-3">
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
              <template
                v-for="(entry, entryIndex) in validator.findingValidatorStatus"
                :key="entry.name"
              >
                <span v-if="entryIndex">, </span>
                <a
                  v-if="dependencyFindingAnchor(entry.name)"
                  :href="`#${dependencyFindingAnchor(entry.name)}`"
                >
                  {{ entry.name }} ({{ entry.ok ? 'OK' : 'Fehler' }}) · zum Befund
                </a>
                <span v-else>{{ entry.name }} ({{ entry.ok ? 'OK' : 'Fehler' }})</span>
              </template>
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

        <div v-if="result.unitValidators.length">
          <h6 class="small text-uppercase text-muted mb-2">Einheitenregeln</h6>
          <div
            v-for="validator in result.unitValidators"
            :key="validator.name"
            class="border rounded p-2 mb-2"
          >
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div>
                <strong>{{ validator.name }}</strong>
                <div class="small text-muted">
                  {{ validator.finding }} · {{ validator.classification }} · {{ validator.unit }} · {{ validator.operator }}
                </div>
              </div>
              <span class="badge" :class="validator.ok ? 'bg-success' : 'bg-warning text-dark'">
                {{ validator.ok ? 'OK' : 'Offen' }}
              </span>
            </div>
            <div class="small mt-1">
              Treffer: {{ validator.matchedOccurrences }} · ausgelöst: {{ validator.triggeredOccurrences }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  ReportTemplateRuntimeValidationResult,
  RuntimeValidationIssue
} from '@/types/reportTemplate'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    loading?: boolean
    errorMessage?: string | null
    result?: ReportTemplateRuntimeValidationResult | null
    findingAnchors?: Record<string, string>
  }>(),
  {
    title: 'Prüfung der Berichtsvorlage',
    subtitle: 'Auswertung der Vorlagenregeln für die aktuelle Befundlage',
    loading: false,
    errorMessage: null,
    result: null,
    findingAnchors: () => ({})
  }
)

const pendingDataIssues = computed(() =>
  (props.result?.issues || []).filter((issue) => issue.code === 'missing_data_requirement')
)

const generalIssues = computed(() =>
  (props.result?.issues || []).filter((issue) => issue.code !== 'missing_data_requirement')
)

function missingConditionClassifications(issue: RuntimeValidationIssue): string[] {
  const value =
    issue.details?.missingConditionClassifications ??
    issue.details?.missing_condition_classifications
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && !!entry)
    : []
}

function validatorKindLabel(kind: RuntimeValidationIssue['validatorKind']): string {
  if (kind === 'template') return 'Vorlage'
  if (kind === 'examination_validator') return 'Untersuchungsregel'
  if (kind === 'classification_validator') return 'Klassifikationsregel'
  if (kind === 'intervention_validator') return 'Interventionsregel'
  if (kind === 'unit_validator') return 'Einheitenregel'
  return 'Befundregel'
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function anchorForFinding(findingName: string | null): string | null {
  if (!findingName) return null
  return props.findingAnchors[findingName] || props.findingAnchors[normalizeKey(findingName)] || null
}

function findingForValidator(
  validatorName: string | undefined,
  validatorKind: RuntimeValidationIssue['validatorKind']
): string | null {
  if (!validatorName || !props.result) return null
  if (validatorKind === 'classification_validator') {
    return props.result.classificationValidators.find((entry) => entry.name === validatorName)?.finding || null
  }
  if (validatorKind === 'intervention_validator') {
    return props.result.interventionValidators.find((entry) => entry.name === validatorName)?.finding || null
  }
  if (validatorKind === 'unit_validator') {
    return props.result.unitValidators.find((entry) => entry.name === validatorName)?.finding || null
  }
  return props.result.findingsValidators.find((entry) => entry.name === validatorName)?.finding || null
}

function issueFindingAnchor(issue: RuntimeValidationIssue): string | null {
  return anchorForFinding(findingForValidator(issue.validatorName, issue.validatorKind))
}

function dependencyFindingAnchor(validatorName: string): string | null {
  return anchorForFinding(findingForValidator(validatorName, 'findings_validator'))
}
</script>
