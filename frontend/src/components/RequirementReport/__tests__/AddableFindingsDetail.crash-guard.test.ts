import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'

describe('reportingFlowStore indication guards', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('keeps one indication row when removing the last row', () => {
    const flow = useReportingFlowStore()

    flow.setIndications([{ examinationIndicationId: 10, indicationChoiceId: 99 }])
    flow.removeIndicationRow(0)

    expect(flow.indications).toEqual([{ examinationIndicationId: null, indicationChoiceId: null }])
  })
})
