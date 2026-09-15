import { describe, expect, it } from 'vitest'

import { convertIncomingResponseData } from '../axiosInstance'

describe('axios incoming response conversion', () => {
  it('preserves binary Blob responses by identity', () => {
    const image = new Blob(['jpeg bytes'], { type: 'image/jpeg' })

    expect(convertIncomingResponseData(image)).toBe(image)
  })

  it('continues converting JSON response keys recursively', () => {
    expect(convertIncomingResponseData({ frame_id: 7, nested_value: { video_id: 3 } })).toEqual({
      frameId: 7,
      nestedValue: { videoId: 3 }
    })
  })
})
