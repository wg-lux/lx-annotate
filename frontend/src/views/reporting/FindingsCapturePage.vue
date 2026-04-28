<template>
  <div class="d-flex flex-column gap-3">
    <MedicalBlock
      title="Template & Dokumentationsregeln"
      subtitle="Template wählen, Abschnitte prüfen und den lokalen Befund-Entwurf gegen die Wissensbasis validieren"
      icon="description"
      icon-bg-class="bg-gradient-primary"
      :is-complete="!!selectedTemplateName && !!currentRuntimeDraft"
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
              :disabled="templateLoading"
              @change="onModuleChange(($event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="col-md-4">
            <label class="form-label">Untersuchung</label>
            <input class="form-control" :value="selectedExaminationDisplayName || ''" readonly />
          </div>
          <div class="col-md-4">
            <label class="form-label">Template</label>
            <select
              class="form-select"
              :value="selectedTemplateName || ''"
              :disabled="templateLoading || !templateOptions.length"
              @change="onTemplateSelectionChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>
                {{ templateLoading ? 'Templates laden...' : 'Template wählen' }}
              </option>
              <option v-for="template in templateOptions" :key="template.name" :value="template.name">
                {{ template.name }}
              </option>
            </select>
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
            class="btn btn-primary btn-sm"
            :disabled="templateValidationLoading || !canValidateDraft"
            @click="runRuntimeValidation(true)"
          >
            Bericht prüfen
          </button>
        </div>

        <div v-if="templateErrorMessage" class="alert alert-danger py-2 mb-2">
          {{ templateErrorMessage }}
        </div>
        <div v-if="templateStatusMessage" class="alert alert-success py-2 mb-2">
          {{ templateStatusMessage }}
        </div>

        <div v-if="selectedTemplate" class="small text-muted mb-2">
          Abschnitte: {{ sectionBlocks.length }} · Validierungen:
          {{ selectedTemplateValidatorCounts.examination }} auf Untersuchungsebene,
          {{ selectedTemplateValidatorCounts.findings }} auf Befundebene
        </div>
        <div v-if="currentRuntimeDraft" class="small text-muted">
          Entwurf:
          {{ currentRuntimeDraft.hydratedFrom === 'session_storage' || currentRuntimeDraft.hydratedFrom === 'draft_api' ? 'wiederhergestellt' : 'initialisiert' }}
          · Befunde: {{ currentPayload?.patientFindings.length || 0 }}
          · Aktualisiert: {{ new Date(currentRuntimeDraft.updatedAt).toLocaleTimeString('de-DE') }}
        </div>
      </template>
    </MedicalBlock>

    <div class="card shadow-sm">
      <div class="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-0">Befunderfassung</h5>
          <small class="text-muted">Frontend-eigene Befundgraphen pflegen und gegen das Template validieren</small>
        </div>
        <div class="small text-muted">
          {{ currentPayload?.patientFindings.length || 0 }} Befundinstanz(en)
        </div>
      </div>
      <div class="card-body">
        <div v-if="errorMessage" class="alert alert-danger py-2">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2">{{ successMessage }}</div>

        <ReportingMediaPreviewCards class="mb-3" />

        <div v-if="!flow.patientExaminationId || !flow.selectedExaminationId" class="alert alert-warning">
          Bitte zuerst das Fall-Setup abschließen (Patient + Untersuchung + PatientExamination).
        </div>
        <div v-else-if="!currentRuntimeDraft || !currentPayload" class="alert alert-warning">
          Kein lokaler Reporting-Entwurf vorhanden. Bitte den Reporting-Shell-Kontext erneut laden.
        </div>
        <div v-else-if="!selectedTemplate" class="alert alert-info">
          Bitte zuerst ein Template wählen, damit die Befunde abschnittsweise gerendert werden können.
        </div>

        <template v-else>
          <div
            v-for="section in sectionBlocks"
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
                :key="`${section.name}:${templateFinding.finding}`"
                :id="findingAnchorId(templateFinding.finding)"
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
                    {{ instancesForFinding(templateFinding.finding).length ? 'Weitere Instanz hinzufügen' : 'Befund hinzufügen' }}
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

                    <div class="row g-3">
                      <div
                        v-for="classification in visibleClassificationsForFinding(templateFinding.finding)"
                        :key="`${instance.localId}:${classification.name}`"
                        class="col-md-6"
                      >
                        <label class="form-label">
                          {{ classification.displayName || classification.name }}
                          <span v-if="isClassificationRequired(templateFinding.finding, classification.name)" class="text-danger">*</span>
                        </label>
                        <select
                          class="form-select"
                          :class="{ 'is-invalid': hasFieldError(instance, templateFinding.finding, classification.name) }"
                          :value="classificationChoiceName(instance, classification.name)"
                          @change="onClassificationChoiceChange(
                            instance.localId || '',
                            classification.name,
                            ($event.target as HTMLSelectElement).value
                          )"
                        >
                          <option value="">
                            Auswahl treffen
                          </option>
                          <option
                            v-for="choice in classification.choices"
                            :key="choice.id"
                            :value="choice.name"
                          >
                            {{ choice.displayName || choice.name }}
                          </option>
                        </select>

                        <div
                          v-for="descriptorKey in descriptorKeysForField(templateFinding.finding, classification.name, instance)"
                          :key="`${instance.localId}:${classification.name}:${descriptorKey}`"
                          class="mt-2"
                        >
                          <label class="form-label form-label-sm">
                            {{ descriptorLabel(descriptorKey) }}
                          </label>
                          <input
                            class="form-control form-control-sm"
                            :type="descriptorInputType(descriptorKey)"
                            :value="descriptorValue(instance, classification.name, descriptorKey)"
                            @input="onDescriptorInput(
                              instance.localId || '',
                              classification.name,
                              descriptorKey,
                              ($event.target as HTMLInputElement).value
                            )"
                          />
                        </div>

                        <div
                          v-if="fieldMessages(instance, templateFinding.finding, classification.name).length"
                          class="invalid-feedback d-block"
                        >
                          <div
                            v-for="message in fieldMessages(instance, templateFinding.finding, classification.name)"
                            :key="message"
                          >
                            {{ message }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="small text-muted">
                  Noch keine Instanz dieses Befunds im lokalen Entwurf.
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 p-3 bg-light rounded small">
            <div><strong>Letztes Befund-Ereignis:</strong> {{ flow.lastFindingsEvent ? formatFindingsEvent(flow.lastFindingsEvent) : 'keins' }}</div>
          </div>

          <div class="mt-3">
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
  getClassificationDisplayName,
  getFindingDisplayName,
  mergeFindingClassifications,
  type Finding,
  type FindingClassification,
  type FindingChoice
} from '@/api/findings.contract'
import { validateReportTemplateRuntime } from '@/api/reportTemplatesApi'
import type {
  ReportTemplateFinding,
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePatientFindingInput
} from '@/types/reportTemplate'
import MedicalBlock from '@/components/AssistedReporting/MedicalBlock.vue'
import ReportTemplateValidationPanel from '@/components/Reporting/ReportTemplateValidationPanel.vue'
import ReportingMediaPreviewCards from '@/components/Reporting/ReportingMediaPreviewCards.vue'
import { useFindingSelectors } from '@/composables/reporting/useFindingSelectors'
import { useReportTemplates } from '@/composables/reporting/useReportTemplates'
import { useExaminationStore } from '@/stores/examinationStore'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

const flow = useReportingFlowStore()
const examinationStore = useExaminationStore()
const {
  catalogFindings,
  loading: findingSelectorsLoading,
  ensureCatalogLoaded,
  getFindingById
} = useFindingSelectors()

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const templateValidationLoading = ref(false)
const templateValidationError = ref<string | null>(null)
const templateStatusMessage = ref<string | null>(null)
const touchedFields = ref<Record<string, boolean>>({})
const showValidationFeedback = ref(false)
const dirtySinceMount = ref(false)
let validationTimer: ReturnType<typeof setTimeout> | null = null

const {
  moduleName: selectedKbModule,
  selectedTemplateName,
  templateOptions,
  selectedTemplate,
  sectionBlocks,
  loading: templateLoading,
  errorMessage: templateErrorMessage,
  fetchTemplatesByExamination,
  selectTemplateByName,
  setModuleName
} = useReportTemplates({
  initialModuleName: flow.selectedKbModule,
  initialTemplateName: flow.selectedTemplateName
})

const currentRuntimeDraft = computed(() => flow.currentRuntimeDraft)
const currentPayload = computed(() => currentRuntimeDraft.value?.payload || null)
const canValidateDraft = computed(
  () => !!selectedTemplateName.value && !!currentPayload.value
)
const selectedExamination = computed(
  () =>
    examinationStore.examinationsDropdown.find((item) => item.id === flow.selectedExaminationId) || null
)
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

const catalogFindingsByNormalizedName = computed(() => {
  const entries = catalogFindings.value.map((finding) => [normalizeKey(finding.name), finding] as const)
  return new Map<string, Finding>(entries)
})

const backendMissingClassificationsByFinding = computed<Record<string, string[]>>(() => {
  const entries = (flow.lastTemplateValidation?.findingsValidators || []).flatMap((validator) => {
    if (!validator.missingRequiredClassifications.length) return []
    return [[normalizeKey(validator.finding), validator.missingRequiredClassifications] as const]
  })
  return Object.fromEntries(entries)
})

const backendMessagesByFinding = computed<Record<string, string[]>>(() => {
  const entries = (flow.lastTemplateValidation?.findingsValidators || []).map((validator) => [
    normalizeKey(validator.finding),
    validator.issues.map((issue) => issue.message)
  ] as const)
  return Object.fromEntries(entries)
})

const findingAnchors = computed<Record<string, string>>(() => {
  const entries = sectionBlocks.value
    .flatMap((section) => section.findings)
    .map((finding) => [
      normalizeKey(finding.finding),
      findingAnchorId(finding.finding)
    ] as const)
  return Object.fromEntries(entries)
})

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function findingAnchorId(findingName: string): string {
  return `finding-${normalizeKey(findingName)}`
}

function clearMessages() {
  errorMessage.value = null
  successMessage.value = null
}

function formatApiError(e: any, fallback: string): string {
  return e?.response?.data?.detail || e?.response?.data?.error || e?.message || fallback
}

function formatFindingsEvent(event: NonNullable<typeof flow.lastFindingsEvent>) {
  const time = new Date(event.at).toLocaleTimeString('de-DE')
  if (event.type === 'finding_added') {
    return `${time}: Befund ${event.findingId} hinzugefügt`
  }
  return `${time}: Klassifikation ${event.classificationId} für Befund ${event.findingId} aktualisiert`
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

function visibleClassificationsForFinding(findingName: string): FindingClassification[] {
  const definitions = allDefinitionClassificationsForFinding(findingName)
  const extraRequired = backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []
  const byKey = new Map<string, FindingClassification>()

  for (const classification of definitions) {
    byKey.set(normalizeKey(classification.name), classification)
  }

  for (const missing of extraRequired) {
    const existing = byKey.get(normalizeKey(missing))
    if (existing) continue
    byKey.set(normalizeKey(missing), {
      id: 0,
      name: missing,
      displayName: missing,
      required: true,
      classificationTypes: [],
      choices: []
    })
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
  if (!currentPayload.value) return false
  if (templateFinding.multipleAllowed) return true
  return instancesForFinding(templateFinding.finding).length === 0
}

function isClassificationRequired(findingName: string, classificationName: string): boolean {
  const fromTemplate =
    sectionBlocks.value
      .flatMap((section) => section.findings)
      .find((finding) => normalizeKey(finding.finding) === normalizeKey(findingName))
      ?.classifications.find(
        (classification) => normalizeKey(classification.classification) === normalizeKey(classificationName)
      )?.required || false

  const fromValidation =
    (backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []).some(
      (classification) => normalizeKey(classification) === normalizeKey(classificationName)
    )

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
  if (!classification || !choiceName) return null
  return (
    classification.choices.find((choice) => normalizeKey(choice.name) === normalizeKey(choiceName)) || null
  )
}

function descriptorKeysForField(
  findingName: string,
  classificationName: string,
  instance: ReportTemplateRuntimePatientFindingInput
): string[] {
  const selectedChoice = selectedChoiceDefinition(findingName, classificationName, instance)
  const descriptorKeys = Object.keys(selectedChoice?.numericalDescriptors || {})
  if (descriptorKeys.length) return descriptorKeys

  const existingChoice = classificationChoiceState(instance, classificationName)
  if (existingChoice?.descriptors.length) {
    return existingChoice.descriptors.map((descriptor) => descriptor.classificationChoiceDescriptor)
  }

  const normalizedClassification = normalizeKey(classificationName)
  if (
    normalizedClassification.includes('mm') ||
    normalizedClassification.includes('size') ||
    normalizedClassification.includes('length') ||
    normalizedClassification.includes('distance')
  ) {
    return [`${normalizedClassification}_descriptor`]
  }

  return []
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
  return descriptor?.descriptorValue == null ? '' : String(descriptor.descriptorValue)
}

function descriptorLabel(descriptorKey: string): string {
  return descriptorKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function descriptorInputType(descriptorKey: string): 'number' | 'text' {
  return /(mm|cm|length|size|distance|count|number)/i.test(descriptorKey) ? 'number' : 'text'
}

function buildDescriptors(
  instance: ReportTemplateRuntimePatientFindingInput,
  classificationName: string,
  nextChoiceName: string,
  patch?: { descriptorKey?: string; descriptorValue?: string }
): ReportTemplateRuntimeDescriptorInput[] {
  const existingDescriptors = classificationChoiceState(instance, classificationName)?.descriptors || []
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
          descriptorInputType(patch.descriptorKey) === 'number'
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
    (
      showValidationFeedback.value ||
      touchedFields.value[fieldKey(instance.localId || '', classificationName)]
    )

  const hasBackendMissing =
    (backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []).some(
      (classification) => normalizeKey(classification) === normalizeKey(classificationName)
    ) &&
    (
      showValidationFeedback.value ||
      touchedFields.value[fieldKey(instance.localId || '', classificationName)]
    )

  return isMissingRequired || hasBackendMissing
}

function fieldMessages(
  instance: ReportTemplateRuntimePatientFindingInput,
  findingName: string,
  classificationName: string
): string[] {
  if (!hasFieldError(instance, findingName, classificationName)) return []

  const messages: string[] = []
  if (
    isClassificationRequired(findingName, classificationName) &&
    !classificationChoiceName(instance, classificationName)
  ) {
    messages.push('Dieses Feld ist fuer den aktuellen Entwurfszustand erforderlich.')
  }

  if (
    (backendMissingClassificationsByFinding.value[normalizeKey(findingName)] || []).some(
      (classification) => normalizeKey(classification) === normalizeKey(classificationName)
    )
  ) {
    messages.push('Die Validierung verlangt diese Klassifikation fuer den aktuellen Befund.')
  }

  return Array.from(new Set(messages))
}

function findingLevelMessages(findingName: string): string[] {
  const messages = backendMessagesByFinding.value[normalizeKey(findingName)] || []
  return Array.from(new Set(messages.filter(Boolean)))
}

async function refreshTemplatesForExamination() {
  templateStatusMessage.value = null
  const examName = selectedExaminationName.value
  if (!examName) return
  const templates = await fetchTemplatesByExamination(examName)
  if (templates.length) {
    templateStatusMessage.value = `${templates.length} Template(s) fuer "${examName}" geladen.`
  } else {
    templateStatusMessage.value = `Keine Templates fuer "${examName}" gefunden.`
  }
}

function onModuleChange(next: string) {
  setModuleName(next.trim() || 'report_template_examples')
  void refreshTemplatesForExamination()
}

function onTemplateSelectionChange(name: string) {
  void selectTemplateByName(name || null)
  showValidationFeedback.value = false
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
  if (!findingLocalId) return
  flow.removeFinding(findingLocalId)
  dirtySinceMount.value = true
  successMessage.value = 'Befundinstanz aus dem lokalen Entwurf entfernt.'
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
  if (!instance) return

  flow.updateClassificationValue({
    findingLocalId,
    classificationName,
    classificationChoice: nextChoice || null,
    descriptors: nextChoice
      ? buildDescriptors(instance, classificationName, nextChoice)
      : []
  })
  flow.noteClassificationUpdated(
    getFindingDefinitionByName(instance.finding)?.id || 0,
    0,
    null
  )
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
  if (!instance) return
  const currentChoice = classificationChoiceName(instance, classificationName)
  if (!currentChoice) return

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

async function runRuntimeValidation(forceFeedback = false) {
  const draft = currentRuntimeDraft.value
  const templateName = selectedTemplateName.value
  const patientExaminationId = flow.patientExaminationId
  if (!draft || !templateName || !patientExaminationId) {
    templateValidationError.value = null
    flow.setLastTemplateValidation(null)
    return
  }

  if (forceFeedback) {
    showValidationFeedback.value = true
  }

  templateValidationLoading.value = true
  templateValidationError.value = null
  let validationFailed = false
  try {
    const result = await validateReportTemplateRuntime(
      flow.selectedKbModule,
      templateName,
      draft.payload
    )
    flow.setLastTemplateValidation(result)
  } catch (e: any) {
    validationFailed = true
    flow.setLastTemplateValidation(null)
    templateValidationError.value = formatApiError(
      e,
      'Template-Validierung konnte nicht ausgefuehrt werden.'
    )
  } finally {
    try {
      await flow.persistCurrentRuntimeDraft()
    } catch (e: any) {
      if (!validationFailed) {
        templateValidationError.value = formatApiError(
          e,
          'Der Reporting-Entwurf konnte nach der Validierung nicht gespeichert werden.'
        )
      }
    }
    templateValidationLoading.value = false
  }
}

function scheduleRuntimeValidation() {
  if (validationTimer) {
    clearTimeout(validationTimer)
  }
  validationTimer = setTimeout(() => {
    void runRuntimeValidation(false)
  }, 350)
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirtySinceMount.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(
  [selectedKbModule, selectedTemplateName],
  ([moduleName, templateName]) => {
    flow.setTemplateSelection({
      moduleName,
      templateName
    })
  }
)

watch(
  () => flow.patientExaminationId,
  () => {
    resetTouchedState()
    templateValidationError.value = null
    flow.setLastTemplateValidation(null)
  }
)

watch(
  () => currentPayload.value?.patientFindings,
  () => {
    if (!selectedTemplateName.value || !currentPayload.value) return
    scheduleRuntimeValidation()
  },
  { deep: true }
)

watch(
  () => selectedTemplateName.value,
  () => {
    if (!selectedTemplateName.value) {
      flow.setLastTemplateValidation(null)
      templateValidationError.value = null
      return
    }
    scheduleRuntimeValidation()
  }
)

onMounted(async () => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  await ensureCatalogLoaded()
  if (selectedExaminationName.value) {
    await refreshTemplatesForExamination()
  }
  if (canValidateDraft.value) {
    scheduleRuntimeValidation()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (validationTimer) {
    clearTimeout(validationTimer)
    validationTimer = null
  }
})
</script>

<style scoped>
.runtime-finding-instance {
  background: #fbfcfe;
}
</style>
