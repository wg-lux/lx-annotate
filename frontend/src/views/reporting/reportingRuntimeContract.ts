import type {
  ReportTemplateRuntimeDescriptorInput,
  ReportTemplateRuntimeClassificationChoiceInput,
  ReportTemplateRuntimePatientFindingInput,
  ReportTemplateRuntimePayload
} from '@/types/reportTemplate'
import { isRuntimeIntervention, migrateRuntimeInterventions } from './reportingInterventionContract'

export function parsePersistedRuntimePayload(value: unknown): ReportTemplateRuntimePayload | null {
  if (value === undefined || value === null) return null
  const payload = migrateRuntimeInterventions(value)
  if (!isRuntimePayload(payload)) {
    throw new Error('Der gespeicherte Berichtsentwurf enthält ungültige Befund- oder Interventionsdaten.')
  }
  return payload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRuntimeDescriptor(value: unknown): value is ReportTemplateRuntimeDescriptorInput {
  return (
    isRecord(value) &&
    (value.localId === undefined || typeof value.localId === 'string') &&
    typeof value.classificationChoiceDescriptor === 'string' &&
    'descriptorValue' in value
  )
}

function isRuntimeClassificationChoice(
  value: unknown
): value is ReportTemplateRuntimeClassificationChoiceInput {
  return (
    isRecord(value) &&
    (value.localId === undefined || typeof value.localId === 'string') &&
    typeof value.classification === 'string' &&
    typeof value.classificationChoice === 'string' &&
    Array.isArray(value.descriptors) &&
    value.descriptors.every(isRuntimeDescriptor)
  )
}

function isRuntimePatientFinding(
  value: unknown
): value is ReportTemplateRuntimePatientFindingInput {
  return (
    isRecord(value) &&
    (value.localId === undefined || typeof value.localId === 'string') &&
    typeof value.finding === 'string' &&
    Array.isArray(value.classificationChoices) &&
    value.classificationChoices.every(isRuntimeClassificationChoice) &&
    (value.interventions === undefined ||
      (Array.isArray(value.interventions) &&
        value.interventions.every(isRuntimeIntervention)))
  )
}

export function isRuntimePayload(value: unknown): value is ReportTemplateRuntimePayload {
  if (!isRecord(value)) return false
  return hasValidRuntimePayloadCore(value) && hasValidRuntimePayloadOptionals(value)
}

function hasValidRuntimePayloadCore(value: Record<string, unknown>): boolean {
  return (
    typeof value.patient === 'string' &&
    (Array.isArray(value.examiners) && value.examiners.every((entry: unknown) => typeof entry === 'string')) &&
    typeof value.examination === 'string' &&
    Array.isArray(value.patientFindings) &&
    value.patientFindings.every(isRuntimePatientFinding)
  )
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string'
}

function hasValidRuntimePayloadOptionals(value: Record<string, unknown>): boolean {
  return (
    isOptionalNullableString(value.date) &&
    isOptionalNullableString(value.knowledgeBaseModule) &&
    isOptionalNullableString(value.knowledgeBaseVersion)
  )
}
