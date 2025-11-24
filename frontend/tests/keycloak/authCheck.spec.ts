// frontend/tests/keycloak/AuthCheck.spec.ts
//
// Purpose:
//   Test AuthCheck.vue behavior without real backend:
//     - It calls auth_kc.loadBootstrap() on mount.
//     - If store.user is set → shows authenticated slot.
//     - If store.user is null → shows unauthenticated slot.
//
// We mock loadBootstrap so NO real HTTP calls are made.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AuthCheck from '@/components/AuthCheck.vue'
import { useAuthKcStore } from '@/stores/auth_kc'

describe('AuthCheck.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('renders authenticated content when user exists', async () => {
    const store = useAuthKcStore()

    // Mock loadBootstrap: simulate successful login
    store.loadBootstrap = vi.fn(async () => {
      store.user = { username: 'editor', roles: ['data:read'] } as any
      store.loaded = true
    }) as any

    const wrapper = mount(AuthCheck, {
      slots: {
        'authenticated-content': '<div id="auth">APP</div>',
        'unauthenticated-content': '<div id="unauth">LOGIN</div>',
      },
    })

    // Wait one tick so onMounted + loadBootstrap can run
    await new Promise((resolve) => setTimeout(resolve))

    expect(wrapper.find('#auth').exists()).toBe(true)
    expect(wrapper.find('#unauth').exists()).toBe(false)
  })

  it('renders unauthenticated content when no user', async () => {
    const store = useAuthKcStore()

    // Mock loadBootstrap: simulate "not logged in"
    store.loadBootstrap = vi.fn(async () => {
      store.user = null as any
      store.loaded = true
    }) as any

    const wrapper = mount(AuthCheck, {
      slots: {
        'authenticated-content': '<div id="auth">APP</div>',
        'unauthenticated-content': '<div id="unauth">LOGIN</div>',
      },
    })

    await new Promise((resolve) => setTimeout(resolve))

    expect(wrapper.find('#auth').exists()).toBe(false)
    expect(wrapper.find('#unauth').exists()).toBe(true)
  })
})
