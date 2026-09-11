import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, isNavigationFailure, NavigationFailureType } from 'vue-router'
import { createAppRouter } from '@/router'
import { useAuthKcStore } from '@/stores/auth_kc'
import { useToastStore } from '@/stores/toastStore'

describe('authentication route guard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits for bootstrap before loading a protected route component', async () => {
    const auth = useAuthKcStore()
    let complete!: () => void
    vi.spyOn(auth, 'loadBootstrap').mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve
      })
    )
    const router = createAppRouter(createMemoryHistory())
    const loadComponent = vi.fn(() => Promise.resolve({ template: '<p>Protected</p>' }))
    router.addRoute({ path: '/guard-probe', component: loadComponent })
    const navigation = router.push('/guard-probe')
    await Promise.resolve()
    expect(loadComponent).not.toHaveBeenCalled()

    auth.user = { username: 'reviewer', roles: ['endoregdb_user'] }
    auth.roles = ['endoregdb_user']
    auth.loaded = true
    complete()
    await navigation

    expect(loadComponent).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/guard-probe')
  })

  it('blocks failed bootstrap without treating an outage as anonymous login', async () => {
    const auth = useAuthKcStore()
    vi.spyOn(auth, 'loadBootstrap').mockRejectedValue(new Error('Private server details'))
    const login = vi.spyOn(auth, 'login').mockImplementation(() => {})
    const router = createAppRouter(createMemoryHistory())

    const result = await router.push('/reporting')

    expect(isNavigationFailure(result, NavigationFailureType.aborted)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/')
    expect(login).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toMatchObject([
      {
        status: 'error',
        text: 'Die Anmeldung konnte nicht geprüft werden. Bitte laden Sie die Seite erneut.'
      }
    ])
  })

  it('settles anonymous navigation as aborted while requesting login', async () => {
    const auth = useAuthKcStore()
    auth.loaded = true
    const login = vi.spyOn(auth, 'login').mockImplementation(() => {})
    const router = createAppRouter(createMemoryHistory())

    const result = await router.push('/reporting')

    expect(isNavigationFailure(result, NavigationFailureType.aborted)).toBe(true)
    expect(login).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('blocks authenticated users missing the required application role', async () => {
    const auth = useAuthKcStore()
    auth.loaded = true
    auth.user = { username: 'reviewer', roles: [] }
    vi.spyOn(auth, 'logout').mockImplementation(() => {})
    vi.spyOn(auth, 'login').mockImplementation(() => {})
    const router = createAppRouter(createMemoryHistory())

    const result = await router.push('/reporting')

    expect(isNavigationFailure(result, NavigationFailureType.aborted)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/')
  })
})
