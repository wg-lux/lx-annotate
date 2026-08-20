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
      offloadEligibleVideos: 'hub-export/offload-eligible-videos/',
      retry: (jobId: string) => `hub-export/jobs/${jobId}/retry/`,
      unmark: 'hub-export/unmark/'
    },
    media: {
      videoMarkReadyForExport: (id: number) => `media/videos/${String(id)}/mark-ready-for-export/`
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
            markedByUsername: null,
            markedAt: null,
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

  it('shows persisted marker attribution for marked resources', async () => {
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
            id: 41,
            resourceKind: 'report',
            filename: 'report-marked.pdf',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: true,
            markedByUsername: 'hub-operator',
            markedAt: '2026-08-03T12:00:00Z',
            outboundStatus: 'marked',
            lastError: '',
            blockedReason: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: '2026-08-03T11:00:00Z'
          }
        ]
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    const marker = wrapper.get('[data-test="hub-export-marker-report-41"]')
    expect(marker.text()).toContain('hub-operator')
    expect(marker.text()).toContain('03.08.26')
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
    expect(wrapper.text()).toContain('Die Segmentbereinigung läuft noch.')
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
      'Die anonymisierte verarbeitete Datei fehlt noch.'
    )
    expect(wrapper.get('[data-test="hub-sync-duplicates"]').text()).toContain('queued')
    expect(wrapper.text()).toContain('rejected.pdf')
  })

  it('shows progress stages without rendering transfer problems as red errors', async () => {
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
        items: [
          {
            id: 51,
            resourceKind: 'video',
            filename: 'uploading.mp4',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: true,
            outboundStatus: 'uploading',
            lastError: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: '2026-04-08T12:00:00Z'
          },
          {
            id: 52,
            resourceKind: 'report',
            filename: 'waiting.pdf',
            anonymizationStatus: 'validated',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: true,
            outboundStatus: 'failed',
            failureClass: 'authorization_denial',
            lastError: 'Hub temporarily unavailable',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: '2026-04-08T12:00:00Z'
          },
          {
            id: 53,
            resourceKind: 'video',
            filename: 'cleanup.mp4',
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

    expect(wrapper.get('[data-test="hub-transfer-active-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="hub-transfer-attention-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="hub-transfer-prerequisite-count"]').text()).toContain('1')
    expect(wrapper.get('[data-test="hub-transfer-overall-progress"]').text()).toContain('50 %')
    expect(wrapper.get('[data-test="hub-transfer-progress-video-51"]').text()).toContain(
      'Datei wird übertragen'
    )
    expect(wrapper.get('[data-test="hub-transfer-progress-report-52"]').text()).toContain(
      'Wartet auf erneuten Versuch'
    )
    expect(wrapper.text()).toContain('Node-Autorisierung abgelehnt')
    expect(wrapper.text()).toContain('Die Segmentbereinigung läuft noch.')
    expect(wrapper.find('.alert-danger').exists()).toBe(false)
    expect(wrapper.find('.bg-danger').exists()).toBe(false)

    wrapper.unmount()
  })

  it('shows canonical workflow states and a marking-time integrity rejection', async () => {
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
            id: 61,
            resourceKind: 'video',
            filename: 'integrity-race.mp4',
            anonymizationStatus: 'validated',
            segmentAnnotationStatus: 'validated',
            exportIntegrityStatus: 'persisted_verified',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            markedByUsername: null,
            markedAt: null,
            outboundStatus: '',
            lastError: '',
            blockedReason: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: null
          }
        ]
      }
    })
    hoisted.post.mockRejectedValue({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: {
        data: {
          detail: 'Video 61 is not eligible for hub export: processed media hash mismatch.'
        }
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    expect(wrapper.get('[data-test="hub-export-segment-status-video-61"]').text()).toBe('Validiert')
    expect(wrapper.get('[data-test="hub-export-integrity-status-video-61"]').text()).toBe(
      'Nachweis vorhanden'
    )

    await wrapper.get('[data-test="hub-export-select-video-61"]').setValue(true)
    await wrapper.get('[data-test="hub-export-mark-selected"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="hub-export-operation-error"]').text()).toContain(
      'processed media hash mismatch'
    )
    expect(
      wrapper.get('[data-test="hub-export-select-video-61"]').attributes('checked')
    ).toBeDefined()
  })

  it('offers row and bulk export-readiness checks in German', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [],
        configReady: true,
        configError: '',
        privacySummary: null,
        syncSummary: null,
        items: [
          {
            id: 2,
            resourceKind: 'video',
            filename: 'NINJAU_S001_S001_T004.mp4',
            anonymizationStatus: 'validated',
            segmentAnnotationStatus: 'validated',
            exportIntegrityStatus: 'not_ready',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            markedByUsername: null,
            markedAt: null,
            outboundStatus: '',
            lastError: '',
            blockedReason: 'not ready for export',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: false,
            createdAt: null
          }
        ]
      }
    })
    hoisted.post.mockResolvedValue({ data: { success: true, readyForExport: true } })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    expect(wrapper.get('[data-test="hub-export-check-readiness-video-2"]').text()).toBe(
      'Exportfreigabe prüfen'
    )
    expect(wrapper.get('[data-test="hub-export-check-readiness-all"]').text()).toBe(
      'Alle Videos auf Exportfreigabe prüfen'
    )

    await wrapper.get('[data-test="hub-export-check-readiness-video-2"]').trigger('click')
    await flushPromises()

    expect(hoisted.post).toHaveBeenCalledWith('/api/media/videos/2/mark-ready-for-export/', {
      centerKey: 'center-a'
    })
  })

  it('queues all eligible videos through the German bulk transfer button', async () => {
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
        privacySummary: null,
        syncSummary: null,
        items: [
          {
            id: 71,
            resourceKind: 'video',
            filename: 'eligible.mp4',
            anonymizationStatus: 'validated',
            segmentAnnotationStatus: 'validated',
            exportIntegrityStatus: 'verified',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            markedByUsername: null,
            markedAt: null,
            outboundStatus: '',
            lastError: '',
            blockedReason: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: null
          }
        ]
      }
    })
    hoisted.post.mockResolvedValue({
      data: {
        targetNodeKey: 'hub-node',
        discoveredCount: 1,
        eligibleCount: 1,
        queuedCount: 1,
        alreadyRegisteredCount: 0,
        skippedCount: 0
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    const button = wrapper.get('[data-test="hub-export-offload-eligible-videos"]')
    expect(button.text()).toBe('Alle geeigneten Videos zum Hub übertragen')
    await button.trigger('click')
    await flushPromises()

    expect(hoisted.post).toHaveBeenCalledWith('/api/hub-export/offload-eligible-videos/', {
      targetNodeKey: 'hub-node'
    })
  })

  it('filters hub resources by resource type and processed-media storage state', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        selectedTargetNodeKey: 'hub-node',
        sourceNodeKey: 'site-node',
        hubNodes: [],
        configReady: true,
        configError: '',
        privacySummary: null,
        syncSummary: null,
        items: [
          {
            id: 81,
            resourceKind: 'video',
            filename: 'stored-video.mp4',
            anonymizationStatus: 'validated',
            segmentAnnotationStatus: 'validated',
            exportIntegrityStatus: 'verified',
            processedMediaPresent: true,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            markedByUsername: null,
            markedAt: null,
            outboundStatus: '',
            lastError: '',
            blockedReason: '',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: true,
            createdAt: null
          },
          {
            id: 82,
            resourceKind: 'report',
            filename: 'missing-report.pdf',
            anonymizationStatus: 'validated',
            segmentAnnotationStatus: 'not_started',
            exportIntegrityStatus: 'missing_processed_media',
            processedMediaPresent: false,
            sourceCenterKey: 'center-a',
            sourceCenterName: 'Center A',
            markedForUpload: false,
            markedByUsername: null,
            markedAt: null,
            outboundStatus: '',
            lastError: '',
            blockedReason: 'processed media missing',
            lastTransferTimestamp: null,
            targetNodeKey: 'hub-node',
            eligible: false,
            createdAt: null
          }
        ]
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    await wrapper.get('[data-test="hub-resource-type-filter"]').setValue('report')
    let rows = wrapper.findAll('.table-responsive > table.table-hover tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('missing-report.pdf')
    expect(wrapper.get('[data-test="hub-export-table-filters"]').text()).toContain(
      '1 von 2 Ressourcen'
    )

    await wrapper.get('[data-test="hub-storage-state-filter"]').setValue('present')
    expect(wrapper.text()).toContain('Keine passenden Ressourcen')

    await wrapper.get('[data-test="hub-table-filters-reset"]').trigger('click')
    rows = wrapper.findAll('.table-responsive > table.table-hover tbody tr')
    expect(rows).toHaveLength(2)

    await wrapper.get('[data-test="hub-storage-state-filter"]').setValue('missing')
    rows = wrapper.findAll('.table-responsive > table.table-hover tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('missing-report.pdf')
  })

  it('offers an explicit retry for a failed transfer job', async () => {
    hoisted.get
      .mockResolvedValueOnce({
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
          privacySummary: null,
          syncSummary: null,
          items: [
            {
              id: 91,
              resourceKind: 'video',
              filename: 'failed-video.mp4',
              anonymizationStatus: 'validated',
              segmentAnnotationStatus: 'validated',
              exportIntegrityStatus: 'verified',
              processedMediaPresent: true,
              sourceCenterKey: 'center-a',
              sourceCenterName: 'Center A',
              markedForUpload: true,
              markedByUsername: 'hub-operator',
              markedAt: '2026-08-20T08:00:00Z',
              outboundJobId: 'job-91',
              outboundStatus: 'failed',
              failureClass: 'configuration_rejection',
              lastError: 'Hub transfer configuration or payload was rejected.',
              blockedReason: '',
              lastTransferTimestamp: null,
              targetNodeKey: 'hub-node',
              eligible: true,
              createdAt: '2026-08-20T08:00:00Z'
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: {
          selectedTargetNodeKey: 'hub-node',
          sourceNodeKey: 'site-node',
          hubNodes: [],
          configReady: true,
          configError: '',
          privacySummary: null,
          syncSummary: null,
          items: []
        }
      })
    hoisted.post.mockResolvedValue({
      data: {
        outboundJobId: 'job-91',
        transferKey: 'site-node__video__hash__processed_v1',
        localStatus: 'queued'
      }
    })

    const wrapper = mount(HubExportOverviewComponent)
    await flushPromises()

    const retryButton = wrapper.get('[data-test="hub-export-retry-job-91"]')
    expect(retryButton.text()).toBe('Erneut versuchen')
    await retryButton.trigger('click')
    await flushPromises()

    expect(hoisted.post).toHaveBeenCalledWith('/api/hub-export/jobs/job-91/retry/')
  })
})
