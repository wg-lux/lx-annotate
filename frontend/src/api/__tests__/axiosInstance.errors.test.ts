import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance, { silentRequestConfig } from '../axiosInstance'
import { useAuthKcStore } from '@/stores/auth_kc'
import { useToastStore } from '@/stores/toastStore'

describe('axios response error handling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('preserves cancellation without showing a failure or requesting login', async () => {
    const login = vi.spyOn(useAuthKcStore(), 'login').mockImplementation(() => {})
    const cancellation = new CanceledError('canceled')

    await expect(
      axiosInstance.get('/endoreg-api/media/videos/1/segments/', {
        adapter: () => Promise.reject(cancellation)
      })
    ).rejects.toBe(cancellation)

    expect(axios.isCancel(cancellation)).toBe(true)
    expect(useToastStore().toasts).toEqual([])
    expect(login).not.toHaveBeenCalled()
  })

  it('keeps pre-aborted requests silent and never dispatches them', async () => {
    const controller = new AbortController()
    controller.abort()
    const adapter = vi.fn()

    await expect(
      axiosInstance.get('/endoreg-api/media/videos/', {
        signal: controller.signal,
        adapter
      })
    ).rejects.toBeInstanceOf(CanceledError)

    expect(adapter).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toEqual([])
  })

  it.each([AxiosError.ERR_NETWORK, AxiosError.ECONNABORTED, AxiosError.ETIMEDOUT])(
    'continues reporting actual failures (%s)',
    async (code) => {
      const failure = new AxiosError('Request failed', code)

      await expect(
        axiosInstance.get('/endoreg-api/media/videos/', {
          adapter: () => Promise.reject(failure)
        })
      ).rejects.toBe(failure)

      expect(useToastStore().toasts).toHaveLength(1)
      expect(useToastStore().toasts[0].status).toBe('error')
      expect(useToastStore().toasts[0].text).toContain(
        code === AxiosError.ERR_NETWORK ? 'Verbindung' : 'zu lange'
      )
    }
  )

  it.each([
    [403, 'Berechtigung'],
    [404, 'nicht verfügbar'],
    [409, 'zwischenzeitlich geändert'],
    [429, 'warten'],
    [500, 'Server konnte'],
    [503, 'Server konnte']
  ])(
    'presents actionable HTTP %i failures without server internals or retries',
    async (status, message) => {
      const config = { headers: new AxiosHeaders(), url: '/endoreg-api/media/videos/' }
      const failure = new AxiosError(
        'private exception',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        {
          status,
          statusText: 'Failure',
          headers: {},
          config,
          data: { detail: 'private server detail', error: 'private server error' }
        }
      )
      const adapter = vi.fn().mockRejectedValue(failure)

      await expect(axiosInstance.post(config.url, {}, { adapter })).rejects.toBe(failure)

      expect(adapter).toHaveBeenCalledOnce()
      expect(useToastStore().toasts).toHaveLength(1)
      expect(useToastStore().toasts[0].status).toBe('error')
      expect(useToastStore().toasts[0].text).toContain(message)
      expect(JSON.stringify(useToastStore().toasts)).not.toContain('private')
    }
  )

  it.each([400, 422])('preserves actionable HTTP %i validation feedback', async (status) => {
    const config = { headers: new AxiosHeaders(), url: '/endoreg-api/media/videos/' }
    const failure = new AxiosError(
      'technical detail',
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      {
        status,
        statusText: 'Invalid input',
        headers: {},
        config,
        data: { detail: 'Bitte Datum korrigieren.' }
      }
    )
    await expect(
      axiosInstance.post(
        config.url,
        {},
        {
          adapter: () => Promise.reject(failure)
        }
      )
    ).rejects.toBe(failure)
    expect(useToastStore().toasts).toMatchObject([{ text: 'Bitte Datum korrigieren.' }])
  })

  it.each([null, '<html>private exception</html>', { detail: [] }, { detail: ' ', error: {} }])(
    'handles malformed validation bodies without exposing raw exceptions (%j)',
    async (data) => {
      const config = { headers: new AxiosHeaders(), url: '/endoreg-api/media/videos/' }
      const failure = new AxiosError(
        'private exception',
        AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        {
          status: 422,
          statusText: 'Invalid input',
          headers: {},
          config,
          data
        }
      )
      await expect(
        axiosInstance.post(
          config.url,
          {},
          {
            adapter: () => Promise.reject(failure)
          }
        )
      ).rejects.toBe(failure)
      expect(useToastStore().toasts).toMatchObject([{ text: 'Bitte prüfen Sie Ihre Eingaben.' }])
    }
  )

  it('respects explicit notification suppression', async () => {
    const failure = new AxiosError('private failure', AxiosError.ERR_NETWORK)
    await expect(
      axiosInstance.get('/endoreg-api/media/videos/', {
        ...silentRequestConfig(),
        adapter: (config) => {
          failure.config = config
          return Promise.reject(failure)
        }
      })
    ).rejects.toBe(failure)
    expect(useToastStore().toasts).toEqual([])
  })

  it.each(['/endoreg-api/jobs/1/status/', '/endoreg-api/jobs/1/polling-info/'])(
    'keeps polling failure notifications suppressed (%s)',
    async (url) => {
      const config = { headers: new AxiosHeaders(), url }
      const failure = new AxiosError('private failure', AxiosError.ERR_NETWORK, config)
      await expect(
        axiosInstance.get(url, {
          adapter: () => Promise.reject(failure)
        })
      ).rejects.toBe(failure)
      expect(useToastStore().toasts).toEqual([])
    }
  )

  it('continues requesting login on unauthorized responses', async () => {
    const login = vi.spyOn(useAuthKcStore(), 'login').mockImplementation(() => {})
    const config = { headers: new AxiosHeaders(), url: '/endoreg-api/media/videos/' }
    const failure = new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
      data: {}
    })

    await expect(
      axiosInstance.get(config.url, {
        adapter: () => Promise.reject(failure)
      })
    ).rejects.toBe(failure)

    expect(login).toHaveBeenCalledOnce()
    expect(useToastStore().toasts).toEqual([])
  })
})
