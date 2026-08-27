import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useHubExportStore } from '@/stores/hubExportStore'

const service = vi.hoisted(() => ({
  fetchOverview: vi.fn(),
  markResources: vi.fn(),
  unmarkResources: vi.fn(),
  offloadEligibleVideos: vi.fn(),
  retryFailedJob: vi.fn(),
  checkVideoReadiness: vi.fn()
}))

vi.mock('@/api/hubExportService', () => ({ hubExportService: service }))

const overview = {
  selectedTargetNodeKey: 'hub-1',
  sourceNodeKey: 'site-1',
  hubNodes: [
    {
      nodeKey: 'hub-1',
      displayName: 'Hub One',
      baseUrl: 'https://hub.example',
      owningCenterKey: 'center-a'
    }
  ],
  configReady: true,
  configError: '',
  privacySummary: null,
  syncSummary: null,
  items: []
}

describe('useHubExportStore AAA boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('hydrates every overview state boundary and clears loading', async () => {
    // Arrange
    service.fetchOverview.mockResolvedValue(overview)
    const store = useHubExportStore()

    // Act
    const result = await store.fetchOverview('hub-1')

    // Assert
    expect(service.fetchOverview).toHaveBeenCalledWith('hub-1')
    expect(result).toBe(overview)
    expect(store.$state).toMatchObject({
      loading: false,
      error: null,
      selectedTargetNodeKey: 'hub-1',
      sourceNodeKey: 'site-1',
      configReady: true
    })
  })

  it('surfaces overview failures and always clears loading', async () => {
    // Arrange
    const failure = new Error('overview unavailable')
    service.fetchOverview.mockRejectedValue(failure)
    const store = useHubExportStore()

    // Act
    const action = store.fetchOverview()

    // Assert
    await expect(action).rejects.toBe(failure)
    expect(store.error).toBe('overview unavailable')
    expect(store.loading).toBe(false)
  })

  it('delegates marking then refreshes the selected target', async () => {
    // Arrange
    service.markResources.mockResolvedValue(undefined)
    service.fetchOverview.mockResolvedValue(overview)
    const store = useHubExportStore()
    store.selectedTargetNodeKey = 'hub-1'
    const resources = [{ id: 9, resourceKind: 'video' as const }]

    // Act
    await store.markResources(resources)

    // Assert
    expect(service.markResources).toHaveBeenCalledWith('hub-1', resources)
    expect(service.fetchOverview).toHaveBeenCalledWith('hub-1')
    expect(store.mutationError).toBeNull()
  })

  it('fails before calling a mutation when no target is selected', async () => {
    // Arrange
    const store = useHubExportStore()

    // Act
    const action = store.unmarkResources([{ id: 3, resourceKind: 'report' }])

    // Assert
    await expect(action).rejects.toThrow('Kein Hub-Ziel ausgewählt.')
    expect(service.unmarkResources).not.toHaveBeenCalled()
  })

  it('counts readiness failures and refreshes once after all checks settle', async () => {
    // Arrange
    service.checkVideoReadiness
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('hash mismatch'))
    service.fetchOverview.mockResolvedValue(overview)
    const store = useHubExportStore()
    store.selectedTargetNodeKey = 'hub-1'

    // Act
    const result = await store.checkVideoExportReadiness([
      { id: 1, centerKey: 'center-a' },
      { id: 2, centerKey: 'center-a' }
    ])

    // Assert
    expect(result).toEqual({ checkedCount: 1, failedCount: 1 })
    expect(service.checkVideoReadiness).toHaveBeenCalledTimes(2)
    expect(service.fetchOverview).toHaveBeenCalledTimes(1)
    expect(store.mutationError).toContain('1 von 2 Videos geprüft')
  })
})
