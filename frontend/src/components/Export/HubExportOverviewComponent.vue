<template>
  <div class="container-fluid py-4">
    <div class="card">
      <div
        class="card-header pb-0 d-flex justify-content-between align-items-center flex-wrap gap-3"
      >
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
          {{
            hubExportStore.configError ||
            'Es wird ein aktiver Site-Node und genau ein aktiver Central-Hub-Node benötigt.'
          }}
        </div>

        <section class="mb-4" aria-labelledby="hub-sync-overview-title">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5 id="hub-sync-overview-title" class="mb-1">Dateisynchronisation</h5>
              <p class="text-sm text-muted mb-0">
                Lokaler Bestand verarbeiteter Dateien und bekannte Transfersituationen.
              </p>
            </div>
            <span class="badge bg-light text-dark" data-test="hub-sync-node-count">
              {{ hubExportStore.hubNodes.length }} aktive Hub-Ziele
            </span>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-sync-center-count">
                <span class="sync-metric-value">{{ syncCenters.length }}</span>
                <span class="sync-metric-label">Zentren im Bestand</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-sync-processed-count">
                <span class="sync-metric-value">{{ syncSummary?.processedFileCount ?? 0 }}</span>
                <span class="sync-metric-label">Processed Files</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-sync-rejection-count">
                <span class="sync-metric-value text-danger">{{ syncRejections.length }}</span>
                <span class="sync-metric-label">Ablehnungen</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-sync-duplicate-count">
                <span class="sync-metric-value text-primary">{{ syncDuplicates.length }}</span>
                <span class="sync-metric-label">Bereits registriert</span>
              </div>
            </div>
          </div>

          <div class="table-responsive sync-center-table mb-3">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Zentrum</th>
                  <th>Aktive Knoten</th>
                  <th>Processed Files</th>
                  <th>Transferkandidaten</th>
                  <th>Ablehnungen</th>
                  <th>Registrierte Transfers</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="center in syncCenters"
                  :key="center.centerKey"
                  :data-test="`hub-sync-center-${center.centerKey}`"
                >
                  <td>
                    <span class="fw-semibold">{{ center.displayName }}</span>
                    <span class="d-block text-xs text-muted">
                      {{ center.centerKey }}
                    </span>
                  </td>
                  <td>{{ center.activeNodeKeys.join(', ') || '-' }}</td>
                  <td>{{ center.processedFiles.length }}</td>
                  <td>{{ center.candidateCount }}</td>
                  <td :class="center.rejectionCount ? 'text-danger fw-semibold' : ''">
                    {{ center.rejectionCount }}
                  </td>
                  <td>{{ center.duplicateCount }}</td>
                </tr>
                <tr v-if="!syncCenters.length">
                  <td colspan="6" class="text-center text-muted py-3">
                    Keine Zentren im System registriert.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="row g-3">
            <div class="col-lg-6">
              <div class="sync-situation h-100" data-test="hub-sync-rejections">
                <h6>Ablehnungskriterien</h6>
                <ul v-if="syncRejections.length" class="list-unstyled mb-0">
                  <li
                    v-for="item in syncRejections"
                    :key="`rejected-${item.resourceKind}-${item.resourceId}`"
                    class="sync-situation-item"
                  >
                    <span class="fw-semibold">{{ item.filename }}</span>
                    <span class="d-block text-sm text-danger">{{ item.detail }}</span>
                  </li>
                </ul>
                <p v-else class="text-sm text-muted mb-0">Keine Ablehnungen gemeldet.</p>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="sync-situation h-100" data-test="hub-sync-duplicates">
                <h6>Bereits registrierte Transfers / Duplikate</h6>
                <ul v-if="syncDuplicates.length" class="list-unstyled mb-0">
                  <li
                    v-for="item in syncDuplicates"
                    :key="item.transferKey"
                    class="sync-situation-item"
                  >
                    <span class="fw-semibold">{{ item.filename }}</span>
                    <span class="d-block text-sm text-muted">
                      {{ item.transferStatus || 'Transfer registriert' }} ·
                      {{ item.targetNodeKey }}
                    </span>
                  </li>
                </ul>
                <p v-else class="text-sm text-muted mb-0">
                  Keine bereits registrierten Transfers gemeldet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div class="text-sm text-muted">
            Source Node:
            <span class="fw-semibold">{{
              hubExportStore.sourceNodeKey || 'nicht konfiguriert'
            }}</span>
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

        <div
          v-if="privacySummary"
          class="privacy-summary d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3"
          data-test="hub-export-privacy-summary"
        >
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="text-sm fw-semibold">K-Anonymität k={{ privacySummary.minK }}</span>
            <span
              class="badge"
              :class="privacyBadgeClass(privacySummary.status)"
              data-test="hub-export-privacy-badge"
            >
              {{ privacyStatusLabel(privacySummary.status) }}
            </span>
          </div>
          <div class="d-flex align-items-center gap-3 flex-wrap text-sm text-muted">
            <span>
              Fälle:
              <span class="fw-semibold text-dark">{{ privacySummary.eligibleCaseCount }}</span>
            </span>
            <span>
              kleinste Gruppe:
              <span class="fw-semibold text-dark" data-test="hub-export-privacy-smallest-class">
                {{ privacyMetricValue(privacySummary.smallestEquivalenceClassSize) }}
              </span>
            </span>
            <span>
              verletzte Gruppen:
              <span class="fw-semibold text-dark" data-test="hub-export-privacy-violating-classes">
                {{ privacySummary.violatingEquivalenceClassCount }}
              </span>
            </span>
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
                <th>Hinweis</th>
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
                  <span
                    class="badge"
                    :class="item.resourceKind === 'video' ? 'bg-info' : 'bg-secondary'"
                  >
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
                  <span
                    class="badge"
                    :class="item.markedForUpload ? 'bg-success' : 'bg-light text-dark'"
                  >
                    {{ item.markedForUpload ? 'Ja' : 'Nein' }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="item.outboundStatus ? 'bg-primary' : 'bg-light text-dark'"
                  >
                    {{ item.outboundStatus || 'nicht markiert' }}
                  </span>
                </td>
                <td class="small" :class="itemNotice(item) === '-' ? 'text-muted' : 'text-danger'">
                  {{ itemNotice(item) }}
                </td>
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
import {
  useHubExportStore,
  type HubExportItem,
  type HubExportPrivacyStatus
} from '@/stores/hubExportStore'

const hubExportStore = useHubExportStore()
const selectedKeys = ref<Set<string>>(new Set())
const selectedTargetNodeKey = ref<string | null>(null)

const selectionKey = (item: HubExportItem) => `${item.resourceKind}:${item.id}`

const itemNotice = (item: HubExportItem) => item.lastError || item.blockedReason || '-'

const filteredItems = computed(() => hubExportStore.items)
const syncSummary = computed(() => hubExportStore.syncSummary)
const syncCenters = computed(() => syncSummary.value?.centers ?? [])
const syncRejections = computed(() => syncSummary.value?.rejections ?? [])
const syncDuplicates = computed(() => syncSummary.value?.duplicates ?? [])

const privacySummary = computed(() => hubExportStore.privacySummary)
const selectableItems = computed(() => filteredItems.value.filter((item) => item.eligible))
const allSelectableChecked = computed(
  () =>
    selectableItems.value.length > 0 &&
    selectableItems.value.every((item) => selectedKeys.value.has(selectionKey(item)))
)

const selectedEligibleItems = computed(() =>
  filteredItems.value
    .filter(
      (item) => selectedKeys.value.has(selectionKey(item)) && item.eligible && !item.markedForUpload
    )
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

const privacyStatusLabel = (status: HubExportPrivacyStatus) => {
  const labels: Record<HubExportPrivacyStatus, string> = {
    pass: 'bestanden',
    warning: 'nicht ausreichend',
    unavailable: 'nicht berechenbar'
  }
  return labels[status]
}

const privacyBadgeClass = (status: HubExportPrivacyStatus) => {
  const classes: Record<HubExportPrivacyStatus, string> = {
    pass: 'bg-success',
    warning: 'bg-warning text-dark',
    unavailable: 'bg-secondary'
  }
  return classes[status]
}

const privacyMetricValue = (value: number | null) => value ?? 'n/a'

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

.privacy-summary {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.sync-metric,
.sync-situation,
.sync-center-table {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
}

.sync-metric {
  display: flex;
  flex-direction: column;
  padding: 0.875rem 1rem;
}

.sync-metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}

.sync-metric-label {
  color: #6c757d;
  font-size: 0.8rem;
}

.sync-center-table {
  overflow: hidden;
}

.sync-situation {
  padding: 1rem;
}

.sync-situation-item + .sync-situation-item {
  border-top: 1px solid #eef0f2;
  margin-top: 0.625rem;
  padding-top: 0.625rem;
}
</style>
