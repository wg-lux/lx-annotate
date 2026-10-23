import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createTerminologyBundleArchive,
  createTerminologyBundleArchives,
  fetchTerminologyBundles,
  importTerminologyBundle,
  MEDICAL_FIELD_OPTIONS,
  selectTerminologyBundle,
  type MedicalField,
  type TerminologyBundleVersion
} from '@/api/terminologyApi'
import axios from 'axios'

export type TerminologyBundleImportFailure = {
  sourceName: string
  message: string
}

export type TerminologyBundleBatchImportResult = {
  imported: TerminologyBundleVersion[]
  failures: TerminologyBundleImportFailure[]
}

export function terminologyBatchImportMessage(result: TerminologyBundleBatchImportResult): string {
  const installed = `${String(result.imported.length)} Paket${result.imported.length === 1 ? '' : 'e'} installiert`
  const activationHint =
    result.imported.length > 1 ? ' Bitte das gewünschte aktive Terminologiepaket auswählen.' : ''
  if (!result.failures.length) {
    return `${installed}.${activationHint}`.trim()
  }
  const failureDetails = result.failures
    .map((failure) => `${failure.sourceName}: ${failure.message}`)
    .join(' · ')
  return `${installed}; ${String(result.failures.length)} fehlgeschlagen: ${failureDetails}.${activationHint}`.trim()
}

const MEDICAL_FIELD_STORAGE_KEY = 'terminologyMedicalField.v1'
function terminologyErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    const detail = error.response?.data.detail || error.message || fallback
    const missingModule = detail.match(
      /Module '([^']+)' (?:is not loaded|is referenced but no configuration was loaded)/
    )
    if (missingModule) {
      return `Das Terminologiepaket ist unvollständig: Das benötigte Modul „${missingModule[1]}“ fehlt. Exportieren Sie ein vollständiges Paket aus lx-terminology-editor oder wählen Sie einen gemeinsamen Ordner mit allen abhängigen Paketverzeichnissen.`
    }
    return detail
  }
  return error instanceof Error ? error.message : fallback
}

function loadPersistedMedicalField(): MedicalField {
  try {
    const value = localStorage.getItem(MEDICAL_FIELD_STORAGE_KEY)
    if (value === 'gastroenterology') {
      return value
    }
  } catch {
    // Use the default medical field when browser storage is unavailable.
  }
  return 'gastroenterology'
}

function bundleKey(bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>): string {
  return `${bundle.moduleName}@@${bundle.version}`
}

export const useTerminologyStore = defineStore('terminology', () => {
  const bundles = ref<TerminologyBundleVersion[]>([])
  const activeBundle = ref<TerminologyBundleVersion | null>(null)
  const registryRevision = ref<string | null>(null)
  const loading = ref(false)
  const selecting = ref(false)
  const importing = ref(false)
  const error = ref<string | null>(null)
  const selectedMedicalField = ref<MedicalField>(loadPersistedMedicalField())
  const lastSelectionCounts = ref<Record<string, number> | null>(null)
  let loadGeneration = 0

  const activeModuleName = computed(() => activeBundle.value?.moduleName || '')
  const activeBundleKey = computed(() => (activeBundle.value ? bundleKey(activeBundle.value) : ''))
  const activeBundleLabel = computed(() => {
    if (!activeBundle.value) {
      return 'Keine aktive Terminologie'
    }
    return `${activeBundle.value.moduleName} · ${activeBundle.value.version}`
  })
  const filteredBundles = computed(() => bundles.value)
  const medicalFieldLabel = computed(() => 'Gastroenterologie')

  async function loadBundles() {
    const generation = ++loadGeneration
    loading.value = true
    error.value = null
    try {
      const response = await fetchTerminologyBundles()
      if (generation !== loadGeneration) {
        return
      }
      bundles.value = response.bundles
      activeBundle.value = response.active
      registryRevision.value = response.revision
      lastSelectionCounts.value = null
    } catch (caught: unknown) {
      if (generation !== loadGeneration) {
        return
      }
      if (axios.isAxiosError(caught) && caught.response?.status === 404) {
        bundles.value = []
        activeBundle.value = null
        registryRevision.value = null
        lastSelectionCounts.value = null
        return
      }
      error.value = terminologyErrorMessage(
        caught,
        'Terminologiepakete konnten nicht geladen werden.'
      )
      throw caught
    } finally {
      if (generation === loadGeneration) {
        loading.value = false
      }
    }
  }

  async function selectBundle(bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) {
    selecting.value = true
    error.value = null
    try {
      if (!registryRevision.value) {
        await loadBundles()
      }
      const expectedRevision = registryRevision.value
      if (!expectedRevision) {
        throw new Error('Die Revision des Terminologieregisters ist nicht verfügbar.')
      }
      const response = await selectTerminologyBundle({
        moduleName: bundle.moduleName,
        version: bundle.version,
        expectedRevision
      })
      if (registryRevision.value !== expectedRevision) {
        await loadBundles()
        throw new Error(
          'Die Terminologieauswahl wurde parallel geändert. Die aktuelle Auswahl wurde neu geladen.'
        )
      }
      loadGeneration += 1
      loading.value = false
      registryRevision.value = response.revision
      activeBundle.value = response.active
      lastSelectionCounts.value = response.counts
      bundles.value = bundles.value.map((candidate) => ({
        ...candidate,
        isActive:
          candidate.moduleName === response.active.moduleName &&
          candidate.version === response.active.version
      }))
      return response
    } catch (caught: unknown) {
      if (axios.isAxiosError(caught) && caught.response?.status === 409) {
        await loadBundles()
        error.value =
          'Die Terminologieauswahl wurde zwischenzeitlich geändert. Bitte prüfen Sie die aktuelle Auswahl und versuchen Sie es erneut.'
        throw caught
      }
      error.value = terminologyErrorMessage(
        caught,
        'Terminologiepaket konnte nicht aktiviert werden.'
      )
      throw caught
    } finally {
      selecting.value = false
    }
  }

  async function importBundle(file: File) {
    importing.value = true
    error.value = null
    try {
      const response = await importTerminologyBundle(file)
      await loadBundles()
      lastSelectionCounts.value = response.counts
      return response
    } catch (caught: unknown) {
      error.value = terminologyErrorMessage(
        caught,
        'Terminologiepaket konnte nicht importiert werden.'
      )
      throw caught
    } finally {
      importing.value = false
    }
  }

  async function importBundles(files: File[]): Promise<TerminologyBundleBatchImportResult> {
    importing.value = true
    error.value = null
    const result: TerminologyBundleBatchImportResult = { imported: [], failures: [] }
    let lastCounts: Record<string, number> | null = null
    try {
      for (const file of files) {
        try {
          const response = await importTerminologyBundle(file)
          lastCounts = response.counts
          result.imported.push(response.imported)
        } catch (caught: unknown) {
          result.failures.push({
            sourceName: file.name,
            message: terminologyErrorMessage(
              caught,
              'Terminologiepaket konnte nicht importiert werden.'
            )
          })
        }
      }
      if (result.imported.length) {
        await loadBundles()
        lastSelectionCounts.value = lastCounts
      }
      if (result.failures.length) {
        error.value = result.failures
          .map((failure) => `${failure.sourceName}: ${failure.message}`)
          .join('\n')
      }
      return result
    } finally {
      importing.value = false
    }
  }

  async function importBundleFolder(files: File[]) {
    const archive = await createTerminologyBundleArchive(files)
    return importBundle(archive)
  }

  async function importBundleFolders(files: File[]) {
    const archives = await createTerminologyBundleArchives(files)
    return importBundles(archives)
  }

  function setMedicalField(value: MedicalField) {
    selectedMedicalField.value = value
    try {
      localStorage.setItem(MEDICAL_FIELD_STORAGE_KEY, value)
    } catch {
      // The reactive selection remains valid when persistence is unavailable.
    }
  }

  function findBundleByKey(key: string): TerminologyBundleVersion | null {
    return bundles.value.find((bundle) => bundleKey(bundle) === key) || null
  }

  return {
    bundles,
    activeBundle,
    registryRevision,
    loading,
    selecting,
    importing,
    error,
    selectedMedicalField,
    lastSelectionCounts,
    activeModuleName,
    activeBundleKey,
    activeBundleLabel,
    filteredBundles,
    medicalFieldLabel,
    medicalFieldOptions: MEDICAL_FIELD_OPTIONS,
    bundleKey,
    findBundleByKey,
    importBundle,
    importBundles,
    importBundleFolder,
    importBundleFolders,
    loadBundles,
    selectBundle,
    setMedicalField
  }
})
