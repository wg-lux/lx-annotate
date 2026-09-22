import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  fetchStudyCohortPreview: vi.fn(),
  fetchStudyCohorts: vi.fn(),
  fetchAiDatasetOptions: vi.fn(),
  saveStudyCohort: vi.fn(),
  routerPush: vi.fn()
}))

vi.mock('@/api/studyCohortApi', () => ({
  previewStudyCohort: hoisted.fetchStudyCohortPreview,
  fetchStudyCohorts: hoisted.fetchStudyCohorts,
  saveStudyCohort: hoisted.saveStudyCohort
}))
vi.mock('@/api/aiDatasetApi', () => ({ fetchAiDatasetOptions: hoisted.fetchAiDatasetOptions }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: hoisted.routerPush })
}))

import StudyCohortPage from '@/views/studies/StudyCohortPage.vue'
import { useStudyCohortExportStore } from '@/stores/studyCohortExportStore'

const response = {
  schemaVersion: '1.0',
  filters: {
    centerKey: 'center-a',
    finding: 'polyp',
    hasReport: true,
    hasVideo: false,
    limit: 100
  },
  summary: {
    caseCount: 2,
    patientCount: 2,
    reportCount: 3,
    videoCount: 1
  },
  cases: [
    {
      patientExaminationId: 314,
      patientExaminationIds: [314, 315],
      caseHash: 'case-abc',
      caseHashes: ['case-abc', 'case-follow-up'],
      patientHash: 'patient-xyz',
      examinationName: 'colonoscopy',
      examinationDate: '2026-04-01',
      examinations: [
        {
          patientExaminationId: 314,
          caseHash: 'case-abc',
          examinationName: 'colonoscopy',
          examinationDate: '2026-04-01'
        },
        {
          patientExaminationId: 315,
          caseHash: 'case-follow-up',
          examinationName: 'gastroscopy',
          examinationDate: '2026-05-01'
        }
      ],
      centerKeys: ['center-a'],
      findings: ['polyp'],
      annotationLabels: ['adenoma'],
      reports: [
        {
          id: 73,
          documentType: 'endoscopy-report',
          streamUrl: '/processed/report/73',
          availability: 'LOCAL'
        }
      ],
      videos: [
        {
          id: 81,
          streamUrl: '/processed/video/81',
          availability: 'HUB_ONLY'
        }
      ]
    }
  ],
  options: {
    centers: [{ key: 'center-a', label: 'Center A' }],
    examinations: ['colonoscopy'],
    documentTypes: ['endoscopy-report'],
    findings: ['polyp'],
    annotationLabels: ['adenoma']
  }
}

describe('StudyCohortPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    hoisted.fetchStudyCohortPreview.mockResolvedValue(response)
    hoisted.fetchStudyCohorts.mockResolvedValue([])
    hoisted.fetchAiDatasetOptions.mockResolvedValue([])
  })

  it('waits for an explicit preview and renders grouped report/video cases', async () => {
    const wrapper = mount(StudyCohortPage)

    expect(hoisted.fetchStudyCohortPreview).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="case-limit"]').attributes('max')).toBe('500')
    expect(wrapper.get('[data-test="preview-empty"]').text()).toContain(
      'keine lokalen Beispieldaten'
    )

    await wrapper.get('[data-test="study-name"]').setValue('Polypenregister 2026')
    await wrapper
      .get('[data-test="study-hypothesis"]')
      .setValue('Adenome treten häufiger in Untersuchungen mit annotierten Polypen auf.')
    await wrapper.get('[data-test="date-from"]').setValue('2026-01-01')
    await wrapper.get('[data-test="date-to"]').setValue('2026-06-30')
    await wrapper.get('[data-test="center-key"]').setValue('center-a')
    await wrapper.get('[data-test="finding"]').setValue('polyp')
    await wrapper.get('[data-test="has-report"]').setValue('true')
    await wrapper.get('[data-test="has-video"]').setValue('false')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(hoisted.fetchStudyCohortPreview).toHaveBeenCalledWith(
      {
        name: 'Polypenregister 2026',
        hypothesis: 'Adenome treten häufiger in Untersuchungen mit annotierten Polypen auf.',
        datasetIds: [],
        filters: {
          dateFrom: '2026-01-01',
          dateTo: '2026-06-30',
          centerKey: 'center-a',
          examinationName: null,
          documentType: null,
          finding: 'polyp',
          annotationLabel: null,
          hasReport: true,
          hasVideo: false,
          limit: 100
        }
      },
      expect.any(AbortSignal)
    )
    expect(wrapper.get('[data-test="summary-case-count"]').text()).toBe('2')
    expect(wrapper.get('[data-test="summary-report-count"]').text()).toBe('3')
    expect(wrapper.get('[data-test="cohort-case"]').text()).toContain('case-abc')
    expect(wrapper.get('[data-test="cohort-case"]').text()).toContain('polyp')
    expect(wrapper.get('[data-test="cohort-case"]').text()).toContain('#73')
    expect(wrapper.get('[data-test="cohort-case"]').text()).toContain('#81')
    expect(wrapper.get('a[href="/processed/report/73"]').attributes('rel')).toBe(
      'noopener noreferrer'
    )
    expect(useStudyCohortExportStore().definition).toMatchObject({
      studyName: 'Polypenregister 2026',
      patientExaminationIds: [314, 315],
      filters: { centerKey: 'center-a', finding: 'polyp' }
    })
    expect(useStudyCohortExportStore().definition?.summary.patientCount).toBe(1)

    // Act
    await wrapper.get('[data-test="open-cohort-export"]').trigger('click')

    // Assert
    expect(hoisted.routerPush).toHaveBeenCalledWith({
      path: '/export',
      query: { mode: 'cohort' }
    })
  })

  it('requires a hypothesis before querying the backend', async () => {
    const wrapper = mount(StudyCohortPage)
    await wrapper.get('[data-test="study-name"]').setValue('Register')

    await wrapper.get('form').trigger('submit')

    expect(hoisted.fetchStudyCohortPreview).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="study-error"]').text()).toContain('Hypothese')
  })

  it('shows backend errors without inserting fallback cases', async () => {
    hoisted.fetchStudyCohortPreview.mockRejectedValue({
      response: { data: { detail: 'Cohort preview unavailable' } }
    })
    const wrapper = mount(StudyCohortPage)
    await wrapper.get('[data-test="study-name"]').setValue('Register')
    await wrapper.get('[data-test="study-hypothesis"]').setValue('Prüfbare Hypothese')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-test="study-error"]').text()).toContain('Cohort preview unavailable')
    expect(wrapper.find('[data-test="cohort-case"]').exists()).toBe(false)
  })

  it('fails loudly when the cohort response contains invalid examination IDs', async () => {
    // Arrange
    hoisted.fetchStudyCohortPreview.mockResolvedValue({
      ...response,
      cases: [{ ...response.cases[0], patientExaminationIds: [0] }]
    })
    const wrapper = mount(StudyCohortPage)
    await wrapper.get('[data-test="study-name"]').setValue('Register')
    await wrapper.get('[data-test="study-hypothesis"]').setValue('Prüfbare Hypothese')

    // Act
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    // Assert
    expect(wrapper.get('[data-test="study-error"]').text()).toContain(
      'invalid patient examination ID'
    )
    expect(useStudyCohortExportStore().definition).toBeNull()
  })

  it('explains eligibility and empty dataset results', async () => {
    hoisted.fetchStudyCohortPreview.mockResolvedValue({
      ...response,
      cases: [],
      summary: { caseCount: 0, patientCount: 0, reportCount: 0, videoCount: 0 },
      eligibility: {
        datasetCount: 1,
        datasetVideoCount: 3,
        missingExaminationVideoCount: 3,
        conflictingPatientVideoCount: 0,
        candidateExaminationCount: 0,
        pseudonymousExaminationCount: 0,
        displayedPatientCount: 0
      }
    })
    const wrapper = mount(StudyCohortPage)
    expect(wrapper.get('[data-test="cohort-eligibility"]').text()).toContain(
      'positive Frame-Annotation'
    )
    await wrapper.get('[data-test="study-name"]').setValue('Study')
    await wrapper.get('[data-test="study-hypothesis"]').setValue('Hypothesis')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-test="cohort-empty"]').text()).toContain('Untersuchungszuordnung')
    expect(wrapper.get('[data-test="cohort-selection-scope"]').text()).toContain(
      '3 ohne Untersuchungszuordnung'
    )
    expect(wrapper.get('[data-test="open-cohort-export"]').attributes('disabled')).toBeDefined()
  })

  it('discards an old preview after its filters change', async () => {
    let resolvePreview!: (value: typeof response) => void
    hoisted.fetchStudyCohortPreview.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve
        })
    )
    const wrapper = mount(StudyCohortPage)
    await wrapper.get('[data-test="study-name"]').setValue('Study')
    await wrapper.get('[data-test="study-hypothesis"]').setValue('Hypothesis')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('[data-test="finding"]').setValue('new filter')
    resolvePreview(response)
    await flushPromises()
    expect(wrapper.find('[data-test="cohort-cases"]').exists()).toBe(false)
    expect(useStudyCohortExportStore().definition).toBeNull()
  })

  it('loads and saves multiple dataset links on a persisted cohort', async () => {
    const saved = {
      id: 12,
      name: 'Saved study',
      hypothesis: 'Hypothesis',
      filters: { limit: 100 },
      datasetIds: [7, 8],
      updatedAt: '2026-09-22'
    }
    hoisted.fetchStudyCohorts.mockResolvedValue([saved])
    hoisted.fetchAiDatasetOptions.mockResolvedValue([
      { id: 7, label: 'A' },
      { id: 8, label: 'B' }
    ])
    hoisted.saveStudyCohort.mockResolvedValue(saved)
    const wrapper = mount(StudyCohortPage)
    await flushPromises()
    await wrapper.get('[data-test="saved-cohort"]').setValue('12')
    await wrapper.get('[data-test="save-cohort"]').trigger('click')
    await flushPromises()
    expect(hoisted.saveStudyCohort).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Saved study', datasetIds: [7, 8] }),
      12
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(hoisted.fetchStudyCohortPreview).toHaveBeenCalledWith(
      expect.objectContaining({ datasetIds: [7, 8] }),
      expect.any(AbortSignal)
    )
  })
})
