import { computed } from 'vue'
import { isRuntimeDebugEnabled } from '@/utils/runtimeLogger'

export function useDebug() {
  const isDebug = computed(() => isRuntimeDebugEnabled())
  return { isDebug }
}
