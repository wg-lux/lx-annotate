<template>
  <section
    class="branding-editor mt-4"
    aria-labelledby="branding-editor-title"
  >
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h6
          id="branding-editor-title"
          class="mb-1"
        >
          Klinikdesign und Berichtsvorschau
        </h6>
        <p class="small text-muted mb-0">
          Logo und Anschrift werden als Bestandteile dieser Berichtsvorlage gespeichert.
        </p>
      </div>
      <span class="badge text-bg-light">Live-Vorschau</span>
    </div>

    <div class="row g-4">
      <div class="col-lg-5">
        <div class="branding-controls">
          <div>
            <label
              class="form-label"
              for="hospital-logo-upload"
              >Kliniklogo</label
            >
            <input
              id="hospital-logo-upload"
              class="form-control"
              data-testid="hospital-logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="onLogoSelected"
            />
            <div class="form-text">PNG, JPEG oder WebP, maximal 1 MiB.</div>
            <div
              v-if="logoError"
              class="small text-danger mt-1"
              role="alert"
            >
              {{ logoError }}
            </div>
            <button
              v-if="logoSource"
              class="btn btn-outline-danger btn-sm mt-2"
              type="button"
              data-testid="remove-hospital-logo"
              @click="removeLogo"
            >
              Logo entfernen
            </button>
          </div>

          <div>
            <label
              class="form-label"
              for="hospital-address"
              >Klinikname und Anschrift</label
            >
            <textarea
              id="hospital-address"
              class="form-control"
              data-testid="hospital-address"
              rows="6"
              :value="addressText"
              placeholder="Klinikname&#10;Abteilung&#10;Straße und Hausnummer&#10;PLZ Ort&#10;Telefon / E-Mail"
              @input="updateAddress(($event.target as HTMLTextAreaElement).value)"
            />
            <div class="form-text">Eine Zeile pro Bestandteil des Briefkopfs.</div>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <article
          class="report-paper"
          data-testid="branded-report-preview"
        >
          <header class="report-paper-header">
            <div class="report-logo-slot">
              <img
                v-if="logoSource"
                class="report-logo-image"
                :src="logoSource"
                alt="Vorschau des Kliniklogos"
              />
              <span v-else>LOGO</span>
            </div>
            <address class="report-clinic-address">
              <template v-if="addressLines.length">
                <strong>{{ addressLines[0] }}</strong>
                <span
                  v-for="line in addressLines.slice(1)"
                  :key="line"
                  >{{ line }}</span
                >
              </template>
              <template v-else>
                <strong>Klinikname</strong>
                <span>Abteilung · Anschrift · Kontakt</span>
              </template>
            </address>
          </header>

          <div class="report-paper-title">
            <span class="report-type-caption">Befundbericht</span>
            <strong class="report-name-heading">{{ templateDisplayName }}</strong>
          </div>

          <div class="report-patient-grid">
            <div class="report-patient-field">
              <span class="report-patient-label">Patient</span
              ><strong class="report-patient-value">Max Mustermann</strong>
            </div>
            <div class="report-patient-field">
              <span class="report-patient-label">Geburtsdatum</span
              ><strong class="report-patient-value">01.01.1970</strong>
            </div>
            <div class="report-patient-field">
              <span class="report-patient-label">Untersuchung</span
              ><strong class="report-patient-value">{{ examination || 'Nicht gewählt' }}</strong>
            </div>
            <div class="report-patient-field">
              <span class="report-patient-label">Datum</span
              ><strong class="report-patient-value">14.08.2026</strong>
            </div>
          </div>

          <div class="report-section-preview">
            <template
              v-for="section in printableSections"
              :key="section.id"
            >
              <section>
                <h3 class="report-section-heading">{{ section.name || section.sectionType }}</h3>
                <template v-if="section.sectionType === 'patient_info'">
                  <p
                    v-for="field in section.fields"
                    :key="field.key"
                    class="report-section-paragraph"
                  >
                    <b>{{ field.label || field.key }}:</b> Beispielwert
                  </p>
                </template>
                <template v-else-if="section.sectionType === 'findings'">
                  <p
                    v-if="section.description"
                    class="report-section-paragraph"
                  >
                    {{ section.description }}
                  </p>
                  <p
                    v-for="finding in section.findings"
                    :key="finding.finding"
                    class="report-section-paragraph"
                  >
                    <b>{{ finding.finding || 'Befund' }}</b> · Beispielhafte Befundbeschreibung
                  </p>
                </template>
                <p
                  v-else
                  class="report-section-paragraph"
                >
                  {{ section.description }}
                </p>
              </section>
            </template>
            <section v-if="!printableSections.length">
              <h3 class="report-section-heading">Berichtstext</h3>
              <p class="report-section-paragraph">
                Die konfigurierten Berichtsteile erscheinen hier in ihrer späteren Reihenfolge.
              </p>
            </section>
          </div>

          <footer class="report-page-footer">
            <span>{{ addressLines[0] || 'Klinikname' }}</span>
            <span>Seite 1 von 1</span>
          </footer>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ReportTemplateBuilderSection } from '@/api/reportTemplateBuilderApi'

const MAX_LOGO_BYTES = 1024 * 1024
const SUPPORTED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const props = defineProps<{
  sections: ReportTemplateBuilderSection[]
  templateName: string
  examination: string
}>()

const emit = defineEmits<{
  'update:sections': [sections: ReportTemplateBuilderSection[]]
}>()

const logoError = ref<string | null>(null)

const logoSection = computed(
  () => props.sections.find((section) => section.sectionType === 'logo') || null
)
const addressSection = computed(
  () => props.sections.find((section) => section.sectionType === 'clinic_address') || null
)
const logoSource = computed(() => {
  const source = logoSection.value?.description.trim() || ''
  return /^data:image\/(?:png|jpeg|webp);base64,/i.test(source) ? source : ''
})
const addressText = computed(() => addressSection.value?.description || '')
const addressLines = computed(() =>
  addressText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
)
const printableSections = computed(() =>
  props.sections.filter(
    (section) => section.sectionType !== 'logo' && section.sectionType !== 'clinic_address'
  )
)
const templateDisplayName = computed(() => props.templateName.trim() || 'Neue Berichtsvorlage')

function replaceSectionDescription(sectionType: 'logo' | 'clinic_address', description: string) {
  const existingIndex = props.sections.findIndex((section) => section.sectionType === sectionType)
  if (existingIndex >= 0) {
    emit(
      'update:sections',
      props.sections.map((section, index) =>
        index === existingIndex ? { ...section, description } : section
      )
    )
    return
  }

  const nextSection: ReportTemplateBuilderSection = {
    id: `branding_${sectionType}`,
    sectionType,
    name: sectionType === 'logo' ? 'clinic_logo' : 'clinic_address',
    description,
    fields: [],
    findings: []
  }
  const insertionIndex = sectionType === 'logo' ? 0 : logoSection.value ? 1 : 0
  const next = props.sections.slice()
  next.splice(insertionIndex, 0, nextSection)
  emit('update:sections', next)
}

function updateAddress(value: string) {
  replaceSectionDescription('clinic_address', value)
}

function removeLogo() {
  logoError.value = null
  emit(
    'update:sections',
    props.sections.filter((section) => section.sectionType !== 'logo')
  )
}

function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  logoError.value = null
  if (!file) {
    return
  }
  if (!SUPPORTED_LOGO_TYPES.has(file.type)) {
    logoError.value = 'Nicht unterstütztes Logoformat. Bitte PNG, JPEG oder WebP verwenden.'
    return
  }
  if (file.size > MAX_LOGO_BYTES) {
    logoError.value = 'Das Logo ist größer als 1 MiB. Bitte eine kleinere Datei wählen.'
    return
  }

  const reader = new FileReader()
  reader.onerror = () => {
    logoError.value = 'Das Logo konnte nicht gelesen werden. Bitte die Datei erneut auswählen.'
  }
  reader.onload = () => {
    if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
      logoError.value = 'Das Logo konnte nicht als Bild eingelesen werden.'
      return
    }
    replaceSectionDescription('logo', reader.result)
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.branding-editor {
  padding-top: 1.25rem;
  border-top: 1px solid var(--bs-border-color);
}

.branding-controls {
  display: grid;
  gap: 1.5rem;
}

.report-paper {
  min-height: 42rem;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  border: 1px solid #d8dee8;
  border-radius: 0.25rem;
  background: #fff;
  box-shadow: 0 1rem 2.5rem rgb(43 55 74 / 12%);
  color: #243247;
}

.report-paper-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 5.25rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #365f91;
}

.report-logo-slot {
  display: grid;
  place-items: center;
  width: 9rem;
  height: 4.5rem;
  border: 1px dashed #aeb9c7;
  border-radius: 0.25rem;
  color: #8491a3;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.report-logo-slot .report-logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.report-paper .report-clinic-address {
  display: grid;
  align-content: start;
  gap: 0.15rem;
  margin: 0;
  text-align: right;
  font-size: 0.75rem;
  font-style: normal;
}

.report-paper-title {
  display: grid;
  gap: 0.25rem;
  margin: 1.75rem 0 1rem;
}

.report-paper-title .report-type-caption {
  color: #66758a;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.report-paper-title .report-name-heading {
  font-size: 1.45rem;
}

.report-patient-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 1.25rem;
  padding: 0.9rem;
  border-radius: 0.25rem;
  background: #f3f6fa;
}

.report-patient-grid .report-patient-field {
  display: grid;
  gap: 0.1rem;
}

.report-patient-grid .report-patient-label {
  color: #718096;
  font-size: 0.65rem;
  text-transform: uppercase;
}

.report-patient-grid .report-patient-value {
  font-size: 0.82rem;
}

.report-section-preview {
  display: grid;
  gap: 1.25rem;
  margin-top: 1.5rem;
}

.report-section-preview .report-section-heading {
  margin: 0 0 0.5rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #dce2ea;
  color: #365f91;
  font-size: 0.95rem;
}

.report-section-preview .report-section-paragraph {
  margin: 0.25rem 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.report-paper .report-page-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 0.5rem;
  border-top: 1px solid #dce2ea;
  color: #718096;
  font-size: 0.65rem;
}

@media (max-width: 575.98px) {
  .report-paper-header {
    flex-direction: column;
  }

  .report-paper .report-clinic-address {
    text-align: left;
  }

  .report-patient-grid {
    grid-template-columns: 1fr;
  }
}
</style>
