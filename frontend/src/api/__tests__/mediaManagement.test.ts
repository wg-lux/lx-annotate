import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaManagementAPI } from '../mediaManagement'
import { usePollingProtection } from '@/composables/usePollingProtection'

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))

vi.mock('@/api/axiosInstance', () => ({
  default: { get, post },
  endoregApi: (path: string) => `/endoreg-api/${path}`
}))

describe('anonymization media identity', () => {
  beforeEach(() => {
    get.mockResolvedValue({ data: { file_type: 'pdf', anonymizationStatus: 'not_started' } })
    post.mockResolvedValue({ data: { file_type: 'pdf' } })
  })

  it.each(['pdf', 'video'] as const)(
    'forwards %s through processing protection',
    async (mediaType) => {
      const protection = usePollingProtection()
      await protection.startAnonymizationSafeWithProtection(15, mediaType)
      expect(post).toHaveBeenCalledWith('/endoreg-api/anonymization/15/start/', {
        media_type: mediaType
      })
      expect(protection.canProcessMedia.value(15, mediaType)).toBe(true)
    }
  )

  it.each(['pdf', 'video'] as const)('scopes %s status lookup', async (mediaType) => {
    await MediaManagementAPI.getAnonymizationStatusSafe(15, mediaType)
    expect(get).toHaveBeenCalledWith('/endoreg-api/anonymization/15/status/', {
      params: { kind: mediaType }
    })
  })

  it('releases the local lock after the lost-video rejection', async () => {
    post.mockRejectedValueOnce(new Error('File is marked failed/lost'))
    const protection = usePollingProtection()
    expect(await protection.startAnonymizationSafeWithProtection(15, 'video')).toBeNull()
    expect(protection.canProcessMedia.value(15, 'video')).toBe(true)
  })
})
