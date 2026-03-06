export type CoreConceptName =
  | 'classification'
  | 'classificationChoice'
  | 'classificationChoiceDescriptor'
  | 'examination'
  | 'finding'
  | 'findingType'
  | 'indication'
  | 'indicationType'
  | 'intervention'
  | 'interventionType'
  | 'unit'
  | 'unitType'
  | 'informationSource'
  | 'informationSourceType'
  | 'citation'

export interface CoreConceptBase {
  id?: number
  name: string
  nameDe?: string
  nameEn?: string
  description?: string
  uuid?: string
  tags: string[]
  kbModuleName?: string
}

export interface ClassificationCore extends CoreConceptBase {
  classificationChoices: string[]
  classificationTypes: string[]
}

export interface ClassificationChoiceCore extends CoreConceptBase {
  classificationChoiceDescriptors: string[]
}

export interface ClassificationChoiceDescriptorCore extends CoreConceptBase {
  classificationChoiceDescriptorType?: string
  unit?: string
  numericMin?: number
  numericMax?: number
  numericDistribution?: string
  numericDistributionParams: Record<string, string | number>
  textMaxLength?: number
  defaultValueStr?: string
  defaultValueNum?: number
  defaultValueBool?: boolean
  selectionOptions: string[]
  selectionMultiple?: boolean
  selectionMultipleNMin?: number
  selectionMultipleNMax?: number
  selectionDefaultOptions: Record<string, number>
}

export interface ExaminationCore extends CoreConceptBase {
  findings: string[]
  examinationTypes: string[]
  indications: string[]
}

export interface FindingCore extends CoreConceptBase {
  findingTypes: string[]
  classifications: string[]
  interventions: string[]
}

export interface FindingTypeCore extends CoreConceptBase {}

export interface IndicationCore extends CoreConceptBase {
  indicationTypes: string[]
  interventions: string[]
}

export interface IndicationTypeCore extends CoreConceptBase {}

export interface InterventionCore extends CoreConceptBase {
  interventionTypes: string[]
}

export interface InterventionTypeCore extends CoreConceptBase {}

export interface UnitCore extends CoreConceptBase {
  abbreviation?: string
  unitTypes: string[]
}

export interface UnitTypeCore extends CoreConceptBase {}

export interface InformationSourceCore extends CoreConceptBase {
  informationSourceTypes: string[]
}

export interface InformationSourceTypeCore extends CoreConceptBase {}

export interface CitationCore extends CoreConceptBase {
  citationKey: string
  title: string
  abstract?: string
  authors: string[]
  publicationYear?: number
  publicationMonth?: string
  journal?: string
  publisher?: string
  volume?: string
  issue?: string
  pages?: string
  doi?: string
  url?: string
  entryType?: string
  language?: string
  keywords: string[]
  identifiers: Record<string, string>
}

export interface CoreConceptCollection {
  moduleName: string
  classification: ClassificationCore[]
  classificationChoice: ClassificationChoiceCore[]
  classificationChoiceDescriptor: ClassificationChoiceDescriptorCore[]
  examination: ExaminationCore[]
  finding: FindingCore[]
  findingType: FindingTypeCore[]
  indication: IndicationCore[]
  indicationType: IndicationTypeCore[]
  intervention: InterventionCore[]
  interventionType: InterventionTypeCore[]
  unit: UnitCore[]
  unitType: UnitTypeCore[]
  informationSource: InformationSourceCore[]
  informationSourceType: InformationSourceTypeCore[]
  citation: CitationCore[]
}
