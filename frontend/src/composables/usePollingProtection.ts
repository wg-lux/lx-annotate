// frontend/src/composables/usePollingProtection.ts

import { ref, computed } from 'vue'
import { useMediaManagement } from '@/api/mediaManagement'

export type ProtectedMediaType = 'video' | 'pdf'

/**
 * Composable for polling protection and coordination (soft-locks)
 */
export function usePollingProtection() {
  const { getStatusSafe, startAnonymizationSafe, validateAnonymizationSafe, clearAllLocks } =
    useMediaManagement()

  // Soft-locks with TTL (ms)
  const DEFAULT_LOCK_TTL_MS = 5000 // kurzer Zeitraum, damit UI nicht blockiert
  const processingLocks = ref<Map<string, number>>(new Map()) // key -> expiresAt (epoch ms)

  // Helper to create lock key
  const createLockKey = (fileId: number, mediaType: ProtectedMediaType): string => {
    return `${mediaType}:${fileId}`
  }

  // Remove expired locks
  const purgeExpiredLocks = () => {
    const now = Date.now()
    processingLocks.value.forEach((expiresAt, key) => {
      if (expiresAt <= now) {
        processingLocks.value.delete(key)
      }
    })
  }

  /**
   * Check if a media item can be safely processed (not locked or lock expired)
   */
  const canProcessMedia = computed(() => {
    return (fileId: number, mediaType: ProtectedMediaType): boolean => {
      purgeExpiredLocks()
      const lockKey = createLockKey(fileId, mediaType)
      const expiresAt = processingLocks.value.get(lockKey)
      if (!expiresAt) return true
      if (expiresAt <= Date.now()) {
        processingLocks.value.delete(lockKey)
        return true
      }
      return false
    }
  })

  /**
   * Acquire processing lock for media item (soft, with TTL)
   */
  const acquireProcessingLock = (
    fileId: number,
    mediaType: ProtectedMediaType,
    ttlMs: number = DEFAULT_LOCK_TTL_MS
  ): boolean => {
    purgeExpiredLocks()
    const lockKey = createLockKey(fileId, mediaType)
    const existing = processingLocks.value.get(lockKey)
    if (existing && existing > Date.now()) {
      // lock aktiv
      return false
    }
    processingLocks.value.set(lockKey, Date.now() + Math.max(1000, ttlMs))
    return true
  }

  /**
   * Release processing lock for media item
   */
  const releaseProcessingLock = (fileId: number, mediaType: ProtectedMediaType): void => {
    const lockKey = createLockKey(fileId, mediaType)
    processingLocks.value.delete(lockKey)
  }

  /**
   * Safe status check with polling protection (kein Lock nötig)
   */
  const getStatusSafeWithProtection = async (
    fileId: number,
    mediaType: ProtectedMediaType
  ): Promise<any> => {
    try {
      const result = await getStatusSafe(fileId, mediaType)
      return result
    } catch (error: any) {
      console.error(`Status check failed for ${mediaType}:${fileId}:`, error)
      throw error
    }
  }

  /**
   * Safe anonymization start with short-lived lock (nur für Request-Dauer)
   */
  const startAnonymizationSafeWithProtection = async (
    fileId: number,
    mediaType: ProtectedMediaType
  ): Promise<any> => {
    const acquired = acquireProcessingLock(fileId, mediaType)
    if (!acquired) {
      throw new Error('Datei wird bereits verarbeitet')
    }
    try {
      const result = await startAnonymizationSafe(fileId)
      return result
    } catch (error) {
      throw error
    } finally {
      // Lock immer freigeben, damit UI nicht gebremst wird
      releaseProcessingLock(fileId, mediaType)
    }
  }

  /**
   * Safe validation with short-lived coordination
   */
  const validateAnonymizationSafeWithProtection = async (
    fileId: number,
    mediaType: ProtectedMediaType
  ): Promise<any> => {
    const acquired = acquireProcessingLock(fileId, mediaType)
    if (!acquired) {
      // Falls parallel etwas läuft, trotzdem versuchen (Validation ist idempotent)
      // Kein harter Abbruch
    }
    try {
      const result = await validateAnonymizationSafe(fileId)
      return result
    } catch (error: any) {
      console.error(`Validation failed for ${mediaType}:${fileId}:`, error)
      throw error
    } finally {
      releaseProcessingLock(fileId, mediaType)
    }
  }

  /**
   * Emergency function to clear all local locks
   */
  const clearAllLocalLocks = (): void => {
    const clearedCount = processingLocks.value.size
    processingLocks.value.clear()
    console.log(`Cleared ${clearedCount} local processing locks`)
  }

  /**
   * Clear both local and server-side locks
   */
  const clearAllProcessingLocks = async (fileType?: ProtectedMediaType): Promise<void> => {
    try {
      // Clear server-side locks
      await clearAllLocks(fileType)

      // Clear local locks
      if (fileType) {
        // Clear only specific type
        Array.from(processingLocks.value.keys()).forEach((key) => {
          if (key.startsWith(`${fileType}:`)) processingLocks.value.delete(key)
        })
      } else {
        // Clear all local locks
        clearAllLocalLocks()
      }

      console.log('All processing locks cleared successfully')
    } catch (error) {
      console.error('Failed to clear processing locks:', error)
      throw error
    }
  }

  /**
   * Get current processing locks info
   */
  const getProcessingLocksInfo = computed(() => {
    const locks = Array.from(processingLocks.value.entries()).map(([key, expiresAt]) => ({
      key,
      expiresAt
    }))
    return {
      totalLocks: locks.length,
      locks,
      videoLocks: locks.filter((l) => l.key.startsWith('video:')),
      pdfLocks: locks.filter((l) => l.key.startsWith('pdf:'))
    }
  })

  return {
    // State
    processingLocks: computed(() => Array.from(processingLocks.value.entries())),
    getProcessingLocksInfo,

    // Core functions
    canProcessMedia,
    acquireProcessingLock,
    releaseProcessingLock,

    // Safe API operations
    getStatusSafeWithProtection,
    startAnonymizationSafeWithProtection,
    validateAnonymizationSafeWithProtection,

    // Cleanup functions
    clearAllLocalLocks,
    clearAllProcessingLocks
  }
}
