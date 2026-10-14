import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMediaTypeStore } from '../mediaTypeStore'

describe('overview media identity registry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('skips synthetic rows while retaining colliding typed media identifiers', () => {
    const store = useMediaTypeStore()
    expect(() => {
      store.seedTypesFromOverview([
        { id: -15, mediaType: 'pdf' },
        { id: -16, mediaType: 'video' },
        { id: 15, mediaType: 'pdf' },
        { id: 15, mediaType: 'video' }
      ])
    }).not.toThrow()
    expect(store.getType(15, 'pdf')).toBe('pdf')
    expect(store.getType(15, 'video')).toBe('video')
    expect(sessionStorage.getItem('mediaType:pdf:-15')).toBeNull()
  })
})
