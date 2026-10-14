<template>
  <section
    class="card mb-3"
    aria-label="Videozustand reparieren"
    data-test="video-backfill-repair"
  >
    <div class="card-body">
      <h5>Video {{ videoId }} reparieren</h5>
      <p>
        Prüfen Sie den gespeicherten Zustand oder setzen Sie das Video auf den Importanfang zurück,
        um fehlende Metadaten und Verarbeitungsnachweise nachzuholen. Dateien, Annotationen und
        bisherige Nachweise bleiben erhalten. Anonymisierung und Export müssen erneut geprüft
        werden.
      </p>
      <p
        v-if="message"
        role="status"
      >
        {{ message }}
      </p>
      <p
        v-if="error"
        class="text-danger"
        role="alert"
      >
        {{ error }}
      </p>
      <div class="d-flex gap-2 flex-wrap">
        <button
          class="btn btn-outline-primary"
          :disabled="busy"
          @click="emit('repair')"
        >
          Bisherige Zustandsprüfung
        </button>
        <button
          class="btn btn-outline-warning"
          :disabled="busy"
          @click="reset(true)"
        >
          Zurücksetzen prüfen
        </button>
        <button
          class="btn btn-warning"
          :disabled="busy || !previewReady"
          @click="reset(false)"
        >
          Auf Import zurücksetzen
        </button>
        <button
          class="btn btn-outline-secondary"
          :disabled="busy"
          @click="emit('close')"
        >
          Schließen
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAnonymizationStore } from '@/stores/anonymizationStore'

const props = defineProps<{ videoId: number }>()
const emit = defineEmits<{ close: []; repair: [] }>()
const store = useAnonymizationStore()
const busy = ref(false)
const previewReady = ref(false)
const message = ref('')
const error = ref('')
const blockers: Record<string, string> = {
  source_media:
    'Die erhaltene Rohdatei fehlt. Die Originalquelle muss zuerst wiederhergestellt werden.',
  integrity_failure: 'Ein Integritätsfehler muss zuerst durch die Administration geklärt werden.',
  active_transcode: 'Eine Medienverarbeitung ist aktiv.',
  active_media_operation: 'Wiedergabe oder Medienverarbeitung ist aktiv.',
  active_processing: 'Ein Verarbeitungsauftrag ist noch aktiv.',
  registered_or_active_transfer:
    'Ein aktiver oder bereits registrierter Hub-Transfer muss zuerst geklärt werden.',
  state: 'Der Grundzustand fehlt. Führen Sie zuerst die bisherige Zustandsprüfung aus.'
}

async function reset(dryRun: boolean): Promise<void> {
  busy.value = true
  previewReady.value = false
  error.value = ''
  message.value = ''
  try {
    const result = await store.resetVideoForBackfill(props.videoId, dryRun)
    const item = result.items.at(0)
    if (result.items.length !== 1 || !item || item.videoId !== props.videoId) {
      throw new Error('Unexpected repair response')
    }
    if (item.status === 'blocked') {
      error.value = item.missing
        .map((reason) => blockers[reason] || 'Zurücksetzen ist blockiert.')
        .join(' ')
      return
    }
    previewReady.value = dryRun
    message.value = dryRun
      ? 'Zurücksetzen ist möglich. Bestehende Freigaben werden aufgehoben; es startet noch keine Verarbeitung.'
      : 'Auf Import zurückgesetzt. Starten Sie die Verarbeitung anschließend über „Starten“ in der Übersicht. Der Reset allein erzeugt noch keine neuen Nachweise.'
  } catch {
    error.value = 'Der Zustand konnte nicht zurückgesetzt werden. Bitte erneut prüfen.'
  } finally {
    busy.value = false
  }
}
</script>
