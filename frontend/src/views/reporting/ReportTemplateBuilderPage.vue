<template>
  <div class="d-flex flex-column gap-3">
    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h5 class="mb-0">Report Template Workspace</h5>
          <small class="text-muted">
            Frontend state stays local. Template export and validation run against `lx-dtypes` over `base_api`.
          </small>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" :disabled="catalogLoading" @click="reloadWorkspace">
            Arbeitsbereich neu laden
          </button>
          <button class="btn btn-success btn-sm" :disabled="saving" @click="showSavePrompt = true">
            Template speichern
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2 mb-3">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 mb-3">{{ successMessage }}</div>
        <div class="alert alert-secondary py-2 small mb-0">
          Entwurfszustand bleibt im Frontend. Evaluierung und Strukturpruefung laufen ausschliesslich gegen persistierte
          Templates aus `base_api`.
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-xl-5">
        <div class="card shadow-sm h-100">
          <div class="card-header">
            <h6 class="mb-0">Template Source Of Truth</h6>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">KB-Modul</label>
                <input v-model="moduleName" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Untersuchung</label>
                <select v-model="examination" class="form-select">
                  <option value="" disabled>Untersuchung waehlen</option>
                  <option v-for="item in examinationOptions" :key="item" :value="item">
                    {{ item }}
                  </option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Persistiertes Template</label>
                <select v-model="templateName" class="form-select" :disabled="templatesLoading || !templateOptions.length">
                  <option value="" disabled>Template waehlen</option>
                  <option v-for="item in templateOptions" :key="item.name" :value="item.name">
                    {{ item.name }}
                  </option>
                </select>
              </div>
              <div class="col-12 d-flex flex-wrap gap-2">
                <button class="btn btn-outline-primary btn-sm" :disabled="templatesLoading || !examination" @click="refreshTemplateOptions">
                  Templates laden
                </button>
                <button class="btn btn-primary btn-sm" :disabled="templateLoading || !templateName" @click="loadSelectedTemplate">
                  Template laden
                </button>
                <button
                  class="btn btn-outline-warning btn-sm"
                  :disabled="definitionLoading || !templateName"
                  @click="runDefinitionValidation"
                >
                  Struktur validieren
                </button>
              </div>
            </div>

            <div class="mt-4">
              <h6 class="text-uppercase text-muted small mb-2">Core Concepts</h6>
              <div class="small text-muted">
                {{ examinationOptions.length }} Untersuchungen,
                {{ findingOptions.length }} Findings,
                {{ classificationOptions.length }} Klassifikationen
              </div>
            </div>

            <div v-if="selectedTemplate" class="mt-4 border-top pt-3">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <div>
                  <strong>{{ selectedTemplate.name }}</strong>
                  <div class="small text-muted">{{ selectedTemplate.examination }}</div>
                </div>
                <span class="badge text-bg-secondary">
                  {{ selectedTemplate.reportSections.length }} Sektion(en)
                </span>
              </div>
              <ul class="list-group list-group-flush small">
                <li v-for="section in selectedTemplate.reportSections" :key="section.name" class="list-group-item px-0">
                  <div class="d-flex justify-content-between gap-2">
                    <span>{{ section.position }}. {{ section.name }}</span>
                    <span class="text-muted">{{ section.findings.length }} Findings</span>
                  </div>
                </li>
              </ul>
              <div class="small text-muted mt-2">
                {{ selectedTemplate.validators.findingsValidators.length }} Finding-Validatoren,
                {{ selectedTemplate.validators.examinationValidators.length }} Examination-Validatoren
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-xl-7">
        <div class="card shadow-sm h-100">
          <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h6 class="mb-0">Runtime Evaluator</h6>
              <small class="text-muted">Typed `PExamination` payload against `/base_api/report-templates/.../validate`</small>
            </div>
            <button
              class="btn btn-success btn-sm"
              :disabled="runtimeLoading || !selectedTemplate"
              @click="runRuntimeValidation"
            >
              Runtime validieren
            </button>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Patient-Key</label>
                <input v-model="runtimePatient" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">KB-Version</label>
                <input v-model="runtimeKnowledgeBaseVersion" class="form-control" placeholder="optional" />
              </div>
              <div class="col-12">
                <label class="form-label">Examiners</label>
                <input
                  v-model="runtimeExaminersInput"
                  class="form-control"
                  placeholder="Kommagetrennte Examiner-Namen"
                />
              </div>
            </div>

            <div class="mt-4 d-flex justify-content-between align-items-center">
              <h6 class="mb-0">Patient Findings</h6>
              <button class="btn btn-outline-secondary btn-sm" @click="addRuntimeFinding">Finding hinzufuegen</button>
            </div>

            <div v-if="!runtimeFindings.length" class="text-muted small mt-2">
              Keine Findings im Runtime-Payload.
            </div>

            <div v-for="(finding, findingIndex) in runtimeFindings" :key="finding.id" class="border rounded p-3 mt-3">
              <div class="row g-3">
                <div class="col-md-8">
                  <label class="form-label form-label-sm">Finding</label>
                  <select v-model="finding.finding" class="form-select form-select-sm">
                    <option value="" disabled>Finding waehlen</option>
                    <option v-for="item in findingOptions" :key="item" :value="item">{{ item }}</option>
                  </select>
                </div>
                <div class="col-md-4 d-flex align-items-end">
                  <button class="btn btn-outline-danger btn-sm w-100" @click="removeRuntimeFinding(findingIndex)">
                    Entfernen
                  </button>
                </div>
              </div>

              <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <h6 class="text-uppercase text-muted small mb-0">Classification Choices</h6>
                  <button class="btn btn-outline-secondary btn-sm" @click="addRuntimeClassificationChoice(findingIndex)">
                    Choice hinzufuegen
                  </button>
                </div>

                <div
                  v-for="(choice, choiceIndex) in finding.classificationChoices"
                  :key="choice.id"
                  class="row g-2 align-items-end border rounded p-2 mb-2 bg-light-subtle"
                >
                  <div class="col-md-4">
                    <label class="form-label form-label-sm">Classification</label>
                    <select v-model="choice.classification" class="form-select form-select-sm">
                      <option value="" disabled>Klassifikation waehlen</option>
                      <option v-for="item in classificationOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label form-label-sm">Choice</label>
                    <input v-model="choice.classificationChoice" class="form-control form-control-sm" placeholder="z. B. size_mm" />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label form-label-sm">Descriptor</label>
                    <input v-model="choice.descriptorName" class="form-control form-control-sm" placeholder="optional" />
                  </div>
                  <div class="col-md-2">
                    <label class="form-label form-label-sm">Wert</label>
                    <input v-model="choice.descriptorValue" class="form-control form-control-sm" placeholder="optional" />
                  </div>
                  <div class="col-md-1 d-flex align-items-end">
                    <button class="btn btn-outline-danger btn-sm w-100" @click="removeRuntimeClassificationChoice(findingIndex, choiceIndex)">
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-4">
              <h6 class="mb-2">Payload Preview</h6>
              <pre class="small bg-light p-3 rounded mb-0">{{ runtimePayloadPreview }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-xl-5">
        <div class="card shadow-sm h-100">
          <div class="card-header">
            <h6 class="mb-0">Strukturvalidierung</h6>
          </div>
          <div class="card-body">
            <div v-if="!definitionValidationResult" class="text-muted small">
              Noch keine Strukturvalidierung ausgefuehrt.
            </div>
            <template v-else>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge" :class="definitionValidationResult.ok ? 'text-bg-success' : 'text-bg-danger'">
                  {{ definitionValidationResult.ok ? 'OK' : 'Fehler' }}
                </span>
                <small class="text-muted">
                  {{ definitionValidationResult.graph.nodes.length }} Knoten /
                  {{ definitionValidationResult.graph.edges.length }} Kanten
                </small>
              </div>
              <div v-if="!definitionValidationResult.issues.length" class="text-muted small">
                Keine Strukturprobleme gemeldet.
              </div>
              <ul v-else class="list-group list-group-flush small">
                <li v-for="(issue, index) in definitionValidationResult.issues" :key="`def-issue-${index}`" class="list-group-item px-0">
                  <div class="d-flex justify-content-between gap-2">
                    <span>{{ issue.message }}</span>
                    <span class="badge" :class="issue.level === 'warning' ? 'text-bg-warning' : 'text-bg-danger'">
                      {{ issue.level }}
                    </span>
                  </div>
                  <div v-if="issue.nodeId" class="text-muted">{{ issue.nodeId }}</div>
                </li>
              </ul>
            </template>
          </div>
        </div>
      </div>

      <div class="col-xl-7">
        <div class="card shadow-sm h-100">
          <div class="card-header">
            <h6 class="mb-0">Runtime Ergebnis</h6>
          </div>
          <div class="card-body">
            <div v-if="!runtimeValidationResult" class="text-muted small">
              Noch keine Runtime-Validierung ausgefuehrt.
            </div>
            <template v-else>
              <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span class="badge" :class="runtimeValidationResult.ok ? 'text-bg-success' : 'text-bg-danger'">
                  {{ runtimeValidationResult.ok ? 'Validiert' : 'Fehlgeschlagen' }}
                </span>
                <span class="text-muted small">
                  {{ runtimeValidationResult.evaluatedFindingsCount }} Finding(s) evaluiert
                </span>
              </div>

              <div v-if="runtimeValidationResult.issues.length" class="mb-3">
                <h6 class="text-uppercase text-muted small mb-2">Issues</h6>
                <ul class="list-group list-group-flush small">
                  <li v-for="(issue, index) in runtimeValidationResult.issues" :key="`rt-issue-${index}`" class="list-group-item px-0">
                    <div class="d-flex justify-content-between gap-2">
                      <span>{{ issue.message }}</span>
                      <span class="badge" :class="issue.level === 'warning' ? 'text-bg-warning' : 'text-bg-danger'">
                        {{ issue.code }}
                      </span>
                    </div>
                    <div v-if="issue.validatorName" class="text-muted">
                      {{ issue.validatorKind }}: {{ issue.validatorName }}
                    </div>
                  </li>
                </ul>
              </div>

              <div class="row g-3">
                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Finding-Validatoren</h6>
                  <div v-if="!runtimeValidationResult.findingsValidators.length" class="text-muted small">
                    Keine Finding-Validatoren ausgewertet.
                  </div>
                  <div
                    v-for="validator in runtimeValidationResult.findingsValidators"
                    :key="validator.name"
                    class="border rounded p-2 mb-2 small"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ validator.name }}</strong>
                      <span class="badge" :class="validator.ok ? 'text-bg-success' : 'text-bg-danger'">
                        {{ validator.ok ? 'OK' : 'Fail' }}
                      </span>
                    </div>
                    <div class="text-muted">
                      {{ validator.finding }} · {{ validator.operator }} · Matches {{ validator.matchedOccurrences }}
                    </div>
                    <div v-if="validator.missingRequiredClassifications.length" class="text-danger">
                      Fehlende Klassifikationen: {{ validator.missingRequiredClassifications.join(', ') }}
                    </div>
                  </div>
                </div>

                <div class="col-md-6">
                  <h6 class="text-uppercase text-muted small mb-2">Examination-Validatoren</h6>
                  <div v-if="!runtimeValidationResult.examinationValidators.length" class="text-muted small">
                    Keine Examination-Validatoren ausgewertet.
                  </div>
                  <div
                    v-for="validator in runtimeValidationResult.examinationValidators"
                    :key="validator.name"
                    class="border rounded p-2 mb-2 small"
                  >
                    <div class="d-flex justify-content-between gap-2">
                      <strong>{{ validator.name }}</strong>
                      <span class="badge" :class="validator.ok ? 'text-bg-success' : 'text-bg-danger'">
                        {{ validator.ok ? 'OK' : 'Fail' }}
                      </span>
                    </div>
                    <div class="text-muted">
                      {{ validator.findingValidatorStatus.length }} Finding-Abhaengigkeiten /
                      {{ validator.examinationValidatorStatus.length }} Examination-Abhaengigkeiten
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h6 class="mb-0">Template Builder</h6>
          <small class="text-muted">Lokaler Entwurf fuer YAML-Generierung nach `lx-dtypes/generated_templates/`</small>
        </div>
        <div class="small text-muted">
          {{ sections.length }} Sektion(en)
        </div>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Template-Name</label>
            <input v-model="templateName" class="form-control" placeholder="z. B. colonoscopy_clinic_standard" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Dateiname</label>
            <input v-model="fileName" class="form-control" placeholder="z. B. clinic_colonoscopy_template_v1" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Beschreibung</label>
            <input v-model="templateDescription" class="form-control" />
          </div>
        </div>

        <div class="border rounded p-3 mt-4 bg-light-subtle">
          <div class="d-flex flex-wrap gap-2 align-items-end">
            <div>
              <label class="form-label form-label-sm mb-1">Neue Sektion</label>
              <select v-model="pendingSectionType" class="form-select form-select-sm">
                <option value="" disabled>Sektionstyp waehlen</option>
                <option v-for="preset in availablePresets" :key="preset.type" :value="preset.type">
                  {{ preset.label }}
                </option>
              </select>
            </div>
            <button class="btn btn-outline-primary btn-sm" :disabled="!pendingSectionType" @click="addSection">
              Section hinzufuegen
            </button>
          </div>
        </div>

        <div v-if="!sections.length" class="alert alert-info mt-3 mb-0">
          Noch keine Sektionen angelegt.
        </div>

        <div v-for="(section, sectionIndex) in sections" :key="section.id" class="border rounded p-3 mt-3">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div>
              <strong>{{ sectionTitle(section) }}</strong>
              <div class="small text-muted">{{ sectionExampleLabel(section) }}</div>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary btn-sm" :disabled="sectionIndex === 0" @click="moveSection(sectionIndex, -1)">
                Hoch
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                :disabled="sectionIndex === sections.length - 1"
                @click="moveSection(sectionIndex, 1)"
              >
                Runter
              </button>
              <button class="btn btn-outline-danger btn-sm" @click="removeSection(section.id)">Entfernen</button>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Sektionsname</label>
              <input v-model="section.name" class="form-control" />
            </div>
            <div class="col-md-6">
              <label class="form-label">Typ</label>
              <input :value="section.sectionType" class="form-control" readonly />
            </div>
            <div class="col-12">
              <label class="form-label">Beschreibung</label>
              <textarea
                v-model="section.description"
                class="form-control"
                rows="2"
                :placeholder="sectionDescriptionPlaceholder(section)"
              />
            </div>
          </div>

          <template v-if="section.sectionType === 'patient_info'">
            <div class="mt-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Patientenfelder</h6>
                <button class="btn btn-outline-secondary btn-sm" @click="addPatientField(section.id)">
                  Feld hinzufuegen
                </button>
              </div>
              <div
                v-for="(field, fieldIndex) in section.fields"
                :key="`${section.id}-field-${fieldIndex}`"
                class="row g-2 align-items-end mb-2"
              >
                <div class="col-md-4">
                  <label class="form-label form-label-sm">Key</label>
                  <input v-model="field.key" class="form-control form-control-sm" />
                </div>
                <div class="col-md-4">
                  <label class="form-label form-label-sm">Label</label>
                  <input v-model="field.label" class="form-control form-control-sm" />
                </div>
                <div class="col-md-3">
                  <label class="form-label form-label-sm">Source</label>
                  <select v-model="field.source" class="form-select form-select-sm">
                    <option value="patient">patient</option>
                    <option value="patient_examination">patient_examination</option>
                    <option value="history">history</option>
                  </select>
                </div>
                <div class="col-md-1 d-flex align-items-center justify-content-center">
                  <input v-model="field.required" class="form-check-input mt-4" type="checkbox" />
                </div>
              </div>
            </div>
          </template>

          <template v-if="section.sectionType === 'findings'">
            <div class="mt-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0">Findings</h6>
                <button class="btn btn-outline-secondary btn-sm" @click="addFinding(section.id)">
                  Finding hinzufuegen
                </button>
              </div>

              <div
                v-for="(finding, findingIndex) in section.findings"
                :key="`${section.id}-finding-${findingIndex}`"
                class="border rounded p-3 mb-3"
              >
                <div class="row g-3">
                  <div class="col-md-4">
                    <label class="form-label form-label-sm">Finding</label>
                    <select v-model="finding.finding" class="form-select form-select-sm">
                      <option value="" disabled>Finding waehlen</option>
                      <option v-for="item in findingOptions" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label form-label-sm">Erforderlich</label>
                    <select v-model="finding.required" class="form-select form-select-sm">
                      <option :value="true">ja</option>
                      <option :value="false">nein</option>
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label form-label-sm">Mehrfach erlaubt</label>
                    <select v-model="finding.multipleAllowed" class="form-select form-select-sm">
                      <option :value="false">nein</option>
                      <option :value="true">ja</option>
                    </select>
                  </div>
                  <div class="col-md-2 d-flex align-items-end">
                    <button class="btn btn-outline-danger btn-sm w-100" @click="removeFinding(section.id, findingIndex)">
                      Entfernen
                    </button>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="mb-0 small text-uppercase text-muted">Klassifikationen</h6>
                    <button class="btn btn-outline-secondary btn-sm" @click="addClassification(section.id, findingIndex)">
                      Klassifikation hinzufuegen
                    </button>
                  </div>

                  <div
                    v-for="(classification, classificationIndex) in finding.classifications"
                    :key="`${section.id}-finding-${findingIndex}-classification-${classificationIndex}`"
                    class="row g-2 align-items-end mb-2"
                  >
                    <div class="col-md-8">
                      <label class="form-label form-label-sm">Classification</label>
                      <select v-model="classification.classification" class="form-select form-select-sm">
                        <option value="" disabled>Klassifikation waehlen</option>
                        <option v-for="item in classificationOptions" :key="item" :value="item">{{ item }}</option>
                      </select>
                    </div>
                    <div class="col-md-3">
                      <label class="form-label form-label-sm">Pflicht</label>
                      <select v-model="classification.required" class="form-select form-select-sm">
                        <option :value="true">ja</option>
                        <option :value="false">nein</option>
                      </select>
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                      <button
                        class="btn btn-outline-danger btn-sm w-100"
                        @click="removeClassification(section.id, findingIndex, classificationIndex)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="form-check mb-2">
                    <input v-model="finding.validator.enabled" class="form-check-input" type="checkbox" />
                    <label class="form-check-label">Validator fuer dieses Finding aktivieren</label>
                  </div>

                  <div v-if="finding.validator.enabled" class="row g-3">
                    <div class="col-md-4">
                      <label class="form-label form-label-sm">Validator-Name</label>
                      <input v-model="finding.validator.name" class="form-control form-control-sm" />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label form-label-sm">Operator</label>
                      <select v-model="finding.validator.operator" class="form-select form-select-sm">
                        <option value="exists">exists</option>
                        <option value="missing">missing</option>
                        <option value="condition">condition</option>
                      </select>
                    </div>
                    <template v-if="finding.validator.operator === 'condition'">
                      <div class="col-md-4">
                        <label class="form-label form-label-sm">Condition-Classification</label>
                        <select v-model="finding.validator.condition.classification" class="form-select form-select-sm">
                          <option value="" disabled>Klassifikation waehlen</option>
                          <option v-for="item in classificationOptions" :key="item" :value="item">{{ item }}</option>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="form-label form-label-sm">Comparator</label>
                        <select v-model="finding.validator.condition.comparator" class="form-select form-select-sm">
                          <option v-for="item in comparatorOptions" :key="item" :value="item">{{ item }}</option>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="form-label form-label-sm">Value</label>
                        <input v-model="finding.validator.condition.value" class="form-control form-control-sm" />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label form-label-sm">Then requires</label>
                        <select
                          class="form-select form-select-sm"
                          @change="appendThenRequire(finding.validator.condition.thenRequires, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="">Klassifikation anhaengen</option>
                          <option v-for="item in classificationOptions" :key="item" :value="item">{{ item }}</option>
                        </select>
                        <div class="d-flex flex-wrap gap-2 mt-2">
                          <span v-for="item in finding.validator.condition.thenRequires" :key="item" class="badge bg-secondary">
                            {{ item }}
                          </span>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div class="mt-4">
            <h6 class="mb-2">Beispielansicht</h6>
            <pre class="small bg-light p-3 rounded mb-0">{{ renderSectionPreview(section) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSavePrompt" class="modal d-block" tabindex="-1" style="background: rgba(0, 0, 0, 0.35);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">YAML-Datei speichern</h5>
            <button type="button" class="btn-close" @click="showSavePrompt = false" />
          </div>
          <div class="modal-body">
            <label class="form-label">Dateiname</label>
            <input v-model="fileName" class="form-control" />
            <div class="form-text">
              Persistiert in `generated_templates/` des ausgewaehlten KB-Moduls.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="showSavePrompt = false">Abbrechen</button>
            <button class="btn btn-success" :disabled="saving || !canSave" @click="saveTemplate">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
              Persistieren
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axiosInstance from '@/api/axiosInstance'
import {
  fetchReportTemplateByName,
  fetchReportTemplatesByExamination,
  validateReportTemplateDefinition,
  validateReportTemplateRuntime
} from '@/api/reportTemplatesApi'
import {
  saveReportTemplateDefinition,
  type ReportTemplateBuilderClassification,
  type ReportTemplateBuilderField,
  type ReportTemplateBuilderFinding,
  type ReportTemplateBuilderSection
} from '@/api/reportTemplateBuilderApi'
import type {
  ReportTemplateDefinitionValidationResult,
  ReportTemplatePayload,
  ReportTemplateRuntimePayload,
  ReportTemplateRuntimeValidationResult
} from '@/types/reportTemplate'

type CoreConceptPayload = {
  examination?: Array<{ name?: string }>
  finding?: Array<{ name?: string }>
  classification?: Array<{ name?: string }>
}

type RuntimeClassificationChoiceDraft = {
  id: string
  classification: string
  classificationChoice: string
  descriptorName: string
  descriptorValue: string
}

type RuntimeFindingDraft = {
  id: string
  finding: string
  classificationChoices: RuntimeClassificationChoiceDraft[]
}

const moduleName = ref('report_template_examples')
const templateName = ref('')
const examination = ref('')
const templateDescription = ref('')
const fileName = ref('')
const pendingSectionType = ref<'' | ReportTemplateBuilderSection['sectionType']>('')
const sections = ref<ReportTemplateBuilderSection[]>([])
const showSavePrompt = ref(false)
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const catalogLoading = ref(false)
const templatesLoading = ref(false)
const templateLoading = ref(false)
const definitionLoading = ref(false)
const runtimeLoading = ref(false)
const coreConcepts = ref<CoreConceptPayload>({})
const templateOptions = ref<ReportTemplatePayload[]>([])
const selectedTemplate = ref<ReportTemplatePayload | null>(null)
const definitionValidationResult = ref<ReportTemplateDefinitionValidationResult | null>(null)
const runtimeValidationResult = ref<ReportTemplateRuntimeValidationResult | null>(null)

const runtimePatient = ref('frontend_test_patient')
const runtimeKnowledgeBaseVersion = ref('')
const runtimeExaminersInput = ref('')
const runtimeFindings = ref<RuntimeFindingDraft[]>([])

const comparatorOptions = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in'] as const

const availablePresets = computed(() => {
  const taken = new Set(sections.value.map((section) => section.sectionType))
  return [
    { type: 'logo', label: 'Logo' },
    { type: 'patient_info', label: 'Patienteninfo' },
    { type: 'clinic_address', label: 'Klinikadresse' },
    { type: 'findings', label: 'Findings-Section' }
  ].filter((preset) => preset.type === 'findings' || !taken.has(preset.type as ReportTemplateBuilderSection['sectionType']))
})

const examinationOptions = computed(() =>
  (coreConcepts.value.examination || [])
    .map((entry) => String(entry?.name || '').trim())
    .filter(Boolean)
)

const findingOptions = computed(() =>
  (coreConcepts.value.finding || [])
    .map((entry) => String(entry?.name || '').trim())
    .filter(Boolean)
)

const classificationOptions = computed(() =>
  (coreConcepts.value.classification || [])
    .map((entry) => String(entry?.name || '').trim())
    .filter(Boolean)
)

const canSave = computed(
  () =>
    !!templateName.value.trim() &&
    !!examination.value.trim() &&
    !!fileName.value.trim() &&
    sections.value.length > 0
)

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function setError(message: string) {
  errorMessage.value = message
}

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function defaultField(): ReportTemplateBuilderField {
  return {
    key: '',
    label: '',
    source: 'patient',
    required: false
  }
}

function defaultClassification(): ReportTemplateBuilderClassification {
  return {
    classification: '',
    required: false
  }
}

function defaultFinding(): ReportTemplateBuilderFinding {
  return {
    finding: '',
    required: false,
    multipleAllowed: false,
    classifications: [],
    validator: {
      enabled: false,
      name: '',
      operator: 'exists',
      condition: {
        classification: '',
        comparator: 'eq',
        value: '',
        thenRequires: []
      }
    }
  }
}

function createSection(sectionType: ReportTemplateBuilderSection['sectionType']): ReportTemplateBuilderSection {
  if (sectionType === 'logo') {
    return {
      id: uid('section'),
      sectionType,
      name: 'clinic_logo',
      description: 'https://example.org/logo.png',
      fields: [],
      findings: []
    }
  }

  if (sectionType === 'patient_info') {
    return {
      id: uid('section'),
      sectionType,
      name: 'patient_information',
      description: 'Patientenstammdaten fuer den Berichtskopf',
      fields: [
        { key: 'first_name', label: 'Vorname', source: 'patient', required: false },
        { key: 'last_name', label: 'Nachname', source: 'patient', required: false },
        { key: 'patient_birth_date', label: 'Geburtsdatum', source: 'patient', required: false },
        { key: 'patient_gender', label: 'Geschlecht', source: 'patient', required: false }
      ],
      findings: []
    }
  }

  if (sectionType === 'clinic_address') {
    return {
      id: uid('section'),
      sectionType,
      name: 'clinic_address',
      description: 'Universitaetsklinikum Musterstadt\nKlinik fuer Endoskopie\nMusterstrasse 1\n97070 Wuerzburg',
      fields: [],
      findings: []
    }
  }

  return {
    id: uid('section'),
    sectionType: 'findings',
    name: `findings_section_${sections.value.filter((item) => item.sectionType === 'findings').length + 1}`,
    description: 'Klinische Befunde und zugehoerige Validierungsregeln',
    fields: [],
    findings: [defaultFinding()]
  }
}

function addSection() {
  if (!pendingSectionType.value) return
  sections.value = [...sections.value, createSection(pendingSectionType.value)]
  pendingSectionType.value = ''
}

function removeSection(sectionId: string) {
  sections.value = sections.value.filter((section) => section.id !== sectionId)
}

function moveSection(index: number, delta: -1 | 1) {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= sections.value.length) return
  const next = sections.value.slice()
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  sections.value = next
}

function addPatientField(sectionId: string) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) return
  section.fields.push(defaultField())
}

function addFinding(sectionId: string) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) return
  section.findings.push(defaultFinding())
}

function removeFinding(sectionId: string, findingIndex: number) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) return
  section.findings.splice(findingIndex, 1)
}

function addClassification(sectionId: string, findingIndex: number) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) return
  section.findings[findingIndex]?.classifications.push(defaultClassification())
}

function removeClassification(sectionId: string, findingIndex: number, classificationIndex: number) {
  const section = sections.value.find((item) => item.id === sectionId)
  if (!section) return
  section.findings[findingIndex]?.classifications.splice(classificationIndex, 1)
}

function appendThenRequire(items: string[], nextValue: string) {
  if (!nextValue || items.includes(nextValue)) return
  items.push(nextValue)
}

function sectionTitle(section: ReportTemplateBuilderSection): string {
  return section.name || section.sectionType
}

function sectionExampleLabel(section: ReportTemplateBuilderSection): string {
  if (section.sectionType === 'findings') {
    return `${section.findings.length} Finding(s) konfiguriert`
  }
  return `Preset: ${section.sectionType}`
}

function sectionDescriptionPlaceholder(section: ReportTemplateBuilderSection): string {
  if (section.sectionType === 'logo') return 'Logo-URL oder Pfad'
  if (section.sectionType === 'clinic_address') return 'Klinikadresse oder Briefkopftext'
  if (section.sectionType === 'patient_info') return 'Optionaler Einfuehrungstext fuer die Patientensektion'
  return 'Beschreibung der Findings-Sektion'
}

function renderSectionPreview(section: ReportTemplateBuilderSection): string {
  if (section.sectionType === 'logo') {
    return `[[ LOGO ]]\nQuelle: ${section.description || 'https://example.org/logo.png'}`
  }
  if (section.sectionType === 'patient_info') {
    return [
      'Patient',
      ...section.fields.map((field) => `- ${field.label || field.key}: {{ ${field.source}.${field.key} }}`)
    ].join('\n')
  }
  if (section.sectionType === 'clinic_address') {
    return section.description || 'Klinikadresse / Briefkopf'
  }
  return [
    `## ${section.name || 'Findings'}`,
    ...section.findings.map((finding) => {
      const classes = finding.classifications
        .map((entry) => `${entry.classification}${entry.required ? ' *' : ''}`)
        .join(', ')
      return `- ${finding.finding || 'finding'}${classes ? ` (${classes})` : ''}`
    })
  ].join('\n')
}

function defaultRuntimeClassificationChoice(): RuntimeClassificationChoiceDraft {
  return {
    id: uid('runtime_choice'),
    classification: '',
    classificationChoice: '',
    descriptorName: '',
    descriptorValue: ''
  }
}

function defaultRuntimeFinding(): RuntimeFindingDraft {
  return {
    id: uid('runtime_finding'),
    finding: '',
    classificationChoices: []
  }
}

function addRuntimeFinding() {
  runtimeFindings.value = [...runtimeFindings.value, defaultRuntimeFinding()]
}

function removeRuntimeFinding(index: number) {
  runtimeFindings.value.splice(index, 1)
}

function addRuntimeClassificationChoice(findingIndex: number) {
  runtimeFindings.value[findingIndex]?.classificationChoices.push(defaultRuntimeClassificationChoice())
}

function removeRuntimeClassificationChoice(findingIndex: number, choiceIndex: number) {
  runtimeFindings.value[findingIndex]?.classificationChoices.splice(choiceIndex, 1)
}

function coerceDescriptorValue(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const numeric = Number(trimmed)
  if (Number.isFinite(numeric) && trimmed !== '') return numeric
  return trimmed
}

const runtimePayload = computed<ReportTemplateRuntimePayload>(() => ({
  patient: runtimePatient.value.trim() || 'frontend_test_patient',
  examiners: runtimeExaminersInput.value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean),
  examination: selectedTemplate.value?.examination || examination.value,
  knowledgeBaseModule: moduleName.value,
  knowledgeBaseVersion: runtimeKnowledgeBaseVersion.value.trim() || null,
  patientFindings: runtimeFindings.value
    .filter((finding) => !!finding.finding.trim())
    .map((finding) => ({
      finding: finding.finding.trim(),
      classificationChoices: finding.classificationChoices
        .filter((choice) => !!choice.classification.trim())
        .map((choice) => ({
          classification: choice.classification.trim(),
          classificationChoice: choice.classificationChoice.trim() || choice.classification.trim(),
          descriptors:
            choice.descriptorName.trim() && choice.descriptorValue.trim()
              ? [
                  {
                    classificationChoiceDescriptor: choice.descriptorName.trim(),
                    descriptorValue: coerceDescriptorValue(choice.descriptorValue)
                  }
                ]
              : []
        }))
    }))
}))

const runtimePayloadPreview = computed(() => JSON.stringify(runtimePayload.value, null, 2))

async function loadCoreConcepts() {
  catalogLoading.value = true
  try {
    const response = await axiosInstance.get(`/base_api/core-concepts/${encodeURIComponent(moduleName.value)}`)
    coreConcepts.value = response.data as CoreConceptPayload
    if (!examination.value && examinationOptions.value.length) {
      examination.value = examinationOptions.value[0]
    }
  } catch (error: any) {
    setError(error?.response?.data?.detail || error?.message || 'Core concepts konnten nicht geladen werden.')
  } finally {
    catalogLoading.value = false
  }
}

async function refreshTemplateOptions() {
  if (!examination.value) {
    templateOptions.value = []
    selectedTemplate.value = null
    return
  }

  templatesLoading.value = true
  try {
    templateOptions.value = await fetchReportTemplatesByExamination(moduleName.value, examination.value)
    if (!templateName.value && templateOptions.value.length) {
      templateName.value = templateOptions.value[0].name
    }
  } catch (error: any) {
    setError(error?.response?.data?.detail || error?.message || 'Templates konnten nicht geladen werden.')
  } finally {
    templatesLoading.value = false
  }
}

async function loadSelectedTemplate() {
  if (!templateName.value) return
  templateLoading.value = true
  try {
    const template = await fetchReportTemplateByName(moduleName.value, templateName.value)
    if (!template) {
      throw new Error('Ungueltiges Report-Template-Format.')
    }
    selectedTemplate.value = template
    examination.value = template.examination || examination.value
    runtimeValidationResult.value = null
    definitionValidationResult.value = null
  } catch (error: any) {
    setError(error?.response?.data?.detail || error?.message || 'Template konnte nicht geladen werden.')
  } finally {
    templateLoading.value = false
  }
}

async function runDefinitionValidation() {
  if (!templateName.value) return
  definitionLoading.value = true
  try {
    definitionValidationResult.value = await validateReportTemplateDefinition(moduleName.value, templateName.value)
    successMessage.value = `Strukturvalidierung fuer "${templateName.value}" abgeschlossen.`
  } catch (error: any) {
    setError(error?.response?.data?.detail || error?.message || 'Strukturvalidierung fehlgeschlagen.')
  } finally {
    definitionLoading.value = false
  }
}

async function runRuntimeValidation() {
  if (!selectedTemplate.value) {
    setError('Zuerst ein persistiertes Template laden.')
    return
  }

  runtimeLoading.value = true
  try {
    runtimeValidationResult.value = await validateReportTemplateRuntime(
      moduleName.value,
      selectedTemplate.value.name,
      runtimePayload.value
    )
    successMessage.value = `Runtime-Validierung fuer "${selectedTemplate.value.name}" abgeschlossen.`
  } catch (error: any) {
    setError(error?.response?.data?.detail || error?.message || 'Runtime-Validierung fehlgeschlagen.')
  } finally {
    runtimeLoading.value = false
  }
}

async function reloadWorkspace() {
  clearMessages()
  await loadCoreConcepts()
  await refreshTemplateOptions()
  if (templateName.value) {
    await loadSelectedTemplate()
  }
}

async function saveTemplate() {
  if (!canSave.value) return
  saving.value = true
  clearMessages()
  try {
    const result = await saveReportTemplateDefinition({
      moduleName: moduleName.value,
      fileName: fileName.value,
      templateName: templateName.value,
      examination: examination.value,
      description: templateDescription.value,
      sections: sections.value
    })
    successMessage.value = `Template "${result.templateName}" wurde in ${result.fileName} gespeichert.`
    showSavePrompt.value = false
    await refreshTemplateOptions()
    await loadSelectedTemplate()
  } catch (error: any) {
    setError(error?.response?.data?.detail || error?.message || 'Template konnte nicht gespeichert werden.')
  } finally {
    saving.value = false
  }
}

watch(moduleName, async () => {
  clearMessages()
  await loadCoreConcepts()
  await refreshTemplateOptions()
})

watch(examination, async (next, prev) => {
  if (!next || next === prev) return
  await refreshTemplateOptions()
})

onMounted(async () => {
  await loadCoreConcepts()
  await refreshTemplateOptions()
  if (templateName.value) {
    await loadSelectedTemplate()
  }
})
</script>
