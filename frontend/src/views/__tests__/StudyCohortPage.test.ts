import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  fetchStudyCohortPreview: vi.fn(),
  fetchStudyCohorts: vi.fn(),
  fetchStudyDefinition: vi.fn(),
  fetchStudyStatistics: vi.fn(),
  studyCaptureCoverage: vi.fn(),
  fetchAiDatasetOptions: vi.fn(),
  saveStudyCohort: vi.fn(),
  deleteStudy: vi.fn(),
  routerPush: vi.fn()
}))

vi.mock('@/components/AiDataset/DatasetManager.vue', () => ({
  default: { template: '<div />', methods: { reload: vi.fn() } }
}))
vi.mock('@/api/studyCohortApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/studyCohortApi')>()),
  previewStudyCohort: hoisted.fetchStudyCohortPreview,
  fetchStudyCohorts: hoisted.fetchStudyCohorts,
  fetchStudyDefinition: hoisted.fetchStudyDefinition,
  fetchStudyStatistics: hoisted.fetchStudyStatistics,
  studyCaptureCoverage: hoisted.studyCaptureCoverage,
  saveStudyCohort: hoisted.saveStudyCohort
}))
vi.mock('@/components/StudyTableImport.vue', () => ({
  default: { template: '<div />', methods: { reload: vi.fn() } }
}))
vi.mock('@/api/datasetLifecycleApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/datasetLifecycleApi')>()),
  delete_study: hoisted.deleteStudy
}))
vi.mock('@/api/aiDatasetApi', () => ({ fetchAiDatasetOptions: hoisted.fetchAiDatasetOptions }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: hoisted.routerPush })
}))

import { AxiosError, AxiosHeaders } from 'axios'
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
      patientId: 7,
      examinationName: 'colonoscopy',
      examinationDate: '2026-04-01',
      examinations: [
        {
          patientExaminationId: 314,
          patientId: 7,
          examinationName: 'colonoscopy',
          examinationDate: '2026-04-01'
        },
        {
          patientExaminationId: 315,
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

  it('checks capture coverage and explicitly stores the saved cohort', async () => {
    hoisted.fetchStudyCohorts.mockResolvedValue([{ id: 3, name: 'Study', hypothesis: 'Question', datasetIds: [], filters: {} }])
    hoisted.studyCaptureCoverage.mockResolvedValue({ examinations: 2, coveredExaminations: 1, missingCollections: 1 })
    const wrapper = mount(StudyCohortPage)
    await flushPromises()
    await wrapper.get('[data-test="saved-cohort"]').setValue('3')
    await flushPromises()
    await wrapper.get('[data-test="check-ledger-coverage"]').trigger('click')
    await flushPromises()
    expect(hoisted.studyCaptureCoverage).toHaveBeenCalledWith(3, false)
    expect(wrapper.text()).toContain('1 ohne Sammlung')
    await wrapper.get('[data-test="capture-study-ledger"]').trigger('click')
    await flushPromises()
    expect(hoisted.studyCaptureCoverage).toHaveBeenCalledWith(3, true)
  })

  it.each([
    [true, [[3], [3, 2]]],
    [false, [[3]]]
  ])(
    'asks again before deleting a study with ledger entries (confirmed=%s)',
    async (confirmed, expectedCalls) => {
      hoisted.fetchStudyCohorts.mockResolvedValue([
        { id: 3, name: 'Study', hypothesis: 'Question', datasetIds: [], filters: {} }
      ])
      const conflict = new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {
          code: 'study_collection_ledger',
          detail: 'Ledger entries exist',
          collection_entry_count: 2
        }
      })
      hoisted.deleteStudy.mockRejectedValueOnce(conflict).mockResolvedValue(undefined)
      const confirm = vi
        .spyOn(window, 'confirm')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(confirmed)
      const wrapper = mount(StudyCohortPage)
      await flushPromises()
      await wrapper.get('[data-test="saved-cohort"]').setValue('3')
      await flushPromises()
      await wrapper.get('[data-test="delete-study"]').trigger('click')
      await flushPromises()
      expect(confirm).toHaveBeenCalledTimes(2)
      expect(confirm.mock.calls[1][0]).toContain('2 gesicherte Ledger-Einträge')
      expect(hoisted.deleteStudy.mock.calls).toEqual(expectedCalls)
      confirm.mockRestore()
    }
  )

  it('evaluates saved rules explicitly and clears results after edits', async () => {
    hoisted.fetchStudyCohorts.mockResolvedValue([
      { id: 3, name: 'Study', hypothesis: 'Question', datasetIds: [1], filters: {} }
    ])
    hoisted.fetchStudyStatistics.mockResolvedValue({
      datasetVideoCount: 7,
      missingExaminationVideoCount: 0,
      conflictingPatientVideoCount: 0,
      datasetExaminationCount: 7,
      evaluatedExaminationCount: 5,
      missingRecordCount: 2,
      analyses: [
        {
          analysisName: 'Ready endpoint',
          analysisDigest: 'digest',
          module: 'test',
          version: '1',
          packageMismatchRecordCount: 1,
          totalUnits: 0,
          includedUnits: 0,
          excludedUnits: 0,
          inclusionUnknown: 0,
          unassignedUnits: 0,
          ambiguousUnits: 0,
          endpoints: [
            {
              group: 'all',
              endpoint: 'success',
              numerator: 0,
              denominator: 0,
              negative: 0,
              missing: 0,
              ineligible: 0,
              eligibilityUnknown: 0,
              conflicting: 0,
              rate: null
            }
          ]
        }
      ],
      skippedAnalyses: [
        {
          analysisName: 'Draft endpoint',
          reason: 'draft',
          unresolvedRequirements: ['Define follow-up']
        }
      ]
    })
    const wrapper = mount(StudyCohortPage)
    await flushPromises()
    expect(hoisted.fetchStudyStatistics).not.toHaveBeenCalled()
    await wrapper.get('[data-test="saved-cohort"]').setValue('3')
    await wrapper.get('[data-test="evaluate-study"]').trigger('click')
    await flushPromises()
    expect(hoisted.fetchStudyStatistics).toHaveBeenCalledWith(3, expect.any(AbortSignal))
    expect(wrapper.get('[data-test="study-statistics"]').text()).toContain(
      'Entwurf, nicht ausgewertet'
    )
    expect(wrapper.get('[data-test="study-statistics"]').text()).toContain('Nicht bestimmbar')
    expect(wrapper.get('[data-test="study-statistics"]').text()).toContain(
      'Abweichende Paketversion: 1'
    )
    await wrapper.get('[data-test="study-hypothesis"]').setValue('Changed')
    expect(wrapper.get('[data-test="study-statistics"]').text()).not.toContain('Draft endpoint')
    expect(wrapper.get('[data-test="evaluate-study"]').attributes('disabled')).toBeDefined()
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
        studyMetadata: {
          participatingCenters: [],
          ageGroups: [],
          terminologyRequirements: [],
          inclusionCriteria: []
        },
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
      expect.any(AbortSignal),
      undefined
    )
    expect(wrapper.get('[data-test="summary-case-count"]').text()).toBe('2')
    expect(wrapper.get('[data-test="summary-report-count"]').text()).toBe('3')
    expect(wrapper.get('[data-test="cohort-case"]').text()).toContain('Patient 7')
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

  it('requires saving edits before previewing a persisted cohort', async () => {
    hoisted.fetchStudyCohorts.mockResolvedValue([
      {
        id: 12,
        name: 'Saved study',
        hypothesis: 'Hypothesis',
        filters: { limit: 100 },
        datasetIds: [],
        updatedAt: '2026-10-13'
      }
    ])
    const wrapper = mount(StudyCohortPage)
    await flushPromises()
    await wrapper.get('[data-test="saved-cohort"]').setValue('12')
    await wrapper.get('[data-test="study-name"]').setValue('Unsaved title')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(hoisted.fetchStudyCohortPreview).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('vor der Vorschau speichern')
  })

  it('loads and saves multiple dataset links on a persisted cohort', async () => {
    const saved = {
      id: 12,
      name: 'Saved study',
      hypothesis: 'Hypothesis',
      filters: { limit: 100 },
      datasetIds: [7, 8],
      studyMetadata: {
        participatingCenters: [{ centerKey: 'center-a', name: 'Center A' }],
        ageGroups: [{ name: 'Adults', minimumAge: 18, maximumAge: null }],
        terminologyRequirements: [{ module: 'coloreg', version: '0.2.0' }],
        inclusionCriteria: [
          {
            name: 'Polyp',
            description: '',
            concepts: [{ module: 'coloreg', version: '0.2.0', kind: 'finding', name: 'polyp' }]
          }
        ]
      },
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
      expect.objectContaining({
        name: 'Saved study',
        datasetIds: [7, 8],
        studyMetadata: saved.studyMetadata
      }),
      12
    )
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(hoisted.fetchStudyCohortPreview).toHaveBeenCalledWith(
      expect.objectContaining({ datasetIds: [7, 8], studyMetadata: saved.studyMetadata }),
      expect.any(AbortSignal),
      12
    )
  })

  it('downloads the saved definition and releases the browser object URL', async () => {
    hoisted.fetchStudyCohorts.mockResolvedValue([
      {
        id: 12,
        name: 'Saved',
        hypothesis: 'Hypothesis',
        filters: {},
        datasetIds: []
      }
    ])
    const blob = new Blob(['schema_version: "1.0"'], { type: 'application/yaml' })
    hoisted.fetchStudyDefinition.mockResolvedValue(blob)
    const createUrl = vi.fn().mockReturnValue('blob:study-definition')
    const revokeUrl = vi.fn()
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createUrl
        static revokeObjectURL = revokeUrl
      }
    )
    const clicked: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push(this.download)
    })
    try {
      const wrapper = mount(StudyCohortPage)
      await flushPromises()
      expect(wrapper.get('[data-test="download-definition"]').attributes('disabled')).toBeDefined()
      await wrapper.get('[data-test="saved-cohort"]').setValue('12')
      await wrapper.get('[data-test="download-definition"]').trigger('click')
      await flushPromises()
      expect(hoisted.fetchStudyDefinition).toHaveBeenCalledWith(12)
      expect(createUrl).toHaveBeenCalledWith(blob)
      expect(clicked).toEqual(['study-12.yml'])
      expect(revokeUrl).toHaveBeenCalledWith('blob:study-definition')
    } finally {
      click.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})
