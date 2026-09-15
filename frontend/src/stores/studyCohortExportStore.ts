import { defineStore } from 'pinia'
import type { StudyCohortPreviewResponse } from '@/api/studyApi'
import type { StudyCohortExportDefinition } from '@/api/studyExportApi'

interface StudyCohortExportState {
  definition: StudyCohortExportDefinition | null
}

function uniquePositiveIds(response: StudyCohortPreviewResponse): number[] {
  const ids = response.cases.flatMap((cohortCase) => cohortCase.patientExaminationIds)
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) {
    throw new TypeError('Study cohort response contains an invalid patient examination ID.')
  }
  const uniqueIds = [...new Set(ids)]
  if (response.cases.length > 0 && uniqueIds.length === 0) {
    throw new TypeError('Study cohort response contains no patient examination IDs.')
  }
  return uniqueIds
}

export const useStudyCohortExportStore = defineStore('studyCohortExport', {
  state: (): StudyCohortExportState => ({ definition: null }),
  actions: {
    capture(
      studyName: string,
      hypothesis: string,
      response: StudyCohortPreviewResponse
    ): StudyCohortExportDefinition {
      const normalizedName = studyName.trim()
      const normalizedHypothesis = hypothesis.trim()
      if (!normalizedName || !normalizedHypothesis) {
        throw new TypeError('Study name and hypothesis are required for cohort export.')
      }
      const patientExaminationIds = uniquePositiveIds(response)
      this.definition = {
        studyName: normalizedName,
        hypothesis: normalizedHypothesis,
        schemaVersion: response.schemaVersion,
        filters: { ...response.filters },
        summary: { ...response.summary },
        patientExaminationIds
      }
      return this.definition
    },
    clear(): void {
      this.definition = null
    }
  }
})
