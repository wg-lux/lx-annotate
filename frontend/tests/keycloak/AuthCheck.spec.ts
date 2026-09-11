import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AuthCheck from '@/components/Authentification/AuthCheck.vue'
import { useAuthKcStore } from '@/stores/auth_kc'

const slots = {
  'authenticated-content': '<p>Protected content</p>',
  'unauthenticated-content': '<p>Login required</p>',
  loading: '<p>Checking authentication</p>'
}

describe('AuthCheck bootstrap states', () => {
  it('shows loading until authentication is available', async () => {
    const store = useAuthKcStore()
    let complete!: () => void
    vi.spyOn(store, 'loadBootstrap').mockReturnValue(new Promise<void>((resolve) => {
      complete = resolve
    }))
    const wrapper = mount(AuthCheck, { slots })
    expect(wrapper.text()).toBe('Checking authentication')

    store.user = { username: 'reviewer', roles: [] }
    complete()
    await flushPromises()

    expect(wrapper.text()).toBe('Protected content')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows unauthenticated content after a successful anonymous bootstrap', async () => {
    vi.spyOn(useAuthKcStore(), 'loadBootstrap').mockResolvedValue()
    const wrapper = mount(AuthCheck, { slots })
    await flushPromises()

    expect(wrapper.text()).toBe('Login required')
    wrapper.unmount()
  })

  it('shows a safe alert on failure, even if stale user state exists', async () => {
    const store = useAuthKcStore()
    store.user = { username: 'reviewer', roles: [] }
    vi.spyOn(store, 'loadBootstrap').mockRejectedValue(new Error('Internal response details'))
    const wrapper = mount(AuthCheck, { slots })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Die Anmeldung konnte nicht geprüft werden.')
    expect(wrapper.text()).not.toContain('Internal response details')
    expect(wrapper.text()).not.toContain('Protected content')
    expect(wrapper.text()).not.toContain('Login required')
    wrapper.unmount()
  })
})
