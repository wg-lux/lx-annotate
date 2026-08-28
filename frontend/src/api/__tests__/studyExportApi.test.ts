import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  axios: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/api/axiosInstance', () => ({
  default: hoisted.axios,
  r: (path: string) => `/endoreg/${path}`
}))

import {
  buildStudyCohortExportPayload,
  buildStudyExportQuery,
  fetchStudyCohortExportWorkbook,
  fetchStudyExportOptions,
  fetchStudyExportWorkbook
} from '@/api/studyExportApi'

describe('studyExportApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('encodes repeated clinical criteria without collapsing selections', () => {
    const query = buildStudyExportQuery({
      examinations: ['colonoscopy', 'gastroscopy'],
      findings: ['polyp'],
      indications: ['screening', 'surveillance'],
      groupBy: 'patient'
    })

    expect(query.get('group_by')).toBe('patient')
    expect(query.getAll('examination')).toEqual(['colonoscopy', 'gastroscopy'])
    expect(query.getAll('finding')).toEqual(['polyp'])
    expect(query.getAll('indication')).toEqual(['screening', 'surveillance'])
  })

  it('encodes the reviewed cohort snapshot and its study filters', () => {
    // Arrange
    const definition = {
      studyName: 'Polypenregister 2026',
      hypothesis: 'Polypen treten häufiger auf.',
      schemaVersion: '1.0',
      filters: {
        dateFrom: '2026-01-01',
        centerKey: 'center-a',
        hasReport: true,
        hasVideo: false,
        limit: 100
      },
      summary: { caseCount: 1, patientCount: 1, reportCount: 1, videoCount: 0 },
      patientExaminationIds: [314, 315]
    }

    // Act
    const payload = buildStudyCohortExportPayload(definition)

    // Assert
    expect(payload).toMatchObject({
      mode: 'cohort',
      group_by: 'patient',
      study_name: 'Polypenregister 2026',
      patient_examination_id: [314, 315],
      date_from: '2026-01-01',
      center_key: 'center-a',
      has_report: true,
      has_video: false,
      limit: 100
    })
  })

  it('loads server-derived export options', async () => {
    const payload = {
      examinations: ['colonoscopy'],
      findings: ['polyp'],
      indications: ['screening'],
      maximumRows: 25000
    }
    hoisted.axios.get.mockResolvedValue({ data: payload })

    await expect(fetchStudyExportOptions()).resolves.toBe(payload)
    expect(hoisted.axios.get).toHaveBeenCalledWith(
      '/endoreg/media/studies/case-export/options/'
    )
  })

  it('requests the workbook through the DRF JSON negotiation contract', async () => {
    // Arrange
    const blob = new Blob(['xlsx'])
    hoisted.axios.get.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition': 'attachment; filename="pseudonymous-study-cases-2026.xlsx"',
        'x-export-row-count': '17'
      }
    })

    // Act
    const result = await fetchStudyExportWorkbook({
      examinations: [],
      findings: ['polyp'],
      indications: [],
      groupBy: 'examination'
    })

    const calls = hoisted.axios.get.mock.calls as unknown as Array<
      [string, { params: URLSearchParams; responseType: string; headers: { Accept: string } }]
    >
    const config = calls[0][1]

    // Assert
    expect(hoisted.axios.get.mock.calls[0][0]).toBe(
      '/endoreg/media/studies/case-export.xlsx'
    )
    expect(config.params.getAll('finding')).toEqual(['polyp'])
    expect(config.params.get('group_by')).toBe('examination')
    expect(config.responseType).toBe('blob')
    expect(config.headers.Accept).toBe('application/json')
    expect(result).toEqual({
      blob,
      filename: 'pseudonymous-study-cases-2026.xlsx',
      rowCount: 17
    })
  })

  it('downloads a cohort workbook through the binary response contract', async () => {
    // Arrange
    const blob = new Blob(['cohort-xlsx'])
    hoisted.axios.post.mockResolvedValue({
      data: blob,
      headers: {
        'content-disposition': 'attachment; filename="pseudonymous-study-cohort.xlsx"',
        'x-export-row-count': '2'
      }
    })
    const definition = {
      studyName: 'Register',
      hypothesis: 'Prüfbare Hypothese',
      schemaVersion: '1.0',
      filters: { finding: 'polyp', limit: 100 },
      summary: { caseCount: 2, patientCount: 2, reportCount: 1, videoCount: 1 },
      patientExaminationIds: [11, 12]
    }

    // Act
    const result = await fetchStudyCohortExportWorkbook(definition)

    // Assert
    const [url, payload, config] = hoisted.axios.post.mock.calls[0] as [
      string,
      { mode: string; patient_examination_id: number[] },
      {
        responseType: string
        headers: { Accept: string }
      }
    ]
    expect(url).toBe('/endoreg/media/studies/case-export.xlsx')
    expect(payload.mode).toBe('cohort')
    expect(payload.patient_examination_id).toEqual([11, 12])
    expect(config.responseType).toBe('blob')
    expect(config.headers.Accept).toBe('application/json')
    expect(result).toEqual({
      blob,
      filename: 'pseudonymous-study-cohort.xlsx',
      rowCount: 2
    })
  })
})
