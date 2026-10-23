import { onScopeDispose, ref } from 'vue'
import { usePolling } from '@/composables/usePolling'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('sidebar')
// Phases are classified by the Rust state engine; do not keep status lists here.
type WorkflowItem = { anonymizationPhase: unknown; annotationStatus?: unknown }

function isWorkflowItem(item: unknown): item is WorkflowItem {
  return !!item && typeof item === 'object' && 'anonymizationPhase' in item
}

function isPendingValidation(item: WorkflowItem): boolean {
  return item.anonymizationPhase === 'awaiting_validation' && item.annotationStatus !== 'validated'
}

function countWorkflowItems(data: unknown) {
  if (!Array.isArray(data)) {
    return { pendingValidation: 0, processing: 0 }
  }
  const items = data.filter(isWorkflowItem)
  return {
    pendingValidation: items.filter(isPendingValidation).length,
    processing: items.filter((item) => item.anonymizationPhase === 'in_progress').length
  }
}

export function useSidebarWorkflowCounts() {
  const pendingValidationCount = ref(0)
  const processingCount = ref(0)
  let disposed = false

  async function refreshWorkflowCounts() {
    const { data } = await axiosInstance.get<unknown>(r(endpoints.anonymization.itemsOverview))
    if (disposed) {
      return
    }
    const counts = countWorkflowItems(data)
    pendingValidationCount.value = counts.pendingValidation
    processingCount.value = counts.processing
  }

  usePolling({
    intervalMs: 30000,
    task: refreshWorkflowCounts,
    onError: (error) => {
      logger.error('workflow-count-refresh-failed', error)
    }
  })
  onScopeDispose(() => {
    disposed = true
  })

  return { pendingValidationCount, processingCount }
}
