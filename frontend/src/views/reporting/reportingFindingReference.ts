import { uniqBy } from 'lodash-es'
import {
  getFindingCatalogLocalizedName,
  mergeFindingClassifications,
  type Finding
} from '@/api/findings.contract'
import type {
  ReportTemplateClassification,
  ReportTemplateFinding,
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimePatientFindingInput
} from '@/types/reportTemplate'
import { formatKnowledgeName, normalizeKnowledgeKey } from './reportingShellPresentation'

export function indexFindingInstances(
  instances: ReportTemplateRuntimePatientFindingInput[]
): Map<string, ReportTemplateRuntimePatientFindingInput[]> {
  const grouped = new Map<string, ReportTemplateRuntimePatientFindingInput[]>()
  for (const instance of instances) {
    const key = normalizeKnowledgeKey(instance.finding)
    const group = grouped.get(key) ?? []
    group.push(instance)
    grouped.set(key, group)
  }
  return grouped
}

function hasDescriptorValue(value: unknown): boolean {
  return (
    value !== null && value !== undefined && (typeof value !== 'string' || Boolean(value.trim()))
  )
}

function satisfiesClassification(
  classification: ReportTemplateClassification,
  choice: ReportTemplateRuntimeClassificationChoiceInput
): boolean {
  if (typeof choice.classificationChoice !== 'string' || !choice.classificationChoice.trim()) {
    return false
  }
  const inputChoice = classification.input?.choices.find(
    (entry) =>
      normalizeKnowledgeKey(entry.name) === normalizeKnowledgeKey(choice.classificationChoice)
  )
  return (inputChoice?.descriptors ?? []).every((input) => {
    const descriptor = choice.descriptors.find(
      (entry) =>
        normalizeKnowledgeKey(entry.classificationChoiceDescriptor) ===
        normalizeKnowledgeKey(input.name)
    )
    return hasDescriptorValue(descriptor?.descriptorValue)
  })
}

/** Advisory completeness: each required classification needs one complete occurrence. */
export function missingRequiredClassifications(
  templateFinding: ReportTemplateFinding | null,
  instances: ReportTemplateRuntimePatientFindingInput[]
): string[] {
  const choicesByClassification = new Map<
    string,
    ReportTemplateRuntimeClassificationChoiceInput[]
  >()
  for (const choice of instances.flatMap((instance) => instance.classificationChoices)) {
    const key = normalizeKnowledgeKey(choice.classification)
    const choices = choicesByClassification.get(key) ?? []
    choices.push(choice)
    choicesByClassification.set(key, choices)
  }
  return (templateFinding?.classifications ?? [])
    .filter((classification) => classification.required)
    .filter((classification) => {
      const choices =
        choicesByClassification.get(normalizeKnowledgeKey(classification.classification)) ?? []
      return !choices.some((choice) => satisfiesClassification(classification, choice))
    })
    .map((classification) => classification.classification)
}

export type KbClassificationReference = {
  key: string
  label: string
  required: boolean
  choicesLabel: string
  inputLabel: string
  description: string
}

function descriptorInputLabel(
  input: ReportTemplateClassification['input'],
  descriptorLabels: ReadonlyMap<string, string>
): string {
  const labels = (input?.choices ?? [])
    .flatMap((choice) => choice.descriptors)
    .map((descriptor) => {
      const unit = descriptor.unitAbbreviation || descriptor.unit
      const label =
        descriptorLabels.get(normalizeKnowledgeKey(descriptor.name)) ||
        formatKnowledgeName(descriptor.name)
      return unit ? `${label} (${unit})` : label
    })
  return labels.length ? `Erforderliche Eingabe: ${Array.from(new Set(labels)).join(', ')}` : ''
}

export function classificationReferences(
  templateFinding: ReportTemplateFinding | null,
  catalogFinding: Finding | null,
  descriptorLabels: ReadonlyMap<string, string>
): KbClassificationReference[] {
  const catalog = mergeFindingClassifications(catalogFinding)
  const catalogByName = new Map(catalog.map((entry) => [normalizeKnowledgeKey(entry.name), entry]))
  const source: ReportTemplateClassification[] = templateFinding?.classifications.length
    ? templateFinding.classifications
    : catalog.map((entry) => ({ classification: entry.name, required: entry.required }))
  return uniqBy(source, (entry) => normalizeKnowledgeKey(entry.classification)).map((entry) => {
    const key = normalizeKnowledgeKey(entry.classification)
    const definition = catalogByName.get(key)
    const choices = (definition?.choices ?? [])
      .map((choice) => getFindingCatalogLocalizedName(choice, 'de'))
      .filter(Boolean)
    return {
      key,
      label: definition
        ? getFindingCatalogLocalizedName(definition, 'de')
        : formatKnowledgeName(entry.classification),
      required: entry.required,
      choicesLabel: choices.length ? `Werte: ${choices.join(', ')}` : '',
      inputLabel: descriptorInputLabel(entry.input, descriptorLabels),
      description: definition?.description || ''
    }
  })
}

export function groupFindingSections<
  SectionRow extends { sectionKey: string; sectionTitle: string }
>(rows: SectionRow[]): Array<{ key: string; title: string; rows: SectionRow[] }> {
  const sections = new Map<string, { key: string; title: string; rows: SectionRow[] }>()
  for (const row of rows) {
    const section = sections.get(row.sectionKey) ?? {
      key: row.sectionKey,
      title: row.sectionTitle,
      rows: []
    }
    section.rows.push(row)
    sections.set(row.sectionKey, section)
  }
  return Array.from(sections.values())
}
