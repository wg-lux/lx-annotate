import { describe, expect, it } from 'vitest'

import { normalizeCoreConceptCollection } from '@/api/coreConcepts'

describe('normalizeCoreConceptCollection', () => {
  it('normalizes snake_case payloads and csv list fields', () => {
    const payload = normalizeCoreConceptCollection({
      module_name: 'report_template_examples',
      classification: [
        {
          name: 'classification_a',
          tags: 'tag_a,tag_b',
          classification_choices: 'choice_1,choice_2',
          classification_types: ['type_1']
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
    expect(payload.classification[0].classificationChoices).toEqual(['choice_1', 'choice_2'])
    expect(payload.classification[0].classificationTypes).toEqual(['type_1'])
    expect(payload.classification[0].tags).toEqual(['tag_a', 'tag_b'])
    expect(payload.citation[0].authors).toEqual(['author_a', 'author_b'])
    expect(payload.citation[0].keywords).toEqual(['kw_a', 'kw_b'])
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
    expect(payload.finding[0].findingTypes).toEqual(['finding_type_1'])
    expect(payload.finding[0].classifications).toEqual(['classification_1'])
    expect(payload.finding[0].interventions).toEqual(['intervention_1'])
  })
})
