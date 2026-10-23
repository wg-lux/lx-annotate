import { describe, expect, it } from 'vitest'

import {
  ReportingExaminationResolutionError,
  requireResolvedReportingExamination,
  requireUniqueReportingExaminationName,
  resolveReportingExamination
} from '../reportingExaminationResolution'

const catalog = [
  { id: 7, name: 'gastroscopy', displayName: 'Gastroskopie' },
  { id: 12, name: 'colonoscopy', displayName: 'Koloskopie' }
]

describe('reporting examination resolution', () => {
  it('resolves a missing numeric ID from the canonical examination name', () => {
    expect(
      resolveReportingExamination({
        catalog,
        selectedExaminationId: null,
        examinationName: ' Colonoscopy '
      })
    ).toEqual({ status: 'resolved', examination: catalog[1] })
  })

  it('accepts a coherent ID and canonical name', () => {
    expect(
      requireResolvedReportingExamination({
        catalog,
        selectedExaminationId: 12,
        examinationName: 'colonoscopy'
      })
    ).toBe(catalog[1])
  })

  it.each([
    {
      selectedExaminationId: null,
      examinationName: '',
      code: 'missing_name'
    },
    {
      selectedExaminationId: null,
      examinationName: 'ercp',
      code: 'name_not_found'
    },
    {
      selectedExaminationId: 99,
      examinationName: 'colonoscopy',
      code: 'id_not_found'
    },
    {
      selectedExaminationId: 7,
      examinationName: 'colonoscopy',
      code: 'contradictory_identity'
    }
  ] as const)('fails closed with $code', ({ selectedExaminationId, examinationName, code }) => {
    const resolution = resolveReportingExamination({
      catalog,
      selectedExaminationId,
      examinationName
    })
    expect(resolution).toMatchObject({ status: 'unresolved', code })
    expect(() =>
      requireResolvedReportingExamination({
        catalog,
        selectedExaminationId,
        examinationName
      })
    ).toThrow(ReportingExaminationResolutionError)
  })

  it('rejects duplicate canonical names instead of selecting the first graph node', () => {
    const duplicateCatalog = [...catalog, { id: 13, name: 'colonoscopy' }]
    expect(
      resolveReportingExamination({
        catalog: duplicateCatalog,
        selectedExaminationId: null,
        examinationName: 'colonoscopy'
      })
    ).toMatchObject({ status: 'unresolved', code: 'ambiguous_name' })
    expect(() => requireUniqueReportingExaminationName(duplicateCatalog, 'colonoscopy')).toThrow(
      'nicht eindeutig'
    )
  })
})
