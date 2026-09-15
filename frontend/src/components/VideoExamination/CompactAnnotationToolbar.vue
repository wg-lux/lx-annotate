<template>
  <div
    class="compact-annotation-toolbar"
    aria-label="Label-Markierung"
  >
    <div class="compact-label-selector">
      <button
        ref="selector"
        type="button"
        role="combobox"
        aria-label="Label auswählen"
        aria-controls="compact-label-options"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-activedescendant="
          open && selectedLabel ? `compact-label-${selectedLabel}` : undefined
        "
        @click="emit('toggle')"
      >
        {{ selectedLabel ? getTranslationForLabel(selectedLabel) : 'Label auswählen' }} ▾
      </button>
      <div
        v-if="open"
        id="compact-label-options"
        role="listbox"
        aria-label="Labels"
        class="compact-label-options"
      >
        <div
          v-for="label in labels"
          :id="`compact-label-${label.name}`"
          :key="label.id"
          role="option"
          :aria-selected="label.name === selectedLabel"
          @mousedown.prevent
          @click="chooseLabel(label.name)"
        >
          {{ getTranslationForLabel(label.name) }}
        </div>
      </div>
    </div>
    <button
      type="button"
      class="compact-mark-button"
      :disabled="disabled"
      :aria-label="
        marking
          ? `Label-Ende setzen (-): ${getTranslationForLabel(draftLabel)}`
          : 'Label-Start setzen (+)'
      "
      @click="emit('mark')"
    >
      {{ marking ? 'Label-Ende setzen (-)' : 'Label-Start setzen (+)' }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { getTranslationForLabel } from '@/utils/videoUtils'
const props = defineProps<{
  labels: readonly { id: number; name: string }[]
  selectedLabel: string
  draftLabel: string
  open: boolean
  marking: boolean
  disabled: boolean
}>()
const emit = defineEmits<{ toggle: []; select: [name: string]; mark: [] }>()
const selector = ref<HTMLButtonElement | null>(null)
const focusSelector = (): void => {
  selector.value?.focus()
}
watch(
  () => [props.open, props.selectedLabel],
  async () => {
    await nextTick()
    const option: Partial<HTMLElement> | null = document.getElementById(
      `compact-label-${props.selectedLabel}`
    )
    if (props.open) option?.scrollIntoView?.({ block: 'nearest' })
  }
)
const chooseLabel = (name: string): void => {
  emit('select', name)
  focusSelector()
}
defineExpose({ focusSelector })
</script>
<style scoped>
.compact-annotation-toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 64px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  pointer-events: none;
}
.compact-label-selector {
  position: relative;
  width: min(280px, 45%);
}
button,
.compact-label-options {
  pointer-events: auto;
  background: #fff;
  color: #212529;
  border: 1px solid #adb5bd;
  border-radius: 6px;
  font-size: 14px;
}
button {
  min-height: 44px;
  padding: 8px 12px;
}
.compact-label-selector > button {
  width: 100%;
  text-align: left;
}
button:focus-visible {
  outline: 3px solid #4dabf7;
  outline-offset: 2px;
}
button:disabled {
  opacity: 0.65;
}
.compact-label-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  max-height: calc(100dvh - 160px);
  overflow: auto;
  overscroll-behavior: contain;
}
[role='option'] {
  padding: 10px 12px;
  min-height: 44px;
  cursor: pointer;
  overflow-wrap: anywhere;
}
[aria-selected='true'] {
  background: #dbeafe;
}
</style>
