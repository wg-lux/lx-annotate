import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from '@/App.vue'

const NavbarStub = defineComponent({
  props: {
    isSidebarOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggleSidebar'],
  template: `
    <button
      type="button"
      data-test="navbar-sidebar-toggle"
      :aria-expanded="String(isSidebarOpen)"
      @click="$emit('toggleSidebar')"
    >
      Navigation
    </button>
  `
})

const mountApp = () =>
  mount(App, {
    global: {
      stubs: {
        NavbarComponent: NavbarStub,
        SidebarComponent: {
          template: `
            <div class="sidebar-panel" data-test="sidebar-content">
              Sidebar
            </div>
          `
        },
        ToastMessageContainer: true,
        RouterView: true
      }
    }
  })

 describe('App responsive navigation', () => {
  it('opens from the navbar and closes without a second sidebar state', async () => {
    const wrapper = mountApp()

    expect(wrapper.find('.sidebar-shell--collapsed').exists()).toBe(true)
    expect(wrapper.find('.sidebar-shell--open').exists()).toBe(false)
    expect(wrapper.get('[data-test="navbar-sidebar-toggle"]').attributes('aria-expanded')).toBe(
      'false'
    )

    await wrapper.get('[data-test="navbar-sidebar-toggle"]').trigger('click')

    expect(wrapper.find('.sidebar-shell--collapsed').exists()).toBe(false)
    expect(wrapper.find('.sidebar-shell--open').exists()).toBe(true)
    expect(wrapper.find('[data-test="sidebar-content"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="navbar-sidebar-toggle"]').attributes('aria-expanded')).toBe(
      'true'
    )

    await wrapper.get('.sidebar-toggle-button--open').trigger('click')

    expect(wrapper.find('.sidebar-shell--open').exists()).toBe(false)
    expect(wrapper.find('.sidebar-shell--collapsed').exists()).toBe(true)
  })

  it('closes the mobile drawer through its backdrop', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-test="navbar-sidebar-toggle"]').trigger('click')
    await wrapper.get('.app-shell-backdrop').trigger('click')

    expect(wrapper.find('.sidebar-shell--open').exists()).toBe(false)
  })
it('places the sidebar panel directly inside the open shell', async () => {
    const wrapper = mountApp()

    await wrapper
      .get('[data-test="navbar-sidebar-toggle"]')
      .trigger('click')

    const panel = wrapper.find('.sidebar-shell--open > .sidebar-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.isVisible()).toBe(true)
  })
})
