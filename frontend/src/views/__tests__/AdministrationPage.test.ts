import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AdministrationPage from '../AdministrationPage.vue'

const api = vi.hoisted(() => ({
  fetchOverview: vi.fn(),
  fetchUsers: vi.fn(),
  cancelStorageWork: vi.fn(),
  applyStorageControl: vi.fn(),
  updateStorage: vi.fn(),
  updateScope: vi.fn()
}))

const dialogs = {
  confirm: vi.fn<(message?: string) => boolean>(),
  prompt: vi.fn<(message?: string, defaultValue?: string) => string | null>()
}

vi.mock('@/api/administrationApi', () => ({
  fetchAdministrationOverview: api.fetchOverview,
  fetchCenterScopeUsers: api.fetchUsers,
  cancelStorageBalanceWork: api.cancelStorageWork,
  applyStorageOperatorControl: api.applyStorageControl,
  updateStorageDrainState: api.updateStorage,
  updateCenterScope: api.updateScope
}))

const attentionJob = {
  id: 'job-1',
  transferKey: 'site-node__video__resource-hash__processed_v1',
  resourceKind: 'video',
  localStatus: 'failed',
  remoteTransferId: 'remote-job-1',
  remoteTransferStatus: 'inconsistent',
  remoteProcessingDecision: 'mark_inconsistent',
  targetNodeKey: 'hub-node',
  sourceCenterKey: 'center-a',
  retryCount: 2,
  lastError: 'TLS failed',
  localCleanupPolicy: 'retain_processed_media',
  localCleanupStatus: 'retained',
  lastAttemptAt: null,
  updatedAt: '2026-07-13T10:00:00Z'
}

const overview = {
  hostStatus: {
    total: 2,
    active: 1,
    hosts: [
      {
        nodeKey: 'site-node',
        displayName: 'Site Node',
        role: 'site_node',
        roleLabel: 'Site Node',
        owningCenterKey: 'center-a',
        owningCenterName: 'Center A',
        active: true,
        baseUrlConfigured: false,
        httpsConfigured: false,
        updatedAt: '2026-08-11T10:00:00Z'
      },
      {
        nodeKey: 'retired-node',
        displayName: 'Retired Node',
        role: 'storage_node',
        roleLabel: 'Storage Node',
        owningCenterKey: null,
        owningCenterName: null,
        active: false,
        baseUrlConfigured: true,
        httpsConfigured: true,
        updatedAt: '2026-08-10T10:00:00Z'
      }
    ]
  },
  storageBalancing: {
    contractAvailable: true,
    controlPlaneReady: false,
    dataPlaneOperational: false,
    topologyState: 'single_node_non_redundant',
    policyVersion: 'placement-v1',
    policyVersions: ['placement-v1'],
    nodes: [
      {
        nodeKey: 'storage-1',
        displayName: 'Protected Storage 1',
        active: true,
        isDraining: false,
        failureDomain: 'rack-a',
        residencyKey: 'de-clinical',
        placementWeight: 100,
        totalBytes: 10000000000,
        filesystemFreeBytes: 8000000000,
        policyUsableBytes: 7000000000,
        reservedBytes: 500000000,
        inFlightBytes: 250000000,
        committedBytes: 1000000000,
        cleanupReclaimableBytes: 100000000,
        availableBytes: 5250000000,
        observedAt: '2026-08-11T10:00:00Z',
        healthFreshnessSeconds: 30,
        observationVersion: 3,
        capabilities: ['anonymized_video'],
        currentPlacementCount: 4,
        availableAction: 'drain'
      }
    ],
    placementCount: 4,
    activeReservationCount: 1,
    queuedRotationCount: 0,
    failedRotationCount: 0,
    reservationCounts: { active: 1 },
    rotationCounts: {},
    workItems: [
      {
        workItemId: 'a41c1700-95d1-47ea-a975-8f810df47b2c',
        artifactKey: 'video:42',
        artifactKind: 'anonymized_video',
        expectedSizeBytes: 2000000,
        reason: 'drain',
        status: 'rotation_requested',
        sourceNodeKey: 'storage-1',
        targetNodeKey: 'storage-2',
        rotationState: 'requested',
        reservationStatus: 'active',
        cancellable: true,
        retryable: false,
        cancellationReceiptId: null,
        terminalReason: '',
        createdAt: '2026-08-11T10:00:00Z'
      }
    ],
    reconciliationRunCount: 0,
    reconciliationAlertCounts: {},
    reconciliationCriticalCount: 0,
    reconciliationWarningCount: 0,
    lastReconciliationAt: null,
    planner: {
      status: 'control_plane_only',
      expectedContractVersion: 'hub-storage-control-v1',
      contractVersion: 'hub-storage-control-v1',
      compatible: true,
      plannerAvailable: true,
      placementRequestsAccepted: false,
      queueExecutionEnabled: false,
      operatorPaused: false,
      operatorControlVersion: 0
    },
    availableActions: ['drain', 'resume'],
    readinessBlockers: [
      'storage_data_plane_not_integrated',
      'telemetry_freshness_policy_unavailable'
    ],
    blockedReason: 'The storage data-plane service is not implemented.'
  },
  hubHealth: {
    ready: false,
    sourceNodeConfigured: true,
    sourceNodeKey: 'site-node',
    exactlyOneActiveHub: true,
    autoQueueEnabled: true,
    hubNodes: [],
    transport: {
      requireMtls: true,
      clientCertificateConfigured: false,
      clientCertificateReadable: false,
      clientKeyConfigured: false,
      clientKeyReadable: false,
      customCaConfigured: false,
      customCaReadable: false,
      ready: false
    }
  },
  transferMonitoring: {
    total: 2,
    counts: { failed: 1 },
    recentJobs: [attentionJob],
    recentAttentionJobs: [attentionJob]
  },
  effectivePermissions: {
    username: 'admin',
    roles: ['center_scope:admin'],
    centerAssignmentStatus: 'assigned',
    centerKey: 'center-a',
    centers: [{ centerKey: 'center-a', displayName: 'Center A' }],
    hubMonitorRead: true,
    storageMonitorRead: true,
    centerScopeAdmin: true,
    centerScopeGlobalAdmin: true,
    centerScopeRoles: {
      delegated: 'center_scope:admin',
      global: 'center_scope:global_admin'
    },
    membershipAuthority: 'keycloak_groups',
    keycloakRoleMutation: false
  }
}

describe('AdministrationPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    api.fetchOverview.mockResolvedValue(overview)
    api.fetchUsers.mockResolvedValue({
      page: 1,
      pageSize: 25,
      total: 1,
      centers: [{ centerKey: 'center-a', displayName: 'Center A' }],
      users: [
        {
          id: 7,
          username: 'clinician',
          isActive: true,
          roles: ['video:read'],
          canMutate: true,
          assignmentStatus: 'unassigned',
          centers: [],
          center: null
        }
      ]
    })
    api.updateScope.mockResolvedValue({ changed: true })
    api.cancelStorageWork.mockResolvedValue({
      workItemId: 'a41c1700-95d1-47ea-a975-8f810df47b2c',
      cancellationReceiptId: '4d6cf8f6-eae1-495b-85b9-b351701b85dc',
      rotationState: 'failed',
      reservationStatus: 'released'
    })
    api.applyStorageControl.mockResolvedValue({
      receiptId: '9e08bd12-0cc6-456f-b9a3-cd0f4d40ec4a',
      action: 'pause',
      controlVersion: 1,
      isPaused: true,
      replayed: false,
      dispatchQueued: true
    })
    api.updateStorage.mockResolvedValue({
      nodeKey: 'storage-1',
      isDraining: true,
      changed: true,
      replayed: false,
      correlationId: 'request-1'
    })
    dialogs.confirm.mockReturnValue(true)
    dialogs.prompt.mockReturnValue('Planned disk replacement')
    vi.spyOn(window, 'confirm').mockImplementation((message) => dialogs.confirm(message))
    vi.spyOn(window, 'prompt').mockImplementation((message, defaultValue) =>
      dialogs.prompt(message, defaultValue)
    )
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows sanitized monitoring and read-only effective roles', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    expect(wrapper.get('[data-test="transfer-monitoring"]').text()).toContain('TLS failed')
    expect(wrapper.get('[data-test="transfer-monitoring"]').text()).toContain('job-1')
    expect(wrapper.get('[data-test="transfer-monitoring"]').text()).toContain(
      'site-node__video__resource-hash__processed_v1'
    )
    expect(wrapper.get('[data-test="transfer-monitoring"]').text()).toContain('remote-job-1')
    expect(wrapper.get('[data-test="transfer-monitoring"]').text()).toContain('Aufbewahrt')
    expect(wrapper.get('[data-test="effective-permissions"]').text()).toContain(
      'center_scope:admin'
    )
    expect(wrapper.text()).toContain('Keycloak-Rollen ändern')
    expect(wrapper.get('[data-test="effective-permissions"]').text()).toContain(
      'Realm-Rolle direkt in Keycloak'
    )
    wrapper.unmount()
  })

  it('shows every configured host including inactive hosts', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    const hosts = wrapper.get('[data-test="host-status"]')
    expect(hosts.text()).toContain('1 / 2 aktiv')
    expect(hosts.text()).toContain('Site Node')
    expect(hosts.text()).toContain('Retired Node')
    expect(wrapper.get('[data-test="host-status-retired-node"]').text()).toBe('Inaktiv')
    wrapper.unmount()
  })

  it('shows a single storage node as non-redundant and does not imply a data plane', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    const storage = wrapper.get('[data-test="storage-balancing"]')
    expect(storage.text()).toContain('Einzelknoten · nicht redundant')
    expect(storage.text()).toContain('Protected Storage 1')
    expect(storage.text()).toContain('The storage data-plane service is not implemented.')
    expect(storage.text()).toContain('5.250 MB')
    expect(storage.text()).toContain('Nur Planung · keine Ausführung')
    expect(storage.text()).toContain('Queue-Ausführung')
    expect(storage.text()).toContain('Deaktiviert')
    wrapper.unmount()
  })

  it('does not render an inactive storage node as healthy', async () => {
    const inactiveOverview = structuredClone(overview)
    inactiveOverview.storageBalancing.nodes[0].active = false
    api.fetchOverview.mockResolvedValue(inactiveOverview)
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    const badge = wrapper.get('[data-test="storage-node-status-storage-1"]')
    expect(badge.text()).toBe('Inaktiv')
    expect(badge.classes()).toContain('bg-secondary')
    expect(badge.classes()).not.toContain('bg-success')
    wrapper.unmount()
  })

  it('submits an explicitly confirmed storage drain with a reason', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    await wrapper.get('[data-test="storage-node-action-storage-1"]').trigger('click')
    await flushPromises()

    expect(dialogs.prompt).toHaveBeenCalled()
    expect(dialogs.confirm).toHaveBeenCalledWith(
      'Storage-Knoten storage-1 für neue Platzierungen sperren?'
    )
    expect(api.updateStorage).toHaveBeenCalledWith({
      action: 'drain',
      nodeKey: 'storage-1',
      expectedIsDraining: false,
      reason: 'Planned disk replacement',
      idempotencyKey: '00000000-0000-4000-8000-000000000001'
    })
    wrapper.unmount()
  })

  it('shows and explicitly cancels only compensatable balance work', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    const work = wrapper.get('[data-test="storage-balance-work"]')
    expect(work.text()).toContain('video:42')
    expect(work.text()).toContain('storage-1 → storage-2')
    await wrapper
      .get('[data-test="cancel-storage-work-a41c1700-95d1-47ea-a975-8f810df47b2c"]')
      .trigger('click')
    await flushPromises()

    expect(api.cancelStorageWork).toHaveBeenCalledWith('a41c1700-95d1-47ea-a975-8f810df47b2c', {
      reason: 'Planned disk replacement',
      idempotencyKey: '00000000-0000-4000-8000-000000000001'
    })
    wrapper.unmount()
  })

  it('persists an explicitly confirmed operator pause intent', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    await wrapper.get('[data-test="storage-operator-controls"] button').trigger('click')
    await flushPromises()

    expect(api.applyStorageControl).toHaveBeenCalledWith({
      action: 'pause',
      reason: 'Planned disk replacement',
      idempotencyKey: '00000000-0000-4000-8000-000000000001'
    })
    wrapper.unmount()
  })

  it('submits an explicit center assignment with the conflict token and reason', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    await wrapper
      .get('[data-test="center-scope-management"] button.btn-outline-primary')
      .trigger('click')
    await wrapper.get('textarea').setValue('Approved onboarding')
    await wrapper.get('.change-panel').trigger('submit')
    await flushPromises()

    expect(api.updateScope).toHaveBeenCalledWith(7, {
      operation: 'assign',
      centerKey: 'center-a',
      expectedCenterKeys: [],
      reason: 'Approved onboarding'
    })
    wrapper.unmount()
  })

  it('allows a global administrator to assign an incomplete Keycloak user', async () => {
    api.fetchUsers.mockResolvedValueOnce({
      page: 1,
      pageSize: 25,
      total: 1,
      centers: [{ centerKey: 'center-a', displayName: 'Center A' }],
      users: [
        {
          id: 8,
          username: 'new-clinician',
          isActive: true,
          roles: ['video:read'],
          canMutate: true,
          assignmentStatus: 'incomplete',
          centers: [],
          center: null
        }
      ]
    })
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    await wrapper
      .get('[data-test="center-scope-management"] button.btn-outline-primary')
      .trigger('click')
    await wrapper.get('textarea').setValue('Approved onboarding')
    await wrapper.get('.change-panel').trigger('submit')
    await flushPromises()

    expect(api.updateScope).toHaveBeenCalledWith(8, {
      operation: 'assign',
      centerKey: 'center-a',
      expectedCenterKeys: [],
      reason: 'Approved onboarding'
    })
    wrapper.unmount()
  })

  it('revokes only the selected membership from a multi-center user', async () => {
    api.fetchUsers.mockResolvedValueOnce({
      page: 1,
      pageSize: 25,
      total: 1,
      centers: [
        { centerKey: 'center-a', displayName: 'Center A' },
        { centerKey: 'center-b', displayName: 'Center B' }
      ],
      users: [
        {
          id: 9,
          username: 'multi-center-clinician',
          isActive: true,
          roles: ['video:read'],
          canMutate: true,
          assignmentStatus: 'assigned',
          centers: [
            { centerKey: 'center-a', displayName: 'Center A' },
            { centerKey: 'center-b', displayName: 'Center B' }
          ],
          center: null
        }
      ]
    })
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    const revokeCenterB = wrapper
      .findAll('button.btn-outline-danger')
      .find((button) => button.text().includes('Center B'))
    if (!revokeCenterB) throw new Error('Center B revoke button was not rendered')
    await revokeCenterB.trigger('click')
    await wrapper.get('textarea').setValue('Secondary access ended')
    await wrapper.get('.change-panel').trigger('submit')
    await flushPromises()

    expect(api.updateScope).toHaveBeenCalledWith(9, {
      operation: 'revoke',
      centerKey: 'center-b',
      expectedCenterKeys: ['center-a', 'center-b'],
      reason: 'Secondary access ended'
    })
    wrapper.unmount()
  })
})
