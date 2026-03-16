import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

import axiosInstance from '@/api/axiosInstance'
import { useLookupActions } from '@/composables/reporting/useLookupActions'

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn()
  },
  r: (value: string) => value
}))

vi.mock('@/types/api/endpoints', () => ({
  endpoints: {
    requirements: {
      lookupAll: (token: string) => `/api/lookup/${token}/all/`,
      lookupParts: (token: string) => `/api/lookup/${token}/parts/`,
      lookupRecompute: (token: string) => `/api/lookup/${token}/recompute/`
    }
  }
}))

describe('useLookupActions payload normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('unwraps nested lookup payloads under `data`', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        data: {
          availableFindings: [1, 2]
        }
      }
    } as any)

    const applyLookup = vi.fn()
    const flow = {
      lookupToken: 'abc',
      setSessionStatus: vi.fn()
    }

    const actions = useLookupActions({
      flow,
      loading: ref(false),
      errorMessage: ref<string | null>(null),
      applyLookup
    })

    const result = await actions.fetchLookupAll()

    expect(result.ok).toBe(true)
    expect(applyLookup).toHaveBeenCalledWith({ availableFindings: [1, 2] })
  })

  it('ignores non-object payloads without throwing', async () => {
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: ['unexpected']
    } as any)

    const applyLookup = vi.fn()
    const flow = {
      lookupToken: 'abc',
      setSessionStatus: vi.fn()
    }

    const actions = useLookupActions({
      flow,
      loading: ref(false),
      errorMessage: ref<string | null>(null),
      applyLookup
    })

    const result = await actions.fetchLookupAll()

    expect(result.ok).toBe(true)
    expect(applyLookup).toHaveBeenCalledWith({})
  })

  it('uses structured backend errors when available', async () => {
    vi.mocked(axiosInstance.get).mockRejectedValue({
      response: {
        data: {
          errors: ['knowledge base validation failed', 'missing report template']
        }
      }
    })

    const applyLookup = vi.fn()
    const flow = {
      lookupToken: 'abc',
      setSessionStatus: vi.fn()
    }
    const errorMessage = ref<string | null>(null)

    const actions = useLookupActions({
      flow,
      loading: ref(false),
      errorMessage,
      applyLookup
    })

    const result = await actions.fetchLookupAll()

    expect(result.ok).toBe(false)
    expect(errorMessage.value).toBe(
      'knowledge base validation failed | missing report template'
    )
  })

  it('marks the session as expired on 404 responses', async () => {
    vi.mocked(axiosInstance.get).mockRejectedValue({
      response: {
        status: 404
      }
    })

    const applyLookup = vi.fn()
    const setSessionStatus = vi.fn()
    const flow = {
      lookupToken: 'abc',
      setSessionStatus
    }
    const errorMessage = ref<string | null>(null)

    const actions = useLookupActions({
      flow,
      loading: ref(false),
      errorMessage,
      applyLookup
    })

    const result = await actions.fetchLookupAll()

    expect(result).toEqual({ ok: false, expired: true })
    expect(setSessionStatus).toHaveBeenCalledWith('expired')
    expect(errorMessage.value).toBe(
      'Der Fallkontext ist abgelaufen. Bitte im Fall-Setup neu initialisieren.'
    )
  })

  it('fails fast when no lookup token is available', async () => {
    const applyLookup = vi.fn()
    const flow = {
      lookupToken: null,
      setSessionStatus: vi.fn()
    }
    const errorMessage = ref<string | null>(null)

    const actions = useLookupActions({
      flow,
      loading: ref(false),
      errorMessage,
      applyLookup
    })

    const result = await actions.fetchLookupAll()

    expect(result.ok).toBe(false)
    expect(vi.mocked(axiosInstance.get)).not.toHaveBeenCalled()
    expect(errorMessage.value).toBe('Kein aktiver Fallkontext vorhanden.')
  })

  it('applies recompute updates before refreshing the full lookup state', async () => {
    vi.mocked(axiosInstance.post).mockResolvedValue({
      data: {
        updates: {
          suggestedActions: {
            '2001': [{ reason: 'missing classification' }]
          }
        }
      }
    } as any)
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        data: {
          availableFindings: [11]
        }
      }
    } as any)

    const applyLookup = vi.fn()
    const flow = {
      lookupToken: 'abc',
      setSessionStatus: vi.fn()
    }

    const actions = useLookupActions({
      flow,
      loading: ref(false),
      errorMessage: ref<string | null>(null),
      applyLookup
    })

    const result = await actions.recomputeLookup()

    expect(result.ok).toBe(true)
    expect(applyLookup).toHaveBeenNthCalledWith(1, {
      suggestedActions: {
        '2001': [{ reason: 'missing classification' }]
      }
    })
    expect(applyLookup).toHaveBeenNthCalledWith(2, { availableFindings: [11] })
  })
})
