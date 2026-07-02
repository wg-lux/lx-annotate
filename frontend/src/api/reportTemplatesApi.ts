import axiosInstance, { dtypesApi } from '@/api/axiosInstance'
import { extractFindingId, type Finding, type FindingClassification, type JsonMap } from '@/api/findings.contract'
import { findingsApi } from '@/api/findingsApi'
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
  ReportTemplateRuntimeValidationClassificationInput,
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimePayload,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimeValidationFindingInput,
  ReportTemplateRuntimeValidationResult,
  ClassificationValidatorExecution,
  ReportTemplateGraphEdge,
  ReportTemplateGraphNode,
  ReportTemplateStructureGraph,
  ReportTemplateStructureIssue,
  ReportTemplateSection,
  ReportTemplateValidators,
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
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asString(entry))
    .filter((entry): entry is string => entry !== null)
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

function normalizeClassifications(
  classifications: unknown
): Array<{ classification: string; required: boolean }> {
  if (!Array.isArray(classifications)) return []
  return classifications
    .filter((classification): classification is Record<string, unknown> => isRecordLike(classification))
    .map((classification) => ({
      classification: asString(classification.classification) || '',
      required: asBoolean(classification.required)
    }))
    .filter((classification) => !!classification.classification)
}

function normalizeFindings(findings: unknown): ReportTemplateFinding[] {
  if (!Array.isArray(findings)) return []
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
  if (!isRecordLike(entry)) return null
  const finding = asString(entry.finding)
  if (!finding) return null
  return {
    finding,
    required: asBoolean(entry.required),
    multipleAllowed: asBoolean(entry.multipleAllowed ?? entry.multiple_allowed),
    classifications: normalizeClassifications(entry.classifications)
  }
}

function normalizeSections(sections: unknown): ReportTemplateSection[] {
  if (!Array.isArray(sections)) return []
  return sections
    .filter((section): section is Record<string, unknown> => isRecordLike(section))
    .map((section) => ({
      name: asString(section.name) || '',
      position: asNumber(section.position) ?? 0,
      types: asStringArray(section.types),
      findings: normalizeFindings(section.findings)
    }))
    .filter((section) => !!section.name)
    .sort((a, b) => a.position - b.position)
}

function normalizeConditionClause(
  input: Record<string, unknown>
): FindingsValidatorConditionClause | null {
  const classification = asString(input.classification)
  const comparator = asString(input.comparator) as FindingsValidatorComparator | null
  if (!classification || !comparator) return null
  return {
    classification,
    comparator,
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(Array.isArray(input.values) ? { values: input.values } : {})
  }
}

function normalizeCondition(input: unknown): FindingsValidatorCondition | null {
  if (!isRecordLike(input)) return null
  const rawThenRequires = Array.isArray(input.thenRequires ?? input.then_requires)
    ? ((input.thenRequires ?? input.then_requires) as unknown[])
    : []
  const any = Array.isArray(input.any)
    ? input.any
        .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
        .map(normalizeConditionClause)
        .filter((entry): entry is FindingsValidatorConditionClause => entry !== null)
    : []
  const all = Array.isArray(input.all)
    ? input.all
        .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
        .map(normalizeConditionClause)
        .filter((entry): entry is FindingsValidatorConditionClause => entry !== null)
    : []
  const thenRequires = rawThenRequires
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({ classification: asString(entry.classification) || '' }))
    .filter((entry): entry is { classification: string } => !!entry.classification)

  if (!any.length && !all.length && !thenRequires.length) return null
  return { any, all, thenRequires }
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
  if (!findingName) return []
  const target = normalizeKey(findingName)
  return sections
    .filter((section) =>
      section.findings.some((finding) => normalizeKey(finding.finding) === target)
    )
    .map((section) => section.name)
}

function buildFindingValidatorSummary(
  validator: Pick<ReportTemplateFindingValidator, 'finding' | 'operator' | 'query' | 'requiredClassifications'>
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
      ? clause.values.join(', ')
      : clause.value !== undefined
        ? String(clause.value)
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

  if (!isRecordLike(input)) return null

  const name = asString(input.name)
  const finding = asString(input.finding) || asString((input.query as Record<string, unknown> | undefined)?.finding)
  const operator = (asString(input.operator) || asString((input.query as Record<string, unknown> | undefined)?.operator)) as FindingsValidatorOperator | null
  if (!name || !finding || !operator) return null

  const query = normalizeQuery(input.query, finding)
  const requiredClassifications = query.condition?.thenRequires.map((entry) => entry.classification) || []
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
    parts.push(`abhängig von ${findingValidators.length} Finding-Validator(en)`)
  }
  if (examinationValidators.length) {
    parts.push(`abhängig von ${examinationValidators.length} Examination-Validator(en)`)
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

  if (!isRecordLike(input)) return null
  const name = asString(input.name)
  if (!name) return null
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
  const rawFindingValidators = Array.isArray(source.findingsValidators ?? source.findings_validators)
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
  if (!isRecordLike(payload)) return null
  const name = asString(payload.name)
  if (!name) return null
  const reportSections = normalizeSections(payload.reportSections ?? payload.report_sections)
  return {
    name,
    examination: asString(payload.examination) || '',
    reportSections,
    validators: normalizeValidators(payload.validators, reportSections)
  }
}

export async function fetchReportTemplateByName(
  moduleName: string,
  templateName: string
): Promise<ReportTemplatePayload | null> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}`
  )
  return normalizeTemplatePayload(response.data)
}

export async function fetchReportTemplatesByExamination(
  moduleName: string,
  examinationName: string
): Promise<ReportTemplatePayload[]> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/by-examination/${encodeURIComponent(moduleName)}/${encodeURIComponent(examinationName)}`
  )
  if (!Array.isArray(response.data)) return []
  return response.data
    .map((entry) => normalizeTemplatePayload(entry))
    .filter((entry): entry is ReportTemplatePayload => entry !== null)
}

function normalizeStructureIssue(input: unknown): ReportTemplateStructureIssue | null {
  if (!isRecordLike(input)) return null
  const code = asString(input.code)
  const message = asString(input.message)
  if (!code || !message) return null
  return {
    code,
    message,
    level: asString(input.level) === 'warning' ? 'warning' : 'error',
    nodeId: asString(input.nodeId ?? input.node_id) || null
  }
}

function normalizeGraphNode(input: unknown): ReportTemplateGraphNode | null {
  if (!isRecordLike(input)) return null
  const nodeId = asString(input.nodeId ?? input.node_id)
  const name = asString(input.name)
  const nodeType = asString(input.nodeType ?? input.node_type) as ReportTemplateGraphNode['nodeType'] | null
  if (!nodeId || !name || !nodeType) return null
  return {
    nodeId,
    name,
    nodeType,
    tokens: asStringArray(input.tokens)
  }
}

function normalizeGraphEdge(input: unknown): ReportTemplateGraphEdge | null {
  if (!isRecordLike(input)) return null
  const sourceNodeId = asString(input.sourceNodeId ?? input.source_node_id)
  const targetNodeId = asString(input.targetNodeId ?? input.target_node_id)
  const edgeType = asString(input.edgeType ?? input.edge_type) as ReportTemplateGraphEdge['edgeType'] | null
  if (!sourceNodeId || !targetNodeId || !edgeType) return null
  return {
    sourceNodeId,
    targetNodeId,
    edgeType,
    weight: asNumber(input.weight) ?? 0
  }
}

function normalizeStructureGraph(input: unknown): ReportTemplateStructureGraph | null {
  if (!isRecordLike(input)) return null
  const templateName = asString(input.templateName ?? input.template_name)
  if (!templateName) return null
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
  if (!isRecordLike(payload)) return null
  const templateName = asString(payload.templateName ?? payload.template_name)
  const graph = normalizeStructureGraph(payload.graph)
  if (!templateName || !graph) return null
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
  templateName: string
): Promise<ReportTemplateDefinitionValidationResult> {
  const response = await axiosInstance.get(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate-definition`
  )
  const normalized = normalizeDefinitionValidationResult(response.data)
  if (!normalized) {
    throw new Error('Ungueltiges Struktur-Validierungsergebnis.')
  }
  return normalized
}

function normalizeRuntimeIssue(input: unknown): RuntimeValidationIssue | null {
  if (!isRecordLike(input)) return null
  const code = asString(input.code)
  const message = asString(input.message)
  if (!code || !message) return null
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
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is Record<string, unknown> => isRecordLike(entry))
    .map((entry) => ({
      name: asString(entry.name) || '',
      ok: asBoolean(entry.ok)
    }))
    .filter((entry) => !!entry.name)
}

function normalizeFindingsValidatorExecutions(value: unknown): FindingsValidatorExecution[] {
  if (!Array.isArray(value)) return []
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
  if (!Array.isArray(value)) return []
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
  if (!Array.isArray(value)) return []
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
  if (!Array.isArray(value)) return []
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
  if (!Array.isArray(value)) return []
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
  if (!isRecordLike(payload)) return null
  const templateName = asString(payload.templateName ?? payload.template_name)
  if (!templateName) return null
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
  templateName: string,
  payload: ReportTemplateRuntimePayload
): Promise<ReportTemplateRuntimeValidationResult> {
  const response = await axiosInstance.post(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate`,
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
  templateName: string,
  patientExaminationId: number
): Promise<ReportTemplateRuntimeValidationResult> {
  const response = await axiosInstance.post(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate-from-ledger/${encodeURIComponent(String(patientExaminationId))}`
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
  if (directMatch !== undefined) return directMatch

  const preferredEntry = Object.entries(numericalDescriptors).find(([key]) =>
    normalizeKey(key) === normalizeKey(classificationName)
  )
  if (preferredEntry) return preferredEntry[1]

  return Object.values(numericalDescriptors).find(
    (value) => typeof value === 'number' || typeof value === 'string'
  )
}

function descriptorFromEntry(
  entry: [string, unknown]
): ReportTemplateRuntimeDescriptorInput | null {
  const [classificationChoiceDescriptor, descriptorValue] = entry
  if (!classificationChoiceDescriptor.trim()) return null
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
    uuid: descriptor.localId || `${choiceKey}_descriptor_${descriptorIndex + 1}`
  }))
}

function serializeRuntimeClassificationChoices(
  classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[],
  classificationsKey: string
) {
  return classificationChoices.map((classificationChoice, choiceIndex) => {
    const choiceKey = classificationChoice.localId || `${classificationsKey}_choice_${choiceIndex + 1}`
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
    const findingKey = patientFinding.localId || `${patientExaminationKey}_finding_${findingIndex + 1}`
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

  const getFindingDefinitions = async (findingId: number): Promise<readonly FindingClassification[]> => {
    const cached = findingClassificationsCache.get(findingId)
    if (cached) return cached
    const loaded = await findingsApi.getFindingClassifications(findingId)
    findingClassificationsCache.set(findingId, loaded)
    return loaded
  }

  const findingsPayload: ReportTemplateRuntimePatientFindingInput[] = []

  for (const row of rows) {
    if (row.isActive === false) continue
    const findingId = extractFindingId(row.finding)
    if (findingId == null) continue

    const finding = getFindingById?.(findingId) || null
    if (!finding?.name) continue

    const findingDefinitions = await getFindingDefinitions(findingId)
    const classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[] = row.classifications
      .filter((classification) => classification.isActive !== false)
      .map((classification) => {
        const classificationName =
          classification.classificationName ||
          findClassificationDefinition(findingDefinitions, classification.classification)?.name ||
          null
        if (!classificationName) return null

        const derivedValue = extractNumericalValue(
          classificationName,
          classification.numericalDescriptors
        )
        const descriptors = Object.entries(classification.numericalDescriptors || {})
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
        (
          classification
        ): classification is ReportTemplateRuntimeClassificationChoiceInput =>
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
  templateName: string
  patientExaminationId: number
  getFindingById?: (findingId: number) => Finding | undefined
}): Promise<ReportTemplateRuntimeValidationResult> {
  try {
    return await validateReportTemplateRuntimeFromLedger(
      params.moduleName,
      params.templateName,
      params.patientExaminationId
    )
  } catch (error: any) {
    const status = Number(error?.response?.status || 0)
    const detail = String(error?.response?.data?.detail || '')
      .trim()
      .toLowerCase()
    const isGenericNotFound = status === 404 && (!detail || detail === 'not found' || detail === 'not found.')
    const fallbackAllowed = isGenericNotFound || status === 405 || status === 501 || status >= 500
    if (!fallbackAllowed) {
      throw error
    }
  }

  const template = await fetchReportTemplateByName(params.moduleName, params.templateName)
  const patientFindings = await buildRuntimeValidationFindings(
    params.patientExaminationId,
    params.getFindingById
  )
  return validateReportTemplateRuntime(params.moduleName, params.templateName, {
    patient: `patient_examination_${params.patientExaminationId}`,
    examiners: [],
    examination: template?.examination || '',
    knowledgeBaseModule: params.moduleName,
    patientFindings
  })
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
    patient:
      params.patient?.trim() || `patient_examination_${params.patientExaminationId}`,
    examiners: Array.isArray(params.examiners) ? params.examiners.filter(Boolean) : [],
    examination: params.examination,
    knowledgeBaseModule: params.moduleName,
    knowledgeBaseVersion: params.knowledgeBaseVersion || null,
    patientFindings
  }
}

export function describeSectionTitle(sectionName: string): string {
  return titleFromSectionName(sectionName)
}
