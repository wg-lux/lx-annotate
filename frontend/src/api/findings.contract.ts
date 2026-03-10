import type { ClassificationChoiceCore, ClassificationCore, FindingCore } from '@/types/coreConcepts'

type UnknownRecord = Record<string, unknown>
export type JsonMap = Record<string, unknown>

const asRecord = (input: unknown): UnknownRecord =>
  input && typeof input === 'object' ? (input as UnknownRecord) : {}

const readKey = <T = unknown>(input: UnknownRecord, camel: string, snake: string): T | undefined => {
  const camelValue = input[camel]
  if (camelValue !== undefined) return camelValue as T
  return input[snake] as T | undefined
}

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => asString(entry)?.trim())
    .filter((entry): entry is string => Boolean(entry))
}

const asJsonMap = (value: unknown): JsonMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as JsonMap
}

export interface FindingChoiceDto {
  id: number
  name: string
  description?: string | null
  name_de?: string
  subcategories?: JsonMap
  numerical_descriptors?: JsonMap
}

export interface FindingClassificationDto {
  id: number
  name: string
  description?: string | null
  name_de?: string
  required?: boolean
  classification_types: string[]
  choices: FindingChoiceDto[]
}

export interface FindingDto {
  id: number
  name: string
  description?: string | null
  name_de?: string
  classifications: FindingClassificationDto[]
  location_classifications: FindingClassificationDto[]
  morphology_classifications: FindingClassificationDto[]
  FindingClassifications?: FindingClassificationDto[]
  finding_types?: string[]
  finding_interventions?: string[]
  examinations?: string[]
  patient_examination_id?: number
}

export interface PatientFindingClassificationDto {
  id: number
  classification: number
  classification_choice: number
  classification_name?: string
  classification_choice_name?: string
  subcategories: JsonMap
  numerical_descriptors: JsonMap
  is_active: boolean
}

export interface PatientFindingDto {
  id: number
  patient_examination: number
  finding: number | { id: number }
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
  classifications: PatientFindingClassificationDto[]
}

export interface FindingChoice extends Pick<ClassificationChoiceCore, 'name'> {
  id: number
  description?: string
  nameDe?: string
  subcategories: JsonMap
  numericalDescriptors: JsonMap
}

export interface FindingClassification extends Partial<Pick<ClassificationCore, 'name' | 'description'>> {
  id: number
  name: string
  description?: string
  nameDe?: string
  required: boolean
  classificationTypes: string[]
  choices: FindingChoice[]
}

export interface Finding extends Pick<FindingCore, 'name'> {
  id: number
  description: string
  nameDe?: string
  examinations: string[]
  patientExaminationId?: number
  classifications: FindingClassification[]
  locationClassifications: FindingClassification[]
  morphologyClassifications: FindingClassification[]
  FindingClassifications: FindingClassification[]
  findingTypes: FindingCore['findingTypes']
  findingInterventions: FindingCore['interventions']
}

export interface PatientFindingClassification {
  id: number
  classification: number
  classificationChoice: number
  classificationName?: string
  classificationChoiceName?: string
  subcategories: JsonMap
  numericalDescriptors: JsonMap
  isActive: boolean
}

export interface PatientFindingIntervention {
  intervention?: number
  interventionId?: number
  state?: string | null
  date?: string | null
  timeStart?: string | null
  timeEnd?: string | null
}

export interface PatientFindingRow {
  id: number
  patientExamination: number
  finding: number | { id: number }
  isActive: boolean
  createdAt?: string | null
  updatedAt?: string | null
  classifications: PatientFindingClassification[]
  interventions?: Array<number | PatientFindingIntervention>
}

export interface ClassificationSelection {
  classification: number
  choice: number
}

export const normalizeFindingChoice = (input: unknown): FindingChoice => {
  const source = asRecord(input)
  return {
    id: asNumber(readKey(source, 'id', 'id')) ?? 0,
    name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
    nameDe: asString(readKey(source, 'nameDe', 'name_de')),
    description: asString(readKey(source, 'description', 'description')),
    subcategories: asJsonMap(readKey(source, 'subcategories', 'subcategories')),
    numericalDescriptors: asJsonMap(
      readKey(source, 'numericalDescriptors', 'numerical_descriptors')
    )
  }
}

export const normalizeFindingClassification = (input: unknown): FindingClassification => {
  const source = asRecord(input)
  const choicesRaw = readKey(source, 'choices', 'choices')
  return {
    id: asNumber(readKey(source, 'id', 'id')) ?? 0,
    name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
    nameDe: asString(readKey(source, 'nameDe', 'name_de')),
    description: asString(readKey(source, 'description', 'description')),
    required: asBoolean(readKey(source, 'required', 'required')) ?? false,
    classificationTypes: asStringArray(
      readKey(source, 'classificationTypes', 'classification_types')
    ),
    choices: Array.isArray(choicesRaw) ? choicesRaw.map(normalizeFindingChoice) : []
  }
}

const normalizeFindingClassificationList = (input: unknown): FindingClassification[] => {
  if (!Array.isArray(input)) return []
  return input
    .map(normalizeFindingClassification)
    .filter((classification) => Number.isFinite(classification.id) && classification.id > 0)
}

export const mergeFindingClassifications = (finding: Partial<Finding> | null | undefined): FindingClassification[] => {
  if (!finding) return []
  const merged = [
    ...(Array.isArray(finding.classifications) ? finding.classifications : []),
    ...(Array.isArray(finding.locationClassifications) ? finding.locationClassifications : []),
    ...(Array.isArray(finding.morphologyClassifications) ? finding.morphologyClassifications : []),
    ...(Array.isArray(finding.FindingClassifications) ? finding.FindingClassifications : [])
  ]

  const byId = new Map<number, FindingClassification>()
  for (const classification of merged) {
    if (!Number.isFinite(classification.id) || classification.id <= 0) continue
    if (!byId.has(classification.id)) byId.set(classification.id, classification)
  }
  return Array.from(byId.values())
}

export const normalizeFinding = (input: unknown): Finding => {
  const source = asRecord(input)
  const classifications = normalizeFindingClassificationList(
    readKey(source, 'classifications', 'classifications')
  )
  const locationClassifications = normalizeFindingClassificationList(
    readKey(source, 'locationClassifications', 'location_classifications')
  )
  const morphologyClassifications = normalizeFindingClassificationList(
    readKey(source, 'morphologyClassifications', 'morphology_classifications')
  )
  const legacyFindingClassifications = normalizeFindingClassificationList(
    readKey(source, 'FindingClassifications', 'FindingClassifications')
  )

  const finding: Finding = {
    id: asNumber(readKey(source, 'id', 'id')) ?? 0,
    name: asString(readKey(source, 'name', 'name')) ?? 'unknown',
    nameDe: asString(readKey(source, 'nameDe', 'name_de')),
    description: asString(readKey(source, 'description', 'description')) ?? '',
    examinations: asStringArray(readKey(source, 'examinations', 'examinations')),
    patientExaminationId: asNumber(
      readKey(source, 'patientExaminationId', 'patient_examination_id') ??
        readKey(source, 'PatientExaminationId', 'PatientExaminationId')
    ),
    classifications,
    locationClassifications,
    morphologyClassifications,
    FindingClassifications: legacyFindingClassifications.length
      ? legacyFindingClassifications
      : classifications,
    findingTypes: asStringArray(readKey(source, 'findingTypes', 'finding_types')),
    findingInterventions: asStringArray(
      readKey(source, 'findingInterventions', 'finding_interventions')
    )
  }

  if (finding.FindingClassifications.length === 0) {
    finding.FindingClassifications = mergeFindingClassifications(finding)
  }

  return finding
}

export const normalizeFindings = (input: unknown): Finding[] => {
  const rows = Array.isArray((input as { results?: unknown[] } | null)?.results)
    ? ((input as { results: unknown[] }).results)
    : Array.isArray(input)
      ? input
      : []

  return rows
    .map(normalizeFinding)
    .filter((finding) => Number.isFinite(finding.id) && finding.id > 0)
}

export const normalizePatientFindingClassification = (
  input: unknown
): PatientFindingClassification => {
  const source = asRecord(input)
  return {
    id: asNumber(readKey(source, 'id', 'id')) ?? 0,
    classification: asNumber(readKey(source, 'classification', 'classification')) ?? 0,
    classificationChoice:
      asNumber(readKey(source, 'classificationChoice', 'classification_choice')) ?? 0,
    classificationName: asString(
      readKey(source, 'classificationName', 'classification_name')
    ),
    classificationChoiceName: asString(
      readKey(source, 'classificationChoiceName', 'classification_choice_name')
    ),
    subcategories: asJsonMap(readKey(source, 'subcategories', 'subcategories')),
    numericalDescriptors: asJsonMap(
      readKey(source, 'numericalDescriptors', 'numerical_descriptors')
    ),
    isActive: asBoolean(readKey(source, 'isActive', 'is_active')) ?? true
  }
}

export const normalizePatientFindingRow = (input: unknown): PatientFindingRow => {
  const source = asRecord(input)
  const rawClassifications = readKey(source, 'classifications', 'classifications')
  const findingId = asNumber(readKey(source, 'finding', 'finding'))
  const nestedFinding = asRecord(readKey(source, 'finding', 'finding'))

  return {
    id: asNumber(readKey(source, 'id', 'id')) ?? 0,
    patientExamination:
      asNumber(readKey(source, 'patientExamination', 'patient_examination')) ?? 0,
    finding:
      findingId !== undefined
        ? findingId
        : { id: asNumber(readKey(nestedFinding, 'id', 'id')) ?? 0 },
    isActive: asBoolean(readKey(source, 'isActive', 'is_active')) ?? true,
    createdAt: asString(readKey(source, 'createdAt', 'created_at')),
    updatedAt: asString(readKey(source, 'updatedAt', 'updated_at')),
    classifications: Array.isArray(rawClassifications)
      ? rawClassifications.map(normalizePatientFindingClassification)
      : []
  }
}

export const normalizePatientFindingRows = (input: unknown): PatientFindingRow[] => {
  const rows = Array.isArray((input as { results?: unknown[] } | null)?.results)
    ? ((input as { results: unknown[] }).results)
    : Array.isArray(input)
      ? input
      : []

  return rows
    .map(normalizePatientFindingRow)
    .filter((row) => Number.isFinite(row.id) && row.id > 0)
}

export const getFindingDisplayName = (
  finding: Pick<Finding, 'name' | 'nameDe' | 'id'> | null | undefined
): string => finding?.nameDe || finding?.name || `Finding ${finding?.id ?? 'unknown'}`

export const getClassificationDisplayName = (
  classification: Pick<FindingClassification, 'name' | 'nameDe'> | null | undefined
): string => classification?.nameDe || classification?.name || 'unknown'

export const extractFindingId = (value: unknown): number | null => {
  const directId = asNumber(value)
  if (directId !== undefined) return directId

  const source = asRecord(value)
  const nestedId = asNumber(readKey(source, 'id', 'id'))
  return nestedId ?? null
}
