<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div class="card-header pb-0 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h4 class="mb-0">Hub-Export</h4>
          <p class="text-sm text-muted mb-0">
            Anonymisierte Ressourcen für den Export zum Hub markieren.
          </p>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <label class="form-label mb-0">Hub-Ziel</label>
          <select
            v-model="selectedTargetNodeKey"
            class="form-select form-select-sm hub-target-select"
            @change="refreshOverview"
            :disabled="hubExportStore.hubNodes.length !== 1"
            data-test="hub-export-target-select"
          >
            <option
              v-for="node in hubExportStore.hubNodes"
              :key="node.nodeKey"
              :value="node.nodeKey"
            >
              {{ node.displayName }} ({{ node.nodeKey }})
            </option>
          </select>
          <button
            class="btn btn-outline-primary btn-sm"
            :disabled="hubExportStore.loading"
            @click="refreshOverview"
            data-test="hub-export-refresh"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      <div class="card-body">
        <div v-if="hubExportStore.error" class="alert alert-danger" role="alert">
          <strong>Fehler:</strong> {{ hubExportStore.error }}
        </div>

        <div
          v-if="!hubExportStore.configReady"
          class="alert alert-warning"
          role="alert"
          data-test="hub-export-config-warning"
        >
          <strong>Konfiguration unvollständig.</strong>
          {{ hubExportStore.configError || 'Es wird ein aktiver Site-Node und genau ein aktiver Central-Hub-Node benötigt.' }}
        </div>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div class="text-sm text-muted">
            Source Node:
            <span class="fw-semibold">{{ hubExportStore.sourceNodeKey || 'nicht konfiguriert' }}</span>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button
              class="btn btn-outline-success btn-sm"
              :disabled="!selectedEligibleItems.length || !hubExportStore.configReady"
              @click="markSelected"
              data-test="hub-export-mark-selected"
            >
              Für Hub markieren
            </button>
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="!selectedMarkedItems.length || !hubExportStore.configReady"
              @click="unmarkSelected"
              data-test="hub-export-unmark-selected"
            >
              Markierung entfernen
            </button>
          </div>
        </div>

        <div v-if="!filteredItems.length && !hubExportStore.loading" class="text-center py-5">
          <h5 class="text-muted">Keine exportierbaren Ressourcen</h5>
          <p class="text-muted mb-0">
            Es sind aktuell keine anonymisierten Ressourcen für den Hub-Export verfügbar.
          </p>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="allSelectableChecked"
                    @change="toggleSelectAll"
                    data-test="hub-export-select-all"
                  />
                </th>
                <th>Datei</th>
                <th>Typ</th>
                <th>Anonymisierung</th>
                <th>Processed Media</th>
                <th>Zentrum</th>
                <th>Markiert</th>
                <th>Status</th>
                <th>Letzter Fehler</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="`${item.resourceKind}-${item.id}`">
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :disabled="!item.eligible"
                    :checked="selectedKeys.has(selectionKey(item))"
                    @change="toggleSelected(item)"
                    :data-test="`hub-export-select-${item.resourceKind}-${item.id}`"
                  />
                </td>
                <td>{{ item.filename }}</td>
                <td>
                  <span class="badge" :class="item.resourceKind === 'video' ? 'bg-info' : 'bg-secondary'">
                    {{ item.resourceKind.toUpperCase() }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="statusBadgeClass(item.anonymizationStatus)">
                    {{ statusLabel(item.anonymizationStatus) }}
                  </span>
                </td>
                <td>
                  <span :class="item.processedMediaPresent ? 'text-success' : 'text-danger'">
                    {{ item.processedMediaPresent ? 'Ja' : 'Nein' }}
                  </span>
                </td>
                <td>{{ item.sourceCenterKey || item.sourceCenterName || '-' }}</td>
                <td>
                  <span class="badge" :class="item.markedForUpload ? 'bg-success' : 'bg-light text-dark'">
                    {{ item.markedForUpload ? 'Ja' : 'Nein' }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="item.outboundStatus ? 'bg-primary' : 'bg-light text-dark'">
                    {{ item.outboundStatus || 'nicht markiert' }}
                  </span>
                </td>
                <td class="text-danger small">{{ item.lastError || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useHubExportStore, type HubExportItem } from '@/stores/hubExportStore'

const hubExportStore = useHubExportStore()
const selectedKeys = ref<Set<string>>(new Set())
const selectedTargetNodeKey = ref<string | null>(null)

const selectionKey = (item: HubExportItem) => `${item.resourceKind}:${item.id}`

const filteredItems = computed(() => hubExportStore.items.filter((item) => item.eligible || item.markedForUpload))
const selectableItems = computed(() => filteredItems.value.filter((item) => item.eligible))
const allSelectableChecked = computed(() =>
  selectableItems.value.length > 0 &&
  selectableItems.value.every((item) => selectedKeys.value.has(selectionKey(item)))
)

const selectedEligibleItems = computed(() =>
  filteredItems.value
    .filter((item) => selectedKeys.value.has(selectionKey(item)) && item.eligible && !item.markedForUpload)
    .map((item) => ({ id: item.id, resourceKind: item.resourceKind }))
)

const selectedMarkedItems = computed(() =>
  filteredItems.value
    .filter((item) => selectedKeys.value.has(selectionKey(item)) && item.markedForUpload)
    .map((item) => ({ id: item.id, resourceKind: item.resourceKind }))
)

const refreshOverview = async () => {
  const queryTarget = hubExportStore.hubNodes.length === 1 ? selectedTargetNodeKey.value : null
  const data = await hubExportStore.fetchOverview(queryTarget)
  selectedTargetNodeKey.value = data.selectedTargetNodeKey
}

const toggleSelected = (item: HubExportItem) => {
  const next = new Set(selectedKeys.value)
  const key = selectionKey(item)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  selectedKeys.value = next
}

const toggleSelectAll = () => {
  if (allSelectableChecked.value) {
    selectedKeys.value = new Set()
    return
  }
  selectedKeys.value = new Set(selectableItems.value.map((item) => selectionKey(item)))
}

const markSelected = async () => {
  await hubExportStore.markResources(selectedEligibleItems.value)
  selectedKeys.value = new Set()
}

const unmarkSelected = async () => {
  await hubExportStore.unmarkResources(selectedMarkedItems.value)
  selectedKeys.value = new Set()
}

const statusLabel = (status: string) => {
  const labels: Record<string, string> = {
    anonymized: 'Anonymisiert',
    done_processing_anonymization: 'Fertig',
    validated: 'Validiert',
    processing_anonymization: 'In Bearbeitung',
    extracting_frames: 'Frames',
    failed: 'Fehlgeschlagen',
    not_started: 'Nicht gestartet'
  }
  return labels[status] || status
}

const statusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    anonymized: 'bg-success',
    done_processing_anonymization: 'bg-success',
    validated: 'bg-success',
    processing_anonymization: 'bg-warning',
    extracting_frames: 'bg-info',
    failed: 'bg-danger',
    not_started: 'bg-secondary'
  }
  return classes[status] || 'bg-secondary'
}

watch(
  () => hubExportStore.selectedTargetNodeKey,
  (next) => {
    if (next) selectedTargetNodeKey.value = next
  }
)

onMounted(async () => {
  await refreshOverview()
})
</script>

<style scoped>
.hub-target-select {
  min-width: 16rem;
}
</style>
