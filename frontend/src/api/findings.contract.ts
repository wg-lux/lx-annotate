import {
  getCoreConceptDisplayName,
  type ClassificationChoiceCore,
  type ClassificationCore,
  type FindingCore
} from '@/types/coreConcepts'

type UnknownRecord = Record<string, unknown>
export type JsonMap = Record<string, unknown>

function contractError(path: string, expectation: string): TypeError {
  return new TypeError(`Invalid findings response at ${path}: expected ${expectation}.`)
}

function isRecord(input: unknown): input is UnknownRecord {
  return typeof input === 'object' && input !== null && !Array.isArray(input)
}

function requireRecord(input: unknown, path: string): UnknownRecord {
  if (!isRecord(input)) {
    throw contractError(path, 'an object')
  }
  return input
}

function readKey(input: UnknownRecord, camel: string, snake: string): unknown {
  if (input[camel] !== undefined) {
    return input[camel]
  }
  return input[snake]
}

function requirePositiveIntegerValue(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw contractError(path, 'a positive integer')
  }
  return value
}

function optionalPositiveIntegerValue(value: unknown, path: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return requirePositiveIntegerValue(value, path)
}

function requireName(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw contractError(path, 'a non-empty string')
  }
  return value.trim()
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw contractError(path, 'a string or null')
  }
  return value
}

function optionalNullableString(value: unknown, path: string): string | null | undefined {
  if (value === undefined || value === null) {
    return value
  }
  if (typeof value !== 'string') {
    throw contractError(path, 'a string or null')
  }
  return value
}

function optionalName(value: unknown, path: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return requireName(value, path)
}

function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw contractError(path, 'a boolean')
  }
  return value
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw contractError(path, 'an array')
  }
  return value
}

function optionalStringArray(value: unknown, path: string): string[] {
  if (value === undefined) {
    return []
  }
  return requireStringArray(value, path)
}

function requireStringArray(value: unknown, path: string): string[] {
  return requireArray(value, path).map((entry, index) =>
    requireName(entry, `${path}[${String(index)}]`)
  )
}

function optionalJsonMap(value: unknown, path: string): JsonMap {
  if (value === undefined) {
    return {}
  }
  return requireRecord(value, path)
}

function requireJsonMap(value: unknown, path: string): JsonMap {
  return requireRecord(value, path)
}

function requireRows(input: unknown, path: string): unknown[] {
  if (Array.isArray(input)) {
    return input
  }
  const envelope = requireRecord(input, path)
  return requireArray(envelope.results, `${path}.results`)
}

export interface FindingChoiceDto {
  id: number
  name: string
  description?: string | null
  name_de?: string
  name_en?: string
  subcategories?: JsonMap
  numerical_descriptors?: JsonMap
}

export interface FindingClassificationDto {
  id: number
  name: string
  description?: string | null
  name_de?: string
  name_en?: string
  required?: boolean
  classification_types: string[]
  choices: FindingChoiceDto[]
}

export interface FindingDto {
  id: number
  name: string
  description?: string | null
  name_de?: string
  name_en?: string
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
  nameEn?: string
  displayName?: string
  subcategories: JsonMap
  numericalDescriptors: JsonMap
}

export interface FindingClassification extends Partial<
  Pick<ClassificationCore, 'name' | 'description'>
> {
  id: number
  name: string
  description?: string
  nameDe?: string
  nameEn?: string
  displayName?: string
  required: boolean
  classificationTypes: string[]
  choices: FindingChoice[]
}

export interface Finding extends Pick<FindingCore, 'name'> {
  id: number
  description: string
  nameDe?: string
  nameEn?: string
  displayName?: string
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

export const normalizeFindingChoice = (input: unknown, path = 'findingChoice'): FindingChoice => {
  const source = requireRecord(input, path)
  const name = requireName(readKey(source, 'name', 'name'), `${path}.name`)
  const nameDe = optionalName(readKey(source, 'nameDe', 'name_de'), `${path}.nameDe`)
  const nameEn = optionalName(readKey(source, 'nameEn', 'name_en'), `${path}.nameEn`)
  return {
    id: requirePositiveIntegerValue(readKey(source, 'id', 'id'), `${path}.id`),
    name,
    nameDe,
    nameEn,
    displayName: nameDe ?? name,
    description: optionalString(
      readKey(source, 'description', 'description'),
      `${path}.description`
    ),
    subcategories: optionalJsonMap(
      readKey(source, 'subcategories', 'subcategories'),
      `${path}.subcategories`
    ),
    numericalDescriptors: optionalJsonMap(
      readKey(source, 'numericalDescriptors', 'numerical_descriptors'),
      `${path}.numericalDescriptors`
    )
  }
}

export const normalizeFindingClassification = (
  input: unknown,
  path = 'findingClassification'
): FindingClassification => {
  const source = requireRecord(input, path)
  const name = requireName(readKey(source, 'name', 'name'), `${path}.name`)
  const nameDe = optionalName(readKey(source, 'nameDe', 'name_de'), `${path}.nameDe`)
  const nameEn = optionalName(readKey(source, 'nameEn', 'name_en'), `${path}.nameEn`)
  const choices = requireArray(readKey(source, 'choices', 'choices'), `${path}.choices`)
  return {
    id: requirePositiveIntegerValue(readKey(source, 'id', 'id'), `${path}.id`),
    name,
    nameDe,
    nameEn,
    displayName: nameDe ?? name,
    description: optionalString(
      readKey(source, 'description', 'description'),
      `${path}.description`
    ),
    required: requireBoolean(readKey(source, 'required', 'required'), `${path}.required`),
    classificationTypes: requireStringArray(
      readKey(source, 'classificationTypes', 'classification_types'),
      `${path}.classificationTypes`
    ),
    choices: choices.map((choice, index) =>
      normalizeFindingChoice(choice, `${path}.choices[${String(index)}]`)
    )
  }
}

const normalizeFindingClassificationList = (
  input: unknown,
  path: string
): FindingClassification[] => {
  return requireArray(input, path).map((classification, index) =>
    normalizeFindingClassification(classification, `${path}[${String(index)}]`)
  )
}

export const mergeFindingClassifications = (
  finding: Partial<Finding> | null | undefined
): FindingClassification[] => {
  if (!finding) {
    return []
  }
  const merged = [
    ...(Array.isArray(finding.classifications) ? finding.classifications : []),
    ...(Array.isArray(finding.locationClassifications) ? finding.locationClassifications : []),
    ...(Array.isArray(finding.morphologyClassifications) ? finding.morphologyClassifications : []),
    ...(Array.isArray(finding.FindingClassifications) ? finding.FindingClassifications : [])
  ]

  const byId = new Map<number, FindingClassification>()
  for (const classification of merged) {
    requirePositiveIntegerValue(classification.id, 'finding.classifications[].id')
    if (!byId.has(classification.id)) {
      byId.set(classification.id, classification)
    }
  }
  return Array.from(byId.values())
}

export const normalizeFinding = (input: unknown, path = 'finding'): Finding => {
  const source = requireRecord(input, path)
  const name = requireName(readKey(source, 'name', 'name'), `${path}.name`)
  const nameDe = optionalName(readKey(source, 'nameDe', 'name_de'), `${path}.nameDe`)
  const nameEn = optionalName(readKey(source, 'nameEn', 'name_en'), `${path}.nameEn`)
  const classifications = normalizeFindingClassificationList(
    readKey(source, 'classifications', 'classifications'),
    `${path}.classifications`
  )
  const locationClassifications = normalizeFindingClassificationList(
    readKey(source, 'locationClassifications', 'location_classifications'),
    `${path}.locationClassifications`
  )
  const morphologyClassifications = normalizeFindingClassificationList(
    readKey(source, 'morphologyClassifications', 'morphology_classifications'),
    `${path}.morphologyClassifications`
  )
  const legacyRaw = readKey(source, 'FindingClassifications', 'FindingClassifications')
  const legacyFindingClassifications =
    legacyRaw === undefined
      ? []
      : normalizeFindingClassificationList(legacyRaw, `${path}.FindingClassifications`)

  const baseFinding: Omit<Finding, 'FindingClassifications'> = {
    id: requirePositiveIntegerValue(readKey(source, 'id', 'id'), `${path}.id`),
    name,
    nameDe,
    nameEn,
    displayName: nameDe ?? name,
    description:
      optionalString(readKey(source, 'description', 'description'), `${path}.description`) ?? '',
    examinations: optionalStringArray(
      readKey(source, 'examinations', 'examinations'),
      `${path}.examinations`
    ),
    patientExaminationId: optionalPositiveIntegerValue(
      readKey(source, 'patientExaminationId', 'patient_examination_id') ??
        readKey(source, 'PatientExaminationId', 'PatientExaminationId'),
      `${path}.patientExaminationId`
    ),
    classifications,
    locationClassifications,
    morphologyClassifications,
    findingTypes: optionalStringArray(
      readKey(source, 'findingTypes', 'finding_types'),
      `${path}.findingTypes`
    ),
    findingInterventions: optionalStringArray(
      readKey(source, 'findingInterventions', 'finding_interventions'),
      `${path}.findingInterventions`
    )
  }

  return {
    ...baseFinding,
    FindingClassifications:
      legacyFindingClassifications.length > 0
        ? legacyFindingClassifications
        : classifications.length > 0
          ? classifications
          : mergeFindingClassifications(baseFinding)
  }
}

export const normalizeFindings = (input: unknown): Finding[] => {
  return requireRows(input, 'findings').map((row, index) =>
    normalizeFinding(row, `findings[${String(index)}]`)
  )
}

export const normalizePatientFindingClassification = (
  input: unknown,
  path = 'patientFindingClassification'
): PatientFindingClassification => {
  const source = requireRecord(input, path)
  return {
    id: requirePositiveIntegerValue(readKey(source, 'id', 'id'), `${path}.id`),
    classification: requirePositiveIntegerValue(
      readKey(source, 'classification', 'classification'),
      `${path}.classification`
    ),
    classificationChoice: requirePositiveIntegerValue(
      readKey(source, 'classificationChoice', 'classification_choice'),
      `${path}.classificationChoice`
    ),
    classificationName: optionalName(
      readKey(source, 'classificationName', 'classification_name'),
      `${path}.classificationName`
    ),
    classificationChoiceName: optionalName(
      readKey(source, 'classificationChoiceName', 'classification_choice_name'),
      `${path}.classificationChoiceName`
    ),
    subcategories: requireJsonMap(
      readKey(source, 'subcategories', 'subcategories'),
      `${path}.subcategories`
    ),
    numericalDescriptors: requireJsonMap(
      readKey(source, 'numericalDescriptors', 'numerical_descriptors'),
      `${path}.numericalDescriptors`
    ),
    isActive: requireBoolean(readKey(source, 'isActive', 'is_active'), `${path}.isActive`)
  }
}

function normalizePatientFindingIntervention(
  input: unknown,
  path: string
): number | PatientFindingIntervention {
  if (typeof input === 'number') {
    return requirePositiveIntegerValue(input, path)
  }
  const source = requireRecord(input, path)
  return {
    intervention: optionalPositiveIntegerValue(source.intervention, `${path}.intervention`),
    interventionId: optionalPositiveIntegerValue(
      readKey(source, 'interventionId', 'intervention_id'),
      `${path}.interventionId`
    ),
    state: optionalNullableString(source.state, `${path}.state`),
    date: optionalNullableString(source.date, `${path}.date`),
    timeStart: optionalNullableString(
      readKey(source, 'timeStart', 'time_start'),
      `${path}.timeStart`
    ),
    timeEnd: optionalNullableString(readKey(source, 'timeEnd', 'time_end'), `${path}.timeEnd`)
  }
}

function normalizeFindingReference(input: unknown, path: string): number | { id: number } {
  if (typeof input === 'number') {
    return requirePositiveIntegerValue(input, path)
  }
  const source = requireRecord(input, path)
  return { id: requirePositiveIntegerValue(source.id, `${path}.id`) }
}

export const normalizePatientFindingRow = (
  input: unknown,
  path = 'patientFinding'
): PatientFindingRow => {
  const source = requireRecord(input, path)
  const rawClassifications = requireArray(
    readKey(source, 'classifications', 'classifications'),
    `${path}.classifications`
  )
  const rawInterventions = readKey(source, 'interventions', 'interventions')

  return {
    id: requirePositiveIntegerValue(readKey(source, 'id', 'id'), `${path}.id`),
    patientExamination: requirePositiveIntegerValue(
      readKey(source, 'patientExamination', 'patient_examination'),
      `${path}.patientExamination`
    ),
    finding: normalizeFindingReference(readKey(source, 'finding', 'finding'), `${path}.finding`),
    isActive: requireBoolean(readKey(source, 'isActive', 'is_active'), `${path}.isActive`),
    createdAt: optionalString(readKey(source, 'createdAt', 'created_at'), `${path}.createdAt`),
    updatedAt: optionalString(readKey(source, 'updatedAt', 'updated_at'), `${path}.updatedAt`),
    classifications: rawClassifications.map((classification, index) =>
      normalizePatientFindingClassification(
        classification,
        `${path}.classifications[${String(index)}]`
      )
    ),
    interventions:
      rawInterventions === undefined
        ? undefined
        : requireArray(rawInterventions, `${path}.interventions`).map((intervention, index) =>
            normalizePatientFindingIntervention(
              intervention,
              `${path}.interventions[${String(index)}]`
            )
          )
  }
}

export const normalizePatientFindingRows = (input: unknown): PatientFindingRow[] => {
  return requireRows(input, 'patientFindings').map((row, index) =>
    normalizePatientFindingRow(row, `patientFindings[${String(index)}]`)
  )
}

export const getFindingDisplayName = (
  finding: Pick<Finding, 'name' | 'nameDe' | 'displayName' | 'id'> | null | undefined
): string =>
  getCoreConceptDisplayName(
    finding,
    `Finding ${finding?.id === undefined ? 'unknown' : String(finding.id)}`
  )

type LocalizedFindingCatalogEntry = {
  name: string
  nameDe?: string
  nameEn?: string
}

export const getFindingCatalogLocalizedName = (
  entry: LocalizedFindingCatalogEntry,
  language: 'de' | 'en'
): string => (language === 'de' ? entry.nameDe : entry.nameEn) || entry.name

export const getClassificationDisplayName = (
  classification: Pick<FindingClassification, 'name' | 'nameDe' | 'displayName'> | null | undefined
): string => getCoreConceptDisplayName(classification, 'unknown')

export const extractFindingId = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  if (!isRecord(value)) {
    return null
  }
  const nestedId = value.id
  return typeof nestedId === 'number' && Number.isInteger(nestedId) && nestedId > 0
    ? nestedId
    : null
}
