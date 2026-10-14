import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_ROOT = resolve(process.cwd(), 'src')
const CENTRAL_API_BOUNDARY = resolve(SOURCE_ROOT, 'api/axiosInstance.ts')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.vue'])
const DIRECT_COMPATIBILITY_PREFIX = /(["'`])\/(?:api|base_api)\//g

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(path)
    }
    const extension = entry.name.slice(entry.name.lastIndexOf('.'))
    if (
      !SOURCE_EXTENSIONS.has(extension) ||
      entry.name.includes('.test.') ||
      entry.name.includes('.spec.')
    ) {
      return []
    }
    return [path]
  })
}

describe('API prefix contract', () => {
  it('keeps compatibility prefixes inside the central API boundary', () => {
    const violations = sourceFiles(SOURCE_ROOT)
      .filter((path) => path !== CENTRAL_API_BOUNDARY)
      .flatMap((path) => {
        const source = readFileSync(path, 'utf8')
        return Array.from(source.matchAll(DIRECT_COMPATIBILITY_PREFIX), (match) => {
          const line = source.slice(0, match.index).split('\n').length
          return `${relative(SOURCE_ROOT, path)}:${String(line)}:${match[0]}`
        })
      })

    expect(violations).toEqual([])
  })
})
