export type ReportingDagNode<Context, Output = unknown> = Readonly<{
  id: string
  dependencies: readonly string[]
  run: (context: Context, inputs: ReportingDagInputs) => Output | Promise<Output>
}>

export type ReportingDagInputs = Readonly<{
  get: (nodeId: string) => unknown
  has: (nodeId: string) => boolean
}>

export type ImmutableReportingDag<Context> = Readonly<{
  nodes: readonly ReportingDagNode<Context>[]
  waves: readonly (readonly string[])[]
}>

export class ReportingDagStructureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReportingDagStructureError'
  }
}

export class SupersededReportingDagError extends Error {
  constructor() {
    super('Reporting DAG execution was superseded by a newer immutable context.')
    this.name = 'SupersededReportingDagError'
  }
}

function freezeNode<Context>(node: ReportingDagNode<Context>): ReportingDagNode<Context> {
  return Object.freeze({
    id: node.id,
    dependencies: Object.freeze([...node.dependencies]),
    run: node.run
  })
}

function planWaves<Context>(
  nodes: readonly ReportingDagNode<Context>[]
): readonly (readonly string[])[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  if (nodeById.size !== nodes.length) {
    throw new ReportingDagStructureError('Reporting DAG node IDs must be unique.')
  }

  const inDegree = new Map<string, number>()
  const outgoing = new Map<string, string[]>()
  for (const node of nodes) {
    inDegree.set(node.id, node.dependencies.length)
    outgoing.set(node.id, [])
    for (const dependency of node.dependencies) {
      if (!nodeById.has(dependency)) {
        throw new ReportingDagStructureError(
          `Reporting DAG node '${node.id}' depends on missing node '${dependency}'.`
        )
      }
      outgoing.get(dependency)?.push(node.id)
    }
  }

  let ready = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id)
  const waves: string[][] = []
  let visited = 0
  while (ready.length) {
    const wave = ready
    waves.push(Object.freeze([...wave]) as string[])
    visited += wave.length
    const nextReady = new Set<string>()
    for (const nodeId of wave) {
      for (const dependentId of outgoing.get(nodeId) || []) {
        const nextInDegree = (inDegree.get(dependentId) || 0) - 1
        inDegree.set(dependentId, nextInDegree)
        if (nextInDegree === 0) {
          nextReady.add(dependentId)
        }
      }
    }
    ready = nodes.filter((node) => nextReady.has(node.id)).map((node) => node.id)
  }

  if (visited !== nodes.length) {
    const cyclicNodes = nodes
      .filter((node) => (inDegree.get(node.id) || 0) > 0)
      .map((node) => node.id)
    throw new ReportingDagStructureError(
      `Reporting DAG contains a cycle involving: ${cyclicNodes.join(', ')}.`
    )
  }
  return Object.freeze(waves.map((wave) => Object.freeze([...wave])))
}

export function createImmutableReportingDag<Context>(
  nodes: readonly ReportingDagNode<Context>[]
): ImmutableReportingDag<Context> {
  if (!nodes.length) {
    throw new ReportingDagStructureError('Reporting DAG must contain at least one node.')
  }
  const frozenNodes = Object.freeze(nodes.map((node) => freezeNode(node)))
  return Object.freeze({ nodes: frozenNodes, waves: planWaves(frozenNodes) })
}

export async function executeReportingDag<Context>(params: {
  graph: ImmutableReportingDag<Context>
  context: Context
  isCurrent: () => boolean
}): Promise<ReadonlyMap<string, unknown>> {
  const { graph, context, isCurrent } = params
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const outputs = new Map<string, unknown>()

  for (const wave of graph.waves) {
    if (!isCurrent()) {
      throw new SupersededReportingDagError()
    }
    const visibleOutputs = new Map(outputs)
    const inputs: ReportingDagInputs = Object.freeze({
      get: (nodeId: string): unknown => {
        if (!visibleOutputs.has(nodeId)) {
          throw new ReportingDagStructureError(
            `Reporting DAG output '${nodeId}' is unavailable in the current wave.`
          )
        }
        return visibleOutputs.get(nodeId)
      },
      has: (nodeId: string) => visibleOutputs.has(nodeId)
    })
    const completed = await Promise.all(
      wave.map(async (nodeId) => {
        const node = nodeById.get(nodeId)
        if (!node) {
          throw new ReportingDagStructureError(`Reporting DAG node '${nodeId}' is unavailable.`)
        }
        return [nodeId, await node.run(context, inputs)] as const
      })
    )
    if (!isCurrent()) {
      throw new SupersededReportingDagError()
    }
    for (const [nodeId, output] of completed) outputs.set(nodeId, output)
  }

  return outputs
}

export function commitReportingDagAtomically<Result>(params: {
  isCurrent: () => boolean
  result: Result
  commit: (result: Result) => void
}): void {
  if (!params.isCurrent()) {
    throw new SupersededReportingDagError()
  }
  params.commit(params.result)
}
