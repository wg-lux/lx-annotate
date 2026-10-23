<template>
  <main class="card shadow-sm">
    <div class="card-header"><h5>Untersuchungsfassungen und Fallabschluss</h5></div>
    <div class="card-body">
      <RouterLink :to="{ path: '/reporting/case-setup', query: route.query }">
        Zurück zur Fallanlage
      </RouterLink>
      <RouterLink
        class="ms-3"
        :to="{
          path: '/reporting/medication',
          query: { ...route.query, patient_examination_id: examId ?? undefined }
        }"
      >
        Medikation und Laborwerte erfassen
      </RouterLink>
      <p class="mt-3">
        Speichern Sie die klinischen Angaben zuerst. Erstellen Sie dann eine Fassung mit dem
        gewünschten Bericht, Video oder Annotationstrack. Medien sind optional. Pro Untersuchung
        wird genau eine abgeschlossene Fassung für den Fall ausgewählt.
      </p>
      <p
        v-if="error"
        class="alert alert-danger"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-if="message"
        class="alert alert-success"
        role="status"
      >
        {{ message }}
      </p>
      <fieldset :disabled="busy || !patientCase || patientCase.isClosed">
        <label
          for="revision-examination"
          class="form-label"
          >Untersuchung</label
        >
        <select
          id="revision-examination"
          v-model="examId"
          class="form-select"
          @change="changeExamination"
        >
          <option
            :value="null"
            disabled
          >
            Bitte auswählen
          </option>
          <option
            v-for="exam in patientCase?.patientExaminations"
            :key="exam.id"
            :value="exam.id"
          >
            {{
              exam.examinationName ||
              (typeof exam.examination === 'string' ? exam.examination : exam.examination?.name)
            }}
            · {{ exam.dateStart }}
          </option>
        </select>
        <form
          class="row g-3 mt-2"
          @submit.prevent="create"
        >
          <div class="col-md-4">
            <label
              for="revision-title"
              class="form-label"
              >Bezeichnung</label
            ><input
              id="revision-title"
              v-model="title"
              class="form-control"
              required
              maxlength="255"
            />
          </div>
          <div class="col-md-4">
            <label
              for="revision-report"
              class="form-label"
              >Bericht (optional)</label
            ><select
              id="revision-report"
              v-model="reportId"
              class="form-select"
            >
              <option :value="null">Ohne Bericht</option>
              <option
                v-for="doc in reports"
                :key="doc.id"
                :value="doc.id"
              >
                {{ doc.title || 'Bericht' }} · {{ doc.status }} · {{ doc.version }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label
              for="revision-video"
              class="form-label"
              >Video (optional)</label
            ><select
              id="revision-video"
              v-model="videoId"
              class="form-select"
            >
              <option :value="null">Ohne Video</option>
              <option
                v-for="doc in videos"
                :key="doc.id"
                :value="doc.id"
              >
                {{ doc.title || doc.fileName || 'Video' }}
              </option>
            </select>
          </div>
          <div class="col-md-6">
            <label
              for="revision-annotator"
              class="form-label"
              >Annotationstrack (Benutzername, optional)</label
            ><input
              id="revision-annotator"
              v-model="annotator"
              class="form-control"
              :disabled="!videoId"
            />
          </div>
          <div class="col-12">
            <label
              ><input
                v-model="includeMedical"
                type="checkbox"
              />
              Zugeordnete Medikamente und Laborwerte dieses Falls übernehmen</label
            >
          </div>
          <div>
            <button
              class="btn btn-primary"
              :disabled="!examId"
              type="submit"
            >
              Entwurf aus gespeicherten Angaben erstellen
            </button>
          </div>
        </form>
      </fieldset>
      <div
        v-for="record in records"
        :key="record.id"
        class="border rounded p-3 mt-3"
      >
        <strong>{{ record.title }}</strong> · {{ record.finalizedAt ? 'Abgeschlossen' : 'Entwurf' }}
        <p class="small text-muted mb-1">
          Bericht: {{ record.snapshot.evidence?.reportId ?? 'ohne' }} · Video:
          {{ record.snapshot.evidence?.videoId ?? 'ohne' }} · Annotationen:
          {{ record.snapshot.evidence?.annotations?.length ?? 0 }}
        </p>
        <span
          v-if="selected.some((item) => item.revisionId === record.id)"
          class="badge bg-success ms-2"
          >Für den Fall gewählt</span
        >
        <div class="d-flex gap-2 mt-2">
          <button
            class="btn btn-outline-primary btn-sm"
            :disabled="busy"
            @click="run(() => examinationRevisions.copy(record))"
          >
            Als neuen Entwurf kopieren
          </button>
          <button
            v-if="!record.finalizedAt"
            class="btn btn-outline-primary btn-sm"
            :disabled="busy"
            @click="edit(record)"
          >
            Angaben bearbeiten
          </button>
          <button
            v-if="!record.finalizedAt"
            class="btn btn-primary btn-sm"
            :disabled="busy"
            @click="run(() => examinationRevisions.finalize(record))"
          >
            Fassung abschließen
          </button>
          <button
            v-if="record.finalizedAt"
            class="btn btn-success btn-sm"
            :disabled="busy || patientCase?.isClosed"
            @click="select(record)"
          >
            Für Fall auswählen
          </button>
          <button
            v-if="!record.finalizedAt"
            class="btn btn-outline-danger btn-sm"
            :disabled="busy"
            @click="run(() => examinationRevisions.remove(record))"
          >
            Entwurf löschen
          </button>
        </div>
      </div>
      <form
        v-if="editing"
        class="border rounded p-3 mt-3"
        @submit.prevent="saveEdit"
      >
        <fieldset :disabled="busy">
          <label
            class="form-label"
            for="revision-edit-title"
            >Bezeichnung</label
          ><input
            id="revision-edit-title"
            v-model="editing.title"
            class="form-control"
            required
          />
          <div
            v-for="descriptor in descriptors"
            :key="descriptor.uuid"
            class="mt-2"
          >
            <label class="form-label">{{ descriptor.classificationChoiceDescriptor }}</label>
            <input
              v-if="typeof descriptor.descriptorValue === 'boolean'"
              v-model="descriptor.descriptorValue"
              type="checkbox"
            />
            <input
              v-else-if="typeof descriptor.descriptorValue === 'number'"
              v-model.number="descriptor.descriptorValue"
              type="number"
              step="any"
              class="form-control"
            />
            <input
              v-else-if="typeof descriptor.descriptorValue === 'string'"
              v-model="descriptor.descriptorValue"
              class="form-control"
            />
            <div
              v-for="(_, index) in descriptor.descriptorValue"
              v-else
              :key="index"
            >
              <input
                v-model="descriptor.descriptorValue[index]"
                class="form-control"
              />
            </div>
          </div>
          <div
            v-for="(lab, index) in editing.snapshot.content.labValues"
            :key="index"
            class="mt-3"
          >
            <label class="form-label">{{ lab.labValue }} ({{ lab.unit }})</label>
            <input
              v-if="lab.value !== null"
              v-model.number="lab.value"
              type="number"
              step="any"
              class="form-control"
            />
            <input
              v-else
              v-model="lab.valueStr"
              class="form-control"
            />
            <button
              class="btn btn-outline-danger btn-sm"
              type="button"
              @click="removeMeasurement(index)"
            >
              Messung entfernen
            </button>
          </div>
          <button
            class="btn btn-primary mt-3"
            type="submit"
          >
            Entwurf speichern
          </button>
          <button
            class="btn btn-secondary mt-3 ms-2"
            type="button"
            @click="editing = null"
          >
            Abbrechen
          </button>
        </fieldset>
      </form>
      <div
        v-if="patientCase"
        class="mt-4 d-flex gap-2"
      >
        <button
          class="btn btn-outline-primary"
          :disabled="busy || !complete"
          @click="download"
        >
          Studienarbeitsmappe herunterladen
        </button>
        <button
          class="btn btn-dark"
          :disabled="busy || (!patientCase.isClosed && !complete)"
          @click="toggleClosed"
        >
          {{ patientCase.isClosed ? 'Für Folgeuntersuchung wieder öffnen' : 'Fall schließen' }}
        </button>
      </div>
      <p
        v-if="patientCase && !complete"
        class="text-muted mt-2"
      >
        Für jede Untersuchung muss eine abgeschlossene Fassung ausgewählt werden.
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch, triggerRef } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { fetchPatientCases, type PatientCase } from '@/api/casesApi'
import {
  examinationRevisions,
  type ExaminationRevision,
  type SelectedExamination
} from '@/api/examinationRevisions'
import { reportingApiErrorMessage } from './reportingError'

const route = useRoute()
const patientCase = shallowRef<PatientCase | null>(null)
const examId = ref<number | null>(null)
const records = shallowRef<ExaminationRevision[]>([])
const selected = ref<SelectedExamination[]>([])
const editing = shallowRef<ExaminationRevision | null>(null)
const title = ref('')
const reportId = ref<number | null>(null)
const videoId = ref<number | null>(null)
const annotator = ref('')
const includeMedical = ref(false)
const error = ref('')
const message = ref('')
const busy = ref(false)
let generation = 0
let contextGeneration = 0
const reports = computed(
  () =>
    patientCase.value?.documents.filter(
      (doc) => doc.patientExaminationId === examId.value && doc.mediaType === 'text_report'
    ) ?? []
)
const videos = computed(
  () =>
    patientCase.value?.documents.filter(
      (doc) => doc.patientExaminationId === examId.value && doc.mediaType === 'video'
    ) ?? []
)
const complete = computed(() =>
  Boolean(
    patientCase.value?.patientExaminations.length &&
    patientCase.value.patientExaminations.every((exam) =>
      selected.value.some((item) => item.patientExaminationId === exam.id)
    )
  )
)
const descriptors = computed(
  () =>
    editing.value?.snapshot.content.examination.patientFindings?.flatMap(
      (finding) =>
        finding.patientFindingClassifications?.flatMap(
          (group) =>
            group.patientFindingClassificationChoices?.flatMap(
              (choice) => choice.patientFindingClassificationChoiceDescriptors ?? []
            ) ?? []
        ) ?? []
    ) ?? []
)

function removeMeasurement(index: number) {
  editing.value?.snapshot.content.labValues.splice(index, 1)
  triggerRef(editing)
}
async function changeExamination() {
  const context = contextGeneration
  busy.value = true
  try {
    await loadRecords()
  } catch (caught: unknown) {
    if (context === contextGeneration)
      error.value = reportingApiErrorMessage(caught, 'Fassungen konnten nicht geladen werden.')
  } finally {
    if (context === contextGeneration) busy.value = false
  }
}
async function loadRecords() {
  const runId = ++generation
  records.value = []
  editing.value = null
  reportId.value = null
  videoId.value = null
  annotator.value = ''
  if (!examId.value || !patientCase.value) return
  const [rows, selections] = await Promise.all([
    examinationRevisions.list(examId.value),
    examinationRevisions.selections(patientCase.value.caseId)
  ])
  if (runId !== generation) return
  records.value = rows
  selected.value = selections
}
function selectedPatientId(): number {
  const patientId = Number(route.query.patient_id)
  if (!Number.isSafeInteger(patientId) || patientId < 1 || typeof route.query.case_id !== 'string')
    throw new Error('Bitte einen Patienten und Fall auswählen.')
  return patientId
}

function initialExaminationId(selectedCase: PatientCase): number | null {
  if (!('patient_examination_id' in route.query))
    return selectedCase.patientExaminations[0]?.id ?? null
  const selected = selectedCase.patientExaminations.find(
    (exam) => String(exam.id) === route.query.patient_examination_id
  )
  if (!selected) throw new Error('Die ausgewählte Untersuchung gehört nicht zu diesem Fall.')
  return selected.id
}

async function load() {
  const context = ++contextGeneration
  const runId = ++generation
  patientCase.value = null
  records.value = []
  editing.value = null
  selected.value = []
  examId.value = null
  error.value = ''
  busy.value = true
  try {
    const patientId = selectedPatientId()
    const cases = await fetchPatientCases({ patientId })
    if (runId !== generation) return
    patientCase.value =
      cases.find(
        (item) =>
          item.patient === patientId && item.caseId === route.query.case_id && !item.isDeleted
      ) ?? null
    if (!patientCase.value) throw new Error('Der Fall ist nicht verfügbar.')
    examId.value = initialExaminationId(patientCase.value)
    await loadRecords()
  } catch (caught: unknown) {
    if (context === contextGeneration)
      error.value = reportingApiErrorMessage(caught, 'Fassungen konnten nicht geladen werden.')
  } finally {
    if (context === contextGeneration) busy.value = false
  }
}
async function run(operation: () => Promise<unknown>) {
  if (busy.value) return
  const contextId = contextGeneration
  const context = patientCase.value?.caseId
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await operation()
    if (patientCase.value?.caseId !== context) return
    await loadRecords()
    message.value = 'Änderung gespeichert.'
  } catch (caught: unknown) {
    if (patientCase.value?.caseId === context)
      error.value = reportingApiErrorMessage(caught, 'Änderung konnte nicht gespeichert werden.')
  } finally {
    if (contextId === contextGeneration) busy.value = false
  }
}
function create() {
  if (!examId.value || !patientCase.value) return
  const id = examId.value
  const selection = {
    reportId: reportId.value,
    videoId: videoId.value,
    annotator: videoId.value && annotator.value.trim() ? annotator.value.trim() : null,
    medicationIds: includeMedical.value ? patientCase.value.patientMedications : [],
    labValueIds: includeMedical.value ? patientCase.value.patientLabValues : []
  }
  return run(() => examinationRevisions.create(id, title.value, selection))
}
function select(record: ExaminationRevision) {
  if (!patientCase.value) return
  const caseId = patientCase.value.caseId
  return run(() => examinationRevisions.select(caseId, record))
}
function edit(record: ExaminationRevision) {
  editing.value = JSON.parse(JSON.stringify(record)) as ExaminationRevision
}
function saveEdit() {
  const record = editing.value
  if (record) return run(() => examinationRevisions.update(record))
}
async function toggleClosed() {
  if (!patientCase.value) return
  const current = patientCase.value
  await run(() =>
    axiosInstance.post(r(`cases/${current.caseId}/${current.isClosed ? 'reopen' : 'close'}/`))
  )
  if (!error.value && route.query.case_id === current.caseId) await load()
}
async function download() {
  if (!patientCase.value) return
  const current = patientCase.value
  await run(async () => {
    const blob = await examinationRevisions.workbook(current.caseId)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `case-${current.caseId}.xlsx`
    anchor.click()
    URL.revokeObjectURL(url)
  })
}
watch(
  () => [route.query.patient_id, route.query.case_id, route.query.patient_examination_id],
  load,
  { immediate: true }
)
</script>
