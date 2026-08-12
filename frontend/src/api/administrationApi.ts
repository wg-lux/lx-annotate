import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'

export type CenterAssignmentStatus = 'assigned' | 'unassigned' | 'incomplete'

export interface CenterChoice {
  centerKey: string
  displayName: string
}

export interface TransferMonitoringJob {
  id: string
  transferKey: string
  resourceKind: 'video' | 'report'
  localStatus: string
  remoteTransferId: string
  remoteTransferStatus: string
  remoteProcessingDecision: string
  targetNodeKey: string
  sourceCenterKey: string | null
  retryCount: number
  lastError: string
  localCleanupPolicy: string
  localCleanupStatus: string
  lastAttemptAt: string | null
  updatedAt: string
}

export type StorageAction = 'drain' | 'resume'
export type StorageOperatorControlAction =
  | 'pause'
  | 'resume'
  | 'reconcile'
  | 'rebalance'
  | 'retry'

export interface StorageNodeOverview {
  nodeKey: string
  displayName: string
  active: boolean
  isDraining: boolean
  isReachable: boolean
  acceptingWrites: boolean
  failureDomain: string
  residencyKey: string
  placementWeight: number
  totalBytes: number
  filesystemFreeBytes: number
  policyUsableBytes: number
  reservedBytes: number
  inFlightBytes: number
  committedBytes: number
  cleanupReclaimableBytes: number
  availableBytes: number
  observedAt: string
  lastProbeAt: string | null
  lastErrorCode: string
  healthFreshnessSeconds: number
  observationVersion: number
  capabilities: string[]
  currentPlacementCount: number
  availableAction: StorageAction
}

export interface StorageBalancingOverview {
  contractAvailable: boolean
  controlPlaneReady: boolean
  dataPlaneOperational: boolean
  topologyState:
    | 'unavailable'
    | 'not_configured'
    | 'single_node_non_redundant'
    | 'multi_node_control_plane_only'
    | 'multi_node_operational'
  policyVersion: string | null
  policyVersions: string[]
  nodes: StorageNodeOverview[]
  placementCount: number
  activeReservationCount: number
  queuedRotationCount: number
  failedRotationCount: number
  failedTransferCount: number
  retiredTransferCount: number
  overdueReservationCount: number
  reservationCounts: Record<string, number>
  rotationCounts: Record<string, number>
  workItems: StorageBalanceWorkItem[]
  reconciliationRunCount: number
  reconciliationAlertCounts: Record<string, number>
  reconciliationCriticalCount: number
  reconciliationWarningCount: number
  lastReconciliationAt: string | null
  planner: {
    status: 'contract_unavailable' | 'contract_incompatible' | 'control_plane_only'
    expectedContractVersion: string
    contractVersion: string | null
    compatible: boolean
    plannerAvailable: boolean
    placementRequestsAccepted: boolean
    queueExecutionEnabled: boolean
    operatorPaused: boolean
    operatorControlVersion: number
  }
  availableActions: StorageAction[]
  readinessBlockers: string[]
  blockedReason: string
}

export interface StorageBalanceWorkItem {
  workItemId: string
  artifactKey: string
  artifactKind: string
  expectedSizeBytes: number
  reason: string
  status: string
  sourceNodeKey: string
  targetNodeKey: string | null
  rotationState: string | null
  reservationStatus: string | null
  cancellable: boolean
  retryable: boolean
  cancellationReceiptId: string | null
  terminalReason: string
  createdAt: string
}

export interface StorageWorkCancellationResult {
  workItemId: string
  cancellationReceiptId: string
  rotationId: string
  reservationId: string
  rotationState: string
  reservationStatus: string
  actor: string
  reason: string
  replayed: boolean
  correlationId: string
}

export interface StorageOperatorControlResult {
  receiptId: string
  action: StorageOperatorControlAction
  controlVersion: number
  isPaused: boolean
  nodeKey: string | null
  workItemId: string | null
  retryTargetSemantics: string
  replayed: boolean
  correlationId: string
  dispatchQueued: boolean
}

export interface StorageActionResult {
  nodeKey: string
  isDraining: boolean
  changed: boolean
  replayed: boolean
  correlationId: string
}

export interface StoragePlanPreviewPayload {
  artifactKey: string
  artifactKind:
    | 'anonymized_video'
    | 'processed_report'
    | 'video_hls'
    | 'streamable_video'
    | 'sidecar'
    | 'manifest'
  expectedSizeBytes: number
  sha256: string
  residencyKey: string
  idempotencyKey: string
  excludedFailureDomains: string[]
  policyVersion: string
  telemetryMaxAgeSeconds: number
  safetyMarginBytes: number
  reservationTtlSeconds: number
}

export interface StoragePlanPreview {
  contractVersion: string
  policyVersion: string
  storageNodeId: number
  storageNodeKey: string
  observationVersion: number
  observedAt: string
  requiredBytes: number
  policyAvailableBytes: number
  filesystemAvailableBytes: number
  persisted: false
  dataPlaneOperational: false
}

export interface AdministrationOverview {
  storageBalancing: StorageBalancingOverview
  hubHealth: {
    ready: boolean
    sourceNodeConfigured: boolean
    sourceNodeKey: string | null
    exactlyOneActiveHub: boolean
    autoQueueEnabled: boolean
    hubNodes: Array<{
      nodeKey: string
      displayName: string
      active: boolean
      owningCenterKey: string | null
      httpsConfigured: boolean
    }>
    transport: {
      requireMtls: boolean
      clientCertificateConfigured: boolean
      clientCertificateReadable: boolean
      clientKeyConfigured: boolean
      clientKeyReadable: boolean
      customCaConfigured: boolean
      customCaReadable: boolean
      ready: boolean
    }
  }
  transferMonitoring: {
    total: number
    counts: Record<string, number>
    recentJobs: TransferMonitoringJob[]
    recentAttentionJobs: TransferMonitoringJob[]
  }
  effectivePermissions: {
    username: string
    roles: string[]
    centerAssignmentStatus: CenterAssignmentStatus
    centerKey: string | null
    centers: CenterChoice[]
    hubMonitorRead: boolean
    storageMonitorRead: boolean
    centerScopeAdmin: boolean
    centerScopeGlobalAdmin: boolean
    centerScopeRoles: {
      delegated: string
      global: string
    }
    membershipAuthority: 'keycloak_groups'
    keycloakRoleMutation: false
  }
}

export interface CenterScopeUser {
  id: number
  username: string
  isActive: boolean
  roles: string[]
  canMutate: boolean
  assignmentStatus: CenterAssignmentStatus
  centers: CenterChoice[]
  center: CenterChoice | null
}

export interface CenterScopeUsersResponse {
  page: number
  pageSize: number
  total: number
  users: CenterScopeUser[]
  centers: CenterChoice[]
}

export async function fetchAdministrationOverview(): Promise<AdministrationOverview> {
  const { data } = await axiosInstance.get<AdministrationOverview>(
    r(endpoints.administration.overview)
  )
  return data
}

export async function fetchCenterScopeUsers(page = 1): Promise<CenterScopeUsersResponse> {
  const { data } = await axiosInstance.get<CenterScopeUsersResponse>(
    r(endpoints.administration.centerScopes),
    { params: { page, page_size: 25 } }
  )
  return data
}

export async function updateStorageDrainState(payload: {
  action: StorageAction
  nodeKey: string
  expectedIsDraining: boolean
  reason: string
  idempotencyKey: string
}): Promise<StorageActionResult> {
  const { data } = await axiosInstance.post<StorageActionResult>(
    r(endpoints.administration.storageActions),
    payload
  )
  return data
}

export async function previewStoragePlacement(
  payload: StoragePlanPreviewPayload
): Promise<StoragePlanPreview> {
  const { data } = await axiosInstance.post<StoragePlanPreview>(
    r(endpoints.administration.storagePlacementPreview),
    payload
  )
  return data
}

export async function cancelStorageBalanceWork(
  workItemId: string,
  payload: { reason: string; idempotencyKey: string }
): Promise<StorageWorkCancellationResult> {
  const { data } = await axiosInstance.post<StorageWorkCancellationResult>(
    r(endpoints.administration.storageWorkCancellation(workItemId)),
    payload
  )
  return data
}

export async function applyStorageOperatorControl(payload: {
  action: StorageOperatorControlAction
  reason: string
  idempotencyKey: string
  workItemId?: string
}): Promise<StorageOperatorControlResult> {
  const { data } = await axiosInstance.post<StorageOperatorControlResult>(
    r(endpoints.administration.storageOperatorControls),
    payload
  )
  return data
}

export async function updateCenterScope(
  userId: number,
  payload: {
    operation: 'assign' | 'revoke'
    centerKey: string
    expectedCenterKeys: string[]
    reason: string
  }
): Promise<{ changed: boolean; user: CenterScopeUser }> {
  const { data } = await axiosInstance.post<{ changed: boolean; user: CenterScopeUser }>(
    r(endpoints.administration.centerScope(userId)),
    payload
  )
  return data
}
