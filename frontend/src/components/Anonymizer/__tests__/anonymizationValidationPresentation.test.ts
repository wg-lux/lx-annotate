import { describe, expect, it } from 'vitest'

import {
  caseLinkageStatusBadgeClass,
  caseLinkageStatusDescription,
  caseLinkageStatusLabel,
  formatPatientExamination,
  formatPseudoPatient,
  normalizeDocumentTypeOptions,
  normalizePatientExaminationOption,
  resolveCaseLinkageStatus
} from '../anonymizationValidationPresentation'

describe('anonymization validation presentation', () => {
  it('normalizes document-type dropdown payloads', () => {
    expect(
      normalizeDocumentTypeOptions([
        'report',
        { value: 'discharge_letter', label: 'Entlassbrief' },
        { value: 3, label: 'invalid' },
        null
      ])
    ).toEqual([
      { value: 'report', label: 'report' },
      { value: 'discharge_letter', label: 'Entlassbrief' }
    ])
  })

  it('normalizes patient-examination dropdown records', () => {
    expect(
      normalizePatientExaminationOption({
        id: '42',
        examination_name: 'Koloskopie',
        date_start: '2026-08-03T10:00:00Z'
      })
    ).toEqual({ id: 42, label: '#42 · Koloskopie · 2026-08-03' })
    expect(normalizePatientExaminationOption({ id: 0 })).toBeNull()
  })

  it.each([
    ['linked', false, 'linked'],
    ['deferred', false, 'deferred'],
    ['suggested', false, 'suggested'],
    ['unresolved', true, 'not_linked'],
    [null, true, 'suggested']
  ] as const)('resolves match status %s with hints=%s to %s', (matchStatus, hints, expected) => {
    expect(
      resolveCaseLinkageStatus({
        matchStatus,
        linkedPatientExaminationId: null,
        currentPatientExaminationId: null,
        hasLinkageHints: hints
      })
    ).toBe(expected)
  })

  it('keeps linkage status copy and styling consistent', () => {
    expect(caseLinkageStatusLabel('linked')).toBe('Verknuepft')
    expect(caseLinkageStatusBadgeClass('suggested')).toBe('bg-warning text-dark')
    expect(
      caseLinkageStatusDescription('suggested', {
        matchStatus: 'suggested',
        suggestedMatchCount: 2
      })
    ).toContain('Mehrere passende PatientExaminations')
  })

  it('formats linked and suggested case identifiers', () => {
    expect(formatPseudoPatient(7, 2)).toBe('#7 (2 Treffer)')
    expect(formatPseudoPatient(null)).toBe('Nicht verknuepft')
    expect(formatPatientExamination(11, 12)).toBe('#11')
    expect(formatPatientExamination(null, 12)).toBe('Vorschlag: #12')
  })
})
