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
            :disabled="hubExportStore.hubNodes.length !== 1"
            data-test="hub-export-target-select"
            @change="refreshOverview"
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
            data-test="hub-export-refresh"
            @click="refreshOverview"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      <div class="card-body">
        <div v-if="hubExportStore.error" class="alert alert-info" role="status">
          <strong>Status konnte nicht aktualisiert werden.</strong>
          {{ hubExportStore.error }}
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
                <span class="sync-metric-value text-warning">{{ syncRejections.length }}</span>
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
                  <td :class="center.rejectionCount ? 'text-warning fw-semibold' : ''">
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
                    <span class="d-block text-sm text-muted">{{
                      requirementLabel(item.detail)
                    }}</span>
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

        <section class="transfer-monitor mb-4" aria-labelledby="hub-transfer-monitor-title">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5 id="hub-transfer-monitor-title" class="mb-1">Transferfortschritt</h5>
              <p class="text-sm text-muted mb-0">
                Der Status wird automatisch aktualisiert, solange Übertragungen laufen.
              </p>
            </div>
            <span class="badge bg-light text-dark" data-test="hub-transfer-refresh-state">
              {{ activeTransferCount ? 'Automatische Aktualisierung aktiv' : 'Aktuell' }}
            </span>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-transfer-active-count">
                <span class="sync-metric-value text-primary">{{ activeTransferCount }}</span>
                <span class="sync-metric-label">In Übertragung</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-transfer-completed-count">
                <span class="sync-metric-value text-success">{{ completedTransferCount }}</span>
                <span class="sync-metric-label">Abgeschlossen</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-transfer-attention-count">
                <span class="sync-metric-value text-warning">{{ attentionTransferCount }}</span>
                <span class="sync-metric-label">Wartet auf Wiederaufnahme</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div class="sync-metric h-100" data-test="hub-transfer-prerequisite-count">
                <span class="sync-metric-value text-secondary">{{ missingPrerequisiteCount }}</span>
                <span class="sync-metric-label">Voraussetzungen offen</span>
              </div>
            </div>
          </div>

          <div
            v-if="transferItems.length"
            class="overall-progress"
            data-test="hub-transfer-overall-progress"
          >
            <div class="d-flex justify-content-between gap-3 mb-2 text-sm">
              <span class="fw-semibold">Gesamtfortschritt</span>
              <span class="text-muted">{{ overallTransferProgress }} %</span>
            </div>
            <div
              class="progress"
              role="progressbar"
              :aria-valuenow="overallTransferProgress"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="progress-bar bg-primary"
                :style="{ width: `${overallTransferProgress}%` }"
              ></div>
            </div>
          </div>
          <p v-else class="text-sm text-muted mb-0" data-test="hub-transfer-empty-monitor">
            Noch keine Ressourcen für die Übertragung markiert.
          </p>
        </section>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div class="text-sm text-muted d-flex gap-3 flex-wrap">
            <span>
              Source Node:
              <span class="fw-semibold">{{
                hubExportStore.sourceNodeKey || 'nicht konfiguriert'
              }}</span>
            </span>
            <span data-test="hub-export-current-user">
              Angemeldeter Benutzer:
              <span class="fw-semibold">{{ currentUsername }}</span>
            </span>
          </div>
          <div class="d-flex gap-2 flex-wrap">
            <button
              class="btn btn-outline-success btn-sm"
              :disabled="!selectedEligibleItems.length || !hubExportStore.configReady"
              data-test="hub-export-mark-selected"
              @click="markSelected"
            >
              Für Hub markieren
            </button>
            <button
              class="btn btn-outline-secondary btn-sm"
              :disabled="!selectedMarkedItems.length || !hubExportStore.configReady"
              data-test="hub-export-unmark-selected"
              @click="unmarkSelected"
            >
              Markierung entfernen
            </button>
          </div>
        </div>

        <div
          class="verification-summary mb-3"
          data-test="hub-export-verification-summary"
          aria-labelledby="hub-export-verification-title"
        >
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
            <div>
              <h6 id="hub-export-verification-title" class="mb-1">Freigabeprüfung</h6>
              <p class="text-sm text-muted mb-0">
                Die Markierung wird serverseitig dem angemeldeten Benutzer zugeordnet.
              </p>
            </div>
            <span class="badge" :class="verificationBadgeClass">
              {{ verificationLabel }}
            </span>
          </div>
          <div class="row g-3 text-sm">
            <div class="col-sm-6 col-xl-3">
              <span class="d-block text-muted">Benutzer</span>
              <span class="fw-semibold">{{ currentUsername }}</span>
            </div>
            <div class="col-sm-6 col-xl-3">
              <span class="d-block text-muted">Zielknoten</span>
              <span class="fw-semibold">{{ selectedTargetNodeKey || 'nicht konfiguriert' }}</span>
            </div>
            <div class="col-sm-6 col-xl-3">
              <span class="d-block text-muted">Auswahl</span>
              <span class="fw-semibold">{{ selectedKeys.size }} Ressourcen</span>
            </div>
            <div class="col-sm-6 col-xl-3">
              <span class="d-block text-muted">Datenschutzprüfung</span>
              <span class="fw-semibold">{{ privacyVerificationLabel }}</span>
            </div>
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
                    data-test="hub-export-select-all"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>Datei</th>
                <th>Typ</th>
                <th>Anonymisierung</th>
                <th>Processed Media</th>
                <th>Zentrum</th>
                <th>Markiert</th>
                <th>Markiert von</th>
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
                    :data-test="`hub-export-select-${item.resourceKind}-${item.id}`"
                    @change="toggleSelected(item)"
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
                  <span :class="item.processedMediaPresent ? 'text-success' : 'text-warning'">
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
                <td :data-test="`hub-export-marker-${item.resourceKind}-${item.id}`">
                  <template v-if="item.markedForUpload">
                    <span class="d-block">{{ item.markedByUsername || 'unbekannt' }}</span>
                    <span v-if="item.markedAt" class="text-xs text-muted">
                      {{ formatTimestamp(item.markedAt) }}
                    </span>
                  </template>
                  <span v-else>-</span>
                </td>
                <td class="transfer-progress-cell">
                  <div
                    class="d-flex justify-content-between align-items-center gap-2 mb-1"
                    :data-test="`hub-transfer-progress-${item.resourceKind}-${item.id}`"
                  >
                    <span class="text-sm fw-semibold">{{ transferStage(item).label }}</span>
                    <span class="text-xs text-muted">{{ transferStage(item).progress }} %</span>
                  </div>
                  <div
                    class="progress transfer-progress"
                    role="progressbar"
                    :aria-label="`Transferfortschritt für ${item.filename}`"
                    :aria-valuenow="transferStage(item).progress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    <div
                      class="progress-bar"
                      :class="transferStage(item).barClass"
                      :style="{ width: `${transferStage(item).progress}%` }"
                    ></div>
                  </div>
                </td>
                <td class="small text-muted">
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  useHubExportStore,
  type HubExportItem,
  type HubExportPrivacyStatus
} from '@/stores/hubExportStore'
import { useAuthKcStore } from '@/stores/auth_kc'

const hubExportStore = useHubExportStore()
const authStore = useAuthKcStore()
const selectedKeys = ref<Set<string>>(new Set())
const selectedTargetNodeKey = ref<string | null>(null)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)

const ACTIVE_TRANSFER_STATUSES = new Set([
  'marked',
  'queued',
  'pending',
  'registering',
  'awaiting_media',
  'uploading'
])
const COMPLETED_TRANSFER_STATUSES = new Set(['completed', 'applied'])
const ATTENTION_TRANSFER_STATUSES = new Set(['failed', 'inconsistent'])

interface TransferStage {
  progress: number
  label: string
  barClass: string
}

const TRANSFER_STAGES: Partial<Record<string, TransferStage>> = {
  marked: { progress: 10, label: 'Vorgemerkt', barClass: 'bg-info' },
  queued: { progress: 25, label: 'Eingeplant', barClass: 'bg-info' },
  pending: { progress: 35, label: 'Wird vorbereitet', barClass: 'bg-info' },
  registering: { progress: 45, label: 'Am Hub anmelden', barClass: 'bg-primary' },
  awaiting_media: { progress: 60, label: 'Hub ist bereit', barClass: 'bg-primary' },
  uploading: { progress: 80, label: 'Datei wird übertragen', barClass: 'bg-primary' },
  completed: { progress: 100, label: 'Übertragen', barClass: 'bg-success' },
  applied: { progress: 100, label: 'Im Hub übernommen', barClass: 'bg-success' },
  failed: { progress: 20, label: 'Wartet auf erneuten Versuch', barClass: 'bg-warning' },
  inconsistent: { progress: 20, label: 'Prüfung erforderlich', barClass: 'bg-warning' }
}

const selectionKey = (item: HubExportItem) => `${item.resourceKind}:${String(item.id)}`

const requirementLabel = (reason?: string) => {
  const labels: Record<string, string> = {
    'source center missing': 'Das Quellzentrum muss noch zugeordnet werden.',
    'not ready for export': 'Anonymisierung und Annotation müssen zuerst abgeschlossen werden.',
    'processed media missing': 'Die anonymisierte verarbeitete Datei fehlt noch.',
    'segment cleanup pending': 'Die Segmentbereinigung läuft noch.',
    'segment cleanup failed': 'Die Segmentbereinigung wartet auf eine erneute Ausführung.'
  }
  const normalized = (reason || '').trim()
  return labels[normalized] || normalized
}

const transferStage = (item: HubExportItem): TransferStage => {
  const normalizedStatus = item.outboundStatus.trim().toLowerCase()
  const knownStage = TRANSFER_STAGES[normalizedStatus]
  if (knownStage) return knownStage
  if (!item.eligible) {
    return { progress: 0, label: 'Voraussetzung offen', barClass: 'bg-secondary' }
  }
  return { progress: 0, label: 'Bereit zur Auswahl', barClass: 'bg-secondary' }
}

const formatTimestamp = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsed)
}

const failureClassLabel = (failureClass?: HubExportItem['failureClass']) => {
  const labels: Record<NonNullable<HubExportItem['failureClass']>, string> = {
    configuration_rejection: 'Konfiguration abgelehnt',
    authorization_denial: 'Node-Autorisierung abgelehnt',
    integrity_inconsistency: 'Integritätsprüfung fehlgeschlagen',
    transient_retry: 'Vorübergehender Transferfehler'
  }
  return failureClass ? labels[failureClass] : ''
}

const itemNotice = (item: HubExportItem) => {
  if (item.lastError) {
    const failureLabel = failureClassLabel(item.failureClass)
    return `${failureLabel ? `${failureLabel}. ` : ''}${item.lastError}`
  }
  if (item.blockedReason) return requirementLabel(item.blockedReason)
  if (COMPLETED_TRANSFER_STATUSES.has(item.outboundStatus)) {
    return item.lastTransferTimestamp
      ? `Abgeschlossen am ${formatTimestamp(item.lastTransferTimestamp)}`
      : 'Sicher am Hub übernommen.'
  }
  return transferStage(item).label
}

const filteredItems = computed(() => hubExportStore.items)
const syncSummary = computed(() => hubExportStore.syncSummary)
const syncCenters = computed(() => syncSummary.value?.centers ?? [])
const syncRejections = computed(() => syncSummary.value?.rejections ?? [])
const syncDuplicates = computed(() => syncSummary.value?.duplicates ?? [])
const transferItems = computed(() =>
  filteredItems.value.filter((item) => Boolean(item.outboundStatus))
)
const activeTransferCount = computed(
  () =>
    transferItems.value.filter((item) => ACTIVE_TRANSFER_STATUSES.has(item.outboundStatus)).length
)
const completedTransferCount = computed(
  () =>
    transferItems.value.filter((item) => COMPLETED_TRANSFER_STATUSES.has(item.outboundStatus))
      .length
)
const attentionTransferCount = computed(
  () =>
    transferItems.value.filter((item) => ATTENTION_TRANSFER_STATUSES.has(item.outboundStatus))
      .length
)
const missingPrerequisiteCount = computed(
  () => filteredItems.value.filter((item) => !item.eligible && !item.markedForUpload).length
)
const overallTransferProgress = computed(() => {
  if (!transferItems.value.length) return 0
  const total = transferItems.value.reduce((sum, item) => sum + transferStage(item).progress, 0)
  return Math.round(total / transferItems.value.length)
})

const privacySummary = computed(() => hubExportStore.privacySummary)
const currentUsername = computed(() => authStore.user?.username.trim() || 'nicht verfügbar')
const privacyVerificationLabel = computed(() => {
  if (!privacySummary.value) return 'nicht verfügbar'
  return privacyStatusLabel(privacySummary.value.status)
})
const verificationReady = computed(
  () =>
    authStore.isAuthenticated &&
    hubExportStore.configReady &&
    Boolean(selectedTargetNodeKey.value) &&
    privacySummary.value?.status === 'pass'
)
const verificationLabel = computed(() =>
  verificationReady.value ? 'Voraussetzungen erfüllt' : 'Prüfung erforderlich'
)
const verificationBadgeClass = computed(() =>
  verificationReady.value ? 'bg-success' : 'bg-warning text-dark'
)
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
  try {
    const queryTarget = hubExportStore.hubNodes.length === 1 ? selectedTargetNodeKey.value : null
    const data = await hubExportStore.fetchOverview(queryTarget)
    selectedTargetNodeKey.value = data.selectedTargetNodeKey
  } catch {
    // The store retains the status message so the page can inform the user.
  }
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
    failed: 'bg-warning text-dark',
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

const stopPolling = () => {
  if (pollingTimer.value !== null) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

const startPolling = () => {
  if (pollingTimer.value !== null) return
  pollingTimer.value = setInterval(() => {
    if (!hubExportStore.loading) void refreshOverview()
  }, 5000)
}

watch(
  () => hubExportStore.selectedTargetNodeKey,
  (next) => {
    if (next) selectedTargetNodeKey.value = next
  }
)

watch(activeTransferCount, (count) => {
  if (count > 0) startPolling()
  else stopPolling()
})

onMounted(async () => {
  await refreshOverview()
})

onBeforeUnmount(stopPolling)
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

.verification-summary {
  background: #fff;
  border: 1px solid #dee2e6;
  border-left: 4px solid #0d6efd;
  border-radius: 8px;
  padding: 1rem;
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

.transfer-monitor,
.overall-progress {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #f8f9fa;
  padding: 1rem;
}

.transfer-progress-cell {
  min-width: 13rem;
}

.transfer-progress {
  height: 0.45rem;
  background: #e9ecef;
}
</style>
