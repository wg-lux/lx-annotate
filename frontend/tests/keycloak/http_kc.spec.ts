import axios, { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initHttpKC } from '@/utils/http_kc'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_OK = 200

describe('global authentication HTTP handling', () => {
  const location = { pathname: '/video-untersuchung', search: '?video=3', href: '' }

  beforeEach(() => {
    location.href = ''
    vi.stubGlobal('location', location)
    vi.stubGlobal('window', { location })
    initHttpKC()
  })

  afterEach(() => {
    axios.interceptors.response.clear()
    vi.unstubAllGlobals()
  })

  it.each([HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, HTTP_INTERNAL_SERVER_ERROR])(
    'preserves HTTP %i failure identity for callers',
    async (status) => {
      const config = { headers: new AxiosHeaders() }
      const failure = new AxiosError(
        'Request failed',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        { status, statusText: 'Failed', headers: {}, config, data: {} }
      )

      await expect(
        axios.get('/endoreg-api/auth/bootstrap', {
          adapter: () => Promise.reject(failure)
        })
      ).rejects.toBe(failure)

      expect(location.href).toBe(
        status === HTTP_UNAUTHORIZED
          ? '/oidc/authenticate/?next=%2Fvideo-untersuchung%3Fvideo%3D3'
          : ''
      )
    }
  )

  it('preserves network failures without redirecting', async () => {
    const failure = new AxiosError('Network unavailable', AxiosError.ERR_NETWORK)

    await expect(
      axios.get('/endoreg-api/auth/bootstrap', {
        adapter: () => Promise.reject(failure)
      })
    ).rejects.toBe(failure)

    expect(location.href).toBe('')
  })

  it('preserves successful responses', async () => {
    const response = await axios.get<unknown>('/endoreg-api/auth/bootstrap', {
      adapter: (config) =>
        Promise.resolve({
          data: { user: null },
          status: HTTP_OK,
          statusText: 'OK',
          headers: {},
          config
        })
    })

    expect(response.data).toEqual({ user: null })
    expect(location.href).toBe('')
  })
})
