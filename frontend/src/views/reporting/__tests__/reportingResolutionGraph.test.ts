import { describe, expect, it, vi } from 'vitest'

import {
  ReportingDagStructureError,
  SupersededReportingDagError,
  commitReportingDagAtomically,
  createImmutableReportingDag,
  executeReportingDag
} from '../reportingResolutionGraph'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

describe('reportingResolutionGraph', () => {
  it('rejects cycles before any node executes', () => {
    const run = vi.fn()
    expect(() =>
      createImmutableReportingDag([
        { id: 'a', dependencies: ['b'], run },
        { id: 'b', dependencies: ['a'], run }
      ])
    ).toThrow(ReportingDagStructureError)
    expect(run).not.toHaveBeenCalled()
  })

  it('plans deterministic waves and runs independent nodes concurrently', async () => {
    const left = deferred<string>()
    const right = deferred<string>()
    const events: string[] = []
    const graph = createImmutableReportingDag([
      {
        id: 'root',
        dependencies: [],
        run: () => {
          events.push('root')
          return 'root-value'
        }
      },
      {
        id: 'left',
        dependencies: ['root'],
        run: async (_, inputs) => {
          events.push(`left:${String(inputs.get('root'))}`)
          return left.promise
        }
      },
      {
        id: 'right',
        dependencies: ['root'],
        run: async (_, inputs) => {
          events.push(`right:${String(inputs.get('root'))}`)
          return right.promise
        }
      },
      {
        id: 'join',
        dependencies: ['left', 'right'],
        run: (_, inputs) => `${String(inputs.get('left'))}:${String(inputs.get('right'))}`
      }
    ])

    expect(graph.waves).toEqual([['root'], ['left', 'right'], ['join']])
    const execution = executeReportingDag({ graph, context: null, isCurrent: () => true })
    await vi.waitFor(() => {
      expect(events).toEqual(['root', 'left:root-value', 'right:root-value'])
    })
    right.resolve('R')
    await Promise.resolve()
    expect(events).not.toContain('join')
    left.resolve('L')
    const outputs = await execution
    expect(outputs.get('join')).toBe('L:R')
  })

  it('does not expose outputs between nodes in the same wave', async () => {
    const graph = createImmutableReportingDag([
      { id: 'left', dependencies: [], run: () => 'left-value' },
      { id: 'right', dependencies: [], run: (_, inputs) => inputs.get('left') }
    ])
    await expect(
      executeReportingDag({ graph, context: null, isCurrent: () => true })
    ).rejects.toThrow(ReportingDagStructureError)
  })

  it('rejects a superseded context before committing a completed wave', async () => {
    const pending = deferred<string>()
    let current = true
    const graph = createImmutableReportingDag([
      { id: 'detail', dependencies: [], run: () => pending.promise }
    ])
    const execution = executeReportingDag({ graph, context: null, isCurrent: () => current })
    current = false
    pending.resolve('stale')
    await expect(execution).rejects.toBeInstanceOf(SupersededReportingDagError)
  })

  it('uses one synchronous current-context check for the final commit', () => {
    const commit = vi.fn()
    commitReportingDagAtomically({ isCurrent: () => true, result: 'ready', commit })
    expect(commit).toHaveBeenCalledWith('ready')

    expect(() => {
      commitReportingDagAtomically({
        isCurrent: () => false,
        result: 'stale',
        commit: (result) => {
          commit(result)
        }
      })
    }).toThrow(SupersededReportingDagError)
    expect(commit).toHaveBeenCalledTimes(1)
  })
})
