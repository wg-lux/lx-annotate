import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AdministrationPage from '../AdministrationPage.vue'

const api = vi.hoisted(() => ({
  fetchOverview: vi.fn(),
  fetchUsers: vi.fn(),
  updateScope: vi.fn()
}))

vi.mock('@/api/administrationApi', () => ({
  fetchAdministrationOverview: api.fetchOverview,
  fetchCenterScopeUsers: api.fetchUsers,
  updateCenterScope: api.updateScope
}))

const overview = {
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
    recentAttentionJobs: [
      {
        id: 'job-1',
        resourceKind: 'video',
        localStatus: 'failed',
        targetNodeKey: 'hub-node',
        sourceCenterKey: 'center-a',
        retryCount: 2,
        lastError: 'TLS failed',
        lastAttemptAt: null,
        updatedAt: '2026-07-13T10:00:00Z'
      }
    ]
  },
  effectivePermissions: {
    username: 'admin',
    roles: ['center_scope:admin'],
    centerAssignmentStatus: 'assigned',
    centerKey: 'center-a',
    hubMonitorRead: true,
    centerScopeAdmin: true,
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
          center: null
        }
      ]
    })
    api.updateScope.mockResolvedValue({ changed: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows sanitized monitoring and read-only effective roles', async () => {
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    expect(wrapper.get('[data-test="transfer-monitoring"]').text()).toContain('TLS failed')
    expect(wrapper.get('[data-test="effective-permissions"]').text()).toContain(
      'center_scope:admin'
    )
    expect(wrapper.text()).toContain('Keycloak-Rollen ändern')
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
      expectedCenterKey: null,
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
          center: null
        }
      ]
    })
    const wrapper = mount(AdministrationPage)
    await flushPromises()

    await wrapper.get('button.btn-outline-primary').trigger('click')
    await wrapper.get('textarea').setValue('Approved onboarding')
    await wrapper.get('.change-panel').trigger('submit')
    await flushPromises()

    expect(api.updateScope).toHaveBeenCalledWith(8, {
      operation: 'assign',
      centerKey: 'center-a',
      expectedCenterKey: null,
      reason: 'Approved onboarding'
    })
    wrapper.unmount()
  })
})
