import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { remove } = vi.hoisted(() => ({ remove: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: { delete: remove },
  endoregApi: (path: string) => `/endoreg-api/${path}`,
  r: (path: string) => `/api/${path}`
}))

import { MediaManagementAPI, useMediaManagement } from '../mediaManagement'
import { useVideoStore } from '@/stores/videoStore'

describe('typed media deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    remove.mockResolvedValue({ data: { success: true } })
  })

  it.each(['video', 'pdf'] as const)(
    'uses the %s identity for both API entrypoints',
    async (kind) => {
      await MediaManagementAPI.deleteMediaFile(16, kind)
      await MediaManagementAPI.forceRemoveMedia(16, kind)
      const management = useMediaManagement()
      await management.deleteMediaFile(16, kind)
      await management.forceRemoveMedia(16, kind)
      expect(remove).toHaveBeenCalledTimes(4)
      for (const call of remove.mock.calls) {
        expect(call).toEqual([`/endoreg-api/media-management/force-remove/${kind}/16/`])
      }
    }
  )

  it('uses the same video-specific endpoint from the video store', async () => {
    expect(await useVideoStore().deleteVideo(16)).toBe(true)
    expect(remove).toHaveBeenCalledWith('/endoreg-api/media-management/force-remove/video/16/')
  })

  it('does not retry an untyped endpoint when the typed endpoint is unavailable', async () => {
    remove.mockRejectedValueOnce(new Error('404'))
    await expect(MediaManagementAPI.deleteMediaFile(16, 'pdf')).rejects.toThrow('404')
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
