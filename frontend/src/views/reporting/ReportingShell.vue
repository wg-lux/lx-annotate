<template>
  <div class="reporting-shell container-fluid py-4">
    <section class="reporting-command-bar mb-3" aria-label="Reporting-Kontext">
      <div class="reporting-command-main">
        <div class="small text-uppercase text-muted fw-semibold tracking-label">Reporting</div>
        <h4 class="mb-3">Bericht erstellen</h4>
        <div class="context-case-select w-100 w-xl-75">
          <label class="form-label form-label-sm mb-1">Fall</label>
          <div class="d-flex flex-column flex-lg-row flex-lg-wrap gap-2">
            <select
              class="form-select"
              data-testid="case-select"
              :value="flow.caseId ?? ''"
              :disabled="caseOptionsLoading || !caseOptions.length"
              aria-label="Fall auswählen"
              @change="onCaseSelect(($event.target as HTMLSelectElement).value)"
            >
              <option value="">
                {{
                  caseOptionsLoading
                    ? 'Fälle werden geladen...'
                    : caseOptions.length
                      ? 'Bitte Fall wählen'
                      : 'Keine Fälle verfügbar'
                }}
              </option>
              <option
                v-for="patientCase in caseOptions"
                :key="patientCase.caseId"
                :value="patientCase.caseId"
              >
                {{ formatCaseLabel(patientCase) }}
              </option>
            </select>
            <select
              class="form-select"
              data-testid="patient-examination-select"
              :value="selectedPatientExaminationId"
              :disabled="
                !flow.caseId ||
                patientExaminationOptionsLoading ||
                !patientExaminationOptions.length
              "
              aria-label="Untersuchung auswählen"
              @change="onPatientExaminationSelect(($event.target as HTMLSelectElement).value)"
            >
              <option value="">
                {{
                  patientExaminationOptionsLoading
                    ? 'Patientenuntersuchungen werden geladen...'
                    : patientExaminationOptions.length
                      ? 'Bitte Patientenuntersuchung wählen'
                      : 'Keine Patientenuntersuchungen verfügbar'
                }}
              </option>
              <option
                v-for="option in patientExaminationOptions"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select>
            <select
              class="form-select"
              data-testid="terminology-bundle-select"
              :value="activeBundleIdentityKey"
              :disabled="terminology.selecting || !visibleTerminologyBundles.length"
              aria-label="Terminologiepaket auswählen"
              @change="onTerminologyBundleSelect(($event.target as HTMLSelectElement).value)"
            >
              <option value="">Keine aktive Terminologie</option>
              <option
                v-for="bundle in visibleTerminologyBundles"
                :key="terminology.bundleKey(bundle)"
                :value="terminology.bundleKey(bundle)"
              >
                {{ bundle.moduleName }} · {{ bundle.version }}
              </option>
            </select>
            <select
              class="form-select"
              data-testid="report-template-select"
              :value="flow.selectedTemplateName ?? ''"
              :disabled="templateLoading || !availableTemplates.length"
              aria-label="Berichtsvorlage auswählen"
              @change="
                onTemplateSelectionChange(
                  ($event.target as HTMLSelectElement).value,
                  $event.target as HTMLSelectElement
                )
              "
            >
              <option value="">
                {{
                  templateLoading
                    ? 'Vorlagen werden geladen...'
                    : availableTemplates.length
                      ? 'Bitte Vorlage wählen'
                      : 'Keine veröffentlichte Vorlage verfügbar'
                }}
              </option>
              <option
                v-for="template in availableTemplates"
                :key="template.name"
                :value="template.name"
              >
                {{ describeReportTemplateTitle(template.name)
                }}{{
                  template.identity?.knowledgeBaseVersion
                    ? ` · ${template.identity.knowledgeBaseVersion}`
                    : ''
                }}
              </option>
            </select>
            <select
              class="form-select"
              data-testid="report-language-select"
              :value="flow.selectedReportLanguage"
              :disabled="reportLanguagesLoading || !reportLanguageOptions.length"
              aria-label="Berichtssprache auswählen"
              @change="
                flow.setReportLanguage(
                  ($event.target as HTMLSelectElement).value as ReportLanguageCode
                )
              "
            >
              <option
                v-for="language in reportLanguageOptions"
                :key="language.code"
                :value="language.code"
              >
                {{ language.label }}
              </option>
            </select>
            <input
              ref="terminologyFolderInput"
              class="visually-hidden"
              type="file"
              webkitdirectory
              directory
              multiple
              @change="importTerminologyFolder"
            />
            <input
              ref="terminologyZipInput"
              class="visually-hidden"
              type="file"
              accept=".zip,application/zip"
              multiple
              @change="importTerminologyZip"
            />
            <button
              class="btn btn-outline-secondary"
              type="button"
              :disabled="terminology.importing"
              @click="openTerminologyFolderPicker"
            >
              <i class="ni ni-single-copy-04 me-1" aria-hidden="true"></i>
              {{
                terminology.importing
                  ? 'Terminologie wird importiert…'
                  : 'Paketverzeichnis(se) auswählen'
              }}
            </button>
            <button
              class="btn btn-outline-secondary"
              type="button"
              :disabled="terminology.importing"
              @click="openTerminologyZipPicker"
            >
              <i class="ni ni-archive-2 me-1" aria-hidden="true"></i>
              ZIPs lokal/Cloud importieren
            </button>
            <ReportImportPanel @completed="handleReportImportCompleted" />
            <button
              class="btn btn-outline-secondary"
              :disabled="flow.mediaPreloadStatus === 'loading' || !flow.selectedPatientId"
              @click="refreshMediaPreload"
            >
              <i class="ni ni-refresh-02 me-1" aria-hidden="true"></i>
              Medien aktualisieren
            </button>
            <button
              class="btn btn-outline-secondary"
              type="button"
              @click="isContextPanelOpen = !isContextPanelOpen"
            >
              <i class="ni ni-settings-gear-65 me-1" aria-hidden="true"></i>
              {{ isContextPanelOpen ? 'Kontext ausblenden' : 'Kontext einblenden' }}
            </button>
          </div>
          <div v-if="patientExaminationOptionsError" class="small text-danger mt-1">
            {{ patientExaminationOptionsError }}
          </div>
          <div v-if="caseOptionsError" class="small text-danger mt-1">
            {{ caseOptionsError }}
          </div>
          <div v-if="templateSelectionError" class="small text-danger mt-1" role="alert">
            {{ templateSelectionError }}
          </div>
        </div>
      </div>
      <div class="reporting-start-guide" aria-label="Einstieg in den Reporting-Ablauf">
        <strong>Hier starten</strong>
        <ol>
          <li :class="{ 'is-complete': Boolean(flow.patientExaminationId) }">
            <span>1</span>
            <div>
              <b>Fall und Untersuchung wählen</b>
              <small>Oben den Fall und eine zugehörige Patientenuntersuchung auswählen.</small>
            </div>
          </li>
          <li :class="{ 'is-complete': Boolean(flow.selectedTemplateName) }">
            <span>2</span>
            <div>
              <b>Optional: Vorlage festlegen</b>
              <small
                >Terminologie ergänzt Vorlagen; die Befunderfassung kann vorher beginnen.</small
              >
            </div>
          </li>
          <li :class="{ 'is-complete': Boolean(flow.currentRuntimeDraft) }">
            <span>3</span>
            <div>
              <b>Befunde erfassen</b>
              <small>Danach links dem Ablauf bis zum Abschluss folgen.</small>
            </div>
          </li>
        </ol>
      </div>
      <div class="context-summary-grid">
        <div class="context-summary-item is-primary">
          <span class="context-summary-label">Jetzt</span>
          <strong>{{ currentStepLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Patient</span>
          <strong>{{ patientHeaderLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Geburtsdatum</span>
          <strong>{{ patientBirthDateLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Fall-ID</span>
          <strong>{{ caseIdLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Status</span>
          <strong>{{ caseStatusLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Untersuchungstyp</span>
          <strong>{{ examinationTypeLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Vorlage</span>
          <strong>{{ selectedTemplateLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Terminologie</span>
          <strong>{{ selectedTerminologyLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Berichtssprache</span>
          <strong>{{ selectedReportLanguageLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Entwurf</span>
          <strong>{{ draftSummaryLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Medien</span>
          <strong>{{ mediaPreloadLabel }}</strong>
        </div>
      </div>
      <div
        v-if="terminologyImportMessage"
        class="small mt-2"
        :class="terminology.error ? 'text-danger' : 'text-muted'"
        :role="terminology.error ? 'alert' : 'status'"
      >
        {{ terminologyImportMessage }}
      </div>
      <div v-if="terminology.error" class="alert alert-warning py-2" role="alert">
        <div>Terminologieregister konnte nicht geladen werden: {{ terminology.error }}</div>
        <div class="small mb-2">Befunderfassung und Medien bleiben weiterhin verfügbar.</div>
        <button
          class="btn btn-outline-secondary btn-sm"
          type="button"
          :disabled="terminology.loading"
          @click="retryTerminologyBundles"
        >
          Terminologieregister erneut laden
        </button>
      </div>
      <div
        v-if="!terminology.activeBundle"
        class="alert alert-info py-2 mt-2 mb-0"
        role="status"
        aria-live="polite"
      >
        Keine aktive Terminologie. Befunde und Medien bleiben verfügbar; Vorlagenprüfung,
        Finalisierung und templateabhängiger Export werden nach Paketaktivierung ergänzt.
      </div>
      <div v-if="reportLanguagesError" class="small text-danger mt-2">
        {{ reportLanguagesError }}
      </div>
    </section>

    <div class="reporting-workspace-grid">
      <aside class="reporting-left-rail">
        <div class="card shadow-sm finding-status-panel">
          <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <div>
              <h6 class="mb-0">Befundstatus</h6>
              <small class="text-muted">{{ findingProgressSummary }}</small>
            </div>
            <span class="context-status-pill" :class="validationStatusPillClass">
              {{ validationStatusLabel }}
            </span>
          </div>
          <div class="card-body p-0">
            <div v-if="findingStatusSections.length" class="finding-status-list">
              <section
                v-for="section in findingStatusSections"
                :key="section.key"
                class="finding-status-section"
              >
                <div class="finding-status-section-title">{{ section.title }}</div>
                <RouterLink
                  v-for="row in section.rows"
                  :key="row.key"
                  :to="findingStatusTarget(row)"
                  class="finding-status-row"
                  :class="[
                    `is-${row.status}`,
                    { 'is-selected': row.normalizedKey === activeReferenceFindingKey }
                  ]"
                  @click="selectedReferenceFindingKey = row.normalizedKey"
                >
                  <span class="finding-status-icon" aria-hidden="true">
                    <i :class="row.iconClass"></i>
                  </span>
                  <span class="finding-status-copy">
                    <span class="finding-status-label">{{ row.label }}</span>
                    <span class="finding-status-meta">{{ row.statusLabel }}</span>
                  </span>
                  <span class="finding-status-count">{{ row.instanceCount }}</span>
                </RouterLink>
              </section>
            </div>
            <div v-else class="p-3 small text-muted">
              Noch kein Template oder lokaler Befundentwurf für die Statusliste geladen.
            </div>
          </div>
        </div>

        <div class="card shadow-sm workflow-panel">
          <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <h6 class="mb-0">Ablauf</h6>
            <span class="small text-muted">{{ currentStepLabel }}</span>
          </div>
          <div class="card-body p-3">
            <div v-if="draftBootstrapError" class="alert alert-warning py-2 mb-3">
              {{ draftBootstrapError }}
            </div>
            <nav class="nav flex-column gap-1">
              <template v-for="(item, index) in navItems" :key="item.to">
                <RouterLink
                  v-if="!isStepDisabled(item)"
                  :to="item.to"
                  class="workflow-step-btn btn btn-sm text-start"
                  :aria-current="isActive(item.to) ? 'page' : undefined"
                  :class="
                    isActive(item.to) ? 'btn-dark is-active' : 'btn-outline-secondary is-inactive'
                  "
                >
                  <span class="workflow-step-index">{{ index + 1 }}</span>
                  <span class="workflow-step-copy">
                    <span>{{ item.label }}</span>
                    <span class="workflow-step-meta">{{ stepStatusLabel(item) }}</span>
                  </span>
                </RouterLink>
                <div v-else class="workflow-step-btn btn btn-sm text-start is-disabled">
                  <span class="workflow-step-index">{{ index + 1 }}</span>
                  <span class="workflow-step-copy">
                    <span>{{ item.label }}</span>
                    <span class="workflow-step-meta">{{ stepStatusLabel(item) }}</span>
                  </span>
                </div>
              </template>
            </nav>
          </div>
        </div>
      </aside>

      <main class="reporting-main-region">
        <div v-if="isContextPanelOpen" class="card shadow-sm mb-3 context-panel">
          <div class="card-header d-flex justify-content-between align-items-center gap-3">
            <div>
              <h6 class="mb-0">Arbeitskontext</h6>
              <small class="text-muted">Fallstatus, Medien und nächste Aktion</small>
            </div>
            <span class="context-status-pill" :class="`is-${flow.mediaPreloadStatus}`">
              {{ mediaPreloadLabel }}
            </span>
          </div>
          <div class="card-body">
            <div class="context-quick-grid mb-3">
              <div class="context-tile">
                <span>Entwurf</span>
                <strong>{{ draftSummaryLabel }}</strong>
                <small>{{ selectedPatientExaminationLabel }}</small>
                <small>{{ selectedTemplateLabel }}</small>
                <div v-if="draftBootstrapError" class="alert alert-warning py-2 mt-2 mb-0">
                  {{ draftBootstrapError }}
                </div>
              </div>
              <div class="context-tile">
                <span>Medien</span>
                <strong>{{ mediaPreloadLabel }}</strong>
                <div v-if="flow.mediaPreloadError" class="alert alert-warning py-2 mt-2 mb-0">
                  {{ flow.mediaPreloadError }}
                </div>
                <small v-else>{{
                  flow.mediaPreload ? 'Bericht, Video und Frames geladen' : 'Noch leer'
                }}</small>
              </div>
              <div class="context-tile">
                <span>Nächster Schritt</span>
                <strong>{{ nextStepHint }}</strong>
              </div>
            </div>
            <div v-if="flow.mediaPreload" class="row g-3">
              <div class="col-md-4">
                <div class="media-context-card">
                  <div class="fw-semibold mb-1">Bericht</div>
                  <div v-if="flow.mediaPreload.latestReport" class="small">
                    <div>ID: {{ flow.mediaPreload.latestReport.id }}</div>
                    <div>Typ: {{ flow.mediaPreload.latestReport.documentType || 'n/a' }}</div>
                    <div class="mt-2 d-flex flex-wrap gap-2">
                      <button
                        v-for="option in flow.mediaPreload.latestReport.streamOptions"
                        :key="`report-${option.type}`"
                        class="btn btn-outline-secondary btn-sm"
                        @click="openUrl(option.url)"
                      >
                        {{ option.type }}
                      </button>
                    </div>
                    <div class="mt-2 d-grid gap-2">
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredReportStream"
                        @click="openUrl(preferredReportStream)"
                      >
                        Bericht öffnen
                      </button>
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredReportDownload"
                        @click="openUrl(preferredReportDownload)"
                      >
                        Bericht herunterladen
                      </button>
                    </div>
                  </div>
                  <div v-else class="small text-muted">Kein Bericht verfügbar.</div>
                  <button
                    class="btn btn-primary btn-sm w-100 mt-2"
                    type="button"
                    :disabled="!canNavigateToReportEditor"
                    @click="navigateToReportEditor"
                  >
                    {{
                      flow.mediaPreload.latestReport
                        ? 'Befundbericht bearbeiten'
                        : 'Befundbericht erstellen'
                    }}
                  </button>
                </div>
              </div>
              <div class="col-md-4">
                <div class="media-context-card">
                  <div class="fw-semibold mb-1">Video</div>
                  <div v-if="flow.mediaPreload.latestVideo" class="small">
                    <div>ID: {{ flow.mediaPreload.latestVideo.id }}</div>
                    <div class="mt-2 d-flex flex-wrap gap-2">
                      <button
                        v-for="option in flow.mediaPreload.latestVideo.streamOptions"
                        :key="`video-${option.type}`"
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!isVideoArtifactKind(option.type)"
                        @click="selectVideoStream(option.type)"
                      >
                        {{ option.type }}
                      </button>
                    </div>
                    <div class="mt-2 d-grid gap-2">
                      <button
                        class="btn btn-outline-secondary btn-sm"
                        :disabled="!preferredVideoArtifactKind"
                        @click="selectVideoStream(preferredVideoArtifactKind)"
                      >
                        Video streamen
                      </button>
                    </div>
                    <video
                      v-if="reportingVideoId"
                      ref="reportingVideoElement"
                      class="w-100 mt-2 rounded border"
                      controls
                    />
                    <div
                      v-if="reportingVideoPlaybackError"
                      class="alert alert-warning py-2 mt-2 mb-0"
                    >
                      {{ reportingVideoPlaybackError.message }}
                    </div>
                  </div>
                  <div v-else class="small text-muted">Kein Video verfügbar.</div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="media-context-card">
                  <div class="fw-semibold mb-1">Frames</div>
                  <div v-if="flow.mediaPreload.latestFrames.length" class="small d-grid gap-2">
                    <button
                      v-for="frame in flow.mediaPreload.latestFrames"
                      :key="`${frame.videoId}-${frame.frameNumber}`"
                      class="btn btn-outline-secondary btn-sm text-start"
                      @click="selectFrameStream(frame.streamUrl)"
                    >
                      #{{ frame.frameNumber }} · {{ frame.category || 'fallback' }}
                    </button>
                    <img
                      v-if="selectedFrameStreamUrl"
                      class="img-fluid rounded border mt-1"
                      :src="selectedFrameStreamUrl"
                      alt="Selected frame stream preview"
                    />
                  </div>
                  <div v-else class="small text-muted">Keine Frames verfügbar.</div>
                </div>
              </div>
            </div>
            <div v-else class="small text-muted">
              Noch keine zuletzt geladenen Medien verfügbar.
            </div>
          </div>
        </div>
        <RouterView />
      </main>

      <aside class="reporting-right-rail">
        <div class="card shadow-sm concept-coverage-panel mb-3">
          <div class="card-header d-flex justify-content-between align-items-start gap-2">
            <div>
              <h6 class="mb-0">LXDM-Konzeptabdeckung</h6>
              <small class="text-muted">{{ conceptCoverageSubtitle }}</small>
              <small
                v-if="conceptCoverage.source === 'server' && conceptCoverage.identity"
                class="d-block text-muted"
                data-testid="concept-coverage-identity"
              >
                Modul {{ conceptCoverage.identity.moduleName }} v{{
                  conceptCoverage.identity.moduleVersion
                }}
                · {{ conceptCoverage.identity.moduleDigest.slice(0, 12) }}… · Template
                {{ conceptCoverage.identity.templateName }} v{{
                  conceptCoverage.identity.templateVersion
                }}
                · {{ conceptCoverage.identity.templateDigest.slice(0, 12) }}…
              </small>
            </div>
            <span class="context-status-pill" :class="conceptCoveragePillClass">
              {{ conceptCoverageSummaryLabel }}
            </span>
          </div>
          <div class="card-body">
            <div
              v-if="conceptCoverage.source === 'legacy_fallback'"
              class="alert alert-warning py-2 small mb-2"
              data-testid="concept-coverage-legacy-warning"
            >
              {{
                templateReference?.conceptCoverageState === 'invalid'
                  ? 'Der serverseitige Coverage-Vertrag ist ungültig.'
                  : 'Keine serverseitige Coverage geliefert.'
              }}
              Diese technische Fallback-Auflösung ist nicht autoritativ.
            </div>
            <small
              v-if="conceptCoverage.source === 'server' && conceptCoverage.provenance"
              class="d-block text-muted mb-2"
              data-testid="concept-coverage-provenance"
            >
              Serververtrag {{ templateReference?.conceptCoverage?.contractVersion }} · Resolver
              {{ conceptCoverage.provenance.resolver }} v{{
                conceptCoverage.provenance.resolverVersion
              }}
              · Evidenz {{ conceptCoverage.provenance.evidenceDigest.slice(0, 12) }}…
            </small>
            <div v-if="conceptCoverage.items.length" class="d-grid gap-2">
              <div
                v-for="item in conceptCoverage.items"
                :key="item.conceptId"
                class="small d-flex justify-content-between align-items-start gap-2"
                :title="item.evidencePath || undefined"
              >
                <span>
                  <span class="fw-semibold">{{ item.label }}</span>
                  <span v-if="item.kind === 'classification'" class="text-muted">
                    · {{ item.finding }}
                  </span>
                  <small v-if="item.messages.length" class="d-block text-danger">
                    {{ item.messages.join(' ') }}
                  </small>
                </span>
                <span class="text-nowrap" :class="`text-${conceptCoverageStatusTone(item.status)}`">
                  {{ conceptCoverageStatusLabel(item.status) }}
                </span>
              </div>
            </div>
            <div v-else class="small text-muted">
              Kein Berichtstemplate oder keine LXDM-Konzepte geladen.
            </div>
            <small class="d-block text-muted mt-3">
              Technische Konzeptabdeckung; kein Nachweis klinischer Vollständigkeit oder
              Leitlinienadhärenz.
            </small>
          </div>
        </div>
        <div class="card shadow-sm kb-reference-panel">
          <div class="card-header">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <h6 class="mb-0">KB-Referenz</h6>
                <small class="text-muted">{{ kbReferenceSubtitle }}</small>
              </div>
              <span
                v-if="templateReferenceLoading || findingCatalogLoading"
                class="context-status-pill is-loading"
              >
                lädt
              </span>
            </div>
          </div>
          <div class="card-body">
            <div v-if="templateReferenceError" class="alert alert-warning py-2 small">
              {{ templateReferenceError }}
            </div>

            <template v-if="activeReferenceFinding">
              <div class="kb-focus-block mb-3">
                <span>Aktiver Befund</span>
                <strong>{{ activeReferenceFinding.label }}</strong>
                <small>{{ activeFindingDescription }}</small>
              </div>

              <div class="kb-reference-group">
                <h6>Klassifikationen</h6>
                <div v-if="activeReferenceClassifications.length" class="kb-classification-list">
                  <div
                    v-for="classification in activeReferenceClassifications"
                    :key="classification.key"
                    class="kb-classification-row"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ classification.label }}</strong>
                      <span
                        class="kb-classification-precedence"
                        :class="{ 'is-required': classification.required }"
                      >
                        {{ classification.required ? 'erforderlich' : 'optional' }}
                      </span>
                    </div>
                    <small v-if="classification.choicesLabel">
                      {{ classification.choicesLabel }}
                    </small>
                    <small v-if="classification.inputLabel">
                      {{ classification.inputLabel }}
                    </small>
                    <small v-if="classification.description">
                      {{ classification.description }}
                    </small>
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Keine Klassifikationen im aktuellen Template hinterlegt.
                </div>
              </div>

              <div class="kb-reference-group">
                <h6>PatientLedger</h6>
                <div v-if="activeFindingInstances.length" class="runtime-instance-list">
                  <div
                    v-for="instance in activeFindingInstances"
                    :key="instance.localId || instance.finding"
                    class="runtime-instance-row"
                  >
                    {{ formatRuntimeFindingInstance(instance) }}
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Keine lokale Instanz dieses Befunds im Entwurf.
                </div>
              </div>

              <div class="kb-reference-group">
                <h6>Regelhinweise</h6>
                <div v-if="activeAdviceRows.length" class="kb-advice-list">
                  <div
                    v-for="row in activeAdviceRows"
                    :key="row.key"
                    class="kb-advice-row"
                    :class="{ 'is-ok': row.ok, 'is-warning': !row.ok }"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ row.title }}</strong>
                      <span>{{ row.kind }}</span>
                    </div>
                    <small>{{ row.detail }}</small>
                    <small v-for="message in row.messages" :key="message">
                      {{ message }}
                    </small>
                  </div>
                </div>
                <div v-else class="small text-muted">
                  Keine kontextbezogenen Laufzeitregeln für diesen Befund.
                </div>
              </div>

              <div v-if="activeSuggestedActions.length" class="kb-reference-group">
                <h6>Vorschläge</h6>
                <div class="kb-suggestion-list">
                  <div
                    v-for="suggestion in activeSuggestedActions"
                    :key="suggestion"
                    class="kb-suggestion-row"
                  >
                    {{ suggestion }}
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="small text-muted">
              Wählen Sie einen Fall mit Template, um die KB-Referenz zu sehen.
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, provide, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { findingsApi } from '@/api/findingsApi'
import { fetchPatientExaminationDraft } from '@/api/reportDraftApi'
import { fetchPatientCases, type PatientCase } from '@/api/casesApi'
import {
  fetchReportingLanguages,
  type ReportLanguageCode,
  type ReportLanguageOption
} from '@/api/reportingLanguagesApi'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'
import {
  buildReportTemplateRuntimePayload,
  describeReportTemplateTitle,
  fetchReportTemplateByName,
  fetchReportTemplatesByExamination
} from '@/api/reportTemplatesApi'
import {
  getFindingDisplayName,
  mergeFindingClassifications,
  type Finding,
  type FindingClassification
} from '@/api/findings.contract'
import type {
  InterventionValidatorExecution,
  ReportTemplateFinding,
  ReportTemplatePayload,
  ReportTemplateIdentity,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimePayload,
  RuntimeValidationIssue,
  UnitValidatorExecution
} from '@/types/reportTemplate'
import { resolveReportConceptCoverage } from '@/utils/reportConceptCoverage'
import { endpoints } from '@/types/api/endpoints'
import {
  isVerifiedRuntimeDraftForBundle,
  useReportingFlowStore,
  type ReportingRuntimeDraft
} from '@/stores/reportingFlowStore'
import { terminologyBatchImportMessage, useTerminologyStore } from '@/stores/terminologyStore'
import { fetchPatientTimelineLatest, pickPreferredReportStream } from '@/api/reportingTimelineApi'
import { useAuthenticatedVideoStream } from '@/composables/useAuthenticatedVideoStream'
import type { StreamableVideoFileType } from '@/utils/mediaUrls'
import { reportingApiError, reportingApiErrorMessage } from './reportingError'
import { createRuntimeLogger } from '@/utils/runtimeLogger'
import {
  reportTemplateLifecycleContextKey,
  type ReportTemplateLifecycleChange
} from './reportTemplateLifecycleContext'

const logger = createRuntimeLogger('reporting-shell')
import {
  conceptCoverageStatusLabel,
  conceptCoverageStatusTone,
  extractStringList,
  findingStatusIconClass,
  findingStatusLabel,
  formatCaseLabel,
  formatDateLabel,
  formatKnowledgeName,
  isGastroenterologyExaminationName,
  isVideoArtifactKind,
  normalizeKnowledgeKey as normalizeKey,
  normalizePatientExaminationOption,
  preferredArtifactKind,
  type FindingStatus,
  type PatientExaminationOption
} from './reportingShellPresentation'

const route = useRoute()
const router = useRouter()
const flow = useReportingFlowStore()
const terminology = useTerminologyStore()
const reportingVideoElement = ref<HTMLVideoElement | null>(null)
const selectedVideoArtifactKind = ref<StreamableVideoFileType>('processed')
const selectedFrameStreamUrl = ref<string | null>(null)
const isContextPanelOpen = ref(true)
const terminologyLoadPromise = ref<Promise<void> | null>(null)
const terminologyFolderInput = ref<HTMLInputElement | null>(null)
const terminologyZipInput = ref<HTMLInputElement | null>(null)
const terminologyImportMessage = ref('')
const reportLanguageOptions = ref<ReportLanguageOption[]>([])
const reportLanguagesLoading = ref(false)
const reportLanguagesError = ref<string | null>(null)
type FindingStatusRow = {
  key: string
  normalizedKey: string
  findingName: string
  label: string
  sectionKey: string
  sectionTitle: string
  anchorId: string
  required: boolean
  instanceCount: number
  status: FindingStatus
  statusLabel: string
  iconClass: string
  messages: string[]
  templateFinding: ReportTemplateFinding | null
}

type FindingStatusSection = {
  key: string
  title: string
  rows: FindingStatusRow[]
}

type KbClassificationReference = {
  key: string
  label: string
  required: boolean
  choicesLabel: string
  inputLabel: string
  description: string
}

type KbAdviceRow = {
  key: string
  kind: string
  title: string
  detail: string
  ok: boolean
  messages: string[]
}

const patientExaminationOptions = ref<PatientExaminationOption[]>([])
const patientExaminationOptionsLoading = ref(false)
const patientExaminationOptionsError = ref<string | null>(null)
const caseOptions = ref<PatientCase[]>([])
const caseOptionsLoading = ref(false)
const caseOptionsError = ref<string | null>(null)
const draftBootstrapInFlight = ref<{ key: string; promise: Promise<void> } | null>(null)
const draftBootstrapError = ref<string | null>(null)
const patientExaminationDetail = ref<Record<string, unknown> | null>(null)
const templateReference = ref<ReportTemplatePayload | null>(null)
const templateReferenceLoading = ref(false)
const templateReferenceError = ref<string | null>(null)
const templateReferenceKey = ref<string | null>(null)
const availableTemplates = ref<ReportTemplatePayload[]>([])
const templateLoading = ref(false)
const templateSelectionError = ref<string | null>(null)
const selectedReferenceFindingKey = ref<string | null>(null)
const findingCatalog = ref<Finding[]>([])
const findingCatalogLoading = ref(false)
let draftBootstrapGeneration = 0
let findingCatalogRequestGeneration = 0
let patientOptionsRequestGeneration = 0
let caseOptionsRequestGeneration = 0
let mediaPreloadRequestGeneration = 0
let routeContextWatchGeneration = 0

type DraftBootstrapContext = {
  generation: number
  patientExaminationId: number
  bundleKey: string
  moduleName: string
}

class SupersededReportingContextError extends Error {}

class IncompatibleReportingDraftError extends Error {}

const emptyTemplateIdentity: ReportTemplateIdentity = {
  moduleName: null,
  knowledgeBaseVersion: null,
  templateVersion: null,
  templateHash: null,
  lifecycleStatus: null,
  readiness: null
}
const routePatientExaminationId = computed<number | null>(() => {
  const parsed = Number(route.params.patient_examination_id)
  if (!Number.isFinite(parsed)) return null
  return parsed > 0 ? parsed : null
})
const routePatientId = computed<number | null>(() => {
  const query = readRecord(route.query)
  const rawPatientId = query.patient_id
  const value = isUnknownArray(rawPatientId) ? rawPatientId[0] : rawPatientId
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
})
const selectedPatientExaminationId = computed(
  () => routePatientExaminationId.value ?? flow.patientExaminationId ?? ''
)
const activePatientExaminationId = computed(
  () => routePatientExaminationId.value ?? flow.patientExaminationId
)
const findingsStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/findings`
    : '/reporting/case-setup'
)
const reportEditorStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/report-editor`
    : '/reporting/case-setup'
)
const frameSelectorStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/frame-selector`
    : '/reporting/case-setup'
)
const reportExportStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/report-export`
    : '/reporting/case-setup'
)
const finalizedStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/finalized`
    : '/reporting/case-setup'
)
const reportEditorTarget = computed(() => {
  if (!activePatientExaminationId.value) return null
  return `/reporting/${String(activePatientExaminationId.value)}/report-editor`
})
const canNavigateToReportEditor = computed(() => Boolean(reportEditorTarget.value))

watch(
  routePatientId,
  async (patientId) => {
    if (patientId && patientId !== flow.selectedPatientId) {
      if (!(await flushDraftBeforeContextSwitch(null))) return
      draftBootstrapGeneration += 1
      draftBootstrapInFlight.value = null
      flow.setPatientExaminationContext({
        patientExaminationId: null,
        selectedPatientId: patientId,
        selectedExaminationId: null
      })
      flow.setCaseContext({ caseId: null })
    }
  },
  { immediate: true }
)

const navItems = computed(() => [
  {
    label: 'Berichtsvorlagen',
    to: '/reporting/template-builder',
    requiresPatientExamination: false
  },
  { label: 'Arbeitsliste', to: '/reporting', requiresPatientExamination: false },
  { label: 'Falldaten', to: '/reporting/case-setup', requiresPatientExamination: false },
  {
    label: 'Befunde',
    to: findingsStepTarget.value,
    requiresPatientExamination: true
  },
  {
    label: 'Bericht schreiben',
    to: reportEditorStepTarget.value,
    requiresPatientExamination: true,
    requiresVerifiedTemplate: true
  },
  {
    label: 'Bilder auswählen',
    to: frameSelectorStepTarget.value,
    requiresPatientExamination: true
  },
  {
    label: 'Report export',
    to: reportExportStepTarget.value,
    requiresPatientExamination: true,
    requiresVerifiedTemplate: true
  },
  {
    label: 'Abschluss',
    to: finalizedStepTarget.value,
    requiresPatientExamination: true,
    requiresVerifiedTemplate: true
  }
])

const preferredReportStream = computed(() =>
  pickPreferredReportStream(flow.mediaPreload?.latestReport?.streamOptions || [])
)

const preferredReportDownload = computed(() =>
  preferredReportStream.value
    ? `${preferredReportStream.value}${preferredReportStream.value.includes('?') ? '&' : '?'}download=1`
    : null
)

const reportingVideoId = computed(() => flow.mediaPreload?.latestVideo?.id ?? null)
const preferredVideoArtifactKind = computed<StreamableVideoFileType | null>(() =>
  preferredArtifactKind(flow.mediaPreload?.latestVideo?.streamOptions || [])
)

const { playbackError: reportingVideoPlaybackError } = useAuthenticatedVideoStream({
  videoElement: reportingVideoElement,
  videoId: reportingVideoId,
  artifactKind: selectedVideoArtifactKind,
  enabled: computed(() => reportingVideoId.value !== null)
})

const activeKbModule = computed(() =>
  terminology.activeBundle ? terminology.activeModuleName : ''
)

provide(reportTemplateLifecycleContextKey, {
  activeModuleName: activeKbModule,
  notifyLifecycleChanged: refreshPublishedTemplatesAfterLifecycleChange
})

const activeBundleIdentityKey = computed(() => {
  const bundle = terminology.activeBundle
  return bundle ? `${bundle.moduleName}@@${bundle.version}` : ''
})
const hasVerifiedTemplateContext = computed(() =>
  isVerifiedRuntimeDraftForBundle(
    flow.currentRuntimeDraft,
    terminology.activeBundle,
    flow.patientExaminationId
  )
)
let lastReconciledBundleIdentity: string | null = null

function isBootstrapContextCurrent(context: DraftBootstrapContext): boolean {
  return (
    context.generation === draftBootstrapGeneration &&
    context.patientExaminationId === routePatientExaminationId.value &&
    context.bundleKey === activeBundleIdentityKey.value &&
    context.moduleName === activeKbModule.value
  )
}

function assertBootstrapContextCurrent(context?: DraftBootstrapContext): void {
  if (context && !isBootstrapContextCurrent(context)) {
    throw new SupersededReportingContextError('Reporting context changed during loading.')
  }
}

const draftSummaryLabel = computed(() => {
  const draft = flow.currentRuntimeDraft
  if (!draft) return 'leer'
  if (draft.verificationStatus === 'unverified') return 'vorhanden · ungeprüft'
  return draft.hydratedFrom === 'session_storage' || draft.hydratedFrom === 'draft_api'
    ? 'wiederhergestellt'
    : 'initialisiert'
})

const selectedPatientExaminationLabel = computed(() => {
  const selected =
    patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
    patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
    null
  if (selected) return selected.label
  return flow.patientExaminationId ? `#${String(flow.patientExaminationId)}` : 'Noch nicht gewählt'
})

const selectedTemplateLabel = computed(() =>
  flow.selectedTemplateName
    ? describeReportTemplateTitle(flow.selectedTemplateName)
    : 'Noch keine Vorlage gewählt'
)

const selectedTerminologyLabel = computed(() => {
  const field = terminology.medicalFieldLabel
  const bundle = terminology.activeBundle
    ? terminology.activeBundleLabel
    : 'Keine aktive Terminologie'
  return `${field} · ${bundle}`
})

const selectedReportLanguageLabel = computed(
  () =>
    reportLanguageOptions.value.find((option) => option.code === flow.selectedReportLanguage)
      ?.label || flow.selectedReportLanguage.toUpperCase()
)

const visibleTerminologyBundles = computed(() => {
  return terminology.filteredBundles.length ? terminology.filteredBundles : terminology.bundles
})

async function loadReportingLanguages() {
  reportLanguagesLoading.value = true
  reportLanguagesError.value = null
  try {
    const response = await fetchReportingLanguages()
    reportLanguageOptions.value = response.languages
    if (!response.languages.some((option) => option.code === flow.selectedReportLanguage)) {
      flow.setReportLanguage(response.defaultLanguage)
    }
  } catch (error) {
    reportLanguageOptions.value = []
    reportLanguagesError.value = reportingApiErrorMessage(
      error,
      'Berichtssprachen konnten nicht geladen werden.'
    )
  } finally {
    reportLanguagesLoading.value = false
  }
}

const currentStepLabel = computed(() => {
  const current = navItems.value.find((item) => isActive(item.to))
  return current?.label || 'Arbeitsbereich'
})

const mediaPreloadLabel = computed(() => {
  if (flow.mediaPreloadStatus === 'idle') return 'nicht geladen'
  if (flow.mediaPreloadStatus === 'loading') return 'wird geladen'
  if (flow.mediaPreloadStatus === 'error') return 'Fehler'
  return 'bereit'
})

const selectedPatientExaminationOption = computed(() => {
  return (
    patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
    patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
    null
  )
})

const currentPayload = computed(() => flow.currentRuntimeDraft?.payload || null)

const caseIdLabel = computed(() => flow.caseId || 'Noch nicht gewählt')

const selectedPatientCase = computed(
  () => caseOptions.value.find((patientCase) => patientCase.caseId === flow.caseId) || null
)

const patientHeaderLabel = computed(() => {
  const timelinePatient = flow.mediaPreload?.patient || null
  const timelineName = [timelinePatient?.firstName, timelinePatient?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (timelineName) return timelineName
  if (timelinePatient?.patientHash) return timelinePatient.patientHash

  const detailPatient = readRecord(patientExaminationDetail.value?.patient)
  const detailName = [
    readString(detailPatient, 'firstName', 'first_name', 'givenName', 'given_name'),
    readString(detailPatient, 'lastName', 'last_name', 'familyName', 'family_name')
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (detailName) return detailName

  const detailHash = readString(detailPatient, 'patientHash', 'patient_hash', 'hash', 'pseudonym')
  if (detailHash) return detailHash
  if (currentPayload.value?.patient) return currentPayload.value.patient
  return flow.selectedPatientId ? `Patient #${String(flow.selectedPatientId)}` : 'Nicht gewählt'
})

const patientBirthDateLabel = computed(() => {
  const detailPatient = readRecord(patientExaminationDetail.value?.patient)
  const value =
    flow.mediaPreload?.patient.dob ||
    readString(
      detailPatient,
      'dob',
      'dateOfBirth',
      'date_of_birth',
      'birthDate',
      'birth_date',
      'patientDob',
      'patient_dob'
    ) ||
    readString(
      patientExaminationDetail.value,
      'patientBirthDate',
      'patient_birth_date',
      'patientDob',
      'patient_dob'
    )
  return formatDateLabel(value) || 'Nicht verfügbar'
})

const examinationTypeLabel = computed(() => {
  return (
    selectedPatientExaminationOption.value?.examinationName ||
    readString(
      readRecord(patientExaminationDetail.value?.examination),
      'displayName',
      'display_name',
      'name'
    ) ||
    readString(patientExaminationDetail.value, 'examinationName', 'examination_name') ||
    currentPayload.value?.examination ||
    'Nicht gewählt'
  )
})

const caseStatusLabel = computed(() => {
  if (selectedPatientCase.value?.isClosed) return 'Fall geschlossen'
  if (selectedPatientCase.value?.isActive) return 'Fall aktiv'
  if (selectedPatientCase.value) return 'Fall inaktiv'
  return (
    readString(
      patientExaminationDetail.value,
      'status',
      'workflowStatus',
      'workflow_status',
      'state'
    ) ||
    (flow.lastTemplateValidation
      ? flow.lastTemplateValidation.ok
        ? 'Befund valide'
        : 'Befund offen'
      : flow.currentRuntimeDraft
        ? 'Entwurf'
        : 'Nicht vorbereitet')
  )
})

const validationStatusLabel = computed(() => {
  if (!flow.lastTemplateValidation) return 'ungeprüft'
  return flow.lastTemplateValidation.ok ? 'valide' : 'offen'
})

const validationStatusPillClass = computed(() => {
  if (!flow.lastTemplateValidation) return 'is-idle'
  return flow.lastTemplateValidation.ok ? 'is-ready' : 'is-error'
})

const templateSectionsForReference = computed(() =>
  (templateReference.value?.reportSections || [])
    .slice()
    .sort((left, right) => (left.position || 0) - (right.position || 0))
)

const conceptCoverage = computed(() =>
  resolveReportConceptCoverage({
    serverCoverage: templateReference.value?.conceptCoverage || null,
    sections: templateSectionsForReference.value,
    payload: currentPayload.value,
    validation: flow.lastTemplateValidation
  })
)

const conceptCoverageSubtitle = computed(() => {
  const identity = terminology.activeBundle
    ? templateReference.value?.identity || flow.selectedTemplateIdentity
    : null
  const moduleName = activeKbModule.value || 'Keine aktive Terminologie'
  const version =
    identity?.knowledgeBaseVersion || terminology.activeBundle?.version || 'Version unbekannt'
  return `${moduleName} · ${version}`
})

const conceptCoverageSummaryLabel = computed(() => {
  const counts = conceptCoverage.value.counts
  if (!conceptCoverage.value.items.length) return 'ungeprüft'
  if (counts.invalid || counts.missing) return `${String(counts.invalid + counts.missing)} offen`
  if (counts.unknown) return `${String(counts.unknown)} ungeklärt`
  return `${String(counts.present)} nachgewiesen`
})

const conceptCoveragePillClass = computed(() => {
  const counts = conceptCoverage.value.counts
  if (!conceptCoverage.value.items.length) return 'is-idle'
  if (counts.invalid || counts.missing) return 'is-error'
  if (counts.unknown) return 'is-warning'
  return 'is-ready'
})

const catalogFindingsByName = computed(() => {
  const entries = findingCatalog.value.map(
    (finding) => [normalizeKey(finding.name), finding] as const
  )
  return new Map<string, Finding>(entries)
})

const validationIssueMessagesByFinding = computed(() => {
  const grouped = new Map<string, string[]>()
  const addMessages = (findingName: string, messages: string[]) => {
    const key = normalizeKey(findingName)
    const current = grouped.get(key) || []
    grouped.set(key, Array.from(new Set([...current, ...messages.filter(Boolean)])))
  }

  for (const validator of flow.lastTemplateValidation?.findingsValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length) messages.push(`Regel "${validator.name}" ist offen.`)
    addMessages(validator.finding, messages)
  }
  for (const validator of flow.lastTemplateValidation?.classificationValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length)
      messages.push(`Klassifikation "${validator.classification}" prüfen.`)
    addMessages(validator.finding, messages)
  }
  for (const validator of flow.lastTemplateValidation?.interventionValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length)
      messages.push(`Intervention "${validator.intervention}" prüfen.`)
    addMessages(validator.finding, messages)
  }
  for (const validator of flow.lastTemplateValidation?.unitValidators || []) {
    const messages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !messages.length) messages.push(`Einheit "${validator.unit}" prüfen.`)
    addMessages(validator.finding, messages)
  }

  return grouped
})

const findingStatusRows = computed<FindingStatusRow[]>(() => {
  const rows: FindingStatusRow[] = []

  for (const section of templateSectionsForReference.value) {
    const sectionKey = normalizeKey(section.name)
    const sectionTitle = formatKnowledgeName(section.name)
    for (const templateFinding of section.findings) {
      rows.push(
        buildFindingStatusRow({
          findingName: templateFinding.finding,
          sectionKey,
          sectionTitle,
          required: templateFinding.required,
          templateFinding
        })
      )
    }
  }

  if (rows.length) return rows

  return (currentPayload.value?.patientFindings || []).map((finding) =>
    buildFindingStatusRow({
      findingName: finding.finding,
      sectionKey: 'runtime_draft',
      sectionTitle: 'Lokaler Entwurf',
      required: false,
      templateFinding: null
    })
  )
})

const findingStatusSections = computed<FindingStatusSection[]>(() => {
  const sections = new Map<string, FindingStatusSection>()
  for (const row of findingStatusRows.value) {
    if (!sections.has(row.sectionKey)) {
      sections.set(row.sectionKey, {
        key: row.sectionKey,
        title: row.sectionTitle,
        rows: []
      })
    }
    sections.get(row.sectionKey)?.rows.push(row)
  }
  return Array.from(sections.values())
})

const findingProgressSummary = computed(() => {
  const rows = findingStatusRows.value
  if (!rows.length) return 'Keine Befunde'
  const complete = rows.filter((row) => row.status === 'complete').length
  const open = rows.filter((row) => row.status === 'warning' || row.status === 'missing').length
  return open
    ? `${String(complete)}/${String(rows.length)} vollständig · ${String(open)} offen`
    : `${String(complete)}/${String(rows.length)} vollständig`
})

const routeReferenceFindingKey = computed(() => {
  const hash = typeof route.hash === 'string' ? route.hash : ''
  const match = hash.match(/^#finding-(.+)$/)
  return match ? normalizeKey(match[1]) : null
})

const activeReferenceFindingKey = computed(() => {
  const availableKeys = new Set(findingStatusRows.value.map((row) => row.normalizedKey))
  if (selectedReferenceFindingKey.value && availableKeys.has(selectedReferenceFindingKey.value)) {
    return selectedReferenceFindingKey.value
  }
  if (routeReferenceFindingKey.value && availableKeys.has(routeReferenceFindingKey.value)) {
    return routeReferenceFindingKey.value
  }
  return (
    findingStatusRows.value.find((row) => row.status === 'warning' || row.status === 'missing')
      ?.normalizedKey ||
    findingStatusRows.value[0]?.normalizedKey ||
    null
  )
})

const activeReferenceFinding = computed(
  () =>
    findingStatusRows.value.find((row) => row.normalizedKey === activeReferenceFindingKey.value) ||
    null
)

const activeFindingInstances = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) return []
  return instancesForFinding(active.findingName)
})

const activeFindingCatalogDefinition = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) return null
  return catalogFindingsByName.value.get(normalizeKey(active.findingName)) || null
})

const activeFindingDescription = computed(() => {
  const description = activeFindingCatalogDefinition.value?.description.trim()
  return description || 'Keine Beschreibung in der geladenen KB-Definition.'
})

const activeReferenceClassifications = computed<KbClassificationReference[]>(() => {
  const active = activeReferenceFinding.value
  if (!active) return []

  const templateClassifications = active.templateFinding?.classifications || []
  const catalogClassifications = mergeFindingClassifications(activeFindingCatalogDefinition.value)
  const catalogByName = new Map<string, FindingClassification>(
    catalogClassifications.map((classification) => [
      normalizeKey(classification.name),
      classification
    ])
  )
  const templateKeys = templateClassifications.map((classification) =>
    normalizeKey(classification.classification)
  )
  const source =
    templateClassifications.length > 0
      ? templateClassifications.map((classification) => ({
          key: normalizeKey(classification.classification),
          name: classification.classification,
          required: classification.required,
          input: classification.input
        }))
      : catalogClassifications.map((classification) => ({
          key: normalizeKey(classification.name),
          name: classification.name,
          required: classification.required,
          input: null
        }))

  return source
    .filter((classification, index, all) => {
      if (templateKeys.length && !templateKeys.includes(classification.key)) return false
      return all.findIndex((entry) => entry.key === classification.key) === index
    })
    .map((classification) => {
      const catalog = catalogByName.get(classification.key)
      const choices = (catalog?.choices || [])
        .map((choice) => choice.displayName || choice.name)
        .filter(Boolean)
      const descriptorInputs = (classification.input?.choices || []).flatMap(
        (choice) => choice.descriptors
      )
      const descriptorLabels = Array.from(
        new Set(
          descriptorInputs.map((descriptor) => {
            const unit = descriptor.unitAbbreviation || descriptor.unit
            return unit ? `${descriptor.type} (${unit})` : descriptor.type
          })
        )
      )
      return {
        key: classification.key,
        label: catalog?.displayName || formatKnowledgeName(classification.name),
        required: classification.required,
        choicesLabel: choices.length ? `Werte: ${choices.join(', ')}` : '',
        inputLabel: descriptorLabels.length
          ? `Erforderliche Eingabe: ${descriptorLabels.join(', ')}`
          : '',
        description: catalog?.description || ''
      }
    })
})

const activeAdviceRows = computed<KbAdviceRow[]>(() => {
  const active = activeReferenceFinding.value
  if (!active) return []
  return [...interventionAdviceRows(active.findingName), ...unitAdviceRows(active.findingName)]
})

const activeSuggestedActions = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) return []
  const suggestions = [
    ...collectValidatorSuggestions(interventionValidatorsForFinding(active.findingName)),
    ...collectValidatorSuggestions(unitValidatorsForFinding(active.findingName)),
    ...collectIssueSuggestions(flow.lastTemplateValidation?.issues || [])
  ]
  return Array.from(new Set(suggestions))
})

const kbReferenceSubtitle = computed(() => {
  const moduleName = activeKbModule.value || 'Keine aktive Terminologie'
  const templateName = templateReference.value?.name || flow.selectedTemplateName
  if (!templateName) return `${moduleName} · kein Template`
  return `${moduleName} · ${templateName}`
})

const nextStepHint = computed(() => {
  if (!flow.patientExaminationId) {
    return 'Wählen Sie zuerst eine Patientenuntersuchung, um Befunde und Bericht zu bearbeiten.'
  }
  if (!flow.currentRuntimeDraft) {
    if (!terminology.activeBundle) {
      return 'Annotation und Medien bleiben verfügbar. Für den Bericht zuerst ein passendes Terminologiepaket installieren oder aktivieren.'
    }
    if (draftBootstrapError.value) {
      return 'Reporting konnte nicht vorbereitet werden. Terminologie, Untersuchung und veröffentlichte Vorlage prüfen.'
    }
    return 'Der Entwurf wird vorbereitet. Danach können Sie direkt mit den Befunden starten.'
  }
  if (flow.currentRuntimeDraft.verificationStatus === 'unverified') {
    return 'Befunde bleiben bearbeitbar; Vorlage, Vollständigkeitsprüfung und Finalisierung sind noch nicht verifiziert.'
  }
  if (route.path.includes('/report-editor')) {
    return 'Bericht prüfen, Text ergänzen und anschließend zum Abschluss wechseln.'
  }
  if (route.path.includes('/frame-selector')) {
    return 'Passende Bilder auswählen und danach den Bericht abschließen.'
  }
  return 'Beginnen Sie mit den Befunden und arbeiten Sie sich dann zum Bericht vor.'
})

function openUrl(url: string | null) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function selectVideoStream(artifactKind: string | null) {
  if (!isVideoArtifactKind(artifactKind)) return
  selectedVideoArtifactKind.value = artifactKind
}

function selectFrameStream(url: string | null) {
  selectedFrameStreamUrl.value = url
}

function openTerminologyFolderPicker() {
  terminologyImportMessage.value = ''
  terminologyFolderInput.value?.click()
}

function openTerminologyZipPicker() {
  terminologyImportMessage.value = ''
  terminologyZipInput.value?.click()
}

function navigateToReportEditor() {
  if (!reportEditorTarget.value) return
  void router.push(reportEditorTarget.value)
}

async function onTerminologyBundleSelect(bundleKey: string) {
  const bundle = terminology.findBundleByKey(bundleKey)
  if (!bundle) return
  terminologyImportMessage.value = ''
  try {
    if (flow.hasUnpersistedDraftChanges) await flow.flushDraftAutosave()
    await terminology.selectBundle(bundle)
    await reconcileActiveTerminology()
  } catch (error: unknown) {
    terminologyImportMessage.value =
      terminology.error ||
      reportingApiErrorMessage(error, 'Terminologiepaket konnte nicht aktiviert werden.')
  }
}

async function retryTerminologyBundles() {
  terminologyImportMessage.value = ''
  try {
    await terminology.loadBundles()
    lastReconciledBundleIdentity = null
    await reconcileActiveTerminology()
  } catch (error: unknown) {
    terminologyImportMessage.value = reportingApiErrorMessage(
      error,
      'Terminologieregister konnte nicht geladen werden.'
    )
  }
}

async function importTerminologyFolder(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return

  terminologyImportMessage.value = ''
  try {
    if (flow.hasUnpersistedDraftChanges) await flow.flushDraftAutosave()
    const result = await terminology.importBundleFolders(files)
    terminologyImportMessage.value = terminologyBatchImportMessage(result)
    if (result.imported.length) await reconcileActiveTerminology()
  } catch (error: unknown) {
    terminologyImportMessage.value =
      terminology.error ||
      reportingApiErrorMessage(error, 'Terminologiepaket konnte nicht importiert werden.')
  } finally {
    input.value = ''
  }
}

async function importTerminologyZip(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return

  terminologyImportMessage.value = ''
  try {
    if (flow.hasUnpersistedDraftChanges) await flow.flushDraftAutosave()
    const result = await terminology.importBundles(files)
    terminologyImportMessage.value = terminologyBatchImportMessage(result)
    if (result.imported.length) await reconcileActiveTerminology()
  } catch (error: unknown) {
    terminologyImportMessage.value =
      terminology.error ||
      reportingApiErrorMessage(error, 'Terminologiepaket konnte nicht importiert werden.')
  } finally {
    input.value = ''
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function readListPayload(value: unknown): unknown[] {
  if (isUnknownArray(value)) return value
  const results = readRecord(value).results
  if (isUnknownArray(results)) return results
  throw new TypeError('Patient examination list response must contain an array.')
}

function readString(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function findingAnchorId(findingName: string): string {
  return `finding-${normalizeKey(findingName)}`
}

function getFindingLabel(findingName: string): string {
  const finding = catalogFindingsByName.value.get(normalizeKey(findingName))
  return finding ? getFindingDisplayName(finding) : formatKnowledgeName(findingName)
}

function instancesForFinding(findingName: string): ReportTemplateRuntimePatientFindingInput[] {
  const key = normalizeKey(findingName)
  return (currentPayload.value?.patientFindings || []).filter(
    (finding) => normalizeKey(finding.finding) === key
  )
}

function requiredClassificationsMissing(
  templateFinding: ReportTemplateFinding | null,
  instances: ReportTemplateRuntimePatientFindingInput[]
): string[] {
  const required = (templateFinding?.classifications || []).filter(
    (classification) => classification.required
  )
  return required
    .filter((classification) => {
      const key = normalizeKey(classification.classification)
      return !instances.some((instance) => {
        return instance.classificationChoices.some((choice) => {
          if (
            normalizeKey(choice.classification) !== key ||
            typeof choice.classificationChoice !== 'string' ||
            !choice.classificationChoice.trim()
          ) {
            return false
          }

          const inputChoice = classification.input?.choices.find(
            (entry) => normalizeKey(entry.name) === normalizeKey(choice.classificationChoice)
          )
          if (!inputChoice?.descriptors.length) return true
          return inputChoice.descriptors.every((descriptorInput) => {
            const descriptor = choice.descriptors.find(
              (entry) =>
                normalizeKey(entry.classificationChoiceDescriptor) ===
                normalizeKey(descriptorInput.name)
            )
            const value = descriptor?.descriptorValue
            return (
              value !== null &&
              value !== undefined &&
              (typeof value !== 'string' || value.trim().length > 0)
            )
          })
        })
      })
    })
    .map((classification) => formatKnowledgeName(classification.classification))
}

function buildFindingStatusRow(params: {
  findingName: string
  sectionKey: string
  sectionTitle: string
  required: boolean
  templateFinding: ReportTemplateFinding | null
}): FindingStatusRow {
  const normalizedKey = normalizeKey(params.findingName)
  const instances = instancesForFinding(params.findingName)
  const validationMessages = validationIssueMessagesByFinding.value.get(normalizedKey) || []
  const missingClassifications = requiredClassificationsMissing(params.templateFinding, instances)
  const messages = Array.from(
    new Set([
      ...validationMessages,
      ...(params.required && !instances.length
        ? ['Dieser Befund ist im Template erforderlich.']
        : []),
      ...(missingClassifications.length
        ? [`Erforderliche Klassifikationen fehlen: ${missingClassifications.join(', ')}.`]
        : [])
    ])
  )

  let status: FindingStatus = 'empty'
  if (params.required && !instances.length) status = 'missing'
  else if (validationMessages.length || missingClassifications.length) status = 'warning'
  else if (instances.length) status = 'complete'

  return {
    key: `${params.sectionKey}:${normalizedKey}`,
    normalizedKey,
    findingName: params.findingName,
    label: getFindingLabel(params.findingName),
    sectionKey: params.sectionKey,
    sectionTitle: params.sectionTitle,
    anchorId: findingAnchorId(params.findingName),
    required: params.required,
    instanceCount: instances.length,
    status,
    statusLabel: findingStatusLabel(status, params.required),
    iconClass: findingStatusIconClass(status),
    messages,
    templateFinding: params.templateFinding
  }
}

function findingStatusTarget(row: FindingStatusRow) {
  const patientExaminationId = flow.patientExaminationId || routePatientExaminationId.value
  if (!patientExaminationId) return { path: route.path, hash: `#${row.anchorId}` }
  return {
    path: `/reporting/${String(patientExaminationId)}/findings`,
    hash: `#${row.anchorId}`
  }
}

function validatorsForFinding<T extends { finding: string }>(
  validators: T[] | undefined,
  findingName: string
): T[] {
  const key = normalizeKey(findingName)
  return (validators || []).filter((validator) => normalizeKey(validator.finding) === key)
}

function interventionValidatorsForFinding(findingName: string): InterventionValidatorExecution[] {
  return validatorsForFinding(flow.lastTemplateValidation?.interventionValidators, findingName)
}

function unitValidatorsForFinding(findingName: string): UnitValidatorExecution[] {
  return validatorsForFinding(flow.lastTemplateValidation?.unitValidators, findingName)
}

function interventionAdviceRows(findingName: string): KbAdviceRow[] {
  return interventionValidatorsForFinding(findingName).map((validator) => ({
    key: `intervention:${validator.name}`,
    kind: 'Intervention',
    title: formatKnowledgeName(validator.intervention),
    detail: validator.ok ? 'Regel erfüllt' : `Erforderlich nach Regel "${validator.name}"`,
    ok: validator.ok,
    messages: validator.issues.map((issue) => issue.message)
  }))
}

function unitAdviceRows(findingName: string): KbAdviceRow[] {
  return unitValidatorsForFinding(findingName).map((validator) => ({
    key: `unit:${validator.name}`,
    kind: 'Einheit',
    title: validator.unit,
    detail: validator.ok
      ? `${formatKnowledgeName(validator.classification)} verwendet die erwartete Einheit.`
      : `${formatKnowledgeName(validator.classification)} erwartet "${validator.unit}".`,
    ok: validator.ok,
    messages: validator.issues.map((issue) => issue.message)
  }))
}

function collectIssueSuggestions(issues: RuntimeValidationIssue[]): string[] {
  return issues.flatMap((issue) => [
    ...extractStringList(issue.details?.suggestedActions),
    ...extractStringList(issue.details?.suggested_actions),
    ...extractStringList(issue.details?.recommendations)
  ])
}

function collectValidatorSuggestions(
  validators: Array<{ hint: Record<string, unknown>; issues: RuntimeValidationIssue[] }>
): string[] {
  return validators.flatMap((validator) => [
    ...extractStringList(validator.hint.suggestedActions),
    ...extractStringList(validator.hint.suggested_actions),
    ...extractStringList(validator.hint.suggestions),
    ...extractStringList(validator.hint.recommendations),
    ...collectIssueSuggestions(validator.issues)
  ])
}

function formatDescriptorValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return '[Ungültiger Deskriptorwert]'
}

function formatRuntimeFindingInstance(instance: ReportTemplateRuntimePatientFindingInput): string {
  if (!instance.classificationChoices.length) return 'Keine Klassifikation gesetzt'
  return instance.classificationChoices
    .map((choice) => {
      const descriptors = choice.descriptors
        .map(
          (descriptor) =>
            `${formatKnowledgeName(descriptor.classificationChoiceDescriptor)}: ${formatDescriptorValue(descriptor.descriptorValue)}`
        )
        .join(', ')
      const base = `${formatKnowledgeName(choice.classification)} = ${formatKnowledgeName(choice.classificationChoice)}`
      return descriptors ? `${base} (${descriptors})` : base
    })
    .join(' · ')
}

function clearInactiveTerminologySelection() {
  if (terminology.activeBundle) return
  markCurrentDraftUnverified()
  flow.setTemplateSelection({
    moduleName: '',
    templateName: null,
    templateIdentity: null
  })
  templateReference.value = null
  templateReferenceKey.value = null
}

function markCurrentDraftUnverified() {
  const draft = flow.currentRuntimeDraft
  if (!draft || draft.verificationStatus === 'unverified') return
  const activeBundle = terminology.activeBundle
  const draftVersion =
    draft.templateIdentity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
  if (
    activeBundle &&
    draft.moduleName === activeBundle.moduleName &&
    draftVersion === activeBundle.version &&
    draft.verificationStatus === 'verified'
  ) {
    return
  }
  flow.setRuntimeDraft({
    ...draft,
    verificationStatus: 'unverified',
    persistencePolicy: 'blocked_until_verified'
  })
}

function clearTerminologyDerivedViewState() {
  availableTemplates.value = []
  templateLoading.value = false
  templateSelectionError.value = null
  templateReference.value = null
  templateReferenceKey.value = null
  templateReferenceError.value = null
  templateReferenceLoading.value = false
  draftBootstrapError.value = null
  selectedReferenceFindingKey.value = null
}

async function reconcileActiveTerminology() {
  const bundleIdentity = activeBundleIdentityKey.value
  if (lastReconciledBundleIdentity === bundleIdentity) return
  if (flow.hasUnpersistedDraftChanges) {
    try {
      await flow.flushDraftAutosave()
    } catch (error: unknown) {
      draftBootstrapError.value = `Der aktuelle Entwurf konnte vor dem Terminologiewechsel nicht gespeichert werden. ${reportingApiErrorMessage(error, 'Bitte erneut versuchen.')}`
      return
    }
  }
  draftBootstrapGeneration += 1
  draftBootstrapInFlight.value = null
  markCurrentDraftUnverified()
  clearTerminologyDerivedViewState()

  if (!terminology.activeBundle) {
    clearInactiveTerminologySelection()
    lastReconciledBundleIdentity = bundleIdentity
    return
  }

  flow.setTemplateSelection({
    moduleName: terminology.activeBundle.moduleName,
    templateName: flow.currentRuntimeDraft?.templateName || flow.selectedTemplateName,
    templateIdentity: null
  })
  const patientExaminationId = routePatientExaminationId.value
  if (patientExaminationId) {
    await hydrateDraftForRoutePatientExamination(patientExaminationId)
  }
  if (!draftBootstrapError.value) lastReconciledBundleIdentity = bundleIdentity
}

function ensureTerminologyBundlesLoaded(): Promise<void> {
  if (terminology.activeBundle || terminology.bundles.length || terminology.error) {
    clearInactiveTerminologySelection()
    return Promise.resolve()
  }
  if (terminologyLoadPromise.value) return terminologyLoadPromise.value

  const task = terminology
    .loadBundles()
    .then(() => {
      clearInactiveTerminologySelection()
    })
    .catch((error: unknown) => {
      logger.error('terminology-load-failed', error)
    })
    .finally(() => {
      terminologyLoadPromise.value = null
    })
  terminologyLoadPromise.value = task
  return task
}

async function loadTemplateReferenceForSelection() {
  const moduleName = activeKbModule.value
  const templateName = flow.selectedTemplateName
  if (!moduleName || !templateName) {
    templateReference.value = null
    templateReferenceKey.value = null
    templateReferenceError.value = null
    templateReferenceLoading.value = false
    return
  }

  const nextKey = `${activeBundleIdentityKey.value}:${templateName}`
  if (templateReferenceKey.value === nextKey && templateReference.value) return

  templateReferenceLoading.value = true
  templateReferenceError.value = null
  templateReferenceKey.value = nextKey
  try {
    const payload = await fetchReportTemplateByName(moduleName, templateName)
    if (templateReferenceKey.value !== nextKey) return
    templateReference.value = payload
  } catch (error: unknown) {
    if (templateReferenceKey.value !== nextKey) return
    templateReference.value = null
    templateReferenceError.value = reportingApiErrorMessage(
      error,
      'KB-Referenz konnte nicht geladen werden.'
    )
  } finally {
    if (templateReferenceKey.value === nextKey) {
      templateReferenceLoading.value = false
    }
  }
}

async function loadFindingCatalogForExamination(examinationId: number | null | undefined) {
  const requestGeneration = ++findingCatalogRequestGeneration
  if (!examinationId) {
    findingCatalog.value = []
    findingCatalogLoading.value = false
    return
  }
  findingCatalogLoading.value = true
  try {
    const rows = await findingsApi.getExaminationFindings(examinationId)
    if (
      requestGeneration !== findingCatalogRequestGeneration ||
      examinationId !== flow.selectedExaminationId
    ) {
      return
    }
    findingCatalog.value = Array.isArray(rows) ? rows : []
  } catch {
    if (requestGeneration !== findingCatalogRequestGeneration) return
    findingCatalog.value = []
  } finally {
    if (requestGeneration === findingCatalogRequestGeneration) {
      findingCatalogLoading.value = false
    }
  }
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function resolvePatientKey(raw: Record<string, unknown>, patientExaminationId: number): string {
  const patient = readRecord(raw.patient)
  const patientHash =
    (typeof patient.patient_hash === 'string' && patient.patient_hash.trim()) ||
    (typeof patient.patientHash === 'string' && patient.patientHash.trim()) ||
    (typeof raw.patient_hash === 'string' && raw.patient_hash.trim()) ||
    (typeof raw.patientHash === 'string' && raw.patientHash.trim())
  if (patientHash) return patientHash
  const patientId = toPositiveInteger(patient.id ?? raw.patient_id ?? raw.patientId)
  return patientId
    ? `patient_${String(patientId)}`
    : `patient_examination_${String(patientExaminationId)}`
}

function firstTrimmedString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function normalizeExaminer(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() || null
  if (!entry || typeof entry !== 'object') return null

  const row = entry as Record<string, unknown>
  const examinerKey = firstTrimmedString(row, [
    'examiner_hash',
    'examinerHash',
    'username',
    'email',
    'display_name',
    'displayName',
    'full_name',
    'fullName',
    'name'
  ])
  if (examinerKey) return examinerKey

  const firstName = firstTrimmedString(row, ['first_name', 'firstName']) ?? ''
  const lastName = firstTrimmedString(row, ['last_name', 'lastName']) ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  if (fullName) return fullName

  const examinerId = toPositiveInteger(row.id)
  return examinerId ? `examiner_${String(examinerId)}` : null
}

function extractExaminers(raw: Record<string, unknown>): string[] {
  const examination = readRecord(raw.examination)
  const candidates = [
    raw.examiners,
    raw.examiner_names,
    raw.examinerNames,
    examination.examiners,
    examination.examiner_names,
    examination.examinerNames
  ]

  const values = candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) return []
    return candidate.map(normalizeExaminer).filter((value): value is string => Boolean(value))
  })

  return Array.from(new Set(values))
}

function extractExaminationName(raw: Record<string, unknown>): string {
  const examination = readRecord(raw.examination)
  return (
    (typeof examination.name === 'string' && examination.name.trim()) ||
    (typeof raw.examination_name === 'string' && raw.examination_name.trim()) ||
    (typeof raw.examination === 'string' && raw.examination.trim()) ||
    ''
  )
}

function isPatientExaminationAllowedForMedicalField(option: PatientExaminationOption): boolean {
  if (!terminology.activeBundle) return true
  return isGastroenterologyExaminationName(option.examinationName)
}

function extractPatientId(raw: Record<string, unknown>): number | null {
  return toPositiveInteger(readRecord(raw.patient).id ?? raw.patient_id ?? raw.patientId)
}

function extractExaminationId(raw: Record<string, unknown>): number | null {
  return toPositiveInteger(
    readRecord(raw.examination).id ?? raw.examination_id ?? raw.examinationId
  )
}

function extractDraftDate(raw: Record<string, unknown>): string | null {
  const value =
    (typeof raw.date_start === 'string' && raw.date_start) ||
    (typeof raw.dateStart === 'string' && raw.dateStart) ||
    (typeof raw.date === 'string' && raw.date) ||
    null
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function extractIndicationRows(raw: Record<string, unknown>) {
  const nestedExamination =
    raw.examination && typeof raw.examination === 'object'
      ? (raw.examination as Record<string, unknown>)
      : null

  const candidates = [
    raw.indications,
    raw.examination_indications,
    raw.examinationIndications,
    nestedExamination?.indications,
    nestedExamination?.examination_indications,
    nestedExamination?.examinationIndications
  ]

  const rows = candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) return []
    return candidate
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const row = entry as Record<string, unknown>
        const examinationIndicationId = toPositiveInteger(
          row.examinationIndicationId ??
            row.examination_indication_id ??
            row.indicationId ??
            row.indication_id ??
            row.id
        )
        const indicationChoiceId = toPositiveInteger(
          row.indicationChoiceId ??
            row.indication_choice_id ??
            row.choiceId ??
            row.choice_id ??
            (row.choice as Record<string, unknown> | undefined)?.id
        )
        if (examinationIndicationId == null) return null
        return {
          examinationIndicationId,
          indicationChoiceId
        }
      })
      .filter(
        (row): row is { examinationIndicationId: number; indicationChoiceId: number | null } =>
          row !== null
      )
  })

  if (!rows.length) {
    return [{ examinationIndicationId: null, indicationChoiceId: null }]
  }

  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = `${String(row.examinationIndicationId)}:${String(row.indicationChoiceId ?? 'null')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isRuntimePayload(value: unknown): value is ReportTemplateRuntimePayload {
  if (!isRecord(value)) return false
  return (
    typeof value.patient === 'string' &&
    Array.isArray(value.examiners) &&
    typeof value.examination === 'string' &&
    Array.isArray(value.patientFindings)
  )
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function caseExaminationOptions(patientCase: PatientCase): PatientExaminationOption[] {
  return patientCase.patientExaminations
    .map(normalizePatientExaminationOption)
    .filter(
      (
        option: ReturnType<typeof normalizePatientExaminationOption>
      ): option is PatientExaminationOption => option !== null
    )
    .filter(isPatientExaminationAllowedForMedicalField)
    .sort((left, right) => right.id - left.id)
}

function activateCase(patientCase: PatientCase): void {
  flow.setCaseContext({ caseId: patientCase.caseId, selectedPatientId: patientCase.patient })
  patientExaminationOptions.value = caseExaminationOptions(patientCase)
}

function mergeCaseOptions(rows: PatientCase[]): void {
  const byCaseId = new Map(caseOptions.value.map((row) => [row.caseId, row]))
  for (const row of rows) byCaseId.set(row.caseId, row)
  caseOptions.value = [...byCaseId.values()].sort((left, right) =>
    right.admissionDate.localeCompare(left.admissionDate)
  )
}

async function fetchCaseOptions(patientId: number): Promise<void> {
  const requestGeneration = ++caseOptionsRequestGeneration
  caseOptionsLoading.value = true
  caseOptionsError.value = null
  try {
    const rows = await fetchPatientCases({ patientId })
    if (
      requestGeneration !== caseOptionsRequestGeneration ||
      patientId !== flow.selectedPatientId
    ) {
      return
    }
    caseOptions.value = rows
    const activeCase = caseOptions.value.find((row) => row.caseId === flow.caseId)
    if (activeCase) activateCase(activeCase)
  } catch (error: unknown) {
    if (requestGeneration !== caseOptionsRequestGeneration) return
    caseOptions.value = []
    caseOptionsError.value = reportingApiErrorMessage(error, 'Fälle konnten nicht geladen werden.')
  } finally {
    if (requestGeneration === caseOptionsRequestGeneration) {
      caseOptionsLoading.value = false
    }
  }
}

async function ensureCaseForPatientExamination(patientExaminationId: number): Promise<void> {
  const requestGeneration = ++caseOptionsRequestGeneration
  try {
    const rows = await fetchPatientCases({ patientExaminationId })
    if (
      requestGeneration !== caseOptionsRequestGeneration ||
      patientExaminationId !== routePatientExaminationId.value
    ) {
      return
    }
    mergeCaseOptions(rows)
    const patientCase = rows.find((row) =>
      row.patientExaminations.some((examination) => examination.id === patientExaminationId)
    )
    if (!patientCase) {
      flow.setCaseContext({ caseId: null })
      caseOptionsError.value =
        'Diese Patientenuntersuchung ist keinem persistierten Fall zugeordnet.'
      return
    }
    caseOptionsError.value = null
    activateCase(patientCase)
  } catch (error: unknown) {
    if (requestGeneration !== caseOptionsRequestGeneration) return
    flow.setCaseContext({ caseId: null })
    caseOptionsError.value = reportingApiErrorMessage(
      error,
      'Die Fallzuordnung konnte nicht geladen werden.'
    )
  }
}

async function onCaseSelect(caseId: string): Promise<void> {
  const patientCase = caseOptions.value.find((row) => row.caseId === caseId)
  if (!patientCase) return
  const currentPatientExaminationId = routePatientExaminationId.value || flow.patientExaminationId
  const examinationIds = new Set(patientCase.patientExaminations.map((row) => row.id))
  if (currentPatientExaminationId && examinationIds.has(currentPatientExaminationId)) {
    activateCase(patientCase)
    return
  }

  const firstExamination = caseExaminationOptions(patientCase).at(0)
  if (!(await flushDraftBeforeContextSwitch(firstExamination?.id ?? null))) return
  activateCase(patientCase)
  if (!firstExamination) {
    flow.setPatientExaminationContext({
      patientExaminationId: null,
      selectedPatientId: patientCase.patient,
      selectedExaminationId: null
    })
    await router.push('/reporting/case-setup')
    return
  }
  await onPatientExaminationSelect(String(firstExamination.id))
}

function upsertPatientExaminationOption(option: {
  id: number
  label: string
  examinationName: string
  patientId: number | null
  examinationId: number | null
}) {
  if (!isPatientExaminationAllowedForMedicalField(option)) return
  const next = patientExaminationOptions.value.slice()
  const index = next.findIndex((entry) => entry.id === option.id)
  if (index >= 0) next[index] = option
  else next.push(option)
  patientExaminationOptions.value = next.sort(
    (left: PatientExaminationOption, right: PatientExaminationOption) => right.id - left.id
  )
}

async function fetchPatientExaminationOptions(patientId: number) {
  const requestGeneration = ++patientOptionsRequestGeneration
  patientExaminationOptionsLoading.value = true
  patientExaminationOptionsError.value = null
  try {
    const response = await axiosInstance.get<unknown>(
      r(endpoints.examination.patientExaminationList),
      { params: { patient_id: patientId } }
    )
    if (
      requestGeneration !== patientOptionsRequestGeneration ||
      patientId !== flow.selectedPatientId
    ) {
      return
    }
    const rows = readListPayload(response.data)
    patientExaminationOptions.value = rows
      .map(normalizePatientExaminationOption)
      .filter(
        (
          option: ReturnType<typeof normalizePatientExaminationOption>
        ): option is PatientExaminationOption => option !== null
      )
      .filter(isPatientExaminationAllowedForMedicalField)
      .sort((left: PatientExaminationOption, right: PatientExaminationOption) => right.id - left.id)
  } catch (error: unknown) {
    if (requestGeneration !== patientOptionsRequestGeneration) return
    patientExaminationOptions.value = []
    patientExaminationOptionsError.value = reportingApiErrorMessage(
      error,
      'Patientenuntersuchungen konnten nicht geladen werden.'
    )
  } finally {
    if (requestGeneration === patientOptionsRequestGeneration) {
      patientExaminationOptionsLoading.value = false
    }
  }
}

async function ensureCurrentPatientExaminationOption(patientExaminationId: number) {
  const exists = patientExaminationOptions.value.some((entry) => entry.id === patientExaminationId)
  if (exists) return
  const requestGeneration = ++patientOptionsRequestGeneration
  try {
    const response = await axiosInstance.get(
      r(endpoints.examination.patientExaminationDetail(patientExaminationId))
    )
    if (
      requestGeneration !== patientOptionsRequestGeneration ||
      patientExaminationId !== routePatientExaminationId.value
    ) {
      return
    }
    if (response.data && typeof response.data === 'object') {
      patientExaminationDetail.value = response.data as Record<string, unknown>
    }
    const option = normalizePatientExaminationOption(response.data)
    if (option) upsertPatientExaminationOption(option)
  } catch {
    // Keep the selector usable even if detail hydration fails.
  }
}

function getNavigationTargetForPatientExamination(patientExaminationId: number): string {
  const match = route.path.match(/^\/reporting\/[^/]+\/(.+)$/)
  return match
    ? `/reporting/${String(patientExaminationId)}/${match[1]}`
    : `/reporting/${String(patientExaminationId)}/findings`
}

async function flushDraftBeforeContextSwitch(
  nextPatientExaminationId: number | null
): Promise<boolean> {
  if (flow.patientExaminationId === nextPatientExaminationId || !flow.hasUnpersistedDraftChanges) {
    return true
  }
  try {
    await flow.flushDraftAutosave()
    return true
  } catch (error: unknown) {
    const detail = reportingApiErrorMessage(error, 'unbekannter Speicherfehler')
    draftBootstrapError.value = `Der aktuelle Entwurf konnte nicht gespeichert werden. Die Untersuchung wurde nicht gewechselt. ${detail}`
    return false
  }
}

async function onPatientExaminationSelect(rawValue: string) {
  const patientExaminationId = toPositiveInteger(rawValue)
  if (patientExaminationId === null) return
  if (!(await flushDraftBeforeContextSwitch(patientExaminationId))) return
  draftBootstrapGeneration += 1
  draftBootstrapInFlight.value = null
  const selectedOption =
    patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) ?? null

  flow.setPatientExaminationContext({
    patientExaminationId,
    selectedPatientId: selectedOption?.patientId ?? flow.selectedPatientId,
    selectedExaminationId: selectedOption?.examinationId ?? flow.selectedExaminationId
  })
  patientExaminationDetail.value = null
  selectedReferenceFindingKey.value = null

  await router.push(getNavigationTargetForPatientExamination(patientExaminationId))
}

function draftHasRuntimeContent(): boolean {
  return Boolean(
    flow.currentRuntimeDraft?.payload.patientFindings.length ||
      Object.keys(readRecord(flow.templateSectionDrafts)).length ||
      flow.activeReportId ||
      flow.findingsRevision > 0
  )
}

async function onTemplateSelectionChange(name: string, select?: HTMLSelectElement) {
  const previousName = flow.selectedTemplateName
  const previousIdentity = flow.selectedTemplateIdentity
  if (!name || name === previousName) return
  const selected = availableTemplates.value.find((template) => template.name === name)
  if (!selected) {
    templateSelectionError.value =
      'Die ausgewählte Vorlage ist nicht mehr veröffentlicht oder nicht verfügbar.'
    if (select) select.value = previousName || ''
    return
  }
  if (!flow.patientExaminationId || !routePatientExaminationId.value) {
    templateSelectionError.value = 'Bitte wählen Sie zuerst eine Patientenuntersuchung.'
    if (select) select.value = previousName || ''
    return
  }

  if (draftHasRuntimeContent()) {
    const confirmed = window.confirm(
      'Für diese Untersuchung existieren bereits Befunde oder ein Entwurf. Vorlage wirklich wechseln? Der bisherige Entwurf wird nicht weiterverwendet.'
    )
    if (!confirmed) {
      if (select) select.value = previousName || ''
      return
    }
  }

  templateSelectionError.value = null
  const originContext: DraftBootstrapContext = {
    generation: draftBootstrapGeneration,
    patientExaminationId: flow.patientExaminationId,
    bundleKey: activeBundleIdentityKey.value,
    moduleName: activeKbModule.value
  }
  let attemptedContext: DraftBootstrapContext | null = null
  try {
    if (draftHasRuntimeContent()) await flow.flushDraftAutosave()
    assertBootstrapContextCurrent(originContext)
    const option =
      patientExaminationOptions.value.find(
        (entry) => entry.id === originContext.patientExaminationId
      ) || null
    const generation = ++draftBootstrapGeneration
    attemptedContext = {
      ...originContext,
      generation
    }
    flow.setTemplateSelection({
      moduleName: selected.identity.moduleName || originContext.moduleName,
      templateName: selected.name,
      templateIdentity: selected.identity
    })
    await bootstrapRuntimeDraft(originContext.patientExaminationId, option, attemptedContext, false)
    flow.clearTemplateSectionDrafts()
    flow.setLastTemplateValidation(null)
  } catch (error: unknown) {
    if (
      error instanceof SupersededReportingContextError ||
      !isBootstrapContextCurrent(attemptedContext ?? originContext)
    ) {
      return
    }
    flow.setTemplateSelection({
      moduleName: activeKbModule.value,
      templateName: previousName,
      templateIdentity: previousIdentity
    })
    templateSelectionError.value = reportingApiErrorMessage(
      error,
      'Die neue Berichtsvorlage konnte nicht vorbereitet werden; der bisherige Entwurf bleibt erhalten.'
    )
    if (select) select.value = previousName || ''
  }
}

async function loadBootstrapTemplates(
  moduleName: string,
  examinationName: string,
  context: DraftBootstrapContext
): Promise<ReportTemplatePayload[]> {
  availableTemplates.value = []
  templateLoading.value = true
  try {
    const templates = examinationName
      ? await fetchReportTemplatesByExamination(moduleName, examinationName)
      : []
    assertBootstrapContextCurrent(context)
    availableTemplates.value = templates
    return templates
  } finally {
    if (isBootstrapContextCurrent(context)) templateLoading.value = false
  }
}

async function refreshPublishedTemplatesAfterLifecycleChange(
  change: ReportTemplateLifecycleChange
): Promise<void> {
  if (change.moduleName !== activeKbModule.value) return

  const examinationName = extractExaminationName(patientExaminationDetail.value || {})
  if (!examinationName || change.examination !== examinationName) return

  const expectedBundleKey = activeBundleIdentityKey.value
  templateLoading.value = true
  try {
    const templates = await fetchReportTemplatesByExamination(change.moduleName, examinationName)
    if (
      change.moduleName !== activeKbModule.value ||
      expectedBundleKey !== activeBundleIdentityKey.value ||
      examinationName !== extractExaminationName(patientExaminationDetail.value || {})
    ) {
      return
    }
    availableTemplates.value = templates
    if (change.lifecycleStatus === 'draft' && flow.selectedTemplateName === change.templateName) {
      templateSelectionError.value =
        'Die aktuell verwendete Berichtsvorlage wurde entveröffentlicht. Der bestehende Entwurf bleibt erhalten, kann aber erst nach Auswahl einer veröffentlichten Vorlage weitergeführt werden.'
    } else if (change.lifecycleStatus === 'published') {
      templateSelectionError.value = null
    }
  } catch (error: unknown) {
    templateSelectionError.value = reportingApiErrorMessage(
      error,
      'Die veröffentlichten Berichtsvorlagen konnten nach der Statusänderung nicht aktualisiert werden.'
    )
  } finally {
    if (expectedBundleKey === activeBundleIdentityKey.value) {
      templateLoading.value = false
    }
  }
}

async function loadBootstrapFindingCatalog(
  examinationId: number | null,
  context: DraftBootstrapContext
): Promise<Map<number, Finding>> {
  const rows = examinationId ? await findingsApi.getExaminationFindings(examinationId) : []
  assertBootstrapContextCurrent(context)
  findingCatalog.value = Array.isArray(rows) ? rows : []
  return new Map(findingCatalog.value.map((finding) => [finding.id, finding]))
}

async function bootstrapRuntimeDraft(
  patientExaminationId: number,
  option: PatientExaminationOption | null,
  context: DraftBootstrapContext,
  allowMissingTemplate = true
) {
  const moduleName = context.moduleName
  const detailResponse = await axiosInstance.get(
    r(endpoints.examination.patientExaminationDetail(patientExaminationId))
  )
  assertBootstrapContextCurrent(context)
  const detail = readRecord(detailResponse.data)
  patientExaminationDetail.value = detail

  const detailPatientId = extractPatientId(detail)
  const detailExaminationId = extractExaminationId(detail)
  flow.setCaseSelection({
    selectedPatientId: option?.patientId ?? detailPatientId ?? flow.selectedPatientId,
    selectedExaminationId:
      option?.examinationId ?? detailExaminationId ?? flow.selectedExaminationId
  })

  const examinationName = extractExaminationName(detail)
  if (!moduleName) {
    throw new Error(
      'Keine verifizierte aktive Knowledge Base ist im Terminologieregister ausgewählt.'
    )
  }
  const templates = await loadBootstrapTemplates(moduleName, examinationName, context)
  const selectedTemplate =
    (flow.selectedTemplateName &&
      templates.find((template) => template.name === flow.selectedTemplateName)) ||
    null

  const findingsById = await loadBootstrapFindingCatalog(
    option?.examinationId ?? detailExaminationId,
    context
  )

  if (!selectedTemplate) {
    if (!allowMissingTemplate) {
      throw new Error('Bitte wählen Sie eine veröffentlichte Berichtsvorlage aus.')
    }
    setAnnotationOnlyRuntimeDraft(patientExaminationId, detail, context)
    return
  }
  const selectedTemplateIdentity = selectedTemplate.identity

  const payload = await buildReportTemplateRuntimePayload({
    moduleName,
    patientExaminationId,
    patient: resolvePatientKey(detail, patientExaminationId),
    examiners: extractExaminers(detail),
    examination: selectedTemplate.examination || examinationName,
    knowledgeBaseVersion: terminology.activeBundle?.version || null,
    getFindingById: (findingId) => findingsById.get(findingId)
  })
  assertBootstrapContextCurrent(context)

  flow.setTemplateSelection({
    moduleName,
    templateName: selectedTemplate.name,
    templateIdentity: selectedTemplateIdentity
  })
  flow.setIndications(extractIndicationRows(detail))
  flow.setRuntimeDraft({
    draftId: `draft_${String(patientExaminationId)}`,
    patientExaminationId,
    moduleName,
    templateName: selectedTemplate.name,
    templateIdentity: selectedTemplateIdentity,
    payload: {
      ...payload,
      ...(extractDraftDate(detail) ? { date: extractDraftDate(detail) } : {})
    },
    hydratedFrom: 'backend_context',
    verificationStatus: 'verified',
    persistencePolicy: 'persistable',
    updatedAt: new Date().toISOString()
  })
}

async function hydrateRuntimeDraftFromDraftApi(
  patientExaminationId: number,
  context: DraftBootstrapContext
): Promise<boolean> {
  const response = await fetchPatientExaminationDraft(patientExaminationId)
  assertBootstrapContextCurrent(context)
  const draft = response.draft
  const draftModuleName = stringField(draft, 'moduleName', 'module_name') || activeKbModule.value
  const draftTemplateName = stringField(draft, 'templateName', 'template_name')
  const draftTemplateIdentity =
    draft.templateIdentity && typeof draft.templateIdentity === 'object'
      ? draft.templateIdentity
      : null
  const updatedAt = response.updatedAt ?? response.updated_at ?? null
  if (!isRuntimePayload(draft.payload)) {
    flow.markDraftPersistenceHydrated(updatedAt)
    return false
  }

  flow.setTemplateSelection({
    moduleName: context.moduleName,
    templateName: null,
    templateIdentity: null
  })
  flow.setRuntimeDraft({
    draftId: `draft_${String(patientExaminationId)}`,
    patientExaminationId,
    moduleName: draftModuleName,
    templateName: draftTemplateName,
    templateIdentity: draftTemplateIdentity,
    payload: draft.payload,
    hydratedFrom: 'draft_api',
    verificationStatus: 'unverified',
    persistencePolicy: context.moduleName ? 'blocked_until_verified' : 'persistable',
    updatedAt: updatedAt || new Date().toISOString()
  })
  flow.markDraftPersistenceHydrated(updatedAt)
  return true
}

function restoredDraftMatchesContext(
  detail: Record<string, unknown>,
  draft: ReportingRuntimeDraft,
  context: DraftBootstrapContext
): boolean {
  if (draft.moduleName !== context.moduleName) return false
  if (draft.patientExaminationId !== context.patientExaminationId) return false
  if (draft.payload.patient !== resolvePatientKey(detail, context.patientExaminationId))
    return false

  const examinationName = extractExaminationName(detail)
  const draftExamination = draft.payload.examination.trim().toLowerCase()
  if (
    draftExamination &&
    examinationName &&
    draftExamination !== examinationName.trim().toLowerCase()
  ) {
    return false
  }
  return true
}

function restoredDraftMatchesKnowledgeBase(
  draft: ReportingRuntimeDraft,
  selectedIdentity: ReportTemplateIdentity,
  context: DraftBootstrapContext
): boolean {
  const identity = draft.templateIdentity
  if (identity?.moduleName && identity.moduleName !== context.moduleName) return false
  if (
    draft.payload.knowledgeBaseModule &&
    draft.payload.knowledgeBaseModule !== context.moduleName
  ) {
    return false
  }

  const draftKnowledgeBaseVersion =
    identity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
  const activeKnowledgeBaseVersion = terminology.activeBundle?.version || null
  if (!draftKnowledgeBaseVersion || draftKnowledgeBaseVersion !== activeKnowledgeBaseVersion) {
    return false
  }
  if (
    selectedIdentity.knowledgeBaseVersion &&
    selectedIdentity.knowledgeBaseVersion !== activeKnowledgeBaseVersion
  ) {
    return false
  }
  return true
}

function restoredDraftMatchesTemplateRevision(
  identity: ReportTemplateIdentity | null,
  selectedIdentity: ReportTemplateIdentity
): boolean {
  if (selectedIdentity.templateHash && identity?.templateHash !== selectedIdentity.templateHash) {
    return false
  }
  if (
    selectedIdentity.templateVersion &&
    identity?.templateVersion !== selectedIdentity.templateVersion
  ) {
    return false
  }
  return true
}

function restoredDraftMatchesActiveTemplate(
  detail: Record<string, unknown>,
  draft: ReportingRuntimeDraft,
  selected: ReportTemplatePayload | null,
  context: DraftBootstrapContext
): boolean {
  if (!selected) return false
  const selectedIdentity = selected.identity
  return (
    restoredDraftMatchesContext(detail, draft, context) &&
    restoredDraftMatchesKnowledgeBase(draft, selectedIdentity, context) &&
    restoredDraftMatchesTemplateRevision(draft.templateIdentity || null, selectedIdentity)
  )
}

async function validateRestoredDraftTemplate(
  detail: Record<string, unknown>,
  draft: ReportingRuntimeDraft,
  context: DraftBootstrapContext
) {
  const examinationName = extractExaminationName(detail)
  const templates = examinationName
    ? await fetchReportTemplatesByExamination(context.moduleName, examinationName)
    : []
  assertBootstrapContextCurrent(context)
  availableTemplates.value = templates
  const selected = draft.templateName
    ? templates.find((template) => template.name === draft.templateName)
    : null
  const matchingTemplate = selected || null
  const selectedIdentity = matchingTemplate?.identity || emptyTemplateIdentity
  if (!restoredDraftMatchesActiveTemplate(detail, draft, matchingTemplate, context)) {
    flow.setTemplateSelection({ templateName: null, templateIdentity: null })
    flow.setRuntimeDraft({
      ...draft,
      verificationStatus: 'unverified',
      persistencePolicy: 'blocked_until_verified'
    })
    throw new IncompatibleReportingDraftError(
      'Der gespeicherte Entwurf gehört zu keiner aktuell veröffentlichten und kompatiblen Berichtsvorlage.'
    )
  }
  flow.setRuntimeDraft({
    ...draft,
    moduleName: context.moduleName,
    templateName: matchingTemplate?.name || null,
    templateIdentity: selectedIdentity,
    verificationStatus: 'verified',
    persistencePolicy: 'persistable'
  })
  flow.setTemplateSelection({
    moduleName: selectedIdentity.moduleName || context.moduleName,
    templateName: matchingTemplate?.name || null,
    templateIdentity: matchingTemplate?.identity || emptyTemplateIdentity
  })
}

async function loadPatientExaminationDraftContext(
  patientExaminationId: number,
  context: DraftBootstrapContext
): Promise<Record<string, unknown>> {
  const detailResponse = await axiosInstance.get(
    r(endpoints.examination.patientExaminationDetail(patientExaminationId))
  )
  assertBootstrapContextCurrent(context)
  const detail =
    detailResponse.data && typeof detailResponse.data === 'object'
      ? (detailResponse.data as Record<string, unknown>)
      : {}
  patientExaminationDetail.value = detail
  flow.setCaseSelection({
    selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
    selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
  })
  flow.setIndications(extractIndicationRows(detail))
  await loadFindingCatalogForExamination(extractExaminationId(detail) ?? flow.selectedExaminationId)
  assertBootstrapContextCurrent(context)
  return detail
}

function setAnnotationOnlyRuntimeDraft(
  patientExaminationId: number,
  detail: Record<string, unknown>,
  context: DraftBootstrapContext
) {
  flow.setTemplateSelection({
    moduleName: context.moduleName,
    templateName: null,
    templateIdentity: null
  })
  flow.setRuntimeDraft({
    draftId: `draft_${String(patientExaminationId)}`,
    patientExaminationId,
    moduleName: context.moduleName,
    templateName: null,
    templateIdentity: null,
    payload: {
      patient: resolvePatientKey(detail, patientExaminationId),
      examiners: extractExaminers(detail),
      examination: extractExaminationName(detail),
      knowledgeBaseModule: context.moduleName || null,
      knowledgeBaseVersion: terminology.activeBundle?.version || null,
      patientFindings: [],
      ...(extractDraftDate(detail) ? { date: extractDraftDate(detail) } : {})
    },
    hydratedFrom: 'backend_context',
    verificationStatus: 'unverified',
    persistencePolicy: 'persistable',
    updatedAt: new Date().toISOString()
  })
  flow.markDraftPersistenceHydrated(null)
}

async function ensureRuntimeDraft(patientExaminationId: number, context: DraftBootstrapContext) {
  const draftKey = String(patientExaminationId)
  const existingDraft = Object.prototype.hasOwnProperty.call(
    flow.runtimeDraftsByPatientExaminationId,
    draftKey
  )
    ? flow.runtimeDraftsByPatientExaminationId[draftKey]
    : null
  if (existingDraft) {
    flow.setRuntimeDraft({
      ...existingDraft,
      verificationStatus: 'unverified',
      persistencePolicy:
        !context.moduleName && !existingDraft.templateName
          ? 'persistable'
          : 'blocked_until_verified'
    })
    const detail = await loadPatientExaminationDraftContext(patientExaminationId, context)
    if (context.moduleName) {
      await validateRestoredDraftTemplate(detail, existingDraft, context)
    } else {
      clearInactiveTerminologySelection()
    }
    return
  }

  const restoredFromDraftApi = await hydrateRuntimeDraftFromDraftApi(patientExaminationId, context)
  if (restoredFromDraftApi) {
    const detail = await loadPatientExaminationDraftContext(patientExaminationId, context)
    const restoredDraft = flow.currentRuntimeDraft
    if (restoredDraft && context.moduleName) {
      await validateRestoredDraftTemplate(detail, restoredDraft, context)
    } else if (!context.moduleName) {
      clearInactiveTerminologySelection()
    }
    return
  }

  const option =
    patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null
  if (!context.moduleName) {
    const detail = await loadPatientExaminationDraftContext(patientExaminationId, context)
    setAnnotationOnlyRuntimeDraft(patientExaminationId, detail, context)
    return
  }
  await bootstrapRuntimeDraft(patientExaminationId, option, context)
  flow.markDraftPersistenceHydrated(null)
}

async function hydrateDraftForRoutePatientExamination(patientExaminationId: number) {
  if (patientExaminationId !== routePatientExaminationId.value) return
  const requestedKey = `${String(patientExaminationId)}:${activeBundleIdentityKey.value || 'loading'}`
  if (draftBootstrapInFlight.value?.key === requestedKey) {
    await draftBootstrapInFlight.value.promise
    return
  }

  const option =
    patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null
  if (patientExaminationId !== routePatientExaminationId.value) return
  if (
    flow.patientExaminationId !== patientExaminationId ||
    (option?.patientId ?? flow.selectedPatientId) !== flow.selectedPatientId ||
    (option?.examinationId ?? flow.selectedExaminationId) !== flow.selectedExaminationId
  ) {
    flow.setPatientExaminationContext({
      patientExaminationId,
      selectedPatientId: option?.patientId ?? flow.selectedPatientId,
      selectedExaminationId: option?.examinationId ?? flow.selectedExaminationId,
      preserveTemplateSelection: true
    })
  }

  const generation = ++draftBootstrapGeneration
  const task = (async () => {
    draftBootstrapError.value = null
    try {
      await ensureTerminologyBundlesLoaded()
      if (generation !== draftBootstrapGeneration) return
      const context: DraftBootstrapContext = {
        generation,
        patientExaminationId,
        bundleKey: activeBundleIdentityKey.value,
        moduleName: activeKbModule.value
      }
      assertBootstrapContextCurrent(context)
      await ensureRuntimeDraft(patientExaminationId, context)
    } catch (error: unknown) {
      if (error instanceof SupersededReportingContextError) return
      if (generation !== draftBootstrapGeneration) return
      draftBootstrapError.value = reportingApiErrorMessage(
        error,
        'Der lokale Reporting-Entwurf konnte nicht initialisiert werden.'
      )
    } finally {
      if (
        draftBootstrapInFlight.value?.key === requestedKey &&
        generation === draftBootstrapGeneration
      ) {
        draftBootstrapInFlight.value = null
      }
    }
  })()

  draftBootstrapInFlight.value = { key: requestedKey, promise: task }
  await task
}

async function refreshMediaPreload() {
  if (!flow.selectedPatientId) {
    mediaPreloadRequestGeneration += 1
    flow.clearMediaPreload()
    return
  }
  const patientExaminationId = routePatientExaminationId.value || flow.patientExaminationId
  const patientId = flow.selectedPatientId
  const requestGeneration = ++mediaPreloadRequestGeneration
  flow.setMediaPreloadLoading()
  try {
    const payload = await fetchPatientTimelineLatest({
      patientId,
      patientExaminationId
    })
    if (
      requestGeneration !== mediaPreloadRequestGeneration ||
      patientId !== flow.selectedPatientId ||
      patientExaminationId !== (routePatientExaminationId.value || flow.patientExaminationId)
    ) {
      return
    }
    flow.setMediaPreload(payload)
    selectedVideoArtifactKind.value =
      preferredArtifactKind(payload.latestVideo?.streamOptions || []) ?? 'processed'
    selectedFrameStreamUrl.value = payload.latestFrames[0]?.streamUrl || null
  } catch (error: unknown) {
    if (requestGeneration !== mediaPreloadRequestGeneration) return
    const candidate = reportingApiError(error)
    const status = candidate.response?.status
    const detail = reportingApiErrorMessage(error, 'unbekannt')
    const message =
      status === 404
        ? 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
        : status === 400
          ? 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.'
          : status === 403
            ? 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.'
            : `Fehler beim Laden der Medien: ${detail || 'unbekannt'}`
    flow.setMediaPreloadError(message)
  }
}

async function handleReportImportCompleted(): Promise<void> {
  await refreshMediaPreload()
}

function isActive(path: string): boolean {
  return route.path === path
}

function isStepDisabled(item: {
  requiresPatientExamination?: boolean
  requiresVerifiedTemplate?: boolean
}) {
  return Boolean(
    (item.requiresPatientExamination && !flow.patientExaminationId) ||
      (item.requiresVerifiedTemplate && !hasVerifiedTemplateContext.value)
  )
}

function stepStatusLabel(item: {
  label: string
  to: string
  requiresPatientExamination?: boolean
  requiresVerifiedTemplate?: boolean
}) {
  if (isActive(item.to)) return 'Aktuell'
  if (item.requiresPatientExamination && !flow.patientExaminationId) return 'Fall wählen'
  if (item.requiresVerifiedTemplate && !hasVerifiedTemplateContext.value) {
    return 'Verifizierte Vorlage erforderlich'
  }
  if (item.label === 'Befunde' && !terminology.activeBundle) return 'Ohne Terminologie verfügbar'
  if (item.requiresPatientExamination) return 'Bereit'
  return 'Verfügbar'
}

watch(
  [() => flow.selectedPatientId, routePatientExaminationId],
  async ([patientId, patientExaminationId]) => {
    const watchGeneration = ++routeContextWatchGeneration
    const isCurrent = () =>
      watchGeneration === routeContextWatchGeneration &&
      patientExaminationId === routePatientExaminationId.value
    if (patientId) {
      await fetchPatientExaminationOptions(patientId)
      if (!isCurrent()) return
      await fetchCaseOptions(patientId)
      if (!isCurrent()) return
    } else {
      patientExaminationOptions.value = []
      patientExaminationOptionsError.value = null
      caseOptions.value = []
      caseOptionsError.value = null
      patientExaminationDetail.value = null
      findingCatalog.value = []
    }

    if (patientExaminationId) {
      await ensureCurrentPatientExaminationOption(patientExaminationId)
      if (!isCurrent()) return
      await ensureCaseForPatientExamination(patientExaminationId)
      if (!isCurrent()) return
      await hydrateDraftForRoutePatientExamination(patientExaminationId)
    }
  },
  { immediate: true }
)

watch(
  () => terminology.selectedMedicalField,
  async () => {
    if (flow.selectedPatientId) {
      await fetchPatientExaminationOptions(flow.selectedPatientId)
    }
  }
)

watch(
  activeBundleIdentityKey,
  async (nextKey, previousKey) => {
    if (nextKey === previousKey) return
    if (terminology.importing) return
    await reconcileActiveTerminology()
  },
  { immediate: true }
)

watch(
  [
    () => flow.selectedKbModule,
    () => flow.selectedTemplateName,
    activeKbModule,
    activeBundleIdentityKey
  ],
  async () => {
    selectedReferenceFindingKey.value = null
    await loadTemplateReferenceForSelection()
  },
  { immediate: true }
)

watch(
  () => flow.selectedExaminationId,
  async (examinationId) => {
    await loadFindingCatalogForExamination(examinationId)
  },
  { immediate: true }
)

watch(
  [() => flow.selectedPatientId, () => flow.patientExaminationId, routePatientExaminationId],
  async ([patientId]) => {
    if (!patientId) {
      mediaPreloadRequestGeneration += 1
      flow.clearMediaPreload()
      return
    }
    await refreshMediaPreload()
  },
  { immediate: true }
)

onMounted(() => {
  void ensureTerminologyBundlesLoaded()
  void loadReportingLanguages()
})
</script>

<style scoped>
.reporting-shell {
  position: relative;
  isolation: isolate;
}

.reporting-shell .row > [class*='col-'] {
  min-width: 0;
}

.reporting-workspace-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr) minmax(17rem, 22rem);
  gap: 1rem;
  align-items: start;
}

.reporting-left-rail,
.reporting-right-rail,
.reporting-main-region {
  min-width: 0;
}

.reporting-left-rail {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reporting-right-rail,
.workflow-panel {
  position: sticky;
  top: 1rem;
}

.reporting-shell .card,
.reporting-command-bar {
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  box-shadow: 0 8px 18px rgba(20, 31, 48, 0.06);
  overflow: hidden;
}

.reporting-command-bar {
  display: grid;
  grid-template-columns: minmax(22rem, 1.15fr) minmax(20rem, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: #fff;
}

.reporting-command-main {
  min-width: 0;
}

.reporting-start-guide {
  grid-column: 1 / -1;
  padding: 0.8rem;
  border: 1px solid #b9cbea;
  border-radius: 8px;
  background: #f2f7ff;
}

.reporting-start-guide > strong {
  display: block;
  margin-bottom: 0.55rem;
  color: #172234;
}

.reporting-start-guide ol {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.reporting-start-guide li {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  color: #334155;
}

.reporting-start-guide li > span {
  display: inline-flex;
  flex: 0 0 1.6rem;
  width: 1.6rem;
  height: 1.6rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #fff;
  background: #315a94;
  font-weight: 700;
}

.reporting-start-guide li.is-complete > span {
  background: #198754;
}

.reporting-start-guide b,
.reporting-start-guide small {
  display: block;
}

.reporting-start-guide small {
  margin-top: 0.15rem;
  color: #526174;
}

.tracking-label {
  letter-spacing: 0.08em;
}

.context-case-select {
  width: 100%;
}

.context-case-select .form-select {
  min-width: min(100%, 20rem);
}

.context-case-select .btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.context-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.625rem;
  align-content: start;
}

.context-summary-item,
.context-tile,
.media-context-card {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.context-summary-item.is-primary {
  background: #172234;
  color: #fff;
  border-color: #172234;
}

.context-summary-label,
.context-tile span {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #66768c;
  margin-bottom: 0.2rem;
}

.context-summary-item.is-primary .context-summary-label {
  color: #c9d5e4;
}

.context-summary-item strong,
.context-tile strong {
  display: block;
  color: inherit;
  overflow-wrap: anywhere;
  line-height: 1.3;
}

.context-tile {
  display: flex;
  min-height: 7rem;
  flex-direction: column;
  gap: 0.2rem;
  background: #fff;
}

.context-tile small {
  color: #5c6878;
  overflow-wrap: anywhere;
}

.context-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.context-status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  color: #334155;
  background: #eef2f7;
  border: 1px solid #d7dee8;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.context-status-pill.is-ready {
  color: #0f5132;
  background: #d1e7dd;
  border-color: #badbcc;
}

.context-status-pill.is-loading {
  color: #084298;
  background: #cfe2ff;
  border-color: #b6d4fe;
}

.context-status-pill.is-error {
  color: #842029;
  background: #f8d7da;
  border-color: #f5c2c7;
}

.context-status-pill.is-idle {
  color: #334155;
  background: #eef2f7;
  border-color: #d7dee8;
}

.reporting-shell .card-header {
  background: #fff;
  color: #172234;
  border-bottom: 1px solid #d9e0ea;
}

.reporting-shell .card-body {
  background: #fff;
  color: #1f2a37;
}

.reporting-shell .text-muted {
  color: #4b5565 !important;
}

.reporting-shell .workflow-step-btn {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  white-space: normal;
  text-decoration: none;
  font-weight: 600;
  line-height: 1.3;
  border-width: 1px;
  border-style: solid;
}

.workflow-step-index {
  display: inline-flex;
  flex: 0 0 1.75rem;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: #172234;
  font-weight: 800;
}

.workflow-step-copy {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.15rem;
}

.reporting-shell .workflow-step-btn.is-inactive {
  color: #1f2a37 !important;
  background-color: #fff;
  border-color: #d4dbe7;
}

.reporting-shell .workflow-step-btn.is-inactive:hover,
.reporting-shell .workflow-step-btn.is-inactive:focus-visible {
  color: #111827 !important;
  background-color: #eef4fb;
  border-color: #b9c7da;
}

.reporting-shell .workflow-step-btn.is-active {
  color: #fff !important;
  background-color: #172234 !important;
  border-color: #172234 !important;
  box-shadow: 0 6px 14px rgba(16, 24, 40, 0.2);
}

.reporting-shell .workflow-step-btn.is-disabled {
  color: #7b8796 !important;
  background-color: #f4f6f9 !important;
  border-color: #d6dce7 !important;
  cursor: not-allowed;
}

.reporting-shell .workflow-step-btn.is-disabled .workflow-step-index {
  color: #8792a2;
}

.workflow-step-meta {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.82;
}

.reporting-shell .workflow-step-btn:focus-visible {
  outline: 2px solid #8bb7f0;
  outline-offset: 1px;
}

.media-context-card {
  height: 100%;
  background: #fff;
}

.finding-status-list {
  display: flex;
  flex-direction: column;
}

.finding-status-section {
  border-bottom: 1px solid #e5ebf2;
}

.finding-status-section:last-child {
  border-bottom: 0;
}

.finding-status-section-title {
  padding: 0.65rem 0.85rem 0.35rem;
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.finding-status-row {
  display: grid;
  grid-template-columns: 1.65rem minmax(0, 1fr) auto;
  gap: 0.55rem;
  align-items: center;
  padding: 0.55rem 0.85rem;
  color: #1f2a37;
  text-decoration: none;
  border-left: 3px solid transparent;
}

.finding-status-row:hover,
.finding-status-row:focus-visible,
.finding-status-row.is-selected {
  background: #f3f7fb;
  color: #111827;
}

.finding-status-row.is-complete {
  border-left-color: #198754;
}

.finding-status-row.is-warning,
.finding-status-row.is-missing {
  border-left-color: #f0ad4e;
}

.finding-status-icon {
  display: inline-flex;
  width: 1.5rem;
  height: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #4b5565;
  background: #eef2f7;
  font-size: 0.75rem;
}

.finding-status-row.is-complete .finding-status-icon {
  color: #0f5132;
  background: #d1e7dd;
}

.finding-status-row.is-warning .finding-status-icon,
.finding-status-row.is-missing .finding-status-icon {
  color: #7a4d00;
  background: #fff3cd;
}

.finding-status-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.05rem;
}

.finding-status-label {
  overflow: hidden;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.finding-status-meta,
.finding-status-count {
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.finding-status-count {
  min-width: 1.25rem;
  text-align: right;
}

.kb-reference-panel {
  max-height: calc(100vh - 2rem);
}

.kb-reference-panel .card-body {
  overflow: auto;
  max-height: calc(100vh - 6rem);
}

.kb-focus-block,
.kb-classification-row,
.runtime-instance-row,
.kb-advice-row,
.kb-suggestion-row {
  min-width: 0;
  padding: 0.7rem;
  border: 1px solid #d9e0ea;
  border-radius: 8px;
  background: #f8fafc;
}

.kb-focus-block span {
  display: block;
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kb-focus-block strong,
.kb-focus-block small,
.kb-classification-row small,
.kb-advice-row small {
  display: block;
  overflow-wrap: anywhere;
}

.kb-reference-group {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 1rem;
}

.kb-reference-group h6 {
  margin: 0;
  color: #172234;
  font-size: 0.82rem;
}

.kb-classification-list,
.runtime-instance-list,
.kb-advice-list,
.kb-suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.kb-classification-precedence {
  flex: 0 0 auto;
  color: #475569;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kb-classification-precedence.is-required {
  color: #842029;
}

.runtime-instance-row,
.kb-suggestion-row {
  color: #334155;
  font-size: 0.82rem;
  line-height: 1.35;
}

.kb-advice-row {
  border-left: 3px solid #f0ad4e;
}

.kb-advice-row.is-ok {
  border-left-color: #198754;
}

.kb-advice-row > div span {
  color: #66768c;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 1199.98px) {
  .reporting-command-bar {
    grid-template-columns: 1fr;
  }

  .reporting-workspace-grid {
    grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
  }

  .reporting-right-rail {
    grid-column: 1 / -1;
    position: static;
  }

  .kb-reference-panel {
    max-height: none;
  }

  .kb-reference-panel .card-body {
    max-height: none;
  }
}

@media (max-width: 767.98px) {
  .reporting-start-guide ol {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 991.98px) {
  .reporting-shell {
    padding-inline: 0.5rem;
  }

  .reporting-workspace-grid {
    grid-template-columns: 1fr;
  }

  .reporting-right-rail,
  .workflow-panel {
    position: static;
  }

  .context-quick-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 575.98px) {
  .context-case-select .btn {
    width: 100%;
  }
}
</style>
