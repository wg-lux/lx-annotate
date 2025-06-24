<template>
  <div 
    class="draft-indicator" 
    :class="{ 'has-drafts': totalDrafts > 0 }"
    :title="tooltipText"
  >
    <div class="draft-content">
      <span class="draft-icon">📝</span>
      <span class="draft-count">{{ totalDrafts }}</span>
      
      <div v-if="hasUnsavedChanges" class="unsaved-indicator">
        <span class="unsaved-dot"></span>
        <span class="unsaved-text">Ungespeichert</span>
      </div>
    </div>

    <button 
      v-if="totalDrafts > 0" 
      @click="clearAll"
      class="clear-drafts-btn"
      title="Alle Entwürfe löschen"
    >
      ✕
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDraftStore } from '@/stores/draft';
import type { AnnotationDraft } from '@/types/annotation';

const emit = defineEmits<{
  'clear-all': [];
}>();

const draftStore = useDraftStore();

// Calculate total drafts across all videos
const totalDrafts = computed(() => {
  return Object.values(draftStore.draftAnnotations).reduce((total, annotations: AnnotationDraft[]) => {
    return total + annotations.length;
  }, 0);
});

const hasUnsavedChanges = computed(() => draftStore.hasUnsavedChanges);

const tooltipText = computed(() => {
  if (totalDrafts.value === 0) {
    return 'Keine ungespeicherten Annotationen';
  } else if (totalDrafts.value === 1) {
    return '1 ungespeicherte Annotation';
  } else {
    return `${totalDrafts.value} ungespeicherte Annotationen`;
  }
});

function clearAll() {
  emit('clear-all');
  draftStore.clearAllDrafts();
}
</script>

<style scoped>
.draft-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
  cursor: default;
  font-size: 14px;
}

.draft-indicator.has-drafts {
  background: #fff3cd;
  border-color: #ffc107;
  animation: subtle-pulse 2s ease-in-out infinite;
}

@keyframes subtle-pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.02);
    opacity: 0.9;
  }
}

.draft-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.draft-icon {
  font-size: 16px;
  opacity: 0.7;
}

.draft-count {
  font-weight: bold;
  color: #495057;
  min-width: 20px;
  text-align: center;
}

.has-drafts .draft-count {
  color: #856404;
}

.unsaved-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.unsaved-dot {
  width: 6px;
  height: 6px;
  background: #dc3545;
  border-radius: 50%;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

.unsaved-text {
  font-size: 11px;
  color: #dc3545;
  font-weight: 500;
}

.clear-drafts-btn {
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
  transition: all 0.2s ease;
  line-height: 1;
}

.clear-drafts-btn:hover {
  background: #dc3545;
  color: white;
}

.draft-indicator:not(.has-drafts) .draft-icon,
.draft-indicator:not(.has-drafts) .draft-count {
  opacity: 0.5;
}
</style>