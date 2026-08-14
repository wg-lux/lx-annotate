import { describe, expect, it } from 'vitest'

import { parseReportListPayload } from '../reportListPayload'

describe('parseReportListPayload', () => {
  it('normalizes a paginated list without trusting unrelated fields', () => {
    expect(
      parseReportListPayload({
        results: [
          {
            id: 12,
            status: 'draft',
            version: 3,
            updatedAt: '2026-08-04T10:00:00Z',
            renderedText: 'Unauffälliger Befund.',
            templateName: 'standard_colonoscopy',
            ignored: 'value'
          }
        ]
      })
    ).toEqual([
      {
        id: 12,
        status: 'draft',
        version: 3,
        createdAt: undefined,
        updatedAt: '2026-08-04T10:00:00Z',
        renderedText: 'Unauffälliger Befund.',
        templateName: 'standard_colonoscopy',
        patientExaminationId: undefined,
        patientExamination: undefined,
        patientExaminationFk: undefined
      }
    ])
  })

  it('preserves supported patient-examination references', () => {
    const rows = parseReportListPayload([
      { id: 1, patientExaminationId: 41 },
      { id: 2, patientExamination: { id: 42 } },
      { id: 3, patientExaminationFk: 43 }
    ])

    expect(
      rows.map((row) => [
        row.id,
        row.patientExaminationId,
        row.patientExamination,
        row.patientExaminationFk
      ])
    ).toEqual([
      [1, 41, undefined, undefined],
      [2, undefined, { id: 42 }, undefined],
      [3, undefined, undefined, 43]
    ])
  })

  it('rejects malformed list entries instead of silently hiding contract failures', () => {
    expect(() => parseReportListPayload({ results: [{ id: 7 }, { id: Number.NaN }] })).toThrow(
      'Report list entry 1 must contain a positive integer id'
    )
  })

  it('rejects an invalid response envelope', () => {
    expect(() => parseReportListPayload({ results: 'invalid' })).toThrow(
      'Report list response must be an array'
    )
  })

  it('rejects malformed optional fields rather than converting them to missing values', () => {
    expect(() => parseReportListPayload([{ id: 7, version: 'one' }])).toThrow(
      'Report list field "version" must be a finite number or null'
    )
    expect(() => parseReportListPayload([{ id: 7, renderedText: { text: 'unsafe' } }])).toThrow(
      'Report list field "renderedText" must be a string or null'
    )
  })
})
