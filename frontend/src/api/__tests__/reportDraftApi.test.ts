import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '@/types/api/endpoints'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    put: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`,
  endoregApi: (path: string) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
  r: (path: string) => `/api/${path}`
}))

import { fetchPatientExaminationDraft, savePatientExaminationDraft } from '@/api/reportDraftApi'

describe('reportDraftApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches persisted draft state for a patient examination', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: {
        patient_examination_id: 314,
        revision: 4,
        draft: {
          module_name: 'report_template_examples',
          template_name: 'star_upper_gi_main',
          indications: [{ examination_indication_id: 12, indication_choice_id: 21 }],
          template_section_drafts: {
            examination_baseline: {
              note: 'Stable baseline',
              includePatientData: true,
              includeExaminationData: false
            }
          },
          selected_report_language: 'de',
          active_report_id: 88,
          report_text_mode: 'manual',
          rendered_text: 'Klinischer Freitext',
          payload: {}
        },
        updated_at: '2026-03-19T14:00:00.000Z'
      }
    })

    const result = await fetchPatientExaminationDraft(314)

    expect(hoisted.axios.get).toHaveBeenCalledWith(
      `/api/${endpoints.examination.patientExaminationDraft(314)}`
    )
    expect(result.draft.template_name ?? result.draft.templateName).toBe('star_upper_gi_main')
    expect(result.revision).toBe(4)
    expect(result.draft).toMatchObject({
      indications: [{ examinationIndicationId: 12, indicationChoiceId: 21 }],
      templateSectionDrafts: {
        examination_baseline: {
          note: 'Stable baseline',
          includePatientData: true,
          includeExaminationData: false
        }
      },
      selectedReportLanguage: 'de',
      activeReportId: 88,
      reportTextMode: 'manual',
      renderedText: 'Klinischer Freitext'
    })
  })

  it('normalizes a missing draft to an empty draft', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: { patient_examination_id: 314, revision: 0, updated_at: null }
    })

    await expect(fetchPatientExaminationDraft(314)).resolves.toMatchObject({
      patient_examination_id: 314,
      revision: 0,
      draft: {},
      updated_at: null
    })
  })

  it('rejects malformed draft payloads at the API boundary', async () => {
    hoisted.axios.get.mockResolvedValue({ data: { draft: 'not-an-object' } })

    await expect(fetchPatientExaminationDraft(314)).rejects.toThrow(
      'Report draft response contains an invalid draft'
    )
  })

  it.each([
    {},
    { patientExaminationId: 315 },
    { patient_examination_id: 315 },
    { patientExaminationId: 314, patient_examination_id: 315 },
    { patientExaminationId: 315, patient_examination_id: 314 }
  ])('rejects missing or contradictory examination identities: %j', async (identity) => {
    hoisted.axios.get.mockResolvedValue({ data: { ...identity, revision: 4, draft: {} } })

    await expect(fetchPatientExaminationDraft(314)).rejects.toThrow(
      'Report draft response does not match the requested patient examination'
    )
  })

  it.each([undefined, null, -1, 1.5, '4', Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid or missing draft revision: %s',
    async (revision) => {
      hoisted.axios.get.mockResolvedValue({
        data: { patientExaminationId: 314, revision, draft: {} }
      })

      await expect(fetchPatientExaminationDraft(314)).rejects.toThrow(/revision/)
    }
  )

  it('accepts matching camelCase identity and an explicit initial revision', async () => {
    hoisted.axios.get.mockResolvedValue({
      data: { patientExaminationId: 314, revision: 0, draft: {}, updatedAt: null }
    })

    await expect(fetchPatientExaminationDraft(314)).resolves.toMatchObject({
      patientExaminationId: 314,
      revision: 0,
      draft: {},
      updatedAt: null
    })
  })

  it.each([
    { patientExaminationId: 315, revision: 5 },
    { patientExaminationId: 314, revision: 4 },
    { patientExaminationId: 314, revision: 6 },
    { patientExaminationId: 314 }
  ])('rejects an unbound or incorrect save acknowledgement: %j', async (response) => {
    hoisted.axios.put.mockResolvedValue({ data: { ...response, draft: {} } })

    await expect(
      savePatientExaminationDraft({
        patientExaminationId: 314,
        expectedRevision: 4,
        moduleName: 'report_template_examples',
        templateName: 'star_upper_gi_main',
        indications: [],
        templateSectionDrafts: {},
        selectedReportLanguage: 'de',
        activeReportId: null,
        reportTextMode: 'generated',
        renderedText: '',
        payload: {
          patient: 'patient_42',
          examiners: [],
          examination: 'colonoscopy',
          patientFindings: []
        }
      })
    ).rejects.toThrow(/Report draft response/)
  })

  it('persists unvalidated runtime draft state without reshaping the payload', async () => {
    hoisted.axios.put.mockResolvedValue({
      data: {
        patient_examination_id: 314,
        revision: 5,
        draft: {
          module_name: 'report_template_examples',
          template_name: 'star_upper_gi_main',
          payload: {
            patient: 'patient_42',
            examiners: ['dr_house'],
            examination: 'colonoscopy',
            patientFindings: []
          }
        },
        updated_at: '2026-03-19T14:00:00.000Z'
      }
    })

    const result = await savePatientExaminationDraft({
      patientExaminationId: 314,
      expectedRevision: 4,
      moduleName: 'report_template_examples',
      templateName: 'star_upper_gi_main',
      templateIdentity: {
        moduleName: 'report_template_examples',
        knowledgeBaseVersion: '0.2.8',
        templateVersion: '3',
        templateHash: 'sha256:template',
        lifecycleStatus: 'published',
        readiness: {
          canPublish: true,
          blockingIssues: [],
          warnings: [],
          raw: { can_publish: true }
        }
      },
      indications: [{ examinationIndicationId: 12, indicationChoiceId: 21 }],
      templateSectionDrafts: {
        examination_baseline: {
          note: 'Stable baseline',
          includePatientData: true,
          includeExaminationData: false
        }
      },
      selectedReportLanguage: 'de',
      activeReportId: 88,
      reportTextMode: 'manual',
      renderedText: 'Klinischer Freitext',
      payload: {
        patient: 'patient_42',
        examiners: ['dr_house'],
        examination: 'colonoscopy',
        patientFindings: []
      }
    })

    expect(hoisted.axios.put).toHaveBeenCalledWith(
      `/api/${endpoints.examination.patientExaminationDraft(314)}`,
      {
        expectedRevision: 4,
        moduleName: 'report_template_examples',
        templateName: 'star_upper_gi_main',
        templateIdentity: {
          moduleName: 'report_template_examples',
          knowledgeBaseVersion: '0.2.8',
          templateVersion: '3',
          templateHash: 'sha256:template',
          lifecycleStatus: 'published'
        },
        indications: [{ examinationIndicationId: 12, indicationChoiceId: 21 }],
        templateSectionDrafts: {
          examination_baseline: {
            note: 'Stable baseline',
            includePatientData: true,
            includeExaminationData: false
          }
        },
        selectedReportLanguage: 'de',
        activeReportId: 88,
        reportTextMode: 'manual',
        renderedText: 'Klinischer Freitext',
        payload: {
          patient: 'patient_42',
          examiners: ['dr_house'],
          examination: 'colonoscopy',
          patientFindings: []
        }
      }
    )
    expect(result).toMatchObject({
      patient_examination_id: 314,
      revision: 5,
      draft: {
        module_name: 'report_template_examples',
        template_name: 'star_upper_gi_main'
      },
      updated_at: '2026-03-19T14:00:00.000Z'
    })
  })

  it('rejects malformed save responses at the API boundary', async () => {
    hoisted.axios.put.mockResolvedValue({ data: { draft: 'not-an-object' } })

    await expect(
      savePatientExaminationDraft({
        patientExaminationId: 314,
        expectedRevision: 0,
        moduleName: 'report_template_examples',
        templateName: 'star_upper_gi_main',
        indications: [],
        templateSectionDrafts: {},
        selectedReportLanguage: 'de',
        activeReportId: null,
        reportTextMode: 'generated',
        renderedText: '',
        payload: {
          patient: 'patient_42',
          examiners: [],
          examination: 'colonoscopy',
          patientFindings: []
        }
      })
    ).rejects.toThrow('Report draft response contains an invalid draft')
  })
})
