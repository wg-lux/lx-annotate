import type {
  ReportConceptCoverage as ServerReportConceptCoverage,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSection
} from '@/types/reportTemplate'

export type ReportConceptCoverageStatus =
  'present' | 'missing' | 'not_applicable' | 'invalid' | 'unknown'

export type ReportConceptDocumentationStatus = 'recorded' | 'absent'
export type ReportConceptApplicabilityStatus = 'applicable' | 'not_applicable' | 'undetermined'
export type ReportConceptValidationStatus = 'valid' | 'invalid' | 'not_evaluated'

export type ReportConceptCoverageItem = {
  conceptId: string
  label: string
  kind: 'finding' | 'classification'
  finding: string
  status: ReportConceptCoverageStatus
  required: boolean
  documentation: ReportConceptDocumentationStatus
  applicability: ReportConceptApplicabilityStatus
  validation: ReportConceptValidationStatus
  validatorNames: string[]
  evidencePath: string | null
  messages: string[]
}

export type ReportConceptCoverage = {
  items: ReportConceptCoverageItem[]
  counts: Record<ReportConceptCoverageStatus, number>
  source: 'server' | 'legacy_fallback'
  identity: ServerReportConceptCoverage['identity'] | null
  provenance: ServerReportConceptCoverage['provenance'] | null
}

type CoverageTemplateFinding = ReportTemplateSection['findings'][number]

const EMPTY_COUNTS: Record<ReportConceptCoverageStatus, number> = {
  present: 0,
  missing: 0,
  not_applicable: 0,
  invalid: 0,
  unknown: 0
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function findingInstances(
  payload: { patientFindings?: ReportTemplateRuntimePatientFindingInput[] } | null,
  finding: string
): Array<{ instance: ReportTemplateRuntimePatientFindingInput; index: number }> {
  return (payload?.patientFindings || [])
    .map((instance, index) => ({ instance, index }))
    .filter(({ instance }) => normalizeKey(instance.finding) === normalizeKey(finding))
}

function hasValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
}

function applicabilityStatus(
  templateFinding: CoverageTemplateFinding
): ReportConceptApplicabilityStatus {
  if (templateFinding.applicability === 'not_applicable') {
    return 'not_applicable'
  }
  if (templateFinding.applicabilityRule) {
    return 'undetermined'
  }
  if (templateFinding.applicability === 'required' || templateFinding.required) {
    return 'applicable'
  }
  return 'undetermined'
}

function findingMessages(
  validation: ReportTemplateRuntimeValidationResult | null,
  finding: string
): string[] {
  const key = normalizeKey(finding)
  return [
    ...(validation?.findingsValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .flatMap((entry) => entry.issues.map((issue) => issue.message)),
    ...(validation?.interventionValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .flatMap((entry) => entry.issues.map((issue) => issue.message)),
    ...(validation?.unitValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .flatMap((entry) => entry.issues.map((issue) => issue.message))
  ]
}

function classificationMessages(
  validation: ReportTemplateRuntimeValidationResult | null,
  finding: string,
  classification: string
): string[] {
  const findingKey = normalizeKey(finding)
  const classificationKey = normalizeKey(classification)
  return (validation?.classificationValidators || [])
    .filter(
      (entry) =>
        normalizeKey(entry.finding) === findingKey &&
        normalizeKey(entry.classification) === classificationKey
    )
    .flatMap((entry) => entry.issues.map((issue) => issue.message))
}

function classificationValidationEvidence(
  validation: ReportTemplateRuntimeValidationResult | null,
  finding: string,
  classification: string
): string[] {
  const findingKey = normalizeKey(finding)
  const classificationKey = normalizeKey(classification)
  return [
    ...(validation?.classificationValidators || [])
      .filter(
        (entry) =>
          normalizeKey(entry.finding) === findingKey &&
          normalizeKey(entry.classification) === classificationKey
      )
      .map((entry) => entry.name),
    ...(validation?.unitValidators || [])
      .filter(
        (entry) =>
          normalizeKey(entry.finding) === findingKey &&
          normalizeKey(entry.classification) === classificationKey
      )
      .map((entry) => entry.name)
  ]
}

function findingValidationEvidence(
  validation: ReportTemplateRuntimeValidationResult | null,
  finding: string
): string[] {
  const key = normalizeKey(finding)
  return [
    ...(validation?.findingsValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .map((entry) => entry.name),
    ...(validation?.classificationValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .map((entry) => entry.name),
    ...(validation?.interventionValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .map((entry) => entry.name),
    ...(validation?.unitValidators || [])
      .filter((entry) => normalizeKey(entry.finding) === key)
      .map((entry) => entry.name)
  ]
}

function addItem(items: ReportConceptCoverageItem[], item: ReportConceptCoverageItem): void {
  items.push({ ...item, messages: Array.from(new Set(item.messages.filter(Boolean))) })
}

function findingCoverageStatus(params: {
  applicability: ReportConceptApplicabilityStatus
  documentation: ReportConceptDocumentationStatus
  validation: ReportConceptValidationStatus
}): ReportConceptCoverageStatus {
  if (params.applicability === 'not_applicable') {
    return 'not_applicable'
  }
  if (params.applicability === 'undetermined' && params.documentation === 'absent') {
    return 'unknown'
  }
  if (params.documentation === 'absent') {
    return 'missing'
  }
  if (params.validation === 'not_evaluated') {
    return 'unknown'
  }
  if (params.validation === 'invalid') {
    return 'invalid'
  }
  return 'present'
}

function classificationCoverageStatus(params: {
  applicability: ReportConceptApplicabilityStatus
  documentation: ReportConceptDocumentationStatus
  required: boolean
  validation: ReportConceptValidationStatus
}): ReportConceptCoverageStatus {
  if (params.applicability === 'not_applicable') {
    return 'not_applicable'
  }
  if (params.applicability === 'undetermined' && params.documentation === 'absent') {
    return 'unknown'
  }
  if (params.documentation === 'absent') {
    return params.required ? 'missing' : 'unknown'
  }
  if (params.validation === 'not_evaluated') {
    return 'unknown'
  }
  if (params.validation === 'invalid') {
    return 'invalid'
  }
  return 'present'
}

function conceptValidationStatus(
  documentation: ReportConceptDocumentationStatus,
  validatorNames: readonly string[],
  messages: readonly string[]
): ReportConceptValidationStatus {
  if (documentation === 'absent' || validatorNames.length === 0) {
    return 'not_evaluated'
  }
  return messages.length ? 'invalid' : 'valid'
}

type FindingInstance = ReturnType<typeof findingInstances>[number]
type CoverageClassification = CoverageTemplateFinding['classifications'][number]

function buildFindingCoverageItem(params: {
  templateFinding: CoverageTemplateFinding
  payload: { patientFindings?: ReportTemplateRuntimePatientFindingInput[] } | null
  validation: ReportTemplateRuntimeValidationResult | null
}): { item: ReportConceptCoverageItem; instances: FindingInstance[] } {
  const { templateFinding, payload, validation } = params
  const instances = findingInstances(payload, templateFinding.finding)
  const applicability = applicabilityStatus(templateFinding)
  const messages = findingMessages(validation, templateFinding.finding)
  const validatorNames = findingValidationEvidence(validation, templateFinding.finding)
  const documentation: ReportConceptDocumentationStatus = instances.length ? 'recorded' : 'absent'
  const validationStatus = conceptValidationStatus(documentation, validatorNames, messages)
  return {
    instances,
    item: {
      conceptId: normalizeKey(templateFinding.finding),
      label: templateFinding.finding,
      kind: 'finding',
      finding: templateFinding.finding,
      status: findingCoverageStatus({ applicability, documentation, validation: validationStatus }),
      required: templateFinding.required,
      documentation,
      applicability,
      validation: validationStatus,
      validatorNames,
      evidencePath: instances.length ? `patientFindings[${String(instances[0].index)}]` : null,
      messages
    }
  }
}

function classificationChoicePath(
  instances: FindingInstance[],
  classificationName: string
): string | null {
  const choice = instances
    .flatMap(({ instance, index }) =>
      instance.classificationChoices.map((candidate, choiceIndex) => ({
        candidate,
        path: `patientFindings[${String(index)}].classificationChoices[${String(choiceIndex)}]`
      }))
    )
    .find(
      ({ candidate }) =>
        normalizeKey(candidate.classification) === normalizeKey(classificationName) &&
        hasValue(candidate.classificationChoice)
    )
  return choice?.path || null
}

function buildClassificationCoverageItem(params: {
  finding: string
  classification: CoverageClassification
  applicability: ReportConceptApplicabilityStatus
  instances: FindingInstance[]
  validation: ReportTemplateRuntimeValidationResult | null
}): ReportConceptCoverageItem {
  const { finding, classification, applicability, instances, validation } = params
  const evidencePath = classificationChoicePath(instances, classification.classification)
  const messages = classificationMessages(validation, finding, classification.classification)
  const validatorNames = classificationValidationEvidence(
    validation,
    finding,
    classification.classification
  )
  const documentation: ReportConceptDocumentationStatus = evidencePath ? 'recorded' : 'absent'
  const validationStatus = conceptValidationStatus(documentation, validatorNames, messages)
  return {
    conceptId: `${normalizeKey(finding)}.${normalizeKey(classification.classification)}`,
    label: classification.classification,
    kind: 'classification',
    finding,
    status: classificationCoverageStatus({
      applicability,
      documentation,
      required: classification.required,
      validation: validationStatus
    }),
    required: classification.required,
    documentation,
    applicability,
    validation: validationStatus,
    validatorNames,
    evidencePath,
    messages
  }
}

export function deriveReportConceptCoverage(params: {
  sections: ReportTemplateSection[]
  payload: { patientFindings?: ReportTemplateRuntimePatientFindingInput[] } | null
  validation: ReportTemplateRuntimeValidationResult | null
}): ReportConceptCoverage {
  const items: ReportConceptCoverageItem[] = []

  for (const section of params.sections) {
    for (const templateFinding of section.findings) {
      const findingCoverage = buildFindingCoverageItem({
        templateFinding,
        payload: params.payload,
        validation: params.validation
      })
      addItem(items, findingCoverage.item)

      for (const classification of templateFinding.classifications) {
        addItem(
          items,
          buildClassificationCoverageItem({
            finding: templateFinding.finding,
            classification,
            applicability: findingCoverage.item.applicability,
            instances: findingCoverage.instances,
            validation: params.validation
          })
        )
      }
    }
  }

  const counts = { ...EMPTY_COUNTS }
  for (const item of items) counts[item.status] += 1
  return { items, counts, source: 'legacy_fallback', identity: null, provenance: null }
}

function serverStatus(
  applicability: ServerReportConceptCoverage['concepts'][number]['applicability'],
  validationStatus: ServerReportConceptCoverage['concepts'][number]['validationStatus']
): ReportConceptCoverageStatus {
  if (applicability.status === 'not_applicable') {
    return 'not_applicable'
  }
  if (validationStatus === 'present') {
    return 'present'
  }
  if (validationStatus === 'missing') {
    return 'missing'
  }
  if (validationStatus === 'invalid') {
    return 'invalid'
  }
  return 'unknown'
}

export function mapServerReportConceptCoverage(
  coverage: ServerReportConceptCoverage
): ReportConceptCoverage {
  const items: ReportConceptCoverageItem[] = coverage.concepts.map((concept) => ({
    conceptId: concept.conceptId,
    label: concept.label,
    kind: concept.conceptId.includes('.') ? 'classification' : 'finding',
    finding: concept.conceptId.includes('.')
      ? concept.conceptId.slice(0, concept.conceptId.indexOf('.'))
      : concept.label,
    status: serverStatus(concept.applicability, concept.validationStatus),
    required: concept.applicability.status === 'required',
    documentation: concept.validationStatus === 'present' ? 'recorded' : 'absent',
    applicability:
      concept.applicability.status === 'not_applicable'
        ? 'not_applicable'
        : concept.applicability.status === 'unknown' ||
            concept.applicability.status === 'conditional'
          ? 'undetermined'
          : 'applicable',
    validation:
      concept.validationStatus === 'present'
        ? 'valid'
        : concept.validationStatus === 'invalid'
          ? 'invalid'
          : 'not_evaluated',
    validatorNames: [],
    evidencePath: concept.evidencePath.join('.'),
    messages: []
  }))
  const counts = { ...EMPTY_COUNTS }
  for (const item of items) counts[item.status] += 1
  return {
    items,
    counts,
    source: 'server',
    identity: coverage.identity,
    provenance: coverage.provenance
  }
}

export function resolveReportConceptCoverage(params: {
  serverCoverage: ServerReportConceptCoverage | null
  sections: ReportTemplateSection[]
  payload: { patientFindings?: ReportTemplateRuntimePatientFindingInput[] } | null
  validation: ReportTemplateRuntimeValidationResult | null
}): ReportConceptCoverage {
  if (params.serverCoverage) {
    return mapServerReportConceptCoverage(params.serverCoverage)
  }
  return deriveReportConceptCoverage(params)
}
