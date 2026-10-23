<template>
  <section class="card my-3" aria-label="Frame-Herkunft reparieren" data-test="provenance-repair">
    <div class="card-body">
      <h5>Frame-Herkunft für Video {{ videoId }} reparieren</h5>
      <p>
        Die aktuelle Videodatei und ihre Prüfsumme werden geprüft. Eine nicht auflösbare
        Frame-Zuordnung wird ausdrücklich als ungeklärt gespeichert. Vorhandene Originalzeitstempel
        bleiben erhalten. Das Video kann nach den übrigen Freigabeprüfungen übertragen werden;
        eine Zuordnung zu elektrischen Messdaten ist damit nicht möglich.
        Segmente, Bilddaten und klinische Freigaben werden nicht geändert.
      </p>
      <p>Aufnahmebeginn und -ende nur eintragen, wenn sie aus der Aufnahme bekannt sind.</p>
      <label class="d-block mb-2">
        Aufnahmebeginn (Ortszeit dieses Browsers)
        <input v-model="startedAt" type="datetime-local" step="0.001" class="form-control" :disabled="busy" />
      </label>
      <label class="d-block mb-2">
        Aufnahmeende (Ortszeit dieses Browsers)
        <input v-model="endedAt" type="datetime-local" step="0.001" class="form-control" :disabled="busy" />
      </label>
      <p v-if="message" role="status">{{ message }}</p>
      <p v-if="error" role="alert" class="text-danger">{{ error }}</p>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-primary" :disabled="busy" @click="repair(true)">
          Reparatur prüfen
        </button>
        <button class="btn btn-warning" :disabled="busy || !previewReady" @click="repair(false)">
          Ungeklärte Frame-Zuordnung speichern
        </button>
        <button class="btn btn-outline-secondary" :disabled="busy" @click="emit('close')">
          Schließen
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import axios from 'axios'
import type { Camelize } from '@/types/api/openapi'
import type { operations } from '@/types/generated/endoreg-api'
import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance'

const props = defineProps<{ videoId: number }>()
const emit = defineEmits<{ close: []; repaired: []; beforeRequest: [] }>()
const busy = ref(false)
const previewReady = ref(false)
const message = ref('')
const error = ref('')
const startedAt = ref('')
const endedAt = ref('')
let generation = 0
watch([() => props.videoId, startedAt, endedAt], () => {
  generation += 1
  previewReady.value = false
  message.value = ''
  error.value = ''
})
onBeforeUnmount(() => { generation += 1 })

type RecoveryResponse = Camelize<
  operations['media_videos_provenance_recover_create']['responses'][200]['content']['application/json']
>

function recordingTime(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

function showResult(data: RecoveryResponse, videoId: number, dryRun: boolean): void {
  if (data.videoId !== videoId || (data.mappingStatus as unknown) !== 'unresolved' ||
      data.electricalMatchingEligible || data.status !== (dryRun ? 'preview' : 'recovered')) {
    throw new Error('Unexpected provenance repair response')
  }
  previewReady.value = dryRun
  const timestamps = data.originalTimestampsAvailable
    ? 'Originalzeitstempel sind vorhanden.'
    : 'Originalzeitstempel fehlen und wurden nicht geschätzt.'
  message.value = `${dryRun ? 'Reparatur möglich.' : 'Ungeklärte Frame-Zuordnung gespeichert.'} ${timestamps} Elektrische Datenzuordnung bleibt gesperrt. Die übrigen Transferprüfungen bleiben erforderlich.`
  if (!dryRun) emit('repaired')
}

const recoveryBlockerMessages: Readonly<Record<string, string>> = {
  active_media_operation: 'Aktiver Medienzugriff blockiert die Reparatur. Beenden Sie weitere Wiedergaben und warten Sie, bis Medienzugriffe abgeschlossen sind. Klicken Sie anschließend ausdrücklich auf „Reparatur prüfen“.',
  active_processing: 'Die Videoverarbeitung läuft oder wartet noch. Warten Sie auf ihren Abschluss und prüfen Sie ihren Status, bevor Sie erneut „Reparatur prüfen“ wählen.'
}

function showFailure(caught: unknown): void {
  const response = axios.isAxiosError<{ error?: string; code?: string }>(caught) ? caught.response : undefined
  const detail = typeof response?.data.error === 'string' ? response.data.error : ''
  const guidance = response?.status === 409 ? recoveryBlockerMessages[response.data.code ?? ''] : undefined
  error.value = guidance ? `${guidance} ${detail}` : detail || 'Die Frame-Herkunft konnte nicht repariert werden. Bitte Ursache prüfen.'
}

async function repair(dryRun: boolean): Promise<void> {
  if (busy.value || (!dryRun && !previewReady.value)) return
  const videoId = props.videoId
  const requestGeneration = generation
  busy.value = true
  previewReady.value = false
  message.value = ''
  error.value = ''
  try {
    emit('beforeRequest')
    const { data } = await axiosInstance.post<RecoveryResponse>(
      r(`media/videos/${String(videoId)}/provenance/recover/`),
      {
        acknowledge_unresolved: true,
        dry_run: dryRun,
        recording_started_at: recordingTime(startedAt.value),
        recording_ended_at: recordingTime(endedAt.value)
      },
      silentRequestConfig()
    )
    if (requestGeneration !== generation) return
    showResult(data, videoId, dryRun)
  } catch (caught: unknown) {
    if (requestGeneration !== generation) return
    showFailure(caught)
  } finally {
    busy.value = false
  }
}
</script>
