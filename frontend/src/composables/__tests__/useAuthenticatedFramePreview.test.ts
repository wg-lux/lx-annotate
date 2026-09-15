import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthenticatedFramePreview } from '../useAuthenticatedFramePreview'
import { requireDecodedFrameUrl } from '@/utils/frameStreams'

const { get, createUrl, revokeUrl } = vi.hoisted(() => ({
  get: vi.fn(),
  createUrl: vi.fn(() => 'blob:preview'),
  revokeUrl: vi.fn()
}))
vi.mock('@/api/axiosInstance', () => ({ default: { get }, r: (path: string) => `/api${path}` }))

function response(frame: number, timestamp = '0.04000000000000001') {
  return {
    status: 200,
    data: new Blob(['jpeg'], { type: 'image/jpeg' }),
    headers: {
      'content-type': 'image/jpeg',
      'x-frame-number': String(frame),
      'x-frame-timestamp': timestamp
    }
  }
}

describe('authenticated frame preview', () => {
  const scopes: ReturnType<typeof effectScope>[] = []
  beforeEach(() => {
    get.mockReset()
    createUrl.mockClear()
    revokeUrl.mockClear()
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createUrl
    })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl })
  })
  afterEach(() => {
    for (const scope of scopes.splice(0)) scope.stop()
  })
  function preview() {
    const scope = effectScope()
    scopes.push(scope)
    const result = scope.run(useAuthenticatedFramePreview)
    if (!result) throw new Error('Preview scope did not start')
    return result
  }

  it('uses processed decoding and preserves the returned timestamp without FPS conversion', async () => {
    get.mockResolvedValue(response(0))
    const view = preview()
    expect(await view.load(7, 0)).toEqual({
      videoId: 7,
      frameNumber: 0,
      timestamp: 0.04000000000000001
    })
    expect(get.mock.calls[0][0]).toContain('/videos/7/frames/0/decoded-stream/?file_type=processed')
    expect(view.imageUrl.value).toBe('blob:preview')
    view.clear()
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview')
  })

  it('discards an older response after a later click', async () => {
    let resolveFirst: ((value: ReturnType<typeof response>) => void) | undefined
    get
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          })
      )
      .mockResolvedValueOnce(response(2))
    const view = preview()
    const first = view.load(7, 1)
    const second = await view.load(7, 2)
    expect(second?.frameNumber).toBe(2)
    if (!resolveFirst) throw new Error('First request was not started')
    resolveFirst(response(1))
    expect(await first).toBeNull()
    expect(createUrl).toHaveBeenCalledTimes(1)
  })

  it.each(['', 'NaN', '-1'])(
    'rejects an invalid timestamp %s and clears the previous image',
    async (timestamp) => {
      get.mockResolvedValueOnce(response(1)).mockResolvedValueOnce(response(2, timestamp))
      const view = preview()
      await view.load(7, 1)
      expect(await view.load(7, 2)).toBeNull()
      expect(view.imageUrl.value).toBeNull()
      expect(view.error.value).toBeTruthy()
    }
  )

  it('rejects cached and external annotation URLs before any request', () => {
    expect(() => requireDecodedFrameUrl('/media/frame.jpg')).toThrow()
    expect(() => requireDecodedFrameUrl('/api/media/videos/1/frames/0/stream/')).toThrow()
    expect(() =>
      requireDecodedFrameUrl('https://example.invalid/api/media/videos/1/frames/0/decoded-stream/')
    ).toThrow()
  })
})
