import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import HubExportOverviewComponent from '../HubExportOverviewComponent.vue'
import { useHubExportStore } from '@/stores/hubExportStore'
import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  r: (path: string) => `/api/${path}`,
  default: {
    get: hoisted.get,
    post: hoisted.post
  }
}))

vi.mock('@/types/api/endpoints', () => ({
  endpoints: {
    hubExport: {
      overview: 'hub-export/overview/',
      mark: 'hub-export/mark/',
      unmark: 'hub-export/unmark/'
    }
  }
}))

describe('HubExportOverviewComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('bulk-marks selected eligible items', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [{ nodeKey: 'hub-node', displayName: 'Hub', baseUrl: 'https://hub.example', owningCenterKey: 'center-a' }],
        configReady: true,
        configError: '',
        items: [
          {
            id: 11,
            resourceKind: 'report',
            filename: 'report-a.pdf',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            outboundStatus: '',
            lastError: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: '2026-04-08T12:00:00Z'
          }
        ]
      }
    })
    hoisted.post.mockResolvedValue({ data: { markedCount: 1, targetNodeKey: 'hub-node' } })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    await wrapper.get('[data-test="hub-export-select-all"]').setValue(true)
    await wrapper.get('[data-test="hub-export-mark-selected"]').trigger('click')
    await flushPromises()

    expect(hoisted.post).toHaveBeenCalledWith(`/api/${endpoints.hubExport.mark}`, {
      targetNodeKey: 'hub-node',
      resources: [{ id: 11, resourceKind: 'report' }]
    })
  })

  it('shows configuration warnings and bulk-unmarks marked items', async () => {
    hoisted.get
      .mockResolvedValueOnce({
        data: {
          selectedTargetNodeKey: null,
          sourceNodeKey: 'site-node',
          hubNodes: [
            { nodeKey: 'hub-node-a', displayName: 'Hub A', baseUrl: 'https://hub-a.example', owningCenterKey: 'center-a' },
            { nodeKey: 'hub-node-b', displayName: 'Hub B', baseUrl: 'https://hub-b.example', owningCenterKey: 'center-a' }
          ],
          configReady: false,
          configError: 'Normal sender mode requires exactly one active central hub node.',
          items: [
            {
              id: 21,
              resourceKind: 'video',
              filename: 'video-a.mp4',
              anonymizationStatus: 'validated',
              processedMediaPresent: true,
              sourceCenterKey: 'center-a',
              sourceCenterName: 'Center A',
              markedForUpload: true,
              outboundStatus: 'marked',
              lastError: '',
              lastTransferTimestamp: null,
              targetNodeKey: 'hub-node-a',
              eligible: true,
              createdAt: '2026-04-08T12:00:00Z'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          selectedTargetNodeKey: 'hub-node-a',
          sourceNodeKey: 'site-node',
          hubNodes: [{ nodeKey: 'hub-node-a', displayName: 'Hub A', baseUrl: 'https://hub-a.example', owningCenterKey: 'center-a' }],
          configReady: true,
          configError: '',
          items: [
            {
              id: 21,
              resourceKind: 'video',
              filename: 'video-a.mp4',
              anonymizationStatus: 'validated',
              processedMediaPresent: true,
              sourceCenterKey: 'center-a',
              sourceCenterName: 'Center A',
              markedForUpload: true,
              outboundStatus: 'marked',
              lastError: '',
              lastTransferTimestamp: null,
              targetNodeKey: 'hub-node-a',
              eligible: true,
              createdAt: '2026-04-08T12:00:00Z'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          selectedTargetNodeKey: 'hub-node-a',
          sourceNodeKey: 'site-node',
          hubNodes: [{ nodeKey: 'hub-node-a', displayName: 'Hub A', baseUrl: 'https://hub-a.example', owningCenterKey: 'center-a' }],
          configReady: true,
          configError: '',
          items: []
        }
      })
    hoisted.post.mockResolvedValue({ data: { unmarkedCount: 1, targetNodeKey: 'hub-node-a' } })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()
    expect(wrapper.get('[data-test="hub-export-config-warning"]').text()).toContain(
      'exactly one active central hub node'
    )

    const store = useHubExportStore()
    store.selectedTargetNodeKey = 'hub-node-a'
    await store.fetchOverview('hub-node-a')
    await flushPromises()

    await wrapper.get('[data-test="hub-export-select-all"]').setValue(true)
    await wrapper.get('[data-test="hub-export-unmark-selected"]').trigger('click')
    await flushPromises()

    expect(hoisted.post).toHaveBeenCalledWith(`/api/${endpoints.hubExport.unmark}`, {
      targetNodeKey: 'hub-node-a',
      resources: [{ id: 21, resourceKind: 'video' }]
    })
  })

  it('shows a warning privacy badge and k-anonymity metrics', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [{ nodeKey: 'hub-node', displayName: 'Hub', baseUrl: 'https://hub.example', owningCenterKey: 'center-a' }],
        configReady: true,
        configError: '',
        privacySummary: {
          minK: 5,
          eligibleResourceCount: 3,
          eligibleCaseCount: 3,
          markedResourceCount: 0,
          smallestEquivalenceClassSize: 3,
          violatingEquivalenceClassCount: 1,
          passesKAnonymity: false,
          status: 'warning'
        },
        items: [
          {
            id: 31,
            resourceKind: 'report',
            filename: 'report-small.pdf',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            outboundStatus: '',
            lastError: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: '2026-04-08T12:00:00Z'
          }
        ]
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    expect(wrapper.get('[data-test="hub-export-privacy-summary"]').text()).toContain('K-Anonymität k=5')
    expect(wrapper.get('[data-test="hub-export-privacy-badge"]').text()).toBe('nicht ausreichend')
    expect(wrapper.get('[data-test="hub-export-privacy-smallest-class"]').text()).toBe('3')
    expect(wrapper.get('[data-test="hub-export-privacy-violating-classes"]').text()).toBe('1')
  })

  it('shows ineligible videos when the backend provides a blocked reason', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [{ nodeKey: 'hub-node', displayName: 'Hub', baseUrl: 'https://hub.example', owningCenterKey: 'center-a' }],
        configReady: true,
        configError: '',
        items: [
          {
            id: 31,
            resourceKind: 'video',
            filename: 'video-cleanup.mp4',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            outboundStatus: '',
            lastError: '',
            blockedReason: 'segment cleanup pending',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: false,
            createdAt: '2026-04-08T12:00:00Z'
          }
        ]
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    expect(wrapper.text()).toContain('video-cleanup.mp4')
    expect(wrapper.text()).toContain('segment cleanup pending')
    expect(wrapper.get('[data-test="hub-export-select-video-31"]').attributes('disabled')).toBeDefined()
  })
})
