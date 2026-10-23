import { describe, expect, it } from 'vitest'

import { normalizeCoreConceptCollection } from '@/api/coreConcepts'

describe('normalizeCoreConceptCollection', () => {
  it('normalizes snake_case payloads and csv list fields', () => {
    const payload = normalizeCoreConceptCollection({
      module_name: 'report_template_examples',
      knowledge_base_module: 'report_template_examples',
      knowledge_base_version: '0.2.17',
      classification: [
        {
          name: 'classification_a',
          tags: 'tag_a,tag_b',
          classification_choices: 'choice_1,choice_2',
          classification_types: ['type_1']
        }
      ],
      classification_type: [{ name: 'type_1', name_de: 'Typ 1' }],
      examination_type: [{ name: 'endoscopy' }],
      finding: [
        {
          name: 'finding_a',
          caused_by_interventions: ['biopsy']
        }
      ],
      indication: [
        {
          name: 'indication_a',
          indication_types: ['screening'],
          classifications: ['classification_a'],
          interventions: []
        }
      ],
      citation: [
        {
          name: 'citation_a',
          citation_key: 'citation_key_a',
          title: 'Citation Title',
          authors: 'author_a,author_b',
          keywords: ['kw_a', 'kw_b'],
          identifiers: { pmid: '123' }
        }
      ]
    })

    expect(payload.moduleName).toBe('report_template_examples')
    expect(payload.knowledgeBaseModule).toBe('report_template_examples')
    expect(payload.knowledgeBaseVersion).toBe('0.2.17')
    expect(payload.classificationType[0].nameDe).toBe('Typ 1')
    expect(payload.examinationType[0].name).toBe('endoscopy')
    expect(payload.finding[0].causedByInterventions).toEqual(['biopsy'])
    expect(payload.classification[0].displayName).toBe('classification_a')
    expect(payload.classification[0].classificationChoices).toEqual(['choice_1', 'choice_2'])
    expect(payload.classification[0].classificationTypes).toEqual(['type_1'])
    expect(payload.classification[0].tags).toEqual(['tag_a', 'tag_b'])
    expect(payload.citation[0].authors).toEqual(['author_a', 'author_b'])
    expect(payload.citation[0].keywords).toEqual(['kw_a', 'kw_b'])
    expect(payload.indication[0].classifications).toEqual(['classification_a'])
  })

  it('accepts already camelCased payloads', () => {
    const payload = normalizeCoreConceptCollection({
      moduleName: 'module_a',
      finding: [
        {
          name: 'finding_a',
          findingTypes: ['finding_type_1'],
          classifications: ['classification_1'],
          interventions: ['intervention_1']
        }
      ]
    })

    expect(payload.moduleName).toBe('module_a')
    expect(payload.knowledgeBaseModule).toBe('module_a')
    expect(payload.knowledgeBaseVersion).toBeNull()
    expect(payload.finding[0].displayName).toBe('finding_a')
    expect(payload.finding[0].findingTypes).toEqual(['finding_type_1'])
    expect(payload.finding[0].classifications).toEqual(['classification_1'])
    expect(payload.finding[0].interventions).toEqual(['intervention_1'])
  })
})
