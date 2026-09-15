import axios, { AxiosError, AxiosHeaders, CanceledError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import axiosInstance from '../axiosInstance'
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

  it.each([AxiosError.ERR_NETWORK, AxiosError.ECONNABORTED])(
    'continues reporting actual failures (%s)',
    async (code) => {
      const failure = new AxiosError('Request failed', code)

      await expect(
        axiosInstance.get('/endoreg-api/media/videos/', {
          adapter: () => Promise.reject(failure)
        })
      ).rejects.toBe(failure)

      expect(useToastStore().toasts).toMatchObject([{ status: 'error', text: 'Request failed' }])
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
