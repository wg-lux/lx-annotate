import { describe, expect, it } from 'vitest'

import {
  normalizeReportingIndicationOptions,
  normalizeReportingIndicationSelections
} from '../reportingIndicationContract'

describe('reporting indication contract', () => {
  it('normalizes and deduplicates nested snake-case selections', () => {
    expect(
      normalizeReportingIndicationSelections({
        examination: {
          examination_indications: [
            { id: 7, indication_choice_id: 88 },
            { examination_indication_id: 7, choice: { id: 88 } }
          ]
        }
      })
    ).toEqual([{ examinationIndicationId: 7, indicationChoiceId: 88 }])
  })

  it('returns one empty editor row when no valid persisted selection exists', () => {
    expect(normalizeReportingIndicationSelections({ indications: [{ id: 0 }] })).toEqual([
      { examinationIndicationId: null, indicationChoiceId: null }
    ])
  })

  it('merges indication options and linked choices without creating choice-shaped indications', () => {
    expect(
      normalizeReportingIndicationOptions([
        {
          examination_indications: [{ id: 7, name_de: 'Vorsorge' }],
          indication_choices: [{ id: 88, examination_indication_id: 7, name_de: 'Routine' }]
        },
        {
          indicationOptions: {
            7: { label: 'Vorsorgekoloskopie', choices: [{ id: 89, label: 'Nachsorge' }] }
          }
        }
      ])
    ).toEqual([
      {
        id: 7,
        label: 'Vorsorge',
        choices: [
          { id: 89, label: 'Nachsorge' },
          { id: 88, label: 'Routine' }
        ]
      }
    ])
  })

  it('supports classification-backed and mapping-backed choices', () => {
    expect(
      normalizeReportingIndicationOptions([
        {
          indications: [
            {
              id: 7,
              label: 'Screening',
              classifications: [{ choices: [{ id: 88, label: 'Routine' }] }]
            }
          ],
          indicationChoices: { 7: [{ id: 89, label: 'Kontrolle' }] }
        }
      ])[0]
    ).toMatchObject({
      id: 7,
      choices: [
        { id: 88, label: 'Routine' },
        { id: 89, label: 'Kontrolle' }
      ]
    })
  })

  it('prefers canonical German labels over stable semantic names', () => {
    expect(
      normalizeReportingIndicationOptions([
        {
          examinationIndications: [
            {
              id: 7,
              name: 'screening_colonoscopy',
              nameDe: 'Vorsorgekoloskopie',
              indicationChoices: [
                { id: 88, name: 'routine_screening', name_de: 'Regelvorsorge' }
              ]
            }
          ]
        }
      ])
    ).toEqual([
      {
        id: 7,
        label: 'Vorsorgekoloskopie',
        choices: [{ id: 88, label: 'Regelvorsorge' }]
      }
    ])
  })

  it('does not expose numerical identifiers as selectable clinical labels', () => {
    expect(
      normalizeReportingIndicationOptions([
        {
          indications: [7, { id: 8 }],
          indication_choices: [{ id: 88, examination_indication_id: 8 }]
        }
      ])
    ).toEqual([])
  })
})
