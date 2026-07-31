import axiosInstance, { dtypesApi } from '@/api/axiosInstance'
import { zipSync } from 'fflate'

const TERMINOLOGY_BASE = dtypesApi('terminology')

export type MedicalField = 'gastroenterology'

export type TerminologyBundleVersion = {
  moduleName: string
  version: string
  medicalField: MedicalField | null
  isActive: boolean
}

export type TerminologyBundleListResponse = {
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
  counts: Record<string, number>
}

type DirectoryFile = File & { webkitRelativePath?: string }

function terminologyArchivePath(file: DirectoryFile): string {
  const relativePath = file.webkitRelativePath?.replace(/\\/g, '/').replace(/^\/+/, '')
  return relativePath || file.name
}

function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(reader.error || new Error(`Datei konnte nicht gelesen werden: ${file.name}`))
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error(`Datei konnte nicht gelesen werden: ${file.name}`))
        return
      }
      resolve(new Uint8Array(reader.result))
    }
    reader.readAsArrayBuffer(file)
  })
}

export async function createTerminologyBundleArchive(files: File[]): Promise<File> {
  if (!files.length) {
    throw new Error('Der ausgewählte Ordner enthält keine Dateien.')
  }

  const archiveEntries: Record<string, Uint8Array> = {}
  await Promise.all(
    files.map(async (file) => {
      archiveEntries[terminologyArchivePath(file)] = await readFileBytes(file)
    })
  )

  const archive = zipSync(archiveEntries, { level: 6 })
  return new File([archive], 'terminology-folder.zip', { type: 'application/zip' })
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

export async function importTerminologyBundle(
  file: File
): Promise<ImportTerminologyBundleResponse> {
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
