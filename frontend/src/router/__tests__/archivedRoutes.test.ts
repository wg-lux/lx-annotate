import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { archivedLegacyRoutes } from '@/router/archivedRoutes'

const Stub = { template: '<div />' }

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Stub },
      { path: '/patienten', component: Stub },
      { path: '/anonymisierung/uebersicht', component: Stub },
      { path: '/untersuchung', component: Stub },
      { path: '/annotationen', component: Stub },
      { path: '/reporting', component: Stub },
      ...archivedLegacyRoutes
    ]
  })
}

describe('archived legacy routes', () => {
  let router: ReturnType<typeof buildRouter>

  beforeEach(() => {
    router = buildRouter()
  })

  it('redirects archived top-level routes to current sidebar routes', async () => {
    await router.push('/anonymisierung')
    expect(router.currentRoute.value.fullPath).toBe('/anonymisierung/uebersicht')

    await router.push('/patient')
    expect(router.currentRoute.value.fullPath).toBe('/patienten')

    await router.push('/validierung')
    expect(router.currentRoute.value.fullPath).toBe('/anonymisierung/uebersicht')
  })

  it('redirects legacy aliases used by old dashboard widgets', async () => {
    await router.push('/examination')
    expect(router.currentRoute.value.fullPath).toBe('/untersuchung')

    await router.push('/segments')
    expect(router.currentRoute.value.fullPath).toBe('/annotationen')
  })
})
