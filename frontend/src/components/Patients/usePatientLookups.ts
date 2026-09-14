import { computed } from 'vue'
import { usePatientStore } from '@/stores/patientStore'
import { patientService, type Gender, type Center } from '@/api/patientService'

function lookupName(items: Array<Gender | Center>, value: string | null | undefined, empty: string) {
  if (!value) return empty
  const item = items.find((candidate) => candidate.name === value)
  return item?.nameDe || item?.name || value
}

export function usePatientLookups() {
  const store = usePatientStore()
  const genders = computed(() => store.genders)
  const centers = computed(() => store.centers)

  async function loadLookupData() {
    if (genders.value.length === 0) store.genders = await patientService.getGenders()
    if (centers.value.length === 0) store.centers = await patientService.getCenters()
  }

  const getGenderName = (value?: string | null) =>
    lookupName(genders.value, value, 'Nicht angegeben')
  const getCenterName = (value?: string | null) =>
    lookupName(centers.value, value, 'Nicht zugeordnet')

  return { genders, centers, getGenderName, getCenterName, loadLookupData }
}
