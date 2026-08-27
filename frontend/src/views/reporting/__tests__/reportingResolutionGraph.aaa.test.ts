import { describe, expect, it, vi } from 'vitest'

import {
  ReportingDagStructureError,
  SupersededReportingDagError,
  commitReportingDagAtomically,
  createImmutableReportingDag,
  executeReportingDag
} from '../reportingResolutionGraph'

describe('reportingResolutionGraph AAA structural coverage', () => {
  it('rejects an empty graph before execution', () => {
    // Arrange
    const nodes: readonly [] = []

    // Act
    const create = () => createImmutableReportingDag(nodes)

    // Assert
    expect(create).toThrow(ReportingDagStructureError)
    expect(create).toThrow('at least one node')
  })

  it('rejects duplicate node IDs before either implementation runs', () => {
    // Arrange
    const first = vi.fn()
    const second = vi.fn()

    // Act
    const create = () =>
      createImmutableReportingDag([
        { id: 'detail', dependencies: [], run: first },
        { id: 'detail', dependencies: [], run: second }
      ])

    // Assert
    expect(create).toThrow('node IDs must be unique')
    expect(first).not.toHaveBeenCalled()
    expect(second).not.toHaveBeenCalled()
  })

  it('rejects a missing dependency before any side effect occurs', () => {
    // Arrange
    const run = vi.fn()

    // Act
    const create = () =>
      createImmutableReportingDag([{ id: 'templates', dependencies: ['detail'], run }])

    // Assert
    expect(create).toThrow("depends on missing node 'detail'")
    expect(run).not.toHaveBeenCalled()
  })

  it('freezes graph structure while passing the exact context to every wave', async () => {
    // Arrange
    const context = Object.freeze({ patientExaminationId: 314 })
    const childRun = vi.fn((received: typeof context, inputs: { has: (id: string) => boolean }) => ({
      received,
      hasDetail: inputs.has('detail'),
      hasUnknown: inputs.has('unknown')
    }))
    const graph = createImmutableReportingDag([
      { id: 'detail', dependencies: [], run: () => 'ready' },
      { id: 'child', dependencies: ['detail'], run: childRun }
    ])

    // Act
    const outputs = await executeReportingDag({ graph, context, isCurrent: () => true })

    // Assert
    expect(Object.isFrozen(graph)).toBe(true)
    expect(Object.isFrozen(graph.nodes)).toBe(true)
    expect(Object.isFrozen(graph.nodes[1])).toBe(true)
    expect(Object.isFrozen(graph.nodes[1]?.dependencies)).toBe(true)
    expect(Object.isFrozen(graph.waves)).toBe(true)
    expect(Object.isFrozen(graph.waves[0])).toBe(true)
    expect(childRun).toHaveBeenCalledWith(context, expect.any(Object))
    expect(outputs.get('child')).toEqual({ received: context, hasDetail: true, hasUnknown: false })
  })

  it('does not execute downstream waves after a dependency rejects', async () => {
    // Arrange
    const downstream = vi.fn()
    const failure = new Error('detail request failed')
    const graph = createImmutableReportingDag([
      { id: 'detail', dependencies: [], run: () => Promise.reject(failure) },
      { id: 'templates', dependencies: ['detail'], run: downstream }
    ])

    // Act
    const execution = executeReportingDag({ graph, context: null, isCurrent: () => true })

    // Assert
    await expect(execution).rejects.toBe(failure)
    expect(downstream).not.toHaveBeenCalled()
  })

  it('rejects a superseded evaluation before the first node runs', async () => {
    // Arrange
    const run = vi.fn()
    const graph = createImmutableReportingDag([{ id: 'detail', dependencies: [], run }])

    // Act
    const execution = executeReportingDag({ graph, context: null, isCurrent: () => false })

    // Assert
    await expect(execution).rejects.toBeInstanceOf(SupersededReportingDagError)
    expect(run).not.toHaveBeenCalled()
  })

  it('propagates a synchronous commit failure without attempting another commit', () => {
    // Arrange
    const failure = new Error('Pinia commit rejected')
    const commit = vi.fn(() => {
      throw failure
    })

    // Act
    const apply = () => {
      commitReportingDagAtomically({ isCurrent: () => true, result: 'ready', commit })
    }

    // Assert
    expect(apply).toThrow(failure)
    expect(commit).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenCalledWith('ready')
  })
})
