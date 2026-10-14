import { describe, expect, it } from 'vitest'
import {
  deriveReportConceptCoverage,
  resolveReportConceptCoverage
} from '@/utils/reportConceptCoverage'
import type { ReportConceptCoverage } from '@/types/reportTemplate'
import type {
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSection
} from '@/types/reportTemplate'

const sections: ReportTemplateSection[] = [
  {
    name: 'findings',
    titleDe: 'Befunde',
    titleEn: 'Findings',
    position: 1,
    sectionKind: 'findings',
    fields: [],
    types: [],
    findings: [
      {
        finding: 'lesion',
        required: true,
        multipleAllowed: true,
        classifications: [
          { classification: 'size', required: true },
          { classification: 'morphology', required: false }
        ]
      },
      {
        finding: 'normal_colon',
        required: false,
        multipleAllowed: false,
        classifications: [],
        applicability: 'not_applicable'
      }
    ]
  }
]

const emptyValidation: ReportTemplateRuntimeValidationResult = {
  templateName: 'colonoscopy',
  ok: true,
  evaluatedFindingsCount: 1,
  classificationValidators: [
    {
      name: 'size_valid',
      ok: true,
      operator: 'exists',
      finding: 'lesion',
      classification: 'size',
      precedence: 'required',
      matchedOccurrences: 1,
      triggeredOccurrences: 1,
      hint: {},
      issues: []
    }
  ],
  interventionValidators: [],
  findingsValidators: [
    {
      name: 'lesion_valid',
      ok: true,
      operator: 'exists',
      finding: 'lesion',
      matchedOccurrences: 1,
      triggeredOccurrences: 1,
      missingRequiredClassifications: [],
      issues: []
    }
  ],
  examinationValidators: [],
  unitValidators: [],
  issues: []
}

describe('deriveReportConceptCoverage', () => {
  it('distinguishes present, missing, unknown, and not applicable concepts', () => {
    const result = deriveReportConceptCoverage({
      sections,
      validation: emptyValidation,
      payload: {
        patientFindings: [
          {
            localId: 'finding-1',
            finding: 'lesion',
            classificationChoices: [
              {
                localId: 'choice-1',
                classification: 'size',
                classificationChoice: 'numeric',
                descriptors: []
              }
            ]
          }
        ]
      }
    })

    expect(result.items.map((item) => [item.conceptId, item.status])).toEqual([
      ['lesion', 'present'],
      ['lesion.size', 'present'],
      ['lesion.morphology', 'unknown'],
      ['normal_colon', 'not_applicable']
    ])
    expect(result.items.find((item) => item.conceptId === 'lesion')).toMatchObject({
      documentation: 'recorded',
      applicability: 'applicable',
      validation: 'valid'
    })
    expect(result.items.find((item) => item.conceptId === 'lesion')?.validatorNames).toEqual([
      'lesion_valid',
      'size_valid'
    ])
    expect(result.counts).toEqual({
      present: 2,
      missing: 0,
      not_applicable: 1,
      invalid: 0,
      unknown: 1
    })
    expect(result.source).toBe('legacy_fallback')
  })

  it('uses server coverage as the authoritative source and preserves provenance', () => {
    const serverCoverage: ReportConceptCoverage = {
      contractVersion: 'report_concept_coverage_v1',
      identity: {
        moduleName: 'colonoscopy',
        moduleVersion: '1.2.0',
        moduleDigest: 'a'.repeat(64),
        templateName: 'standard',
        templateVersion: '3',
        templateDigest: 'b'.repeat(64)
      },
      provenance: {
        resolver: 'lx-resolver',
        resolverVersion: '1.0.0',
        evidenceDigest: 'c'.repeat(64)
      },
      concepts: [
        {
          conceptId: 'lesion.size',
          label: 'Größe',
          applicability: { status: 'required', rule: null, reason: null },
          validationStatus: 'present',
          evidencePath: ['findings', '0', 'size']
        },
        {
          conceptId: 'normal_colon',
          label: 'Normaler Kolonbefund',
          applicability: { status: 'not_applicable', rule: null, reason: 'not examined' },
          validationStatus: 'undetermined',
          evidencePath: ['examination', 'applicability']
        }
      ]
    }

    const result = resolveReportConceptCoverage({
      serverCoverage,
      sections,
      payload: null,
      validation: null
    })

    expect(result.source).toBe('server')
    expect(result.items.map((item) => [item.conceptId, item.status])).toEqual([
      ['lesion.size', 'present'],
      ['normal_colon', 'not_applicable']
    ])
    expect(result.identity).toEqual(serverCoverage.identity)
    expect(result.provenance).toEqual(serverCoverage.provenance)
  })

  it('keeps the legacy resolver explicitly non-authoritative without server coverage', () => {
    const result = resolveReportConceptCoverage({
      serverCoverage: null,
      sections: [],
      payload: null,
      validation: null
    })

    expect(result.source).toBe('legacy_fallback')
    expect(result.identity).toBeNull()
    expect(result.provenance).toBeNull()
  })

  it('does not treat a present but invalid concept as present', () => {
    const result = deriveReportConceptCoverage({
      sections,
      payload: { patientFindings: [{ finding: 'lesion', classificationChoices: [] }] },
      validation: {
        ...emptyValidation,
        ok: false,
        findingsValidators: [
          {
            name: 'size_required',
            ok: false,
            operator: 'condition',
            finding: 'lesion',
            matchedOccurrences: 1,
            triggeredOccurrences: 1,
            missingRequiredClassifications: ['size'],
            issues: [{ code: 'missing_size', level: 'error', message: 'Size is required.' }]
          }
        ]
      }
    })

    expect(result.items.find((item) => item.conceptId === 'lesion')).toMatchObject({
      status: 'invalid',
      evidencePath: 'patientFindings[0]'
    })
    expect(result.items.find((item) => item.conceptId === 'lesion.size')).toMatchObject({
      status: 'missing',
      validation: 'not_evaluated'
    })
  })

  it('keeps populated concepts unknown until LXDM validation has run', () => {
    const result = deriveReportConceptCoverage({
      sections,
      payload: {
        patientFindings: [
          {
            finding: 'lesion',
            classificationChoices: [
              { classification: 'size', classificationChoice: 'numeric', descriptors: [] }
            ]
          }
        ]
      },
      validation: null
    })

    expect(result.items.find((item) => item.conceptId === 'lesion')?.status).toBe('unknown')
    expect(result.items.find((item) => item.conceptId === 'lesion.size')?.status).toBe('unknown')
  })
})
