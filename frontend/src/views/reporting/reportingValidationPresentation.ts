import type {
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSection,
  RuntimeValidationIssue
} from '@/types/reportTemplate'
import { normalizeKnowledgeKey, type FindingStatus } from './reportingShellPresentation'

export type FindingStatusFilter =
  'open' | 'missing' | 'warning' | 'all' | 'complete' | 'required' | 'optional'

type SearchableFinding = {
  status: FindingStatus
  required: boolean
  label: string
  findingName: string
  sectionTitle: string
}

const statusFilters: Record<FindingStatusFilter, (finding: SearchableFinding) => boolean> = {
  all: () => true,
  open: (finding) => finding.status === 'warning' || finding.status === 'missing',
  missing: (finding) => finding.status === 'missing',
  warning: (finding) => finding.status === 'warning',
  complete: (finding) => finding.status === 'complete',
  required: (finding) => finding.required,
  optional: (finding) => !finding.required
}

export function filterFindingStatuses<Finding extends SearchableFinding>(
  findings: Finding[],
  status: FindingStatusFilter,
  search: string
): Finding[] {
  const query = normalizeKnowledgeKey(search)
  return findings.filter(
    (finding) =>
      statusFilters[status](finding) &&
      [finding.label, finding.findingName, finding.sectionTitle].some((value) =>
        normalizeKnowledgeKey(value).includes(query)
      )
  )
}

type FindingValidator = {
  finding: string
  ok: boolean
  issues: RuntimeValidationIssue[]
}

function addValidatorMessages<Validator extends FindingValidator>(
  grouped: Map<string, Set<string>>,
  validators: Validator[],
  describeOpen: (validator: Validator) => string
): void {
  for (const validator of validators) {
    const key = normalizeKnowledgeKey(validator.finding)
    const messages = grouped.get(key) ?? new Set<string>()
    const issueMessages = validator.issues.map((issue) => issue.message)
    if (!validator.ok && !issueMessages.length) {
      issueMessages.push(describeOpen(validator))
    }
    for (const message of issueMessages.filter(Boolean)) {
      messages.add(message)
    }
    grouped.set(key, messages)
  }
}

export function groupValidationMessages(
  validation: ReportTemplateRuntimeValidationResult | null
): Map<string, string[]> {
  const grouped = new Map<string, Set<string>>()
  addValidatorMessages(
    grouped,
    validation?.findingsValidators ?? [],
    (validator) => `Regel "${validator.name}" ist offen.`
  )
  addValidatorMessages(
    grouped,
    validation?.classificationValidators ?? [],
    (validator) => `Klassifikation "${validator.classification}" prüfen.`
  )
  addValidatorMessages(
    grouped,
    validation?.interventionValidators ?? [],
    (validator) => `Intervention "${validator.intervention}" prüfen.`
  )
  addValidatorMessages(
    grouped,
    validation?.unitValidators ?? [],
    (validator) => `Einheit "${validator.unit}" prüfen.`
  )
  return new Map(Array.from(grouped, ([key, messages]) => [key, Array.from(messages)]))
}

export function descriptorLabelsForSections(
  sections: ReportTemplateSection[]
): Map<string, string> {
  const descriptors = sections
    .flatMap((section) => section.findings)
    .flatMap((finding) => finding.classifications)
    .flatMap((classification) => classification.input?.choices ?? [])
    .flatMap((choice) => choice.descriptors)
  return new Map(
    descriptors.flatMap((descriptor) =>
      descriptor.nameDe ? [[normalizeKnowledgeKey(descriptor.name), descriptor.nameDe]] : []
    )
  )
}
