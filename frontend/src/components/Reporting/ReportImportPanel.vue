<template>
  <div class="report-import-panel">
    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      accept=".pdf,application/pdf"
      data-test="report-import-input"
      @change="onFileSelected"
    />
    <button
      class="btn btn-outline-primary"
      type="button"
      :disabled="isBusy"
      data-test="report-import-button"
      @click="fileInput?.click()"
    >
      <span
        v-if="isBusy"
        class="spinner-border spinner-border-sm me-1"
        role="status"
        aria-hidden="true"
      ></span>
      <i v-else class="ni ni-cloud-upload-96 me-1" aria-hidden="true"></i>
      {{ isBusy ? 'Bericht wird importiert…' : 'PDF-Bericht importieren' }}
    </button>

    <div
      v-if="selectedFileName || statusMessage"
      class="small mt-1 report-import-status"
      aria-live="polite"
      data-test="report-import-status"
    >
      <span v-if="selectedFileName" class="text-muted">{{ selectedFileName }} · </span>
      <span :class="errorMessage ? 'text-danger' : 'text-muted'">{{ statusMessage }}</span>
    </div>

    <div
      v-if="completedReportId"
      class="alert alert-success py-2 px-3 mt-2 mb-0 small"
      data-test="report-import-completed"
    >
      <div>Import abgeschlossen. Die Anonymisierung wurde noch nicht manuell validiert.</div>
      <RouterLink class="alert-link" :to="validationTarget" data-test="report-validation-link">
        Anonymisierung jetzt validieren
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  pollUploadStatus,
  resolveUploadedReportId,
  uploadFiles,
  type UploadStatus,
  type UploadStatusResponse
} from '@/api/upload'

const props = withDefaults(
  defineProps<{
    centerKey?: string
    sourceSystem?: string
    pollIntervalMs?: number
    maxAttempts?: number
  }>(),
  {
    centerKey: undefined,
    sourceSystem: 'lx-annotate-reporting',
    pollIntervalMs: 5000,
    maxAttempts: 30
  }
)

const emit = defineEmits<{
  completed: [reportId: number, status: UploadStatusResponse]
}>()

type ImportUiStatus = 'idle' | 'uploading' | UploadStatus

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('')
const importStatus = ref<ImportUiStatus>('idle')
const errorMessage = ref('')
const completedReportId = ref<number | null>(null)
let activeController: AbortController | null = null

const isBusy = computed(() => ['uploading', 'pending', 'processing'].includes(importStatus.value))

const statusMessage = computed(() => {
  if (errorMessage.value) return errorMessage.value
  switch (importStatus.value) {
    case 'uploading':
      return 'Upload läuft.'
    case 'pending':
      return 'Import wartet auf einen Worker.'
    case 'processing':
      return 'Bericht wird importiert und anonymisiert.'
    case 'anonymized':
      return 'Import und automatische Anonymisierung abgeschlossen.'
    case 'error':
      return 'Import fehlgeschlagen.'
    case 'lost':
      return 'Importauftrag wurde verloren.'
    default:
      return ''
  }
})

const validationTarget = computed(() =>
  completedReportId.value
    ? `/anonymisierung/validierung?fileId=${completedReportId.value}&mediaType=pdf`
    : '/anonymisierung/validierung'
)

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function readableError(error: unknown): string {
  if (error && typeof error === 'object') {
    const candidate = error as {
      name?: string
      message?: string
      response?: { data?: { errorDetail?: string; detail?: string; error?: string } }
    }
    return (
      candidate.response?.data?.errorDetail ||
      candidate.response?.data?.detail ||
      candidate.response?.data?.error ||
      candidate.message ||
      'Berichtimport fehlgeschlagen.'
    )
  }
  return 'Berichtimport fehlgeschlagen.'
}

function isTerminalFailureStatus(status: ImportUiStatus): boolean {
  return status === 'error' || status === 'lost'
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''

  errorMessage.value = ''
  completedReportId.value = null
  if (files.length !== 1) {
    selectedFileName.value = ''
    importStatus.value = 'error'
    errorMessage.value = 'Bitte genau eine PDF-Datei auswählen.'
    return
  }

  const file = files[0]
  selectedFileName.value = file.name
  if (!isPdf(file)) {
    importStatus.value = 'error'
    errorMessage.value = 'Nur PDF-Berichte können importiert werden.'
    return
  }

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  importStatus.value = 'uploading'

  try {
    const upload = await uploadFiles([file], {
      centerKey: props.centerKey,
      sourceSystem: props.sourceSystem
    })
    const completed = await pollUploadStatus(upload.statusUrl, {
      signal: controller.signal,
      pollIntervalMs: props.pollIntervalMs,
      maxAttempts: props.maxAttempts,
      onProgress: (status) => {
        importStatus.value = status.status
      }
    })
    const reportId = resolveUploadedReportId(completed)
    if (!reportId) {
      throw new Error(
        'Der Import wurde abgeschlossen, aber es wurde keine stabile Report-ID geliefert.'
      )
    }

    importStatus.value = 'anonymized'
    completedReportId.value = reportId
    emit('completed', reportId, completed)
  } catch (error) {
    if (controller.signal.aborted) return
    const candidate = error as { message?: string }
    if (!isTerminalFailureStatus(importStatus.value)) {
      importStatus.value = 'error'
    }
    errorMessage.value = readableError(candidate)
  } finally {
    if (activeController === controller) activeController = null
  }
}

onBeforeUnmount(() => {
  activeController?.abort()
  activeController = null
})
</script>

<style scoped>
.report-import-panel {
  min-width: min(100%, 16rem);
}

.report-import-status {
  max-width: 24rem;
}
</style>
