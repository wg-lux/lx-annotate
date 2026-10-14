import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTerminologyStore } from '@/stores/terminologyStore'

type CreateTerminologyBundleArchives =
  typeof import('@/api/terminologyApi').createTerminologyBundleArchives
type FetchTerminologyBundles = typeof import('@/api/terminologyApi').fetchTerminologyBundles
type ImportTerminologyBundle = typeof import('@/api/terminologyApi').importTerminologyBundle
type SelectTerminologyBundle = typeof import('@/api/terminologyApi').selectTerminologyBundle

const hoisted = vi.hoisted(() => ({
  createTerminologyBundleArchives: vi.fn<CreateTerminologyBundleArchives>(),
  fetchTerminologyBundles: vi.fn<FetchTerminologyBundles>(),
  importTerminologyBundle: vi.fn<ImportTerminologyBundle>(),
  selectTerminologyBundle: vi.fn<SelectTerminologyBundle>()
}))

vi.mock('@/api/terminologyApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/terminologyApi')>()
  return {
    ...original,
    createTerminologyBundleArchives: hoisted.createTerminologyBundleArchives,
    fetchTerminologyBundles: hoisted.fetchTerminologyBundles,
    importTerminologyBundle: hoisted.importTerminologyBundle,
    selectTerminologyBundle: hoisted.selectTerminologyBundle
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

  it('imports package ZIPs sequentially without activating the imported bundles', async () => {
    const first = new File(['first'], 'first.zip', { type: 'application/zip' })
    const broken = new File(['broken'], 'broken.zip', { type: 'application/zip' })
    const second = new File(['second'], 'second.zip', { type: 'application/zip' })
    hoisted.importTerminologyBundle
      .mockResolvedValueOnce({
        ok: true,
        revision: 'sha256:after-first',
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
        revision: 'sha256:after-second',
        imported: {
          moduleName: 'second',
          version: '2.0',
          medicalField: 'gastroenterology',
          isActive: true
        },
        counts: { findings: 2 }
      })
    hoisted.fetchTerminologyBundles.mockResolvedValue({
      revision: 'sha256:registry-after-imports',
      active: {
        moduleName: 'existing',
        version: '3.0',
        medicalField: 'gastroenterology',
        isActive: true
      },
      bundles: [
        {
          moduleName: 'existing',
          version: '3.0',
          medicalField: 'gastroenterology',
          isActive: true
        },
        {
          moduleName: 'first',
          version: '1.0',
          medicalField: 'gastroenterology',
          isActive: false
        },
        {
          moduleName: 'second',
          version: '2.0',
          medicalField: 'gastroenterology',
          isActive: false
        }
      ]
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
    expect(terminology.activeBundle).toEqual(
      expect.objectContaining({ moduleName: 'existing', version: '3.0', isActive: true })
    )
    expect(terminology.bundles.find((bundle) => bundle.moduleName === 'first')?.isActive).toBe(
      false
    )
    expect(terminology.bundles.find((bundle) => bundle.moduleName === 'second')?.isActive).toBe(
      false
    )
    expect(terminology.registryRevision).toBe('sha256:registry-after-imports')
    expect(terminology.error).toContain('broken.zip: Ungültiges Paket.')
  })

  it('creates and imports one archive per package directory', async () => {
    const selectedFiles = [new File(['config'], 'config.yaml')]
    const archives = [
      new File(['first'], 'first.zip', { type: 'application/zip' }),
      new File(['second'], 'second.zip', { type: 'application/zip' })
    ]
    hoisted.createTerminologyBundleArchives.mockResolvedValue(archives)
    hoisted.importTerminologyBundle.mockImplementation((file: File) =>
      Promise.resolve({
        ok: true,
        revision: `sha256:${file.name}`,
        imported: {
          moduleName: file.name.replace('.zip', ''),
          version: '1.0',
          medicalField: 'gastroenterology',
          isActive: true
        },
        counts: {}
      })
    )
    hoisted.fetchTerminologyBundles.mockResolvedValue({
      revision: 'sha256:after-folder-import',
      active: null,
      bundles: []
    })
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

  it('uses the registry revision for selection and reloads after a conflict', async () => {
    const original = {
      moduleName: 'original',
      version: '1.0',
      medicalField: 'gastroenterology' as const,
      isActive: true
    }
    const concurrent = {
      moduleName: 'concurrent',
      version: '2.0',
      medicalField: 'gastroenterology' as const,
      isActive: true
    }
    hoisted.fetchTerminologyBundles
      .mockResolvedValueOnce({
        revision: 'sha256:revision-one',
        active: original,
        bundles: [original, { ...concurrent, isActive: false }]
      })
      .mockResolvedValueOnce({
        revision: 'sha256:revision-two',
        active: concurrent,
        bundles: [{ ...original, isActive: false }, concurrent]
      })
    hoisted.selectTerminologyBundle.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'Revision mismatch.' } }
    })
    const terminology = useTerminologyStore()
    await terminology.loadBundles()

    await expect(
      terminology.selectBundle({ moduleName: 'requested', version: '3.0' })
    ).rejects.toMatchObject({ response: { status: 409 } })

    expect(hoisted.selectTerminologyBundle).toHaveBeenCalledWith({
      moduleName: 'requested',
      version: '3.0',
      expectedRevision: 'sha256:revision-one'
    })
    expect(terminology.registryRevision).toBe('sha256:revision-two')
    expect(terminology.activeBundle).toEqual(concurrent)
    expect(terminology.error).toContain('zwischenzeitlich geändert')
  })
})
