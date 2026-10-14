<template>
  <div class="border rounded p-3 mt-4 bg-light-subtle">
    <div class="d-flex flex-wrap gap-2 align-items-end">
      <div>
        <label class="form-label form-label-sm mb-1">Neue Sektion</label>
        <select
          v-model="pendingSectionType"
          class="form-select form-select-sm"
        >
          <option
            value=""
            disabled
          >
            Sektionstyp wählen
          </option>
          <option
            v-for="preset in availablePresets"
            :key="preset.type"
            :value="preset.type"
          >
            {{ preset.label }}
          </option>
        </select>
      </div>
      <button
        class="btn btn-outline-primary btn-sm"
        :disabled="!pendingSectionType"
        @click="addSection"
      >
        Sektion hinzufügen
      </button>
    </div>
  </div>

  <div
    v-if="!sections.length"
    class="alert alert-info mt-3 mb-0"
  >
    Noch keine Sektionen angelegt.
  </div>

  <div
    v-for="(section, sectionIndex) in sections"
    :key="section.id"
    class="border rounded p-3 mt-3"
  >
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div>
        <strong>{{ sectionTitle(section) }}</strong>
        <div class="small text-muted">{{ sectionExampleLabel(section) }}</div>
      </div>
      <div class="d-flex gap-2">
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="sectionIndex === 0"
          @click="moveSection(sectionIndex, -1)"
        >
          Hoch
        </button>
        <button
          class="btn btn-outline-secondary btn-sm"
          :disabled="sectionIndex === sections.length - 1"
          @click="moveSection(sectionIndex, 1)"
        >
          Runter
        </button>
        <button
          class="btn btn-outline-danger btn-sm"
          @click="removeSection(section.id)"
        >
          Entfernen
        </button>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Sektionsname</label>
        <input
          :value="section.name"
          class="form-control"
          @input="updateSection(section.id, { name: ($event.target as HTMLInputElement).value })"
        />
      </div>
      <div class="col-md-6">
        <label class="form-label">Typ</label>
        <input
          :value="section.sectionType"
          class="form-control"
          readonly
        />
      </div>
      <div class="col-12">
        <label class="form-label">Beschreibung</label>
        <textarea
          :value="section.description"
          class="form-control"
          rows="2"
          :placeholder="sectionDescriptionPlaceholder(section)"
          @input="
            updateSection(section.id, { description: ($event.target as HTMLInputElement).value })
          "
        />
      </div>
    </div>

    <template v-if="section.sectionType === 'patient_info'">
      <div class="mt-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0">Patientenfelder</h6>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="addPatientField(section.id)"
          >
            Feld hinzufügen
          </button>
        </div>
        <div
          v-for="(field, fieldIndex) in section.fields"
          :key="`${section.id}-field-${fieldIndex}`"
          class="row g-2 align-items-end mb-2"
        >
          <div class="col-md-4">
            <label class="form-label form-label-sm">Schlüssel</label>
            <input
              :value="field.key"
              class="form-control form-control-sm"
              @input="
                updateField(section.id, fieldIndex, {
                  key: ($event.target as HTMLInputElement).value
                })
              "
            />
          </div>
          <div class="col-md-4">
            <label class="form-label form-label-sm">Label</label>
            <input
              :value="field.label"
              class="form-control form-control-sm"
              @input="
                updateField(section.id, fieldIndex, {
                  label: ($event.target as HTMLInputElement).value
                })
              "
            />
          </div>
          <div class="col-md-3">
            <label class="form-label form-label-sm">Quelle</label>
            <select
              :value="field.source"
              class="form-select form-select-sm"
              @change="
                updateField(section.id, fieldIndex, {
                  source: ($event.target as HTMLInputElement)
                    .value as ReportTemplateBuilderField['source']
                })
              "
            >
              <option value="patient">patient</option>
              <option value="patient_examination">patient_examination</option>
              <option value="history">history</option>
            </select>
          </div>
          <div class="col-md-1 d-flex align-items-center justify-content-center">
            <input
              :checked="field.required"
              class="form-check-input mt-4"
              type="checkbox"
              @change="
                updateField(section.id, fieldIndex, {
                  required: ($event.target as HTMLInputElement).checked
                })
              "
            />
          </div>
        </div>
      </div>
    </template>

    <template v-if="section.sectionType === 'findings'">
      <div class="mt-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0">Befunde</h6>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="addFinding(section.id)"
          >
            Befund hinzufügen
          </button>
        </div>

        <div
          v-for="(finding, findingIndex) in section.findings"
          :key="`${section.id}-finding-${findingIndex}`"
          class="border rounded p-3 mb-3"
        >
          <ReportTemplateFindingEditor
            :model-value="finding"
            :finding-options="findingOptions"
            :classification-options="classificationOptions"
            @update:model-value="updateFinding(section.id, findingIndex, $event)"
            @remove="removeFinding(section.id, findingIndex)"
          />
        </div>
      </div>
    </template>

    <div class="mt-4">
      <h6 class="mb-2">Beispielansicht</h6>
      <pre class="small bg-light p-3 rounded mb-0">{{ renderSectionPreview(section) }}</pre>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import ReportTemplateFindingEditor from './ReportTemplateFindingEditor.vue'
import type {
  ReportTemplateBuilderField,
  ReportTemplateBuilderFinding,
  ReportTemplateBuilderSection
} from '@/api/reportTemplateBuilderApi'
const sections = defineModel<ReportTemplateBuilderSection[]>({ required: true })
defineProps<{
  findingOptions: { name: string; label: string }[]
  classificationOptions: { name: string; label: string }[]
}>()
const pendingSectionType = ref<'' | ReportTemplateBuilderSection['sectionType']>('')
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
function updateSection(id: string, patch: Partial<ReportTemplateBuilderSection>) {
  sections.value = sections.value.map((section) =>
    section.id === id ? { ...section, ...patch } : section
  )
}
function updateFinding(id: string, index: number, finding: ReportTemplateBuilderFinding) {
  const section = sections.value.find((item) => item.id === id)
  if (section) {
    updateSection(id, {
      findings: section.findings.map((entry, position) => (position === index ? finding : entry))
    })
  }
}
function updateField(id: string, index: number, patch: Partial<ReportTemplateBuilderField>) {
  const section = sections.value.find((item) => item.id === id)
  if (section) {
    updateSection(id, {
      fields: section.fields.map((entry, position) =>
        position === index ? { ...entry, ...patch } : entry
      )
    })
  }
}
const availablePresets = computed(() => {
  const taken = new Set(sections.value.map((section) => section.sectionType))
  return [
    { type: 'logo', label: 'Logo' },
    { type: 'patient_info', label: 'Patienteninfo' },
    { type: 'clinic_address', label: 'Klinikadresse' },
    { type: 'findings', label: 'Findings-Section' }
  ].filter(
    (preset) =>
      preset.type === 'findings' ||
      !taken.has(preset.type as ReportTemplateBuilderSection['sectionType'])
  )
})

function defaultField(): ReportTemplateBuilderField {
  return {
    key: '',
    label: '',
    source: 'patient',
    required: false
  }
}

function defaultFinding(): ReportTemplateBuilderFinding {
  return {
    finding: '',
    required: false,
    multipleAllowed: false,
    classifications: [],
    validator: {
      enabled: false,
      name: '',
      operator: 'exists',
      condition: {
        classification: '',
        comparator: 'eq',
        value: '',
        thenRequires: []
      }
    }
  }
}

function createSection(
  sectionType: ReportTemplateBuilderSection['sectionType']
): ReportTemplateBuilderSection {
  if (sectionType === 'logo') {
    return {
      id: uid('section'),
      sectionType,
      name: 'clinic_logo',
      description: 'https://example.org/logo.png',
      fields: [],
      findings: []
    }
  }

  if (sectionType === 'patient_info') {
    return {
      id: uid('section'),
      sectionType,
      name: 'patient_information',
      description: 'Patientenstammdaten für den Berichtskopf',
      fields: [
        { key: 'first_name', label: 'Vorname', source: 'patient', required: false },
        { key: 'last_name', label: 'Nachname', source: 'patient', required: false },
        { key: 'patient_birth_date', label: 'Geburtsdatum', source: 'patient', required: false },
        { key: 'patient_gender', label: 'Geschlecht', source: 'patient', required: false }
      ],
      findings: []
    }
  }

  if (sectionType === 'clinic_address') {
    return {
      id: uid('section'),
      sectionType,
      name: 'clinic_address',
      description:
        'Universitätsklinikum Musterstadt\nKlinik für Endoskopie\nMusterstraße 1\n97070 Würzburg',
      fields: [],
      findings: []
    }
  }

  return {
    id: uid('section'),
    sectionType: 'findings',
    name: `findings_section_${String(sections.value.filter((item) => item.sectionType === 'findings').length + 1)}`,
    description: 'Klinische Befunde und zugehörige Prüfregeln',
    fields: [],
    findings: [defaultFinding()]
  }
}

function addSection() {
  if (!pendingSectionType.value) {
    return
  }
  sections.value = [...sections.value, createSection(pendingSectionType.value)]
  pendingSectionType.value = ''
}

function removeSection(sectionId: string) {
  sections.value = sections.value.filter((section) => section.id !== sectionId)
}

function moveSection(index: number, delta: -1 | 1) {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= sections.value.length) {
    return
  }
  const next = sections.value.slice()
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  sections.value = next
}

function addPatientField(sectionId: string) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) {
    return
  }
  updateSection(sectionId, { fields: [...section.fields, defaultField()] })
}

function addFinding(sectionId: string) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) {
    return
  }
  updateSection(sectionId, { findings: [...section.findings, defaultFinding()] })
}

function removeFinding(sectionId: string, findingIndex: number) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) {
    return
  }
  updateSection(sectionId, {
    findings: section.findings.filter((_, index) => index !== findingIndex)
  })
}

function sectionTitle(section: ReportTemplateBuilderSection): string {
  return section.name || section.sectionType
}

function sectionExampleLabel(section: ReportTemplateBuilderSection): string {
  if (section.sectionType === 'findings') {
    return `${String(section.findings.length)} Befund(e) konfiguriert`
  }
  return `Typ: ${section.sectionType}`
}

function sectionDescriptionPlaceholder(section: ReportTemplateBuilderSection): string {
  if (section.sectionType === 'logo') {
    return 'Logo-URL oder Pfad'
  }
  if (section.sectionType === 'clinic_address') {
    return 'Klinikadresse oder Briefkopftext'
  }
  if (section.sectionType === 'patient_info') {
    return 'Optionaler Einführungstext für die Patientensektion'
  }
  return 'Beschreibung der Befundsektion'
}

function renderSectionPreview(section: ReportTemplateBuilderSection): string {
  if (section.sectionType === 'logo') {
    return `[[ LOGO ]]\nQuelle: ${section.description || 'https://example.org/logo.png'}`
  }
  if (section.sectionType === 'patient_info') {
    return [
      'Patient',
      ...section.fields.map(
        (field) => `- ${field.label || field.key}: {{ ${field.source}.${field.key} }}`
      )
    ].join('\n')
  }
  if (section.sectionType === 'clinic_address') {
    return section.description || 'Klinikadresse / Briefkopf'
  }
  return [
    `## ${section.name || 'Befunde'}`,
    ...section.findings.map((finding) => {
      const classes = finding.classifications
        .map((entry) => `${entry.classification}${entry.required ? ' *' : ''}`)
        .join(', ')
      return `- ${finding.finding || 'finding'}${classes ? ` (${classes})` : ''}`
    })
  ].join('\n')
}
</script>
