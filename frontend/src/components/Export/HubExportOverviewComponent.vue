<template>
  <div class="container-fluid py-4">
    <VideoProvenanceRepairPanel
      v-if="provenanceRepairVideoId !== null"
      :key="provenanceRepairVideoId"
      :video-id="provenanceRepairVideoId"
      @close="provenanceRepairVideoId = null"
      @repaired="refreshOverview"
    />
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
        <div
          v-if="operationError"
          class="alert alert-info"
          role="status"
          data-test="hub-export-operation-error"
        >
          <strong>Status konnte nicht aktualisiert werden.</strong>
          {{ operationError }}
        </div>

        <div
          v-if="!hubExportStore.configReady"
          class="alert alert-warning"
          role="alert"
          data-test="hub-export-config-warning"
        >
          <strong>Konfiguration unvollständig.</strong>
          {{ configurationMessage }}
        </div>

        <section
          class="mb-4"
          aria-labelledby="hub-sync-overview-title"
        >
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5
                id="hub-sync-overview-title"
                class="mb-1"
              >
                Dateisynchronisation
              </h5>
              <p class="text-sm text-muted mb-0">
                Lokaler Bestand verarbeiteter Dateien und bekannte Transfersituationen.
              </p>
            </div>
            <span
              class="badge bg-light text-dark"
              data-test="hub-sync-node-count"
            >
              {{ hubExportStore.hubNodes.length }} aktive Hub-Ziele
            </span>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-sync-center-count"
              >
                <span class="sync-metric-value">{{ syncCenters.length }}</span>
                <span class="sync-metric-label">Zentren im Bestand</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-sync-processed-count"
              >
                <span class="sync-metric-value">{{ syncSummary?.processedFileCount ?? 0 }}</span>
                <span class="sync-metric-label">Processed Files</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-sync-rejection-count"
              >
                <span class="sync-metric-value text-warning">{{ syncRejections.length }}</span>
                <span class="sync-metric-label">Ablehnungen</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-sync-duplicate-count"
              >
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
                  <td
                    colspan="6"
                    class="text-center text-muted py-3"
                  >
                    Keine Zentren im System registriert.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="row g-3">
            <div class="col-lg-6">
              <div
                class="sync-situation h-100"
                data-test="hub-sync-rejections"
              >
                <h6>Ablehnungskriterien</h6>
                <ul
                  v-if="syncRejections.length"
                  class="list-unstyled mb-0"
                >
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
                <p
                  v-else
                  class="text-sm text-muted mb-0"
                >
                  Keine Ablehnungen gemeldet.
                </p>
              </div>
            </div>
            <div class="col-lg-6">
              <div
                class="sync-situation h-100"
                data-test="hub-sync-duplicates"
              >
                <h6>Bereits registrierte Transfers / Duplikate</h6>
                <ul
                  v-if="syncDuplicates.length"
                  class="list-unstyled mb-0"
                >
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
                <p
                  v-else
                  class="text-sm text-muted mb-0"
                >
                  Keine bereits registrierten Transfers gemeldet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          class="transfer-monitor mb-4"
          aria-labelledby="hub-transfer-monitor-title"
        >
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <h5
                id="hub-transfer-monitor-title"
                class="mb-1"
              >
                Transferfortschritt
              </h5>
              <p class="text-sm text-muted mb-0">
                Der Status wird automatisch aktualisiert, solange Übertragungen laufen.
              </p>
            </div>
            <span
              class="badge bg-light text-dark"
              data-test="hub-transfer-refresh-state"
            >
              {{ refreshStateLabel }}
            </span>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-transfer-active-count"
              >
                <span class="sync-metric-value text-primary">{{ activeTransferCount }}</span>
                <span class="sync-metric-label">In Übertragung</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-transfer-completed-count"
              >
                <span class="sync-metric-value text-success">{{ completedTransferCount }}</span>
                <span class="sync-metric-label">Historisch abgeschlossen</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-transfer-attention-count"
              >
                <span class="sync-metric-value text-warning">{{ attentionTransferCount }}</span>
                <span class="sync-metric-label">Wartet auf Wiederaufnahme</span>
              </div>
            </div>
            <div class="col-6 col-xl-3">
              <div
                class="sync-metric h-100"
                data-test="hub-transfer-prerequisite-count"
              >
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
              <span class="fw-semibold">Transferphasen (keine Byteanzeige)</span>
              <span class="text-muted">{{ completedTransferCount }} / {{ transferItems.length }} abgeschlossen</span>
            </div>

          </div>
          <p
            v-else
            class="text-sm text-muted mb-0"
            data-test="hub-transfer-empty-monitor"
          >
            Noch keine Ressourcen für die Übertragung markiert.
          </p>
        </section>

        <div class="mb-3">
          <label class="form-label" for="hub-local-retention">Lokale Videokopie nach Hub-Übertragung</label>
          <select id="hub-local-retention" v-model="retainLocalProcessedMedia" class="form-select" data-test="hub-local-retention">
            <option :value="true">Auf diesem Server behalten</option>
            <option :value="false">Nach bestätigter Übertragung lokal entfernen</option>
          </select>
          <p class="text-sm text-muted mt-2" data-test="hub-local-retention-explanation">
            {{ retainLocalProcessedMedia
              ? 'Die anonymisierte Videokopie und ihre Wiedergabedaten bleiben lokal verfügbar. Das Video liegt dann redundant auf diesem Server und im Hub und belegt zusätzlichen Speicher.'
              : 'Nach geprüfter Hub-Übertragung werden die lokale anonymisierte Videokopie und ihre Wiedergabedaten entfernt. Lokale Wiedergabe ist erst nach einer Rückübertragung wieder möglich.' }}
            Diese Auswahl gilt für neu angelegte Videoübertragungen; bestehende Aufträge behalten ihre Speicherentscheidung.
          </p>
        </div>

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
              class="btn btn-success btn-sm"
              :disabled="
                !bulkOffloadCandidateCount ||
                !hubExportStore.configReady ||
                offloadingEligibleVideos
              "
              data-test="hub-export-offload-eligible-videos"
              @click="offloadEligibleVideos"
            >
              {{ offloadActionLabel }}
            </button>
            <button
              class="btn btn-outline-primary btn-sm"
              :disabled="!readinessCandidates.length || checkingReadiness"
              data-test="hub-export-check-readiness-all"
              @click="checkAllVideoReadiness"
            >
              {{ readinessActionLabel }}
            </button>
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
              <h6
                id="hub-export-verification-title"
                class="mb-1"
              >
                Freigabeprüfung
              </h6>
              <p class="text-sm text-muted mb-0">
                Die Markierung wird serverseitig dem angemeldeten Benutzer zugeordnet.
              </p>
            </div>
            <span
              class="badge"
              :class="verificationBadgeClass"
            >
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
              {{ privacyVerificationLabel }}
            </span>
          </div>
          <div class="d-flex align-items-center gap-3 flex-wrap text-sm text-muted">
            <span>
              Fälle:
              <span class="fw-semibold text-dark">{{ privacySummary.eligibleCaseCount }}</span>
            </span>
            <span>
              kleinste Gruppe:
              <span
                class="fw-semibold text-dark"
                data-test="hub-export-privacy-smallest-class"
              >
                {{ privacyMetricValue(privacySummary.smallestEquivalenceClassSize) }}
              </span>
            </span>
            <span>
              verletzte Gruppen:
              <span
                class="fw-semibold text-dark"
                data-test="hub-export-privacy-violating-classes"
              >
                {{ privacySummary.violatingEquivalenceClassCount }}
              </span>
            </span>
          </div>
        </div>

        <p role="status" aria-live="polite">{{ recoveryMessage }}</p>
        <div
          v-if="hubExportStore.items.length"
          class="hub-table-filter-bar"
          data-test="hub-export-table-filters"
          aria-label="Hub-Ressourcen filtern"
        >
          <label class="form-check-label">
            <input v-model="needsActionOnly" type="checkbox" data-test="hub-needs-action" />
            Handlungsbedarf ({{ needsActionCount }})
          </label>
          <div class="hub-table-filter-field">
            <label
              for="hub-resource-type-filter"
              class="form-label mb-1"
              >Ressourcentyp</label
            >
            <select
              id="hub-resource-type-filter"
              v-model="resourceKindFilter"
              class="form-select form-select-sm"
              data-test="hub-resource-type-filter"
            >
              <option value="all">Alle Ressourcentypen</option>
              <option value="video">Video</option>
              <option value="report">Bericht</option>
            </select>
          </div>
          <div class="hub-table-filter-field">
            <label
              for="hub-storage-state-filter"
              class="form-label mb-1"
            >
              Speicherstatus
            </label>
            <select
              id="hub-storage-state-filter"
              v-model="physicalStorageStateFilter"
              class="form-select form-select-sm"
              data-test="hub-storage-state-filter"
            >
              <option value="all">Alle Speicherzustände</option>
              <option value="present">Anonymisiertes Dokument vorhanden</option>
              <option value="missing">Anonymisiertes Dokument fehlt</option>
            </select>
          </div>
          <div
            class="hub-table-filter-summary"
            aria-live="polite"
          >
            {{ filteredItems.length }} von {{ hubExportStore.items.length }} Ressourcen
          </div>
          <button
            v-if="hasActiveTableFilters"
            type="button"
            class="btn btn-outline-secondary btn-sm mb-0"
            data-test="hub-table-filters-reset"
            @click="resetTableFilters"
          >
            Filter zurücksetzen
          </button>
        </div>

        <div
          v-if="!filteredItems.length && !hubExportStore.loading"
          class="text-center py-5"
        >
          <h5 class="text-muted">
            {{ emptyState.heading }}
          </h5>
          <p class="text-muted mb-3">
            {{ emptyState.description }}
          </p>
          <button
            v-if="hubExportStore.items.length"
            type="button"
            class="btn btn-outline-primary btn-sm"
            @click="resetTableFilters"
          >
            Filter zurücksetzen
          </button>
        </div>

        <div
          v-else
          class="table-responsive"
        >
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>Nächster Schritt</th>
                <th>Freigabe</th>
                <th>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="allSelectableChecked"
                    aria-label="Alle geeigneten Ressourcen auswählen"
                    data-test="hub-export-select-all"
                    @change="toggleSelectAll"
                  />
                </th>
                <th>Datei</th>
                <th>Typ</th>
                <th>Anonymisierung</th>
                <th>Segmentprüfung</th>
                <th>Exportintegrität</th>
                <th>Processed Media</th>
                <th>Zentrum</th>
                <th>Markiert</th>
                <th>Markiert von</th>
                <th>Status</th>
                <th>Hinweis</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredItems"
                :id="`hub-export-${item.resourceKind}-${String(item.id)}`"
                :key="`${item.resourceKind}-${String(item.id)}`"
                :class="{ 'table-active': item.resourceKind === 'video' && item.id === selectedVideoId }"
              >
                <td class="readiness-action-cell">
                  <template v-if="item.resourceKind === 'video'">
                    <button
                      class="btn btn-outline-warning btn-sm"
                      :data-test="`hub-provenance-repair-${String(item.id)}`"
                      @click="provenanceRepairVideoId = item.id"
                    >Frame-Herkunft reparieren</button>
                    <a v-if="nextStepLink(item)" :href="nextStepLink(item)" class="btn btn-outline-primary btn-sm" :data-test="`hub-next-step-${String(item.id)}`">{{ actionLabel(nextAction(item)) }}</a>
                    <button v-else type="button" class="btn btn-outline-primary btn-sm" :aria-disabled="recoveryBusy === item.id" :data-test="`hub-next-step-${String(item.id)}`" @click="runNextStep(item)">{{ actionLabel(nextAction(item)) }}</button>
                    <p v-for="blocker in assessment(item)?.blockers" :key="blocker.code" class="small">{{ blocker.detail }}</p>
                    <p v-if="assessment(item)?.checkedAt" class="small">Prüfung: {{ formatTimestamp(assessment(item)!.checkedAt!) }} · {{ assessment(item)?.verification === 'fresh_payload' ? 'Payload und Bytes geprüft' : 'Voraussetzungen offen' }}</p>
                    <p v-if="assessment(item)?.checkedAt" class="small">Transportkonfiguration: {{ assessment(item)?.transportConfiguration === 'configured' ? 'vorhanden; Worker und Empfänger separat prüfen' : 'nicht bestätigt; Administration prüfen' }}</p>
                    <button v-if="assessment(item)?.checkedAt" type="button" class="btn btn-outline-secondary btn-sm" :disabled="recoveryBusy !== null" @click="repeatPreflight(item)">Vorprüfung wiederholen</button>
                    <p v-if="assessment(item)?.completedCurrentArtifact" class="small">Gespeicherter Empfangsnachweis passt zum aktuellen Artefakt.</p>
                    <div v-if="inspections[item.id]" class="small" role="status">
                      <p>Auftragsalter: {{ inspections[item.id]?.ageSeconds ?? 'unbekannt' }} s · Queue: {{ inspections[item.id]?.queue }}</p>
                      <p>Worker verfügbar: {{ observationLabel(inspections[item.id]?.workerAvailable ?? null) }} · Task beobachtet: {{ observationLabel(inspections[item.id]?.taskObserved ?? null) }}</p>
                      <p>Letzter Fortschritt: {{ inspections[item.id]?.lastObservedProgress ?? 'unbekannt' }} · Beobachtung: {{ formatTimestamp(inspections[item.id]?.inspectionAt ?? '') }}</p>
                      <p>Zustand: {{ inspections[item.id]?.status }} · Alte Historie: {{ inspections[item.id]?.staleCandidate ? 'ja' : 'nein' }} · Aktive Medienoperation: {{ inspections[item.id]?.activeMediaOperation ? 'ja' : 'nein' }} · Originalquelle vorhanden: {{ inspections[item.id]?.retainedSourcePresent ? 'ja' : 'nein' }}</p>
                      <p>{{ inspections[item.id]?.detail }}</p>
                      <fieldset v-if="inspections[item.id]?.recoveryAllowed" :disabled="recoveryBusy !== null">
                        <legend class="small fw-semibold">Administrator-Wiederanlauf für Video {{ item.id }}</legend>
                        <label class="d-block"><input v-model="queueReviewedIds" type="checkbox" :value="item.id" :data-test="`hub-recovery-queue-${String(item.id)}`" /> Ich habe Broker-Queue und alle Verbraucher geprüft; dieser Auftrag ist nicht mehr aktiv oder eingeplant.</label>
                        <label class="d-block"><input v-model="rollbackConfirmedIds" type="checkbox" :value="item.id" :data-test="`hub-recovery-rollback-${String(item.id)}`" /> Alte Historien dürfen beendet und Frame-Artefakte zurückgerollt werden. Die Validierung muss anschließend geprüft werden.</label>
                        <button type="button" class="btn btn-outline-warning btn-sm" :disabled="!queueReviewedIds.includes(item.id) || !rollbackConfirmedIds.includes(item.id)" :data-test="`hub-recovery-restart-${String(item.id)}`" @click="restartCleanup(item)">Geprüften Wiederanlauf starten</button>
                        <p class="small">Beide Bestätigungen sind erforderlich. Die Vorschau gilt fünf Minuten; der Server prüft den Zustand erneut.</p>
                      </fieldset>
                    </div>
                  </template>
                </td>
                <td class="readiness-action-cell">
                  <button
                    v-if="item.resourceKind === 'video'"
                    class="btn btn-outline-primary btn-sm mb-0"
                    :disabled="!canCheckReadiness(item) || checkingVideoIds.has(item.id)"
                    :data-test="`hub-export-check-readiness-video-${String(item.id)}`"
                    @click="checkVideoReadiness(item)"
                  >
                    {{ videoReadinessLabel(item) }}
                  </button>
                  <span
                    v-else
                    class="text-muted"
                    >-</span
                  >
                </td>
                <td>
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :disabled="!item.eligible"
                    :aria-label="`Für Hub auswählen: ${item.resourceKind} ${String(item.id)}`"
                    :checked="selectedKeys.has(selectionKey(item))"
                    :data-test="`hub-export-select-${item.resourceKind}-${String(item.id)}`"
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
                  <span
                    class="badge"
                    :class="statusBadgeClass(item.anonymizationStatus)"
                  >
                    {{ statusLabel(item.anonymizationStatus) }}
                  </span>
                </td>
                <td :data-test="`hub-export-segment-status-${item.resourceKind}-${String(item.id)}`">
                  <span
                    v-if="item.resourceKind === 'video'"
                    class="badge"
                    :class="segmentStatusBadgeClass(item.segmentAnnotationStatus)"
                  >
                    {{ segmentStatusLabel(item.segmentAnnotationStatus) }}
                  </span>
                  <span
                    v-else
                    class="text-muted"
                    >Nicht zutreffend</span
                  >
                </td>
                <td :data-test="`hub-export-integrity-status-${item.resourceKind}-${String(item.id)}`">
                  <span
                    class="badge"
                    :class="integrityStatusBadgeClass(item.exportIntegrityStatus)"
                  >
                    {{ integrityStatusLabel(item.exportIntegrityStatus) }}
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
                <td :data-test="`hub-export-marker-${item.resourceKind}-${String(item.id)}`">
                  <template v-if="item.markedForUpload">
                    <span class="d-block">{{ item.markedByUsername || 'unbekannt' }}</span>
                    <span
                      v-if="item.markedAt"
                      class="text-xs text-muted"
                    >
                      {{ formatTimestamp(item.markedAt) }}
                    </span>
                  </template>
                  <span v-else>-</span>
                </td>
                <td class="transfer-progress-cell">
                  <div
                    class="d-flex justify-content-between align-items-center gap-2 mb-1"
                    :data-test="`hub-transfer-progress-${item.resourceKind}-${String(item.id)}`"
                  >
                    <span class="text-sm fw-semibold">{{ transferStage(item).label }}</span>

                  </div>

                </td>
                <td class="small text-muted">
                  <span class="d-block">{{ itemNotice(item) }}</span>
                  <button
                    v-if="item.outboundStatus === 'failed' && item.outboundJobId"
                    type="button"
                    class="btn btn-outline-warning btn-sm mt-2 mb-0"
                    :disabled="
                      retryingJobIds.has(item.outboundJobId) || !hubExportStore.configReady || !item.eligible || Boolean(assessment(item)?.blockers.length)
                    "
                    :data-test="`hub-export-retry-${item.outboundJobId}`"
                    @click="retryFailedTransfer(item)"
                  >
                    {{
                      retryingJobIds.has(item.outboundJobId)
                        ? 'Wird eingeplant …'
                        : 'Erneut versuchen'
                    }}
                  </button>
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
import VideoProvenanceRepairPanel from '@/components/VideoExamination/VideoProvenanceRepairPanel.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  useHubExportStore,
  type HubExportAnonymizationStatus,
  type HubExportIntegrityStatus,
  type HubExportItem,
  type HubRecoveryAction,
  type HubRecoveryAssessment,
  type HubCleanupInspection,
  type HubExportPrivacyStatus,
  type HubExportSegmentAnnotationStatus
} from '@/stores/hubExportStore'
import { useAuthKcStore } from '@/stores/auth_kc'

const hubExportStore = useHubExportStore()
const authStore = useAuthKcStore()
const selectedKeys = ref<Set<string>>(new Set())
const selectedTargetNodeKey = ref<string | null>(null)
const pollingTimer = ref<ReturnType<typeof setInterval> | null>(null)
const checkingVideoIds = ref<Set<number>>(new Set())
const offloadingEligibleVideos = ref(false)
const provenanceRepairVideoId = ref<number | null>(null)
const retryingJobIds = ref<Set<string>>(new Set())
const initialFilters = new URLSearchParams(window.location.search)
const initialKind = initialFilters.get('kind')
const selectedVideoId = Number(initialFilters.get('video')) || null
const resourceKindFilter = ref<'all' | HubExportItem['resourceKind']>(initialKind === 'video' || initialKind === 'report' ? initialKind : 'all')
const needsActionOnly = ref(initialFilters.get('needsAction') === '1')
const preflights = ref<Partial<Record<number, HubRecoveryAssessment>>>({})
const inspections = ref<Partial<Record<number, HubCleanupInspection>>>({})
const recoveryBusy = ref<number | null>(null)
const queueReviewedIds = ref<number[]>([])
const rollbackConfirmedIds = ref<number[]>([])
const recoveryMessage = ref('')
const recoveryError = ref('')
type PhysicalStorageStateFilter = 'all' | 'present' | 'missing'
const initialStorage = initialFilters.get('storage')
const physicalStorageStateFilter = ref<PhysicalStorageStateFilter>(initialStorage === 'present' || initialStorage === 'missing' ? initialStorage : 'all')

const operationError = computed(() => recoveryError.value || hubExportStore.mutationError || hubExportStore.error)
const configurationMessage = computed(
  () =>
    hubExportStore.configError ||
    'Es wird ein aktiver Site-Node und genau ein aktiver Central-Hub-Node benötigt.'
)
const emptyState = computed(() =>
  hubExportStore.items.length
    ? {
        heading: 'Keine passenden Ressourcen',
        description: 'Die gewählten Filter liefern keine Tabellenzeilen.'
      }
    : {
        heading: 'Keine exportierbaren Ressourcen',
        description: 'Es sind aktuell keine anonymisierten Ressourcen für den Hub-Export verfügbar.'
      }
)

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
  label: string
}

const TRANSFER_STAGES: Partial<Record<string, TransferStage>> = {
  marked: { label: 'Vorgemerkt' },
  queued: { label: 'Eingeplant' },
  pending: { label: 'Wird vorbereitet' },
  registering: { label: 'Am Hub anmelden' },
  awaiting_media: { label: 'Hub ist bereit' },
  uploading: { label: 'Datei wird übertragen' },
  completed: { label: 'Übertragen' },
  applied: { label: 'Im Hub übernommen' },
  failed: { label: 'Prüfung erforderlich' },
  inconsistent: { label: 'Prüfung erforderlich' }
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
  if (item.resourceKind === 'video' && COMPLETED_TRANSFER_STATUSES.has(item.outboundStatus) && !assessment(item)?.completedCurrentArtifact) {
    return { label: 'Historischer Abschluss · Vorprüfung offen' }
  }
  const normalizedStatus = item.outboundStatus.trim().toLowerCase()
  if (normalizedStatus === 'failed' && item.failureClass === 'transient_retry') {
    return { label: 'Vorübergehender Fehler' }
  }
  const knownStage = TRANSFER_STAGES[normalizedStatus]
  if (knownStage) {
    return knownStage
  }
  if (!item.eligible) {
    return { label: 'Voraussetzung offen' }
  }
  return { label: 'Bereit zur Auswahl' }
}

const formatTimestamp = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
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
  if (item.blockedReason) {
    return requirementLabel(item.blockedReason)
  }
  if (COMPLETED_TRANSFER_STATUSES.has(item.outboundStatus)) {
    return item.lastTransferTimestamp
      ? `Historischer Abschluss am ${formatTimestamp(item.lastTransferTimestamp)}; aktuelles Artefakt separat prüfen.`
      : 'Historischer Abschluss; aktuelles Artefakt separat prüfen.'
  }
  return transferStage(item).label
}

const assessment = (item: HubExportItem) => preflights.value[item.id] ?? item.recovery
const needsAction = (item: HubExportItem) =>
  Boolean(assessment(item)?.blockers.length) || !COMPLETED_TRANSFER_STATUSES.has(item.outboundStatus) ||
  (item.resourceKind === 'video' && !assessment(item)?.completedCurrentArtifact)
const needsActionCount = computed(() => hubExportStore.items.filter(needsAction).length)
const nextAction = (item: HubExportItem): HubRecoveryAction => assessment(item)?.allowedActions.at(0) ?? 'preflight'
const actionLabel = (action: HubRecoveryAction) => ({
  repair_processing: 'Verarbeitung reparieren', review_anonymization: 'Anonymisierung prüfen',
  review_segments: 'Segmente prüfen', check_export_readiness: 'Exportfreigabe prüfen',
  preflight: 'Payload vorprüfen', inspect_recovery: 'Wiederherstellung untersuchen',
  administrator_recovery: 'Administrator-Wiederherstellung anfordern', mark: 'Markierung prüfen',
  send: 'Versand prüfen', retry: 'Transfer erneut prüfen'
}[action])
const observationLabel = (value: boolean | null) => value === null ? 'unbekannt' : value ? 'ja' : 'nicht beobachtet'
const nextStepLink = (item: HubExportItem): string | undefined => {
  const returnTo = `/hub-export?${new URLSearchParams({ video: String(item.id), needsAction: needsActionOnly.value ? '1' : '0', kind: resourceKindFilter.value, storage: physicalStorageStateFilter.value })}`
  const params = new URLSearchParams({ returnTo })
  switch (nextAction(item)) {
    case 'repair_processing':
      params.set('video', String(item.id))
      return `/anonymisierung/uebersicht?${params}`
    case 'review_anonymization':
      params.set('fileId', String(item.id)); params.set('mediaType', 'video')
      return `/anonymisierung/validierung?${params}`
    case 'review_segments':
      params.set('video', String(item.id))
      return `/video-untersuchung?${params}`
    default: return undefined
  }
}
const restartCleanup = async (item: HubExportItem) => {
  const token = inspections.value[item.id]?.previewToken
  if (!token || recoveryBusy.value !== null || !queueReviewedIds.value.includes(item.id) || !rollbackConfirmedIds.value.includes(item.id)) return
  recoveryBusy.value = item.id
  recoveryError.value = ''
  try {
    await hubExportStore.restartCleanup(item.id, token)
    recoveryMessage.value = `Wiederanlauf für Video ${String(item.id)} eingeplant. Abschluss und erneute Validierung prüfen.`
    await refreshOverview()
  } catch {
    recoveryError.value = 'Wiederanlauf nicht bestätigt. Auftrag prüfen und eine neue Vorschau laden; nicht automatisch erneut starten.'
  } finally {
    inspections.value[item.id] = undefined
    queueReviewedIds.value = queueReviewedIds.value.filter(id => id !== item.id)
    rollbackConfirmedIds.value = rollbackConfirmedIds.value.filter(id => id !== item.id)
    recoveryBusy.value = null
  }
}
const repeatPreflight = async (item: HubExportItem) => {
  if (recoveryBusy.value !== null) return
  recoveryBusy.value = item.id
  recoveryError.value = ''
  try {
    preflights.value[item.id] = await hubExportStore.preflightVideo(item.id)
    recoveryMessage.value = `Vorprüfung für Video ${String(item.id)} abgeschlossen. Es wurde nichts freigegeben, markiert oder versendet.`
  } catch {
    recoveryError.value = 'Vorprüfung nicht möglich. Berechtigung und Dienstverfügbarkeit prüfen.'
  } finally {
    recoveryBusy.value = null
  }
}
const runNextStep = async (item: HubExportItem) => {
  if (recoveryBusy.value !== null) return
  if (nextAction(item) === 'preflight') {
    await repeatPreflight(item)
    return
  }
  recoveryBusy.value = item.id
  recoveryError.value = ''
  try {
    switch (nextAction(item)) {
      case 'administrator_recovery':
        recoveryMessage.value = `Administration kontaktieren: Video-ID ${String(item.id)}. Authentifizierte Identitätsnachweise, Provenienz oder Originalquelle wiederherstellen; vorhandene Artefakte erhalten.`
        break
      case 'inspect_recovery':
        inspections.value[item.id] = await hubExportStore.inspectRecovery(item.id)
        queueReviewedIds.value = queueReviewedIds.value.filter(id => id !== item.id)
        rollbackConfirmedIds.value = rollbackConfirmedIds.value.filter(id => id !== item.id)
        recoveryMessage.value = `Wiederherstellungsprüfung für Video ${String(item.id)} abgeschlossen. Es wurde kein Auftrag gestartet.`
        break
      case 'check_export_readiness':
        await checkVideoReadiness(item)
        break
      case 'mark':
      case 'send':
      case 'retry':
        recoveryMessage.value = 'Datenschutzübersicht und Auswahl prüfen; Markierung und Versand separat bestätigen.'
        break
      default: break
    }
  } catch {
    recoveryError.value = 'Prüfung nicht möglich. Berechtigung und Dienstverfügbarkeit prüfen; kein Auftrag wurde gestartet.'
  } finally {
    recoveryBusy.value = null
  }
}

const filteredItems = computed(() =>
  hubExportStore.items.filter((item) => {
    const matchesResourceKind =
      resourceKindFilter.value === 'all' || item.resourceKind === resourceKindFilter.value
    const matchesStorageState =
      physicalStorageStateFilter.value === 'all' ||
      (physicalStorageStateFilter.value === 'present'
        ? item.processedMediaPresent
        : !item.processedMediaPresent)
    return matchesResourceKind && matchesStorageState && (!needsActionOnly.value || needsAction(item))
  })
)
const hasActiveTableFilters = computed(
  () => needsActionOnly.value || resourceKindFilter.value !== 'all' || physicalStorageStateFilter.value !== 'all'
)

const resetTableFilters = () => {
  needsActionOnly.value = false
  resourceKindFilter.value = 'all'
  physicalStorageStateFilter.value = 'all'
}

watch([resourceKindFilter, physicalStorageStateFilter], () => {
  selectedKeys.value = new Set()
})
const syncSummary = computed(() => hubExportStore.syncSummary)
const syncCenters = computed(() => syncSummary.value?.centers ?? [])
const syncRejections = computed(() => syncSummary.value?.rejections ?? [])
const syncDuplicates = computed(() => syncSummary.value?.duplicates ?? [])
const transferItems = computed(() =>
  hubExportStore.items.filter((item) => Boolean(item.outboundStatus))
)
const activeTransferCount = computed(
  () =>
    transferItems.value.filter((item) => ACTIVE_TRANSFER_STATUSES.has(item.outboundStatus)).length
)
const needsTransferPolling = computed(
  () =>
    activeTransferCount.value > 0 ||
    transferItems.value.some((item) => item.outboundStatus === 'failed')
)
const refreshStateLabel = computed(() =>
  needsTransferPolling.value ? 'Automatische Aktualisierung aktiv' : 'Aktuell'
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
  () => hubExportStore.items.filter((item) => !item.eligible && !item.markedForUpload).length
)


const privacySummary = computed(() => hubExportStore.privacySummary)
const currentUsername = computed(() => authStore.user?.username.trim() || 'nicht verfügbar')
const privacyVerificationLabel = computed(() => {
  if (!privacySummary.value) {
    return 'nicht verfügbar'
  }
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
const hasVerifiedIntegrity = (item: HubExportItem) =>
  item.exportIntegrityStatus === 'persisted_verified' || item.exportIntegrityStatus === 'verified'
const videoReadinessLabel = (item: HubExportItem) => {
  if (hasVerifiedIntegrity(item)) {
    return 'Nachweis gespeichert · Vorprüfung erforderlich'
  }
  return checkingVideoIds.value.has(item.id) ? 'Prüft …' : 'Exportfreigabe prüfen'
}
const canCheckReadiness = (item: HubExportItem) =>
  item.resourceKind === 'video' &&
  Boolean(item.sourceCenterKey) &&
  item.processedMediaPresent &&
  !hasVerifiedIntegrity(item)
const readinessCandidates = computed(() =>
  hubExportStore.items.filter((item) => canCheckReadiness(item))
)
const checkingReadiness = computed(() => checkingVideoIds.value.size > 0)
const offloadActionLabel = computed(() =>
  offloadingEligibleVideos.value
    ? 'Videos werden eingeplant …'
    : 'Alle geeigneten Videos zum Hub übertragen'
)
const readinessActionLabel = computed(() =>
  checkingReadiness.value
    ? 'Exportfreigabe wird geprüft …'
    : 'Alle Videos auf Exportfreigabe prüfen'
)
const bulkOffloadCandidateCount = computed(
  () =>
    hubExportStore.items.filter(
      (item) =>
        item.resourceKind === 'video' &&
        item.eligible &&
        (!item.outboundStatus ||
          item.outboundStatus === 'marked' ||
          item.outboundStatus === 'failed')
    ).length
)
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
    preflights.value = {}
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

const retainLocalProcessedMedia = ref(true)

const markSelected = async () => {
  try {
    await hubExportStore.markResources(selectedEligibleItems.value, retainLocalProcessedMedia.value)
    selectedKeys.value = new Set()
  } catch {
    // The store exposes the backend rejection without discarding the operator's selection.
  }
}

const unmarkSelected = async () => {
  try {
    await hubExportStore.unmarkResources(selectedMarkedItems.value)
    selectedKeys.value = new Set()
  } catch {
    // The store exposes the backend rejection without discarding the operator's selection.
  }
}

const offloadEligibleVideos = async () => {
  offloadingEligibleVideos.value = true
  try {
    await hubExportStore.offloadEligibleVideos(retainLocalProcessedMedia.value)
    selectedKeys.value = new Set()
  } catch {
    // The store exposes the backend rejection while retaining the current overview.
  } finally {
    offloadingEligibleVideos.value = false
  }
}

const retryFailedTransfer = async (item: HubExportItem) => {
  const jobId = item.outboundJobId
  if (!jobId || retryingJobIds.value.has(jobId)) {
    return
  }
  retryingJobIds.value = new Set(retryingJobIds.value).add(jobId)
  try {
    await hubExportStore.retryFailedJob(jobId)
  } catch {
    // The store exposes the backend rejection while retaining the failed row.
  } finally {
    const remaining = new Set(retryingJobIds.value)
    remaining.delete(jobId)
    retryingJobIds.value = remaining
  }
}

const checkReadiness = async (items: HubExportItem[]) => {
  const candidates = items.filter(
    (item): item is HubExportItem & { sourceCenterKey: string } =>
      canCheckReadiness(item) && Boolean(item.sourceCenterKey)
  )
  if (!candidates.length) {
    return
  }
  checkingVideoIds.value = new Set(candidates.map((item) => item.id))
  try {
    await hubExportStore.checkVideoExportReadiness(
      candidates.map((item) => ({ id: item.id, centerKey: item.sourceCenterKey }))
    )
  } finally {
    checkingVideoIds.value = new Set()
  }
}

const checkVideoReadiness = async (item: HubExportItem) => {
  await checkReadiness([item])
}

const checkAllVideoReadiness = async () => {
  await checkReadiness(readinessCandidates.value)
}

const statusLabel = (status: HubExportAnonymizationStatus) => {
  const labels: Record<HubExportAnonymizationStatus, string> = {
    anonymized: 'Anonymisiert',
    done_processing_anonymization: 'Fertig',
    validated: 'Validiert',
    processing_anonymization: 'In Bearbeitung',
    extracting_frames: 'Frames',
    failed: 'Fehlgeschlagen',
    not_started: 'Nicht gestartet',
    started: 'Gestartet'
  }
  return labels[status]
}

const statusBadgeClass = (status: HubExportAnonymizationStatus) => {
  const classes: Record<HubExportAnonymizationStatus, string> = {
    anonymized: 'bg-success',
    done_processing_anonymization: 'bg-success',
    validated: 'bg-success',
    processing_anonymization: 'bg-warning',
    extracting_frames: 'bg-info',
    failed: 'bg-warning text-dark',
    not_started: 'bg-secondary',
    started: 'bg-warning text-dark'
  }
  return classes[status]
}

const segmentStatusLabel = (status: HubExportSegmentAnnotationStatus) => {
  const labels: Record<HubExportSegmentAnnotationStatus, string> = {
    not_started: 'Nicht gestartet',
    cleanup_required: 'Bereinigung erforderlich',
    cleanup_queued: 'Bereinigung eingeplant',
    cleanup_running: 'Bereinigung läuft',
    cleanup_failed: 'Bereinigung fehlgeschlagen',
    validated: 'Validiert'
  }
  return labels[status]
}

const segmentStatusBadgeClass = (status: HubExportSegmentAnnotationStatus) => {
  const classes: Record<HubExportSegmentAnnotationStatus, string> = {
    not_started: 'bg-secondary',
    cleanup_required: 'bg-warning text-dark',
    cleanup_queued: 'bg-info',
    cleanup_running: 'bg-info',
    cleanup_failed: 'bg-warning text-dark',
    validated: 'bg-success'
  }
  return classes[status]
}

const integrityStatusLabel = (status: HubExportIntegrityStatus) => {
  const labels: Record<HubExportIntegrityStatus, string> = {
    not_ready: 'Nicht bereit',
    missing_processed_media: 'Processed Media fehlt',
    missing_hash: 'Hash fehlt',
    hash_metadata_mismatch: 'Hash-Metadaten widersprüchlich',
    persisted_verified: 'Nachweis vorhanden',
    verified: 'Frisch geprüft',
    processed_media_unreadable: 'Processed Media nicht lesbar',
    processed_media_hash_mismatch: 'Datei-Hash abweichend'
  }
  return labels[status]
}

const integrityStatusBadgeClass = (status: HubExportIntegrityStatus) => {
  if (status === 'persisted_verified' || status === 'verified') {
    return 'bg-success'
  }
  if (status === 'not_ready') {
    return 'bg-secondary'
  }
  return 'bg-warning text-dark'
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
  if (pollingTimer.value !== null) {
    return
  }
  pollingTimer.value = setInterval(() => {
    if (!hubExportStore.loading) {
      void refreshOverview()
    }
  }, 5000)
}

watch(
  () => hubExportStore.selectedTargetNodeKey,
  (next) => {
    if (next) {
      selectedTargetNodeKey.value = next
    }
  }
)

watch(
  needsTransferPolling,
  (needsPolling) => {
    if (needsPolling) {
      startPolling()
    } else {
      stopPolling()
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await refreshOverview()
  if (selectedVideoId !== null) {
    await nextTick()
    document.getElementById(`hub-export-video-${String(selectedVideoId)}`)?.querySelector<HTMLElement>('[data-test^="hub-next-step-"]')?.focus()
  }
})

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.hub-target-select {
  min-width: 16rem;
}

.hub-table-filter-bar {
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.9rem;
  border: 1px solid var(--lx-border, #dee2e6);
  border-radius: var(--lx-corner-radius);
  background: var(--lx-surface-muted, #f8f9fa);
}

.hub-table-filter-field {
  flex: 0 1 16rem;
  min-width: 13rem;
}

.hub-table-filter-summary {
  margin: 0 auto 0.5rem 0;
  color: var(--lx-ink-muted, #6c757d);
  font-size: 0.82rem;
  font-weight: 700;
}

.privacy-summary {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: var(--lx-corner-radius);
  padding: 0.75rem 1rem;
}

.verification-summary {
  background: #fff;
  border: 1px solid #dee2e6;
  border-left: 4px solid #0d6efd;
  border-radius: var(--lx-corner-radius);
  padding: 1rem;
}

.sync-metric,
.sync-situation,
.sync-center-table {
  border: 1px solid #dee2e6;
  border-radius: var(--lx-corner-radius);
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
  border-radius: var(--lx-corner-radius);
  background: #f8f9fa;
  padding: 1rem;
}

.transfer-progress-cell {
  min-width: 13rem;
}

.readiness-action-cell {
  min-width: 12rem;
}

.transfer-progress {
  height: 0.45rem;
  background: #e9ecef;
}
</style>
