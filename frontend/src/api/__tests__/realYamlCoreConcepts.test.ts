import { afterEach, describe, expect, it } from 'vitest'

import axiosInstance from '@/api/axiosInstance'
import { fetchCoreConcepts } from '@/api/coreConcepts'
import { fetchKnowledgeBaseGraphSnapshot } from '@/api/knowledgeBaseGraphApi'
import {
  createRealYamlCoreConceptMockEndpoint,
  realYamlLiveModulePaths,
  requireYamlConceptRecords,
  routeYamlConceptRecords
} from './support/realYamlCoreConceptMockEndpoint'

const originalAdapter = axiosInstance.defaults.adapter

afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter
})

describe('real YAML core-concepts mock endpoint', () => {
  it('tries all requested live module paths and routes their real YAML records', async () => {
    const endpoint = createRealYamlCoreConceptMockEndpoint({ sourcePreference: 'live-first' })
    axiosInstance.defaults.adapter = endpoint.adapter

    const mst = await fetchCoreConcepts('mst_3_0')
    const star = await fetchCoreConcepts('star_upper_gi')
    const terminology = await fetchCoreConcepts('terminology')

    expect(endpoint.loads.map((load) => load.attemptedLivePath)).toEqual([
      realYamlLiveModulePaths.mst_3_0,
      realYamlLiveModulePaths.star_upper_gi,
      realYamlLiveModulePaths.terminology
    ])
    expect(endpoint.loads.every((load) => ['live', 'shipped'].includes(load.source))).toBe(true)

    expect(mst.knowledgeBaseVersion).toBe('3.0.0')
    expect(mst.examination.some((concept) => concept.name === 'mst30_egd')).toBe(true)
    expect(mst.finding.some((concept) => concept.name === 'mst30_luminal_normal')).toBe(true)
    expect(mst.indication.some((concept) => concept.name.startsWith('mst30_'))).toBe(true)
    expect(mst.intervention.some((concept) => concept.name.startsWith('mst30_'))).toBe(true)

    expect(star.knowledgeBaseVersion).toBe('0.1.1')
    expect(star.examination.map((concept) => concept.name)).toContain('star_upper_gi_endoscopy')
    expect(star.finding.map((concept) => concept.name)).toContain('star_upper_gi_polyp')
    expect(star.classificationChoiceDescriptor.length).toBeGreaterThan(0)

    expect(terminology.knowledgeBaseVersion).toBe('0.1.0')
    expect(terminology.examination.map((concept) => concept.name)).toContain('ercp')
    expect(terminology.indication.map((concept) => concept.name)).toContain('colonoscopy_generic')
    expect(terminology.unit.map((concept) => concept.name)).toContain('milligram')

    const terminologyLoad = endpoint.loads.find((load) => load.moduleName === 'terminology')
    if (terminologyLoad?.liveLoadError) {
      expect(terminologyLoad.liveLoadError).toContain('00_generic_complication.yaml')
      expect(terminologyLoad.liveLoadError).toContain('Map keys must be unique')
      expect(terminologyLoad.source).toBe('shipped')
    }

    if (endpoint.loads[0]?.source === 'live') {
      expect(endpoint.loads[0].excludedModelCounts).toEqual(
        expect.objectContaining({ report_template: 7, report_template_section: 23 })
      )
    }
    if (endpoint.loads[1]?.source === 'live') {
      expect(endpoint.loads[1].excludedModelCounts).toEqual(
        expect.objectContaining({ report_template: 2, report_template_section: 7 })
      )
    }
  })

  it('ships a portable representative slice with every concept in its typed field', async () => {
    const endpoint = createRealYamlCoreConceptMockEndpoint({ sourcePreference: 'shipped-only' })
    axiosInstance.defaults.adapter = endpoint.adapter

    const mst = await fetchCoreConcepts('mst_3_0')
    const star = await fetchCoreConcepts('star_upper_gi')
    const terminology = await fetchCoreConcepts('terminology')

    expect(endpoint.loads.every((load) => load.source === 'shipped')).toBe(true)

    expect(mst.classification).toHaveLength(1)
    expect(mst.classificationType).toHaveLength(1)
    expect(mst.classificationChoice).toHaveLength(1)
    expect(mst.classificationChoiceDescriptor).toHaveLength(1)
    expect(mst.examination).toHaveLength(1)
    expect(mst.examinationType).toHaveLength(1)
    expect(mst.finding).toHaveLength(1)
    expect(mst.findingType).toHaveLength(1)
    expect(mst.indication).toHaveLength(1)
    expect(mst.indicationType).toHaveLength(1)
    expect(mst.intervention).toHaveLength(1)
    expect(mst.interventionType).toHaveLength(1)
    expect(mst.unit).toHaveLength(1)
    expect(mst.classification[0]?.classificationTypes).toEqual(['mst30_location'])
    expect(mst.classification[0]?.classificationChoices).toEqual([
      'mst30_esophagus_esophagus',
      'mst30_esophagus_z_line'
    ])
    expect(mst.classificationChoiceDescriptor[0]).toEqual(
      expect.objectContaining({ unit: 'mst30_millimeter', numericMin: 0, numericMax: 1000 })
    )

    expect(star.examination).toHaveLength(1)
    expect(star.classification).toHaveLength(1)
    expect(star.classificationChoice).toHaveLength(1)
    expect(star.classificationChoiceDescriptor).toHaveLength(1)
    expect(star.finding).toHaveLength(1)
    expect(star.findingType).toHaveLength(1)
    expect(star.intervention).toHaveLength(1)
    expect(star.finding[0]?.classifications).toEqual([
      'star_upper_gi_location_classification',
      'star_upper_gi_lesion_paris',
      'size_oval_mm',
      'additional_text_info'
    ])
    expect(star.finding[0]?.interventions).toEqual([])
    expect(star.classificationChoiceDescriptor[0]?.defaultValueNum).toBe(0)

    expect(terminology.classification).toHaveLength(1)
    expect(terminology.classificationType).toHaveLength(1)
    expect(terminology.classificationChoice).toHaveLength(1)
    expect(terminology.classificationChoiceDescriptor).toHaveLength(1)
    expect(terminology.examination).toHaveLength(1)
    expect(terminology.examinationType).toHaveLength(1)
    expect(terminology.finding).toHaveLength(1)
    expect(terminology.findingType).toHaveLength(1)
    expect(terminology.indication).toHaveLength(1)
    expect(terminology.indicationType).toHaveLength(1)
    expect(terminology.intervention).toHaveLength(1)
    expect(terminology.interventionType).toHaveLength(1)
    expect(terminology.unit).toHaveLength(1)
    expect(terminology.classificationChoice[0]?.nameDe).toBe('Ja')
    expect(terminology.indication[0]?.displayName).toBe('Koloskopie')
    expect(terminology.intervention[0]?.interventionTypes).toEqual(['diagnostic', 'invasive'])
    expect(terminology.unit[0]).toEqual(
      expect.objectContaining({ name: 'milligram', abbreviation: 'mg', nameDe: 'Milligramm' })
    )
  })

  it('serves the shipped YAML slice through the versioned graph contract', async () => {
    const endpoint = createRealYamlCoreConceptMockEndpoint({ sourcePreference: 'shipped-only' })
    axiosInstance.defaults.adapter = endpoint.adapter

    const mst = await fetchKnowledgeBaseGraphSnapshot('mst_3_0', '3.0.0')
    const star = await fetchKnowledgeBaseGraphSnapshot('star_upper_gi', '0.1.1')
    const terminology = await fetchKnowledgeBaseGraphSnapshot('terminology', '0.1.0')

    expect(endpoint.loads.every((load) => load.source === 'shipped')).toBe(true)
    expect(mst.identity).toEqual({
      knowledgeBaseModule: 'mst_3_0',
      knowledgeBaseVersion: '3.0.0'
    })
    expect(mst.concepts.classification[0]?.classificationChoices).toEqual([
      'mst30_esophagus_esophagus',
      'mst30_esophagus_z_line'
    ])
    expect(mst.edges).toContainEqual({
      source: { kind: 'classification_choice_descriptor', name: 'mst30_size_mm_value' },
      relationship: 'uses_unit',
      target: { kind: 'unit', name: 'mst30_millimeter' }
    })
    expect(star.edges).toContainEqual({
      source: { kind: 'examination', name: 'star_upper_gi_endoscopy' },
      relationship: 'has_finding',
      target: { kind: 'finding', name: 'star_upper_gi_polyp' }
    })
    expect(terminology.concepts.indication[0]).toMatchObject({
      name: 'colonoscopy_generic',
      nameDe: 'Koloskopie'
    })
  })

  it('rejects malformed records and unknown models instead of guessing a collection', () => {
    expect(() => requireYamlConceptRecords('name: not-an-array', 'broken.yml')).toThrow(
      'must contain a YAML array'
    )
    expect(() =>
      requireYamlConceptRecords('- model: finding\n  description: missing-name', 'broken.yml')
    ).toThrow('must define a non-empty name')

    const unknown = requireYamlConceptRecords(
      '- model: unexplained_clinical_object\n  name: ambiguous',
      'unknown.yml'
    )
    expect(() => routeYamlConceptRecords(unknown, 'unknown.yml')).toThrow(
      'Unsupported YAML concept model "unexplained_clinical_object"'
    )
  })

  it('excludes report and validator records explicitly from the core-concepts response', () => {
    const records = requireYamlConceptRecords(
      [
        '- model: finding',
        '  name: visible_finding',
        '- model: report_template',
        '  name: not_a_core_concept',
        '- model: findings_validator',
        '  name: not_a_core_concept_validator'
      ].join('\n'),
      'mixed.yml'
    )
    const routed = routeYamlConceptRecords(records, 'mixed.yml')

    expect(routed.collections.finding.map((record) => record.name)).toEqual(['visible_finding'])
    expect(routed.excludedModelCounts).toEqual({ report_template: 1, findings_validator: 1 })
  })
})
