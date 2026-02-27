import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

describe('reportingFlowStore session transitions', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('activates lookup session and deduplicates requirement set ids', () => {
    const flow = useReportingFlowStore()

    flow.setLookupSession({
      patientExaminationId: 33,
      lookupToken: 'abc-token',
      status: 'active'
    })
    flow.setSelectedRequirementSetIds([1, 2, 2, 3])

    expect(flow.lookupToken).toBe('abc-token')
    expect(flow.patientExaminationId).toBe(33)
    expect(flow.canUseLookupPages).toBe(true)
    expect(flow.selectedRequirementSetIds).toEqual([1, 2, 3])
  })
})
