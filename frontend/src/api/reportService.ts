// src/api/reportService.ts
import { ref } from 'vue'
import axiosInstance, { r } from './axiosInstance'

// --- Define your data interfaces (adjust fields to match your API) ---
export interface Center {
  id: number
  name: string
}
export interface Examination {
  id: number
  name: string
}
export interface Finding {
  id: number
  name: string
}
export interface Classification {
  id: number
  name: string
}
export interface ClassificationChoice {
  id: number
  name: string
  classificationId: number
}
export interface Intervention {
  id: number
  name: string
}

// --- The composable ---
export function useReportService() {
  // reactive state
  const centers                    = ref<Center[]>([])
  const examinations               = ref<Examination[]>([])
  const findings                   = ref<Finding[]>([])
  const locationClassifications    = ref<Classification[]>([])
  const locationClassificationChoices = ref<ClassificationChoice[]>([])
  const morphologyClassifications  = ref<Classification[]>([])
  const morphologyClassificationChoices = ref<ClassificationChoice[]>([])
  const interventions              = ref<Intervention[]>([])

  // fetch helpers
  async function getCenters() {
    try {
      const { data } = await axiosInstance.get<Center[]>(r('centers/'))
      centers.value = data
    } catch (e) {
      console.error('Error fetching centers:', e)
    }
  }

  async function getExaminations() {
    try {
      const { data } = await axiosInstance.get<Examination[]>(r('examinations/'))
      examinations.value = data
      return data
    } catch (e) {
      console.error('Error fetching examinations:', e)
      return []
    }
  }

  async function getFindings() {
    try {
      const { data } = await axiosInstance.get<Finding[]>(r('findings/'))
      findings.value = data
    } catch (e) {
      console.error('Error fetching findings:', e)
    }
  }

  async function getLocationClassifications() {
    try {
      const { data } = await axiosInstance.get<Classification[]>(r('location-classifications/'))
      locationClassifications.value = data
    } catch (e) {
      console.error('Error fetching location classifications:', e)
    }
  }

  async function getLocationClassificationChoices() {
    try {
      const { data } = await axiosInstance.get<ClassificationChoice[]>(r('location-classification-choices/'))
      locationClassificationChoices.value = data
    } catch (e) {
      console.error('Error fetching location classification choices:', e)
    }
  }

  async function getMorphologyClassifications() {
    try {
      const { data } = await axiosInstance.get<Classification[]>(r('morphology-classifications/'))
      morphologyClassifications.value = data
    } catch (e) {
      console.error('Error fetching morphology classifications:', e)
    }
  }

  async function getMorphologyClassificationChoices() {
    try {
      const { data } = await axiosInstance.get<ClassificationChoice[]>(r('morphology-classification-choices/'))
      morphologyClassificationChoices.value = data
    } catch (e) {
      console.error('Error fetching morphology classification choices:', e)
    }
  }

  async function getInterventions() {
    try {
      const { data } = await axiosInstance.get<Intervention[]>(r('interventions/'))
      interventions.value = data
    } catch (e) {
      console.error('Error fetching interventions:', e)
    }
  }

  return {
    // state
    centers,
    examinations,
    findings,
    locationClassifications,
    locationClassificationChoices,
    morphologyClassifications,
    morphologyClassificationChoices,
    interventions,
    // actions
    getCenters,
    getExaminations,
    getFindings,
    getLocationClassifications,
    getLocationClassificationChoices,
    getMorphologyClassifications,
    getMorphologyClassificationChoices,
    getInterventions,
  }
}
