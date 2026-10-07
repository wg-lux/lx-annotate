<template>
  <section
    class="border rounded p-3 mt-3"
    aria-label="Direkte Downloads"
  >
    <h6>Direkt herunterladen</h6>
    <p class="text-muted">
      Die CSV enthält Annotationen mit Frame-Nummern, Präsentationszeitstempeln (PTS) und Zeitbasis.
    </p>
    <div class="d-flex flex-wrap gap-2">
      <a
        class="btn btn-outline-primary"
        :href="video_url"
        download
        data-test="download-video"
        >Anonymisiertes Video herunterladen</a
      >
      <button
        class="btn btn-primary"
        type="button"
        :disabled="busy"
        data-test="download-annotations"
        @click="download_csv('annotations')"
      >
        {{ busy ? 'CSV wird erstellt …' : 'Annotationen als CSV herunterladen' }}
      </button>
    </div>
    <div class="d-flex flex-wrap align-items-center gap-2 mt-3">
      <label for="download-timeline">Frame-Zeitstempel</label>
      <select
        id="download-timeline"
        v-model="timeline"
        class="form-select w-auto"
        :disabled="busy"
      >
        <option value="processed">Anonymisiertes Video</option>
        <option value="original">Original vor dem Import</option>
      </select>
      <button
        class="btn btn-outline-primary"
        type="button"
        :disabled="busy"
        data-test="download-timestamps"
        @click="download_csv('timestamps')"
      >
        Zeitstempel als CSV herunterladen
      </button>
    </div>
    <p class="text-muted mt-2 mb-0">
      Zeitstempel werden als eigene Tabelle mit Frameindizes ab 0 ausgegeben. Original-Frames können
      von den annotierten Frames abweichen. Nicht gespeicherte historische Werte sind nicht
      verfügbar.
    </p>
    <p
      v-if="error_message"
      class="alert alert-danger mt-2 mb-0"
      role="alert"
    >
      {{ error_message }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import axiosInstance, { r } from '@/api/axiosInstance'
import { saveDownload } from '@/utils/saveDownload'

const props = defineProps<{ video: number; marked: boolean }>()
const busy = ref(false)
const error_message = ref('')
const timeline = ref<'processed' | 'original'>('processed')
const video_url = computed(() => r(`media/videos/${String(props.video)}/download/`))

watch(
  () => props.video,
  () => {
    error_message.value = ''
  }
)

async function download_csv(kind: 'annotations' | 'timestamps'): Promise<void> {
  const video_id = props.video
  const selected_timeline = timeline.value
  busy.value = true
  error_message.value = ''
  try {
    const response = await axiosInstance.get<Blob>(
      r(`media/videos/${String(video_id)}/${kind}.csv`),
      {
        params:
          kind === 'annotations'
            ? { use_export_flags: props.marked }
            : { timeline: selected_timeline },
        responseType: 'blob',
        headers: { Accept: 'application/json' }
      }
    )
    const suffix = kind === 'annotations' ? 'annotationen' : `${selected_timeline}_pts`
    saveDownload(response.data, `video_${String(video_id)}_${suffix}.csv`)
  } catch (error: unknown) {
    if (props.video !== video_id) return
    error_message.value = await download_error(error)
  } finally {
    busy.value = false
  }
}
async function download_error(error: unknown): Promise<string> {
  const message = 'CSV-Download fehlgeschlagen. Bitte Freigabe und verfügbare Zeitstempel prüfen.'
  if (!axios.isAxiosError<Blob>(error) || !(error.response?.data instanceof Blob)) return message
  try {
    const payload: unknown = JSON.parse(await error.response.data.text())
    if (
      payload &&
      typeof payload === 'object' &&
      'error' in payload &&
      typeof payload.error === 'string'
    ) {
      return payload.error
    }
  } catch {
    return message
  }
  return message
}
</script>
