import axiosInstance, { dtypesApi } from '@/api/axiosInstance'
import {
  extractFindingId,
  type Finding,
  type FindingClassification,
  type JsonMap
} from '@/api/findings.contract'
import { findingsApi } from '@/api/findingsApi'
import { isReportVerbosity } from '@/types/reportTemplate'
import type {
  ReportTemplateDefinitionValidationResult,
  ExaminationValidatorExecution,
  FindingsValidatorComparator,
  FindingsValidatorCondition,
  FindingsValidatorConditionClause,
  FindingsValidatorExecution,
  FindingsValidatorOperator,
  FindingsValidatorQuery,
  ReportTemplateExaminationValidator,
  ReportTemplateFinding,
  ReportTemplateFindingValidator,
  ReportTemplatePayload,
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePayload,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimeValidationResult,
  ClassificationValidatorExecution,
  ReportTemplateGraphEdge,
  ReportTemplateGraphNode,
  ReportTemplateStructureGraph,
  ReportTemplateStructureIssue,
  ReportTemplateSection,
  ReportTemplateSectionField,
  ReportTemplateIdentity,
  ReportTemplateReadiness,
  ReportTemplateValidators,
  ReportConceptApplicabilityStatus,
  ReportConceptCoverage,
  ReportConceptCoverageIdentity,
  ReportConceptCoverageItem,
  ReportConceptCoverageProvenance,
  ReportConceptValidationStatus,
  RuntimeValidationIssue,
  RuntimeValidatorDependencyStatus,
  InterventionValidatorExecution,
  UnitValidatorExecution
} from '@/types/reportTemplate'

const REPORT_TEMPLATE_BASE = dtypesApi('report-templates')

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asBoolean(value: unknown): boolean {
  return !!value
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map((entry) => asString(entry)).filter((entry): entry is string => entry !== null)
}

function formatConditionValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return String(value)
  }
  if (value === null) {
    return 'null'
  }
  return 'ungültiger Wert'
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

function titleFromSectionName(name: string): string {
  return name
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeClassificationInput(
  value: unknown
): ReportTemplateFinding['classifications'][number]['input'] {
  if (!isRecordLike(value) || !Array.isArray(value.choices)) {
    return null
  }
  return {
    choices: value.choices
      .filter((choice): choice is Record<string, unknown> => isRecordLike(choice))
      .map((choice) => ({
        name: asString(choice.name) || '',
        descriptors: Array.isArray(choice.descriptors)
          ? choice.descriptors
              .filter((descriptor): descriptor is Record<string, unknown> =>
                isRecordLike(descriptor)
              )
              .map((descriptor) => ({
                name: asString(descriptor.name) || '',
                type: asString(descriptor.type) || 'unknown',
                unit: asString(descriptor.unit),
                nameDe: asString(descriptor.nameDe ?? descriptor.name_de) || undefined,
                nameEn: asString(descriptor.nameEn ?? descriptor.name_en) || undefined,
                unitAbbreviation: asString(
                  descriptor.unitAbbreviation ?? descriptor.unit_abbreviation
                ),
                numericMin: asNumber(descriptor.numericMin ?? descriptor.numeric_min),
                numericMax: asNumber(descriptor.numericMax ?? descriptor.numeric_max)
              }))
              .filter((descriptor) => !!descriptor.name)
          : []
      }))
      .filter((choice) => !!choice.name)
  }
}

function normalizeClassifications(
  classifications: unknown
): ReportTemplateFinding['classifications'] {
  if (!Array.isArray(classifications)) {
    return []
  }
  return classifications
    .filter((classification): classification is Record<string, unknown> =>
      isRecordLike(classification)
    )
    .map((classification) => ({
      classification: asString(classification.classification) || '',
      required: asBoolean(classification.required),
      input: normalizeClassificationInput(classification.input)
    }))
    .filter((classification) => !!classification.classification)
}

function normalizeFindings(findings: unknown): ReportTemplateFinding[] {
  if (!Array.isArray(findings)) {
    return []
  }
  return findings
    .map((entry) => normalizeReportTemplateFinding(entry))
    .filter((entry): entry is ReportTemplateFinding => entry !== null)
}

function normalizeReportTemplateFinding(entry: unknown): ReportTemplateFinding | null {
  if (typeof entry === 'string') {
    return {
      finding: entry,
      required: false,
      multipleAllowed: false,
      classifications: []
    }
  }
  if (!isRecordLike(entry)) {
    return null
  }
  const finding = asString(entry.finding)
  if (!finding) {
    return null
  }
  return {
    finding,
    required: asBoolean(entry.required),
    multipleAllowed: asBoolean(entry.multipleAllowed ?? entry.multiple_allowed),
    applicability:
      (asString(entry.applicability) as ReportTemplateFinding['applicability']) || undefined,
    applicabilityRule: asString(entry.applicabilityRule ?? entry.applicability_rule),
    classifications: normalizeClassifications(entry.classifications)
  }
}

function normalizeSections(sections: unknown): ReportTemplateSection[] {
  if (!Array.isArray(sections)) {
    return []
  }
  return sections
    .filter((section): section is Record<string, unknown> => isRecordLike(section))
    .map((section) => {
      const name = asString(section.name) || ''
      return {
        name,
        titleDe: asString(section.titleDe ?? section.title_de) || name,
        titleEn: asString(section.titleEn ?? section.title_en) || name,
        position: asNumber(section.position) ?? 0,
        sectionKind:
          (asString(section.sectionKind ?? section.section_kind) as
            ReportTemplateSection['sectionKind'] | null) || 'findings',
        fields: normalizeSectionFields(section.fields),
        types: asStringArray(section.types),
        findings: normalizeFindings(section.findings)
      }
    })
    .filter((section) => !!section.name)
    .sort((a, b) => a.position - b.position)
}

function normalizeSectionFields(value: unknown): ReportTemplateSectionField[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      key: asString(entry.key) || '',
      required: asBoolean(entry.required),
      label: asString(entry.label),
      source: (asString(entry.source) as ReportTemplateSectionField['source']) || null
    }))
    .filter((entry) => !!entry.key)
}

function normalizeReadiness(value: unknown): ReportTemplateReadiness | null {
  if (!isRecordLike(value)) {
    return null
  }
  return {
    canPublish:
      typeof value.canPublish === 'boolean'
        ? value.canPublish
        : typeof value.can_publish === 'boolean'
          ? value.can_publish
          : null,
    blockingIssues: asStringArray(value.blockingIssues ?? value.blocking_issues),
    warnings: asStringArray(value.warnings),
    raw: value
  }
}

function field(record: Record<string, unknown>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake]
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function normalizeCoverageIdentity(value: unknown): ReportConceptCoverageIdentity | null {
  if (!isRecordLike(value)) {
    return null
  }
  const identity = {
    moduleName: asString(field(value, 'moduleName', 'module_name')),
    moduleVersion: asString(field(value, 'moduleVersion', 'module_version')),
    moduleDigest: field(value, 'moduleDigest', 'module_digest'),
    templateName: asString(field(value, 'templateName', 'template_name')),
    templateVersion: asString(field(value, 'templateVersion', 'template_version')),
    templateDigest: field(value, 'templateDigest', 'template_digest')
  }
  if (
    !identity.moduleName ||
    !identity.moduleVersion ||
    !isSha256(identity.moduleDigest) ||
    !identity.templateName ||
    !identity.templateVersion ||
    !isSha256(identity.templateDigest)
  ) {
    return null
  }
  return identity as ReportConceptCoverageIdentity
}

function normalizeCoverageProvenance(value: unknown): ReportConceptCoverageProvenance | null {
  if (!isRecordLike(value)) {
    return null
  }
  const provenance = {
    resolver: asString(value.resolver),
    resolverVersion: asString(field(value, 'resolverVersion', 'resolver_version')),
    evidenceDigest: field(value, 'evidenceDigest', 'evidence_digest')
  }
  if (!provenance.resolver || !provenance.resolverVersion || !isSha256(provenance.evidenceDigest)) {
    return null
  }
  return provenance as ReportConceptCoverageProvenance
}

function normalizeCoverageItem(value: unknown): ReportConceptCoverageItem | null {
  if (!isRecordLike(value)) {
    return null
  }
  const conceptId = asString(field(value, 'conceptId', 'concept_id'))
  const label = asString(value.label)
  const applicability = isRecordLike(value.applicability) ? value.applicability : null
  const applicabilityStatus = applicability
    ? (asString(applicability.status) as ReportConceptApplicabilityStatus | null)
    : null
  const validationStatus = asString(
    field(value, 'validationStatus', 'validation_status')
  ) as ReportConceptValidationStatus | null
  const evidencePath = value.evidencePath ?? value.evidence_path
  const evidence = Array.isArray(evidencePath)
    ? evidencePath.map((entry) => asString(entry)).filter((entry): entry is string => !!entry)
    : []
  if (!applicability) {
    return null
  }
  if (
    !conceptId ||
    !/^[a-z][a-z0-9_.:-]*$/.test(conceptId) ||
    !label ||
    !applicabilityStatus ||
    !['required', 'conditional', 'not_applicable', 'unknown'].includes(applicabilityStatus) ||
    !validationStatus ||
    !['present', 'missing', 'invalid', 'unknown', 'undetermined'].includes(validationStatus) ||
    !evidence.length
  ) {
    return null
  }
  const rule = asString(applicability.rule)
  const reason = asString(applicability.reason)
  if (applicabilityStatus === 'conditional' && !rule) {
    return null
  }
  if (applicabilityStatus === 'not_applicable' && !reason) {
    return null
  }
  if (applicabilityStatus === 'not_applicable' && validationStatus !== 'undetermined') {
    return null
  }
  return {
    conceptId,
    label,
    applicability: { status: applicabilityStatus, rule, reason },
    validationStatus,
    evidencePath: evidence
  }
}

export function normalizeReportConceptCoverage(value: unknown): ReportConceptCoverage | null {
  if (!isRecordLike(value)) {
    return null
  }
  if (
    value.contractVersion !== 'report_concept_coverage_v1' &&
    value.contract_version !== 'report_concept_coverage_v1'
  ) {
    return null
  }
  const identity = normalizeCoverageIdentity(value.identity)
  const provenance = normalizeCoverageProvenance(value.provenance)
  const concepts = Array.isArray(value.concepts) ? value.concepts.map(normalizeCoverageItem) : null
  if (!identity || !provenance || !concepts || concepts.some((item) => item === null)) {
    return null
  }
  return {
    contractVersion: 'report_concept_coverage_v1',
    identity,
    provenance,
    concepts: concepts as ReportConceptCoverageItem[]
  }
}

export function normalizeReportTemplateIdentity(payload: unknown): ReportTemplateIdentity {
  const record = isRecordLike(payload) ? payload : {}
  const lifecycle = asString(record.lifecycleStatus ?? record.lifecycle_status)
  const identity = isRecordLike(record.identity) ? record.identity : {}
  const readiness = normalizeReadiness(record.readiness)
  return {
    moduleName: asString(
      record.knowledgeBaseModule ??
        record.knowledge_base_module ??
        record.moduleName ??
        record.module_name
    ),
    knowledgeBaseVersion: asString(
      record.knowledgeBaseVersion ?? record.knowledge_base_version ?? record.version
    ),
    templateVersion: asString(
      record.templateVersion ??
        record.template_version ??
        identity.templateVersion ??
        identity.template_version
    ),
    templateHash: asString(
      record.templateHash ??
        record.template_hash ??
        record.hash ??
        identity.templateHash ??
        identity.template_hash
    ),
    lifecycleStatus: lifecycle === 'draft' || lifecycle === 'published' ? lifecycle : null,
    readiness
  }
}

function normalizeConditionClause(
  input: Record<string, unknown>
): FindingsValidatorConditionClause | null {
  const classification = asString(input.classification)
  const comparator = asString(input.comparator) as FindingsValidatorComparator | null
  if (!classification || !comparator) {
    return null
  }
  return {
    classification,
    comparator,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(Array.isArray(input.values) ? { values: input.values } : {})
  }
}

function normalizeCondition(input: unknown): FindingsValidatorCondition | null {
  if (!isRecordLike(input)) {
    return null
  }
  const rawThenRequires = Array.isArray(input.thenRequires ?? input.then_requires)
    ? ((input.thenRequires ?? input.then_requires) as unknown[])
    : []
  const anyConditions = Array.isArray(input.any)
    ? input.any
        .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
        .map(normalizeConditionClause)
        .filter((entry): entry is FindingsValidatorConditionClause => entry !== null)
    : []
  const allConditions = Array.isArray(input.all)
    ? input.all
        .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
        .map(normalizeConditionClause)
        .filter((entry): entry is FindingsValidatorConditionClause => entry !== null)
    : []
  const thenRequires = rawThenRequires
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({ classification: asString(entry.classification) || '' }))
    .filter((entry): entry is { classification: string } => !!entry.classification)

  if (!anyConditions.length && !allConditions.length && !thenRequires.length) {
    return null
  }
  return { any: anyConditions, all: allConditions, thenRequires }
}

function normalizeQuery(input: unknown, fallbackFinding: string): FindingsValidatorQuery {
  if (!isRecordLike(input)) {
    return {
      finding: fallbackFinding || null,
      operator: null,
      params: {},
      condition: null
    }
  }

  const operator = asString(input.operator) as FindingsValidatorOperator | null
  return {
    finding: asString(input.finding) || fallbackFinding || null,
    operator,
    params: isRecordLike(input.params) ? input.params : {},
    condition: normalizeCondition(input.condition)
  }
}

function findRelatedSections(findingName: string, sections: ReportTemplateSection[]): string[] {
  if (!findingName) {
    return []
  }
  const target = normalizeKey(findingName)
  return sections
    .filter((section) =>
      section.findings.some((finding) => normalizeKey(finding.finding) === target)
    )
    .map((section) => section.name)
}

function buildFindingValidatorSummary(
  validator: Pick<
    ReportTemplateFindingValidator,
    'finding' | 'operator' | 'query' | 'requiredClassifications'
  >
): string {
  if (validator.operator === 'exists') {
    return `Befund "${validator.finding}" muss vorhanden sein.`
  }
  if (validator.operator === 'missing') {
    return `Befund "${validator.finding}" darf nicht vorhanden sein.`
  }

  const condition = validator.query.condition
  if (!condition) {
    return `Bedingte Prüfung für "${validator.finding}".`
  }

  const clauses = [...condition.any, ...condition.all].map((clause) => {
    const right = Array.isArray(clause.values)
      ? clause.values.map(formatConditionValue).join(', ')
      : clause.value !== undefined
        ? formatConditionValue(clause.value)
        : 'gesetzt'
    return `${clause.classification} ${clause.comparator} ${right}`
  })
  const required = validator.requiredClassifications.length
    ? `Dann erforderlich: ${validator.requiredClassifications.join(', ')}.`
    : ''
  return `Wenn "${validator.finding}" die Bedingung erfüllt (${clauses.join(' oder ')}), ${required}`.trim()
}

function normalizeFindingValidator(
  input: unknown,
  sections: ReportTemplateSection[]
): ReportTemplateFindingValidator | null {
  if (typeof input === 'string') {
    return {
      kind: 'finding',
      name: input,
      finding: input,
      operator: 'exists',
      query: {
        finding: input,
        operator: 'exists',
        params: {},
        condition: null
      },
      summary: `Validator "${input}"`,
      relatedSections: [],
      relatedFindings: [input],
      requiredClassifications: []
    }
  }

  if (!isRecordLike(input)) {
    return null
  }

  const name = asString(input.name)
  const finding =
    asString(input.finding) ||
    asString((input.query as Record<string, unknown> | undefined)?.finding)
  const operator = (asString(input.operator) ||
    asString(
      (input.query as Record<string, unknown> | undefined)?.operator
    )) as FindingsValidatorOperator | null
  if (!name || !finding || !operator) {
    return null
  }

  const query = normalizeQuery(input.query, finding)
  const requiredClassifications =
    query.condition?.thenRequires.map((entry) => entry.classification) || []
  const relatedSections = findRelatedSections(finding, sections)
  const validator: ReportTemplateFindingValidator = {
    kind: 'finding',
    name,
    finding,
    operator,
    query,
    summary: '',
    relatedSections,
    relatedFindings: [finding],
    requiredClassifications
  }
  validator.summary = buildFindingValidatorSummary(validator)
  return validator
}

function buildExaminationValidatorSummary(
  findingValidators: string[],
  examinationValidators: string[]
): string {
  const parts: string[] = []
  if (findingValidators.length) {
    parts.push(`abhängig von ${String(findingValidators.length)} Finding-Validator(en)`)
  }
  if (examinationValidators.length) {
    parts.push(`abhängig von ${String(examinationValidators.length)} Examination-Validator(en)`)
  }
  return parts.length ? parts.join(', ') : 'Keine weiteren Abhängigkeiten.'
}

function normalizeExaminationValidator(
  input: unknown,
  findingValidatorsByName: ReadonlyMap<string, ReportTemplateFindingValidator>
): ReportTemplateExaminationValidator | null {
  if (typeof input === 'string') {
    return {
      kind: 'examination',
      name: input,
      findingValidators: [],
      examinationValidators: [],
      summary: `Validator "${input}"`,
      relatedSections: [],
      relatedFindings: []
    }
  }

  if (!isRecordLike(input)) {
    return null
  }
  const name = asString(input.name)
  if (!name) {
    return null
  }
  const findingValidators = asStringArray(input.findingValidators ?? input.finding_validators)
  const examinationValidators = asStringArray(
    input.examinationValidators ?? input.examination_validators
  )
  const relatedSections = Array.from(
    new Set(
      findingValidators.flatMap(
        (validatorName) => findingValidatorsByName.get(validatorName)?.relatedSections || []
      )
    )
  )
  const relatedFindings = Array.from(
    new Set(
      findingValidators.flatMap(
        (validatorName) => findingValidatorsByName.get(validatorName)?.relatedFindings || []
      )
    )
  )
  return {
    kind: 'examination',
    name,
    findingValidators,
    examinationValidators,
    summary: buildExaminationValidatorSummary(findingValidators, examinationValidators),
    relatedSections,
    relatedFindings
  }
}

function normalizeValidators(
  validators: unknown,
  sections: ReportTemplateSection[]
): ReportTemplateValidators {
  const source = isRecordLike(validators) ? validators : {}
  const rawFindingValidators = Array.isArray(
    source.findingsValidators ?? source.findings_validators
  )
    ? ((source.findingsValidators ?? source.findings_validators) as unknown[])
    : []
  const findingValidators = rawFindingValidators
    .map((entry) => normalizeFindingValidator(entry, sections))
    .filter((entry): entry is ReportTemplateFindingValidator => entry !== null)

  const findingValidatorsByName = new Map<string, ReportTemplateFindingValidator>(
    findingValidators.map((validator) => [validator.name, validator])
  )

  const rawExaminationValidators = Array.isArray(
    source.examinationValidators ?? source.examination_validators
  )
    ? ((source.examinationValidators ?? source.examination_validators) as unknown[])
    : []
  const examinationValidators = rawExaminationValidators
    .map((entry) => normalizeExaminationValidator(entry, findingValidatorsByName))
    .filter((entry): entry is ReportTemplateExaminationValidator => entry !== null)

  return {
    examinationValidators,
    findingsValidators: findingValidators
  }
}

export function normalizeTemplatePayload(payload: unknown): ReportTemplatePayload | null {
  if (!isRecordLike(payload)) {
    return null
  }
  const name = asString(payload.name)
  if (!name) {
    return null
  }
  const reportSections = normalizeSections(payload.reportSections ?? payload.report_sections)
  const hasCoverage =
    Object.prototype.hasOwnProperty.call(payload, 'conceptCoverage') ||
    Object.prototype.hasOwnProperty.call(payload, 'concept_coverage')
  const rawCoverage = payload.conceptCoverage ?? payload.concept_coverage
  const conceptCoverage = hasCoverage ? normalizeReportConceptCoverage(rawCoverage) : null
  let conceptCoverageState: ReportTemplatePayload['conceptCoverageState'] = 'missing'
  if (hasCoverage) {
    conceptCoverageState = conceptCoverage ? 'valid' : 'invalid'
  }
  const verbosityOptions: unknown = payload.verbosityOptions ??
    payload.verbosity_options ?? ['standard']
  if (
    !Array.isArray(verbosityOptions) ||
    !verbosityOptions.every(isReportVerbosity) ||
    !verbosityOptions.includes('standard') ||
    new Set(verbosityOptions).size !== verbosityOptions.length
  ) {
    throw new TypeError('Invalid report template verbosity_options')
  }
  return {
    name,
    verbosityOptions,
    nameDe: asString(payload.nameDe ?? payload.name_de) || undefined,
    nameEn: asString(payload.nameEn ?? payload.name_en) || undefined,
    examination: asString(payload.examination) || '',
    identity: normalizeReportTemplateIdentity(payload),
    reportSections,
    validators: normalizeValidators(payload.validators, reportSections),
    conceptCoverage,
    conceptCoverageState
  }
}

export async function fetchReportTemplateByName(
  moduleName: string,
  moduleVersion: string,
  templateName: string
): Promise<ReportTemplatePayload | null> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}?version=${encodeURIComponent(moduleVersion)}`
  )
  return normalizeTemplatePayload(response.data)
}

export async function fetchReportTemplatePreviewByName(
  moduleName: string,
  moduleVersion: string,
  templateName: string
): Promise<ReportTemplatePayload | null> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/preview?version=${encodeURIComponent(moduleVersion)}`
  )
  return normalizeTemplatePayload(response.data)
}

export async function fetchReportTemplatesByExamination(
  moduleName: string,
  moduleVersion: string,
  examinationName: string
): Promise<ReportTemplatePayload[]> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/by-examination/${encodeURIComponent(moduleName)}/${encodeURIComponent(examinationName)}?version=${encodeURIComponent(moduleVersion)}`
  )
  if (!Array.isArray(response.data)) {
    return []
  }
  return response.data
    .map((entry) => normalizeTemplatePayload(entry))
    .filter((entry): entry is ReportTemplatePayload => entry !== null)
}

export async function fetchBuilderReportTemplatesByExamination(
  moduleName: string,
  moduleVersion: string,
  examinationName: string
): Promise<ReportTemplatePayload[]> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/builder/by-examination/${encodeURIComponent(moduleName)}/${encodeURIComponent(examinationName)}?version=${encodeURIComponent(moduleVersion)}`
  )
  if (!Array.isArray(response.data)) {
    return []
  }
  return response.data
    .map((entry) => normalizeTemplatePayload(entry))
    .filter((entry): entry is ReportTemplatePayload => entry !== null)
}

function normalizeStructureIssue(input: unknown): ReportTemplateStructureIssue | null {
  if (!isRecordLike(input)) {
    return null
  }
  const code = asString(input.code)
  const message = asString(input.message)
  if (!code || !message) {
    return null
  }
  return {
    code,
    message,
    level: asString(input.level) === 'warning' ? 'warning' : 'error',
    nodeId: asString(input.nodeId ?? input.node_id) || null
  }
}

function normalizeGraphNode(input: unknown): ReportTemplateGraphNode | null {
  if (!isRecordLike(input)) {
    return null
  }
  const nodeId = asString(input.nodeId ?? input.node_id)
  const name = asString(input.name)
  const nodeType = asString(input.nodeType ?? input.node_type) as
    ReportTemplateGraphNode['nodeType'] | null
  if (!nodeId || !name || !nodeType) {
    return null
  }
  return {
    nodeId,
    name,
    nodeType,
    tokens: asStringArray(input.tokens)
  }
}

function normalizeGraphEdge(input: unknown): ReportTemplateGraphEdge | null {
  if (!isRecordLike(input)) {
    return null
  }
  const sourceNodeId = asString(input.sourceNodeId ?? input.source_node_id)
  const targetNodeId = asString(input.targetNodeId ?? input.target_node_id)
  const edgeType = asString(input.edgeType ?? input.edge_type) as
    ReportTemplateGraphEdge['edgeType'] | null
  if (!sourceNodeId || !targetNodeId || !edgeType) {
    return null
  }
  return {
    sourceNodeId,
    targetNodeId,
    edgeType,
    weight: asNumber(input.weight) ?? 0
  }
}

function normalizeStructureGraph(input: unknown): ReportTemplateStructureGraph | null {
  if (!isRecordLike(input)) {
    return null
  }
  const templateName = asString(input.templateName ?? input.template_name)
  if (!templateName) {
    return null
  }
  return {
    templateName,
    examination: asString(input.examination) || '',
    startNodeId: asString(input.startNodeId ?? input.start_node_id) || '',
    orderedSectionNodeIds: asStringArray(
      input.orderedSectionNodeIds ?? input.ordered_section_node_ids
    ),
    nodes: Array.isArray(input.nodes)
      ? input.nodes
          .map((entry) => normalizeGraphNode(entry))
          .filter((entry): entry is ReportTemplateGraphNode => entry !== null)
      : [],
    edges: Array.isArray(input.edges)
      ? input.edges
          .map((entry) => normalizeGraphEdge(entry))
          .filter((entry): entry is ReportTemplateGraphEdge => entry !== null)
      : []
  }
}

export function normalizeDefinitionValidationResult(
  payload: unknown
): ReportTemplateDefinitionValidationResult | null {
  if (!isRecordLike(payload)) {
    return null
  }
  const templateName = asString(payload.templateName ?? payload.template_name)
  const graph = normalizeStructureGraph(payload.graph)
  if (!templateName || !graph) {
    return null
  }
  return {
    templateName,
    ok: asBoolean(payload.ok),
    graph,
    issues: Array.isArray(payload.issues)
      ? payload.issues
          .map((entry) => normalizeStructureIssue(entry))
          .filter((entry): entry is ReportTemplateStructureIssue => entry !== null)
      : []
  }
}

export async function validateReportTemplateDefinition(
  moduleName: string,
  moduleVersion: string,
  templateName: string
): Promise<ReportTemplateDefinitionValidationResult> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate-definition?version=${encodeURIComponent(moduleVersion)}`
  )
  const normalized = normalizeDefinitionValidationResult(response.data)
  if (!normalized) {
    throw new Error('Ungueltiges Struktur-Validierungsergebnis.')
  }
  return normalized
}

function normalizeRuntimeIssue(input: unknown): RuntimeValidationIssue | null {
  if (!isRecordLike(input)) {
    return null
  }
  const code = asString(input.code)
  const message = asString(input.message)
  if (!code || !message) {
    return null
  }
  const levelRaw = asString(input.level)
  return {
    code,
    message,
    level: levelRaw === 'warning' ? 'warning' : 'error',
    ...(asString(input.validatorName ?? input.validator_name)
      ? { validatorName: asString(input.validatorName ?? input.validator_name) || undefined }
      : {}),
    ...(asString(input.validatorKind ?? input.validator_kind)
      ? {
          validatorKind: asString(
            input.validatorKind ?? input.validator_kind
          ) as RuntimeValidationIssue['validatorKind']
        }
      : {}),
    ...(isRecordLike(input.details) ? { details: input.details } : {})
  }
}

function normalizeDependencyStatuses(value: unknown): RuntimeValidatorDependencyStatus[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok)
    }))
    .filter((entry) => !!entry.name)
}

function normalizeFindingsValidatorExecutions(value: unknown): FindingsValidatorExecution[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok),
      operator: asString(entry.operator) || '',
      finding: asString(entry.finding) || '',
      matchedOccurrences: asNumber(entry.matchedOccurrences ?? entry.matched_occurrences) ?? 0,
      triggeredOccurrences:
        asNumber(entry.triggeredOccurrences ?? entry.triggered_occurrences) ?? 0,
      missingRequiredClassifications: asStringArray(
        entry.missingRequiredClassifications ?? entry.missing_required_classifications
      ),
      issues: Array.isArray(entry.issues)
        ? entry.issues
            .map((issue) => normalizeRuntimeIssue(issue))
            .filter((issue): issue is RuntimeValidationIssue => issue !== null)
        : []
    }))
    .filter((entry) => !!entry.name)
}

function normalizeExaminationValidatorExecutions(value: unknown): ExaminationValidatorExecution[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok),
      findingValidatorStatus: normalizeDependencyStatuses(
        entry.findingValidatorStatus ?? entry.finding_validator_status
      ),
      examinationValidatorStatus: normalizeDependencyStatuses(
        entry.examinationValidatorStatus ?? entry.examination_validator_status
      ),
      issues: Array.isArray(entry.issues)
        ? entry.issues
            .map((issue) => normalizeRuntimeIssue(issue))
            .filter((issue): issue is RuntimeValidationIssue => issue !== null)
        : []
    }))
    .filter((entry) => !!entry.name)
}

function normalizeValidatorHint(value: unknown): Record<string, unknown> {
  return isRecordLike(value) ? value : {}
}

function normalizePrecedence(value: unknown): 'required' | 'optional' {
  return asString(value) === 'optional' ? 'optional' : 'required'
}

function normalizeClassificationValidatorExecutions(
  value: unknown
): ClassificationValidatorExecution[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok),
      operator: asString(entry.operator) || '',
      finding: asString(entry.finding) || '',
      classification: asString(entry.classification) || '',
      precedence: normalizePrecedence(entry.precedence),
      matchedOccurrences: asNumber(entry.matchedOccurrences ?? entry.matched_occurrences) ?? 0,
      triggeredOccurrences:
        asNumber(entry.triggeredOccurrences ?? entry.triggered_occurrences) ?? 0,
      hint: normalizeValidatorHint(entry.hint),
      issues: Array.isArray(entry.issues)
        ? entry.issues
            .map((issue) => normalizeRuntimeIssue(issue))
            .filter((issue): issue is RuntimeValidationIssue => issue !== null)
        : []
    }))
    .filter((entry) => !!entry.name)
}

function normalizeInterventionValidatorExecutions(
  value: unknown
): InterventionValidatorExecution[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok),
      operator: asString(entry.operator) || '',
      finding: asString(entry.finding) || '',
      intervention: asString(entry.intervention) || '',
      precedence: normalizePrecedence(entry.precedence),
      matchedOccurrences: asNumber(entry.matchedOccurrences ?? entry.matched_occurrences) ?? 0,
      triggeredOccurrences:
        asNumber(entry.triggeredOccurrences ?? entry.triggered_occurrences) ?? 0,
      hint: normalizeValidatorHint(entry.hint),
      issues: Array.isArray(entry.issues)
        ? entry.issues
            .map((issue) => normalizeRuntimeIssue(issue))
            .filter((issue): issue is RuntimeValidationIssue => issue !== null)
        : []
    }))
    .filter((entry) => !!entry.name)
}

function normalizeUnitValidatorExecutions(value: unknown): UnitValidatorExecution[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok),
      operator: asString(entry.operator) || '',
      finding: asString(entry.finding) || '',
      classification: asString(entry.classification) || '',
      unit: asString(entry.unit) || '',
      precedence: normalizePrecedence(entry.precedence),
      matchedOccurrences: asNumber(entry.matchedOccurrences ?? entry.matched_occurrences) ?? 0,
      triggeredOccurrences:
        asNumber(entry.triggeredOccurrences ?? entry.triggered_occurrences) ?? 0,
      hint: normalizeValidatorHint(entry.hint),
      issues: Array.isArray(entry.issues)
        ? entry.issues
            .map((issue) => normalizeRuntimeIssue(issue))
            .filter((issue): issue is RuntimeValidationIssue => issue !== null)
        : []
    }))
    .filter((entry) => !!entry.name)
}

export function normalizeRuntimeValidationResult(
  payload: unknown
): ReportTemplateRuntimeValidationResult | null {
  if (!isRecordLike(payload)) {
    return null
  }
  const templateName = asString(payload.templateName ?? payload.template_name)
  if (!templateName) {
    return null
  }
  return {
    templateName,
    ok: asBoolean(payload.ok),
    evaluatedFindingsCount:
      asNumber(payload.evaluatedFindingsCount ?? payload.evaluated_findings_count) ?? 0,
    classificationValidators: normalizeClassificationValidatorExecutions(
      payload.classificationValidators ?? payload.classification_validators
    ),
    interventionValidators: normalizeInterventionValidatorExecutions(
      payload.interventionValidators ?? payload.intervention_validators
    ),
    findingsValidators: normalizeFindingsValidatorExecutions(
      payload.findingsValidators ?? payload.findings_validators
    ),
    examinationValidators: normalizeExaminationValidatorExecutions(
      payload.examinationValidators ?? payload.examination_validators
    ),
    unitValidators: normalizeUnitValidatorExecutions(
      payload.unitValidators ?? payload.unit_validators
    ),
    issues: Array.isArray(payload.issues)
      ? payload.issues
          .map((issue) => normalizeRuntimeIssue(issue))
          .filter((issue): issue is RuntimeValidationIssue => issue !== null)
      : []
  }
}

export async function validateReportTemplateRuntime(
  moduleName: string,
  moduleVersion: string,
  templateName: string,
  payload: ReportTemplateRuntimePayload
): Promise<ReportTemplateRuntimeValidationResult> {
  if (payload.knowledgeBaseVersion !== moduleVersion) {
    throw new Error('Die Runtime-Nutzlast gehört nicht zur angeforderten Terminologieversion.')
  }
  const response = await axiosInstance.post(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate?version=${encodeURIComponent(moduleVersion)}`,
    serializeRuntimePayload(payload)
  )
  const normalized = normalizeRuntimeValidationResult(response.data)
  if (!normalized) {
    throw new Error('Ungültiges Runtime-Validierungsergebnis.')
  }
  return normalized
}

export async function validateReportTemplateRuntimeFromLedger(
  moduleName: string,
  moduleVersion: string,
  templateName: string,
  patientExaminationId: number
): Promise<ReportTemplateRuntimeValidationResult> {
  const response = await axiosInstance.post(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate-from-ledger/${encodeURIComponent(String(patientExaminationId))}?version=${encodeURIComponent(moduleVersion)}`
  )
  const normalized = normalizeRuntimeValidationResult(response.data)
  if (!normalized) {
    throw new Error('Ungültiges Runtime-Validierungsergebnis.')
  }
  return normalized
}

function findClassificationDefinition(
  findingClassifications: readonly FindingClassification[],
  classificationId: number
): FindingClassification | null {
  return findingClassifications.find((entry) => entry.id === classificationId) || null
}

function findChoiceName(
  findingClassifications: readonly FindingClassification[],
  classificationId: number,
  choiceId: number
): string | null {
  const classification = findClassificationDefinition(findingClassifications, classificationId)
  const choice = classification?.choices.find((entry) => entry.id === choiceId) || null
  return choice?.name || null
}

function extractNumericalValue(
  classificationName: string | null,
  numericalDescriptors: JsonMap
): unknown {
  if (!classificationName) {
    const firstValue = Object.values(numericalDescriptors).find(
      (value) => typeof value === 'number' || typeof value === 'string'
    )
    return firstValue
  }

  const directMatch = numericalDescriptors[classificationName]
  if (directMatch !== undefined) {
    return directMatch
  }

  const preferredEntry = Object.entries(numericalDescriptors).find(
    ([key]) => normalizeKey(key) === normalizeKey(classificationName)
  )
  if (preferredEntry) {
    return preferredEntry[1]
  }

  return Object.values(numericalDescriptors).find(
    (value) => typeof value === 'number' || typeof value === 'string'
  )
}

function descriptorFromEntry(
  entry: [string, unknown]
): ReportTemplateRuntimeDescriptorInput | null {
  const [classificationChoiceDescriptor, descriptorValue] = entry
  if (!classificationChoiceDescriptor.trim()) {
    return null
  }
  return {
    classificationChoiceDescriptor,
    descriptorValue
  }
}

function serializeRuntimeDescriptors(
  descriptors: ReportTemplateRuntimeDescriptorInput[],
  choiceKey: string
) {
  return descriptors.map((descriptor, descriptorIndex) => ({
    descriptor_value: descriptor.descriptorValue,
    classification_choice_descriptor: descriptor.classificationChoiceDescriptor,
    patient_finding_classification_choice: `${choiceKey}_descriptor_parent`,
    uuid: descriptor.localId || `${choiceKey}_descriptor_${String(descriptorIndex + 1)}`
  }))
}

function serializeRuntimeClassificationChoices(
  classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[],
  classificationsKey: string
) {
  return classificationChoices.map((classificationChoice, choiceIndex) => {
    const choiceKey =
      classificationChoice.localId || `${classificationsKey}_choice_${String(choiceIndex + 1)}`
    return {
      classification: classificationChoice.classification,
      classification_choice: classificationChoice.classificationChoice,
      patient_finding_classifications: classificationsKey,
      patient_finding_classification_choice_descriptors: serializeRuntimeDescriptors(
        classificationChoice.descriptors,
        choiceKey
      ),
      uuid: choiceKey
    }
  })
}

function serializeRuntimePatientFindings(
  patientFindings: ReportTemplateRuntimePatientFindingInput[]
) {
  const patientExaminationKey = 'frontend_runtime_exam'
  return patientFindings.map((patientFinding, findingIndex) => {
    const findingKey =
      patientFinding.localId || `${patientExaminationKey}_finding_${String(findingIndex + 1)}`
    const classificationsKey = `${findingKey}_classifications_1`
    return {
      finding: patientFinding.finding,
      patient_examination: patientExaminationKey,
      patient_finding_classifications: [
        {
          patient_finding: findingKey,
          patient_finding_classification_choices: serializeRuntimeClassificationChoices(
            patientFinding.classificationChoices,
            classificationsKey
          ),
          uuid: classificationsKey
        }
      ],
      patient_finding_interventions: [],
      uuid: findingKey
    }
  })
}

function serializeRuntimePayload(payload: ReportTemplateRuntimePayload) {
  return {
    patient: payload.patient,
    examiners: payload.examiners,
    ...(payload.date ? { date: payload.date } : {}),
    examination: payload.examination,
    ...(payload.knowledgeBaseModule ? { knowledge_base_module: payload.knowledgeBaseModule } : {}),
    ...(payload.knowledgeBaseVersion
      ? { knowledge_base_version: payload.knowledgeBaseVersion }
      : {}),
    patient_findings: serializeRuntimePatientFindings(payload.patientFindings)
  }
}

async function buildRuntimeValidationFindings(
  patientExaminationId: number,
  getFindingById?: (findingId: number) => Finding | undefined
): Promise<ReportTemplateRuntimePatientFindingInput[]> {
  const rows = await findingsApi.listPatientFindings(patientExaminationId)
  const findingClassificationsCache = new Map<number, readonly FindingClassification[]>()

  const getFindingDefinitions = async (
    findingId: number
  ): Promise<readonly FindingClassification[]> => {
    const cached = findingClassificationsCache.get(findingId)
    if (cached) {
      return cached
    }
    const loaded = await findingsApi.getFindingClassifications(findingId)
    findingClassificationsCache.set(findingId, loaded)
    return loaded
  }

  const findingsPayload: ReportTemplateRuntimePatientFindingInput[] = []

  for (const patientFinding of rows) {
    if (!patientFinding.isActive) {
      continue
    }
    const findingId = extractFindingId(patientFinding.finding)
    if (findingId == null) {
      continue
    }

    const finding = getFindingById?.(findingId) || null
    if (!finding?.name) {
      continue
    }

    const findingDefinitions = await getFindingDefinitions(findingId)
    const classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[] =
      patientFinding.classifications
        .filter((classification) => classification.isActive)
        .map((classification) => {
          const classificationName =
            classification.classificationName ||
            findClassificationDefinition(findingDefinitions, classification.classification)?.name ||
            null
          if (!classificationName) {
            return null
          }

          const derivedValue = extractNumericalValue(
            classificationName,
            classification.numericalDescriptors
          )
          const descriptors = Object.entries(classification.numericalDescriptors)
            .map((entry) => descriptorFromEntry(entry))
            .filter((entry): entry is ReportTemplateRuntimeDescriptorInput => entry !== null)
          const choiceName =
            classification.classificationChoiceName ||
            findChoiceName(
              findingDefinitions,
              classification.classification,
              classification.classificationChoice
            ) ||
            null

          return {
            classification: classificationName,
            classificationChoice: choiceName || classificationName,
            descriptors:
              descriptors.length > 0
                ? descriptors
                : derivedValue !== undefined && !Array.isArray(derivedValue)
                  ? [
                      {
                        classificationChoiceDescriptor: `${normalizeKey(classificationName)}_descriptor`,
                        descriptorValue: derivedValue
                      }
                    ]
                  : []
          }
        })
        .filter(
          (classification): classification is ReportTemplateRuntimeClassificationChoiceInput =>
            classification !== null
        )

    findingsPayload.push({
      finding: finding.name,
      classificationChoices
    })
  }

  return findingsPayload
}

export async function validatePatientFindingsAgainstTemplate(params: {
  moduleName: string
  moduleVersion: string
  templateName: string
  patientExaminationId: number
  getFindingById?: (findingId: number) => Finding | undefined
}): Promise<ReportTemplateRuntimeValidationResult> {
  return validateReportTemplateRuntimeFromLedger(
    params.moduleName,
    params.moduleVersion,
    params.templateName,
    params.patientExaminationId
  )
}

export async function buildReportTemplateRuntimePayload(params: {
  moduleName: string
  patientExaminationId: number
  examination: string
  patient?: string
  examiners?: string[]
  knowledgeBaseVersion?: string | null
  getFindingById?: (findingId: number) => Finding | undefined
}): Promise<ReportTemplateRuntimePayload> {
  const patientFindings = await buildRuntimeValidationFindings(
    params.patientExaminationId,
    params.getFindingById
  )

  return {
    patient: params.patient?.trim() || `patient_examination_${String(params.patientExaminationId)}`,
    examiners: Array.isArray(params.examiners) ? params.examiners.filter(Boolean) : [],
    examination: params.examination,
    knowledgeBaseModule: params.moduleName,
    knowledgeBaseVersion: params.knowledgeBaseVersion || null,
    patientFindings
  }
}

export function getReportTemplateSectionDisplayName(
  section: Pick<ReportTemplateSection, 'name' | 'titleDe' | 'titleEn'>,
  language: 'de' | 'en'
): string {
  return (language === 'de' ? section.titleDe : section.titleEn) || section.name
}

export function describeReportTemplateTitle(templateName: string): string {
  return titleFromSectionName(templateName)
}

export function getReportTemplateDisplayName(
  template: Pick<ReportTemplatePayload, 'name' | 'nameDe' | 'nameEn'>,
  language: 'de' | 'en'
): string {
  return (
    (language === 'de' ? template.nameDe : template.nameEn) ||
    describeReportTemplateTitle(template.name)
  )
}
