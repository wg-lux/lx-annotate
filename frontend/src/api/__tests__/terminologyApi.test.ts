import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'

import { createTerminologyBundleArchive } from '@/api/terminologyApi'

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.readAsArrayBuffer(file)
  })
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

    expect(strFromU8(entries['custom_terminology/config.yaml'])).toContain(
      'name: custom_terminology'
    )
    expect(strFromU8(entries['custom_terminology/findings/finding_a.yaml'])).toContain(
      'name: finding_a'
    )
  })

  it('rejects an empty directory selection', async () => {
    await expect(createTerminologyBundleArchive([])).rejects.toThrow(
      'Der ausgewählte Ordner enthält keine Dateien.'
    )
  })
})
