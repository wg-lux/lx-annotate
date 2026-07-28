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

export interface AdministrationOverview {
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
