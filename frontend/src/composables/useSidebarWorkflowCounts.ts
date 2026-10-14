import { onBeforeUnmount, onMounted, ref } from 'vue'
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('sidebar')
const processingStatuses = new Set([
  'processing_anonymization',
  'extracting_frames',
  'predicting_segments'
])

type WorkflowItem = { anonymizationStatus: unknown; annotationStatus?: unknown }

function isWorkflowItem(item: unknown): item is WorkflowItem {
  return !!item && typeof item === 'object' && 'anonymizationStatus' in item
}

function isPendingValidation(item: WorkflowItem): boolean {
  return (
    item.anonymizationStatus === 'done_processing_anonymization' &&
    item.annotationStatus !== 'validated'
  )
}

function countWorkflowItems(data: unknown) {
  if (!Array.isArray(data)) {
    return { pendingValidation: 0, processing: 0 }
  }
  const items = data.filter(isWorkflowItem)
  return {
    pendingValidation: items.filter(isPendingValidation).length,
    processing: items.filter(
      (item) =>
        typeof item.anonymizationStatus === 'string' &&
        processingStatuses.has(item.anonymizationStatus)
    ).length
  }
}

export function useSidebarWorkflowCounts() {
  const pendingValidationCount = ref(0)
  const processingCount = ref(0)
  let interval: number | undefined
  let disposed = false

  async function refreshWorkflowCounts() {
    try {
      const { data } = await axiosInstance.get<unknown>(r(endpoints.anonymization.itemsOverview))
      if (disposed) {
        return
      }
      const counts = countWorkflowItems(data)
      pendingValidationCount.value = counts.pendingValidation
      processingCount.value = counts.processing
    } catch (error) {
      logger.error('workflow-count-refresh-failed', error)
    }
  }

  onMounted(() => {
    void refreshWorkflowCounts()
    interval = window.setInterval(() => {
      void refreshWorkflowCounts()
    }, 30000)
  })
  onBeforeUnmount(() => {
    disposed = true
    window.clearInterval(interval)
  })

  return { pendingValidationCount, processingCount }
}
