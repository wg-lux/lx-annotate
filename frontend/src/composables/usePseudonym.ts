// Vue 3 + TypeScript snippet for pseudonym generation button
// Add this to your patient detail/edit component

import { ref } from 'vue'
import axios from 'axios' // Using axios directly - adjust to your setup

interface PseudonymResponse {
  patient_id: number
  patient_hash: string
  source: string
  persisted: boolean
  message: string
}

interface PseudonymError {
  error: string
  detail?: string
  missing_fields?: string[]
}

// Reactive state
const isGeneratingPseudonym = ref(false)
const pseudonymError = ref<string | null>(null)
const pseudonymSuccess = ref<string | null>(null)

/**
 * Generate a pseudonym for the current patient
 * @param patientId - The ID of the patient to generate a pseudonym for
 * @returns The patient hash if successful
 */
async function generatePseudonym(patientId: number): Promise<string | null> {
  isGeneratingPseudonym.value = true
  pseudonymError.value = null
  pseudonymSuccess.value = null

  try {
    const response = await axios.post<PseudonymResponse>(`/api/patients/${patientId}/pseudonym/`)

    const { patient_hash, persisted, message } = response.data

    pseudonymSuccess.value = `${message} - Hash: ${patient_hash.substring(0, 8)}...`

    // If you want to update the patient object in your store:
    // const patientStore = usePatientStore()
    // patientStore.updatePatientHash(patientId, patient_hash)

    return patient_hash
  } catch (error: any) {
    let errorMessage = 'Fehler beim Generieren der Pseudonamen'

    if (error.response?.data) {
      const errorData: PseudonymError = error.response.data
      errorMessage = errorData.error

      if (errorData.missing_fields?.length) {
        errorMessage += `: Fehlende Felder: ${errorData.missing_fields.join(', ')}`
      } else if (errorData.detail) {
        errorMessage += `: ${errorData.detail}`
      }
    }

    pseudonymError.value = errorMessage
    console.error('Pseudonym generation error:', error)
    return null
  } finally {
    isGeneratingPseudonym.value = false
  }
}

// Example template usage:
/*
<template>
  <div class="pseudonym-section">
    <button 
      @click="generatePseudonym(patient.id)"
      :disabled="isGeneratingPseudonym"
      class="btn btn-secondary"
    >
      {{ isGeneratingPseudonym ? 'Generiere...' : 'Pseudonym generieren' }}
    </button>
    
    <div v-if="pseudonymSuccess" class="alert alert-success mt-2">
      {{ pseudonymSuccess }}
    </div>
    
    <div v-if="pseudonymError" class="alert alert-danger mt-2">
      {{ pseudonymError }}
    </div>
    
    <div v-if="patient.patient_hash" class="mt-2">
      <small class="text-muted">
        Aktueller Hash: {{ patient.patient_hash.substring(0, 8) }}...
      </small>
    </div>
  </div>
</template>
*/

export { generatePseudonym, isGeneratingPseudonym, pseudonymError, pseudonymSuccess }
