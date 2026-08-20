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
  if (!result.failures.length) return `${installed}.${activationHint}`.trim()
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
    if (value === 'gastroenterology') return value
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
  const loading = ref(false)
  const selecting = ref(false)
  const importing = ref(false)
  const error = ref<string | null>(null)
  const selectedMedicalField = ref<MedicalField>(loadPersistedMedicalField())
  const lastSelectionCounts = ref<Record<string, number> | null>(null)

  const activeModuleName = computed(() => activeBundle.value?.moduleName || '')
  const activeBundleKey = computed(() => (activeBundle.value ? bundleKey(activeBundle.value) : ''))
  const activeBundleLabel = computed(() => {
    if (!activeBundle.value) return 'Keine aktive Terminologie'
    return `${activeBundle.value.moduleName} · ${activeBundle.value.version}`
  })
  const filteredBundles = computed(() => bundles.value)
  const medicalFieldLabel = computed(() => 'Gastroenterologie')

  async function loadBundles() {
    loading.value = true
    error.value = null
    try {
      const response = await fetchTerminologyBundles()
      bundles.value = response.bundles
      activeBundle.value = response.active
      lastSelectionCounts.value = null
    } catch (caught: unknown) {
      if (axios.isAxiosError(caught) && caught.response?.status === 404) {
        bundles.value = []
        activeBundle.value = null
        lastSelectionCounts.value = null
        return
      }
      error.value = terminologyErrorMessage(
        caught,
        'Terminologiepakete konnten nicht geladen werden.'
      )
      throw caught
    } finally {
      loading.value = false
    }
  }

  async function selectBundle(bundle: Pick<TerminologyBundleVersion, 'moduleName' | 'version'>) {
    selecting.value = true
    error.value = null
    try {
      const response = await selectTerminologyBundle({
        moduleName: bundle.moduleName,
        version: bundle.version
      })
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
      const imported = response.imported
      applyImportedBundle(imported)
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

  function applyImportedBundle(imported: TerminologyBundleVersion, activate = true) {
    if (activate) activeBundle.value = imported
    const withoutImported = bundles.value.filter(
      (candidate) =>
        candidate.moduleName !== imported.moduleName || candidate.version !== imported.version
    )
    bundles.value = [
      ...withoutImported.map((candidate) => ({
        ...candidate,
        isActive: activate
          ? false
          : candidate.moduleName === activeBundle.value?.moduleName &&
            candidate.version === activeBundle.value.version
      })),
      { ...imported, isActive: activate }
    ].sort((left, right) =>
      `${left.moduleName}@@${left.version}`.localeCompare(`${right.moduleName}@@${right.version}`)
    )
  }

  async function importBundles(files: File[]): Promise<TerminologyBundleBatchImportResult> {
    importing.value = true
    error.value = null
    const result: TerminologyBundleBatchImportResult = { imported: [], failures: [] }
    const previousActiveBundle = activeBundle.value
    try {
      for (const file of files) {
        try {
          const response = await importTerminologyBundle(file)
          applyImportedBundle(response.imported, false)
          lastSelectionCounts.value = response.counts
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
      if (result.failures.length) {
        error.value = result.failures
          .map((failure) => `${failure.sourceName}: ${failure.message}`)
          .join('\n')
      }
      if (result.imported.length === 1 && !previousActiveBundle) {
        applyImportedBundle(result.imported[0], true)
      } else if (previousActiveBundle && result.imported.length) {
        const response = await selectTerminologyBundle({
          moduleName: previousActiveBundle.moduleName,
          version: previousActiveBundle.version
        })
        activeBundle.value = response.active
        lastSelectionCounts.value = response.counts
        bundles.value = bundles.value.map((candidate) => ({
          ...candidate,
          isActive:
            candidate.moduleName === response.active.moduleName &&
            candidate.version === response.active.version
        }))
      } else if (result.imported.length > 1) {
        const backendActiveBundle = result.imported[result.imported.length - 1]
        applyImportedBundle(backendActiveBundle, true)
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
