<script setup lang="ts">
defineProps<{
  basePrincipal: string
  activeLabel: string
  canApply: boolean
  overrideActive: boolean
}>()
const principalInput = defineModel<string>('principalInput', { required: true })
const emit = defineEmits<{
  restart: []
  revert: []
}>()
</script>

<template>
  <div class="annotation-scope-panel mt-2">
    <label
      for="video-annotator-override"
      class="form-label mb-1"
      >Annotator-Scope</label
    >
    <div class="d-flex flex-wrap gap-2">
      <input
        id="video-annotator-override"
        v-model.trim="principalInput"
        type="text"
        class="form-control form-control-sm annotator-override-input"
        data-test="video-annotator-override-input"
        :placeholder="basePrincipal"
      />
      <button
        type="button"
        class="btn btn-outline-primary btn-sm mb-0"
        :disabled="!canApply"
        data-test="video-annotator-override-apply"
        @click="emit('restart')"
      >
        Annotation als anderer Nutzer neu starten
      </button>
      <button
        v-if="overrideActive"
        type="button"
        class="btn btn-outline-secondary btn-sm mb-0"
        data-test="video-annotator-override-revert"
        @click="emit('revert')"
      >
        Zurück zu meinem Nutzer
      </button>
    </div>
    <small class="text-muted d-block mt-1">Aktiver Annotator: {{ activeLabel }}</small>
  </div>
</template>

<style scoped>
.annotator-override-input {
  max-width: 320px;
}
</style>
