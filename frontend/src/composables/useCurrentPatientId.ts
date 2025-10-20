import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { usePatientStore } from '@/stores/patientStore'

/**
 * Composable for robust patient ID resolution across different contexts
 * 
 * Provides a single source of truth for current patient ID with precedence:
 * 1. Prop ID (if provided)
 * 2. Store current patient ID
 * 3. Route params patient ID
 */
export function useCurrentPatientId(propPatientId?: number | string | null) {
  const route = useRoute()
  const patientStore = usePatientStore()

  // Computed patient ID with fallback chain
  const currentPatientId: ComputedRef<number | null> = computed(() => {
    // 1. Prop ID has highest precedence
    if (propPatientId !== undefined && propPatientId !== null) {
      const id = typeof propPatientId === 'string' ? parseInt(propPatientId, 10) : propPatientId
      if (!isNaN(id) && id > 0) {
        return id
      }
    }

    // 2. Store current patient
    if (patientStore.currentPatient?.id) {
      return patientStore.currentPatient.id
    }

    // 3. Route params as last resort
    const routePatientId = route.params.patientId || route.params.id
    if (routePatientId) {
      // Handle both string and string[] from route params
      const idString = Array.isArray(routePatientId) ? routePatientId[0] : routePatientId
      const id = parseInt(idString, 10)
      if (!isNaN(id) && id > 0) {
        return id
      }
    }

    return null
  })

  /**
   * Get current patient ID with optional strict mode
   * @param strict - If true, throws error when no patient ID is found
   * @returns Patient ID or null
   * @throws Error if strict=true and no patient ID found
   */
  const getCurrentPatientId = (strict = false): number | null => {
    const id = currentPatientId.value

    if (strict && !id) {
      throw new Error('Keine gültige Patienten-ID gefunden. Stellen Sie sicher, dass ein Patient ausgewählt ist oder über Props/Route übergeben wird.')
    }

    return id
  }

  /**
   * Check if a valid patient ID is available
   */
  const hasValidPatientId = computed(() => currentPatientId.value !== null)

  /**
   * Get patient ID as string for URL construction
   */
  const patientIdAsString = computed(() => {
    const id = currentPatientId.value
    return id ? id.toString() : null
  })

  return {
    currentPatientId,
    getCurrentPatientId,
    hasValidPatientId,
    patientIdAsString
  }
}

export default useCurrentPatientId
