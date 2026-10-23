import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CaseExaminationRecordsPage from '../CaseExaminationRecordsPage.vue'

const mocks = vi.hoisted(() => ({
  cases: vi.fn(),
  list: vi.fn(),
  selections: vi.fn(),
  create: vi.fn(),
  finalize: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  copy: vi.fn(),
  route: { query: { patient_id: '7', case_id: 'case-7' } }
}))
vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  RouterLink: { template: '<a><slot /></a>' }
}))
vi.mock('@/api/casesApi', () => ({ fetchPatientCases: mocks.cases }))
vi.mock('@/api/examinationRevisions', () => ({ examinationRevisions: mocks }))
vi.mock('@/api/axiosInstance', () => ({ default: { post: vi.fn() }, r: (path: string) => path }))

const record = {
  id: 10,
  patientExaminationId: 5,
  title: 'Excel-only draft',
  version: 1,
  finalizedAt: null,
  snapshot: {
    content: {
      examination: { patient: '7', examination: 'example', patientFindings: [] },
      medications: [],
      labValues: [
        {
          labValue: 'example_lab',
          value: 0,
          valueStr: null,
          timestamp: '2026-01-01T10:00:00Z',
          unit: 'mg',
          normalRange: {}
        }
      ]
    }
  }
}

describe('examination alternatives', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.route = reactive({ query: { patient_id: '7', case_id: 'case-7' } })
    mocks.cases.mockResolvedValue([
      {
        id: 3,
        caseId: 'case-7',
        patient: 7,
        isClosed: false,
        isDeleted: false,
        patientExaminations: [{ id: 5, examinationName: 'Example', dateStart: '2026-01-01' }],
        documents: [],
        patientMedications: [],
        patientLabValues: []
      }
    ])
    mocks.list.mockResolvedValue([structuredClone(record)])
    mocks.selections.mockResolvedValue([])
    mocks.create.mockResolvedValue(record)
    mocks.update.mockResolvedValue(record)
  })

  it('permits media-free drafts and disables closing until an examination is selected', async () => {
    const wrapper = mount(CaseExaminationRecordsPage)
    await flushPromises()
    await wrapper.get('#revision-title').setValue('Imported examination')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith(5, 'Imported examination', {
      reportId: null,
      videoId: null,
      annotator: null,
      medicationIds: [],
      labValueIds: []
    })
    const close = wrapper.findAll('button').find((button) => button.text() === 'Fall schließen')
    expect(close?.attributes('disabled')).toBeDefined()
  })

  it('edits a persisted lab value using the expected revision version', async () => {
    const wrapper = mount(CaseExaminationRecordsPage)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Angaben bearbeiten')
      ?.trigger('click')
    await wrapper.get('input[type="number"]').setValue('3.5')
    const forms = wrapper.findAll('form')
    await forms[1]?.trigger('submit')
    await flushPromises()
    const submitted: unknown = mocks.update.mock.calls[0]?.[0]
    expect(submitted).toMatchObject({
      version: 1,
      snapshot: { content: { labValues: [{ value: 3.5 }] } }
    })
  })

  it('includes canonical medication and laboratory IDs alongside findings for the requested examination', async () => {
    Object.assign(mocks.route.query, { patient_examination_id: '6' })
    mocks.cases.mockResolvedValue([
      {
        id: 3,
        caseId: 'case-7',
        patient: 7,
        isClosed: false,
        isDeleted: false,
        patientExaminations: [{ id: 5 }, { id: 6 }],
        documents: [],
        patientMedications: [11],
        patientLabValues: [12]
      }
    ])
    const wrapper = mount(CaseExaminationRecordsPage)
    await flushPromises()
    expect(mocks.list).toHaveBeenCalledWith(6)
    await wrapper.get('#revision-title').setValue('Medication review')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledWith(6, 'Medication review', {
      reportId: null,
      videoId: null,
      annotator: null,
      medicationIds: [11],
      labValueIds: [12]
    })
    Object.assign(mocks.route.query, { patient_examination_id: '5' })
    await flushPromises()
    expect(mocks.list).toHaveBeenLastCalledWith(5)
    wrapper.unmount()
  })

  it('rejects an examination outside the case without loading or creating its revisions', async () => {
    Object.assign(mocks.route.query, { patient_examination_id: '999' })
    const wrapper = mount(CaseExaminationRecordsPage)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('gehört nicht zu diesem Fall')
    expect(mocks.list).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    expect(mocks.create).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('separates finalization from case selection and clears foreign context', async () => {
    mocks.list.mockResolvedValue([
      { ...structuredClone(record), finalizedAt: '2026-01-01T10:00:00Z' }
    ])
    const wrapper = mount(CaseExaminationRecordsPage)
    await flushPromises()
    expect(wrapper.text()).not.toContain('Fassung abschließen')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Für Fall auswählen')
      ?.trigger('click')
    await flushPromises()
    expect(mocks.select).toHaveBeenCalledWith('case-7', expect.objectContaining({ id: 10 }))
    mocks.cases.mockResolvedValue([])
    mocks.route.query.case_id = 'foreign-case'
    await flushPromises()
    expect(wrapper.text()).not.toContain('Excel-only draft')
    expect(wrapper.get('[role="alert"]').text()).toContain('nicht verfügbar')
  })
})
