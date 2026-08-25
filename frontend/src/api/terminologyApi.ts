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
  revision: string
  active: TerminologyBundleVersion | null
  bundles: TerminologyBundleVersion[]
}

export type SelectTerminologyBundlePayload = {
  moduleName: string
  version: string
  expectedRevision: string
}

export type SelectTerminologyBundleResponse = {
  ok: boolean
  revision: string
  active: TerminologyBundleVersion
  counts: Record<string, number>
}

export type ImportTerminologyBundleResponse = {
  ok: boolean
  revision: string
  imported: TerminologyBundleVersion
  counts: Record<string, number>
}

type TerminologyDirectoryEntry = {
  file: File
  path: string
}

function directoryRelativePath(file: File): string {
  const relativePath: unknown = Reflect.get(file, 'webkitRelativePath')
  return typeof relativePath === 'string' ? relativePath : ''
}

function terminologyArchivePath(file: File): string {
  const relativePath = directoryRelativePath(file).replace(/\\/g, '/').replace(/^\/+/, '')
  return relativePath || file.name
}

function terminologyBundleRoots(entries: TerminologyDirectoryEntry[]): string[] {
  const configRoots = [
    ...new Set(
      entries
        .filter(({ path }) => path === 'config.yaml' || path.endsWith('/config.yaml'))
        .map(({ path }) => path.split('/').slice(0, -1).join('/'))
    )
  ].sort((left, right) => left.length - right.length)

  return configRoots.filter(
    (candidate) =>
      !configRoots.some(
        (other) => other !== candidate && (other === '' || candidate.startsWith(`${other}/`))
      )
  )
}

function entryBelongsToRoot(path: string, root: string): boolean {
  return root === '' || path.startsWith(`${root}/`)
}

function relativePathWithinRoot(path: string, root: string): string {
  return root === '' ? path : path.slice(root.length + 1)
}

function archiveNameForRoot(root: string, index: number, roots: string[]): string {
  const segments = root.split('/').filter(Boolean)
  const leaf = segments.at(-1) || `terminology-package-${String(index + 1)}`
  const duplicateLeaf = roots.some(
    (candidate) => candidate !== root && candidate.split('/').filter(Boolean).at(-1) === leaf
  )
  const directoryName = duplicateLeaf ? segments.join('--') : leaf
  return `${directoryName}.zip`
}

function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => {
      reject(
        Object.assign(new Error(`Datei konnte nicht gelesen werden: ${file.name}`), {
          cause: reader.error ?? undefined
        })
      )
    }
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
  const archives = await createTerminologyBundleArchives(files)
  if (archives.length !== 1) {
    throw new Error(
      `Die Auswahl enthält ${String(archives.length)} Terminologiepakete. Verwenden Sie den Mehrfachimport.`
    )
  }
  return archives[0]
}

export async function createTerminologyBundleArchives(files: File[]): Promise<File[]> {
  if (!files.length) {
    throw new Error('Die ausgewählten Verzeichnisse enthalten keine Dateien.')
  }
  if (
    files.length > 1 &&
    files.some((file) => !directoryRelativePath(file).trim())
  ) {
    throw new Error(
      'Die Ordnerstruktur ist für diese Auswahl nicht verfügbar. Bitte die Paketverzeichnisse als ZIP-Dateien exportieren und über „ZIPs lokal/Cloud importieren“ wählen.'
    )
  }

  const entries = files.map((file) => ({ file, path: terminologyArchivePath(file) }))
  const roots = terminologyBundleRoots(entries)
  if (!roots.length) {
    throw new Error('Keines der ausgewählten Verzeichnisse enthält eine config.yaml.')
  }

  const unassignedPaths = entries
    .filter(({ path }) => !roots.some((root) => entryBelongsToRoot(path, root)))
    .map(({ path }) => path)
  if (unassignedPaths.length) {
    throw new Error(
      `Dateien außerhalb erkannter Paketverzeichnisse: ${unassignedPaths.slice(0, 3).join(', ')}`
    )
  }

  return Promise.all(
    roots.map(async (root, index) => {
      const archiveEntries: Record<string, Uint8Array> = {}
      const archiveRoot =
        root.split('/').filter(Boolean).at(-1) || `terminology-package-${String(index + 1)}`
      await Promise.all(
        entries.map(async ({ file, path }) => {
          const ownerRoot = roots.find((candidate) => entryBelongsToRoot(path, candidate))
          if (ownerRoot === undefined) {
            throw new Error(`Datei außerhalb erkannter Paketverzeichnisse: ${path}`)
          }
          const ownerIndex = roots.indexOf(ownerRoot)
          const relativePath = relativePathWithinRoot(path, ownerRoot)
          const archivePath =
            ownerRoot === root
              ? `${archiveRoot}/${relativePath}`
              : `${archiveRoot}/.dependencies/${String(ownerIndex)}-${archiveNameForRoot(ownerRoot, ownerIndex, roots).replace(/\.zip$/, '')}/${relativePath}`
          archiveEntries[archivePath] = await readFileBytes(file)
        })
      )
      const archive: unknown = zipSync(archiveEntries, { level: 6 })
      if (!(archive instanceof Uint8Array)) {
        throw new TypeError('Terminology archive creation returned invalid binary data')
      }
      return new File([archive.buffer], archiveNameForRoot(root, index, roots), {
        type: 'application/zip'
      })
    })
  )
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
