import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnnotationDashboard from '@/components/Dashboard/AnnotationDashboard.vue'

const api = vi.hoisted(() => ({
  fetchAiDatasetOptions: vi.fn(),
  fetchStudyCohortPreview: vi.fn(),
  fetchAdministrationOverview: vi.fn()
}))

const axios = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn()
}))

vi.mock('@/api/aiDatasetApi', () => ({
  fetchAiDatasetOptions: api.fetchAiDatasetOptions
}))

vi.mock('@/api/studyApi', () => ({
  fetchStudyCohortPreview: api.fetchStudyCohortPreview
}))

vi.mock('@/api/administrationApi', () => ({
  fetchAdministrationOverview: api.fetchAdministrationOverview
}))

vi.mock('@/api/axiosInstance', () => ({
  default: axios,
  r: (path: string) => `/endoreg/${path}`
}))

vi.mock('axios', () => ({
  default: axios
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

const hubHealth = {
  ready: true,
  sourceNodeConfigured: true,
  sourceNodeKey: 'source-wue',
  exactlyOneActiveHub: true,
  autoQueueEnabled: true,
  hubNodes: [
    {
      nodeKey: 'hub-central',
      displayName: 'Central Hub',
      active: true,
      owningCenterKey: 'wue',
      httpsConfigured: true
    }
  ],
  transport: {
    requireMtls: true,
    clientCertificateConfigured: true,
    clientCertificateReadable: true,
    clientKeyConfigured: true,
    clientKeyReadable: true,
    customCaConfigured: true,
    customCaReadable: true,
    ready: true
  }
}

function mountDashboard() {
  return mount(AnnotationDashboard, {
    global: {
      stubs: {
        AnnotationStatsComponent: true,
        RouterLink: RouterLinkStub
      }
    }
  })
}

describe('AnnotationDashboard operational state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    axios.get.mockResolvedValue({ data: [] })
    api.fetchAiDatasetOptions.mockResolvedValue([
      {
        id: 4,
        value: 'colonoscopy-images',
        label: 'Colonoscopy Images',
        datasetType: 'image',
        aiModelType: 'image_multilabel_classification',
        isActive: true,
        nameCount: 1
      },
      {
        id: 5,
        value: 'legacy-segments',
        label: 'Legacy Segments',
        datasetType: 'video',
        aiModelType: 'video_segment_classification',
        isActive: false,
        nameCount: 1
      }
    ])
    api.fetchStudyCohortPreview.mockResolvedValue({
      summary: { caseCount: 12, patientCount: 9, reportCount: 8, videoCount: 11 }
    })
    api.fetchAdministrationOverview.mockResolvedValue({ hubHealth })
  })

  it('renders the current datasets, aggregate cohort, and hub readiness', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    expect(api.fetchStudyCohortPreview).toHaveBeenCalledWith({ limit: 1 })
    expect(wrapper.get('[data-test="dataset-state"]').text()).toContain('2')
    expect(wrapper.get('[data-test="dataset-state"]').text()).toContain('1 aktiv')
    expect(wrapper.get('[data-test="dataset-state"]').text()).toContain('Colonoscopy Images · Bild')
    expect(wrapper.get('[data-test="dataset-state"]').text()).toContain('Legacy Segments · Video')
    expect(wrapper.get('[data-test="cohort-state"]').text()).toContain('12Fälle')
    expect(wrapper.get('[data-test="cohort-state"]').text()).toContain('9Patienten')
    expect(wrapper.get('[data-test="cohort-state"]').text()).toContain('8Befunde')
    expect(wrapper.get('[data-test="cohort-state"]').text()).toContain('11Videos')
    expect(wrapper.get('[data-test="hub-state"]').text()).toContain('Betriebsbereit')
    expect(wrapper.get('[data-test="hub-state"]').text()).toContain('source-wue')
    expect(wrapper.get('[data-test="hub-state"]').text()).toContain('Central Hub · HTTPS')

    const links = wrapper.findAllComponents(RouterLinkStub)
    expect(links.map((link) => link.props('to'))).toEqual(
      expect.arrayContaining(['/ai-dataset-settings', '/studies', '/administration'])
    )
  })

  it('shows each unavailable source explicitly without inventing zero values', async () => {
    api.fetchAiDatasetOptions.mockRejectedValueOnce(new Error('dataset unavailable'))
    api.fetchStudyCohortPreview.mockRejectedValueOnce(new Error('cohort unavailable'))
    api.fetchAdministrationOverview.mockRejectedValueOnce(new Error('hub unavailable'))

    const wrapper = mountDashboard()
    await flushPromises()

    expect(wrapper.get('[data-test="dataset-state"]').text()).toContain(
      'Datensatzstatus ist derzeit nicht verfügbar.'
    )
    expect(wrapper.get('[data-test="cohort-state"]').text()).toContain(
      'Kohortenstatus ist derzeit nicht verfügbar.'
    )
    expect(wrapper.get('[data-test="hub-state"]').text()).toContain(
      'Hub-Zustand ist derzeit nicht verfügbar.'
    )
    expect(wrapper.get('[data-test="cohort-state"]').text()).not.toContain('0Fälle')
  })

  it('refreshes all read-only operational sources', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    await wrapper.get('[data-test="refresh-operational-state"]').trigger('click')
    await flushPromises()

    expect(api.fetchAiDatasetOptions).toHaveBeenCalledTimes(2)
    expect(api.fetchStudyCohortPreview).toHaveBeenCalledTimes(2)
    expect(api.fetchAdministrationOverview).toHaveBeenCalledTimes(2)
  })
})
