import { describe, expect, it } from 'vitest'
import type { Finding } from '@/api/findings.contract'
import type {
  ReportTemplateFinding,
  ReportTemplateRuntimePatientFindingInput
} from '@/types/reportTemplate'
import {
  classificationReferences,
  groupFindingSections,
  indexFindingInstances,
  missingRequiredClassifications
} from '../reportingFindingReference'

const templateFinding: ReportTemplateFinding = {
  finding: 'polyp',
  required: true,
  multipleAllowed: true,
  classifications: [
    {
      classification: 'size',
      required: true,
      input: {
        choices: [
          {
            name: 'measured',
            descriptors: [
              {
                name: 'diameter',
                type: 'number',
                unit: 'millimeter',
                unitAbbreviation: 'mm',
                numericMin: null,
                numericMax: null
              },
              {
                name: 'confirmed',
                type: 'boolean',
                unit: null,
                unitAbbreviation: null,
                numericMin: null,
                numericMax: null
              }
            ]
          }
        ]
      }
    }
  ]
}

function measuredFinding(
  diameter: unknown,
  confirmed: unknown
): ReportTemplateRuntimePatientFindingInput {
  return {
    finding: 'polyp',
    classificationChoices: [
      {
        classification: ' SIZE ',
        classificationChoice: ' Measured ',
        descriptors: [
          { classificationChoiceDescriptor: ' Diameter ', descriptorValue: diameter },
          { classificationChoiceDescriptor: 'confirmed', descriptorValue: confirmed }
        ]
      }
    ]
  }
}

const catalog: Finding = {
  id: 1,
  name: 'polyp',
  description: '',
  examinations: [],
  findingTypes: [],
  findingInterventions: [],
  locationClassifications: [],
  morphologyClassifications: [],
  FindingClassifications: [],
  classifications: [
    {
      id: 1,
      name: 'size',
      nameDe: 'Größe',
      description: 'Durchmesser',
      required: false,
      classificationTypes: [],
      choices: [
        { id: 1, name: 'measured', nameDe: 'Gemessen', subcategories: {}, numericalDescriptors: {} }
      ]
    }
  ]
}

describe('finding references', () => {
  it('indexes normalized names without dropping ordered repeated occurrences or mutating input', () => {
    const first = measuredFinding(2, true)
    const second = { ...measuredFinding(3, false), finding: ' POLYP ' }
    const input = [first, second]
    const snapshot = structuredClone(input)
    expect(indexFindingInstances(input).get('polyp')).toEqual([first, second])
    expect(input).toEqual(snapshot)
    expect(indexFindingInstances([]).size).toBe(0)
  })

  it.each([0, false, '0'])('accepts present descriptor value %s', (value) => {
    expect(
      missingRequiredClassifications(templateFinding, [measuredFinding(value, false)])
    ).toEqual([])
  })

  it.each([null, undefined, '', '  '])('rejects absent descriptor value %s', (value) => {
    expect(missingRequiredClassifications(templateFinding, [measuredFinding(value, true)])).toEqual(
      ['size']
    )
  })

  it('requires one complete occurrence instead of combining partial occurrences', () => {
    const partial = [measuredFinding(2, null), measuredFinding(null, true)]
    expect(missingRequiredClassifications(templateFinding, partial)).toEqual(['size'])
    expect(
      missingRequiredClassifications(templateFinding, [...partial, measuredFinding(2, true)])
    ).toEqual([])
  })

  it('keeps unknown-choice checking advisory to backend validation', () => {
    const finding = measuredFinding(null, null)
    finding.classificationChoices[0].classificationChoice = 'unknown'
    expect(missingRequiredClassifications(templateFinding, [finding])).toEqual([])
    finding.classificationChoices[0].classificationChoice = ' '
    expect(missingRequiredClassifications(templateFinding, [finding])).toEqual(['size'])
    expect(missingRequiredClassifications(null, [finding])).toEqual([])
  })

  it('retains the first matching descriptor even when a later duplicate has a value', () => {
    const finding = measuredFinding(null, true)
    finding.classificationChoices[0].descriptors.push({
      classificationChoiceDescriptor: 'diameter',
      descriptorValue: 3
    })
    expect(missingRequiredClassifications(templateFinding, [finding])).toEqual(['size'])
  })

  it('uses template requirement authority and first normalized classification with catalog labels', () => {
    const template = structuredClone(templateFinding)
    template.classifications.push({ classification: ' SIZE ', required: false })
    const snapshot = structuredClone(template)
    expect(
      classificationReferences(template, catalog, new Map([['diameter', 'Durchmesser']]))
    ).toEqual([
      {
        key: 'size',
        label: 'Größe',
        required: true,
        choicesLabel: 'Werte: Gemessen',
        inputLabel: 'Erforderliche Eingabe: Durchmesser (mm), Confirmed',
        description: 'Durchmesser'
      }
    ])
    expect(template).toEqual(snapshot)
    expect(classificationReferences(null, catalog, new Map())[0]).toMatchObject({
      required: false,
      inputLabel: ''
    })
    expect(classificationReferences(null, null, new Map())).toEqual([])
  })

  it('groups only visible rows preserving first section title and encounter order', () => {
    const rows = [
      { sectionKey: 'a', sectionTitle: 'First' },
      { sectionKey: 'b', sectionTitle: 'Second' },
      { sectionKey: 'a', sectionTitle: 'Later' }
    ]
    expect(groupFindingSections(rows)).toEqual([
      { key: 'a', title: 'First', rows: [rows[0], rows[2]] },
      { key: 'b', title: 'Second', rows: [rows[1]] }
    ])
    expect(groupFindingSections(rows.slice(0, 2))).toHaveLength(2)
  })
})
