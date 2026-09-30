<template>
  <form
    class="reporting-setting-field"
    @submit.prevent="download"
  >
    <label
      class="form-label form-label-sm mb-1"
      for="terminology-package-url"
      >Öffentlicher Paketlink</label
    >
    <input
      id="terminology-package-url"
      v-model="url"
      type="url"
      class="form-control"
      required
      :disabled="busy || disabled"
    />
    <button
      class="btn btn-outline-secondary"
      type="submit"
      :disabled="busy || disabled"
    >
      {{ busy ? 'Paket wird heruntergeladen…' : 'Paket herunterladen und importieren' }}
    </button>
    <p
      v-if="error"
      role="alert"
      class="text-danger"
    >
      {{ error }}
    </p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { downloadTerminologyPackage } from '@/api/terminologyPackageHost'

defineProps<{ disabled?: boolean }>()
const emit = defineEmits<{ downloaded: [file: File] }>()
const url = ref('')
const busy = ref(false)
const error = ref('')

async function download() {
  busy.value = true
  error.value = ''
  try {
    emit('downloaded', await downloadTerminologyPackage(url.value.trim()))
  } catch (caught: unknown) {
    error.value = caught instanceof Error ? caught.message : 'Paketdownload fehlgeschlagen.'
  } finally {
    busy.value = false
  }
}
</script>
