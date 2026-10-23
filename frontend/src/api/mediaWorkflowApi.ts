import { isAxiosError } from 'axios'
import axiosInstance, { r, silentRequestConfig } from '@/api/axiosInstance'
import { endpoints, type Id } from '@/types/api/endpoints'

// Wire tokens of endoreg_db.services.clinical_lifecycle; see
// docs/guides/media-workflow-frontend-contract.md. Unknown tokens are rejected.
export const PRIVACY_STAGES = [
  'import_pending',
  'importing',
  'quarantined',
  'awaiting_validation',
  'validated',
  'raw_purged',
  'failed',
  'lost',
  'withdrawn'
] as const
export const ANNOTATION_STAGES = ['not_available', 'in_progress', 'validated'] as const
export const RELEASE_STAGES = [
  'not_released',
  'export_ready',
  'exported',
  'dataset_ingested'
] as const
export const WORKFLOW_EVENTS = [
  'import_started',
  'quarantined',
  'quarantine_released',
  'artifact_published',
  'correction_requested',
  'anonymization_validated',
  'raw_purged',
  'processing_failed',
  'integrity_lost',
  'retry_requested',
  'reconcile_retry',
  'reconcile_fail',
  'consent_withdrawn',
  'annotation_completed',
  'annotation_reopened',
  'export_approved',
  'export_revoked',
  'exported',
  'dataset_ingested'
] as const
const STATE_SOURCES = ['stored', 'projected'] as const

export type WorkflowKind = 'video' | 'report'
export type PrivacyStage = (typeof PRIVACY_STAGES)[number]
export type AnnotationStage = (typeof ANNOTATION_STAGES)[number]
export type ReleaseStage = (typeof RELEASE_STAGES)[number]
export type WorkflowEvent = (typeof WORKFLOW_EVENTS)[number]

export interface WorkflowItem {
  kind: WorkflowKind
  recordId: number
  version: number
  source: (typeof STATE_SOURCES)[number]
  privacy: PrivacyStage
  annotation: AnnotationStage
  release: ReleaseStage
  // Read-only information: the API does not yet say which events a person may trigger.
  allowedEvents: WorkflowEvent[]
}

export class WorkflowContractError extends Error {}

/** The item's persisted facts are inconsistent (HTTP 409); no state is shown. */
export class WorkflowInvariantError extends Error {
  constructor(readonly violations: string[]) {
    super('Workflow facts are inconsistent')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function token<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  const match = allowed.find((candidate) => candidate === value)
  if (match === undefined) {
    throw new WorkflowContractError(`Unknown workflow token for ${field}`)
  }
  return match
}

function count(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new WorkflowContractError(`Invalid workflow number for ${field}`)
  }
  return value
}

export function parseWorkflowItem(data: unknown): WorkflowItem {
  if (!isRecord(data) || !Array.isArray(data.allowedEvents)) {
    throw new WorkflowContractError('Workflow item response is malformed')
  }
  return {
    kind: token(data.kind, ['video', 'report'] as const, 'kind'),
    recordId: count(data.recordId, 'recordId'),
    version: count(data.version, 'version'),
    source: token(data.source, STATE_SOURCES, 'source'),
    privacy: token(data.privacy, PRIVACY_STAGES, 'privacy'),
    annotation: token(data.annotation, ANNOTATION_STAGES, 'annotation'),
    release: token(data.release, RELEASE_STAGES, 'release'),
    allowedEvents: data.allowedEvents.map((event: unknown) =>
      token(event, WORKFLOW_EVENTS, 'allowedEvents')
    )
  }
}

export function parseWorkflowViolations(data: unknown): string[] {
  if (!isRecord(data) || !Array.isArray(data.violations)) {
    throw new WorkflowContractError('Workflow conflict response is malformed')
  }
  return data.violations.map((violation: unknown) => {
    if (typeof violation !== 'string') {
      throw new WorkflowContractError('Workflow violation is malformed')
    }
    return violation
  })
}

export async function fetchWorkflowItem(
  kind: WorkflowKind,
  id: Id,
  signal?: AbortSignal
): Promise<WorkflowItem> {
  const path =
    kind === 'video' ? endpoints.mediaWorkflow.video(id) : endpoints.mediaWorkflow.report(id)
  try {
    const { data } = await axiosInstance.get<unknown>(
      r(path),
      silentRequestConfig({ signal, timeout: 15000 })
    )
    return parseWorkflowItem(data)
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) {
      throw new WorkflowInvariantError(parseWorkflowViolations(error.response.data))
    }
    throw error
  }
}
