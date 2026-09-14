<template>
  <div class="reporting-shell container-fluid py-4">
    <a
      class="reporting-skip-link"
      href="#reporting-workspace"
      >Zum Arbeitsbereich springen</a
    >
    <section
      class="reporting-command-bar mb-3"
      aria-label="Reporting-Kontext"
    >
      <div class="reporting-command-main">
        <div class="small text-uppercase text-muted fw-semibold tracking-label">Reporting</div>
        <h4 class="mb-3">Bericht erstellen</h4>
        <div class="context-case-select w-100 w-xl-75">
          <ReportingContextSelection
            :active-patient-examination-id="activePatientExaminationId"
            :case-id="flow.caseId"
            :selected-patient-id="flow.selectedPatientId"
            :selected-examination-id="flow.selectedExaminationId"
            :patients="patients"
            :examinations="examinations"
            :patients-loading="patientsLoading"
            :examinations-loading="examinationsLoading"
            :patient-examination-creation-loading="patientExaminationCreationLoading"
            :patient-header-label="patientHeaderLabel"
            :examination-type-label="examinationTypeLabel"
            @select-patient="onPatientSelection"
            @select-examination="onExaminationSelection"
            @create="createPatientExaminationContext"
            @restart="startNewPatientExamination"
          />

          <div
            class="reporting-template-control mt-3"
            data-testid="report-template-control"
          >
            <label
              class="form-label form-label-sm mb-1"
              for="report-template-select"
            >
              Berichtsvorlage
              <span
                class="text-danger"
                aria-hidden="true"
                >*</span
              >
            </label>
            <select
              id="report-template-select"
              class="form-select"
              data-testid="report-template-select"
              :value="flow.selectedTemplateName ?? ''"
              :disabled="templateLoading || !availableTemplates.length"
              aria-label="Berichtsvorlage auswählen"
              required
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
                {{ getReportTemplateDisplayName(template, flow.selectedReportLanguage)
                }}{{
                  template.identity?.knowledgeBaseVersion
                    ? ` · ${template.identity.knowledgeBaseVersion}`
                    : ''
                }}
              </option>
            </select>
            <small class="form-text">
              Die erste passende veröffentlichte Vorlage wird automatisch vorausgewählt.
            </small>
          </div>

          <details
            class="reporting-secondary-controls mt-3"
            data-testid="reporting-options"
          >
            <summary class="reporting-secondary-toggle">Weitere Einstellungen und Import</summary>
            <div class="d-flex flex-column flex-lg-row flex-lg-wrap gap-2 mt-2">
              <div class="reporting-setting-field">
                <label
                  class="form-label form-label-sm mb-1"
                  for="reporting-existing-case"
                  >Vorhandener Fall</label
                >
                <select
                  id="reporting-existing-case"
                  class="form-select"
                  data-testid="case-select"
                  :value="flow.caseId ?? ''"
                  :disabled="caseOptionsLoading || !caseOptions.length"
                  aria-label="Persistierten Patientenfall auswählen"
                  @change="onCaseSelect(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Persistierten Fall wählen</option>
                  <option
                    v-for="patientCase in caseOptions"
                    :key="patientCase.caseId"
                    :value="patientCase.caseId"
                  >
                    {{ formatCaseLabel(patientCase) }}
                  </option>
                </select>
              </div>
              <div class="reporting-setting-field">
                <label
                  class="form-label form-label-sm mb-1"
                  for="reporting-existing-examination"
                  >Vorhandene Patientenuntersuchung</label
                >
                <select
                  id="reporting-existing-examination"
                  class="form-select"
                  data-testid="patient-examination-select"
                  :value="selectedPatientExaminationId"
                  :disabled="
                    !flow.caseId ||
                    patientExaminationOptionsLoading ||
                    !patientExaminationOptions.length
                  "
                  aria-label="Persistierte Patientenuntersuchung auswählen"
                  @change="onPatientExaminationSelect(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Persistierte Patientenuntersuchung wählen</option>
                  <option
                    v-for="option in patientExaminationOptions"
                    :key="option.id"
                    :value="option.id"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              <div class="reporting-setting-field">
                <label
                  class="form-label form-label-sm mb-1"
                  for="reporting-terminology-bundle"
                  >Terminologiepaket</label
                >
                <select
                  id="reporting-terminology-bundle"
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
              </div>
              <div class="reporting-setting-field">
                <label
                  class="form-label form-label-sm mb-1"
                  for="reporting-report-language"
                  >Berichtssprache</label
                >
                <select
                  id="reporting-report-language"
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
              </div>
              <input
                ref="terminologyFolderInput"
                class="visually-hidden"
                type="file"
                webkitdirectory
                directory
                multiple
                @change="importTerminologyFolder"
              />
              <div class="reporting-setting-field">
                <label
                  class="form-label form-label-sm mb-1"
                  for="reporting-report-verbosity"
                  >Berichtsumfang</label
                >
                <select
                  id="reporting-report-verbosity"
                  v-model="flow.selectedReportVerbosity"
                  class="form-select"
                  data-testid="report-verbosity-select"
                  :disabled="!templateReference || templateReferenceLoading"
                >
                  <option
                    v-for="level in reportVerbosityOptions"
                    :key="level"
                    :value="level"
                  >
                    {{ reportVerbosityLabels[level] }}
                  </option>
                </select>
                <small class="form-text"
                  >Alle dokumentierten Befunde bleiben enthalten. Geänderter Umfang gilt bei
                  erneuter Texterstellung.</small
                >
              </div>
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
                <i
                  class="ni ni-single-copy-04 me-1"
                  aria-hidden="true"
                ></i>
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
                <i
                  class="ni ni-archive-2 me-1"
                  aria-hidden="true"
                ></i>
                ZIPs lokal/Cloud importieren
              </button>
              <ReportImportPanel @completed="handleReportImportCompleted" />
              <button
                class="btn btn-outline-secondary"
                :disabled="flow.mediaPreloadStatus === 'loading' || !flow.selectedPatientId"
                @click="refreshMediaPreload"
              >
                <i
                  class="ni ni-refresh-02 me-1"
                  aria-hidden="true"
                ></i>
                Medien aktualisieren
              </button>
              <button
                class="btn btn-outline-secondary"
                type="button"
                aria-controls="reporting-context-panel"
                :aria-expanded="isContextPanelOpen"
                @click="isContextPanelOpen = !isContextPanelOpen"
              >
                <i
                  class="ni ni-settings-gear-65 me-1"
                  aria-hidden="true"
                ></i>
                {{ isContextPanelOpen ? 'Kontext ausblenden' : 'Kontext einblenden' }}
              </button>
            </div>
          </details>
          <div
            v-if="!templateLoading && !availableTemplates.length && templateAvailability.length"
            class="small text-muted mt-2"
            data-testid="template-availability-hint"
            role="status"
          >
            <strong>{{ templateAvailabilityLead }}</strong>
            <ul class="mb-0 ps-3">
              <li
                v-for="item in templateAvailability"
                :key="item.template.name"
              >
                {{ getReportTemplateDisplayName(item.template, flow.selectedReportLanguage) }} –
                verfügbar für {{ templateAvailabilityExaminationLabel(item) }}
                <code v-if="templateAvailabilityExaminationLabel(item) !== item.examinationName">
                  ({{ item.examinationName }})
                </code>
              </li>
            </ul>
          </div>
          <div
            v-if="templateAvailabilityError"
            class="small text-danger mt-1"
            data-testid="template-availability-error"
            role="alert"
          >
            {{ templateAvailabilityError }}
          </div>
          <div
            v-if="patientExaminationOptionsError"
            class="small text-danger mt-1"
          >
            {{ patientExaminationOptionsError }}
          </div>
          <div
            v-if="caseOptionsError"
            class="small text-danger mt-1"
          >
            {{ caseOptionsError }}
          </div>
          <div
            v-if="patientExaminationCreationError"
            class="small text-danger mt-1"
            role="alert"
          >
            {{ patientExaminationCreationError }}
          </div>
          <div
            v-if="templateSelectionError"
            class="small text-danger mt-1"
            role="alert"
          >
            {{ templateSelectionError }}
          </div>
        </div>
      </div>
      <div
        class="context-summary-grid"
        data-testid="primary-context-summary"
      >
        <div class="context-summary-item is-primary">
          <span class="context-summary-label">Jetzt</span>
          <strong class="context-summary-value">{{ currentStepLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Patient</span>
          <strong class="context-summary-value">{{ patientHeaderLabel }}</strong>
        </div>
        <div class="context-summary-item">
          <span class="context-summary-label">Untersuchung</span>
          <strong class="context-summary-value">{{ examinationTypeLabel }}</strong>
        </div>
      </div>
      <details
        class="context-details mt-2"
        data-testid="context-details"
      >
        <summary class="context-details-toggle">Weitere Kontextinformationen</summary>
        <div class="context-summary-grid mt-2">
          <div class="context-summary-item">
            <span class="context-summary-label">Geburtsdatum</span>
            <strong class="context-summary-value">{{ patientBirthDateLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Technische Fallreferenz</span>
            <strong class="context-summary-value">{{ caseIdLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Status</span>
            <strong class="context-summary-value">{{ caseStatusLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Terminologie</span>
            <strong class="context-summary-value">{{ selectedTerminologyLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Vorlage</span>
            <strong class="context-summary-value">{{ selectedTemplateLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Berichtssprache</span>
            <strong class="context-summary-value">{{ selectedReportLanguageLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Entwurf</span>
            <strong class="context-summary-value">{{ draftSummaryLabel }}</strong>
          </div>
          <div class="context-summary-item">
            <span class="context-summary-label">Medien</span>
            <strong class="context-summary-value">{{ mediaPreloadLabel }}</strong>
          </div>
        </div>
      </details>
      <div
        v-if="terminologyImportMessage"
        class="small mt-2"
        :class="terminology.error ? 'text-danger' : 'text-muted'"
        :role="terminology.error ? 'alert' : 'status'"
      >
        {{ terminologyImportMessage }}
      </div>
      <div
        v-if="terminology.error"
        class="alert alert-warning py-2"
        role="alert"
      >
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
      <div
        v-if="reportLanguagesError"
        class="small text-danger mt-2"
      >
        {{ reportLanguagesError }}
      </div>
    </section>

    <div class="reporting-workspace-toolbar">
      <button
        class="btn btn-primary btn-sm"
        type="button"
        data-testid="generate-llm-report"
        :disabled="llmReport.busy.value || !llmReport.available.value"
        :aria-busy="llmReport.busy.value"
        @click="llmReport.generate"
      >
        <span
          v-if="llmReport.busy.value"
          class="spinner-border spinner-border-sm me-1"
          aria-hidden="true"
        ></span>
        {{
          llmReport.phase.value === 'checking'
            ? 'LLM-Verfügbarkeit prüfen…'
            : llmReport.phase.value === 'graph'
              ? 'Untersuchungskontext laden…'
              : llmReport.phase.value === 'generating'
                ? 'KI-Bericht erstellen…'
                : 'KI-Bericht erstellen'
        }}
      </button>
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        aria-controls="reporting-technical-inspector"
        :aria-expanded="isTechnicalInspectorOpen"
        @click="isTechnicalInspectorOpen = !isTechnicalInspectorOpen"
      >
        <i
          class="fas fa-sliders-h me-1"
          aria-hidden="true"
        ></i>
        {{ isTechnicalInspectorOpen ? 'Technische Details ausblenden' : 'Technische Details' }}
      </button>
    </div>

    <div
      v-if="llmReport.error.value"
      class="alert alert-danger py-2"
      role="alert"
      data-testid="llm-report-error"
    >
      {{ llmReport.error.value }}
    </div>
    <div
      v-if="llmReport.notice.value"
      class="alert alert-info py-2"
      role="status"
      data-testid="llm-report-notice"
    >
      {{ llmReport.notice.value }}
    </div>

    <div
      class="reporting-workspace-grid"
      :class="{ 'has-technical-inspector': isTechnicalInspectorOpen }"
    >
      <aside class="reporting-left-rail">
        <div class="card shadow-sm workflow-panel">
          <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <h6 class="mb-0">Ablauf</h6>
            <span class="small text-muted">{{ currentStepLabel }}</span>
          </div>
          <div class="card-body p-3">
            <div
              v-if="supersededEvaluationNotice"
              class="alert alert-info py-2 mb-3"
              role="status"
              data-testid="superseded-evaluation-notice"
            >
              {{ supersededEvaluationNotice }}
            </div>
            <div
              v-if="draftBootstrapError"
              class="alert alert-warning py-2 mb-3"
            >
              {{ draftBootstrapError }}
            </div>
            <nav
              class="nav flex-column gap-1"
              aria-label="Berichtsablauf"
            >
              <template
                v-for="(item, index) in navItems"
                :key="item.to"
              >
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
                <div
                  v-else
                  class="workflow-step-btn btn btn-sm text-start is-disabled"
                  aria-disabled="true"
                >
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

        <div class="card shadow-sm finding-status-panel">
          <div class="card-header d-flex align-items-center justify-content-between gap-2">
            <div>
              <h6 class="mb-0">Befundstatus</h6>
              <small class="text-muted">{{ findingProgressSummary }}</small>
            </div>
            <span
              class="context-status-pill"
              :class="validationPresentation.pillClass"
            >
              {{ validationPresentation.label }}
            </span>
          </div>
          <div class="card-body p-0">
            <div
              v-if="findingStatusRows.length"
              class="finding-status-controls p-3"
            >
              <label
                class="form-label small fw-semibold"
                for="finding-status-search"
              >
                Befunde filtern
              </label>
              <input
                id="finding-status-search"
                v-model="findingStatusQuery"
                class="form-control form-control-sm"
                type="search"
                placeholder="Name oder Kennung"
              />
              <label
                class="form-label small fw-semibold mt-2"
                for="finding-status-filter"
              >
                Status
              </label>
              <select
                id="finding-status-filter"
                v-model="findingStatusFilter"
                class="form-select form-select-sm"
              >
                <option value="open">Nur offene</option>
                <option value="missing">Fehlend</option>
                <option value="warning">Zu prüfen</option>
                <option value="all">Alle</option>
                <option value="complete">Vollständig</option>
                <option value="required">Erforderlich</option>
                <option value="optional">Optional</option>
              </select>
              <div
                class="finding-status-filter-summary mt-2"
                aria-live="polite"
              >
                {{ filteredFindingStatusSummary }}
                <button
                  v-if="hasFindingStatusFilter"
                  class="btn btn-link btn-sm p-0"
                  type="button"
                  @click="resetFindingStatusFilters"
                >
                  Filter zurücksetzen
                </button>
              </div>
            </div>
            <div
              v-if="findingStatusSections.length"
              class="finding-status-list"
            >
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
                  :data-finding-key="row.normalizedKey"
                  :aria-label="`${row.label}: ${row.statusLabel}`"
                  :title="row.label"
                  :class="[
                    `is-${row.status}`,
                    { 'is-selected': row.normalizedKey === activeReferenceFindingKey }
                  ]"
                  @click="selectedReferenceFindingKey = row.normalizedKey"
                >
                  <span
                    class="finding-status-icon"
                    aria-hidden="true"
                  >
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
            <div
              v-if="hasMoreFindingStatusRows"
              class="finding-status-more p-3 pt-2"
            >
              <button
                class="btn btn-outline-secondary btn-sm w-100"
                type="button"
                @click="showMoreFindingStatusRows"
              >
                Weitere Befunde anzeigen
              </button>
            </div>
            <div
              v-else-if="findingStatusRows.length"
              class="p-3 small text-muted"
              role="status"
            >
              Keine Befunde entsprechen den gewählten Filtern.
            </div>
            <div
              v-else
              class="p-3 small text-muted"
            >
              Noch kein Template oder lokaler Befundentwurf für die Statusliste geladen.
            </div>
          </div>
        </div>
      </aside>

      <main
        id="reporting-workspace"
        class="reporting-main-region"
        tabindex="-1"
        aria-label="Bericht bearbeiten"
      >
        <div
          v-if="isContextPanelOpen"
          id="reporting-context-panel"
          class="card shadow-sm mb-3 context-panel"
        >
          <div class="card-header d-flex justify-content-between align-items-center gap-3">
            <div>
              <h6 class="mb-0">Arbeitskontext</h6>
              <small class="text-muted">Fallstatus, Medien und nächste Aktion</small>
            </div>
            <span
              class="context-status-pill"
              :class="`is-${flow.mediaPreloadStatus}`"
            >
              {{ mediaPreloadLabel }}
            </span>
          </div>
          <div class="card-body">
            <div class="context-quick-grid mb-3">
              <div class="context-tile">
                <span class="context-tile-label">Entwurf</span>
                <strong class="context-tile-value">{{ draftSummaryLabel }}</strong>
                <small class="context-tile-description">{{
                  selectedPatientExaminationLabel
                }}</small>
                <small class="context-tile-description">{{ selectedTemplateLabel }}</small>
                <div
                  v-if="draftBootstrapError"
                  class="alert alert-warning py-2 mt-2 mb-0"
                >
                  {{ draftBootstrapError }}
                </div>
              </div>
              <div class="context-tile">
                <span class="context-tile-label">Medien</span>
                <strong class="context-tile-value">{{ mediaPreloadLabel }}</strong>
                <div
                  v-if="flow.mediaPreloadError"
                  class="alert alert-warning py-2 mt-2 mb-0"
                >
                  {{ flow.mediaPreloadError }}
                </div>
                <small
                  v-else
                  class="context-tile-description"
                  >{{
                    flow.mediaPreload ? 'Bericht, Video und Frames geladen' : 'Noch leer'
                  }}</small
                >
              </div>
              <div class="context-tile">
                <span class="context-tile-label">Nächster Schritt</span>
                <strong class="context-tile-value">{{ nextStepHint }}</strong>
              </div>
            </div>
            <div
              v-if="flow.mediaPreload"
              class="row g-3"
            >
              <div class="col-md-4">
                <div class="media-context-card">
                  <div class="fw-semibold mb-1">Bericht</div>
                  <div
                    v-if="flow.mediaPreload.latestReport"
                    class="small"
                  >
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
                  <div
                    v-else
                    class="small text-muted"
                  >
                    Kein Bericht verfügbar.
                  </div>
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
                  <div
                    v-if="flow.mediaPreload.latestVideo"
                    class="small"
                  >
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
                  <div
                    v-else
                    class="small text-muted"
                  >
                    Kein Video verfügbar.
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="media-context-card">
                  <div class="fw-semibold mb-1">Frames</div>
                  <button
                    class="btn btn-outline-secondary btn-sm mb-2"
                    :disabled="frameCandidatesLoading"
                    @click="loadFrameCandidates()"
                  >
                    Frames durchsuchen
                  </button>
                  <label
                    for="report-frame-label"
                    class="form-label small"
                    >Nach vorherigem Label filtern</label
                  >
                  <select
                    id="report-frame-label"
                    v-model="frameFilterLabel"
                    class="form-select form-select-sm mb-2"
                    @change="loadFrameCandidates()"
                  >
                    <option value="">Alle Labels</option>
                    <option
                      v-for="label in frameFilterLabels"
                      :key="label"
                      :value="label"
                    >
                      {{ label }}
                    </option>
                  </select>
                  <div
                    v-if="frameCandidatesError"
                    class="text-danger"
                    role="alert"
                  >
                    {{ frameCandidatesError }}
                  </div>
                  <div
                    v-if="frameCandidatesLoading"
                    class="small text-muted"
                  >
                    Frames werden geladen…
                  </div>
                  <div class="small d-grid gap-2">
                    <button
                      v-for="frame in visibleReportFrames"
                      :key="`${frame.videoId}-${frame.frameNumber}`"
                      class="btn btn-outline-secondary btn-sm text-start"
                      @click="selectFrameStream(frame)"
                    >
                      Video {{ frame.videoId }} · #{{ frame.frameNumber }} ·
                      {{
                        'labels' in frame
                          ? frame.labels.join(', ')
                          : frame.segmentLabel || frame.category || ''
                      }}
                    </button>
                    <img
                      v-if="selectedFrameStreamUrl"
                      class="img-fluid rounded border mt-1"
                      :src="selectedFrameStreamUrl"
                      alt="Selected frame stream preview"
                    />
                    <span
                      v-if="framePreview.loading.value"
                      class="text-muted"
                      >Frame wird geladen…</span
                    >
                    <span
                      v-if="framePreview.error.value"
                      class="text-danger"
                      role="alert"
                      >{{ framePreview.error.value }}</span
                    >
                  </div>
                  <div
                    v-if="!visibleReportFrames.length && !frameCandidatesLoading"
                    class="small text-muted"
                  >
                    Keine Frames verfügbar.
                  </div>
                  <button
                    v-if="frameCandidatesNextOffset !== null"
                    class="btn btn-outline-secondary btn-sm"
                    :disabled="frameCandidatesLoading"
                    @click="loadFrameCandidates(true)"
                  >
                    Weitere Frames
                  </button>
                  <button
                    class="btn btn-primary btn-sm mt-2"
                    :disabled="!canAddReportFrame"
                    data-test="add-report-frame"
                    @click="
                      flow.preferredReportFrame && flow.addReportFrame(flow.preferredReportFrame)
                    "
                  >
                    Zum Bericht hinzufügen
                  </button>
                  <div
                    class="small mt-2"
                    aria-live="polite"
                  >
                    <template v-if="flow.selectedReportFrames != null"
                      >{{ flow.selectedReportFrames.length }} / 24 Bilder ausgewählt</template
                    >
                    <template v-else
                      >Ohne eigene Auswahl wird das zuletzt angeklickte Bild bevorzugt.</template
                    >
                  </div>
                  <ul
                    v-if="flow.selectedReportFrames?.length"
                    class="list-unstyled mt-2"
                  >
                    <li
                      v-for="frame in flow.selectedReportFrames"
                      :key="`${frame.videoId}-${frame.frameNumber}`"
                      class="d-flex gap-2 align-items-center mb-1"
                    >
                      <button
                        class="btn btn-link btn-sm"
                        @click="selectFrameStream(frame)"
                      >
                        Video {{ frame.videoId }} · #{{ frame.frameNumber }}
                      </button>
                      <button
                        class="btn btn-outline-danger btn-sm"
                        :aria-label="`Frame ${frame.frameNumber} entfernen`"
                        @click="flow.removeReportFrame(frame)"
                      >
                        Entfernen
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div
              v-else
              class="small text-muted"
            >
              Noch keine zuletzt geladenen Medien verfügbar.
            </div>
          </div>
        </div>
        <RouterView />
      </main>

      <aside
        v-show="isTechnicalInspectorOpen"
        id="reporting-technical-inspector"
        class="reporting-right-rail"
        aria-label="Technische Berichtsdetails"
      >
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
            <div
              v-if="templateReferenceError"
              class="alert alert-warning py-2 small"
            >
              {{ templateReferenceError }}
            </div>

            <template v-if="activeReferenceFinding">
              <div class="kb-focus-block mb-3">
                <span class="kb-focus-label">Aktiver Befund</span>
                <strong class="kb-focus-value">{{ activeReferenceFinding.label }}</strong>
                <small class="kb-focus-description">{{ activeFindingDescription }}</small>
              </div>

              <div class="kb-reference-group">
                <h6 class="kb-reference-heading">Klassifikationen</h6>
                <div
                  v-if="activeReferenceClassifications.length"
                  class="kb-classification-list"
                >
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
                    <small
                      v-if="classification.choicesLabel"
                      class="kb-classification-description"
                    >
                      {{ classification.choicesLabel }}
                    </small>
                    <small
                      v-if="classification.inputLabel"
                      class="kb-classification-description"
                    >
                      {{ classification.inputLabel }}
                    </small>
                    <small
                      v-if="classification.description"
                      class="kb-classification-description"
                    >
                      {{ classification.description }}
                    </small>
                  </div>
                </div>
                <div
                  v-else
                  class="small text-muted"
                >
                  Keine Klassifikationen im aktuellen Template hinterlegt.
                </div>
              </div>

              <div class="kb-reference-group">
                <h6 class="kb-reference-heading">PatientLedger</h6>
                <div
                  v-if="activeFindingInstances.length"
                  class="runtime-instance-list"
                >
                  <div
                    v-for="instance in activeFindingInstances"
                    :key="instance.localId || instance.finding"
                    class="runtime-instance-row"
                  >
                    {{ formatRuntimeFindingInstance(instance) }}
                  </div>
                </div>
                <div
                  v-else
                  class="small text-muted"
                >
                  Keine lokale Instanz dieses Befunds im Entwurf.
                </div>
              </div>

              <div class="kb-reference-group">
                <h6 class="kb-reference-heading">Regelhinweise</h6>
                <div
                  v-if="activeAdviceRows.length"
                  class="kb-advice-list"
                >
                  <div
                    v-for="row in activeAdviceRows"
                    :key="row.key"
                    class="kb-advice-row"
                    :class="{ 'is-ok': row.ok, 'is-warning': !row.ok }"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ row.title }}</strong>
                      <span class="kb-advice-kind">{{ row.kind }}</span>
                    </div>
                    <small class="kb-advice-description">{{ row.detail }}</small>
                    <small
                      v-for="message in row.messages"
                      :key="message"
                      class="kb-advice-description"
                    >
                      {{ message }}
                    </small>
                  </div>
                </div>
                <div
                  v-else
                  class="small text-muted"
                >
                  Keine kontextbezogenen Laufzeitregeln für diesen Befund.
                </div>
              </div>

              <div
                v-if="activeSuggestedActions.length"
                class="kb-reference-group"
              >
                <h6 class="kb-reference-heading">Vorschläge</h6>
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

            <div
              v-else
              class="small text-muted"
            >
              Wählen Sie einen Fall mit Template, um die KB-Referenz zu sehen.
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import ReportingContextSelection from '@/components/Reporting/ReportingContextSelection.vue'
import { computed, onMounted, provide, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import axiosInstance, { r } from '@/api/axiosInstance'
import { findingsApi } from '@/api/findingsApi'
import {
  fetchExaminationReportingContext,
  fetchKnowledgeBaseGraphSnapshot
} from '@/api/knowledgeBaseGraphApi'
import { fetchPatientExaminationDraft } from '@/api/reportDraftApi'
import type { ReportDraftBlob } from '@/api/reportDraftApi'
import { createCaseWithExamination, fetchPatientCases, type PatientCase } from '@/api/casesApi'
import {
  fetchReportingLanguages,
  type ReportLanguageCode,
  type ReportLanguageOption
} from '@/api/reportingLanguagesApi'
import ReportImportPanel from '@/components/Reporting/ReportImportPanel.vue'
import { reportVerbosityLabels, type ReportVerbosity } from '@/types/reportTemplate'
import { useLlmReportGeneration } from '@/composables/reporting/useLlmReportGeneration'
import { useAuthenticatedFramePreview } from '@/composables/useAuthenticatedFramePreview'
import { fetchReportFrameCandidates, type ReportFrameCandidate } from '@/api/reportExportApi'
import type { ReportFrameSelection } from '@/utils/frameStreams'
import {
  buildReportTemplateRuntimePayload,
  describeReportTemplateTitle,
  getReportTemplateDisplayName,
  getReportTemplateSectionDisplayName
} from '@/api/reportTemplatesApi'
import {
  getFindingCatalogLocalizedName,
  mergeFindingClassifications,
  type Finding
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
import { endpoints } from '@/types/api/endpoints'
import {
  isVerifiedRuntimeDraftForBundle,
  useReportingFlowStore,
  type ReportingRuntimeDraft
} from '@/stores/reportingFlowStore'
import { terminologyBatchImportMessage, useTerminologyStore } from '@/stores/terminologyStore'
import { usePatientStore } from '@/stores/patientStore'
import { useExaminationStore } from '@/stores/examinationStore'
import { usePatientExaminationStore } from '@/stores/patientExaminationStore'
import type { PatientExamination } from '@/stores/patientExaminationStore'
import { fetchPatientTimelineLatest, pickPreferredReportStream } from '@/api/reportingTimelineApi'
import { useAuthenticatedVideoStream } from '@/composables/useAuthenticatedVideoStream'
import type { StreamableVideoFileType } from '@/utils/mediaUrls'
import { reportingApiError, reportingApiErrorMessage } from './reportingError'
import {
  ReportingKnowledgeBaseMismatchError,
  readReportingKnowledgeBaseIdentity,
  type ReportingKnowledgeBaseIdentity
} from './reportingKnowledgeBaseContext'
import { createRuntimeLogger, type SafeLogContext } from '@/utils/runtimeLogger'
import {
  reportTemplateLifecycleContextKey,
  type ReportTemplateLifecycleChange
} from './reportTemplateLifecycleContext'
import { normalizeReportingIndicationSelections } from './reportingIndicationContract'
import { useReportingKnowledgeBase } from './useReportingKnowledgeBase'
import {
  SupersededReportingDagError,
  commitReportingDagAtomically,
  createImmutableReportingDag,
  executeReportingDag,
  type ReportingDagInputs
} from './reportingResolutionGraph'

import {
  groupValidationMessages,
  descriptorLabelsForSections,
  filterFindingStatuses,
  type FindingStatusFilter
} from './reportingValidationPresentation'

import {
  classificationReferences,
  groupFindingSections,
  indexFindingInstances,
  missingRequiredClassifications
} from './reportingFindingReference'

const logger = createRuntimeLogger('reporting-shell')
import {
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
const patientStore = usePatientStore()
const examinationStore = useExaminationStore()
const patientExaminationStore = usePatientExaminationStore()
const reportingVideoElement = ref<HTMLVideoElement | null>(null)
const selectedVideoArtifactKind = ref<StreamableVideoFileType>('processed')
const framePreview = useAuthenticatedFramePreview()
const selectedFrameStreamUrl = framePreview.imageUrl
let frameSelectionGeneration = 0
const isContextPanelOpen = ref(false)
const isTechnicalInspectorOpen = ref(false)
const findingStatusQuery = ref('')
const findingStatusFilter = ref<FindingStatusFilter>('open')
const FINDING_STATUS_PAGE_SIZE = 50
const findingStatusVisibleLimit = ref(FINDING_STATUS_PAGE_SIZE)
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

type KbAdviceRow = {
  key: string
  kind: string
  title: string
  detail: string
  ok: boolean
  messages: string[]
}

type TemplateAvailabilityItem = {
  template: ReportTemplatePayload
  examinationName: string
  examinationNameDe?: string
  examinationNameEn?: string
}

const patientExaminationOptions = ref<PatientExaminationOption[]>([])
const patientExaminationOptionsLoading = ref(false)
const patientExaminationOptionsError = ref<string | null>(null)
const caseOptions = ref<PatientCase[]>([])
const caseOptionsLoading = ref(false)
const caseOptionsError = ref<string | null>(null)
const patientExaminationCreationLoading = ref(false)
const patientExaminationCreationError = ref<string | null>(null)
const draftBootstrapInFlight = ref<{ key: string; promise: Promise<void> } | null>(null)
const draftBootstrapError = ref<string | null>(null)
const supersededEvaluationNotice = ref<string | null>(null)
const patientExaminationDetail = ref<Record<string, unknown> | null>(null)
const patientExaminationIdentityLoadedId = ref<number | null>(null)
const templateReference = ref<ReportTemplatePayload | null>(null)
const templateReferenceLoading = ref(false)
const templateReferenceError = ref<string | null>(null)
const templateReferenceKey = ref<string | null>(null)
const availableTemplates = ref<ReportTemplatePayload[]>([])
const templateLoading = ref(false)
const templateSelectionError = ref<string | null>(null)
const templateAvailability = ref<TemplateAvailabilityItem[]>([])
const templateAvailabilityError = ref<string | null>(null)
const selectedReferenceFindingKey = ref<string | null>(null)
const findingCatalog = ref<Finding[]>([])
const findingCatalogLoading = ref(false)
let draftBootstrapGeneration = 0
let findingCatalogRequestGeneration = 0
let patientOptionsRequestGeneration = 0
let caseOptionsRequestGeneration = 0
let mediaPreloadRequestGeneration = 0
let routeContextWatchGeneration = 0

const patients = computed(() => patientStore.patientsWithDisplayName)
const examinations = computed(() => examinationStore.examinationsDropdown)
const patientsLoading = computed(() => patientStore.loading)
const examinationsLoading = computed(() => examinationStore.loading)

const { getCatalogContext, pinnedIdentity } = useReportingKnowledgeBase(patientExaminationDetail)

type DraftBootstrapContext = {
  readonly generation: number
  readonly patientExaminationId: number
  readonly bundleKey: string
  readonly moduleName: string
  readonly moduleVersion: string
  readonly pinnedIdentity: ReportingKnowledgeBaseIdentity | null
}

type BootstrapDagContext = Readonly<{
  evaluation: DraftBootstrapContext
  option: PatientExaminationOption | null
  selectedTemplateName: string | null
  allowMissingTemplate: boolean
}>

type BootstrapTemplateResult = Readonly<{
  templates: readonly ReportTemplatePayload[]
  availability: readonly TemplateAvailabilityItem[]
  availabilityError: string | null
}>

type BootstrapFindingResult = Readonly<{
  rows: readonly Finding[]
  byId: ReadonlyMap<number, Finding>
}>

type BootstrapDraftResult = Readonly<{
  detail: Record<string, unknown>
  templates: BootstrapTemplateResult
  findings: BootstrapFindingResult
  selectedTemplate: ReportTemplatePayload | null
  payload: ReportTemplateRuntimePayload | null
}>

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
  if (!Number.isFinite(parsed)) {
    return null
  }
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
watch([activePatientExaminationId, () => flow.authSubject], () => {
  frameSelectionGeneration += 1
  framePreview.clear()
  flow.setPreferredReportFrame(null, 'idle')
})
const findingsStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/findings`
    : '/reporting'
)
const reportEditorStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/report-editor`
    : '/reporting'
)
const frameSelectorStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/frame-selector`
    : '/reporting'
)
const reportExportStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/report-export`
    : '/reporting'
)
const finalizedStepTarget = computed(() =>
  activePatientExaminationId.value
    ? `/reporting/${String(activePatientExaminationId.value)}/finalized`
    : '/reporting'
)
const reportEditorTarget = computed(() => {
  if (!activePatientExaminationId.value) {
    return null
  }
  return `/reporting/${String(activePatientExaminationId.value)}/report-editor`
})
const canNavigateToReportEditor = computed(() => Boolean(reportEditorTarget.value))

watch(
  routePatientId,
  async (patientId) => {
    if (patientId && patientId !== flow.selectedPatientId) {
      if (!(await flushDraftBeforeContextSwitch(null))) {
        return
      }
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
    label: 'Export',
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
const activeKbVersion = computed(() => terminology.activeBundle?.version || '')

const selectedPatientExaminationOption = computed(
  () =>
    patientExaminationOptions.value.find((entry) => entry.id === routePatientExaminationId.value) ||
    patientExaminationOptions.value.find((entry) => entry.id === flow.patientExaminationId) ||
    null
)

const activeExaminationName = computed(() => {
  const option = selectedPatientExaminationOption.value
  if (option?.examinationName && option.examinationName !== 'Untersuchung') {
    return option.examinationName
  }
  return (
    readString(readRecord(patientExaminationDetail.value?.examination), 'name') ||
    readString(patientExaminationDetail.value, 'examinationName', 'examination_name') ||
    flow.currentRuntimeDraft?.payload.examination ||
    ''
  )
})

provide(reportTemplateLifecycleContextKey, {
  activeModuleName: activeKbModule,
  activeModuleVersion: activeKbVersion,
  activeExaminationName,
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
    context.moduleName === activeKbModule.value &&
    context.moduleVersion === activeKbVersion.value
  )
}

function assertBootstrapContextCurrent(context?: DraftBootstrapContext): void {
  if (context && !isBootstrapContextCurrent(context)) {
    throw new SupersededReportingContextError('Reporting context changed during loading.')
  }
}

function formatEvaluationIdentity(identity: ReportingKnowledgeBaseIdentity | null): string | null {
  return identity ? `${identity.moduleName}@${identity.moduleVersion}` : null
}

function evaluationLogContext(
  context: DraftBootstrapContext,
  responseIdentity: ReportingKnowledgeBaseIdentity | null = null,
  extra: SafeLogContext = {}
): SafeLogContext {
  return {
    evaluationId: `reporting-${String(context.patientExaminationId)}-${String(context.generation)}`,
    patientExaminationId: context.patientExaminationId,
    pinnedIdentity: formatEvaluationIdentity(context.pinnedIdentity),
    requestedIdentity:
      context.moduleName && context.moduleVersion
        ? `${context.moduleName}@${context.moduleVersion}`
        : null,
    responseIdentity: formatEvaluationIdentity(responseIdentity),
    registryRevision: terminology.registryRevision ?? null,
    ...extra
  }
}

function reportSupersededEvaluation(
  context: DraftBootstrapContext,
  supersessionReason: string
): void {
  supersededEvaluationNotice.value =
    'Eine veraltete Reporting-Anfrage wurde verworfen; der aktuelle Untersuchungskontext bleibt unverändert.'
  logger.warn(
    'evaluation-superseded',
    evaluationLogContext(context, null, {
      reasonCode: 'superseded',
      supersessionReason
    })
  )
}

const draftSummaryLabel = computed(() => {
  const draft = flow.currentRuntimeDraft
  if (!draft) {
    return 'leer'
  }
  if (draft.verificationStatus === 'unverified') {
    return 'vorhanden · ungeprüft'
  }
  return draft.hydratedFrom === 'session_storage' || draft.hydratedFrom === 'draft_api'
    ? 'wiederhergestellt'
    : 'initialisiert'
})

const selectedPatientExaminationLabel = computed(
  () =>
    selectedPatientExaminationOption.value?.label ||
    (flow.patientExaminationId ? `#${String(flow.patientExaminationId)}` : 'Noch nicht gewählt')
)

const selectedTemplateLabel = computed(() => {
  if (!flow.selectedTemplateName) {
    return 'Noch keine Vorlage gewählt'
  }
  const template = availableTemplates.value.find(
    (entry) => entry.name === flow.selectedTemplateName
  )
  return template
    ? getReportTemplateDisplayName(template, flow.selectedReportLanguage)
    : describeReportTemplateTitle(flow.selectedTemplateName)
})

const templateAvailabilityLead = computed(() =>
  activeExaminationName.value
    ? 'Für die gewählte Untersuchung ist keine Vorlage verfügbar. Verfügbare Vorlagen:'
    : 'Der Patientenuntersuchung ist keine Untersuchung zugeordnet. Verfügbare Vorlagen:'
)

function templateAvailabilityExaminationLabel(item: TemplateAvailabilityItem): string {
  if (flow.selectedReportLanguage === 'en') {
    return item.examinationNameEn || item.examinationNameDe || item.examinationName
  }
  return item.examinationNameDe || item.examinationNameEn || item.examinationName
}

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

const visibleTerminologyBundles = computed(() =>
  terminology.filteredBundles.length ? terminology.filteredBundles : terminology.bundles
)

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

const currentStepLabel = computed(
  () => navItems.value.find((item) => isActive(item.to))?.label || 'Arbeitsbereich'
)

const mediaPreloadLabels = {
  idle: 'nicht geladen',
  loading: 'wird geladen',
  error: 'Fehler',
  ready: 'bereit'
} satisfies Record<typeof flow.mediaPreloadStatus, string>
const mediaPreloadLabel = computed(() => mediaPreloadLabels[flow.mediaPreloadStatus])

const currentPayload = computed(() => flow.currentRuntimeDraft?.payload || null)

const reportVerbosityOptions = computed<ReportVerbosity[]>(
  () => templateReference.value?.verbosityOptions ?? ['standard']
)
watch(
  () => [flow.selectedTemplateName, reportVerbosityOptions.value] as const,
  () => {
    flow.selectedReportVerbosity = 'standard'
  },
  { immediate: true }
)

function hasUsableLlmDraftContext(
  draft: ReportingRuntimeDraft,
  identity: ReportTemplateIdentity,
  patientExaminationId: number
): boolean {
  const matchesDraft =
    draft.verificationStatus === 'verified' &&
    draft.patientExaminationId === patientExaminationId &&
    draft.templateName === flow.selectedTemplateName
  const matchesKnowledgeBase =
    Boolean(identity.moduleName) &&
    Boolean(identity.knowledgeBaseVersion) &&
    identity.moduleName === activeKbModule.value &&
    identity.knowledgeBaseVersion === activeKbVersion.value
  return matchesDraft && matchesKnowledgeBase
}

function getLlmReportContext() {
  const draft = flow.currentRuntimeDraft
  const identity = flow.selectedTemplateIdentity
  const patientExaminationId = activePatientExaminationId.value
  const templateName = flow.selectedTemplateName
  if (!draft || !identity || !patientExaminationId || !templateName) {
    return null
  }
  const moduleName = identity.moduleName
  const moduleVersion = identity.knowledgeBaseVersion
  if (!moduleName || !moduleVersion) {
    return null
  }
  if (!hasUsableLlmDraftContext(draft, identity, patientExaminationId)) {
    return null
  }
  if (!llmGenerationIsReady(draft, identity)) {
    return null
  }
  return {
    patientExaminationId,
    moduleName,
    moduleVersion,
    examinationName: draft.payload.examination,
    templateName,
    templateIdentity: identity,
    language: flow.selectedReportLanguage,
    verbosity: flow.selectedReportVerbosity,
    documentedFindings: draft.payload.patientFindings,
    sectionNotes: Object.entries(flow.templateSectionDrafts).flatMap(([name, section]) =>
      section ? [{ name, note: section.note }] : []
    ),
    existingText: flow.renderedReportText
  }
}

function llmGenerationIsReady(
  draft: ReportingRuntimeDraft,
  identity: ReportTemplateIdentity
): boolean {
  const templateIsPublished = identity.lifecycleStatus === 'published'
  const hasRequiredContent = Boolean(draft.payload.examination)
  const generationIsAvailable =
    !templateReferenceLoading.value && flow.draftPersistenceStatus !== 'conflict'
  return templateIsPublished && hasRequiredContent && generationIsAvailable
}

const llmReport = useLlmReportGeneration({
  getContext: getLlmReportContext,
  applyText: (text, patientExaminationId) => {
    flow.setRenderedReportText(text, 'manual')
    void router.push(`/reporting/${String(patientExaminationId)}/report-editor`)
  },
  confirmReplace: () =>
    window.confirm('Vorhandenen Berichtstext durch einen neuen KI-Entwurf ersetzen?')
})

const caseIdLabel = computed(() => flow.caseId || 'Noch nicht gewählt')

const selectedPatientCase = computed(
  () => caseOptions.value.find((patientCase) => patientCase.caseId === flow.caseId) || null
)

function timelinePatientLabel(): string | null {
  const timelinePatient = flow.mediaPreload?.patient || null
  const timelineName = [timelinePatient?.firstName, timelinePatient?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (timelineName) {
    return timelineName
  }
  return timelinePatient?.patientHash || null
}

function detailPatientLabel(): string | null {
  const detailPatient = readRecord(patientExaminationDetail.value?.patient)
  const detailName = [
    readString(detailPatient, 'firstName', 'first_name', 'givenName', 'given_name'),
    readString(detailPatient, 'lastName', 'last_name', 'familyName', 'family_name')
  ]
    .filter(Boolean)
    .join(' ')
    .trim()
  if (detailName) {
    return detailName
  }
  return readString(detailPatient, 'patientHash', 'patient_hash', 'hash', 'pseudonym') || null
}

const patientHeaderLabel = computed(() => {
  return (
    timelinePatientLabel() ||
    detailPatientLabel() ||
    currentPayload.value?.patient ||
    (flow.selectedPatientId ? 'Patient ausgewählt' : 'Nicht gewählt')
  )
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

const examinationTypeLabel = computed(
  () =>
    selectedPatientExaminationOption.value?.examinationDisplayName ||
    readString(
      readRecord(patientExaminationDetail.value?.examination),
      'nameDe',
      'name_de',
      'displayName',
      'display_name',
      'name'
    ) ||
    readString(patientExaminationDetail.value, 'examinationName', 'examination_name') ||
    currentPayload.value?.examination ||
    'Nicht gewählt'
)

const caseStatusLabel = computed(() => {
  if (selectedPatientCase.value?.isClosed) {
    return 'Fall geschlossen'
  }
  if (selectedPatientCase.value?.isActive) {
    return 'Fall aktiv'
  }
  if (selectedPatientCase.value) {
    return 'Fall inaktiv'
  }
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

const validationPresentation = computed(() => {
  if (!flow.lastTemplateValidation) {
    return { label: 'ungeprüft', pillClass: 'is-idle' }
  }
  return flow.lastTemplateValidation.ok
    ? { label: 'valide', pillClass: 'is-ready' }
    : { label: 'offen', pillClass: 'is-error' }
})

const templateSectionsForReference = computed(() =>
  (templateReference.value?.reportSections || [])
    .slice()
    .sort((left, right) => (left.position || 0) - (right.position || 0))
)

const descriptorLabelsByName = computed(() =>
  descriptorLabelsForSections(templateSectionsForReference.value)
)

function getDescriptorLabel(name: string): string {
  return descriptorLabelsByName.value.get(normalizeKey(name)) || formatKnowledgeName(name)
}

const catalogFindingsByName = computed(
  () => new Map(findingCatalog.value.map((finding) => [normalizeKey(finding.name), finding]))
)

const validationIssueMessagesByFinding = computed(() =>
  groupValidationMessages(flow.lastTemplateValidation)
)

const findingInstancesByName = computed(() =>
  indexFindingInstances(currentPayload.value?.patientFindings ?? [])
)

const findingStatusRows = computed<FindingStatusRow[]>(() => {
  const rows = templateSectionsForReference.value.flatMap((section) =>
    section.findings.map((templateFinding) =>
      buildFindingStatusRow({
        findingName: templateFinding.finding,
        sectionKey: normalizeKey(section.name),
        sectionTitle: getReportTemplateSectionDisplayName(section, flow.selectedReportLanguage),
        required: templateFinding.required,
        templateFinding
      })
    )
  )

  if (rows.length) {
    return rows
  }

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

const filteredFindingStatusRows = computed(() =>
  filterFindingStatuses(
    findingStatusRows.value,
    findingStatusFilter.value,
    findingStatusQuery.value
  )
)

const findingStatusSections = computed(() =>
  groupFindingSections(filteredFindingStatusRows.value.slice(0, findingStatusVisibleLimit.value))
)

const filteredFindingStatusCount = computed(() => filteredFindingStatusRows.value.length)

const hasMoreFindingStatusRows = computed(
  () => filteredFindingStatusCount.value > findingStatusVisibleLimit.value
)

const filteredFindingStatusSummary = computed(
  () =>
    `${String(filteredFindingStatusCount.value)} von ${String(findingStatusRows.value.length)} Befunden`
)

const hasFindingStatusFilter = computed(
  () => findingStatusFilter.value !== 'open' || Boolean(findingStatusQuery.value.trim())
)

function resetFindingStatusFilters() {
  findingStatusQuery.value = ''
  findingStatusFilter.value = 'open'
}

function showMoreFindingStatusRows() {
  findingStatusVisibleLimit.value += FINDING_STATUS_PAGE_SIZE
}

watch([findingStatusQuery, findingStatusFilter], () => {
  findingStatusVisibleLimit.value = FINDING_STATUS_PAGE_SIZE
})

const findingProgressSummary = computed(() => {
  const rows = findingStatusRows.value
  if (!rows.length) {
    return 'Keine Befunde'
  }
  const complete = rows.filter((row) => row.status === 'complete').length
  const open = rows.filter((row) => row.status === 'warning' || row.status === 'missing').length
  return open
    ? `${String(complete)}/${String(rows.length)} vollständig · ${String(open)} offen`
    : `${String(complete)}/${String(rows.length)} vollständig`
})

const routeReferenceFindingKey = computed(() =>
  typeof route.hash === 'string' ? route.hash.match(/^#finding-(.+)$/)?.[1] : undefined
)

const activeReferenceFindingKey = computed(
  () =>
    [selectedReferenceFindingKey.value, routeReferenceFindingKey.value]
      .filter((key): key is string => Boolean(key))
      .map((key) => findingStatusRows.value.find((row) => row.normalizedKey === normalizeKey(key)))
      .find(Boolean)?.normalizedKey ||
    findingStatusRows.value.find((row) => row.status === 'warning' || row.status === 'missing')
      ?.normalizedKey ||
    findingStatusRows.value[0]?.normalizedKey ||
    null
)

const activeReferenceFinding = computed(
  () =>
    findingStatusRows.value.find((row) => row.normalizedKey === activeReferenceFindingKey.value) ??
    null
)

const activeFindingInstances = computed(() =>
  activeReferenceFinding.value
    ? (findingInstancesByName.value.get(activeReferenceFinding.value.normalizedKey) ?? [])
    : []
)

const activeFindingCatalogDefinition = computed(() =>
  activeReferenceFinding.value
    ? (catalogFindingsByName.value.get(activeReferenceFinding.value.normalizedKey) ?? null)
    : null
)

const activeFindingDescription = computed(
  () =>
    activeFindingCatalogDefinition.value?.description.trim() ||
    'Keine Beschreibung in der geladenen KB-Definition.'
)

const activeReferenceClassifications = computed(() =>
  activeReferenceFinding.value
    ? classificationReferences(
        activeReferenceFinding.value.templateFinding,
        activeFindingCatalogDefinition.value,
        descriptorLabelsByName.value
      )
    : []
)

const activeAdviceRows = computed<KbAdviceRow[]>(() => {
  const active = activeReferenceFinding.value
  if (!active) {
    return []
  }
  return [...interventionAdviceRows(active.findingName), ...unitAdviceRows(active.findingName)]
})

const activeSuggestedActions = computed(() => {
  const active = activeReferenceFinding.value
  if (!active) {
    return []
  }
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
  if (!templateName) {
    return `${moduleName} · kein Template`
  }
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
  if (!url) {
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

function selectVideoStream(artifactKind: string | null) {
  if (!isVideoArtifactKind(artifactKind)) {
    return
  }
  selectedVideoArtifactKind.value = artifactKind
}

const frameFilterLabel = ref('')
const frameCandidates = ref<ReportFrameCandidate[] | null>(null)
const frameFilterLabels = ref<string[]>([])
const frameCandidatesLoading = ref(false)
const frameCandidatesError = ref('')
const frameCandidatesNextOffset = ref<number | null>(null)
let frameCandidatesGeneration = 0
const visibleReportFrames = computed(
  () => frameCandidates.value ?? flow.mediaPreload?.latestFrames ?? []
)
const canAddReportFrame = computed(() => {
  const frame = flow.preferredReportFrame
  return (
    frame &&
    flow.reportFrameSelectionStatus === 'ready' &&
    (flow.selectedReportFrames?.length ?? 0) < 24 &&
    !flow.selectedReportFrames?.some(
      (item) => item.videoId === frame.videoId && item.frameNumber === frame.frameNumber
    )
  )
})

function isCurrentFrameCandidateRequest(generation: number): boolean {
  return generation === frameCandidatesGeneration
}

function applyFrameCandidatePage(
  page: Awaited<ReturnType<typeof fetchReportFrameCandidates>>,
  append: boolean
): void {
  const previousFrames = append ? (frameCandidates.value ?? []) : []
  frameCandidates.value = [...previousFrames, ...page.frames]
  frameFilterLabels.value = page.labels
  frameCandidatesNextOffset.value = page.nextOffset
}

async function loadFrameCandidates(append = false) {
  const examinationId = activePatientExaminationId.value
  if (!examinationId) {
    return
  }
  const generation = ++frameCandidatesGeneration
  frameCandidatesLoading.value = true
  frameCandidatesError.value = ''
  if (!append) {
    frameCandidates.value = []
    frameCandidatesNextOffset.value = null
  }
  try {
    const page = await fetchReportFrameCandidates(
      examinationId,
      frameFilterLabel.value,
      append ? (frameCandidatesNextOffset.value ?? 0) : 0
    )
    if (!isCurrentFrameCandidateRequest(generation)) {
      return
    }
    applyFrameCandidatePage(page, append)
  } catch {
    if (isCurrentFrameCandidateRequest(generation)) {
      frameCandidatesError.value = 'Frames konnten nicht geladen werden.'
    }
  } finally {
    if (isCurrentFrameCandidateRequest(generation)) {
      frameCandidatesLoading.value = false
    }
  }
}
watch([activePatientExaminationId, () => flow.authSubject], () => {
  ++frameCandidatesGeneration
  frameCandidates.value = null
  frameFilterLabels.value = []
  frameFilterLabel.value = ''
  frameCandidatesNextOffset.value = null
  frameCandidatesLoading.value = false
  frameCandidatesError.value = ''
})

async function selectFrameStream(
  frame: Pick<ReportFrameSelection, 'videoId' | 'frameNumber'>,
  preferForExport = true
) {
  const generation = ++frameSelectionGeneration
  if (preferForExport) {
    flow.setPreferredReportFrame(null, 'loading')
  }
  const selection = await framePreview.load(frame.videoId, frame.frameNumber)
  if (generation !== frameSelectionGeneration) {
    return
  }
  if (preferForExport) {
    flow.setPreferredReportFrame(selection, selection ? 'ready' : 'error')
  }
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
  if (!reportEditorTarget.value) {
    return
  }
  void router.push(reportEditorTarget.value)
}

async function onTerminologyBundleSelect(bundleKey: string) {
  const bundle = terminology.findBundleByKey(bundleKey)
  if (!bundle) {
    return
  }
  terminologyImportMessage.value = ''
  try {
    if (flow.hasUnpersistedDraftChanges) {
      await flow.flushDraftAutosave()
    }
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
  if (!files.length) {
    return
  }

  terminologyImportMessage.value = ''
  try {
    if (flow.hasUnpersistedDraftChanges) {
      await flow.flushDraftAutosave()
    }
    const result = await terminology.importBundleFolders(files)
    terminologyImportMessage.value = terminologyBatchImportMessage(result)
    if (result.imported.length) {
      await reconcileActiveTerminology()
    }
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
  if (!files.length) {
    return
  }

  terminologyImportMessage.value = ''
  try {
    if (flow.hasUnpersistedDraftChanges) {
      await flow.flushDraftAutosave()
    }
    const result = await terminology.importBundles(files)
    terminologyImportMessage.value = terminologyBatchImportMessage(result)
    if (result.imported.length) {
      await reconcileActiveTerminology()
    }
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
  if (isUnknownArray(value)) {
    return value
  }
  const results = readRecord(value).results
  if (isUnknownArray(results)) {
    return results
  }
  throw new TypeError('Patient examination list response must contain an array.')
}

function readString(
  record: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!record) {
    return null
  }
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }
  }
  return null
}

function findingAnchorId(findingName: string): string {
  return `finding-${normalizeKey(findingName)}`
}

function getFindingLabel(findingName: string): string {
  const finding = catalogFindingsByName.value.get(normalizeKey(findingName))
  return finding ? getFindingCatalogLocalizedName(finding, 'de') : formatKnowledgeName(findingName)
}

function getClassificationLabel(findingName: string, classificationName: string): string {
  const finding = catalogFindingsByName.value.get(normalizeKey(findingName))
  const classification = mergeFindingClassifications(finding).find(
    (entry) => normalizeKey(entry.name) === normalizeKey(classificationName)
  )
  return classification
    ? getFindingCatalogLocalizedName(classification, 'de')
    : formatKnowledgeName(classificationName)
}

function instancesForFinding(findingName: string): ReportTemplateRuntimePatientFindingInput[] {
  return findingInstancesByName.value.get(normalizeKey(findingName)) ?? []
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
  const missingClassifications = missingRequiredClassifications(
    params.templateFinding,
    instances
  ).map((classification) => getClassificationLabel(params.findingName, classification))
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
  if (params.required && !instances.length) {
    status = 'missing'
  } else if (validationMessages.length || missingClassifications.length) {
    status = 'warning'
  } else if (instances.length) {
    status = 'complete'
  }

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
  if (!patientExaminationId) {
    return { path: route.path, hash: `#${row.anchorId}` }
  }
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
  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein'
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return '[Ungültiger Deskriptorwert]'
}

function formatRuntimeFindingInstance(instance: ReportTemplateRuntimePatientFindingInput): string {
  if (!instance.classificationChoices.length) {
    return 'Keine Klassifikation gesetzt'
  }
  const finding = catalogFindingsByName.value.get(normalizeKey(instance.finding))
  const classifications = mergeFindingClassifications(finding)
  return instance.classificationChoices
    .map((choice) => {
      const classification = classifications.find(
        (entry) => normalizeKey(entry.name) === normalizeKey(choice.classification)
      )
      const catalogChoice = classification?.choices.find(
        (entry) => normalizeKey(entry.name) === normalizeKey(choice.classificationChoice)
      )
      const descriptors = choice.descriptors
        .map(
          (descriptor) =>
            `${getDescriptorLabel(descriptor.classificationChoiceDescriptor)}: ${formatDescriptorValue(descriptor.descriptorValue)}`
        )
        .join(', ')
      const choiceLabel = catalogChoice
        ? getFindingCatalogLocalizedName(catalogChoice, 'de')
        : formatKnowledgeName(choice.classificationChoice)
      const base = `${getClassificationLabel(instance.finding, choice.classification)} = ${choiceLabel}`
      return descriptors ? `${base} (${descriptors})` : base
    })
    .join(' · ')
}

function clearInactiveTerminologySelection() {
  if (terminology.activeBundle) {
    return
  }
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
  if (!draft) {
    return
  }
  const activeBundle = terminology.activeBundle
  const draftVersion = draftKnowledgeBaseVersion(draft)
  const matchesActiveBundle = draftMatchesTerminologyBundle(draft, draftVersion, activeBundle)
  if (matchesActiveBundle && draft.verificationStatus === 'verified') {
    return
  }
  const alreadyBlocked =
    draft.verificationStatus === 'unverified' &&
    draft.persistencePolicy === 'blocked_until_verified'
  if (alreadyBlocked) {
    return
  }
  flow.setRuntimeDraft({
    ...draft,
    verificationStatus: 'unverified',
    persistencePolicy: 'blocked_until_verified'
  })
}

function draftKnowledgeBaseVersion(draft: ReportingRuntimeDraft): string | null {
  return draft.templateIdentity?.knowledgeBaseVersion || draft.payload.knowledgeBaseVersion || null
}

function draftMatchesTerminologyBundle(
  draft: ReportingRuntimeDraft,
  draftVersion: string | null,
  activeBundle: typeof terminology.activeBundle
): boolean {
  if (!activeBundle) {
    return false
  }
  return draft.moduleName === activeBundle.moduleName && draftVersion === activeBundle.version
}

function clearTerminologyDerivedViewState() {
  availableTemplates.value = []
  templateLoading.value = false
  templateSelectionError.value = null
  templateAvailability.value = []
  templateAvailabilityError.value = null
  templateReference.value = null
  templateReferenceKey.value = null
  templateReferenceError.value = null
  templateReferenceLoading.value = false
  draftBootstrapError.value = null
  selectedReferenceFindingKey.value = null
}

async function reconcileActiveTerminology() {
  const bundleIdentity = activeBundleIdentityKey.value
  if (lastReconciledBundleIdentity === bundleIdentity) {
    return
  }
  if (flow.hasUnpersistedDraftChanges) {
    try {
      await flow.flushDraftAutosave()
    } catch (error: unknown) {
      draftBootstrapError.value = `Der aktuelle Entwurf konnte vor dem Terminologiewechsel nicht gespeichert werden. ${reportingApiErrorMessage(error, 'Bitte erneut versuchen.')}`
      return
    }
  }
  draftBootstrapGeneration += 1
  findingCatalogRequestGeneration += 1
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
  if (!draftBootstrapError.value) {
    lastReconciledBundleIdentity = bundleIdentity
  }
}

function ensureTerminologyBundlesLoaded(): Promise<void> {
  if (terminology.activeBundle || terminology.bundles.length || terminology.error) {
    clearInactiveTerminologySelection()
    return Promise.resolve()
  }
  if (terminologyLoadPromise.value) {
    return terminologyLoadPromise.value
  }

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

function loadTemplateReferenceForSelection() {
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
  if (templateReferenceKey.value === nextKey && templateReference.value) {
    return
  }

  templateReferenceLoading.value = true
  templateReferenceError.value = null
  templateReferenceKey.value = nextKey
  try {
    const payload = findSelectedTemplateReference(templateName, moduleName)
    if (templateReferenceKey.value !== nextKey) {
      return
    }
    if (!payload) {
      throw new Error('Die gewählte Vorlage ist nicht Teil des versionierten Terminologiegraphen.')
    }
    templateReference.value = payload
  } catch (error: unknown) {
    if (templateReferenceKey.value !== nextKey) {
      return
    }
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

function findSelectedTemplateReference(
  templateName: string,
  moduleName: string
): ReportTemplatePayload | null {
  return (
    availableTemplates.value.find((template) => {
      const matchesTemplate = template.name === templateName
      const matchesModule = template.identity.moduleName === moduleName
      const matchesVersion = template.identity.knowledgeBaseVersion === activeKbVersion.value
      return matchesTemplate && matchesModule && matchesVersion
    }) || null
  )
}

function isCurrentFindingCatalogRequest(
  requestGeneration: number,
  requestedBundleKey: string,
  examinationId?: number | null
): boolean {
  const matchesGeneration = requestGeneration === findingCatalogRequestGeneration
  const matchesBundle = requestedBundleKey === activeBundleIdentityKey.value
  const matchesExamination = examinationId == null || examinationId === flow.selectedExaminationId
  return matchesGeneration && matchesBundle && matchesExamination
}

async function loadFindingCatalogForExamination(examinationId: number | null | undefined) {
  const requestGeneration = ++findingCatalogRequestGeneration
  const requestedBundleKey = activeBundleIdentityKey.value
  if (!examinationId) {
    findingCatalog.value = []
    findingCatalogLoading.value = false
    return
  }
  findingCatalogLoading.value = true
  try {
    const rows = await findingsApi.getExaminationFindings(examinationId, getCatalogContext())
    if (!isCurrentFindingCatalogRequest(requestGeneration, requestedBundleKey, examinationId)) {
      return
    }
    findingCatalog.value = Array.isArray(rows) ? rows : []
  } catch {
    if (!isCurrentFindingCatalogRequest(requestGeneration, requestedBundleKey)) {
      return
    }
    findingCatalog.value = []
  } finally {
    if (isCurrentFindingCatalogRequest(requestGeneration, requestedBundleKey)) {
      findingCatalogLoading.value = false
    }
  }
}

function assertPatientExaminationKnowledgeBaseCompatibility(
  detail: Record<string, unknown>,
  context: DraftBootstrapContext
): void {
  if (!context.moduleName || !context.moduleVersion) {
    return
  }
  const pinned = context.pinnedIdentity || readReportingKnowledgeBaseIdentity(detail)
  if (
    pinned &&
    (pinned.moduleName !== context.moduleName || pinned.moduleVersion !== context.moduleVersion)
  ) {
    logger.warn(
      'evaluation-identity-mismatch',
      evaluationLogContext(
        { ...context, pinnedIdentity: pinned },
        readReportingKnowledgeBaseIdentity(detail),
        { reasonCode: 'knowledge-base-identity-mismatch' }
      )
    )
    throw new ReportingKnowledgeBaseMismatchError({
      patientExaminationId: context.patientExaminationId,
      pinnedIdentity: pinned,
      activeBundle: {
        moduleName: context.moduleName,
        version: context.moduleVersion
      }
    })
  }
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function resolvePatientKey(raw: Record<string, unknown>, patientExaminationId: number): string {
  const patient = readRecord(raw.patient)
  const patientHash =
    firstTrimmedString(patient, ['patient_hash', 'patientHash']) ||
    firstTrimmedString(raw, ['patient_hash', 'patientHash'])
  if (patientHash) {
    return patientHash
  }
  const patientId = toPositiveInteger(patient.id ?? raw.patient_id ?? raw.patientId)
  return patientId
    ? `patient_${String(patientId)}`
    : `patient_examination_${String(patientExaminationId)}`
}

function firstTrimmedString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function normalizeExaminer(entry: unknown): string | null {
  if (typeof entry === 'string') {
    return entry.trim() || null
  }
  if (!entry || typeof entry !== 'object') {
    return null
  }

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
  if (examinerKey) {
    return examinerKey
  }

  const firstName = firstTrimmedString(row, ['first_name', 'firstName']) ?? ''
  const lastName = firstTrimmedString(row, ['last_name', 'lastName']) ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  if (fullName) {
    return fullName
  }

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
    if (!Array.isArray(candidate)) {
      return []
    }
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
  if (!terminology.activeBundle) {
    return true
  }
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
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function isRuntimePayload(value: unknown): value is ReportTemplateRuntimePayload {
  if (!isRecord(value)) {
    return false
  }
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
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
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
  for (const row of rows) {
    byCaseId.set(row.caseId, row)
  }
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
    if (activeCase) {
      activateCase(activeCase)
    }
  } catch (error: unknown) {
    if (requestGeneration !== caseOptionsRequestGeneration) {
      return
    }
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
    if (requestGeneration !== caseOptionsRequestGeneration) {
      return
    }
    flow.setCaseContext({ caseId: null })
    caseOptionsError.value = reportingApiErrorMessage(
      error,
      'Die Fallzuordnung konnte nicht geladen werden.'
    )
  }
}

async function onCaseSelect(caseId: string): Promise<void> {
  const patientCase = caseOptions.value.find((row) => row.caseId === caseId)
  if (!patientCase) {
    return
  }
  const currentPatientExaminationId = routePatientExaminationId.value || flow.patientExaminationId
  const examinationIds = new Set(patientCase.patientExaminations.map((row) => row.id))
  if (currentPatientExaminationId && examinationIds.has(currentPatientExaminationId)) {
    activateCase(patientCase)
    return
  }

  const firstExamination = caseExaminationOptions(patientCase).at(0)
  if (!(await flushDraftBeforeContextSwitch(firstExamination?.id ?? null))) {
    return
  }
  activateCase(patientCase)
  if (!firstExamination) {
    flow.setPatientExaminationContext({
      patientExaminationId: null,
      selectedPatientId: patientCase.patient,
      selectedExaminationId: null
    })
    await router.push('/reporting')
    return
  }
  await onPatientExaminationSelect(String(firstExamination.id))
}

function upsertPatientExaminationOption(option: PatientExaminationOption) {
  if (!isPatientExaminationAllowedForMedicalField(option)) {
    return
  }
  const next = patientExaminationOptions.value.slice()
  const index = next.findIndex((entry) => entry.id === option.id)
  if (index >= 0) {
    next[index] = option
  } else {
    next.push(option)
  }
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
    if (requestGeneration !== patientOptionsRequestGeneration) {
      return
    }
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
  if (exists) {
    return
  }
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
      patientExaminationIdentityLoadedId.value = patientExaminationId
    }
    const option = normalizePatientExaminationOption(response.data)
    if (option) {
      upsertPatientExaminationOption(option)
    }
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
  if (patientExaminationId === null) {
    return
  }
  if (!(await flushDraftBeforeContextSwitch(patientExaminationId))) {
    return
  }
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
  patientExaminationIdentityLoadedId.value = null
  selectedReferenceFindingKey.value = null

  await router.push(getNavigationTargetForPatientExamination(patientExaminationId))
}

function parseOptionalPositiveInteger(rawValue: string): number | null {
  const value = Number(rawValue)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

async function onPatientSelection(rawValue: string): Promise<void> {
  const patientId = parseOptionalPositiveInteger(rawValue)
  if (patientId === flow.selectedPatientId) {
    return
  }
  if (!(await flushDraftBeforeContextSwitch(null))) {
    return
  }
  flow.resetForPatientSwitch()
  flow.setCaseSelection({ selectedPatientId: patientId })
  patientExaminationCreationError.value = null
}

function onExaminationSelection(rawValue: string): void {
  flow.setCaseSelection({ selectedExaminationId: parseOptionalPositiveInteger(rawValue) })
  patientExaminationCreationError.value = null
}

async function startNewPatientExamination(): Promise<void> {
  if (!(await flushDraftBeforeContextSwitch(null))) {
    return
  }
  flow.resetForPatientSwitch()
  flow.setCaseSelection({ selectedPatientId: null, selectedExaminationId: null })
  patientExaminationCreationError.value = null
  await router.push('/reporting')
}

async function createPatientExaminationContext(): Promise<void> {
  if (!flow.selectedPatientId || !flow.selectedExaminationId) {
    patientExaminationCreationError.value = 'Bitte wählen Sie zuerst Patient und Untersuchung aus.'
    return
  }

  const selectedPatient = patientStore.getPatientById(flow.selectedPatientId)
  const selectedExamination = examinations.value.find(
    (entry) => entry.id === flow.selectedExaminationId
  )
  if (!selectedPatient || !selectedExamination) {
    patientExaminationCreationError.value =
      'Patient oder Untersuchung konnte nicht eindeutig aufgelöst werden.'
    return
  }

  patientExaminationCreationLoading.value = true
  patientExaminationCreationError.value = null
  try {
    const now = new Date()
    const result = await createCaseWithExamination({
      admissionDate: now.toISOString(),
      patientExamination: {
        patient: selectedPatient.patientHash || `patient_${String(flow.selectedPatientId)}`,
        examination: selectedExamination.name,
        dateStart: now.toISOString().split('T')[0]
      }
    })
    const patientExamination = result.patientExamination as PatientExamination
    patientExaminationStore.addPatientExamination(patientExamination)
    patientExaminationStore.setCurrentPatientExaminationId(patientExamination.id)
    mergeCaseOptions([result.case])
    activateCase(result.case)
    flow.setPatientExaminationContext({
      patientExaminationId: patientExamination.id,
      selectedPatientId: flow.selectedPatientId,
      selectedExaminationId: flow.selectedExaminationId,
      preserveTemplateSelection: true
    })
    await router.push(`/reporting/${String(patientExamination.id)}/findings`)
  } catch (error: unknown) {
    patientExaminationCreationError.value = reportingApiErrorMessage(
      error,
      'Die Patientenuntersuchung konnte nicht angelegt werden.'
    )
  } finally {
    patientExaminationCreationLoading.value = false
  }
}

function draftHasRuntimeContent(): boolean {
  return Boolean(
    flow.currentRuntimeDraft?.payload.patientFindings.length ||
    Object.keys(readRecord(flow.templateSectionDrafts)).length ||
    flow.activeReportId ||
    flow.findingsRevision > 0
  )
}

function restoreTemplateSelect(select: HTMLSelectElement | undefined, name: string | null): void {
  if (select) {
    select.value = name || ''
  }
}

function confirmTemplateSelectionChange(select: HTMLSelectElement | undefined): boolean {
  if (!draftHasRuntimeContent()) {
    return true
  }
  const confirmed = window.confirm(
    'Für diese Untersuchung existieren bereits Befunde oder ein Entwurf. Vorlage wirklich wechseln? Der bisherige Entwurf wird nicht weiterverwendet.'
  )
  if (!confirmed) {
    restoreTemplateSelect(select, flow.selectedTemplateName)
  }
  return confirmed
}

function createDraftBootstrapContext(patientExaminationId: number): DraftBootstrapContext {
  return Object.freeze({
    generation: draftBootstrapGeneration,
    patientExaminationId,
    bundleKey: activeBundleIdentityKey.value,
    moduleName: activeKbModule.value,
    moduleVersion: activeKbVersion.value,
    pinnedIdentity: pinnedIdentity.value ? Object.freeze({ ...pinnedIdentity.value }) : null
  })
}

async function onTemplateSelectionChange(name: string, select?: HTMLSelectElement) {
  const previousName = flow.selectedTemplateName
  const previousIdentity = flow.selectedTemplateIdentity
  if (!name || name === previousName) {
    return
  }
  const selected = availableTemplates.value.find((template) => template.name === name) || null
  if (!selected) {
    templateSelectionError.value =
      'Die ausgewählte Vorlage ist nicht mehr veröffentlicht oder nicht verfügbar.'
    restoreTemplateSelect(select, previousName)
    return
  }
  if (!flow.patientExaminationId || !routePatientExaminationId.value) {
    templateSelectionError.value = 'Bitte wählen Sie zuerst eine Patientenuntersuchung.'
    restoreTemplateSelect(select, previousName)
    return
  }

  if (!confirmTemplateSelectionChange(select)) {
    return
  }

  templateSelectionError.value = null
  const originContext = createDraftBootstrapContext(flow.patientExaminationId)
  try {
    await applyTemplateSelectionChange(selected, originContext)
  } catch (error: unknown) {
    if (error instanceof SupersededReportingContextError) {
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
    restoreTemplateSelect(select, previousName)
  }
}

async function applyTemplateSelectionChange(
  selected: ReportTemplatePayload,
  originContext: DraftBootstrapContext
): Promise<void> {
  if (draftHasRuntimeContent()) {
    await flow.flushDraftAutosave()
  }
  assertBootstrapContextCurrent(originContext)
  const option =
    patientExaminationOptions.value.find(
      (entry) => entry.id === originContext.patientExaminationId
    ) || null
  const attemptedContext = Object.freeze({
    ...originContext,
    generation: ++draftBootstrapGeneration
  })
  flow.setTemplateSelection({
    moduleName: selected.identity.moduleName || originContext.moduleName,
    templateName: selected.name,
    templateIdentity: selected.identity
  })
  try {
    await bootstrapRuntimeDraft(originContext.patientExaminationId, option, attemptedContext, false)
  } catch (error: unknown) {
    if (!isBootstrapContextCurrent(attemptedContext)) {
      throw new SupersededReportingContextError()
    }
    throw error
  }
  flow.clearTemplateSectionDrafts()
  flow.setLastTemplateValidation(null)
}

async function resolveBootstrapDetail(
  context: BootstrapDagContext
): Promise<Record<string, unknown>> {
  const response = await axiosInstance.get(
    r(endpoints.examination.patientExaminationDetail(context.evaluation.patientExaminationId))
  )
  const detail = readRecord(response.data)
  assertPatientExaminationKnowledgeBaseCompatibility(detail, context.evaluation)
  return Object.freeze({ ...detail })
}

async function resolveBootstrapTemplates(
  context: BootstrapDagContext,
  inputs: ReportingDagInputs
): Promise<BootstrapTemplateResult> {
  const detail = inputs.get('detail') as Record<string, unknown>
  const { moduleName, moduleVersion } = context.evaluation
  const examinationName = extractExaminationName(detail)
  const templates = examinationName
    ? (await fetchExaminationReportingContext(moduleName, moduleVersion, examinationName))
        .reportTemplates
    : []
  if (templates.length) {
    return Object.freeze({
      templates: Object.freeze([...templates]),
      availability: Object.freeze([]),
      availabilityError: null
    })
  }

  try {
    const snapshot = await fetchKnowledgeBaseGraphSnapshot(moduleName, moduleVersion)
    const examinationByName = new Map(
      snapshot.concepts.examination.map((examination) => [examination.name, examination])
    )
    const availability = snapshot.reportTemplates.map((template) => {
      const examination = examinationByName.get(template.examination)
      return Object.freeze({
        template,
        examinationName: template.examination,
        examinationNameDe: examination?.nameDe,
        examinationNameEn: examination?.nameEn
      })
    })
    return Object.freeze({
      templates: Object.freeze([]),
      availability: Object.freeze(availability),
      availabilityError: null
    })
  } catch (error: unknown) {
    return Object.freeze({
      templates: Object.freeze([]),
      availability: Object.freeze([]),
      availabilityError: reportingApiErrorMessage(
        error,
        'Die Untersuchungszuordnung der verfügbaren Vorlagen konnte nicht geladen werden.'
      )
    })
  }
}

async function resolveBootstrapFindings(
  context: BootstrapDagContext,
  inputs: ReportingDagInputs
): Promise<BootstrapFindingResult> {
  const detail = inputs.get('detail') as Record<string, unknown>
  const examinationId = context.option?.examinationId ?? extractExaminationId(detail)
  const rows = examinationId
    ? await findingsApi.getExaminationFindings(examinationId, {
        moduleName: context.evaluation.moduleName,
        moduleVersion: context.evaluation.moduleVersion,
        patientExaminationId: context.evaluation.patientExaminationId
      })
    : []
  const normalizedRows = Object.freeze(Array.isArray(rows) ? [...rows] : [])
  return Object.freeze({
    rows: normalizedRows,
    byId: new Map(normalizedRows.map((finding) => [finding.id, finding]))
  })
}

async function resolveBootstrapDraft(
  context: BootstrapDagContext,
  inputs: ReportingDagInputs
): Promise<BootstrapDraftResult> {
  const detail = inputs.get('detail') as Record<string, unknown>
  const templates = inputs.get('templates') as BootstrapTemplateResult
  const findings = inputs.get('findings') as BootstrapFindingResult
  const selectedTemplate =
    (context.selectedTemplateName &&
      templates.templates.find((template) => template.name === context.selectedTemplateName)) ||
    (!context.selectedTemplateName ? templates.templates[0] : null) ||
    null
  if (!selectedTemplate) {
    if (!context.allowMissingTemplate) {
      throw new Error('Bitte wählen Sie eine veröffentlichte Berichtsvorlage aus.')
    }
    return Object.freeze({ detail, templates, findings, selectedTemplate: null, payload: null })
  }

  const payload = await buildReportTemplateRuntimePayload({
    moduleName: context.evaluation.moduleName,
    patientExaminationId: context.evaluation.patientExaminationId,
    patient: resolvePatientKey(detail, context.evaluation.patientExaminationId),
    examiners: extractExaminers(detail),
    examination: selectedTemplate.examination || extractExaminationName(detail),
    knowledgeBaseVersion: context.evaluation.moduleVersion,
    getFindingById: (findingId) => findings.byId.get(findingId)
  })
  return Object.freeze({ detail, templates, findings, selectedTemplate, payload })
}

const bootstrapResolutionGraph = createImmutableReportingDag<BootstrapDagContext>([
  { id: 'detail', dependencies: [], run: resolveBootstrapDetail },
  { id: 'templates', dependencies: ['detail'], run: resolveBootstrapTemplates },
  { id: 'findings', dependencies: ['detail'], run: resolveBootstrapFindings },
  {
    id: 'draft',
    dependencies: ['detail', 'templates', 'findings'],
    run: resolveBootstrapDraft
  }
])

async function refreshPublishedTemplatesAfterLifecycleChange(
  change: ReportTemplateLifecycleChange
): Promise<void> {
  if (!lifecycleChangeMatchesActiveBundle(change)) {
    return
  }

  const examinationName = extractExaminationName(patientExaminationDetail.value || {})
  if (!examinationName || change.examination !== examinationName) {
    return
  }

  const expectedBundleKey = activeBundleIdentityKey.value
  templateLoading.value = true
  try {
    const projection = await fetchExaminationReportingContext(
      change.moduleName,
      change.moduleVersion,
      examinationName
    )
    const templates = projection.reportTemplates
    if (!lifecycleRefreshIsCurrent(change, examinationName, expectedBundleKey)) {
      return
    }
    availableTemplates.value = templates
    applyLifecycleTemplateStatus(change)
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

function lifecycleChangeMatchesActiveBundle(change: ReportTemplateLifecycleChange): boolean {
  return (
    change.moduleName === activeKbModule.value && change.moduleVersion === activeKbVersion.value
  )
}

function lifecycleRefreshIsCurrent(
  change: ReportTemplateLifecycleChange,
  examinationName: string,
  expectedBundleKey: string
): boolean {
  const matchesBundle =
    lifecycleChangeMatchesActiveBundle(change) &&
    expectedBundleKey === activeBundleIdentityKey.value
  const currentExamination = extractExaminationName(patientExaminationDetail.value || {})
  return matchesBundle && examinationName === currentExamination
}

function applyLifecycleTemplateStatus(change: ReportTemplateLifecycleChange): void {
  if (change.lifecycleStatus === 'published') {
    templateSelectionError.value = null
    return
  }
  if (flow.selectedTemplateName === change.templateName) {
    templateSelectionError.value =
      'Die aktuell verwendete Berichtsvorlage wurde entveröffentlicht. Der bestehende Entwurf bleibt erhalten, kann aber erst nach Auswahl einer veröffentlichten Vorlage weitergeführt werden.'
  }
}

async function bootstrapRuntimeDraft(
  patientExaminationId: number,
  option: PatientExaminationOption | null,
  context: DraftBootstrapContext,
  allowMissingTemplate = true
) {
  if (!context.moduleName || !context.moduleVersion) {
    logger.warn(
      'evaluation-registry-unavailable',
      evaluationLogContext(context, null, { reasonCode: 'missing-active-registry' })
    )
    throw new Error(
      'Keine verifizierte aktive Knowledge Base ist im Terminologieregister ausgewählt.'
    )
  }
  templateLoading.value = true
  const graphContext: BootstrapDagContext = Object.freeze({
    evaluation: context,
    option,
    selectedTemplateName: flow.selectedTemplateName,
    allowMissingTemplate
  })
  try {
    const outputs = await executeReportingDag({
      graph: bootstrapResolutionGraph,
      context: graphContext,
      isCurrent: () => isBootstrapContextCurrent(context)
    })
    const result = outputs.get('draft') as BootstrapDraftResult
    commitReportingDagAtomically({
      isCurrent: () => isBootstrapContextCurrent(context),
      result,
      commit: (resolved) => {
        const detailPatientId = extractPatientId(resolved.detail)
        const detailExaminationId = extractExaminationId(resolved.detail)
        patientExaminationDetail.value = resolved.detail
        patientExaminationIdentityLoadedId.value = patientExaminationId
        availableTemplates.value = [...resolved.templates.templates]
        templateAvailability.value = [...resolved.templates.availability]
        templateAvailabilityError.value = resolved.templates.availabilityError
        findingCatalog.value = [...resolved.findings.rows]
        flow.setCaseSelection({
          selectedPatientId: option?.patientId ?? detailPatientId ?? flow.selectedPatientId,
          selectedExaminationId:
            option?.examinationId ?? detailExaminationId ?? flow.selectedExaminationId
        })
        if (!resolved.selectedTemplate || !resolved.payload) {
          logger.info(
            'evaluation-annotation-only',
            evaluationLogContext(context, readReportingKnowledgeBaseIdentity(resolved.detail), {
              reasonCode: 'no-published-template'
            })
          )
          setAnnotationOnlyRuntimeDraft(patientExaminationId, resolved.detail, context)
          return
        }
        const selectedTemplateIdentity = resolved.selectedTemplate.identity
        flow.setTemplateSelection({
          moduleName: context.moduleName,
          templateName: resolved.selectedTemplate.name,
          templateIdentity: selectedTemplateIdentity
        })
        flow.setIndications(normalizeReportingIndicationSelections(resolved.detail))
        flow.setRuntimeDraft({
          draftId: `draft_${String(patientExaminationId)}`,
          patientExaminationId,
          moduleName: context.moduleName,
          templateName: resolved.selectedTemplate.name,
          templateIdentity: selectedTemplateIdentity,
          payload: {
            ...resolved.payload,
            ...(extractDraftDate(resolved.detail)
              ? { date: extractDraftDate(resolved.detail) }
              : {})
          },
          hydratedFrom: 'backend_context',
          verificationStatus: 'verified',
          persistencePolicy: 'persistable',
          updatedAt: new Date().toISOString()
        })
        logger.info(
          'evaluation-committed',
          evaluationLogContext(context, readReportingKnowledgeBaseIdentity(resolved.detail), {
            reasonCode: 'committed'
          })
        )
      }
    })
  } finally {
    if (isBootstrapContextCurrent(context)) {
      templateLoading.value = false
    }
  }
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
    flow.markDraftPersistenceHydrated(updatedAt, response.revision)
    return false
  }

  pendingBackendDraftDocuments.set(patientExaminationId, {
    draft,
    updatedAt,
    revision: response.revision
  })

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
  flow.markDraftPersistenceHydrated(updatedAt, response.revision)
  return true
}

function restoredDraftMatchesContext(
  detail: Record<string, unknown>,
  draft: ReportingRuntimeDraft,
  context: DraftBootstrapContext
): boolean {
  if (draft.moduleName !== context.moduleName) {
    return false
  }
  if (draft.patientExaminationId !== context.patientExaminationId) {
    return false
  }
  if (draft.payload.patient !== resolvePatientKey(detail, context.patientExaminationId)) {
    return false
  }

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

const pendingBackendDraftDocuments = new Map<
  number,
  { draft: ReportDraftBlob; updatedAt: string | null; revision: number }
>()

function restoredDraftMatchesKnowledgeBase(
  draft: ReportingRuntimeDraft,
  selectedIdentity: ReportTemplateIdentity,
  context: DraftBootstrapContext
): boolean {
  const identityModuleMatches = optionalValueMatches(
    draft.templateIdentity?.moduleName,
    context.moduleName
  )
  if (!identityModuleMatches) {
    return false
  }
  const payloadModuleMatches = optionalValueMatches(
    draft.payload.knowledgeBaseModule,
    context.moduleName
  )
  if (!payloadModuleMatches) {
    return false
  }

  const draftVersion = draftKnowledgeBaseVersion(draft)
  const activeKnowledgeBaseVersion = terminology.activeBundle?.version || null
  const draftVersionMatches = Boolean(draftVersion) && draftVersion === activeKnowledgeBaseVersion
  if (!draftVersionMatches) {
    return false
  }
  return optionalValueMatches(selectedIdentity.knowledgeBaseVersion, activeKnowledgeBaseVersion)
}

function optionalValueMatches(value: string | null | undefined, expected: string | null): boolean {
  return !value || value === expected
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
): selected is ReportTemplatePayload {
  if (!selected) {
    return false
  }
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
  const templates = await fetchRestoredDraftTemplates(detail, context)
  assertBootstrapContextCurrent(context)
  availableTemplates.value = templates
  const matchingTemplate = findRestoredDraftTemplate(templates, draft.templateName)
  const selectedIdentity = matchingTemplate?.identity || emptyTemplateIdentity
  if (!restoredDraftMatchesActiveTemplate(detail, draft, matchingTemplate, context)) {
    pendingBackendDraftDocuments.delete(context.patientExaminationId)
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
  applyVerifiedRestoredDraft(draft, context, matchingTemplate, selectedIdentity)
  applyPendingBackendDraftDocument(context.patientExaminationId)
}

function applyVerifiedRestoredDraft(
  draft: ReportingRuntimeDraft,
  context: DraftBootstrapContext,
  matchingTemplate: ReportTemplatePayload,
  selectedIdentity: ReportTemplateIdentity
): void {
  flow.setRuntimeDraft({
    ...draft,
    moduleName: context.moduleName,
    templateName: matchingTemplate.name,
    templateIdentity: selectedIdentity,
    verificationStatus: 'verified',
    persistencePolicy: 'persistable'
  })
  flow.setTemplateSelection({
    moduleName: selectedIdentity.moduleName || context.moduleName,
    templateName: matchingTemplate.name,
    templateIdentity: matchingTemplate.identity
  })
}

async function fetchRestoredDraftTemplates(
  detail: Record<string, unknown>,
  context: DraftBootstrapContext
): Promise<ReportTemplatePayload[]> {
  const examinationName = extractExaminationName(detail)
  if (!examinationName || !context.moduleVersion) {
    return []
  }
  const result = await fetchExaminationReportingContext(
    context.moduleName,
    context.moduleVersion,
    examinationName
  )
  return result.reportTemplates
}

function findRestoredDraftTemplate(
  templates: ReportTemplatePayload[],
  templateName: string | null
): ReportTemplatePayload | null {
  return templateName ? templates.find((template) => template.name === templateName) || null : null
}

function applyPendingBackendDraftDocument(patientExaminationId: number): void {
  const backendDraftDocument = pendingBackendDraftDocuments.get(patientExaminationId)
  if (!backendDraftDocument) {
    return
  }
  flow.applyBackendDraftDocument(backendDraftDocument.draft)
  flow.markDraftPersistenceHydrated(backendDraftDocument.updatedAt, backendDraftDocument.revision)
  pendingBackendDraftDocuments.delete(patientExaminationId)
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
  assertPatientExaminationKnowledgeBaseCompatibility(detail, context)
  patientExaminationDetail.value = detail
  patientExaminationIdentityLoadedId.value = patientExaminationId

  flow.setCaseSelection({
    selectedPatientId: extractPatientId(detail) ?? flow.selectedPatientId,
    selectedExaminationId: extractExaminationId(detail) ?? flow.selectedExaminationId
  })
  flow.setIndications(normalizeReportingIndicationSelections(detail))
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
      knowledgeBaseVersion: context.moduleVersion || null,
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
    await activateExistingRuntimeDraft(existingDraft, patientExaminationId, context)
    return
  }

  const restoredFromDraftApi = await hydrateRuntimeDraftFromDraftApi(patientExaminationId, context)
  if (restoredFromDraftApi) {
    await validateHydratedRuntimeDraft(patientExaminationId, context)
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

async function activateExistingRuntimeDraft(
  existingDraft: ReportingRuntimeDraft,
  patientExaminationId: number,
  context: DraftBootstrapContext
): Promise<void> {
  const annotationOnly = !context.moduleName && !existingDraft.templateName
  flow.setRuntimeDraft({
    ...existingDraft,
    verificationStatus: 'unverified',
    persistencePolicy: annotationOnly ? 'persistable' : 'blocked_until_verified'
  })
  const detail = await loadPatientExaminationDraftContext(patientExaminationId, context)
  if (!context.moduleName) {
    clearInactiveTerminologySelection()
    return
  }
  await validateRestoredDraftTemplate(detail, existingDraft, context)
}

async function validateHydratedRuntimeDraft(
  patientExaminationId: number,
  context: DraftBootstrapContext
): Promise<void> {
  const detail = await loadPatientExaminationDraftContext(patientExaminationId, context)
  const restoredDraft = flow.currentRuntimeDraft
  if (!context.moduleName) {
    clearInactiveTerminologySelection()
    return
  }
  if (restoredDraft) {
    await validateRestoredDraftTemplate(detail, restoredDraft, context)
  }
}

async function hydrateDraftForRoutePatientExamination(patientExaminationId: number) {
  if (patientExaminationId !== routePatientExaminationId.value) {
    return
  }
  const requestedKey = `${String(patientExaminationId)}:${activeBundleIdentityKey.value || 'loading'}`

  if (draftBootstrapInFlight.value?.key === requestedKey) {
    await draftBootstrapInFlight.value.promise
    return
  }

  const option = findPatientExaminationOption(patientExaminationId)
  if (patientExaminationId !== routePatientExaminationId.value) {
    return
  }
  reconcilePatientExaminationContext(patientExaminationId, option)

  const generation = ++draftBootstrapGeneration
  const task = runDraftHydration(patientExaminationId, requestedKey, generation)

  draftBootstrapInFlight.value = { key: requestedKey, promise: task }
  await task
}

function findPatientExaminationOption(
  patientExaminationId: number
): PatientExaminationOption | null {
  return patientExaminationOptions.value.find((entry) => entry.id === patientExaminationId) || null
}

function reconcilePatientExaminationContext(
  patientExaminationId: number,
  option: PatientExaminationOption | null
): void {
  const selectedPatientId = option?.patientId ?? flow.selectedPatientId
  const selectedExaminationId = option?.examinationId ?? flow.selectedExaminationId
  const contextChanged =
    flow.patientExaminationId !== patientExaminationId ||
    selectedPatientId !== flow.selectedPatientId ||
    selectedExaminationId !== flow.selectedExaminationId
  if (!contextChanged) {
    return
  }
  flow.setPatientExaminationContext({
    patientExaminationId,
    selectedPatientId,
    selectedExaminationId,
    preserveTemplateSelection: true
  })
}

function reportDraftHydrationError(
  error: unknown,
  context: DraftBootstrapContext | null,
  generation: number
): void {
  if (
    error instanceof SupersededReportingContextError ||
    error instanceof SupersededReportingDagError
  ) {
    if (context) {
      const reason =
        error instanceof SupersededReportingDagError
          ? 'dag-context-changed'
          : 'reporting-context-changed'
      reportSupersededEvaluation(context, reason)
    }
    return
  }
  if (generation !== draftBootstrapGeneration) {
    if (context) {
      reportSupersededEvaluation(context, 'failure-after-context-change')
    }
    return
  }
  if (context) {
    logger.error(
      'evaluation-failed',
      error,
      evaluationLogContext(context, null, { reasonCode: 'bootstrap-failed' })
    )
  }
  draftBootstrapError.value = reportingApiErrorMessage(
    error,
    'Der lokale Reporting-Entwurf konnte nicht initialisiert werden.'
  )
}

async function runDraftHydration(
  patientExaminationId: number,
  requestedKey: string,
  generation: number
): Promise<void> {
  draftBootstrapError.value = null
  supersededEvaluationNotice.value = null
  let context: DraftBootstrapContext | null = null
  try {
    await ensureTerminologyBundlesLoaded()
    context = { ...createDraftBootstrapContext(patientExaminationId), generation }
    if (generation !== draftBootstrapGeneration) {
      reportSupersededEvaluation(context, 'terminology-load-completed-after-context-change')
      return
    }
    assertBootstrapContextCurrent(context)
    await ensureRuntimeDraft(patientExaminationId, context)
  } catch (error: unknown) {
    reportDraftHydrationError(error, context, generation)
  } finally {
    const currentRequest = draftBootstrapInFlight.value?.key === requestedKey
    if (currentRequest && generation === draftBootstrapGeneration) {
      draftBootstrapInFlight.value = null
    }
  }
}

function isCurrentMediaPreloadRequest(
  requestGeneration: number,
  patientId: number,
  patientExaminationId: number | null
): boolean {
  const currentExaminationId = routePatientExaminationId.value || flow.patientExaminationId
  return (
    requestGeneration === mediaPreloadRequestGeneration &&
    patientId === flow.selectedPatientId &&
    patientExaminationId === currentExaminationId
  )
}

function applyMediaPreload(payload: Awaited<ReturnType<typeof fetchPatientTimelineLatest>>): void {
  flow.setMediaPreload(payload)
  selectedVideoArtifactKind.value =
    preferredArtifactKind(payload.latestVideo?.streamOptions || []) ?? 'processed'
  if (flow.reportFrameSelectionStatus !== 'idle') {
    return
  }
  const preview = payload.latestFrames.at(0)
  if (preview) {
    void selectFrameStream(preview, false)
  } else {
    framePreview.clear()
  }
}

function mediaPreloadErrorMessage(error: unknown): string {
  const status = reportingApiError(error).response?.status as number | undefined
  const statusMessages: Partial<Record<number, string>> = {
    400: 'Ungültige patient_examination_id (400). Bitte Routing-Kontext prüfen.',
    403: 'Zugriff auf Timeline verweigert (403). Berechtigungen prüfen.',
    404: 'Patient wurde nicht gefunden (404). Bitte Fall-Setup prüfen.'
  }
  return (
    (status ? statusMessages[status] : undefined) ||
    `Fehler beim Laden der Medien: ${reportingApiErrorMessage(error, 'unbekannt') || 'unbekannt'}`
  )
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
    if (!isCurrentMediaPreloadRequest(requestGeneration, patientId, patientExaminationId)) {
      return
    }
    applyMediaPreload(payload)
  } catch (error: unknown) {
    if (requestGeneration !== mediaPreloadRequestGeneration) {
      return
    }
    flow.setMediaPreloadError(mediaPreloadErrorMessage(error))
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
  if (isActive(item.to)) {
    return 'Aktuell'
  }
  if (item.requiresPatientExamination && !flow.patientExaminationId) {
    return 'Fall wählen'
  }
  if (item.requiresVerifiedTemplate && !hasVerifiedTemplateContext.value) {
    return 'Verifizierte Vorlage erforderlich'
  }
  if (item.label === 'Befunde' && !terminology.activeBundle) {
    return 'Ohne Terminologie verfügbar'
  }
  if (item.requiresPatientExamination) {
    return 'Bereit'
  }
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
      if (!isCurrent()) {
        return
      }
      await fetchCaseOptions(patientId)
      if (!isCurrent()) {
        return
      }
    } else {
      patientExaminationOptions.value = []
      patientExaminationOptionsError.value = null
      caseOptions.value = []
      caseOptionsError.value = null
      patientExaminationDetail.value = null
      patientExaminationIdentityLoadedId.value = null
      findingCatalog.value = []
    }

    if (patientExaminationId) {
      await ensureCurrentPatientExaminationOption(patientExaminationId)
      if (!isCurrent()) {
        return
      }
      await ensureCaseForPatientExamination(patientExaminationId)
      if (!isCurrent()) {
        return
      }
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
    if (nextKey === previousKey) {
      return
    }
    if (terminology.importing) {
      return
    }
    await reconcileActiveTerminology()
  },
  { immediate: true }
)

watch(
  [
    () => flow.selectedKbModule,
    () => flow.selectedTemplateName,
    activeKbModule,
    activeBundleIdentityKey,
    () => availableTemplates.value
  ],
  () => {
    selectedReferenceFindingKey.value = null
    loadTemplateReferenceForSelection()
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
  void Promise.all([patientStore.fetchPatients(), examinationStore.fetchExaminations()])
})
</script>

<style scoped>
.reporting-shell {
  position: relative;
  isolation: isolate;
}

.reporting-skip-link {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10;
  padding: 0.75rem 1rem;
  color: #fff;
  background: #172234;
  border-radius: 6px;
  clip-path: inset(50%);
  white-space: nowrap;
}

.reporting-skip-link:focus {
  clip-path: none;
}

.reporting-setting-field {
  width: 100%;
  min-width: 0;
}

.reporting-shell .row > [class*='col-'] {
  min-width: 0;
}

.reporting-workspace-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.reporting-workspace-grid.has-technical-inspector {
  grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr) minmax(17rem, 22rem);
}

.reporting-workspace-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
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

.reporting-right-rail {
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

.reporting-template-control {
  padding: 0.75rem;
  border: 1px solid #9bc7ad;
  border-radius: 8px;
  background: #f8fafc;
}

.reporting-template-control .form-text {
  display: block;
  margin-top: 0.35rem;
}

.reporting-secondary-controls {
  border-top: 1px solid #d9e0ea;
  padding-top: 0.65rem;
}

.reporting-secondary-controls .reporting-secondary-toggle {
  width: fit-content;
  color: #526174;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
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

.context-details {
  border-top: 1px solid #d9e0ea;
  padding-top: 0.65rem;
}

.context-details .context-details-toggle {
  width: fit-content;
  color: #526174;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
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
.context-tile .context-tile-label {
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

.context-summary-item .context-summary-value,
.context-tile .context-tile-value {
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

.context-tile .context-tile-description {
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

.finding-status-controls {
  border-bottom: 1px solid #e5ebf2;
}

.finding-status-filter-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  color: #66768c;
  font-size: 0.75rem;
}

.finding-status-list {
  overflow: auto;
  max-height: min(60vh, 42rem);
}

.finding-status-more {
  border-top: 1px solid #e5ebf2;
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
  display: -webkit-box;
  overflow: hidden;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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

.kb-focus-block .kb-focus-label {
  display: block;
  color: #66768c;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.kb-focus-block .kb-focus-value,
.kb-focus-block .kb-focus-description,
.kb-classification-row .kb-classification-description,
.kb-advice-row .kb-advice-description {
  display: block;
  overflow-wrap: anywhere;
}

.kb-reference-group {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 1rem;
}

.kb-reference-group .kb-reference-heading {
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

.kb-advice-kind {
  color: #66768c;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (min-width: 992px) {
  .reporting-setting-field {
    flex: 1 1 16rem;
    width: auto;
  }
}

@media (max-width: 1199.98px) {
  .reporting-command-bar {
    grid-template-columns: 1fr;
  }

  .reporting-workspace-grid {
    grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
  }

  .reporting-workspace-grid.has-technical-inspector {
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

@media (max-width: 991.98px) {
  .reporting-shell {
    padding-inline: 0.5rem;
  }

  .reporting-workspace-grid,
  .reporting-workspace-grid.has-technical-inspector {
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
  .reporting-workspace-toolbar .btn {
    width: 100%;
  }

  .context-case-select .btn {
    width: 100%;
  }
}
</style>
