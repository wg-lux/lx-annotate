import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosRequestConfig } from 'axios'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: { get, post },
  r: (path: string) => `/api/${path}`,
  silentRequestConfig: (config: AxiosRequestConfig) => config
}))
import { createVideoMask, fetchVideoMasks, type VideoMaskProfile } from '../videoMasks'

const profile: VideoMaskProfile = {
  name: 'room_2', label: 'Room 2', deviceName: 'Test device',
  mask: { x: 20, y: 0, width: 80, height: 100, imageWidth: 100, imageHeight: 100 }
}

describe('mask catalogue API', () => {
  beforeEach(() => vi.clearAllMocks())
  it('loads masks and creates a mask for selection', async () => {
    get.mockResolvedValue({ data: { masks: [profile] } })
    post.mockResolvedValue({ data: profile })
    expect(await fetchVideoMasks()).toEqual([profile])
    expect(await createVideoMask(profile)).toEqual(profile)
    expect(post).toHaveBeenCalledWith('/api/media/videos/masks/', profile, { timeout: 15000 })
  })
  it('propagates invalid or duplicate creation errors', async () => {
    post.mockRejectedValue(new Error('conflict'))
    await expect(createVideoMask(profile)).rejects.toThrow('conflict')
  })
})
