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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import axios from 'axios'
import { useAuthKcStore } from '@/stores/auth_kc'

// Mock axios globally for this test file
vi.mock('axios')

describe('auth_kc store', () => {
  beforeEach(() => {
    // Fresh Pinia instance per test
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads user and capabilities from /api/auth/bootstrap (editor)', async () => {
    const mockData = {
      user: { username: 'editor', roles: ['data:read'] },
      roles: ['data:read'],
      capabilities: {
        'page.patients.view': { read: true, write: false },
      },
    }

    ;(axios.get as unknown as vi.Mock).mockResolvedValueOnce({ data: mockData })

    const store = useAuthKcStore()
    await store.loadBootstrap()

    // User data
    expect(store.user?.username).toBe('editor')
    expect(store.roles).toContain('data:read')

    // Capability check – GET should be allowed
    expect(store.can('page.patients.view', 'GET')).toBe(true)

    // And the normalized caps map should contain method-specific key
    expect((store.caps as any)['page.patients.view:GET']).toBe(true)
  })

  it('denies patient page when capability is false (basic user)', async () => {
    const mockData = {
      user: { username: 'basic', roles: [] },
      roles: [],
      capabilities: {
        'page.patients.view': { read: false, write: false },
      },
    }

    ;(axios.get as unknown as vi.Mock).mockResolvedValueOnce({ data: mockData })

    const store = useAuthKcStore()
    await store.loadBootstrap()

    // User has no roles, and cannot access patients page
    expect(store.user?.username).toBe('basic')
    expect(store.can('page.patients.view', 'GET')).toBe(false)
    expect((store.caps as any)['page.patients.view:GET']).toBe(false)
  })
})
