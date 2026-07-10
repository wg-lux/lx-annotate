import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import router from '@/router'
import SidebarComponent from '../SidebarComponent.vue'

const hoisted = vi.hoisted(() => ({
  get: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get
  },
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`,
  endoregApi: (path: string) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
  r: (path: string) => path
}))

function toPathValue(target: unknown): string | null {
  if (typeof target === 'string') return target
  if (!target || typeof target !== 'object') return null
  const path = (target as { path?: unknown }).path
  return typeof path === 'string' ? path : null
}

async function getRouteImportError(path: string): Promise<string | null> {
  const resolved = router.resolve(path)
  if (resolved.matched.length === 0) {
    return `Route "${path}" wird vom Router nicht aufgelöst.`
  }

  for (const record of resolved.matched) {
    const comp = record.components
    const defaultComponent = comp?.default
    if (!defaultComponent) {
      return `Route "${path}" hat keine Default-Komponente (record: "${record.path}").`
    }

    if (typeof defaultComponent === 'function') {
      try {
        const moduleOrComponent = await (defaultComponent as () => Promise<any>)()
        if (moduleOrComponent && typeof moduleOrComponent === 'object' && 'default' in moduleOrComponent) {
          if (!(moduleOrComponent as { default?: unknown }).default) {
            return `Route "${path}" lädt ein Modul ohne Default-Export (record: "${record.path}").`
          }
        } else {
          if (!moduleOrComponent) {
            return `Route "${path}" liefert leere Komponente (record: "${record.path}").`
          }
        }
      } catch (error: any) {
        const message = error?.message || String(error)
        return (
          `Route "${path}" konnte nicht geladen werden (record: "${record.path}"): ${message}`
        )
      }
    }
  }

  return null
}

describe('Sidebar linked routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.get.mockResolvedValue({ data: [] })
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('deckt alle aktuell in der Sidebar verlinkten Seiten ab und kann deren Komponenten laden', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        mocks: {
          $route: {
            path: '/'
          }
        }
      }
    })

    await flushPromises()

    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => toPathValue(link.props('to')))
      .filter((path): path is string => !!path)

    const linkedPaths = new Set(targets)
    const expectedSidebarPaths = new Set([
      '/',
      '/einstellungen',
      '/patienten',
      '/anonymisierung/uebersicht',
      '/anonymisierung/validierung',
      '/anonymisierung/metriken',
      '/anonymisierung/evaluation',
      '/video-untersuchung',
      '/frame-annotation',
      '/model-training',
      '/ai-dataset-buckets',
      '/ai-dataset-settings',
      '/reporting/case-setup',
      '/reporting',
      '/export',
      '/hub-export'
    ])

    expect(linkedPaths).toEqual(expectedSidebarPaths)

    const errors: string[] = []
    for (const path of linkedPaths) {
      const routeError = await getRouteImportError(path)
      if (routeError) {
        errors.push(routeError)
      }
    }

    expect(errors).toEqual([])

    wrapper.unmount()
  }, 15000)

  it('markiert Befundung: Übersicht als aktiv auf /reporting', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        mocks: {
          $route: {
            path: '/reporting'
          }
        }
      }
    })

    await flushPromises()

    const reportingLink = wrapper
      .findAll('.nav-link')
      .find((node) => node.text().includes('Befundung: Übersicht'))
    expect(reportingLink).toBeTruthy()
    expect(reportingLink!.classes()).toContain('active')

    const caseSetupLink = wrapper
      .findAll('.nav-link')
      .find((node) => node.text().includes('3. Befundung starten'))
    expect(caseSetupLink).toBeTruthy()
    expect(caseSetupLink!.classes()).not.toContain('active')

    wrapper.unmount()
  })

  it('markiert 3. Befundung starten als aktiv auf /reporting/case-setup', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        mocks: {
          $route: {
            path: '/reporting/case-setup'
          }
        }
      }
    })

    await flushPromises()

    const caseSetupLink = wrapper
      .findAll('.nav-link')
      .find((node) => node.text().includes('3. Befundung starten'))
    expect(caseSetupLink).toBeTruthy()
    expect(caseSetupLink!.classes()).toContain('active')

    const reportingLink = wrapper
      .findAll('.nav-link')
      .find((node) => node.text().includes('Befundung: Übersicht'))
    expect(reportingLink).toBeTruthy()
    expect(reportingLink!.classes()).toContain('active')

    wrapper.unmount()
  })

  it('markiert Anonymisierungsmetriken als aktiv auf /anonymisierung/metriken', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        mocks: {
          $route: {
            path: '/anonymisierung/metriken'
          }
        }
      }
    })

    await flushPromises()

    const metricsLink = wrapper
      .findAll('.nav-link')
      .find((node) => node.text().includes('Anonymisierungsmetriken'))
    expect(metricsLink).toBeTruthy()
    expect(metricsLink!.classes()).toContain('active')

    wrapper.unmount()
  })

  it('markiert Anonymisierungsevaluation als aktiv auf /anonymisierung/evaluation', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        mocks: {
          $route: {
            path: '/anonymisierung/evaluation'
          }
        }
      }
    })

    await flushPromises()

    const evaluationLink = wrapper
      .findAll('.nav-link')
      .find((node) => node.text().includes('Anonymisierungsevaluation'))
    expect(evaluationLink).toBeTruthy()
    expect(evaluationLink!.classes()).toContain('active')

    wrapper.unmount()
  })
})
