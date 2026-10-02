<template>
  <div class="d-flex flex-column gap-3">
    <MedicalBlock
      title="Befunderfassung & optionale Dokumentationsregeln"
      subtitle="Befunde erfassen; eine aktive Terminologie ergänzt Vorlagen und Validierung"
      icon="ni ni-single-copy-04"
      icon-bg-class="bg-gradient-primary"
      :is-complete="!!flow.lastTemplateValidation?.ok && lastValidatedSignature === validationInputSignature"
      :is-active="true"
      :show-action="false"
      :loading="templateLoading || findingSelectorsLoading || templateValidationLoading"
    >
      <template #default>
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">KB-Modul</label>
            <input
              class="form-control"
              :value="selectedKbModule"
              readonly
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Untersuchung</label>
            <input
              class="form-control"
              :value="selectedExaminationDisplayName || ''"
              readonly
            />
          </div>
          <div class="col-md-4">
            <label
              class="form-label"
              for="findings-template-select"
              >Template</label
            >
            <select
              id="findings-template-select"
              class="form-select"
              :value="selectedTemplateName || ''"
              :disabled="templateLoading || !templateOptions.length"
              @change="
                selectTemplate(
                  ($event.target as HTMLSelectElement).value,
                  $event.target as HTMLSelectElement
                )
              "
            >
              <option
                value=""
                disabled
              >
                {{
                  templateLoading
                    ? 'Templates laden...'
                    : selectedKbModule
                      ? 'Template wählen'
                      : 'Keine aktive Terminologie'
                }}
              </option>
              <option
                v-for="template in templateOptions"
                :key="template.name"
                :value="template.name"
              >
                {{ getReportTemplateDisplayName(template, flow.selectedReportLanguage) }}
              </option>
            </select>
            <div class="form-text">Berichtsvorlage für die Befunderfassung wechseln.</div>
          </div>
        </div>

        <div class="d-flex flex-wrap gap-2 mb-3">
          <button
            class="btn btn-outline-secondary btn-sm"
            :disabled="templateLoading || !selectedExaminationName"
            @click="refreshTemplatesForExamination"
          >
            Templates für Untersuchung laden
          </button>
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-testid="save-intermediate-draft"
          :disabled="manualDraftSaveBusy || !!draftSaveBlockedReason || !flow.hasUnpersistedDraftChanges"
          :aria-busy="manualDraftSaveBusy || flow.draftPersistenceStatus === 'saving'"
          @click="saveIntermediateDraft"
        >
          {{ manualDraftSaveBusy ? 'Entwurf wird gespeichert…' : 'Zwischenspeichern' }}
        </button>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          :disabled="templateValidationLoading || !canValidateDraft"
            @click="runRuntimeValidation(true)"
          >
            Bericht prüfen
          </button>
        </div>

      <div
        class="small text-muted mb-2"
        role="status"
        aria-live="polite"
        data-testid="intermediate-draft-status"
      >
        {{ draftSaveStatusText }}
      </div>
      <div
        v-if="draftSaveActionError || flow.draftPersistenceError"
        class="alert alert-danger py-2 mb-2"
        role="alert"
        data-testid="intermediate-draft-error"
      >
        {{ draftSaveActionError || flow.draftPersistenceError }}
      </div>

      <div
        v-if="templateErrorMessage"
          class="alert alert-danger py-2 mb-2"
        >
          {{ templateErrorMessage }}
        </div>
        <div
          v-if="templateContextError"
          class="alert alert-danger py-2 mb-2"
          role="alert"
        >
          {{ templateContextError }}
        </div>
        <div
          v-if="templateStatusMessage"
          class="alert alert-success py-2 mb-2"
        >
          {{ templateStatusMessage }}
        </div>

        <div
          v-if="selectedTemplate"
          class="small text-muted mb-2"
        >
          Abschnitte: {{ sectionBlocks.length }} · Validierungen:
          {{ selectedTemplateValidatorCounts.examination }} auf Untersuchungsebene,
          {{ selectedTemplateValidatorCounts.findings }} auf Befundebene
        </div>
        <div
          v-if="currentRuntimeDraft"
          class="small text-muted"
        >
          Entwurf:
          {{
            currentRuntimeDraft.hydratedFrom === 'session_storage' ||
            currentRuntimeDraft.hydratedFrom === 'draft_api'
              ? 'wiederhergestellt'
              : 'initialisiert'
          }}
          · Befunde: {{ currentPayload?.patientFindings.length || 0 }} · Aktualisiert:
          {{ new Date(currentRuntimeDraft.updatedAt).toLocaleTimeString('de-DE') }}
        </div>
      </template>
    </MedicalBlock>

    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Befunderfassung</h5>
          <small class="text-muted"
            >Klinische Befunde erfassen; Template-Prüfungen werden bei Verfügbarkeit ergänzt</small
          >
        </div>
        <div class="small text-muted">
          {{ currentPayload?.patientFindings.length || 0 }} Befundinstanz(en)
        </div>
      </div>
      <div class="card-body">
        <div
          v-if="errorMessage"
          class="alert alert-danger py-2"
        >
          {{ errorMessage }}
        </div>
        <div
          v-if="successMessage"
          class="alert alert-success py-2"
        >
          {{ successMessage }}
        </div>

        <ReportingMediaPreviewCards class="mb-3" />

        <div
          v-if="!flow.patientExaminationId || !resolvedSelectedExaminationId"
          class="alert alert-warning"
        >
          Bitte zuerst das Fall-Setup abschließen (Patient + Untersuchung + PatientExamination).
        </div>
        <div
          v-else-if="!currentRuntimeDraft || !currentPayload"
          class="alert alert-warning"
        >
          Der Befundentwurf wird vorbereitet. Bleibt dieser Hinweis bestehen, laden Sie den
          Reporting-Kontext erneut.
        </div>
        <div
          v-else-if="!selectedTemplate"
          class="alert alert-info"
          role="status"
        >
          Befunderfassung ohne Berichtsvorlage: Vorhandene Katalogdefinitionen bleiben nutzbar.
          Template-Prüfung und Vollständigkeitsbewertung werden nach Aktivierung einer passenden
          Terminologie ergänzt.
        </div>

        <template v-if="currentRuntimeDraft && currentPayload && captureSections.length">
          <div
            v-for="section in captureSections"
            :key="section.name"
            class="card border mb-3"
          >
            <div class="card-header bg-light">
              <div class="d-flex justify-content-between align-items-center gap-3">
                <div>
                  <h6 class="mb-0">{{ section.title }}</h6>
                  <small class="text-muted">{{ section.subtitle }}</small>
                </div>
                <small class="text-muted">
                  {{ section.findings.length }} Befunddefinition(en)
                </small>
              </div>
            </div>

            <div class="card-body d-flex flex-column gap-3">
              <div
                v-for="templateFinding in section.findings"
                :id="findingAnchorId(templateFinding.finding)"
                :key="`${section.name}:${templateFinding.finding}`"
                class="border rounded p-3"
              >
                <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <div class="fw-semibold">{{ getFindingLabel(templateFinding.finding) }}</div>
                    <div class="small text-muted">
                      {{ templateFinding.multipleAllowed ? 'Mehrfach erlaubt' : 'Einmalig' }}
                      · {{ templateFinding.required ? 'erforderlich' : 'optional' }}
                    </div>
                  </div>
                  <button
                    class="btn btn-outline-primary btn-sm"
                    :disabled="!canAddFinding(templateFinding)"
                    @click="onAddFinding(templateFinding.finding)"
                  >
                    {{
                      instancesForFinding(templateFinding.finding).length
                        ? 'Weitere Instanz hinzufügen'
                        : 'Befund hinzufügen'
                    }}
                  </button>
                </div>

                <div
                  v-if="findingLevelMessages(templateFinding.finding).length"
                  class="alert alert-warning py-2 small"
                >
                  <div
                    v-for="message in findingLevelMessages(templateFinding.finding)"
                    :key="message"
                  >
                    {{ message }}
                  </div>
                </div>

                <div
                  v-if="instancesForFinding(templateFinding.finding).length"
                  class="d-flex flex-column gap-3"
                >
                  <div
                    v-for="instance in instancesForFinding(templateFinding.finding)"
                    :key="instance.localId || instance.finding"
                    class="runtime-finding-instance border rounded p-3"
                  >
                    <div class="d-flex justify-content-between align-items-center mb-3">
                      <div class="small text-muted">
                        Instanz {{ instance.localId || instance.finding }}
                      </div>
                      <button
                        class="btn btn-outline-danger btn-sm"
                        @click="onRemoveFinding(instance.localId || '')"
                      >
                        Entfernen
                      </button>
                    </div>

                    <fieldset
                      v-if="interventionsForInstance(instance).length"
                      class="mb-3"
                    >
                      <legend class="fs-6">Interventionen</legend>
                      <label
                        v-for="intervention in interventionsForInstance(instance)"
                        :key="intervention"
                        class="d-flex align-items-center gap-2 mb-2"
                      >
                        <input
                          type="checkbox"
                          class="form-check-input mt-0"
                          :checked="(instance.interventions || []).some((entry) => entry.intervention === intervention)"
                          @change="
                            onInterventionChange(
                              instance,
                              intervention,
                              ($event.target as HTMLInputElement).checked
                            )
                          "
                        />
                        {{ interventionLabel(intervention) }}
                      </label>
                    </fieldset>
                    <div class="row g-3">
                      <div
                        v-for="classification in visibleClassificationsForFinding(
                          templateFinding.finding
                        )"
                        :key="`${instance.localId}:${classification.name}`"
                        class="col-md-6"
                      >
                        <label class="form-label">
                          {{ classification.displayName || classification.name }}
                          <span
                            v-if="
                              isClassificationRequired(templateFinding.finding, classification.name)
                            "
                            class="text-danger"
                            >*</span
                          >
                        </label>
                        <select
                          class="form-select"
                          :class="{
                            'is-invalid': hasFieldError(
                              instance,
                              templateFinding.finding,
                              classification.name
                            )
                          }"
                          :value="classificationChoiceName(instance, classification.name)"
                          @change="
                            onClassificationChoiceChange(
                              instance.localId || '',
                              classification.name,
                              ($event.target as HTMLSelectElement).value
                            )
                          "
                        >
                          <option value="">Auswahl treffen</option>
                          <option
                            v-for="choice in classification.choices"
                            :key="choice.id"
                            :value="choice.name"
                          >
                            {{ choice.displayName || choice.name }}
                          </option>
                        </select>

                        <div
                          v-for="descriptorKey in descriptorKeysForField(
                            templateFinding.finding,
                            classification.name,
                            instance
                          )"
                          :key="`${instance.localId}:${classification.name}:${descriptorKey}`"
                          class="mt-2"
                        >
                          <label class="form-label form-label-sm">
                            {{ descriptorLabel(descriptorKey) }}
                          </label>
                          <input
                            class="form-control form-control-sm"
                            :type="
                              descriptorInputType(
                                templateFinding.finding,
                                classification.name,
                                instance,
                                descriptorKey
                              )
                            "
                            :value="descriptorValue(instance, classification.name, descriptorKey)"
                            @input="
                              onDescriptorInput(
                                instance.localId || '',
                                classification.name,
                                descriptorKey,
                                ($event.target as HTMLInputElement).value
                              )
                            "
                          />
                        </div>

                        <div
                          v-if="
                            fieldMessages(instance, templateFinding.finding, classification.name)
                              .length
                          "
                          class="invalid-feedback d-block"
                        >
                          <div
                            v-for="message in fieldMessages(
                              instance,
                              templateFinding.finding,
                              classification.name
                            )"
                            :key="message"
                          >
                            {{ message }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="small text-muted"
                >
                  Noch keine Instanz dieses Befunds im lokalen Entwurf.
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 p-3 bg-light rounded small">
            <div>
              <strong>Letztes Befund-Ereignis:</strong>
              {{ flow.lastFindingsEvent ? formatFindingsEvent(flow.lastFindingsEvent) : 'keins' }}
            </div>
          </div>

          <div
            v-if="selectedTemplate"
            class="mt-3"
          >
            <ReportTemplateValidationPanel
              :loading="templateValidationLoading"
              :error-message="templateValidationError"
              :result="flow.lastTemplateValidation"
              :finding-anchors="findingAnchors"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  getFindingDisplayName,
  mergeFindingClassifications,
  type Finding,
  type FindingClassification,
  type FindingChoice
} from '@/api/findings.contract'
import { fetchExaminationReportingContext } from '@/api/knowledgeBaseGraphApi'
import { getCoreConceptLocalizedName, type CoreConceptCollection } from '@/types/coreConcepts'
import type {
  ReportTemplateFinding,
  ReportTemplateIdentity,
  ReportTemplatePayload,
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateSectionBlock
} from '@/types/reportTemplate'
import type { ReportingRuntimeDraft } from '@/stores/reportingFlowStore'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import ReportTemplateValidationPanel from '@/components/Reporting/ReportTemplateValidationPanel.vue'
import ReportingMediaPreviewCards from '@/components/Reporting/ReportingMediaPreviewCards.vue'
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useTerminologyStore } from '@/stores/terminologyStore'
import { reportingApiErrorMessage } from './reportingError'
import {
  requireResolvedReportingExamination,
  resolveReportingExamination
} from './reportingExaminationResolution'
import { useReportingKnowledgeBase } from './useReportingKnowledgeBase'
import { useReportTemplateSelection } from './reportTemplateSelectionContext'
import { groupValidationMessages } from './reportingValidationPresentation'

import {
  getReportTemplateDisplayName,
  validateReportTemplateRuntime
} from '@/api/reportTemplatesApi'

const { getCatalogContext } = useReportingKnowledgeBase()
const { selectTemplate } = useReportTemplateSelection()
const flow = useReportingFlowStore()
const terminology = useTerminologyStore()
const examinationStore = useExaminationStore()
const {
  catalogFindings,
  loading: findingSelectorsLoading,
  ensureCatalogLoaded
} = useFindingSelectors()

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const templateValidationLoading = ref(false)
const templateValidationError = ref<string | null>(null)
const templateStatusMessage = ref<string | null>(null)
const templateContextError = ref<string | null>(null)
const interventionConcepts = ref<CoreConceptCollection | null>(null)
let reportingContextGeneration = 0
const touchedFields = ref<Record<string, boolean>>({})
const showValidationFeedback = ref(false)
const dirtySinceMount = ref(false)
let validationTimer: ReturnType<typeof setTimeout> | null = null
let validationGeneration = 0
let validationDisposed = false
const lastValidatedSignature = ref<string | null>(null)
const manualDraftSaveBusy = ref(false)
const draftSaveActionError = ref<string | null>(null)

const {
  moduleName: selectedKbModule,
  selectedTemplateName,
  templateOptions,
  selectedTemplate,
  sectionBlocks,
  loading: templateLoading,
  errorMessage: templateErrorMessage,
  applyTemplateOptions,
  selectTemplateByName,
  setModuleName
} = useReportTemplates({
  initialModuleName: terminology.activeBundle ? terminology.activeModuleName : '',
  initialModuleVersion: terminology.activeBundle?.version || '',
  initialTemplateName: flow.selectedTemplateName,
  language: computed(() => flow.selectedReportLanguage)
})

const currentRuntimeDraft = computed(() => flow.currentRuntimeDraft)
const currentPayload = computed(() => currentRuntimeDraft.value?.payload || null)
function templateIdentityConflicts(
  draftIdentity: ReportTemplateIdentity | null | undefined,
  templateIdentity: ReportTemplateIdentity
): boolean {
  const hashConflicts =
    !!draftIdentity?.templateHash &&
    !!templateIdentity.templateHash &&
    draftIdentity.templateHash !== templateIdentity.templateHash
  const versionConflicts =
    !!draftIdentity?.templateVersion &&
    !!templateIdentity.templateVersion &&
    draftIdentity.templateVersion !== templateIdentity.templateVersion
  return hashConflicts || versionConflicts
}

function draftMatchesTemplate(
  draft: ReportingRuntimeDraft | null,
  template: ReportTemplatePayload | null,
  moduleName: string
): boolean {
  if (!draft || !template || draft.templateName !== template.name) {
    return false
  }
  if (draft.verificationStatus === 'unverified' || draft.moduleName !== moduleName) {
    return false
  }
  return !templateIdentityConflicts(draft.templateIdentity, template.identity)
}

const draftMatchesSelectedTemplate = computed(() => {
  return draftMatchesTemplate(
    currentRuntimeDraft.value,
    selectedTemplate.value,
    selectedKbModule.value
  )
})
const canValidateDraft = computed(
  () => !!selectedTemplateName.value && !!currentPayload.value && draftMatchesSelectedTemplate.value
)
const selectedExaminationResolution = computed(() =>
  resolveReportingExamination({
    catalog: examinationStore.examinationsDropdown,
    selectedExaminationId: flow.selectedExaminationId,
    examinationName: currentPayload.value?.examination
  })
)
const selectedExamination = computed(() =>
  selectedExaminationResolution.value.status === 'resolved'
    ? selectedExaminationResolution.value.examination
    : null
)
const resolvedSelectedExaminationId = computed(() => selectedExamination.value?.id ?? null)
const selectedExaminationName = computed(() => selectedExamination.value?.name || null)
const selectedExaminationDisplayName = computed(
  () => selectedExamination.value?.displayName || selectedExaminationName.value || null
)
const selectedTemplateValidatorCounts = computed(() => {
  const validators = selectedTemplate.value?.validators
  return {
    examination: Array.isArray(validators?.examinationValidators)
      ? validators.examinationValidators.length
      : 0,
    findings: Array.isArray(validators?.findingsValidators)
      ? validators.findingsValidators.length
      : 0
  }
})

const captureSections = computed<ReportTemplateSectionBlock[]>(() => {
  const catalogDefinitions: ReportTemplateFinding[] = catalogFindings.value.map((finding) => ({
    finding: finding.name,
    required: false,
    multipleAllowed: true,
    classifications: mergeFindingClassifications(finding).map((classification) => ({
      classification: classification.name,
      required: classification.required
    }))
  }))
  const baseSections: ReportTemplateSectionBlock[] = selectedTemplate.value
    ? sectionBlocks.value
    : catalogDefinitions.length
      ? [
          {
            name: 'annotation_catalog',
            position: 0,
            title: 'Befundkatalog',
            subtitle: 'Ohne Berichtsvorlage · klinische Erfassung bleibt verfügbar',
            findings: catalogDefinitions,
            requiredFindingsCount: 0,
            optionalFindingsCount: catalogDefinitions.length,
            requiredClassificationsCount: catalogDefinitions.reduce(
              (count, finding) =>
                count +
                finding.classifications.filter((classification) => classification.required).length,
              0
            )
          }
        ]
      : []
  const definedNames = new Set(
    baseSections.flatMap((section) =>
      section.findings.map((finding) => normalizeKey(finding.finding))
    )
  )
  const unresolvedNames = [
    ...new Set(
      (currentPayload.value?.patientFindings || [])
        .map((finding) => finding.finding)
        .filter((name) => !definedNames.has(normalizeKey(name)))
    )
  ]
  if (!unresolvedNames.length) {
    return baseSections
  }
  return [
    ...baseSections,
    {
      name: 'unresolved_existing_findings',
      position: baseSections.length,
      title: 'Bestehende Befunde außerhalb des aktuellen Katalogs',
      subtitle:
        'Daten bleiben sichtbar und können entfernt werden; Klassifikationen sind ungeprüft.',
      findings: unresolvedNames.map((finding) => ({
        finding,
        required: false,
        multipleAllowed: true,
        classifications: []
      })),
      requiredFindingsCount: 0,
      optionalFindingsCount: unresolvedNames.length,
      requiredClassificationsCount: 0
    }
  ]
})

const catalogFindingsByNormalizedName = computed(() => {
  const entries = catalogFindings.value.map(
    (finding) => [normalizeKey(finding.name), finding] as const
  )
  return new Map<string, Finding>(entries)
})

const backendMissingClassificationsByFinding = computed<Record<string, string[]>>(() => {
  const byFinding = new Map<string, Set<string>>()
  for (const validator of flow.lastTemplateValidation?.findingsValidators || []) {
    const key = normalizeKey(validator.finding)
    const names = byFinding.get(key) || new Set<string>()
    for (const name of validator.missingRequiredClassifications) names.add(name)
    byFinding.set(key, names)
  }
  return Object.fromEntries(
    Array.from(byFinding, ([name, classifications]) => [name, [...classifications]])
  )
})


const backendMessagesByFinding = computed<Record<string, string[]>>(() =>
  Object.fromEntries(groupValidationMessages(flow.lastTemplateValidation))
)

const findingAnchors = computed<Record<string, string>>(() => {
  const entries = captureSections.value
    .flatMap((section) => section.findings)
    .map((finding) => [normalizeKey(finding.finding), findingAnchorId(finding.finding)] as const)
  return Object.fromEntries(entries)
})

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function stringListForKey(record: Record<string, string[]>, key: string): string[] {
  const value: unknown = Reflect.get(record, key)
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function findingAnchorId(findingName: string): string {
  return `finding-${normalizeKey(findingName)}`
}

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function formatFindingsEvent(event: NonNullable<typeof flow.lastFindingsEvent>) {
  const time = new Date(event.at).toLocaleTimeString('de-DE')
  if (event.type === 'finding_added') {
    return `${time}: Befund ${String(event.findingId)} hinzugefügt`
  }
  return `${time}: Klassifikation ${String(event.classificationId)} für Befund ${String(event.findingId)} aktualisiert`
}

function fieldKey(findingLocalId: string, classificationName: string): string {
  return `${findingLocalId}:${normalizeKey(classificationName)}`
}

function markFieldTouched(findingLocalId: string, classificationName: string) {
  touchedFields.value = {
    ...touchedFields.value,
    [fieldKey(findingLocalId, classificationName)]: true
  }
}

function resetTouchedState() {
  touchedFields.value = {}
  showValidationFeedback.value = false
  dirtySinceMount.value = false
}

function getFindingDefinitionByName(findingName: string): Finding | null {
  return catalogFindingsByNormalizedName.value.get(normalizeKey(findingName)) || null
}

function getFindingLabel(findingName: string): string {
  return getFindingDisplayName(
    getFindingDefinitionByName(findingName) ?? { id: 0, name: findingName }
  )
}

function allDefinitionClassificationsForFinding(findingName: string): FindingClassification[] {
  const finding = getFindingDefinitionByName(findingName)
  return mergeFindingClassifications(finding)
}

function templateFindingForName(findingName: string): ReportTemplateFinding | null {
  return (
    captureSections.value
      .flatMap((section) => section.findings)
      .find((finding) => normalizeKey(finding.finding) === normalizeKey(findingName)) || null
  )
}

function inputChoicesForRequirement(
  requirement: ReportTemplateFinding['classifications'][number],
  existing: FindingClassification | undefined
): FindingChoice[] {
  return (requirement.input?.choices || []).map((choice) => ({
    id:
      existing?.choices.find(
        (candidate) => normalizeKey(candidate.name) === normalizeKey(choice.name)
      )?.id || 0,
    name: choice.name,
    displayName: choice.name,
    subcategories: {},
    numericalDescriptors: Object.fromEntries(
      choice.descriptors
        .filter((descriptor) => descriptor.type === 'numeric')
        .map((descriptor) => [descriptor.name, descriptor])
    )
  }))
}

function mergedClassificationChoices(
  existing: FindingClassification,
  inputChoices: FindingChoice[]
): FindingChoice[] {
  const choicesByKey = new Map(
    existing.choices.map((choice) => [normalizeKey(choice.name), choice])
  )
  for (const inputChoice of inputChoices) {
    const choiceKey = normalizeKey(inputChoice.name)
    const catalogChoice = choicesByKey.get(choiceKey)
    choicesByKey.set(choiceKey, {
      ...inputChoice,
      ...catalogChoice,
      numericalDescriptors: {
        ...inputChoice.numericalDescriptors,
        ...(catalogChoice?.numericalDescriptors || {})
      }
    })
  }
  return Array.from(choicesByKey.values())
}

function applyTemplateClassificationRequirement(
  byKey: Map<string, FindingClassification>,
  requirement: ReportTemplateFinding['classifications'][number]
) {
  const key = normalizeKey(requirement.classification)
  const existing = byKey.get(key)
  const inputChoices = inputChoicesForRequirement(requirement, existing)
  if (existing) {
    byKey.set(key, {
      ...existing,
      required: existing.required || requirement.required,
      choices: mergedClassificationChoices(existing, inputChoices)
    })
    return
  }
  byKey.set(key, {
    id: 0,
    name: requirement.classification,
    displayName: requirement.classification,
    required: requirement.required,
    classificationTypes: [],
    choices: inputChoices
  })
}

function addMissingRequiredClassification(
  byKey: Map<string, FindingClassification>,
  missing: string
) {
  const key = normalizeKey(missing)
  if (byKey.has(key)) {
    return
  }
  byKey.set(key, {
    id: 0,
    name: missing,
    displayName: missing,
    required: true,
    classificationTypes: [],
    choices: []
  })
}

function visibleClassificationsForFinding(findingName: string): FindingClassification[] {
  const definitions = allDefinitionClassificationsForFinding(findingName)
  const extraRequired = stringListForKey(
    backendMissingClassificationsByFinding.value,
    normalizeKey(findingName)
  )
  const byKey = new Map<string, FindingClassification>()

  for (const classification of definitions) {
    byKey.set(normalizeKey(classification.name), classification)
  }

  for (const requirement of templateFindingForName(findingName)?.classifications || []) {
    applyTemplateClassificationRequirement(byKey, requirement)
  }

  for (const missing of extraRequired) {
    addMissingRequiredClassification(byKey, missing)
  }

  return Array.from(byKey.values())
}

function instancesForFinding(findingName: string): ReportTemplateRuntimePatientFindingInput[] {
  const key = normalizeKey(findingName)
  return (currentPayload.value?.patientFindings || []).filter(
    (finding) => normalizeKey(finding.finding) === key
  )
}

function canAddFinding(templateFinding: ReportTemplateFinding): boolean {
  if (!currentPayload.value) {
    return false
  }
  if (templateFinding.multipleAllowed) {
    return true
  }
  return instancesForFinding(templateFinding.finding).length === 0
}

function isClassificationRequired(findingName: string, classificationName: string): boolean {
  const fromTemplate =
    sectionBlocks.value
      .flatMap((section) => section.findings)
      .find((finding) => normalizeKey(finding.finding) === normalizeKey(findingName))
      ?.classifications.find(
        (classification) =>
          normalizeKey(classification.classification) === normalizeKey(classificationName)
      )?.required || false

  const fromValidation = stringListForKey(
    backendMissingClassificationsByFinding.value,
    normalizeKey(findingName)
  ).some((classification) => normalizeKey(classification) === normalizeKey(classificationName))

  return fromTemplate || fromValidation
}

function classificationChoiceState(
  instance: ReportTemplateRuntimePatientFindingInput,
  classificationName: string
): ReportTemplateRuntimeClassificationChoiceInput | null {
  return (
    instance.classificationChoices.find(
      (choice) => normalizeKey(choice.classification) === normalizeKey(classificationName)
    ) || null
  )
}

function classificationChoiceName(
  instance: ReportTemplateRuntimePatientFindingInput,
  classificationName: string
): string {
  return classificationChoiceState(instance, classificationName)?.classificationChoice || ''
}

function selectedChoiceDefinition(
  findingName: string,
  classificationName: string,
  instance: ReportTemplateRuntimePatientFindingInput
): FindingChoice | null {
  const classification = visibleClassificationsForFinding(findingName).find(
    (entry) => normalizeKey(entry.name) === normalizeKey(classificationName)
  )
  const choiceName = classificationChoiceName(instance, classificationName)
  if (!classification || !choiceName) {
    return null
  }
  return (
    classification.choices.find(
      (choice) => normalizeKey(choice.name) === normalizeKey(choiceName)
    ) || null
  )
}

function descriptorKeysForField(
  findingName: string,
  classificationName: string,
  instance: ReportTemplateRuntimePatientFindingInput
): string[] {
  const compiledDescriptors = compiledDescriptorsForSelectedChoice(
    findingName,
    classificationName,
    instance
  )
  if (compiledDescriptors.length) {
    return compiledDescriptors.map((descriptor) => descriptor.name)
  }

  const selectedChoice = selectedChoiceDefinition(findingName, classificationName, instance)
  const descriptorKeys = Object.keys(selectedChoice?.numericalDescriptors || {})
  if (descriptorKeys.length) {
    return descriptorKeys
  }

  const existingChoice = classificationChoiceState(instance, classificationName)
  if (existingChoice?.descriptors.length) {
    return existingChoice.descriptors.map((descriptor) => descriptor.classificationChoiceDescriptor)
  }

  return inferredDescriptorKeys(classificationName)
}

function inferredDescriptorKeys(classificationName: string): string[] {
  const normalizedClassification = normalizeKey(classificationName)
  const hasNumericDimension = ['mm', 'size', 'length', 'distance'].some((term) =>
    normalizedClassification.includes(term)
  )
  return hasNumericDimension ? [`${normalizedClassification}_descriptor`] : []
}

function compiledDescriptorsForSelectedChoice(
  findingName: string,
  classificationName: string,
  instance: ReportTemplateRuntimePatientFindingInput
) {
  const choiceName = classificationChoiceName(instance, classificationName)
  if (!choiceName) {
    return []
  }

  const classification = templateFindingForName(findingName)?.classifications.find(
    (entry) => normalizeKey(entry.classification) === normalizeKey(classificationName)
  )
  return (
    classification?.input?.choices.find(
      (choice) => normalizeKey(choice.name) === normalizeKey(choiceName)
    )?.descriptors || []
  )
}

function descriptorValue(
  instance: ReportTemplateRuntimePatientFindingInput,
  classificationName: string,
  descriptorKey: string
): string {
  const descriptor =
    classificationChoiceState(instance, classificationName)?.descriptors.find(
      (entry) => entry.classificationChoiceDescriptor === descriptorKey
    ) || null
  const value = descriptor?.descriptorValue
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''
}

function descriptorLabel(descriptorKey: string): string {
  return descriptorKey.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function descriptorInputType(
  findingName: string,
  classificationName: string,
  instance: ReportTemplateRuntimePatientFindingInput,
  descriptorKey: string
): 'number' | 'text' {
  const compiledDescriptor = compiledDescriptorsForSelectedChoice(
    findingName,
    classificationName,
    instance
  ).find((descriptor) => normalizeKey(descriptor.name) === normalizeKey(descriptorKey))
  if (compiledDescriptor) {
    return compiledDescriptor.type === 'numeric' ? 'number' : 'text'
  }

  return /(mm|cm|length|size|distance|count|number|numeric|minute|dose|mill?igram|microgram)/i.test(
    descriptorKey
  )
    ? 'number'
    : 'text'
}

function buildDescriptors(
  instance: ReportTemplateRuntimePatientFindingInput,
  classificationName: string,
  nextChoiceName: string,
  patch?: { descriptorKey?: string; descriptorValue?: string }
): ReportTemplateRuntimeDescriptorInput[] {
  const existingDescriptors =
    classificationChoiceState(instance, classificationName)?.descriptors || []
  const descriptorKeys = descriptorKeysForField(instance.finding, classificationName, instance)
  const byKey = new Map<string, ReportTemplateRuntimeDescriptorInput>(
    existingDescriptors.map((descriptor) => [descriptor.classificationChoiceDescriptor, descriptor])
  )

  if (patch?.descriptorKey) {
    if (patch.descriptorValue == null || patch.descriptorValue === '') {
      byKey.delete(patch.descriptorKey)
    } else {
      const existing = byKey.get(patch.descriptorKey)
      byKey.set(patch.descriptorKey, {
        localId: existing?.localId,
        classificationChoiceDescriptor: patch.descriptorKey,
        descriptorValue:
          descriptorInputType(
            instance.finding,
            classificationName,
            instance,
            patch.descriptorKey
          ) === 'number'
            ? Number(patch.descriptorValue)
            : patch.descriptorValue
      })
    }
  }

  return (descriptorKeys.length ? descriptorKeys : Array.from(byKey.keys()))
    .map((descriptorKey) => byKey.get(descriptorKey) || null)
    .filter((descriptor): descriptor is ReportTemplateRuntimeDescriptorInput => descriptor !== null)
}

function hasFieldError(
  instance: ReportTemplateRuntimePatientFindingInput,
  findingName: string,
  classificationName: string
): boolean {
  const choiceValue = classificationChoiceName(instance, classificationName)
  const isMissingRequired =
    isClassificationRequired(findingName, classificationName) &&
    !choiceValue.trim() &&
    (showValidationFeedback.value ||
      touchedFields.value[fieldKey(instance.localId || '', classificationName)])

  const hasBackendMissing =
    stringListForKey(backendMissingClassificationsByFinding.value, normalizeKey(findingName)).some(
      (classification) => normalizeKey(classification) === normalizeKey(classificationName)
    ) &&
    (showValidationFeedback.value ||
      touchedFields.value[fieldKey(instance.localId || '', classificationName)])

  return isMissingRequired || hasBackendMissing
}

function fieldMessages(
  instance: ReportTemplateRuntimePatientFindingInput,
  findingName: string,
  classificationName: string
): string[] {
  if (!hasFieldError(instance, findingName, classificationName)) {
    return []
  }

  const messages: string[] = []
  if (
    isClassificationRequired(findingName, classificationName) &&
    !classificationChoiceName(instance, classificationName)
  ) {
    messages.push('Dieses Feld ist fuer den aktuellen Entwurfszustand erforderlich.')
  }

  if (
    stringListForKey(backendMissingClassificationsByFinding.value, normalizeKey(findingName)).some(
      (classification) => normalizeKey(classification) === normalizeKey(classificationName)
    )
  ) {
    messages.push('Die Validierung verlangt diese Klassifikation fuer den aktuellen Befund.')
  }

  return Array.from(new Set(messages))
}

function findingLevelMessages(findingName: string): string[] {
  const messages = stringListForKey(backendMessagesByFinding.value, normalizeKey(findingName))
  return Array.from(new Set(messages.filter(Boolean)))
}

function isReportingContextCurrent(
  generation: number,
  patientExaminationId: number | null,
  bundleKey: string,
  examinationName: string | null
): boolean {
  return (
    generation === reportingContextGeneration &&
    patientExaminationId === flow.patientExaminationId &&
    bundleKey === terminology.activeBundleKey &&
    examinationName === selectedExaminationName.value
  )
}

async function refreshTemplatesForExamination() {
  const generation = ++reportingContextGeneration
  const patientExaminationId = flow.patientExaminationId
  const bundleKey = terminology.activeBundleKey
  interventionConcepts.value = null
  templateStatusMessage.value = null
  templateContextError.value = null
  if (!selectedKbModule.value) {
    templateStatusMessage.value =
      'Vorlagen werden angeboten, sobald eine Terminologie aktiviert wurde.'
    return
  }
  const reportingContext = getCatalogContext()
  const examName = selectedExaminationName.value
  if (!examName) {
    return
  }
  const bundle = terminology.activeBundle
  if (!bundle) {
    return
  }
  try {
    if (!reportingContext) {
      return
    }
    const projection = await fetchExaminationReportingContext(
      reportingContext.moduleName,
      reportingContext.moduleVersion,
      examName
    )
    if (!isReportingContextCurrent(generation, patientExaminationId, bundleKey, examName)) return
    interventionConcepts.value = projection.concepts
    applyTemplateOptions(projection.reportTemplates)
    templateStatusMessage.value = projection.reportTemplates.length
      ? `${String(projection.reportTemplates.length)} Template(s) fuer "${examName}" geladen.`
      : `Keine Templates fuer "${examName}" gefunden.`
  } catch (error: unknown) {
    if (!isReportingContextCurrent(generation, patientExaminationId, bundleKey, examName)) return
    applyTemplateOptions([])
    templateContextError.value = reportingApiErrorMessage(
      error,
      'Der versionierte Reporting-Kontext konnte nicht geladen werden.'
    )
  }
}

function onAddFinding(findingName: string) {
  clearMessages()
  const localId = flow.addFinding({ findingName })
  if (!localId) {
    errorMessage.value = 'Der Befund konnte dem lokalen Entwurf nicht hinzugefuegt werden.'
    return
  }
  dirtySinceMount.value = true
  flow.noteFindingAdded(getFindingDefinitionByName(findingName)?.id || 0)
  successMessage.value = `Befund "${getFindingLabel(findingName)}" wurde dem lokalen Entwurf hinzugefuegt.`
}

function onRemoveFinding(findingLocalId: string) {
  clearMessages()
  if (!findingLocalId) {
    return
  }
  flow.removeFinding(findingLocalId)
  dirtySinceMount.value = true
  successMessage.value = 'Befundinstanz aus dem lokalen Entwurf entfernt.'
}

function interventionsForInstance(instance: ReportTemplateRuntimePatientFindingInput): string[] {
  return [
    ...new Set([
      ...(getFindingDefinitionByName(instance.finding)?.findingInterventions || []),
      ...(interventionConcepts.value?.finding.find((finding) => finding.name === instance.finding)
        ?.interventions || []),
      ...(instance.interventions || []).map((entry) => entry.intervention)
    ])
  ]
}

function interventionLabel(name: string): string {
  const concept = interventionConcepts.value?.intervention.find((entry) => entry.name === name)
  return concept ? getCoreConceptLocalizedName(concept, flow.selectedReportLanguage, name) : name
}

function onInterventionChange(
  instance: ReportTemplateRuntimePatientFindingInput,
  intervention: string,
  selected: boolean
) {
  clearMessages()
  dirtySinceMount.value = true
  flow.setFindingIntervention(instance.localId || '', intervention, selected)
}

function onClassificationChoiceChange(
  findingLocalId: string,
  classificationName: string,
  nextChoice: string
) {
  clearMessages()
  markFieldTouched(findingLocalId, classificationName)
  dirtySinceMount.value = true

  const instance = (currentPayload.value?.patientFindings || []).find(
    (finding) => finding.localId === findingLocalId
  )
  if (!instance) {
    return
  }

  flow.updateClassificationValue({
    findingLocalId,
    classificationName,
    classificationChoice: nextChoice || null,
    descriptors: nextChoice ? buildDescriptors(instance, classificationName, nextChoice) : []
  })
  flow.noteClassificationUpdated(getFindingDefinitionByName(instance.finding)?.id || 0, 0, null)
}

function onDescriptorInput(
  findingLocalId: string,
  classificationName: string,
  descriptorKey: string,
  nextValue: string
) {
  markFieldTouched(findingLocalId, classificationName)
  dirtySinceMount.value = true
  const instance = (currentPayload.value?.patientFindings || []).find(
    (finding) => finding.localId === findingLocalId
  )
  if (!instance) {
    return
  }
  const currentChoice = classificationChoiceName(instance, classificationName)
  if (!currentChoice) {
    return
  }

  flow.updateClassificationValue({
    findingLocalId,
    classificationName,
    classificationChoice: currentChoice,
    descriptors: buildDescriptors(instance, classificationName, currentChoice, {
      descriptorKey,
      descriptorValue: nextValue
    })
  })
}

// Saving and validation have separate lifecycles. Autosave is owned by the store.
const draftSaveContextKey = computed(() => {
  const draft = currentRuntimeDraft.value
  return JSON.stringify([
    flow.authSubject,
    flow.patientExaminationId,
    draft?.draftId,
    draft?.patientExaminationId,
    draft?.moduleName,
    draft?.payload.knowledgeBaseVersion,
    draft?.templateName,
    draft?.templateIdentity
  ])
})

const draftSaveBlockedReason = computed<string | null>(() => {
  const draft = currentRuntimeDraft.value
  if (!draft || !draft.patientExaminationId || draft.patientExaminationId !== flow.patientExaminationId) {
    return 'Zuerst einen eindeutigen Untersuchungsentwurf öffnen.'
  }
  if (flow.savingFinalReport) return 'Der Bericht wird gerade abgeschlossen.'
  if (
    draft.persistencePolicy === 'blocked_until_verified') {
    return 'Die Terminologie-/Vorlagenidentität muss vor dem Speichern verifiziert werden.'
  }
  if (flow.draftConflict?.patientExaminationId === draft.patientExaminationId) {
    return 'Speicherkonflikt: zuerst die andere Bearbeitung prüfen. Lokale Eingaben bleiben erhalten.'
  }
  return null
})

const draftSaveStatusText = computed(() => {
  if (draftSaveBlockedReason.value) return draftSaveBlockedReason.value
  if (manualDraftSaveBusy.value || flow.draftPersistenceStatus === 'saving') {
    return 'Entwurf wird gespeichert…'
  }
  if (flow.draftPersistenceStatus === 'error') {
    return 'Entwurf nicht gespeichert. Lokale Eingaben bleiben erhalten.'
  }
  if (flow.hasUnpersistedDraftChanges) return 'Ungespeicherte Änderungen im Entwurf.'
  if (flow.draftPersistenceStatus === 'saved') {
    return 'Entwurf gespeichert. Vorlagenregeln und Abschluss werden getrennt geprüft.'
  }
  return 'Noch keine serverseitige Speicherbestätigung für diesen Entwurf.'
})

async function saveIntermediateDraft(): Promise<void> {
  if (manualDraftSaveBusy.value) return
  draftSaveActionError.value = null
  if (draftSaveBlockedReason.value) {
    draftSaveActionError.value = draftSaveBlockedReason.value
    return
  }
  const contextKey = draftSaveContextKey.value
  manualDraftSaveBusy.value = true
  try {
    // Reuse the store's serialized save loop, latest edits and expected_revision.
    await flow.flushDraftAutosave()
    if (contextKey !== draftSaveContextKey.value) return
    if (draftSaveBlockedReason.value) {
      draftSaveActionError.value = draftSaveBlockedReason.value
    } else if (flow.hasUnpersistedDraftChanges || flow.draftPersistenceStatus !== 'saved') {
      draftSaveActionError.value = 'Der aktuelle Entwurf wurde noch nicht vollständig vom Server bestätigt.'
    }
  } catch (error: unknown) {
    if (contextKey !== draftSaveContextKey.value) return
    draftSaveActionError.value = reportingApiErrorMessage(
      error,
      'Der Zwischenstand konnte nicht gespeichert werden. Ihre Eingaben bleiben erhalten.'
    )
  } finally {
    manualDraftSaveBusy.value = false
  }
}

watch(draftSaveContextKey, () => {
  draftSaveActionError.value = null
})

watch(
  () => [flow.draftPersistenceStatus, flow.hasUnpersistedDraftChanges] as const,
  ([status, hasChanges]) => {
    if (status === 'saved' && !hasChanges) draftSaveActionError.value = null
  }
)

type ValidationSnapshot = {
  contextKey: string
  moduleName: string
  moduleVersion: string
  templateName: string
  payload: ReportingRuntimeDraft['payload']
  context: {
    examinationId: number
    patientExaminationId: number
    indications: typeof flow.indications
  }
}

// Use content rather than object identity/updatedAt/revision: a save acknowledgement
// must not itself trigger another validation request or save/validate loop.
const validationInput = computed<{ signature: string | null; error: string | null }>(() => {
  const draft = currentRuntimeDraft.value
  const templateName = selectedTemplateName.value
  const examinationId = resolvedSelectedExaminationId.value
  if (
    !draft || !templateName || !examinationId || !draftMatchesSelectedTemplate.value ||
    draft.patientExaminationId !== flow.patientExaminationId
  ) return { signature: null, error: null }

  const snapshot: ValidationSnapshot = {
    contextKey: draftSaveContextKey.value,
    moduleName: draft.payload.knowledgeBaseModule || draft.moduleName,
    moduleVersion: draft.payload.knowledgeBaseVersion || '',
    templateName,
    payload: draft.payload,
    context: {
      examinationId,
      patientExaminationId: draft.patientExaminationId,
      indications: flow.indications
    }
  }
  try {
    const signature = JSON.stringify(snapshot, (_key, value: unknown) => {
      // Never silently turn NaN/Infinity into null or drop unsupported values.
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new TypeError('Non-finite descriptor value')
      }
      if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol') {
        throw new TypeError('Non-JSON descriptor value')
      }
      return value
    })
    return { signature, error: null }
  } catch {
    return {
      signature: null,
      error: 'Der Entwurf enthält einen nicht JSON-kompatiblen Wert. Bitte die Eingaben prüfen.'
    }
  }
})
const validationInputSignature = computed(() => validationInput.value.signature)

function clearValidationTimer(): void {
  if (validationTimer !== null) {
    clearTimeout(validationTimer)
    validationTimer = null
  }
}

function invalidateRuntimeValidation(): void {
  validationGeneration += 1
  clearValidationTimer()
  templateValidationLoading.value = false
  templateValidationError.value = null
  lastValidatedSignature.value = null
  flow.setLastTemplateValidation(null)
}

function isCurrentValidation(generation: number, signature: string): boolean {
  return !validationDisposed &&
    generation === validationGeneration &&
    signature === validationInputSignature.value
}

async function runRuntimeValidation(forceFeedback = false): Promise<void> {
  clearValidationTimer()
  if (validationDisposed) return
  invalidateRuntimeValidation()
  if (forceFeedback) showValidationFeedback.value = true
  const signature = validationInputSignature.value
  if (!signature) {
    templateValidationError.value = validationInput.value.error
    return
  }

  // Snapshot the JSON-shaped runtime contract before any asynchronous request.
  const snapshot = JSON.parse(signature) as ValidationSnapshot
  const generation = validationGeneration
  templateValidationLoading.value = true
  try {
    const result = await validateReportTemplateRuntime(
      snapshot.moduleName,
      snapshot.moduleVersion,
      snapshot.templateName,
      snapshot.payload,
      snapshot.context
    )
    if (!isCurrentValidation(generation, signature)) return
    lastValidatedSignature.value = signature
    flow.setLastTemplateValidation(result)
  } catch (error: unknown) {
    if (!isCurrentValidation(generation, signature)) return
    templateValidationError.value = reportingApiErrorMessage(
      error,
      'Template-Validierung konnte nicht ausgeführt werden.'
    )
  } finally {
    if (isCurrentValidation(generation, signature)) {
      templateValidationLoading.value = false
    }
    // Do not save here: store autosave is independent of template availability
    // and succeeds/fails independently of runtime validation.
  }
}

function scheduleRuntimeValidation(): void {
  invalidateRuntimeValidation()
  if (validationDisposed) return
  if (!validationInputSignature.value) {
    templateValidationError.value = validationInput.value.error
    return
  }
  validationTimer = setTimeout(() => {
    validationTimer = null
    void runRuntimeValidation(false)
  }, 350)
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  const blockedLocalEdits = !!draftSaveBlockedReason.value && dirtySinceMount.value
  if (!flow.hasUnpersistedDraftChanges && !blockedLocalEdits) return
  event.preventDefault()
  // Legacy browser support. Do not try to await a network save on beforeunload.
}

watch(
  () => terminology.activeBundleKey,
  async () => {
    setModuleName(
      terminology.activeBundle ? terminology.activeModuleName : '',
      terminology.activeBundle?.version || '',
      terminology.activeBundleKey
    )
    await refreshTemplatesForExamination()
  }
)

watch(
  () => flow.selectedTemplateName,
  async (templateName) => {
    if (
      templateName === selectedTemplateName.value &&
      (templateName === null || selectedTemplate.value?.name === templateName)
    ) {
      return
    }
    await selectTemplateByName(templateName)
  },
  { immediate: true }
)

watch(
  () => flow.selectedKbModule,
  (moduleName) => {
    if (moduleName === selectedKbModule.value) {
      return
    }
    setModuleName(
      moduleName,
      flow.currentRuntimeDraft?.payload.knowledgeBaseVersion ||
        terminology.activeBundle?.version ||
        ''
    )
    void refreshTemplatesForExamination()
  }
)

watch(
  () => [flow.patientExaminationId, selectedExaminationName.value],
  () => {
    resetTouchedState()
    templateValidationError.value = null
    flow.setLastTemplateValidation(null)
    void refreshTemplatesForExamination()
  }
)

watch(validationInputSignature, () => {
  scheduleRuntimeValidation()
})


onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  try {
    if (!examinationStore.exams.length) {
      await examinationStore.fetchExaminations()
    }
    const examination = requireResolvedReportingExamination({
      catalog: examinationStore.examinationsDropdown,
      selectedExaminationId: flow.selectedExaminationId,
      examinationName: currentPayload.value?.examination
    })
    await ensureCatalogLoaded(examination.id, getCatalogContext())
    await refreshTemplatesForExamination()
  } catch (error: unknown) {
    errorMessage.value = reportingApiErrorMessage(
      error,
      'Die Untersuchung für die Befunderfassung konnte nicht aufgelöst werden.'
    )
  }
  if (canValidateDraft.value) {
    scheduleRuntimeValidation()
  }
})

onBeforeUnmount(() => {
  reportingContextGeneration += 1
  validationDisposed = true
  validationGeneration += 1
  clearValidationTimer()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.runtime-finding-instance {
  background: #fbfcfe;
}
</style>
