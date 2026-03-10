import axiosInstance from '@/api/axiosInstance'
import { extractFindingId, type Finding, type FindingClassification, type JsonMap } from '@/api/findings.contract'
import { findingsApi } from '@/api/findingsApi'
import type {
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
  ReportTemplateRuntimeValidationFindingInput,
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSection,
  ReportTemplateValidators,
  RuntimeValidationIssue,
  RuntimeValidatorDependencyStatus
} from '@/types/reportTemplate'

const REPORT_TEMPLATE_BASE = '/base_api/report-templates'

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
    findingsValidators: normalizeFindingsValidatorExecutions(
      payload.findingsValidators ?? payload.findings_validators
    ),
    examinationValidators: normalizeExaminationValidatorExecutions(
      payload.examinationValidators ?? payload.examination_validators
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
  findings: ReportTemplateRuntimeValidationFindingInput[]
): Promise<ReportTemplateRuntimeValidationResult> {
  const response = await axiosInstance.post(
    `${REPORT_TEMPLATE_BASE}/${encodeURIComponent(moduleName)}/${encodeURIComponent(templateName)}/validate`,
    { findings }
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

async function buildRuntimeValidationFindings(
  patientExaminationId: number,
  getFindingById?: (findingId: number) => Finding | undefined
): Promise<ReportTemplateRuntimeValidationFindingInput[]> {
  const rows = await findingsApi.listPatientFindings(patientExaminationId)
  const findingClassificationsCache = new Map<number, readonly FindingClassification[]>()

  const getFindingDefinitions = async (findingId: number): Promise<readonly FindingClassification[]> => {
    const cached = findingClassificationsCache.get(findingId)
    if (cached) return cached
    const loaded = await findingsApi.getFindingClassifications(findingId)
    findingClassificationsCache.set(findingId, loaded)
    return loaded
  }

  const findingsPayload: ReportTemplateRuntimeValidationFindingInput[] = []

  for (const row of rows) {
    if (row.isActive === false) continue
    const findingId = extractFindingId(row.finding)
    if (findingId == null) continue

    const finding = getFindingById?.(findingId) || null
    if (!finding?.name) continue

    const findingDefinitions = await getFindingDefinitions(findingId)
    const classifications: ReportTemplateRuntimeValidationClassificationInput[] = row.classifications
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
          ...(Array.isArray(derivedValue) ? { values: derivedValue } : {}),
          ...(!Array.isArray(derivedValue) && derivedValue !== undefined ? { value: derivedValue } : {}),
          ...(choiceName ? { classificationChoice: choiceName } : {})
        }
      })
      .filter(
        (
          classification
        ): classification is ReportTemplateRuntimeValidationClassificationInput =>
          classification !== null
      )

    findingsPayload.push({
      finding: finding.name,
      classifications
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
  const findings = await buildRuntimeValidationFindings(
    params.patientExaminationId,
    params.getFindingById
  )
  return validateReportTemplateRuntime(params.moduleName, params.templateName, findings)
}

export function describeSectionTitle(sectionName: string): string {
  return titleFromSectionName(sectionName)
}
