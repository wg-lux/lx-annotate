// frontend/tests/keycloak/auth_kc.spec.ts
//
// Purpose:
//   Ensure the auth_kc Pinia store:
//     - calls /api/auth/bootstrap
//     - stores `user`, `roles`
//     - normalizes `capabilities` into simple boolean map
//     - `can()` returns the correct result
//
// These tests run WITHOUT a real backend: axios is mocked.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthKcStore } from '@/stores/auth_kc'

const mocks = vi.hoisted(() => ({
  axiosGet: vi.fn<(url: string) => Promise<{ data: unknown }>>()
}))

// Mock axios globally for this test file
vi.mock('axios', () => ({
  default: {
    get: mocks.axiosGet
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  r: (path: string) => `/api/${path}`
}))

describe('auth_kc store', () => {
  beforeEach(() => {
    // Fresh Pinia instance per test
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares one in-flight bootstrap between concurrent callers', async () => {
    let complete!: (value: { data: unknown }) => void
    mocks.axiosGet.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    const store = useAuthKcStore()
    const first = store.loadBootstrap()
    const second = store.loadBootstrap()
    await Promise.resolve()

    expect(mocks.axiosGet).toHaveBeenCalledTimes(1)
    expect(store.loaded).toBe(false)
    complete({ data: { user: { username: 'reviewer', roles: ['endoregdb_user'] } } })
    await Promise.all([first, second])
    await store.loadBootstrap()

    expect(mocks.axiosGet).toHaveBeenCalledTimes(1)
    expect(store.user?.username).toBe('reviewer')
    expect(store.loaded).toBe(true)
  })

  it('rejects all waiting callers and clears stale privileges on bootstrap failure', async () => {
    const failure = new Error('Network unavailable')
    mocks.axiosGet.mockRejectedValueOnce(failure)
    const store = useAuthKcStore()
    store.user = { username: 'stale', roles: ['endoregdb_user'] }
    store.roles = ['endoregdb_user']
    store.caps = { 'page.patients.view': true }

    const outcomes = await Promise.allSettled([store.loadBootstrap(), store.loadBootstrap()])

    expect(outcomes).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure }
    ])
    expect(store.user).toBeNull()
    expect(store.roles).toEqual([])
    expect(store.caps).toEqual({})
    expect(store.loaded).toBe(true)
    expect(store.bootstrapFailed).toBe(true)
    await expect(store.loadBootstrap()).rejects.toThrow('Authentication bootstrap failed')
    expect(mocks.axiosGet).toHaveBeenCalledTimes(1)
  })

  it('does not share requests across Pinia instances', async () => {
    mocks.axiosGet.mockResolvedValue({ data: { user: null } })
    const first = useAuthKcStore(createPinia())
    const second = useAuthKcStore(createPinia())

    await Promise.all([first.loadBootstrap(), second.loadBootstrap()])

    expect(mocks.axiosGet).toHaveBeenCalledTimes(2)
  })

  it('never restores authentication from a response arriving after logout', async () => {
    vi.stubGlobal('window', { location: { href: '' } })
    let complete!: (value: { data: unknown }) => void
    mocks.axiosGet.mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    const store = useAuthKcStore()
    const pending = store.loadBootstrap()
    await Promise.resolve()
    store.logout()
    complete({
      data: {
        user: { username: 'old-session', roles: ['endoregdb_user'] },
        capabilities: { 'page.patients.view': true }
      }
    })
    await pending

    expect(store.user).toBeNull()
    expect(store.roles).toEqual([])
    expect(store.caps).toEqual({})
    expect(store.loaded).toBe(false)
  })

  it('does not let an older failure erase a newer session', async () => {
    vi.stubGlobal('window', { location: { href: '' } })
    let fail!: (error: Error) => void
    mocks.axiosGet.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        fail = reject
      })
    )
    const store = useAuthKcStore()
    const oldRequest = store.loadBootstrap()
    const oldOutcome = expect(oldRequest).rejects.toThrow('Old failure')
    await Promise.resolve()
    store.logout()
    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        user: { username: 'new-session', roles: ['endoregdb_user'] }
      }
    })
    await store.loadBootstrap()
    fail(new Error('Old failure'))
    await oldOutcome

    expect(store.user?.username).toBe('new-session')
    expect(store.loaded).toBe(true)
    expect(store.bootstrapFailed).toBe(false)
  })

  it('loads user and capabilities from /api/auth/bootstrap (editor)', async () => {
    const mockData = {
      user: { username: 'editor', roles: ['data:read'] },
      roles: ['data:read'],
      capabilities: {
        'page.patients.view': { read: true, write: false }
      }
    }

    mocks.axiosGet.mockResolvedValueOnce({ data: mockData })

    const store = useAuthKcStore()
    await store.loadBootstrap()

    // User data
    expect(store.user?.username).toBe('editor')
    expect(store.roles).toContain('data:read')

    // Capability check – GET should be allowed
    expect(store.can('page.patients.view', 'GET')).toBe(true)

    // And the normalized caps map should contain method-specific key
    expect(store.caps['page.patients.view:GET']).toBe(true)
  })

  it.each([true, false])(
    'parses the backend snake_case override capability (%s)',
    async (allowed) => {
      mocks.axiosGet.mockResolvedValueOnce({
        data: {
          user: { username: 'reviewer', roles: [], can_override_annotation_principal: allowed }
        }
      })
      const store = useAuthKcStore()
      await store.loadBootstrap()

      expect(store.user?.canOverrideAnnotationPrincipal).toBe(allowed)
    }
  )

  it.each([
    { can_override_annotation_principal: 'true' },
    { canOverrideAnnotationPrincipal: true, can_override_annotation_principal: false },
    { canOverrideAnnotationPrincipal: null, can_override_annotation_principal: true }
  ])('rejects malformed or contradictory override capabilities %o', async (capability) => {
    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        user: { username: 'reviewer', roles: [], ...capability }
      }
    })
    const store = useAuthKcStore()

    await expect(store.loadBootstrap()).rejects.toThrow(
      'Invalid annotation principal override capability'
    )
    expect(store.user).toBeNull()
    expect(store.bootstrapFailed).toBe(true)
  })

  it('denies patient page when capability is false (basic user)', async () => {
    const mockData = {
      user: { username: 'basic', roles: [] },
      roles: [],
      capabilities: {
        'page.patients.view': { read: false, write: false }
      }
    }

    mocks.axiosGet.mockResolvedValueOnce({ data: mockData })

    const store = useAuthKcStore()
    await store.loadBootstrap()

    // User has no roles, and cannot access patients page
    expect(store.user?.username).toBe('basic')
    expect(store.can('page.patients.view', 'GET')).toBe(false)
    expect(store.caps['page.patients.view:GET']).toBe(false)
  })

  it('fails closed for malformed users and capabilities', async () => {
    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        user: { username: 'malformed', roles: 'admin' },
        roles: ['admin'],
        capabilities: {
          'page.patients.view': { read: 'yes', write: true }
        }
      }
    })

    const store = useAuthKcStore()
    await store.loadBootstrap()

    expect(store.loaded).toBe(true)
    expect(store.user).toBeNull()
    expect(store.roles).toEqual([])
    expect(store.caps).toEqual({})
    expect(store.can('page.patients.view', 'GET')).toBe(false)
  })

  it('denies malformed capability entries for an otherwise valid user', async () => {
    mocks.axiosGet.mockResolvedValueOnce({
      data: {
        user: { username: 'editor', roles: ['data:read'] },
        roles: ['data:read'],
        capabilities: {
          'page.patients.view': { read: 'yes', write: true }
        }
      }
    })

    const store = useAuthKcStore()
    await store.loadBootstrap()

    expect(store.user?.username).toBe('editor')
    expect(store.caps).toEqual({})
    expect(store.can('page.patients.view', 'GET')).toBe(false)
    expect(store.can('page.patients.view', 'POST')).toBe(false)
  })
})
