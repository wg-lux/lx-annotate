import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTerminologyStore } from '@/stores/terminologyStore'

const hoisted = vi.hoisted(() => ({
  createTerminologyBundleArchives: vi.fn(),
  fetchTerminologyBundles: vi.fn(),
  importTerminologyBundle: vi.fn()
}))

vi.mock('@/api/terminologyApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/terminologyApi')>()
  return {
    ...original,
    createTerminologyBundleArchives: hoisted.createTerminologyBundleArchives,
    fetchTerminologyBundles: hoisted.fetchTerminologyBundles,
    importTerminologyBundle: hoisted.importTerminologyBundle
  }
})

describe('terminologyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('treats a missing registry as an empty setup state', async () => {
    hoisted.fetchTerminologyBundles.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 404,
        data: { detail: 'The configured terminology registry does not exist.' }
      }
    })
    const terminology = useTerminologyStore()

    await expect(terminology.loadBundles()).resolves.toBeUndefined()

    expect(terminology.bundles).toEqual([])
    expect(terminology.activeBundle).toBeNull()
    expect(terminology.error).toBeNull()
  })

  it('imports package ZIPs sequentially and reports partial failures', async () => {
    const first = new File(['first'], 'first.zip', { type: 'application/zip' })
    const broken = new File(['broken'], 'broken.zip', { type: 'application/zip' })
    const second = new File(['second'], 'second.zip', { type: 'application/zip' })
    hoisted.importTerminologyBundle
      .mockResolvedValueOnce({
        ok: true,
        imported: {
          moduleName: 'first',
          version: '1.0',
          medicalField: 'gastroenterology',
          isActive: true
        },
        counts: { findings: 1 }
      })
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { detail: 'Ungültiges Paket.' } }
      })
      .mockResolvedValueOnce({
        ok: true,
        imported: {
          moduleName: 'second',
          version: '2.0',
          medicalField: 'gastroenterology',
          isActive: true
        },
        counts: { findings: 2 }
      })
    const terminology = useTerminologyStore()

    const result = await terminology.importBundles([first, broken, second])

    expect(hoisted.importTerminologyBundle.mock.calls.map(([file]) => file.name)).toEqual([
      'first.zip',
      'broken.zip',
      'second.zip'
    ])
    expect(result.imported.map((bundle) => bundle.moduleName)).toEqual(['first', 'second'])
    expect(result.failures).toEqual([{ sourceName: 'broken.zip', message: 'Ungültiges Paket.' }])
    expect(terminology.activeBundle).toBeNull()
    expect(terminology.bundles.every((bundle) => !bundle.isActive)).toBe(true)
    expect(terminology.error).toContain('broken.zip: Ungültiges Paket.')
  })

  it('creates and imports one archive per package directory', async () => {
    const selectedFiles = [new File(['config'], 'config.yaml')]
    const archives = [
      new File(['first'], 'first.zip', { type: 'application/zip' }),
      new File(['second'], 'second.zip', { type: 'application/zip' })
    ]
    hoisted.createTerminologyBundleArchives.mockResolvedValue(archives)
    hoisted.importTerminologyBundle.mockImplementation(async (file: File) => ({
      ok: true,
      imported: {
        moduleName: file.name.replace('.zip', ''),
        version: '1.0',
        medicalField: 'gastroenterology',
        isActive: true
      },
      counts: {}
    }))
    const terminology = useTerminologyStore()

    const result = await terminology.importBundleFolders(selectedFiles)

    expect(hoisted.createTerminologyBundleArchives).toHaveBeenCalledWith(selectedFiles)
    expect(result.imported).toHaveLength(2)
  })

  it('explains how to resolve a missing package dependency', async () => {
    const archive = new File(['star'], 'star_upper_gi.zip', { type: 'application/zip' })
    hoisted.importTerminologyBundle.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          detail:
            "Terminology bundle 'star_upper_gi' could not be loaded after import: Module 'lx_units' is not loaded. Call 'load_module_configs' first."
        }
      }
    })
    const terminology = useTerminologyStore()

    const result = await terminology.importBundles([archive])

    expect(result.failures[0].message).toContain('Das benötigte Modul „lx_units“ fehlt')
    expect(result.failures[0].message).toContain('gemeinsamen Ordner')
  })
})
