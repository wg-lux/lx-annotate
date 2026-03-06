import axiosInstance from '@/api/axiosInstance'
import type {
  CitationCore,
  ClassificationChoiceCore,
  ClassificationChoiceDescriptorCore,
  ClassificationCore,
  CoreConceptBase,
  CoreConceptCollection,
  ExaminationCore,
  FindingCore,
  FindingTypeCore,
  IndicationCore,
  IndicationTypeCore,
  InformationSourceCore,
  InformationSourceTypeCore,
  InterventionCore,
  InterventionTypeCore,
  UnitCore,
  UnitTypeCore
} from '@/types/coreConcepts'

const readKey = <T = unknown>(input: Record<string, unknown>, camel: string, snake: string): T | undefined => {
  const value = input[camel]
  if (value !== undefined) return value as T
  return input[snake] as T | undefined
}

const asRecord = (input: unknown): Record<string, unknown> =>
  input && typeof input === 'object' ? (input as Record<string, unknown>) : {}

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean)
  }
  return []
}

const asStringRecord = (value: unknown): Record<string, string> => {
  const rec = asRecord(value)
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(rec)) {
    if (typeof entry === 'string') out[key] = entry
  }
  return out
}

const asStringNumberRecord = (value: unknown): Record<string, string | number> => {
  const rec = asRecord(value)
  const out: Record<string, string | number> = {}
  for (const [key, entry] of Object.entries(rec)) {
    if (typeof entry === 'string' || typeof entry === 'number') out[key] = entry
  }
  return out
}

const asNumberRecord = (value: unknown): Record<string, number> => {
  const rec = asRecord(value)
  const out: Record<string, number> = {}
  for (const [key, entry] of Object.entries(rec)) {
    const n = asNumber(entry)
    if (n !== undefined) out[key] = n
  }
  return out
}

const normalizeBase = (raw: unknown): CoreConceptBase => {
  const source = asRecord(raw)
  return {
    id: asNumber(readKey(source, 'id', 'id')),
    name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
    nameDe: asString(readKey(source, 'nameDe', 'name_de')),
    nameEn: asString(readKey(source, 'nameEn', 'name_en')),
    description: asString(readKey(source, 'description', 'description')),
    uuid: asString(readKey(source, 'uuid', 'uuid')),
    tags: asStringArray(readKey(source, 'tags', 'tags')),
    kbModuleName: asString(readKey(source, 'kbModuleName', 'kb_module_name'))
  }
}

const normalizeClassification = (raw: unknown): ClassificationCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    classificationChoices: asStringArray(
      readKey(source, 'classificationChoices', 'classification_choices')
    ),
    classificationTypes: asStringArray(readKey(source, 'classificationTypes', 'classification_types'))
  }
}

const normalizeClassificationChoice = (raw: unknown): ClassificationChoiceCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    classificationChoiceDescriptors: asStringArray(
      readKey(source, 'classificationChoiceDescriptors', 'classification_choice_descriptors')
    )
  }
}

const normalizeClassificationChoiceDescriptor = (raw: unknown): ClassificationChoiceDescriptorCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    classificationChoiceDescriptorType: asString(
      readKey(source, 'classificationChoiceDescriptorType', 'classification_choice_descriptor_type')
    ),
    unit: asString(readKey(source, 'unit', 'unit')),
    numericMin: asNumber(readKey(source, 'numericMin', 'numeric_min')),
    numericMax: asNumber(readKey(source, 'numericMax', 'numeric_max')),
    numericDistribution: asString(readKey(source, 'numericDistribution', 'numeric_distribution')),
    numericDistributionParams: asStringNumberRecord(
      readKey(source, 'numericDistributionParams', 'numeric_distribution_params')
    ),
    textMaxLength: asNumber(readKey(source, 'textMaxLength', 'text_max_length')),
    defaultValueStr: asString(readKey(source, 'defaultValueStr', 'default_value_str')),
    defaultValueNum: asNumber(readKey(source, 'defaultValueNum', 'default_value_num')),
    defaultValueBool: asBoolean(readKey(source, 'defaultValueBool', 'default_value_bool')),
    selectionOptions: asStringArray(readKey(source, 'selectionOptions', 'selection_options')),
    selectionMultiple: asBoolean(readKey(source, 'selectionMultiple', 'selection_multiple')),
    selectionMultipleNMin: asNumber(
      readKey(source, 'selectionMultipleNMin', 'selection_multiple_n_min')
    ),
    selectionMultipleNMax: asNumber(
      readKey(source, 'selectionMultipleNMax', 'selection_multiple_n_max')
    ),
    selectionDefaultOptions: asNumberRecord(
      readKey(source, 'selectionDefaultOptions', 'selection_default_options')
    )
  }
}

const normalizeExamination = (raw: unknown): ExaminationCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    findings: asStringArray(readKey(source, 'findings', 'findings')),
    examinationTypes: asStringArray(readKey(source, 'examinationTypes', 'examination_types')),
    indications: asStringArray(readKey(source, 'indications', 'indications'))
  }
}

const normalizeFinding = (raw: unknown): FindingCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    findingTypes: asStringArray(readKey(source, 'findingTypes', 'finding_types')),
    classifications: asStringArray(readKey(source, 'classifications', 'classifications')),
    interventions: asStringArray(readKey(source, 'interventions', 'interventions'))
  }
}

const normalizeFindingType = (raw: unknown): FindingTypeCore => ({ ...normalizeBase(raw) })

const normalizeIndication = (raw: unknown): IndicationCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    indicationTypes: asStringArray(readKey(source, 'indicationTypes', 'indication_types')),
    interventions: asStringArray(readKey(source, 'interventions', 'interventions'))
  }
}

const normalizeIndicationType = (raw: unknown): IndicationTypeCore => ({ ...normalizeBase(raw) })

const normalizeIntervention = (raw: unknown): InterventionCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    interventionTypes: asStringArray(readKey(source, 'interventionTypes', 'intervention_types'))
  }
}

const normalizeInterventionType = (raw: unknown): InterventionTypeCore => ({ ...normalizeBase(raw) })

const normalizeUnit = (raw: unknown): UnitCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    abbreviation: asString(readKey(source, 'abbreviation', 'abbreviation')),
    unitTypes: asStringArray(readKey(source, 'unitTypes', 'unit_types'))
  }
}

const normalizeUnitType = (raw: unknown): UnitTypeCore => ({ ...normalizeBase(raw) })

const normalizeInformationSource = (raw: unknown): InformationSourceCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    informationSourceTypes: asStringArray(
      readKey(source, 'informationSourceTypes', 'information_source_types')
    )
  }
}

const normalizeInformationSourceType = (raw: unknown): InformationSourceTypeCore => ({
  ...normalizeBase(raw)
})

const normalizeCitation = (raw: unknown): CitationCore => {
  const source = asRecord(raw)
  return {
    ...normalizeBase(source),
    citationKey: asString(readKey(source, 'citationKey', 'citation_key')) ?? 'unknown',
    title: asString(readKey(source, 'title', 'title')) ?? 'unknown',
    abstract: asString(readKey(source, 'abstract', 'abstract')),
    authors: asStringArray(readKey(source, 'authors', 'authors')),
    publicationYear: asNumber(readKey(source, 'publicationYear', 'publication_year')),
    publicationMonth: asString(readKey(source, 'publicationMonth', 'publication_month')),
    journal: asString(readKey(source, 'journal', 'journal')),
    publisher: asString(readKey(source, 'publisher', 'publisher')),
    volume: asString(readKey(source, 'volume', 'volume')),
    issue: asString(readKey(source, 'issue', 'issue')),
    pages: asString(readKey(source, 'pages', 'pages')),
    doi: asString(readKey(source, 'doi', 'doi')),
    url: asString(readKey(source, 'url', 'url')),
    entryType: asString(readKey(source, 'entryType', 'entry_type')),
    language: asString(readKey(source, 'language', 'language')),
    keywords: asStringArray(readKey(source, 'keywords', 'keywords')),
    identifiers: asStringRecord(readKey(source, 'identifiers', 'identifiers'))
  }
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

export const normalizeCoreConceptCollection = (raw: unknown): CoreConceptCollection => {
  const source = asRecord(raw)
  return {
    moduleName:
      asString(readKey(source, 'moduleName', 'module_name')) ||
      asString(readKey(source, 'module', 'module')) ||
      'unknown',
    classification: asArray(readKey(source, 'classification', 'classification')).map(
      normalizeClassification
    ),
    classificationChoice: asArray(
      readKey(source, 'classificationChoice', 'classification_choice')
    ).map(normalizeClassificationChoice),
    classificationChoiceDescriptor: asArray(
      readKey(source, 'classificationChoiceDescriptor', 'classification_choice_descriptor')
    ).map(normalizeClassificationChoiceDescriptor),
    examination: asArray(readKey(source, 'examination', 'examination')).map(
      normalizeExamination
    ),
    finding: asArray(readKey(source, 'finding', 'finding')).map(normalizeFinding),
    findingType: asArray(readKey(source, 'findingType', 'finding_type')).map(
      normalizeFindingType
    ),
    indication: asArray(readKey(source, 'indication', 'indication')).map(normalizeIndication),
    indicationType: asArray(readKey(source, 'indicationType', 'indication_type')).map(
      normalizeIndicationType
    ),
    intervention: asArray(readKey(source, 'intervention', 'intervention')).map(
      normalizeIntervention
    ),
    interventionType: asArray(readKey(source, 'interventionType', 'intervention_type')).map(
      normalizeInterventionType
    ),
    unit: asArray(readKey(source, 'unit', 'unit')).map(normalizeUnit),
    unitType: asArray(readKey(source, 'unitType', 'unit_type')).map(normalizeUnitType),
    informationSource: asArray(
      readKey(source, 'informationSource', 'information_source')
    ).map(normalizeInformationSource),
    informationSourceType: asArray(
      readKey(source, 'informationSourceType', 'information_source_type')
    ).map(normalizeInformationSourceType),
    citation: asArray(readKey(source, 'citation', 'citation')).map(normalizeCitation)
  }
}

export const fetchCoreConcepts = async (moduleName: string): Promise<CoreConceptCollection> => {
  const response = await axiosInstance.get(`/base_api/core-concepts/${moduleName}`)
  return normalizeCoreConceptCollection(response.data)
}
