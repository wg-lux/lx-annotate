import { flushPromises, mount, RouterLinkStub, type DOMWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { routeLocationKey } from 'vue-router'
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
  if (typeof target === 'string') {
    return target
  }
  if (!target || typeof target !== 'object') {
    return null
  }
  const path = (target as { path?: unknown }).path
  return typeof path === 'string' ? path : null
}

function getNodeByText(nodes: DOMWrapper<Element>[], text: string): DOMWrapper<Element> {
  const node = nodes.find((candidate) => candidate.text().includes(text))
  if (!node) {
    throw new Error(`Expected rendered node containing "${text}".`)
  }
  return node
}

function validateLoadedComponent(moduleOrComponent: unknown, path: string, recordPath: string) {
  if (!moduleOrComponent) {
    return `Route "${path}" liefert leere Komponente (record: "${recordPath}").`
  }
  const isModule = typeof moduleOrComponent === 'object' && 'default' in moduleOrComponent
  if (isModule && !(moduleOrComponent as { default?: unknown }).default) {
    return `Route "${path}" lädt ein Modul ohne Default-Export (record: "${recordPath}").`
  }
  return null
}

async function loadRouteComponent(
  defaultComponent: unknown,
  path: string,
  recordPath: string
): Promise<string | null> {
  if (typeof defaultComponent !== 'function') return null
  try {
    const loaded = await (defaultComponent as () => Promise<unknown>)()
    return validateLoadedComponent(loaded, path, recordPath)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return `Route "${path}" konnte nicht geladen werden (record: "${recordPath}"): ${message}`
  }
}

async function getRouteImportError(path: string): Promise<string | null> {
  const matchedRecords = router.resolve(path).matched
  if (!matchedRecords.length) return `Route "${path}" wird vom Router nicht aufgelöst.`
  for (const record of matchedRecords) {
    const defaultComponent = record.components?.default
    if (!defaultComponent) {
      return `Route "${path}" hat keine Default-Komponente (record: "${record.path}").`
    }
    const error = await loadRouteComponent(defaultComponent, path, record.path)
    if (error) return error
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
        provide: {
          [routeLocationKey]: {
            path: '/'
          }
        }
      }
    })

    await flushPromises()

    expect(wrapper.classes()).toContain('sidebar-panel')
    expect(wrapper.find('.sidenav').exists()).toBe(false)

    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((link) => toPathValue(link.props('to')))
      .filter((path): path is string => !!path)

    const linkedPaths = new Set(targets)
    const expectedSidebarPaths = new Set([
      '/',
      '/einstellungen',
      '/administration',
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
      '/studies',
      '/reporting/case-setup',
      '/reporting',
      '/export',
      '/hub-export'
    ])

    expect(linkedPaths).toEqual(expectedSidebarPaths)

    const errors = (
      await Promise.all([...linkedPaths].map((path) => getRouteImportError(path)))
    ).filter((routeError): routeError is string => routeError !== null)

    expect(errors).toEqual([])

    wrapper.unmount()
  }, 15000)

  it('markiert Dokumentation: Übersicht als aktiv auf /reporting', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        provide: {
          [routeLocationKey]: {
            path: '/reporting'
          }
        }
      }
    })

    await flushPromises()

    const reportingLink = getNodeByText(wrapper.findAll('.nav-link'), 'Dokumentation: Übersicht')
    expect(reportingLink.classes()).toContain('active')

    const caseSetupLink = getNodeByText(wrapper.findAll('.nav-link'), '3. Dokumentation starten')
    expect(caseSetupLink.classes()).not.toContain('active')

    wrapper.unmount()
  })

  it('markiert 3. Dokumentation starten als aktiv auf /reporting/case-setup', async () => {
    const wrapper = mount(SidebarComponent, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        },
        directives: {
          can: () => {}
        },
        provide: {
          [routeLocationKey]: {
            path: '/reporting/case-setup'
          }
        }
      }
    })

    await flushPromises()

    const caseSetupLink = getNodeByText(wrapper.findAll('.nav-link'), '3. Dokumentation starten')
    expect(caseSetupLink.classes()).toContain('active')

    const reportingLink = getNodeByText(wrapper.findAll('.nav-link'), 'Dokumentation: Übersicht')
    expect(reportingLink.classes()).toContain('active')

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
        provide: {
          [routeLocationKey]: {
            path: '/anonymisierung/metriken'
          }
        }
      }
    })

    await flushPromises()

    const metricsLink = getNodeByText(wrapper.findAll('.nav-link'), 'Anonymisierungsmetriken')
    expect(metricsLink.classes()).toContain('active')

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
        provide: {
          [routeLocationKey]: {
            path: '/anonymisierung/evaluation'
          }
        }
      }
    })

    await flushPromises()

    const evaluationLink = getNodeByText(wrapper.findAll('.nav-link'), 'Anonymisierungsevaluation')
    expect(evaluationLink.classes()).toContain('active')

    wrapper.unmount()
  })
})
