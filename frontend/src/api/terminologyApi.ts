import axiosInstance, { dtypesApi } from '@/api/axiosInstance'

const TERMINOLOGY_BASE = dtypesApi('terminology')

export type MedicalField = 'gastroenterology'

export type TerminologyBundleVersion = {
  moduleName: string
  version: string
  medicalField: MedicalField | null
  inputDirs: string[]
  isActive: boolean
}

export type TerminologyBundleListResponse = {
  registryPath: string
  active: TerminologyBundleVersion | null
  bundles: TerminologyBundleVersion[]
}

export type SelectTerminologyBundlePayload = {
  moduleName: string
  version: string
}

export type SelectTerminologyBundleResponse = {
  ok: boolean
  active: TerminologyBundleVersion
  counts: Record<string, number>
}

export type ImportTerminologyBundleResponse = {
  ok: boolean
  imported: TerminologyBundleVersion
  registryPath: string
  counts: Record<string, number>
}

export const MEDICAL_FIELD_OPTIONS: Array<{ value: MedicalField; label: string }> = [
  { value: 'gastroenterology', label: 'Gastroenterologie' }
]

export async function fetchTerminologyBundles(): Promise<TerminologyBundleListResponse> {
  const response = await axiosInstance.get<TerminologyBundleListResponse>(
    `${TERMINOLOGY_BASE}/bundles`
  )
  return response.data
}

export async function importTerminologyBundle(file: File): Promise<ImportTerminologyBundleResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await axiosInstance.post<ImportTerminologyBundleResponse>(
    `${TERMINOLOGY_BASE}/bundles/import`,
    formData
  )
  return response.data
}

export async function selectTerminologyBundle(
  payload: SelectTerminologyBundlePayload
): Promise<SelectTerminologyBundleResponse> {
  const response = await axiosInstance.post<SelectTerminologyBundleResponse>(
    `${TERMINOLOGY_BASE}/bundles/select`,
    payload
  )
  return response.data
}
