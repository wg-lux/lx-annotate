import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'

import {
  createTerminologyBundleArchive,
  createTerminologyBundleArchives
} from '@/api/terminologyApi'

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => {
      reject(Object.assign(
        new Error(`Test konnte Datei nicht lesen: ${file.name}`),
        { cause: reader.error ?? undefined }
      ))
    }
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error(`Test erhielt ungültige Dateidaten: ${file.name}`))
        return
      }
      resolve(reader.result)
    }
    reader.readAsArrayBuffer(file)
  })
}

function requireArchiveEntry(
  entries: Partial<Record<string, Uint8Array>>,
  path: string
): Uint8Array {
  const entry = entries[path]
  if (entry === undefined) {
    throw new Error(`Archive entry was not created: ${path}`)
  }
  return entry
}

describe('terminologyApi folder import', () => {
  it('packages the selected directory in the terminology editor export layout', async () => {
    const config = new File(['name: custom_terminology\nversion: "1.0"\n'], 'config.yaml')
    const finding = new File(['name: finding_a\n'], 'finding_a.yaml')
    Object.defineProperty(config, 'webkitRelativePath', {
      value: 'custom_terminology/config.yaml'
    })
    Object.defineProperty(finding, 'webkitRelativePath', {
      value: 'custom_terminology/findings/finding_a.yaml'
    })

    const archive = await createTerminologyBundleArchive([config, finding])
    const entries = unzipSync(new Uint8Array(await readFile(archive)))

    expect(strFromU8(requireArchiveEntry(entries, 'custom_terminology/config.yaml'))).toContain(
      'name: custom_terminology'
    )
    expect(
      strFromU8(requireArchiveEntry(entries, 'custom_terminology/findings/finding_a.yaml'))
    ).toContain('name: finding_a')
  })

  it('rejects an empty directory selection', async () => {
    const rejection = expect(createTerminologyBundleArchive([])).rejects
    await rejection.toBeInstanceOf(Error)
    await rejection.toThrow('Die ausgewählten Verzeichnisse enthalten keine Dateien.')
  })

  it('packages every package directory in a selected collection separately', async () => {
    const firstConfig = new File(['name: first\nversion: "1.0"\n'], 'config.yaml')
    const firstFinding = new File(['name: first_finding\n'], 'finding.yaml')
    const secondConfig = new File(['name: second\nversion: "2.0"\n'], 'config.yaml')
    Object.defineProperty(firstConfig, 'webkitRelativePath', {
      value: 'published-packages/first/config.yaml'
    })
    Object.defineProperty(firstFinding, 'webkitRelativePath', {
      value: 'published-packages/first/findings/finding.yaml'
    })
    Object.defineProperty(secondConfig, 'webkitRelativePath', {
      value: 'published-packages/second/config.yaml'
    })

    const archives = await createTerminologyBundleArchives([
      firstConfig,
      firstFinding,
      secondConfig
    ])

    expect(archives.map((archive) => archive.name)).toEqual(['first.zip', 'second.zip'])
    const firstEntries = unzipSync(new Uint8Array(await readFile(archives[0])))
    const secondEntries = unzipSync(new Uint8Array(await readFile(archives[1])))
    expect(strFromU8(requireArchiveEntry(firstEntries, 'first/config.yaml'))).toContain(
      'name: first'
    )
    expect(
      strFromU8(requireArchiveEntry(firstEntries, 'first/findings/finding.yaml'))
    ).toContain('name: first_finding')
    expect(
      strFromU8(requireArchiveEntry(firstEntries, 'first/.dependencies/1-second/config.yaml'))
    ).toContain('name: second')
    expect(strFromU8(requireArchiveEntry(secondEntries, 'second/config.yaml'))).toContain(
      'name: second'
    )
    expect(
      strFromU8(requireArchiveEntry(secondEntries, 'second/.dependencies/0-first/config.yaml'))
    ).toContain('name: first')
  })

  it('rejects files outside recognized package directories', async () => {
    const config = new File(['name: first\nversion: "1.0"\n'], 'config.yaml')
    const unrelated = new File(['not a package'], 'README.md')
    Object.defineProperty(config, 'webkitRelativePath', {
      value: 'published-packages/first/config.yaml'
    })
    Object.defineProperty(unrelated, 'webkitRelativePath', {
      value: 'published-packages/README.md'
    })

    const rejection = expect(createTerminologyBundleArchives([config, unrelated])).rejects
    await rejection.toBeInstanceOf(Error)
    await rejection.toThrow('Dateien außerhalb erkannter Paketverzeichnisse')
  })

  it('rejects multi-file cloud selections without directory paths', async () => {
    const firstConfig = new File(['name: first'], 'config.yaml')
    const secondConfig = new File(['name: second'], 'config.yaml')

    await expect(createTerminologyBundleArchives([firstConfig, secondConfig])).rejects.toThrow(
      'Ordnerstruktur ist für diese Auswahl nicht verfügbar'
    )
  })

  it('uses unique archive names for equal package directory names', async () => {
    const firstConfig = new File(['name: first'], 'config.yaml')
    const secondConfig = new File(['name: second'], 'config.yaml')
    Object.defineProperty(firstConfig, 'webkitRelativePath', {
      value: 'team-a/common/config.yaml'
    })
    Object.defineProperty(secondConfig, 'webkitRelativePath', {
      value: 'team-b/common/config.yaml'
    })

    const archives = await createTerminologyBundleArchives([firstConfig, secondConfig])

    expect(archives.map((archive) => archive.name)).toEqual([
      'team-a--common.zip',
      'team-b--common.zip'
    ])
  })

  it('keeps nested module configs inside their outer package', async () => {
    const rootConfig = new File(['name: complete_package\nversion: "1.0"\n'], 'config.yaml')
    const childConfig = new File(['name: lx_units\nversion: "1.0"\n'], 'config.yaml')
    Object.defineProperty(rootConfig, 'webkitRelativePath', {
      value: 'complete_package/config.yaml'
    })
    Object.defineProperty(childConfig, 'webkitRelativePath', {
      value: 'complete_package/lx_units/config.yaml'
    })

    const archives = await createTerminologyBundleArchives([rootConfig, childConfig])
    const entries = unzipSync(new Uint8Array(await readFile(archives[0])))

    expect(archives).toHaveLength(1)
    expect(entries['complete_package/lx_units/config.yaml']).toBeDefined()
  })
})
