<template>
  <fieldset class="mt-4">
    <legend class="h6">Auswertbare Studienregeln</legend>
    <p class="small">
      Regeln verwenden die exakte Terminologieversion. Fehlende Beobachtungen werden separat
      gezählt. Entwürfe sind nicht auswertbar; deskriptive Ergebnisse bestätigen keine Hypothese.
    </p>
    <article
      v-for="(analysis, index) in model"
      :key="index"
      class="border rounded p-3 mb-3"
    >
      <div class="row g-2">
        <label class="col-md-4"
          >Analyse<input
            v-model="analysis.name"
            class="form-control"
            required
        /></label>
        <label class="col-md-4"
          >Modul<input
            v-model="analysis.module"
            class="form-control"
            required
        /></label>
        <label class="col-md-4"
          >Version<input
            v-model="analysis.version"
            class="form-control"
            required
        /></label>
        <label class="col-md-6"
          >Befund als Auswertungseinheit<input
            v-model="analysis.unitFinding"
            class="form-control"
            required
        /></label>
        <label class="col-md-6"
          >Protokollstatus<select
            v-model="analysis.status"
            class="form-select"
          >
            <option value="draft">Entwurf</option>
            <option value="ready">Auswertbar</option>
          </select></label
        >
        <label class="col-12"
          >Offene Protokollfragen (eine pro Zeile)<textarea
            :value="analysis.unresolvedRequirements.join('\n')"
            class="form-control"
            @input="setRequirements(analysis, $event)"
          ></textarea>
        </label>
      </div>
      <StudyRuleEditor
        v-if="analysis.inclusion"
        v-model="analysis.inclusion"
        label="Analysepopulation"
      />
      <button
        type="button"
        class="btn btn-link"
        @click="analysis.inclusion = analysis.inclusion ? null : emptyRule()"
      >
        {{ analysis.inclusion ? 'Populationsregel entfernen' : 'Populationsregel hinzufügen' }}
      </button>
      <div
        v-for="(group, groupIndex) in analysis.groups"
        :key="groupIndex"
      >
        <label
          >Gruppenname<input
            v-model="group.name"
            class="form-control"
            required
        /></label>
        <StudyRuleEditor
          v-model="group.rule"
          label="Gruppenzuordnung"
        />
        <button
          type="button"
          class="btn btn-link"
          @click="analysis.groups.splice(groupIndex, 1)"
        >
          Gruppe entfernen
        </button>
      </div>
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm"
        @click="analysis.groups.push({ name: '', rule: emptyRule() })"
      >
        Gruppe hinzufügen
      </button>
      <div
        v-for="(endpoint, endpointIndex) in analysis.endpoints"
        :key="endpointIndex"
        class="mt-3"
      >
        <label
          >Endpunkt<input
            v-model="endpoint.name"
            class="form-control"
            required
        /></label>
        <StudyRuleEditor
          v-model="endpoint.positive"
          label="Positives Ergebnis"
        />
        <StudyRuleEditor
          v-model="endpoint.negative"
          label="Negatives Ergebnis"
        />
        <StudyRuleEditor
          v-if="endpoint.eligible"
          v-model="endpoint.eligible"
          label="Für Endpunkt geeignet"
        />
        <button
          type="button"
          class="btn btn-link"
          @click="endpoint.eligible = endpoint.eligible ? null : emptyRule()"
        >
          {{ endpoint.eligible ? 'Eignungsregel entfernen' : 'Eignungsregel hinzufügen' }}
        </button>
        <button
          type="button"
          class="btn btn-link"
          @click="analysis.endpoints.splice(endpointIndex, 1)"
        >
          Endpunkt entfernen
        </button>
      </div>
      <div class="d-flex gap-2 mt-2">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          @click="
            analysis.endpoints.push({
              name: '',
              positive: emptyRule(),
              negative: emptyRule(),
              eligible: null
            })
          "
        >
          Endpunkt hinzufügen
        </button>
        <button
          type="button"
          class="btn btn-link"
          @click="model.splice(index, 1)"
        >
          Analyse entfernen
        </button>
      </div>
    </article>
    <button
      type="button"
      class="btn btn-outline-secondary btn-sm"
      data-test="add-analysis"
      @click="addAnalysis"
    >
      Analyse hinzufügen
    </button>
  </fieldset>
</template>
<script setup lang="ts">
import type { StudyAnalysisDefinition, StudyRule } from '@/api/studyCohortApi'
import StudyRuleEditor from '@/components/StudyRuleEditor.vue'
const model = defineModel<StudyAnalysisDefinition[]>({ required: true })
function emptyRule(): StudyRule {
  return {
    mode: 'all',
    predicates: [{ role: 'index', classification: '', descriptor: null, operator: 'eq', value: '' }]
  }
}
function addAnalysis(): void {
  model.value = [
    ...model.value,
    {
      schemaVersion: '1',
      name: '',
      module: '',
      version: '',
      unitFinding: '',
      status: 'draft',
      unresolvedRequirements: [],
      inclusion: null,
      groups: [],
      endpoints: []
    }
  ]
}
function setRequirements(analysis: StudyAnalysisDefinition, event: Event): void {
  if (event.target instanceof HTMLTextAreaElement)
    analysis.unresolvedRequirements = event.target.value.split('\n').filter(Boolean)
}
</script>
