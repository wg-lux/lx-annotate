import { describe, expect, it } from 'vitest'

import {
  conceptCoverageStatusLabel,
  conceptCoverageStatusTone,
  extractStringList,
  findingStatusIconClass,
  findingStatusLabel,
  formatCaseLabel,
  formatKnowledgeName,
  isGastroenterologyExaminationName,
  normalizeKnowledgeKey,
  normalizePatientExaminationOption,
  preferredArtifactKind
} from '../reportingShellPresentation'
import { getCoreConceptLocalizedName } from '@/types/coreConcepts'

describe('reporting shell presentation', () => {
  it('selects the safest available video artifact preference', () => {
    expect(preferredArtifactKind([{ type: 'raw' }, { type: 'processed' }])).toBe('processed')
    expect(preferredArtifactKind([{ type: 'raw' }])).toBe('raw')
    expect(preferredArtifactKind([{ type: 'thumbnail' }])).toBeNull()
  })

  it('formats knowledge and finding status presentation', () => {
    expect(normalizeKnowledgeKey(' Colon-Polyp ')).toBe('colon_polyp')
    expect(formatKnowledgeName('colon_polyp')).toBe('Colon Polyp')
    expect(findingStatusLabel('empty', true)).toBe('offen')
    expect(findingStatusIconClass('warning')).toBe('ni ni-alert-circle-exc')
    expect(conceptCoverageStatusLabel('not_applicable')).toBe('nicht anwendbar')
    expect(conceptCoverageStatusTone('invalid')).toBe('danger')
  })

  it('normalizes suggested actions from string and object payloads', () => {
    expect(
      extractStringList([' Direkte Aktion ', { label: 'Label' }, { message: 'Hinweis' }, null])
    ).toEqual(['Direkte Aktion', 'Label', 'Hinweis'])
  })

  it('normalizes nested patient-examination payloads', () => {
    const option = normalizePatientExaminationOption({
      id: '44',
      date_start: '2026-08-03T10:00:00Z',
      examination: { id: 9, name: 'colonoscopy', name_de: 'Koloskopie' },
      patient: { id: 7 }
    })
    expect(option).toMatchObject({
      id: 44,
      examinationName: 'colonoscopy',
      examinationDisplayName: 'Koloskopie',
      patientId: 7,
      examinationId: 9
    })
    expect(option?.label).toBe('Koloskopie · 3.8.2026')
    expect(option?.label).not.toContain('44')
    expect(normalizePatientExaminationOption({ id: 0 })).toBeNull()
  })

  it('recognizes governed gastroenterology examination names', () => {
    expect(isGastroenterologyExaminationName('Koloskopie')).toBe(true)
    expect(isGastroenterologyExaminationName('Dermatologie')).toBe(false)
  })

  it('formats case periods and active state', () => {
    expect(
      formatCaseLabel({
        id: 3,
        caseId: 'case-7',
        patient: 7,
        admissionDate: '2026-08-01',
        leaveDate: '2026-08-03',
        isActive: true,
        isClosed: false,
        isDeleted: false,
        patientExaminations: [],
        documents: [],
        patientMedications: [],
        patientMedicationSchedules: [],
        patientLabSamples: [],
        patientLabValues: []
      })
    ).toBe('1.8.2026 – 3.8.2026 · aktiv')
  })

  it('uses canonical lx-data-model names for the selected report language', () => {
    const concept = {
      name: 'colonoscopy',
      nameDe: 'Koloskopie',
      nameEn: 'Colonoscopy',
      displayName: 'Nicht als Übersetzung verwenden'
    }

    expect(getCoreConceptLocalizedName(concept, 'de')).toBe('Koloskopie')
    expect(getCoreConceptLocalizedName(concept, 'en')).toBe('Colonoscopy')
    expect(getCoreConceptLocalizedName({ name: 'colonoscopy' }, 'de')).toBe('colonoscopy')
  })
})
