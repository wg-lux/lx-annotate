import { computed, unref, type MaybeRef } from 'vue'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useTerminologyStore } from '@/stores/terminologyStore'
import {
  readReportingKnowledgeBaseIdentity,
  resolveReportingKnowledgeBaseContext,
  type ReportingKnowledgeBaseIdentity
} from './reportingKnowledgeBaseContext'
import type { FindingsCatalogContext } from '@/api/findingsApi'

export function useReportingKnowledgeBase(
  detailRef?: MaybeRef<Record<string, unknown> | null>
) {
  const flow = useReportingFlowStore()
  const terminology = useTerminologyStore()

  const pinnedIdentity = computed<ReportingKnowledgeBaseIdentity | null>(() => {
    // 1. Check runtime draft payload in store
    const payload = flow.currentRuntimeDraft?.payload
    if (payload?.knowledgeBaseModule && payload?.knowledgeBaseVersion) {
      return {
        moduleName: payload.knowledgeBaseModule,
        moduleVersion: payload.knowledgeBaseVersion
      }
    }

    // 2. Check draft template identity in store
    const templateIdentity = flow.currentRuntimeDraft?.templateIdentity
    if (templateIdentity?.moduleName && templateIdentity?.knowledgeBaseVersion) {
      return {
        moduleName: templateIdentity.moduleName,
        moduleVersion: templateIdentity.knowledgeBaseVersion
      }
    }

    // 3. Fall back to reading passed-in component detail state
    const detail = unref(detailRef)
    return readReportingKnowledgeBaseIdentity(detail)
  })

  function getCatalogContext(options?: {
    allowMismatchFallback?: boolean
  }): FindingsCatalogContext | undefined {
    const bundle = terminology.activeBundle
    const patientExaminationId = flow.patientExaminationId
    if (!bundle || !patientExaminationId) return undefined

    return resolveReportingKnowledgeBaseContext({
      patientExaminationId,
      pinnedIdentity: pinnedIdentity.value,
      activeBundle: bundle,
      allowMismatchFallback: options?.allowMismatchFallback ?? true
    })
  }

  return {
    pinnedIdentity,
    getCatalogContext
  }
}