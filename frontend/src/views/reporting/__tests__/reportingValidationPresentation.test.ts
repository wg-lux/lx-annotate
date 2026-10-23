import { describe, expect, it } from 'vitest'
import type {
  ReportTemplateRuntimeValidationResult,
  ReportTemplateSection
} from '@/types/reportTemplate'
import {
  descriptorLabelsForSections,
  filterFindingStatuses,
  groupValidationMessages
} from '../reportingValidationPresentation'

describe('reporting validation presentation', () => {
  it('groups normalized findings, deduplicates across validator kinds and preserves issue order', () => {
    const common = {
      name: 'rule',
      ok: false,
      operator: 'exists',
      matchedOccurrences: 0,
      triggeredOccurrences: 0
    }
    const validation: ReportTemplateRuntimeValidationResult = {
      templateName: 'template',
      ok: false,
      evaluatedFindingsCount: 1,
      issues: [],
      examinationValidators: [],
      findingsValidators: [
        {
          ...common,
          finding: ' Colon-Polyp ',
          missingRequiredClassifications: [],
          issues: [{ code: 'missing', level: 'error', message: 'Missing size' }]
        }
      ],
      classificationValidators: [
        {
          ...common,
          finding: 'colon_polyp',
          classification: 'size',
          precedence: 'required',
          hint: {},
          issues: [
            { code: 'missing', level: 'error', message: 'Missing size' },
            { code: 'invalid', level: 'error', message: 'Invalid unit' }
          ]
        }
      ],
      interventionValidators: [
        {
          ...common,
          finding: 'colon_polyp',
          intervention: 'removal',
          precedence: 'required',
          hint: {},
          issues: []
        }
      ],
      unitValidators: [
        {
          ...common,
          finding: 'colon_polyp',
          classification: 'size',
          unit: 'mm',
          precedence: 'required',
          hint: {},
          issues: []
        }
      ]
    }
    const snapshot = structuredClone(validation)

    const messages = groupValidationMessages(validation)

    expect(messages.get('colon_polyp')).toEqual([
      'Missing size',
      'Invalid unit',
      'Intervention "removal" prüfen.',
      'Einheit "mm" prüfen.'
    ])
    expect(validation).toEqual(snapshot)
    expect(groupValidationMessages(null).size).toBe(0)
  })

  it('does not invent fallback messages for accepted validators or existing blank issues', () => {
    const validator = {
      name: 'rule',
      finding: 'polyp',
      ok: true,
      operator: 'exists',
      matchedOccurrences: 0,
      triggeredOccurrences: 0,
      missingRequiredClassifications: [],
      issues: []
    }
    const validation: ReportTemplateRuntimeValidationResult = {
      templateName: 'template',
      ok: true,
      evaluatedFindingsCount: 0,
      issues: [],
      examinationValidators: [],
      classificationValidators: [],
      interventionValidators: [],
      unitValidators: [],
      findingsValidators: [
        validator,
        { ...validator, ok: false, issues: [{ code: 'empty', level: 'warning', message: '' }] }
      ]
    }

    const messages = groupValidationMessages(validation)

    expect(messages.get('polyp')).toEqual([])
  })

  it('keeps open and optional filters separate and normalizes search in all searchable fields', () => {
    const rows = [
      {
        status: 'complete' as const,
        required: true,
        label: 'Done',
        findingName: 'completed',
        sectionTitle: 'Colon'
      },
      {
        status: 'missing' as const,
        required: true,
        label: 'Missing',
        findingName: 'colon_polyp',
        sectionTitle: 'Findings'
      },
      {
        status: 'warning' as const,
        required: false,
        label: 'Warning',
        findingName: 'warning',
        sectionTitle: 'Colon'
      },
      {
        status: 'empty' as const,
        required: false,
        label: 'Empty',
        findingName: 'empty',
        sectionTitle: 'Colon'
      }
    ]

    const open = filterFindingStatuses(rows, 'open', '')
    const optional = filterFindingStatuses(rows, 'optional', 'colon')
    const normalized = filterFindingStatuses(rows, 'all', ' Colon-Polyp ')

    expect(open).toEqual([rows[1], rows[2]])
    expect(optional).toEqual([rows[2], rows[3]])
    expect(normalized).toEqual([rows[1]])
    expect(filterFindingStatuses(rows, 'complete', 'missing')).toEqual([])
  })

  it('uses the last localized descriptor label and ignores unlabeled duplicates', () => {
    const descriptor = {
      name: 'Polyp-Size',
      type: 'number',
      unit: null,
      unitAbbreviation: null,
      numericMin: null,
      numericMax: null
    }
    const sections: ReportTemplateSection[] = [
      {
        name: 'findings',
        titleDe: 'Befunde',
        titleEn: 'Findings',
        position: 0,
        sectionKind: 'findings',
        fields: [],
        types: [],
        findings: [
          {
            finding: 'polyp',
            required: true,
            multipleAllowed: true,
            classifications: [
              { classification: 'absent_input', required: false },
              {
                classification: 'size',
                required: true,
                input: {
                  choices: [
                    {
                      name: 'size',
                      descriptors: [
                        { ...descriptor, nameDe: 'Original' },
                        { ...descriptor, nameDe: 'Größe' },
                        descriptor
                      ]
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]

    const labels = descriptorLabelsForSections(sections)

    expect(Array.from(labels)).toEqual([['polyp_size', 'Größe']])
    expect(descriptorLabelsForSections([]).size).toBe(0)
  })
})
