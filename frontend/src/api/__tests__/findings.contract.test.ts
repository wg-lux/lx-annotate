import { describe, expect, it } from 'vitest'

import {
  extractFindingId,
  getFindingCatalogLocalizedName,
  mergeFindingClassifications,
  normalizeFinding,
  normalizeFindingChoice,
  normalizeFindingClassification,
  normalizeFindings,
  normalizePatientFindingClassification,
  normalizePatientFindingRow,
  normalizePatientFindingRows
} from '@/api/findings.contract'

function choicePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 20,
    name: 'small',
    subcategories: {},
    numericalDescriptors: { sizeMm: 5 },
    ...overrides
  }
}

function classificationPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 10,
    name: 'size',
    required: true,
    classificationTypes: ['morphology'],
    choices: [choicePayload()],
    ...overrides
  }
}

function findingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    name: 'colon_polyp',
    description: 'Polyp',
    nameDe: 'Kolonpolyp',
    classifications: [classificationPayload()],
    locationClassifications: [
      classificationPayload({
        id: 11,
        name: 'segment',
        required: false,
        classificationTypes: ['location'],
        choices: [choicePayload({ id: 21, name: 'sigmoid' })]
      })
    ],
    morphologyClassifications: [],
    ...overrides
  }
}

function patientClassificationPayload(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 5,
    classification: 10,
    classificationChoice: 20,
    classificationName: 'size',
    classificationChoiceName: 'small',
    subcategories: {},
    numericalDescriptors: { sizeMm: 5 },
    isActive: true,
    ...overrides
  }
}

function patientFindingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 3,
    patientExamination: 99,
    finding: { id: 7 },
    isActive: false,
    classifications: [patientClassificationPayload()],
    ...overrides
  }
}

describe('findings contract normalization', () => {
  it('normalizes camel-cased Axios finding payloads into one typed finding model', () => {
    const finding = normalizeFinding(findingPayload())

    expect(finding.nameDe).toBe('Kolonpolyp')
    expect(finding.displayName).toBe('Kolonpolyp')
    expect(finding.classifications[0].classificationTypes).toEqual(['morphology'])
    expect(finding.classifications[0].displayName).toBe('size')
    expect(finding.classifications[0].choices[0].displayName).toBe('small')
    expect(finding.classifications[0].choices[0].numericalDescriptors).toEqual({ sizeMm: 5 })
    expect(mergeFindingClassifications(finding).map((entry) => entry.id)).toEqual([10, 11])
    expect(finding.FindingClassifications.map((entry) => entry.id)).toEqual([10])
  })

  it('preserves German and English labels from snake-case catalog payloads', () => {
    const finding = normalizeFinding(
      findingPayload({
        name_de: 'Kolonpolyp',
        name_en: 'Colon polyp',
        nameDe: undefined,
        classifications: [
          classificationPayload({
            name_de: 'Größe',
            name_en: 'Size',
            choices: [choicePayload({ name_de: 'Klein', name_en: 'Small' })]
          })
        ]
      })
    )

    expect(finding).toMatchObject({
      nameDe: 'Kolonpolyp',
      nameEn: 'Colon polyp',
      classifications: [
        {
          nameDe: 'Größe',
          nameEn: 'Size',
          choices: [{ nameDe: 'Klein', nameEn: 'Small' }]
        }
      ]
    })
    expect(getFindingCatalogLocalizedName(finding, 'de')).toBe('Kolonpolyp')
    expect(getFindingCatalogLocalizedName(finding, 'en')).toBe('Colon polyp')
  })

  it('uses the stable semantic name when the requested localized label is absent', () => {
    const finding = normalizeFinding(findingPayload({ nameDe: undefined }))

    expect(getFindingCatalogLocalizedName(finding, 'de')).toBe('colon_polyp')
    expect(getFindingCatalogLocalizedName(finding, 'en')).toBe('colon_polyp')
  })

  it('retains direct snake_case compatibility for contract-level fixtures', () => {
    const row = normalizePatientFindingRow({
      id: 3,
      patient_examination: 99,
      finding: { id: 7 },
      is_active: false,
      classifications: [
        {
          id: 5,
          classification: 10,
          classification_choice: 20,
          classification_name: 'size',
          classification_choice_name: 'small',
          subcategories: {},
          numerical_descriptors: { size_mm: 5 },
          is_active: true
        }
      ]
    })

    expect(row.patientExamination).toBe(99)
    expect(extractFindingId(row.finding)).toBe(7)
    expect(row.isActive).toBe(false)
    expect(row.classifications[0].classificationChoiceName).toBe('small')
    expect(row.classifications[0].numericalDescriptors).toEqual({ size_mm: 5 })
  })

  it('uses defaults only for genuinely optional absent finding fields', () => {
    const finding = normalizeFinding(findingPayload({ description: undefined }))
    const choice = normalizeFindingChoice({ id: 1, name: 'present' })

    expect(finding.description).toBe('')
    expect(finding.examinations).toEqual([])
    expect(finding.findingTypes).toEqual([])
    expect(finding.findingInterventions).toEqual([])
    expect(choice.subcategories).toEqual({})
    expect(choice.numericalDescriptors).toEqual({})
  })

  it.each([
    ['null', null],
    ['a scalar', 'invalid'],
    ['an object without results', {}],
    ['an object with non-array results', { results: {} }]
  ])('rejects an invalid findings envelope: %s', (_case, payload) => {
    expect(() => normalizeFindings(payload)).toThrowError(/findings(?:\.results)?/)
  })

  it.each([
    ['id', findingPayload({ id: 0 }), /finding\.id/],
    ['name', findingPayload({ name: '  ' }), /finding\.name/],
    ['classifications', findingPayload({ classifications: undefined }), /classifications/],
    [
      'location classifications',
      findingPayload({ locationClassifications: 'invalid' }),
      /locationClassifications/
    ],
    [
      'morphology classifications',
      findingPayload({ morphologyClassifications: null }),
      /morphologyClassifications/
    ],
    ['optional examinations type', findingPayload({ examinations: {} }), /examinations/],
    [
      'optional patient examination id',
      findingPayload({ patientExaminationId: -1 }),
      /patientExaminationId/
    ]
  ])('rejects an invalid finding %s', (_case, payload, expectedPath) => {
    expect(() => normalizeFinding(payload)).toThrowError(expectedPath)
  })

  it.each([
    ['id', classificationPayload({ id: -1 }), /classification\.id/],
    ['name', classificationPayload({ name: '' }), /classification\.name/],
    ['required flag', classificationPayload({ required: 'true' }), /required/],
    [
      'classification types',
      classificationPayload({ classificationTypes: [3] }),
      /classificationTypes/
    ],
    ['choices array', classificationPayload({ choices: null }), /choices/],
    [
      'nested choice id',
      classificationPayload({ choices: [choicePayload({ id: 0 })] }),
      /choices\[0\]\.id/
    ],
    [
      'nested choice name',
      classificationPayload({ choices: [choicePayload({ name: ' ' })] }),
      /choices\[0\]\.name/
    ],
    [
      'nested optional descriptors type',
      classificationPayload({ choices: [choicePayload({ numericalDescriptors: [] })] }),
      /numericalDescriptors/
    ]
  ])('rejects an invalid classification %s', (_case, payload, expectedPath) => {
    expect(() => normalizeFindingClassification(payload, 'classification')).toThrowError(
      expectedPath
    )
  })

  it.each([
    ['null', null],
    ['an object without results', {}],
    ['an object with non-array results', { results: false }]
  ])('rejects an invalid patient-findings envelope: %s', (_case, payload) => {
    expect(() => normalizePatientFindingRows(payload)).toThrowError(/patientFindings/)
  })

  it.each([
    ['row id', patientFindingPayload({ id: 0 }), /patientFinding\.id/],
    [
      'patient examination id',
      patientFindingPayload({ patientExamination: null }),
      /patientExamination/
    ],
    ['finding id', patientFindingPayload({ finding: { id: -1 } }), /finding\.id/],
    ['active flag', patientFindingPayload({ isActive: 1 }), /isActive/],
    [
      'classifications array',
      patientFindingPayload({ classifications: undefined }),
      /classifications/
    ]
  ])('rejects an invalid patient finding %s', (_case, payload, expectedPath) => {
    expect(() => normalizePatientFindingRow(payload)).toThrowError(expectedPath)
  })

  it.each([
    ['row id', patientClassificationPayload({ id: 0 }), /patientClassification\.id/],
    ['classification id', patientClassificationPayload({ classification: 0 }), /\.classification/],
    [
      'choice id',
      patientClassificationPayload({ classificationChoice: '20' }),
      /classificationChoice/
    ],
    ['active flag', patientClassificationPayload({ isActive: undefined }), /isActive/],
    ['subcategories map', patientClassificationPayload({ subcategories: [] }), /subcategories/],
    [
      'numerical descriptors map',
      patientClassificationPayload({ numericalDescriptors: null }),
      /numericalDescriptors/
    ]
  ])('rejects an invalid patient classification %s', (_case, payload, expectedPath) => {
    expect(() =>
      normalizePatientFindingClassification(payload, 'patientClassification')
    ).toThrowError(expectedPath)
  })
})
