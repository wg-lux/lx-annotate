import { describe, expect, it } from 'vitest'
import { migrateRuntimeInterventions } from '../reportingInterventionContract'
import { isRuntimePayload } from '../reportingRuntimeContract'

function payload(interventions: unknown) {
  return {
    patient: 'patient', examiners: [], examination: 'colonoscopy',
    patientFindings: [{ finding: 'polyp', classificationChoices: [], interventions }]
  }
}

describe('runtime intervention hydration contract', () => {
  it('migrates legacy names without mutating the saved payload or losing object identity', () => {
    const source = payload(['biopsy', { intervention: 'polypectomy', localId: 'existing' }])
    const result = migrateRuntimeInterventions(source)
    expect(result).toEqual(payload([
      { intervention: 'biopsy' }, { intervention: 'polypectomy', localId: 'existing' }
    ]))
    expect(source.patientFindings[0].interventions).toEqual([
      'biopsy', { intervention: 'polypectomy', localId: 'existing' }
    ])
    expect(isRuntimePayload(result)).toBe(true)
    expect(migrateRuntimeInterventions(result)).toEqual(result)
  })

  it.each([null, {}, [null], [42], [' '], [{ intervention: '' }],
    [{ intervention: 42 }], [{ intervention: 'biopsy', localId: 42 }]])(
    'rejects malformed interventions after migration: %j', (interventions) => {
      expect(isRuntimePayload(migrateRuntimeInterventions(payload(interventions)))).toBe(false)
    }
  )

  it('rejects malformed nested findings through the shared hydration guard', () => {
    expect(isRuntimePayload({ ...payload([]), patientFindings: [null] })).toBe(false)
    expect(isRuntimePayload(payload(['biopsy']))).toBe(false)
  })
})
