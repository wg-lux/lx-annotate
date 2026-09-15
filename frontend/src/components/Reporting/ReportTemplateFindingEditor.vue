<template>
  <div class="row g-3">
    <div class="col-md-4">
      <label class="form-label form-label-sm">Befund</label>
      <select
        :value="finding.finding"
        class="form-select form-select-sm"
        @change="updateFinding({ finding: ($event.target as HTMLInputElement).value })"
      >
        <option
          value=""
          disabled
        >
          Befund wählen
        </option>
        <option
          v-for="item in findingOptions"
          :key="item.name"
          :value="item.name"
        >
          {{ item.label }}
        </option>
      </select>
    </div>
    <div class="col-md-3">
      <label class="form-label form-label-sm">Erforderlich</label>
      <select
        :value="finding.required"
        class="form-select form-select-sm"
        @change="updateFinding({ required: ($event.target as HTMLInputElement).value === 'true' })"
      >
        <option :value="true">ja</option>
        <option :value="false">nein</option>
      </select>
    </div>
    <div class="col-md-3">
      <label class="form-label form-label-sm">Mehrfach erlaubt</label>
      <select
        :value="finding.multipleAllowed"
        class="form-select form-select-sm"
        @change="
          updateFinding({ multipleAllowed: ($event.target as HTMLInputElement).value === 'true' })
        "
      >
        <option :value="false">nein</option>
        <option :value="true">ja</option>
      </select>
    </div>
    <div class="col-md-2 d-flex align-items-end">
      <button
        class="btn btn-outline-danger btn-sm w-100"
        @click="$emit('remove')"
      >
        Entfernen
      </button>
    </div>
  </div>

  <div class="mt-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0 small text-uppercase text-muted">Klassifikationen</h6>
      <button
        class="btn btn-outline-secondary btn-sm"
        @click="addClassification"
      >
        Klassifikation hinzufügen
      </button>
    </div>

    <div
      v-for="(classification, classificationIndex) in finding.classifications"
      :key="classificationIndex"
      class="row g-2 align-items-end mb-2"
    >
      <div class="col-md-8">
        <label class="form-label form-label-sm">Klassifikation</label>
        <select
          :value="classification.classification"
          class="form-select form-select-sm"
          @change="
            updateClassification(classificationIndex, {
              classification: ($event.target as HTMLSelectElement).value
            })
          "
        >
          <option
            value=""
            disabled
          >
            Klassifikation waehlen
          </option>
          <option
            v-for="item in classificationOptions"
            :key="item.name"
            :value="item.name"
          >
            {{ item.label }}
          </option>
        </select>
      </div>
      <div class="col-md-3">
        <label class="form-label form-label-sm">Pflicht</label>
        <select
          :value="classification.required"
          class="form-select form-select-sm"
          @change="
            updateClassification(classificationIndex, {
              required: ($event.target as HTMLSelectElement).value === 'true'
            })
          "
        >
          <option :value="true">ja</option>
          <option :value="false">nein</option>
        </select>
      </div>
      <div class="col-md-1 d-flex align-items-end">
        <button
          class="btn btn-outline-danger btn-sm w-100"
          @click="removeClassification(classificationIndex)"
        >
          ×
        </button>
      </div>
    </div>
  </div>

  <div class="mt-3">
    <div class="form-check mb-2">
      <input
        :checked="finding.validator.enabled"
        class="form-check-input"
        type="checkbox"
        @change="updateValidator({ enabled: ($event.target as HTMLInputElement).checked })"
      />
      <label class="form-check-label">Regel für diesen Befund aktivieren</label>
    </div>

    <div
      v-if="finding.validator.enabled"
      class="row g-3"
    >
      <div class="col-md-4">
        <label class="form-label form-label-sm">Regelname</label>
        <input
          :value="finding.validator.name"
          class="form-control form-control-sm"
          @input="
            updateValidator({
              name: ($event.target as HTMLInputElement).value
            })
          "
        />
      </div>
      <div class="col-md-4">
        <label class="form-label form-label-sm">Bedingung</label>
        <select
          :value="finding.validator.operator"
          class="form-select form-select-sm"
          @change="
            updateValidator({
              operator: ($event.target as HTMLInputElement)
                .value as ReportTemplateBuilderFindingValidator['operator']
            })
          "
        >
          <option value="exists">muss vorhanden sein</option>
          <option value="missing">darf nicht vorhanden sein</option>
          <option value="condition">abhängig von Bedingung</option>
        </select>
      </div>
      <template v-if="finding.validator.operator === 'condition'">
        <div class="col-md-4">
          <label class="form-label form-label-sm">Bedingungs-Klassifikation</label>
          <select
            :value="finding.validator.condition.classification"
            class="form-select form-select-sm"
            @change="updateCondition({ classification: ($event.target as HTMLInputElement).value })"
          >
            <option
              value=""
              disabled
            >
              Klassifikation wählen
            </option>
            <option
              v-for="item in classificationOptions"
              :key="item.name"
              :value="item.name"
            >
              {{ item.label }}
            </option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label form-label-sm">Vergleich</label>
          <select
            :value="finding.validator.condition.comparator"
            class="form-select form-select-sm"
            @change="
              updateCondition({
                comparator: ($event.target as HTMLInputElement)
                  .value as ReportTemplateBuilderFindingValidator['condition']['comparator']
              })
            "
          >
            <option
              v-for="item in comparatorOptions"
              :key="item"
              :value="item"
            >
              {{ item }}
            </option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label form-label-sm">Wert</label>
          <input
            :value="finding.validator.condition.value"
            class="form-control form-control-sm"
            @input="updateCondition({ value: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label form-label-sm">Dann erforderlich</label>
          <select
            class="form-select form-select-sm"
            @change="appendThenRequire(($event.target as HTMLSelectElement).value)"
          >
            <option value="">Klassifikation anhängen</option>
            <option
              v-for="item in classificationOptions"
              :key="item.name"
              :value="item.name"
            >
              {{ item.label }}
            </option>
          </select>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <span
              v-for="item in finding.validator.condition.thenRequires"
              :key="item"
              class="badge bg-secondary"
            >
              {{ item }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import type {
  ReportTemplateBuilderFinding,
  ReportTemplateBuilderFindingValidator,
  ReportTemplateBuilderClassification
} from '@/api/reportTemplateBuilderApi'
const finding = defineModel<ReportTemplateBuilderFinding>({ required: true })
defineProps<{
  findingOptions: { name: string; label: string }[]
  classificationOptions: { name: string; label: string }[]
}>()
defineEmits<{ remove: [] }>()
const comparatorOptions = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in'] as const
function updateFinding(patch: Partial<ReportTemplateBuilderFinding>) {
  finding.value = { ...finding.value, ...patch }
}
function updateValidator(patch: Partial<ReportTemplateBuilderFindingValidator>) {
  updateFinding({ validator: { ...finding.value.validator, ...patch } })
}
function updateCondition(patch: Partial<ReportTemplateBuilderFindingValidator['condition']>) {
  updateValidator({ condition: { ...finding.value.validator.condition, ...patch } })
}
function addClassification() {
  updateFinding({
    classifications: [...finding.value.classifications, { classification: '', required: false }]
  })
}
function removeClassification(index: number) {
  updateFinding({
    classifications: finding.value.classifications.filter((_, position) => position !== index)
  })
}
function updateClassification(index: number, patch: Partial<ReportTemplateBuilderClassification>) {
  updateFinding({
    classifications: finding.value.classifications.map((entry, position) =>
      position === index ? { ...entry, ...patch } : entry
    )
  })
}
function appendThenRequire(nextValue: string) {
  const items = finding.value.validator.condition.thenRequires
  if (nextValue && !items.includes(nextValue)) {
    updateCondition({ thenRequires: [...items, nextValue] })
  }
}
</script>
