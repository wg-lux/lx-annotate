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
        hubNodes: [
          {
            nodeKey: 'hub-node',
            displayName: 'Hub',
            baseUrl: 'https://hub.example',
            owningCenterKey: 'center-a'
          }
        ],
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
            {
              nodeKey: 'hub-node-a',
              displayName: 'Hub A',
              baseUrl: 'https://hub-a.example',
              owningCenterKey: 'center-a'
            },
            {
              nodeKey: 'hub-node-b',
              displayName: 'Hub B',
              baseUrl: 'https://hub-b.example',
              owningCenterKey: 'center-a'
            }
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
          hubNodes: [
            {
              nodeKey: 'hub-node-a',
              displayName: 'Hub A',
              baseUrl: 'https://hub-a.example',
              owningCenterKey: 'center-a'
            }
          ],
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
          hubNodes: [
            {
              nodeKey: 'hub-node-a',
              displayName: 'Hub A',
              baseUrl: 'https://hub-a.example',
              owningCenterKey: 'center-a'
            }
          ],
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
        hubNodes: [
          {
            nodeKey: 'hub-node',
            displayName: 'Hub',
            baseUrl: 'https://hub.example',
            owningCenterKey: 'center-a'
          }
        ],
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

    expect(wrapper.get('[data-test="hub-export-privacy-summary"]').text()).toContain(
      'K-Anonymität k=5'
    )
    expect(wrapper.get('[data-test="hub-export-privacy-badge"]').text()).toBe('nicht ausreichend')
    expect(wrapper.get('[data-test="hub-export-privacy-smallest-class"]').text()).toBe('3')
    expect(wrapper.get('[data-test="hub-export-privacy-violating-classes"]').text()).toBe('1')
  })

  it('shows ineligible videos when the backend provides a blocked reason', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [
          {
            nodeKey: 'hub-node',
            displayName: 'Hub',
            baseUrl: 'https://hub.example',
            owningCenterKey: 'center-a'
          }
        ],
        configReady: true,
        configError: '',
        syncSummary: {
          centers: [
            {
              centerKey: 'center-a',
              displayName: 'Center A',
              activeNodeKeys: ['site-node'],
              processedFiles: [
                {
                  resourceKind: 'video',
                  resourceId: 31,
                  filename: 'video-cleanup.mp4',
                  resourceHash: 'cleanup-hash',
                  processedFileHash: 'cleanup-processed-hash',
                  centerKey: 'center-a',
                  centerName: 'Center A',
                  eligible: false,
                  transferRegistered: false,
                  transferKey: null,
                  transferStatus: '',
                  targetNodeKey: null
                }
              ],
              candidateCount: 0,
              rejectionCount: 1,
              duplicateCount: 0
            }
          ],
          rejections: [
            {
              resourceKind: 'video',
              resourceId: 31,
              filename: 'video-cleanup.mp4',
              centerKey: 'center-a',
              reason: 'segment_cleanup_pending',
              detail: 'segment cleanup pending'
            }
          ],
          duplicates: [],
          processedFileCount: 1,
          candidateCount: 0
        },
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
    expect(
      wrapper.get('[data-test="hub-export-select-video-31"]').attributes('disabled')
    ).toBeDefined()
  })

  it('summarizes centers, processed files, rejections, and registered transfers', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [
          {
            nodeKey: 'hub-node',
            displayName: 'Hub',
            baseUrl: 'https://hub.example',
            owningCenterKey: null
          }
        ],
        configReady: true,
        configError: '',
        syncSummary: {
          centers: [
            {
              centerKey: 'center-a',
              displayName: 'Center A',
              activeNodeKeys: ['site-node'],
              processedFiles: [
                {
                  resourceKind: 'video',
                  resourceId: 41,
                  filename: 'candidate.mp4',
                  resourceHash: 'candidate-hash',
                  processedFileHash: 'candidate-processed-hash',
                  centerKey: 'center-a',
                  centerName: 'Center A',
                  eligible: true,
                  transferRegistered: false,
                  transferKey: null,
                  transferStatus: '',
                  targetNodeKey: null
                },
                {
                  resourceKind: 'video',
                  resourceId: 43,
                  filename: 'registered.mp4',
                  resourceHash: 'registered-hash',
                  processedFileHash: 'registered-processed-hash',
                  centerKey: 'center-a',
                  centerName: 'Center A',
                  eligible: true,
                  transferRegistered: true,
                  transferKey: 'site-node__video__registered-hash__processed_v1',
                  transferStatus: 'queued',
                  targetNodeKey: 'hub-node'
                }
              ],
              candidateCount: 1,
              rejectionCount: 0,
              duplicateCount: 1
            },
            {
              centerKey: 'center-b',
              displayName: 'Center B',
              activeNodeKeys: [],
              processedFiles: [],
              candidateCount: 0,
              rejectionCount: 1,
              duplicateCount: 0
            }
          ],
          rejections: [
            {
              resourceKind: 'report',
              resourceId: 42,
              filename: 'rejected.pdf',
              centerKey: 'center-b',
              reason: 'missing_processed_file',
              detail: 'processed media missing'
            }
          ],
          duplicates: [
            {
              resourceKind: 'video',
              resourceId: 43,
              filename: 'registered.mp4',
              centerKey: 'center-a',
              reason: 'transfer_already_registered',
              transferKey: 'site-node__video__registered-hash__processed_v1',
              transferStatus: 'queued',
              targetNodeKey: 'hub-node'
            }
          ],
          processedFileCount: 2,
          candidateCount: 1
        },
        items: [
          {
            id: 41,
            resourceKind: 'video',
            filename: 'candidate.mp4',
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
            createdAt: null
          },
          {
            id: 42,
            resourceKind: 'report',
            filename: 'rejected.pdf',
            anonymizationStatus: 'not_started',
            processedMediaPresent: false,
            sourceCenterKey: 'center-b',
            sourceCenterName: 'Center B',
            markedForUpload: false,
            outboundStatus: '',
            lastError: '',
            blockedReason: 'processed media missing',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: false,
            createdAt: null
          },
          {
            id: 43,
            resourceKind: 'video',
            filename: 'registered.mp4',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: true,
            outboundStatus: 'queued',
            lastError: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: null
          }
        ]
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    expect(wrapper.get('[data-test="hub-sync-center-count"]').text()).toContain('2')
    expect(wrapper.get('[data-test="hub-sync-processed-count"]').text()).toContain('2')
    expect(wrapper.get('[data-test="hub-sync-rejection-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="hub-sync-duplicate-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="hub-sync-center-center-a"]').text()).toContain('Center A')
    expect(wrapper.get('[data-test="hub-sync-rejections"]').text()).toContain(
      'processed media missing'
    )
    expect(wrapper.get('[data-test="hub-sync-duplicates"]').text()).toContain('queued')
    expect(wrapper.text()).toContain('rejected.pdf')
  })
})
