import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { createHash, webcrypto } from 'node:crypto'
import { Blob, File } from 'node:buffer'
import { downloadTerminologyPackage } from '../terminologyPackageHost'

afterEach(() => vi.unstubAllGlobals())
beforeEach(() => {
  vi.stubGlobal('Blob', Blob)
  vi.stubGlobal('File', File)
})

describe('public terminology downloads', () => {
  it('downloads without credentials and verifies content before import', async () => {
    const bytes = new TextEncoder().encode('test package bytes')
    const digest = createHash('sha256').update(bytes).digest('hex')
    const fetcher = vi.fn().mockResolvedValue(new Response(bytes))
    vi.stubGlobal('fetch', fetcher)
    vi.stubGlobal('crypto', webcrypto)
    const file = await downloadTerminologyPackage(
      `https://terminology.example.org/packages/${digest}.zip`
    )
    expect(file.size).toBe(bytes.length)
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'omit', redirect: 'error' })
    )
  })

  it('rejects modified content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('wrong')))
    vi.stubGlobal('crypto', webcrypto)
    await expect(
      downloadTerminologyPackage(`https://terminology.example.org/packages/${'0'.repeat(64)}.zip`)
    ).rejects.toThrow('Prüfsumme')
  })

  it.each([
    'http://example.org/a.zip',
    'https://user:secret@example.org/a.zip',
    'https://example.org/a.zip'
  ])('rejects unsafe or unpinned URLs: %s', async (url) => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(downloadTerminologyPackage(url)).rejects.toThrow()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('reports missing packages', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(
      downloadTerminologyPackage(`https://terminology.example.org/packages/${'0'.repeat(64)}.zip`)
    ).rejects.toThrow('404')
  })
})
