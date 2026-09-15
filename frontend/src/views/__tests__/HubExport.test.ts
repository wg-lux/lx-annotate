import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'

import { createAppRouter } from '@/router'
import HubExport from '@/views/HubExport.vue'

describe('HubExport view', () => {
  it('is the lazy component owned by the /hub-export route', async () => {
    // Arrange
    const router = createAppRouter(createMemoryHistory())
    const route = router.getRoutes().find(({ path }) => path === '/hub-export')

    // Act
    const loaded = await (route?.components?.default as () => Promise<{ default: unknown }>)()

    // Assert
    expect(route?.name).toBe('Hub Export')
    expect(loaded.default).toBe(HubExport)
  })

  it('renders the overview component as its single workflow boundary', () => {
    // Arrange
    const OverviewStub = { template: '<section data-test="overview-stub" />' }

    // Act
    const wrapper = mount(HubExport, {
      global: { stubs: { HubExportOverviewComponent: OverviewStub } }
    })

    // Assert
    expect(wrapper.find('[data-test="overview-stub"]').exists()).toBe(true)
  })
})
