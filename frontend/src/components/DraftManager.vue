<template>
  <div class="draft-manager">
    <div class="draft-header">
      <h3>Entwürfe</h3>
      <span v-if="drafts.length > 0" class="draft-count-badge">{{ drafts.length }}</span>
    </div>

    <div v-if="drafts.length > 0" class="draft-controls">
      <input 
        v-model="searchTerm"
        type="text" 
        placeholder="Entwürfe durchsuchen..."
        class="search-input"
      />
      
      <div class="action-buttons">
        <button @click="saveAllDrafts" class="save-all-btn">
          Alle speichern
        </button>
        <button @click="clearAllDrafts" class="clear-all-btn">
          Alle löschen
        </button>
      </div>
    </div>

    <div v-if="filteredDrafts.length === 0 && drafts.length === 0" class="empty-state">
      <p>Keine Entwürfe vorhanden</p>
    </div>

    <div v-else-if="filteredDrafts.length === 0" class="empty-search">
      <p>Keine Entwürfe gefunden für "{{ searchTerm }}"</p>
    </div>

    <div class="draft-list">
      <div 
        v-for="draft in filteredDrafts" 
        :key="draft.id"
        class="draft-item"
      >
        <div class="draft-content">
          <div class="draft-text">{{ draft.note || draft.label }}</div>
          <div class="draft-meta">
            <span class="draft-time">
              {{ formatTime(draft.start) }} - {{ formatTime(draft.end) }}
            </span>
            <span class="draft-category">{{ draft.label }}</span>
          </div>
        </div>
        
        <div class="draft-actions">
          <button @click="saveDraft(draft)" class="save-draft-btn">
            Speichern
          </button>
          <button @click="deleteDraft(draft.id)" class="delete-draft-btn">
            Löschen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDraftStore } from '@/stores/draft';
import type { AnnotationDraft } from '@/types/annotation';

interface Props {
  videoId: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'save-draft': [draft: AnnotationDraft];
  'delete-draft': [draftId: string | number];
  'save-all-drafts': [drafts: AnnotationDraft[]];
  'clear-all-drafts': [];
}>();

const draftStore = useDraftStore();
const searchTerm = ref('');

// Get drafts for current video
const drafts = computed(() => draftStore.getDraftsForVideo(props.videoId));

// Filter drafts based on search term
const filteredDrafts = computed(() => {
  if (!searchTerm.value) return drafts.value;
  
  const term = searchTerm.value.toLowerCase();
  return drafts.value.filter(draft => 
    (draft.note && draft.note.toLowerCase().includes(term)) ||
    draft.label.toLowerCase().includes(term)
  );
});

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function saveDraft(draft: AnnotationDraft) {
  emit('save-draft', draft);
}

function deleteDraft(draftId: string | number) {
  emit('delete-draft', draftId);
  draftStore.removeDraft(props.videoId, draftId);
}

function saveAllDrafts() {
  emit('save-all-drafts', drafts.value);
}

function clearAllDrafts() {
  emit('clear-all-drafts');
  draftStore.clearDraftsForVideo(props.videoId);
}
</script>

<style scoped>
.draft-manager {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.draft-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.draft-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.draft-count-badge {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.draft-controls {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.save-all-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.clear-all-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.empty-state,
.empty-search {
  text-align: center;
  padding: 32px;
  color: #666;
  font-style: italic;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.draft-content {
  flex: 1;
}

.draft-text {
  font-weight: 500;
  margin-bottom: 4px;
  color: #333;
}

.draft-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.draft-time {
  font-family: monospace;
}

.draft-category {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
}

.draft-actions {
  display: flex;
  gap: 8px;
}

.save-draft-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.delete-draft-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.save-draft-btn:hover {
  background: #218838;
}

.delete-draft-btn:hover {
  background: #c82333;
}

.save-all-btn:hover {
  background: #218838;
}

.clear-all-btn:hover {
  background: #c82333;
}
</style>