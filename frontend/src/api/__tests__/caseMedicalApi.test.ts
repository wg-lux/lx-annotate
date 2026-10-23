import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: mocks,
  r: (path: string) => `/endoreg-api/${path}`
}))
import { createCaseMedicalRecords, fetchMedicalTerminology } from '../caseMedicalApi'

describe('case medical API', () => {
  it('uses patient-scoped routes and preserves retry identity', async () => {
    mocks.get.mockResolvedValue({ data: { records: [] } })
    mocks.post.mockResolvedValue({ data: { patient: '7' } })
    await fetchMedicalTerminology(7)
    const payload = { patient: '7', caseId: 3, labValues: [] }
    await createCaseMedicalRecords(7, payload, 'stable-request')
    expect(mocks.get).toHaveBeenCalledWith('/endoreg-api/patients/7/medical-terminology/')
    expect(mocks.post).toHaveBeenCalledWith('/endoreg-api/patients/7/medical-ledger/', payload, {
      headers: { 'Idempotency-Key': 'stable-request' }
    })
  })
})
