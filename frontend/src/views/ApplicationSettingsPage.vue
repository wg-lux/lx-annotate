<template>
  <div class="settings-page container-fluid py-4 px-3 px-lg-4">
    <section class="settings-hero">
      <div>
        <p class="settings-eyebrow">Konfiguration</p>
        <h1 class="settings-title">Anwendungseinstellungen</h1>
        <p class="settings-intro">
          Legen Sie die Standardwerte fest, die neue Fälle für Zentrum, Prozessor und
          Berichtsvorlage übernehmen.
        </p>
      </div>
      <div class="settings-status">
        <span class="status-chip" :class="{ 'status-chip-busy': loading || saving }">
          {{ loading ? 'Lade Einstellungen' : saving ? 'Speichere Änderungen' : 'Bereit' }}
        </span>
        <p v-if="updatedAtLabel" class="status-updated">
          Zuletzt aktualisiert: {{ updatedAtLabel }}
        </p>
      </div>
    </section>

    <div class="row g-4 align-items-start">
      <div class="col-12 col-xl-8">
        <section class="settings-card">
          <div class="card-header-row">
            <div>
              <h2>Standardauswahl</h2>
              <p>Diese Werte werden als Ausgangspunkt für die Arbeitsabläufe verwendet.</p>
            </div>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm"
              :disabled="loading || saving"
              @click="loadSettings"
            >
              Neu laden
            </button>
          </div>

          <div v-if="loading" class="loading-state">
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line-short"></div>
            <div class="skeleton-line"></div>
          </div>

          <div v-else>
            <div v-if="errorMessage" class="alert alert-warning mb-4" role="alert">
              {{ errorMessage }}
            </div>

            <form class="settings-form" @submit.prevent="saveSettings">
              <label class="settings-field">
                <span>Zentrum</span>
                <select
                  v-model="form.centerId"
                  class="form-select"
                  data-test="center-select"
                  :disabled="saving"
                >
                  <option :value="EMPTY_OPTION">Kein Standardzentrum</option>
                  <option
                    v-for="center in dropdowns.centers"
                    :key="center.id"
                    :value="String(center.id)"
                  >
                    {{ center.name }}
                  </option>
                </select>
              </label>

              <label class="settings-field">
                <span>Prozessor</span>
                <select
                  v-model="form.processorId"
                  class="form-select"
                  data-test="processor-select"
                  :disabled="saving"
                >
                  <option :value="EMPTY_OPTION">Kein Standardprozessor</option>
                  <option
                    v-for="processor in dropdowns.processors"
                    :key="processor.id"
                    :value="String(processor.id)"
                  >
                    {{ processor.name }}
                  </option>
                </select>
              </label>

              <label class="settings-field">
                <span>Standard-Annotator</span>
                <select
                  v-model="form.annotatorName"
                  class="form-select"
                  data-test="annotator-select"
                  :disabled="saving"
                >
                  <option :value="EMPTY_OPTION">Kein Standard-Annotator</option>
                  <option
                    v-for="annotator in dropdowns.annotators"
                    :key="annotator.value"
                    :value="annotator.value"
                  >
                    {{ annotator.label }}
                  </option>
                </select>
              </label>

              <label class="settings-field">
                <span>Berichtsvorlage</span>
                <select
                  v-model="form.reportTemplateName"
                  class="form-select"
                  data-test="report-template-select"
                  :disabled="saving"
                >
                  <option :value="EMPTY_OPTION">Keine Standardvorlage</option>
                  <option
                    v-for="templateOption in dropdowns.reportTemplates"
                    :key="templateOption.value"
                    :value="templateOption.value"
                  >
                    {{ templateOption.label }}
                  </option>
                </select>
              </label>

              <div class="actions-row">
                <button
                  type="button"
                  class="btn btn-light"
                  data-test="save-settings"
                  :disabled="saving || loading || !isDirty"
                  @click="saveSettings"
                >
                  Einstellungen speichern
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :disabled="saving || loading || !isDirty"
                  @click="resetForm"
                >
                  Änderungen verwerfen
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <div class="col-12 col-xl-4">
        <aside class="settings-card settings-card-contrast">
          <h2>Aktive Auswahl</h2>
          <p class="summary-intro">
            Vorschau der Werte, die mit dem nächsten Speichern aktiv werden.
          </p>

          <dl class="settings-summary">
            <div>
              <dt>Zentrum</dt>
              <dd data-test="summary-center">{{ selectedCenterLabel }}</dd>
            </div>
            <div>
              <dt>Prozessor</dt>
              <dd data-test="summary-processor">{{ selectedProcessorLabel }}</dd>
            </div>
            <div>
              <dt>Annotator</dt>
              <dd data-test="summary-annotator">{{ selectedAnnotatorLabel }}</dd>
            </div>
            <div>
              <dt>Berichtsvorlage</dt>
              <dd data-test="summary-report-template">{{ selectedReportTemplateLabel }}</dd>
            </div>
          </dl>

          <div class="summary-note">
            <strong>Hinweis</strong>
            <p>
              Bereits angelegte Fälle behalten ihre eigene Konfiguration. Die Änderung wirkt auf
              nachfolgende Arbeitsvorgänge.
            </p>
          </div>
        </aside>

        <aside class="settings-card mt-4">
          <div class="card-header-row">
            <div>
              <h2>Backup & Datenintegrität</h2>
              <p>
                Ein Backup auf ein eingebundenes Laufwerk wird nur freigeschaltet, wenn alle
                benötigten Datenpfade vorhanden sind.
              </p>
            </div>
            <span class="backup-chip" :class="{ 'backup-chip-ready': backupReady, 'backup-chip-blocked': !backupReady }">
              {{ backupReady ? 'Backup bereit' : 'Pfadprüfung fehlgeschlagen' }}
            </span>
          </div>

          <div class="backup-summary">
            <div class="backup-stat">
              <span>Verfügbare Pfade</span>
              <strong>{{ backupAvailablePaths }} / {{ backupRequiredPaths }}</strong>
            </div>
            <div class="backup-stat">
              <span>Quelle</span>
              <strong>{{ backupSourceRoots.length }}</strong>
            </div>
          </div>

          <div class="backup-roots">
            <div v-for="root in backupSourceRoots" :key="root.path" class="backup-root">
              <div class="backup-root-header">
                <strong>{{ root.label }}</strong>
                <span class="backup-root-count">{{ root.fileCount }} Dateien</span>
              </div>
              <code>{{ root.path }}</code>
            </div>
          </div>

          <div v-if="backupMissingPaths.length" class="alert alert-warning mt-3 mb-0" role="alert">
            Fehlende Pfade: {{ backupMissingPaths.join(', ') }}
          </div>

          <form class="backup-form" @submit.prevent="runBackup">
            <label class="settings-field">
              <span>Backup-Zielpfad</span>
              <input
                v-model="backupTargetPath"
                type="text"
                class="form-control"
                data-test="backup-target-path"
                :disabled="backupInProgress"
                placeholder="/mnt/external-drive"
              />
            </label>

            <div v-if="backupMessage" class="alert alert-info mb-0" role="alert">
              {{ backupMessage }}
            </div>

            <button
              type="button"
              class="btn btn-dark"
              data-test="run-backup"
              :disabled="backupInProgress || !backupReady || !backupTargetPath.trim()"
              @click="runBackup"
            >
              {{ backupInProgress ? 'Backup läuft…' : 'Backup auf Laufwerk starten' }}
            </button>
          </form>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  fetchApplicationSettings,
  fetchApplicationSettingsDropdowns,
  triggerApplicationBackup,
  updateApplicationSettings,
  type ApplicationBackupResult,
  type ApplicationSettingsDropdowns,
  type ApplicationSettingsRecord
} from '@/api/applicationSettingsApi'
import { useToastStore } from '@/stores/toastStore'
import { computed, onMounted, reactive, ref } from 'vue'

const EMPTY_OPTION = ''

const toast = useToastStore()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const currentSettings = ref<ApplicationSettingsRecord | null>(null)
const backupInProgress = ref(false)
const backupTargetPath = ref('')
const backupResult = ref<ApplicationBackupResult | null>(null)
const backupError = ref('')

const dropdowns = reactive<ApplicationSettingsDropdowns>({
  centers: [],
  processors: [],
  annotators: [],
  reportTemplates: []
})

const form = reactive({
  centerId: EMPTY_OPTION,
  processorId: EMPTY_OPTION,
  annotatorName: EMPTY_OPTION,
  reportTemplateName: EMPTY_OPTION
})

const updatedAtLabel = computed(() => {
  if (!currentSettings.value?.updatedAt) return null

  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(currentSettings.value.updatedAt))
})

const selectedCenterLabel = computed(() => {
  const match = dropdowns.centers.find((option) => String(option.id) === form.centerId)
  return match?.name ?? 'Kein Standardzentrum'
})

const selectedProcessorLabel = computed(() => {
  const match = dropdowns.processors.find((option) => String(option.id) === form.processorId)
  return match?.name ?? 'Kein Standardprozessor'
})

const selectedAnnotatorLabel = computed(() => {
  const match = dropdowns.annotators.find((option) => option.value === form.annotatorName)
  return match?.label ?? 'Kein Standard-Annotator'
})

const selectedReportTemplateLabel = computed(() => {
  const match = dropdowns.reportTemplates.find((option) => option.value === form.reportTemplateName)
  return match?.label ?? 'Keine Standardvorlage'
})

const backupReady = computed(() => currentSettings.value?.backupStatus.ready ?? false)
const backupMissingPaths = computed(() => currentSettings.value?.backupStatus.missingPaths ?? [])
const backupSourceRoots = computed(() => currentSettings.value?.backupStatus.sourceRoots ?? [])
const backupRequiredPaths = computed(() => currentSettings.value?.backupStatus.requiredPathCount ?? 0)
const backupAvailablePaths = computed(() => currentSettings.value?.backupStatus.availablePathCount ?? 0)
const backupMessage = computed(() => {
  if (backupError.value) return backupError.value
  if (backupResult.value) return `Backup erstellt: ${backupResult.value.targetRoot}`
  return ''
})

const isDirty = computed(() => {
  if (!currentSettings.value) return false

  return (
    (currentSettings.value.centerId === null ? EMPTY_OPTION : String(currentSettings.value.centerId)) !==
      form.centerId ||
    (currentSettings.value.processorId === null
      ? EMPTY_OPTION
      : String(currentSettings.value.processorId)) !== form.processorId ||
    (currentSettings.value.annotatorName ?? EMPTY_OPTION) !== form.annotatorName ||
    (currentSettings.value.reportTemplateName ?? EMPTY_OPTION) !== form.reportTemplateName
  )
})

function applySettings(settings: ApplicationSettingsRecord) {
  currentSettings.value = settings
  form.centerId = settings.centerId === null ? EMPTY_OPTION : String(settings.centerId)
  form.processorId = settings.processorId === null ? EMPTY_OPTION : String(settings.processorId)
  form.annotatorName = settings.annotatorName ?? EMPTY_OPTION
  form.reportTemplateName = settings.reportTemplateName ?? EMPTY_OPTION
}

function resetForm() {
  if (!currentSettings.value) return
  applySettings(currentSettings.value)
}

async function loadSettings() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [settings, nextDropdowns] = await Promise.all([
      fetchApplicationSettings(),
      fetchApplicationSettingsDropdowns()
    ])

    dropdowns.centers = nextDropdowns.centers
    dropdowns.processors = nextDropdowns.processors
    dropdowns.annotators = nextDropdowns.annotators
    dropdowns.reportTemplates = nextDropdowns.reportTemplates
    applySettings(settings)
    backupResult.value = null
    backupError.value = ''
  } catch (error) {
    console.error('Failed to load application settings:', error)
    errorMessage.value =
      'Die Anwendungseinstellungen konnten nicht geladen werden. Bitte erneut versuchen.'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true

  try {
    const updated = await updateApplicationSettings({
      centerId: form.centerId ? Number(form.centerId) : null,
      processorId: form.processorId ? Number(form.processorId) : null,
      annotatorName: form.annotatorName || null,
      reportTemplateName: form.reportTemplateName || null
    })

    applySettings(updated)
    toast.success({ text: 'Anwendungseinstellungen gespeichert.' })
  } catch (error) {
    console.error('Failed to save application settings:', error)
  } finally {
    saving.value = false
  }
}

async function runBackup() {
  backupInProgress.value = true
  backupError.value = ''
  backupResult.value = null

  try {
    const result = await triggerApplicationBackup({
      targetPath: backupTargetPath.value.trim()
    })
    await loadSettings()
    backupResult.value = result
    toast.success({ text: 'Backup erfolgreich erstellt.' })
  } catch (error: any) {
    backupError.value =
      error?.response?.data?.detail ||
      error?.response?.data?.errors?.targetPath ||
      'Backup konnte nicht gestartet werden.'
    console.error('Failed to run application backup:', error)
  } finally {
    backupInProgress.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  min-height: calc(100vh - 4rem);
  background:
    radial-gradient(circle at top right, rgba(229, 243, 255, 0.9), transparent 38%),
    linear-gradient(180deg, #f4f8fc 0%, #eef3f8 100%);
}

.settings-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem 1.75rem;
  border-radius: 1.25rem;
  background:
    linear-gradient(135deg, rgba(14, 54, 88, 0.96), rgba(27, 111, 163, 0.92)),
    #12344d;
  color: #f5fbff;
  box-shadow: 0 24px 48px rgba(17, 34, 51, 0.16);
}

.settings-eyebrow {
  margin: 0 0 0.45rem;
  font-size: 0.78rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(233, 245, 255, 0.76);
}

.settings-title {
  margin: 0;
  font-size: clamp(1.7rem, 2vw, 2.3rem);
  font-weight: 700;
  color: #fff;
}

.settings-intro {
  max-width: 42rem;
  margin: 0.75rem 0 0;
  color: rgba(245, 251, 255, 0.84);
  line-height: 1.6;
}

.settings-status {
  min-width: 14rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(201, 241, 214, 0.16);
  border: 1px solid rgba(210, 247, 221, 0.28);
  color: #dcfce7;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-chip-busy {
  background: rgba(255, 231, 181, 0.16);
  border-color: rgba(255, 231, 181, 0.28);
  color: #fff2cf;
}

.status-updated {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(245, 251, 255, 0.78);
  text-align: right;
}

.settings-card {
  height: 100%;
  padding: 1.5rem;
  border: 1px solid rgba(15, 45, 69, 0.08);
  border-radius: 1.15rem;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 34px rgba(30, 41, 59, 0.08);
  backdrop-filter: blur(12px);
}

.settings-card-contrast {
  background:
    linear-gradient(180deg, rgba(250, 252, 255, 0.96), rgba(239, 247, 255, 0.96)),
    #fff;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.card-header-row h2,
.settings-card-contrast h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #16324a;
}

.card-header-row p,
.summary-intro {
  margin: 0.4rem 0 0;
  color: #5b7083;
  line-height: 1.55;
}

.settings-form {
  display: grid;
  gap: 1rem;
}

.settings-field {
  display: grid;
  gap: 0.5rem;
  color: #16324a;
  font-weight: 600;
}

.settings-field span {
  font-size: 0.92rem;
}

.form-select {
  min-height: 3rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(22, 50, 74, 0.16);
  box-shadow: none;
}

.form-select:focus {
  border-color: rgba(23, 111, 163, 0.5);
  box-shadow: 0 0 0 0.2rem rgba(23, 111, 163, 0.12);
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.loading-state {
  display: grid;
  gap: 0.8rem;
}

.skeleton-line {
  height: 1rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(214, 225, 235, 0.6), rgba(232, 239, 244, 0.95), rgba(214, 225, 235, 0.6));
  background-size: 200% 100%;
  animation: shimmer 1.3s linear infinite;
}

.skeleton-line-short {
  width: 65%;
}

.settings-summary {
  display: grid;
  gap: 1rem;
  margin: 1.25rem 0 0;
}

.settings-summary div {
  padding: 0.95rem 1rem;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(18, 52, 77, 0.08);
}

.settings-summary dt {
  margin: 0 0 0.3rem;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #688095;
}

.settings-summary dd {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #16324a;
}

.summary-note {
  margin-top: 1.25rem;
  padding: 1rem 1.05rem;
  border-radius: 1rem;
  background: rgba(17, 78, 121, 0.08);
  color: #214661;
}

.summary-note strong {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.92rem;
}

.summary-note p {
  margin: 0;
  line-height: 1.55;
}

.backup-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.backup-chip-ready {
  background: rgba(38, 164, 103, 0.12);
  color: #16643e;
}

.backup-chip-blocked {
  background: rgba(212, 91, 69, 0.12);
  color: #9e2b1f;
}

.backup-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.backup-stat,
.backup-root {
  padding: 0.95rem 1rem;
  border-radius: 0.95rem;
  background: rgba(247, 250, 252, 0.95);
  border: 1px solid rgba(18, 52, 77, 0.08);
}

.backup-stat span,
.backup-root-count {
  display: block;
  font-size: 0.78rem;
  color: #688095;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.backup-stat strong,
.backup-root-header strong {
  color: #16324a;
}

.backup-roots {
  display: grid;
  gap: 0.75rem;
}

.backup-root-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.35rem;
}

.backup-root code {
  display: block;
  white-space: normal;
  word-break: break-all;
  color: #23435b;
}

.backup-form {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 991.98px) {
  .settings-hero {
    flex-direction: column;
  }

  .settings-status {
    align-items: flex-start;
    min-width: 0;
  }

  .status-updated {
    text-align: left;
  }
}
</style>
