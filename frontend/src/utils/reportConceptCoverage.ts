import type {
  ReportConceptCoverage as ServerReportConceptCoverage,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSection
} from '@/types/reportTemplate'

export type ReportConceptCoverageStatus =
  | 'present'
  | 'missing'
  | 'not_applicable'
  | 'invalid'
  | 'unknown'

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
  if (templateFinding.applicability === 'not_applicable') return 'not_applicable'
  if (templateFinding.applicabilityRule) return 'undetermined'
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
  if (params.applicability === 'not_applicable') return 'not_applicable'
  if (params.applicability === 'undetermined' && params.documentation === 'absent') {
    return 'unknown'
  }
  if (params.documentation === 'absent') return 'missing'
  if (params.validation === 'not_evaluated') return 'unknown'
  if (params.validation === 'invalid') return 'invalid'
  return 'present'
}

function classificationCoverageStatus(params: {
  applicability: ReportConceptApplicabilityStatus
  documentation: ReportConceptDocumentationStatus
  required: boolean
  validation: ReportConceptValidationStatus
}): ReportConceptCoverageStatus {
  if (params.applicability === 'not_applicable') return 'not_applicable'
  if (params.applicability === 'undetermined' && params.documentation === 'absent') {
    return 'unknown'
  }
  if (params.documentation === 'absent') return params.required ? 'missing' : 'unknown'
  if (params.validation === 'not_evaluated') return 'unknown'
  if (params.validation === 'invalid') return 'invalid'
  return 'present'
}

export function deriveReportConceptCoverage(params: {
  sections: ReportTemplateSection[]
  payload: { patientFindings?: ReportTemplateRuntimePatientFindingInput[] } | null
  validation: ReportTemplateRuntimeValidationResult | null
}): ReportConceptCoverage {
  const items: ReportConceptCoverageItem[] = []

  for (const section of params.sections) {
    for (const templateFinding of section.findings) {
      const findingId = normalizeKey(templateFinding.finding)
      const applicability = applicabilityStatus(templateFinding)
      const instances = findingInstances(params.payload, templateFinding.finding)
      const messages = findingMessages(params.validation, templateFinding.finding)
      const validatorNames = findingValidationEvidence(params.validation, templateFinding.finding)
      const documentation: ReportConceptDocumentationStatus = instances.length
        ? 'recorded'
        : 'absent'
      const validationStatus: ReportConceptValidationStatus =
        documentation === 'absent'
          ? 'not_evaluated'
          : !validatorNames.length
            ? 'not_evaluated'
            : messages.length
              ? 'invalid'
              : 'valid'
      const findingStatus = findingCoverageStatus({
        applicability,
        documentation,
        validation: validationStatus
      })

      addItem(items, {
        conceptId: findingId,
        label: templateFinding.finding,
        kind: 'finding',
        finding: templateFinding.finding,
        status: findingStatus,
        required: templateFinding.required,
        documentation,
        applicability,
        validation: validationStatus,
        validatorNames,
        evidencePath: instances.length ? `patientFindings[${String(instances[0].index)}]` : null,
        messages
      })

      for (const classification of templateFinding.classifications) {
        const classificationId = `${findingId}.${normalizeKey(classification.classification)}`
        const classificationApplicability = applicability
        const choice = instances
          .flatMap(({ instance, index }) =>
            instance.classificationChoices.map((candidate, choiceIndex) => ({
              candidate,
              path: `patientFindings[${String(index)}].classificationChoices[${String(choiceIndex)}]`
            }))
          )
          .find(
            ({ candidate }) =>
              normalizeKey(candidate.classification) ===
                normalizeKey(classification.classification) &&
              hasValue(candidate.classificationChoice)
          )
        const messagesForClassification = classificationMessages(
          params.validation,
          templateFinding.finding,
          classification.classification
        )
        const classificationValidatorNames = classificationValidationEvidence(
          params.validation,
          templateFinding.finding,
          classification.classification
        )
        const classificationDocumentation: ReportConceptDocumentationStatus = choice
          ? 'recorded'
          : 'absent'
        const classificationValidationStatus: ReportConceptValidationStatus =
          classificationDocumentation === 'absent'
            ? 'not_evaluated'
            : !classificationValidatorNames.length
              ? 'not_evaluated'
              : messagesForClassification.length
                ? 'invalid'
                : 'valid'
        const classificationStatus = classificationCoverageStatus({
          applicability: classificationApplicability,
          documentation: classificationDocumentation,
          required: classification.required,
          validation: classificationValidationStatus
        })

        addItem(items, {
          conceptId: classificationId,
          label: classification.classification,
          kind: 'classification',
          finding: templateFinding.finding,
          status: classificationStatus,
          required: classification.required,
          documentation: classificationDocumentation,
          applicability: classificationApplicability,
          validation: classificationValidationStatus,
          validatorNames: classificationValidatorNames,
          evidencePath: choice?.path || null,
          messages: messagesForClassification
        })
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
  if (applicability.status === 'not_applicable') return 'not_applicable'
  if (validationStatus === 'present') return 'present'
  if (validationStatus === 'missing') return 'missing'
  if (validationStatus === 'invalid') return 'invalid'
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
  if (params.serverCoverage) return mapServerReportConceptCoverage(params.serverCoverage)
  return deriveReportConceptCoverage(params)
}
