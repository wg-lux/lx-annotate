<template>
  <section class="storage-summary mb-3" aria-label="Speicherplatz">
    <div class="d-flex justify-content-between align-items-center gap-2">
      <h5 class="mb-0">Speicherplatz</h5>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary mb-0"
        :disabled="loading"
        @click="refresh"
      >
        Speicher aktualisieren
      </button>
    </div>
    <p class="small text-muted mt-2 mb-2">
      Dateisystem des geschützten Medienspeichers, einschließlich anderer Dateien auf diesem
      Dateisystem. Unabhängig von den Tabellenfiltern.
    </p>
    <p v-if="loading" class="mb-0" role="status">Speicherplatz wird abgefragt…</p>
    <p v-else-if="error" class="mb-0 text-warning" role="status">{{ error }}</p>
    <template v-else-if="capacity">
      <div class="d-flex flex-wrap gap-3 mb-2" data-test="storage-capacity">
        <span>Gesamt: <strong>{{ formatBytes(capacity.totalBytes) }}</strong></span>
        <span>Belegt: <strong>{{ formatBytes(capacity.usedBytes) }}</strong></span>
        <span>Verfügbar: <strong>{{ formatBytes(capacity.availableBytes) }}</strong></span>
        <span>Systemreserviert: <strong>{{ formatBytes(capacity.reservedBytes) }}</strong></span>
      </div>
      <progress
        class="storage-capacity-bar"
        :value="capacity.usedBytes + capacity.reservedBytes"
        :max="capacity.totalBytes"
        aria-label="Belegter und systemreservierter Speicherplatz"
      />
      <p class="small text-muted mb-0">
        Stand: <time :datetime="capacity.observedAt">{{ formatDate(capacity.observedAt) }}</time>
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import {
  fetchAnonymizationStorage,
  type AnonymizationStorageCapacity
} from '@/api/anonymizationOperations'
import { formatDate } from './overviewPresentation'

const capacity = ref<AnonymizationStorageCapacity | null>(null)
const loading = ref(false)
const error = ref('')
let controller: AbortController | null = null
let disposed = false
const isDisposed = () => disposed

function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const exponent = bytes > 0 ? Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1) : 0
  return `${(bytes / 1024 ** exponent).toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${units[exponent]}`
}

async function refresh(): Promise<void> {
  if (loading.value || isDisposed()) return
  controller = new AbortController()
  loading.value = true
  error.value = ''
  capacity.value = null
  try {
    const response = await fetchAnonymizationStorage(controller.signal)
    if (!isDisposed()) capacity.value = response
  } catch (failure: unknown) {
    if (isDisposed()) return
    error.value = isAxiosError(failure) && failure.response?.status === 403
      ? 'Für die Speicheranzeige ist eine Berechtigung zur Speicherüberwachung erforderlich.'
      : 'Speicherplatz konnte nicht abgefragt werden. Bitte erneut aktualisieren.'
  } finally {
    if (!isDisposed()) loading.value = false
    controller = null
  }
}

onMounted(refresh)
onUnmounted(() => {
  disposed = true
  controller?.abort()
})
</script>

<style scoped>
.storage-summary {
  border: 1px solid var(--lx-border, #dee2e6);
  border-radius: var(--lx-corner-radius);
  padding: 1rem;
}

.storage-capacity-bar {
  width: 100%;
  height: 1rem;
  accent-color: var(--bs-primary, #5e72e4);
}
</style>
