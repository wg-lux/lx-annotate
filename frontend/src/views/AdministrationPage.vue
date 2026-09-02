<template>
  <div class="admin-page container-fluid py-4 px-3 px-lg-4">
    <header class="admin-hero">
      <div>
        <p class="eyebrow">Betrieb und Zugriff</p>
        <h1>Administration</h1>
        <p class="intro">
          Überwachen Sie den sicheren Hub-Transfer und verwalten Sie lokale Center-Zuordnungen.
          Technische Rollen werden hier ausschließlich angezeigt.
        </p>
      </div>
      <button class="btn btn-outline-light" type="button" :disabled="loading" @click="loadAll">
        {{ loading ? 'Aktualisiere …' : 'Aktualisieren' }}
      </button>
    </header>

    <div v-if="errorMessage" class="alert alert-danger mt-3" role="alert">
      {{ errorMessage }}
    </div>

    <template v-if="overview">
      <section class="status-grid mt-4" aria-label="Hub-Status">
        <article class="status-card">
          <span class="status-label">Hub-Konfiguration</span>
          <strong :class="overview.hubHealth.ready ? 'text-success' : 'text-danger'">
            {{ overview.hubHealth.ready ? 'Betriebsbereit' : 'Nicht bereit' }}
          </strong>
          <small>Quellknoten: {{ overview.hubHealth.sourceNodeKey || 'nicht konfiguriert' }}</small>
        </article>
        <article class="status-card">
          <span class="status-label">Transport</span>
          <strong :class="overview.hubHealth.transport.ready ? 'text-success' : 'text-danger'">
            {{ overview.hubHealth.transport.requireMtls ? 'mTLS erforderlich' : 'TLS' }}
          </strong>
          <small
            >Transportmaterial:
            {{ overview.hubHealth.transport.ready ? 'bereit' : 'nicht bereit' }}</small
          >
        </article>
        <article class="status-card">
          <span class="status-label">Transferaufträge</span>
          <strong>{{ overview.transferMonitoring.total }}</strong>
          <small>{{ overview.transferMonitoring.counts.failed || 0 }} fehlgeschlagen</small>
        </article>
        <article class="status-card">
          <span class="status-label">Automatische Queue</span>
          <strong>{{ overview.hubHealth.autoQueueEnabled ? 'Aktiv' : 'Inaktiv' }}</strong>
          <small>{{
            overview.hubHealth.exactlyOneActiveHub ? 'Ein aktiver Hub' : 'Hub-Auswahl uneindeutig'
          }}</small>
        </article>
      </section>

      <section
        v-if="overview.effectivePermissions.centerScopeGlobalAdmin"
        class="admin-card mt-4"
        data-test="host-status"
      >
        <div class="section-heading">
          <div>
            <h2>Host-Status</h2>
            <p>
              Alle registrierten Netzwerk-Knoten. Der Status zeigt die lokale Aktivierung und
              Konfiguration; es wird kein Remote-Liveness-Probe ausgelöst.
            </p>
          </div>
          <span class="badge bg-secondary">
            {{ overview.hostStatus.active }} / {{ overview.hostStatus.total }} aktiv
          </span>
        </div>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Host</th>
                <th>Rolle</th>
                <th>Center</th>
                <th>Status</th>
                <th>Verbindung</th>
                <th>Aktualisiert</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="host in overview.hostStatus.hosts" :key="host.nodeKey">
                <td>
                  <strong>{{ host.displayName }}</strong>
                  <small class="d-block text-muted">{{ host.nodeKey }}</small>
                </td>
                <td>{{ host.roleLabel }}</td>
                <td>{{ host.owningCenterName || host.owningCenterKey || '—' }}</td>
                <td>
                  <span
                    class="badge"
                    :class="host.active ? 'bg-success' : 'bg-secondary'"
                    :data-test="`host-status-${host.nodeKey}`"
                  >
                    {{ host.active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </td>
                <td>
                  {{
                    host.httpsConfigured
                      ? 'HTTPS konfiguriert'
                      : host.baseUrlConfigured
                        ? 'ohne HTTPS'
                        : 'keine URL'
                  }}
                </td>
                <td>{{ formatDate(host.updatedAt) }}</td>
              </tr>
              <tr v-if="!overview.hostStatus.hosts.length">
                <td colspan="6" class="text-center text-muted py-4">
                  Keine Netzwerk-Knoten registriert.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-if="overview.effectivePermissions.storageMonitorRead"
        class="admin-card mt-4"
        data-test="storage-balancing"
      >
        <div class="section-heading">
          <div>
            <h2>Storage-Knoten</h2>
            <p>
              Persistierte Kapazität und Platzierungssteuerung des Hubs. Die Datenebene wird separat
              bereitgestellt und hier niemals stillschweigend vorausgesetzt.
            </p>
          </div>
          <span class="badge" :class="storageTopologyBadge">
            {{ storageTopologyLabel }}
          </span>
        </div>
        <div
          v-if="overview.storageBalancing.blockedReason"
          class="alert alert-warning"
          role="status"
        >
          {{ overview.storageBalancing.blockedReason }}
        </div>
        <div class="storage-control-grid mb-3" data-test="storage-planner-status">
          <div>
            <span class="status-label">Platzierungsplaner</span>
            <strong
              :class="overview.storageBalancing.planner.compatible ? 'text-warning' : 'text-danger'"
            >
              {{ storagePlannerLabel }}
            </strong>
            <small>
              Vertrag:
              {{ overview.storageBalancing.planner.contractVersion ?? 'nicht veröffentlicht' }}
              / erwartet {{ overview.storageBalancing.planner.expectedContractVersion }}
            </small>
          </div>
          <div>
            <span class="status-label">Reservierungen</span>
            <strong>{{ overview.storageBalancing.activeReservationCount }}</strong>
            <small>{{ formatStateCounts(overview.storageBalancing.reservationCounts) }}</small>
          </div>
          <div>
            <span class="status-label">Rotationsqueue</span>
            <strong>{{ overview.storageBalancing.queuedRotationCount }}</strong>
            <small>{{ formatStateCounts(overview.storageBalancing.rotationCounts) }}</small>
          </div>
          <div>
            <span class="status-label">Queue-Ausführung</span>
            <strong
              :class="
                overview.storageBalancing.planner.queueExecutionEnabled
                  ? 'text-success'
                  : 'text-danger'
              "
            >
              {{
                overview.storageBalancing.planner.queueExecutionEnabled ? 'Aktiv' : 'Deaktiviert'
              }}
            </strong>
            <small>
              Fehler: {{ overview.storageBalancing.failedTransferCount }}, überfällige
              Reservierungen: {{ overview.storageBalancing.overdueReservationCount }}, auslaufende
              Schlüsselobjekte: {{ overview.storageBalancing.retiredTransferCount }}
            </small>
          </div>
          <div>
            <span class="status-label">Reconciliation</span>
            <strong
              :class="
                overview.storageBalancing.reconciliationCriticalCount ? 'text-danger' : 'text-muted'
              "
            >
              {{ overview.storageBalancing.reconciliationCriticalCount }} kritisch ·
              {{ overview.storageBalancing.reconciliationWarningCount }} Warnungen
            </strong>
            <small>
              {{ overview.storageBalancing.reconciliationRunCount }} Läufe ·
              {{ overview.storageBalancing.lastReconciliationAt ?? 'noch nicht ausgeführt' }}
            </small>
          </div>
        </div>
        <div
          v-if="overview.effectivePermissions.centerScopeGlobalAdmin"
          class="d-flex flex-wrap gap-2 mb-3"
          data-test="storage-operator-controls"
        >
          <button
            class="btn btn-sm btn-outline-warning mb-0"
            type="button"
            :disabled="storageOperatorPending !== null"
            @click="
              runStorageOperatorControl(
                overview.storageBalancing.planner.operatorPaused ? 'resume' : 'pause'
              )
            "
          >
            {{
              overview.storageBalancing.planner.operatorPaused
                ? 'Balancing fortsetzen'
                : 'Balancing pausieren'
            }}
          </button>
          <button
            class="btn btn-sm btn-outline-secondary mb-0"
            type="button"
            :disabled="storageOperatorPending !== null"
            @click="runStorageOperatorControl('reconcile')"
          >
            Reconciliation anfordern
          </button>
          <button
            class="btn btn-sm btn-outline-primary mb-0"
            type="button"
            :disabled="
              storageOperatorPending !== null || overview.storageBalancing.planner.operatorPaused
            "
            @click="runStorageOperatorControl('rebalance')"
          >
            Rebalance anfordern
          </button>
        </div>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Knoten</th>
                <th>Status</th>
                <th>Nutzbar</th>
                <th>Reserviert / in Arbeit</th>
                <th>Belegt</th>
                <th>Messalter</th>
                <th>Platzierungen</th>
                <th v-if="overview.effectivePermissions.centerScopeGlobalAdmin">Aktion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="node in overview.storageBalancing.nodes" :key="node.nodeKey">
                <td>
                  <strong>{{ node.displayName }}</strong>
                  <small class="d-block text-muted">{{ node.nodeKey }}</small>
                  <small class="d-block text-muted"
                    >{{ node.failureDomain }} · {{ node.residencyKey }}</small
                  >
                </td>
                <td>
                  <span
                    :data-test="`storage-node-status-${node.nodeKey}`"
                    class="badge"
                    :class="
                      !node.active
                        ? 'bg-secondary'
                        : !node.isReachable
                          ? 'bg-danger'
                          : !node.acceptingWrites
                            ? 'bg-info text-dark'
                            : node.isDraining
                              ? 'bg-warning text-dark'
                              : 'bg-success'
                    "
                  >
                    {{
                      !node.active
                        ? 'Inaktiv'
                        : !node.isReachable
                          ? 'Nicht erreichbar'
                          : !node.acceptingWrites
                            ? 'Schreibgeschützt'
                            : node.isDraining
                              ? 'Wird entleert'
                              : 'Aktiv'
                    }}
                  </span>
                </td>
                <td>{{ formatBytes(node.availableBytes) }}</td>
                <td>{{ formatBytes(node.reservedBytes + node.inFlightBytes) }}</td>
                <td>{{ formatBytes(node.committedBytes) }}</td>
                <td>{{ formatDuration(node.healthFreshnessSeconds) }}</td>
                <td>{{ node.currentPlacementCount }}</td>
                <td v-if="overview.effectivePermissions.centerScopeGlobalAdmin">
                  <button
                    class="btn btn-sm mb-0"
                    :data-test="`storage-node-action-${node.nodeKey}`"
                    :class="node.isDraining ? 'btn-outline-success' : 'btn-outline-warning'"
                    type="button"
                    :disabled="storageActionPending === node.nodeKey"
                    @click="runStorageAction(node)"
                  >
                    {{ node.isDraining ? 'Wieder aufnehmen' : 'Entleeren' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!overview.storageBalancing.nodes.length">
                <td
                  :colspan="overview.effectivePermissions.centerScopeGlobalAdmin ? 8 : 7"
                  class="text-center text-muted py-4"
                >
                  Keine Storage-Knoten konfiguriert.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4" data-test="storage-balance-work">
          <h3>Ausgleichsaufträge</h3>
          <div class="table-responsive">
            <table class="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Artefakt</th>
                  <th>Pfad</th>
                  <th>Status</th>
                  <th>Größe</th>
                  <th v-if="overview.effectivePermissions.centerScopeGlobalAdmin">Aktion</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="work in overview.storageBalancing.workItems" :key="work.workItemId">
                  <td>
                    <strong>{{ work.artifactKey }}</strong>
                    <small class="d-block text-muted"
                      >{{ work.artifactKind }} · {{ work.reason }}</small
                    >
                  </td>
                  <td>{{ work.sourceNodeKey }} → {{ work.targetNodeKey ?? 'kein Ziel' }}</td>
                  <td>
                    {{ work.rotationState ?? work.status }}
                    <small v-if="work.cancellationReceiptId" class="d-block text-muted">
                      storniert · {{ work.cancellationReceiptId }}
                    </small>
                    <small v-else-if="work.terminalReason" class="d-block text-muted">
                      {{ work.terminalReason }}
                    </small>
                  </td>
                  <td>{{ formatBytes(work.expectedSizeBytes) }}</td>
                  <td v-if="overview.effectivePermissions.centerScopeGlobalAdmin">
                    <button
                      class="btn btn-sm btn-outline-danger mb-0"
                      type="button"
                      :data-test="`cancel-storage-work-${work.workItemId}`"
                      :disabled="!work.cancellable || storageWorkPending === work.workItemId"
                      @click="runStorageWorkCancellation(work)"
                    >
                      Stornieren
                    </button>
                    <button
                      class="btn btn-sm btn-outline-primary mb-0 ms-1"
                      type="button"
                      :data-test="`retry-storage-work-${work.workItemId}`"
                      :disabled="!work.retryable || storageOperatorPending !== null"
                      @click="runStorageOperatorControl('retry', work)"
                    >
                      Neu platzieren
                    </button>
                  </td>
                </tr>
                <tr v-if="!overview.storageBalancing.workItems.length">
                  <td
                    :colspan="overview.effectivePermissions.centerScopeGlobalAdmin ? 5 : 4"
                    class="text-center text-muted py-3"
                  >
                    Keine Ausgleichsaufträge vorhanden.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="admin-card mt-4" data-test="effective-permissions">
        <div class="section-heading">
          <div>
            <h2>Effektive Berechtigungen</h2>
            <p>Nur-Lese-Ansicht der synchronisierten Rollen und lokalen Center-Zuordnungen.</p>
          </div>
          <span class="badge bg-secondary">{{ overview.effectivePermissions.username }}</span>
        </div>
        <dl class="permission-grid">
          <div>
            <dt>Center</dt>
            <dd>
              {{
                overview.effectivePermissions.centers
                  .map((center) => center.displayName)
                  .join(', ') || 'nicht zugeordnet'
              }}
            </dd>
          </div>
          <div>
            <dt>Center-Administration</dt>
            <dd>
              {{ overview.effectivePermissions.centerScopeAdmin ? 'erlaubt' : 'nicht erlaubt' }}
            </dd>
          </div>
          <div>
            <dt>Keycloak-Rollen ändern</dt>
            <dd>nicht unterstützt</dd>
          </div>
        </dl>
        <div class="role-list">
          <span v-for="role in overview.effectivePermissions.roles" :key="role" class="role-chip">{{
            role
          }}</span>
          <span v-if="!overview.effectivePermissions.roles.length" class="text-muted"
            >Keine Rollen synchronisiert</span
          >
        </div>
        <div class="alert alert-info mt-3 mb-0" role="status">
          Keycloak-Gruppen sind die maßgebliche Quelle. Lokale Änderungen gelten sofort, können aber
          bei der nächsten Anmeldung durch <code>/centers/&lt;center_key&gt;</code>-Gruppen ersetzt
          werden. Globale Keycloak-Administration erfordert
          <code>{{ overview.effectivePermissions.centerScopeRoles.global }}</code
          >. Weisen Sie diese Rolle als Realm-Rolle direkt in Keycloak zu; diese Anwendung verändert
          keine Keycloak-Rollen.
        </div>
      </section>

      <section class="admin-card mt-4" data-test="transfer-monitoring">
        <div class="section-heading">
          <div>
            <h2>Transfer-Monitoring</h2>
            <p>
              Letzte Aufträge mit Korrelations- und Cleanup-Status; keine Schlüssel oder
              Rohmediendaten.
            </p>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Status</th>
                <th>Korrelation</th>
                <th>Typ</th>
                <th>Ziel</th>
                <th>Center</th>
                <th>Versuche</th>
                <th>Cleanup</th>
                <th>Aktualisiert</th>
                <th>Hinweis</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in overview.transferMonitoring.recentAttentionJobs" :key="job.id">
                <td>
                  <span class="badge" :class="statusBadge(job.localStatus)">{{
                    statusLabel(job.localStatus)
                  }}</span>
                </td>
                <td class="correlation-cell">
                  <code>{{ job.id }}</code>
                  <small>Transfer: {{ job.transferKey }}</small>
                  <small v-if="job.remoteTransferId">Remote: {{ job.remoteTransferId }}</small>
                </td>
                <td>{{ job.resourceKind === 'video' ? 'Video' : 'Bericht' }}</td>
                <td>{{ job.targetNodeKey }}</td>
                <td>{{ job.sourceCenterKey || '—' }}</td>
                <td>{{ job.retryCount }}</td>
                <td>
                  <span class="badge" :class="cleanupBadge(job.localCleanupStatus)">
                    {{ cleanupLabel(job.localCleanupStatus) }}
                  </span>
                </td>
                <td>{{ formatDate(job.updatedAt) }}</td>
                <td class="error-cell">{{ job.lastError || '—' }}</td>
              </tr>
              <tr v-if="!overview.transferMonitoring.recentAttentionJobs.length">
                <td colspan="9" class="text-center text-muted py-4">
                  Noch keine Transferaufträge vorhanden.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-if="overview.effectivePermissions.centerScopeAdmin"
        class="admin-card mt-4"
        data-test="center-scope-management"
      >
        <div class="section-heading">
          <div>
            <h2>Center-Zugriffsverwaltung</h2>
            <p>
              Änderungen gelten für zukünftige geschützte Anfragen und werden dauerhaft auditiert.
            </p>
          </div>
        </div>
        <div v-if="accessError" class="alert alert-warning">{{ accessError }}</div>
        <div class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Benutzer</th>
                <th>Status</th>
                <th>Center</th>
                <th>Rollen (nur Lesen)</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in accessUsers" :key="user.id">
                <td>{{ user.username }}</td>
                <td>
                  <span class="badge" :class="assignmentBadge(user.assignmentStatus)">{{
                    assignmentLabel(user.assignmentStatus)
                  }}</span>
                </td>
                <td>
                  <span
                    v-for="center in user.centers"
                    :key="center.centerKey"
                    class="role-chip role-chip-small"
                  >
                    {{ center.displayName }}
                  </span>
                  <span v-if="!user.centers.length">—</span>
                </td>
                <td>
                  <span v-for="role in user.roles" :key="role" class="role-chip role-chip-small">{{
                    role
                  }}</span>
                </td>
                <td>
                  <span v-if="!user.canMutate" class="text-muted small">Eigenes Konto</span>
                  <template v-else>
                    <button
                      v-if="assignableCenters(user).length"
                      class="btn btn-sm btn-outline-primary mb-0"
                      type="button"
                      @click="beginChange(user, 'assign')"
                    >
                      Zuordnen
                    </button>
                    <button
                      v-for="center in user.centers"
                      :key="`revoke-${center.centerKey}`"
                      class="btn btn-sm btn-outline-danger mb-0"
                      type="button"
                      @click="beginChange(user, 'revoke', center.centerKey)"
                    >
                      {{ center.displayName }} entziehen
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <small class="text-muted">{{ accessTotal }} Benutzer · Seite {{ accessPage }}</small>
          <div class="d-flex gap-2">
            <button
              class="btn btn-sm btn-outline-secondary mb-0"
              type="button"
              :disabled="accessPage <= 1"
              @click="changeAccessPage(accessPage - 1)"
            >
              Zurück
            </button>
            <button
              class="btn btn-sm btn-outline-secondary mb-0"
              type="button"
              :disabled="accessPage * 25 >= accessTotal"
              @click="changeAccessPage(accessPage + 1)"
            >
              Weiter
            </button>
          </div>
        </div>

        <form v-if="pendingChange" class="change-panel" @submit.prevent="submitChange">
          <h3>
            {{
              pendingChange.operation === 'assign' ? 'Center zuordnen' : 'Center-Zugriff entziehen'
            }}
          </h3>
          <p>
            Benutzer: <strong>{{ pendingChange.user.username }}</strong>
          </p>
          <p v-if="pendingChange.operation === 'revoke'">
            Center: <strong>{{ selectedCenterKey }}</strong>
          </p>
          <label v-if="pendingChange.operation === 'assign'" class="form-label">
            Center
            <select v-model="selectedCenterKey" class="form-select mt-1" required>
              <option value="" disabled>Center auswählen</option>
              <option
                v-for="center in centerChoices"
                :key="center.centerKey"
                :value="center.centerKey"
              >
                {{ center.displayName }} · {{ center.centerKey }}
              </option>
            </select>
          </label>
          <label class="form-label mt-3">
            Begründung
            <textarea
              v-model.trim="reason"
              class="form-control mt-1"
              rows="3"
              maxlength="1000"
              required
            ></textarea>
          </label>
          <div class="d-flex gap-2 mt-3">
            <button
              class="btn btn-primary mb-0"
              type="submit"
              :disabled="
                saving || !reason || (pendingChange.operation === 'assign' && !selectedCenterKey)
              "
            >
              Bestätigen
            </button>
            <button
              class="btn btn-outline-secondary mb-0"
              type="button"
              :disabled="saving"
              @click="cancelChange"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isAxiosError } from 'axios'
import {
  fetchAdministrationOverview,
  fetchCenterScopeUsers,
  applyStorageOperatorControl,
  cancelStorageBalanceWork,
  updateStorageDrainState,
  updateCenterScope,
  type AdministrationOverview,
  type CenterAssignmentStatus,
  type CenterChoice,
  type CenterScopeUser,
  type StorageBalanceWorkItem,
  type StorageOperatorControlAction,
  type StorageNodeOverview
} from '@/api/administrationApi'

interface AdministrationErrorPayload {
  detail?: string
}

function administrationErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<AdministrationErrorPayload>(error)) {
    return error.response?.data.detail || error.message || fallback
  }
  return error instanceof Error && error.message ? error.message : fallback
}

const overview = ref<AdministrationOverview | null>(null)
const accessUsers = ref<CenterScopeUser[]>([])
const centerChoices = ref<CenterChoice[]>([])
const accessPage = ref(1)
const accessTotal = ref(0)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const accessError = ref('')
const reason = ref('')
const selectedCenterKey = ref('')
const storageActionPending = ref<string | null>(null)
const storageWorkPending = ref<string | null>(null)
const storageOperatorPending = ref<StorageOperatorControlAction | null>(null)
const pendingChange = ref<{ user: CenterScopeUser; operation: 'assign' | 'revoke' } | null>(null)
let refreshTimer: number | null = null

async function loadAll() {
  loading.value = true
  errorMessage.value = ''
  try {
    overview.value = await fetchAdministrationOverview()
    if (overview.value.effectivePermissions.centerScopeAdmin) await loadAccessUsers()
  } catch (error: unknown) {
    errorMessage.value = administrationErrorMessage(
      error,
      'Administration konnte nicht geladen werden.'
    )
  } finally {
    loading.value = false
  }
}

async function loadAccessUsers(page = accessPage.value) {
  accessError.value = ''
  try {
    const data = await fetchCenterScopeUsers(page)
    accessUsers.value = data.users
    centerChoices.value = data.centers
    accessPage.value = data.page
    accessTotal.value = data.total
  } catch (error: unknown) {
    accessError.value = administrationErrorMessage(
      error,
      'Center-Zugriffe konnten nicht geladen werden.'
    )
  }
}

async function runStorageAction(node: StorageNodeOverview) {
  const action = node.isDraining ? 'resume' : 'drain'
  const reason = window
    .prompt(
      action === 'drain'
        ? 'Begründung für das Entleeren dieses Storage-Knotens:'
        : 'Begründung für die Wiederaufnahme dieses Storage-Knotens:'
    )
    ?.trim()
  if (!reason) return
  const confirmed = window.confirm(
    action === 'drain'
      ? `Storage-Knoten ${node.nodeKey} für neue Platzierungen sperren?`
      : `Storage-Knoten ${node.nodeKey} wieder für neue Platzierungen freigeben?`
  )
  if (!confirmed) return

  storageActionPending.value = node.nodeKey
  errorMessage.value = ''
  try {
    await updateStorageDrainState({
      action,
      nodeKey: node.nodeKey,
      expectedIsDraining: node.isDraining,
      reason,
      idempotencyKey: crypto.randomUUID()
    })
    overview.value = await fetchAdministrationOverview()
  } catch (error: unknown) {
    errorMessage.value = administrationErrorMessage(
      error,
      'Storage-Knotenstatus konnte nicht geändert werden.'
    )
  } finally {
    storageActionPending.value = null
  }
}

async function runStorageWorkCancellation(work: StorageBalanceWorkItem) {
  if (!work.cancellable) return
  const reason = window.prompt('Begründung für das Stornieren dieses Ausgleichsauftrags:')?.trim()
  if (!reason) return
  if (!window.confirm(`Ausgleichsauftrag ${work.workItemId} vor dem Kopieren stornieren?`)) return

  storageWorkPending.value = work.workItemId
  errorMessage.value = ''
  try {
    await cancelStorageBalanceWork(work.workItemId, {
      reason,
      idempotencyKey: crypto.randomUUID()
    })
    overview.value = await fetchAdministrationOverview()
  } catch (error: unknown) {
    errorMessage.value = administrationErrorMessage(
      error,
      'Ausgleichsauftrag konnte nicht sicher storniert werden.'
    )
  } finally {
    storageWorkPending.value = null
  }
}

async function runStorageOperatorControl(
  action: StorageOperatorControlAction,
  work?: StorageBalanceWorkItem
) {
  const reason = window.prompt(`Begründung für die Storage-Aktion „${action}“:`)?.trim()
  if (!reason) return
  if (!window.confirm(`Storage-Aktion „${action}“ verbindlich anfordern?`)) return

  storageOperatorPending.value = action
  errorMessage.value = ''
  try {
    const result = await applyStorageOperatorControl({
      action,
      reason,
      idempotencyKey: crypto.randomUUID(),
      ...(work ? { workItemId: work.workItemId } : {})
    })
    overview.value = await fetchAdministrationOverview()
    if (!result.dispatchQueued) {
      errorMessage.value =
        'Storage-Aktion wurde dauerhaft gespeichert und wird nach Wiederherstellung der Queue automatisch zugestellt.'
    }
  } catch (error: unknown) {
    errorMessage.value = administrationErrorMessage(
      error,
      'Storage-Aktion konnte nicht sicher gespeichert werden.'
    )
  } finally {
    storageOperatorPending.value = null
  }
}

async function changeAccessPage(page: number) {
  await loadAccessUsers(page)
}

function assignableCenters(user: CenterScopeUser): CenterChoice[] {
  const assigned = new Set(user.centers.map((center) => center.centerKey))
  return centerChoices.value.filter((center) => !assigned.has(center.centerKey))
}

function beginChange(user: CenterScopeUser, operation: 'assign' | 'revoke', centerKey = '') {
  pendingChange.value = { user, operation }
  selectedCenterKey.value =
    operation === 'assign' ? assignableCenters(user)[0]?.centerKey || '' : centerKey
  reason.value = ''
}

function cancelChange() {
  pendingChange.value = null
  reason.value = ''
  selectedCenterKey.value = ''
}

async function submitChange() {
  const change = pendingChange.value
  if (!change || !reason.value) return
  const prompt =
    change.operation === 'assign'
      ? 'Center-Zuordnung verbindlich speichern?'
      : 'Center-Zugriff verbindlich entziehen?'
  if (!window.confirm(prompt)) return
  saving.value = true
  accessError.value = ''
  try {
    await updateCenterScope(change.user.id, {
      operation: change.operation,
      centerKey: selectedCenterKey.value,
      expectedCenterKeys: change.user.centers.map((center) => center.centerKey).sort(),
      reason: reason.value
    })
    cancelChange()
    await loadAccessUsers()
    overview.value = await fetchAdministrationOverview()
  } catch (error: unknown) {
    accessError.value = administrationErrorMessage(
      error,
      'Center-Zuordnung konnte nicht geändert werden.'
    )
  } finally {
    saving.value = false
  }
}

const statusLabel = (status: string) =>
  ({
    marked: 'Markiert',
    queued: 'Wartend',
    registering: 'Registrierung',
    awaiting_media: 'Wartet auf Medium',
    uploading: 'Upload',
    completed: 'Abgeschlossen',
    failed: 'Fehlgeschlagen'
  })[status] || status
const statusBadge = (status: string) =>
  status === 'failed' ? 'bg-danger' : status === 'completed' ? 'bg-success' : 'bg-warning text-dark'
const cleanupLabel = (status: string) =>
  ({
    not_applicable: 'Nicht vorgesehen',
    retained: 'Aufbewahrt',
    eligible: 'Freigegeben',
    cleaned: 'Bereinigt'
  })[status] || status
const cleanupBadge = (status: string) =>
  status === 'cleaned'
    ? 'bg-success'
    : status === 'eligible'
      ? 'bg-warning text-dark'
      : 'bg-secondary'
const assignmentLabel = (status: CenterAssignmentStatus) =>
  ({ assigned: 'Zugeordnet', unassigned: 'Nicht zugeordnet', incomplete: 'Unvollständig' })[status]
const assignmentBadge = (status: CenterAssignmentStatus) =>
  status === 'assigned'
    ? 'bg-success'
    : status === 'unassigned'
      ? 'bg-warning text-dark'
      : 'bg-danger'
const storageTopologyLabel = computed(() => {
  const state = overview.value?.storageBalancing.topologyState
  return (
    {
      unavailable: 'Vertrag nicht verfügbar',
      not_configured: 'Nicht konfiguriert',
      single_node_non_redundant: 'Einzelknoten · nicht redundant',
      multi_node_control_plane_only: 'Mehrere Knoten · nur Steuerung',
      multi_node_operational: 'Mehrere Knoten · aktiv'
    }[state || 'unavailable'] || state
  )
})
const storageTopologyBadge = computed(() =>
  overview.value?.storageBalancing.dataPlaneOperational ? 'bg-success' : 'bg-warning text-dark'
)
const storagePlannerLabel = computed(() => {
  const planner = overview.value?.storageBalancing.planner
  if (!planner || planner.status === 'contract_unavailable') return 'Vertrag nicht verfügbar'
  if (!planner.compatible) return 'Vertrag inkompatibel'
  return planner.queueExecutionEnabled
    ? 'Planung und Ausführung aktiv'
    : 'Nur Planung · keine Ausführung'
})
const formatStateCounts = (counts: Record<string, number>) => {
  const entries = Object.entries(counts)
  return entries.length
    ? entries.map(([state, count]) => `${state}: ${String(count)}`).join(' · ')
    : 'keine Einträge'
}
const formatBytes = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1
  }).format(value / 1_000_000)
const formatDuration = (seconds: number) =>
  seconds < 60
    ? `${String(seconds)} s`
    : seconds < 3600
      ? `${String(Math.floor(seconds / 60))} min`
      : `${String(Math.floor(seconds / 3600))} h`
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value)
  )

onMounted(() => {
  void loadAll()
  refreshTimer = window.setInterval(() => {
    if (!saving.value) void loadAll()
  }, 30000)
})
onBeforeUnmount(() => {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.admin-page {
  color: #25324a;
}
.admin-hero {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  align-items: center;
  padding: 2rem;
  color: white;
  border-radius: 1rem;
  background: linear-gradient(135deg, #1f3155, #315b78);
}
.admin-hero h1 {
  color: white;
  margin: 0;
}
.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  opacity: 0.75;
}
.intro {
  max-width: 54rem;
  margin: 0.6rem 0 0;
  color: rgba(255, 255, 255, 0.82);
}
.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}
.status-card,
.admin-card {
  background: white;
  border: 1px solid #e3e8f0;
  border-radius: 0.9rem;
  box-shadow: 0 8px 24px rgba(31, 49, 85, 0.07);
}
.status-card {
  display: grid;
  gap: 0.35rem;
  padding: 1.25rem;
}
.status-card strong {
  font-size: 1.25rem;
}
.status-card small {
  color: #667085;
}
.status-label {
  color: #667085;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.admin-card {
  padding: 1.5rem;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
  margin-bottom: 1rem;
}
.section-heading h2 {
  margin: 0;
  font-size: 1.25rem;
}
.section-heading p {
  margin: 0.3rem 0 0;
  color: #667085;
}
.storage-control-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}
.storage-control-grid > div {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem;
  border-radius: 0.65rem;
  background: #f7f9fc;
}
.storage-control-grid small {
  color: #667085;
  overflow-wrap: anywhere;
}
.permission-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}
.permission-grid div {
  padding: 0.9rem;
  border-radius: 0.65rem;
  background: #f7f9fc;
}
.permission-grid dt {
  color: #667085;
  font-size: 0.8rem;
}
.permission-grid dd {
  margin: 0.25rem 0 0;
  font-weight: 700;
}
.role-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
}
.role-chip {
  display: inline-flex;
  padding: 0.25rem 0.55rem;
  border-radius: 999px;
  background: #e9eef8;
  color: #344b73;
  font-size: 0.78rem;
}
.role-chip-small {
  margin: 0.1rem;
  font-size: 0.7rem;
}
.error-cell {
  max-width: 24rem;
  white-space: normal;
  overflow-wrap: anywhere;
}
.change-panel {
  max-width: 42rem;
  margin-top: 1rem;
  padding: 1.25rem;
  border: 1px solid #dbe3ef;
  border-radius: 0.75rem;
  background: #f8fafc;
}
.change-panel h3 {
  font-size: 1.05rem;
}
@media (max-width: 991px) {
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .permission-grid {
    grid-template-columns: 1fr;
  }
  .storage-control-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 575px) {
  .admin-hero {
    align-items: stretch;
    flex-direction: column;
  }
  .status-grid {
    grid-template-columns: 1fr;
  }
  .storage-control-grid {
    grid-template-columns: 1fr;
  }
}
</style>
