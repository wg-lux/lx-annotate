import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveValidationIndications } from '../reportingIndicationsValidation'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('../axiosInstance', () => ({
  default: { get },
  dtypesApi: (path: string) => `/dtypes-api/${path}`
}))

describe('reporting indication validation', () => {
  const context = {
    examinationId: 9,
    patientExaminationId: 42,
    indications: [{ examinationIndicationId: 7, indicationChoiceId: null as number | null }]
  }
  beforeEach(() => {
    get.mockReset()
  })

  it('resolves canonical names through the pinned examination catalog', async () => {
    get.mockResolvedValue({
      data: [{ id: 7, name: 'screening', name_de: 'Vorsorge', classifications: [] }]
    })
    expect(await resolveValidationIndications(context, 'coloreg', '0.2.0')).toEqual([
      { indication: 'screening', classifications: [] }
    ])
    expect(get).toHaveBeenCalledWith('/dtypes-api/examinations/9/indications/', {
      params: { module_name: 'coloreg', module_version: '0.2.0', patient_examination_id: 42 }
    })
  })

  it('preserves a resolvable classification choice', async () => {
    get.mockResolvedValue({
      data: [
        {
          id: 7,
          name: 'screening',
          classifications: [{ id: 10, name: 'reason', choices: [{ id: 88, name: 'routine' }] }]
        }
      ]
    })
    expect(
      await resolveValidationIndications(
        { ...context, indications: [{ examinationIndicationId: 7, indicationChoiceId: 88 }] },
        'coloreg',
        '0.2.0'
      )
    ).toEqual([
      {
        indication: 'screening',
        classifications: [{ classification: 'reason', classificationChoice: 'routine' }]
      }
    ])
  })

  it('rejects unavailable indications and unresolved choices instead of omitting them', async () => {
    get.mockResolvedValue({ data: [] })
    await expect(resolveValidationIndications(context, 'coloreg', '0.2.0')).rejects.toThrow(
      'nicht verfügbar'
    )
    get.mockResolvedValue({
      data: [{ id: 7, name: 'screening', classifications: [{ id: 88, name: 'reason' }] }]
    })
    await expect(
      resolveValidationIndications(
        { ...context, indications: [{ examinationIndicationId: 7, indicationChoiceId: 88 }] },
        'coloreg',
        '0.2.0'
      )
    ).rejects.toThrow('nicht eindeutig')
  })

  it('allows no indication without a catalog request but propagates catalog failures', async () => {
    expect(
      await resolveValidationIndications({ ...context, indications: [] }, 'coloreg', '0.2.0')
    ).toEqual([])
    expect(get).not.toHaveBeenCalled()
    get.mockRejectedValue(new Error('Catalog unavailable'))
    await expect(resolveValidationIndications(context, 'coloreg', '0.2.0')).rejects.toThrow(
      'Catalog unavailable'
    )
  })
})
