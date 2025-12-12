// frontend/tests/keycloak/can_kc.spec.ts
//
// Purpose:
//   Verify that the `v-can` directive:
//     - reads capabilities from auth_kc store
//     - keeps element visible when allowed
//     - sets element.style.display = 'none' when denied.
//
// This does NOT hit the backend; we prefill the store manually.

import { describe, it, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import canKc from '@/directives/can_kc'
import { useAuthKcStore } from '@/stores/auth_kc'

// Tiny dummy component with one protected button
const TestComponent = {
  template: `
    <div>
      <button id="btn" v-can="'page.patients.view:GET'">Patienten</button>
    </div>
  `,
}

describe('v-can directive', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows button when capability is true', () => {
    const store = useAuthKcStore()
    store.user = { username: 'editor', roles: ['data:read'] } as any
    store.caps = {
      'page.patients.view:GET': true,
    } as any
    store.loaded = true

    const wrapper = mount(TestComponent, {
      global: {
        directives: {
          can: canKc,
        },
      },
    })

    const btn = wrapper.find('#btn')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).style.display).not.toBe('none')
  })

  it('hides button when capability is false', () => {
    const store = useAuthKcStore()
    store.user = { username: 'basic', roles: [] } as any
    store.caps = {
      'page.patients.view:GET': false,
    } as any
    store.loaded = true

    const wrapper = mount(TestComponent, {
      global: {
        directives: {
          can: canKc,
        },
      },
    })

    const btn = wrapper.find('#btn')
    expect(btn.exists()).toBe(true)
    expect((btn.element as HTMLButtonElement).style.display).toBe('none')
  })
})
