import axios from 'axios'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAuthKcStore } from '@/stores/auth_kc'
import { useToastStore } from '@/stores/toastStore'

const mocks = vi.hoisted(() => ({ bindAuthSubject: vi.fn() }))

vi.mock('@/App.vue', () => ({ default: { template: '<p>Application mounted</p>' } }))
vi.mock('@/router', () => ({ default: { install: () => {} } }))
vi.mock('vue-virtual-scroller', () => ({ default: { install: () => {} } }))
vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => ({ bindAuthSubject: mocks.bindAuthSubject })
}))

describe('application authentication startup', () => {
  afterEach(() => {
    axios.interceptors.response.clear()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('owns bootstrap failure while mounting and clearing reporting identity', async () => {
    vi.useFakeTimers()
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Internal connection details'))
    document.body.innerHTML = '<div id="app"></div>'

    await import('@/main')
    await flushPromises()

    expect(document.body.textContent).toContain('Application mounted')
    expect(useAuthKcStore().isAuthenticated).toBe(false)
    expect(mocks.bindAuthSubject).toHaveBeenCalledExactlyOnceWith(null)
    expect(useToastStore().toasts).toMatchObject([
      { status: 'error', text: 'Die Anmeldung konnte nicht geprüft werden. Bitte laden Sie die Seite erneut.' }
    ])
  })
})
