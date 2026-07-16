import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate'

import ReportTemplateValidationPanel from '../ReportTemplateValidationPanel.vue'

function buildRuntimeResult(): ReportTemplateRuntimeValidationResult {
  return {
    templateName: 'upper_gi_polyp_template',
    ok: false,
    evaluatedFindingsCount: 1,
    issues: [
      {
        code: 'missing_data_requirement',
        level: 'warning',
        message:
          'Validator size_mm_unit_when_large cannot evaluate its condition because required source data is missing: size_mm.',
        validatorName: 'size_mm_unit_when_large',
        validatorKind: 'unit_validator',
        details: {
          occurrenceIndex: 0,
          missingConditionClassifications: ['size_mm']
        }
      },
      {
        code: 'missing_required_intervention',
        level: 'error',
        message:
          "Validator biopsy_required_when_large requires intervention 'biopsy' when condition is met.",
        validatorName: 'biopsy_required_when_large',
        validatorKind: 'intervention_validator'
      }
    ],
    classificationValidators: [
      {
        name: 'lst_required_when_large',
        ok: false,
        operator: 'condition',
        finding: 'esophagus_polyp',
        classification: 'lst',
        precedence: 'required',
        matchedOccurrences: 1,
        triggeredOccurrences: 1,
        hint: {},
        issues: []
      }
    ],
    interventionValidators: [
      {
        name: 'biopsy_required_when_large',
        ok: false,
        operator: 'condition',
        finding: 'esophagus_polyp',
        intervention: 'biopsy',
        precedence: 'required',
        matchedOccurrences: 1,
        triggeredOccurrences: 1,
        hint: {},
        issues: []
      }
    ],
    findingsValidators: [
      {
        name: 'polyp_has_lst_if_large',
        ok: false,
        operator: 'condition',
        finding: 'esophagus_polyp',
        matchedOccurrences: 1,
        triggeredOccurrences: 1,
        missingRequiredClassifications: ['lst'],
        issues: []
      }
    ],
    examinationValidators: [
      {
        name: 'minimum_polyp_documentation',
        ok: false,
        findingValidatorStatus: [{ name: 'polyp_has_lst_if_large', ok: false }],
        examinationValidatorStatus: [],
        issues: []
      }
    ],
    unitValidators: [
      {
        name: 'size_mm_unit_when_large',
        ok: false,
        operator: 'condition',
        finding: 'esophagus_polyp',
        classification: 'size_mm',
        unit: 'mm',
        precedence: 'required',
        matchedOccurrences: 1,
        triggeredOccurrences: 0,
        hint: {},
        issues: []
      }
    ]
  }
}

describe('ReportTemplateValidationPanel', () => {
  it('renders runtime validation categories and separates pending data issues', () => {
    const wrapper = mount(ReportTemplateValidationPanel, {
      props: {
        result: buildRuntimeResult(),
        findingAnchors: {
          esophagus_polyp: 'finding-esophagus_polyp'
        }
      }
    })

    const text = wrapper.text()
    expect(text).toContain('1 Befund(e) bewertet')
    expect(text).toContain('Klassifikationsregeln')
    expect(text).toContain('Interventionsregeln')
    expect(text).toContain('Befundregeln')
    expect(text).toContain('Untersuchungsregeln')
    expect(text).toContain('Einheitenregeln')
    expect(text).toContain('Ausstehende Daten')
    expect(text).toContain('Nachzutragen: size_mm')
    expect(text).toContain('missing_required_intervention')
    expect(text).toContain('zum Befund')
    expect(text).not.toContain('missing_data_requirement')
    expect(
      wrapper.find('a[href="#finding-esophagus_polyp"]').exists()
    ).toBe(true)
  })
})
