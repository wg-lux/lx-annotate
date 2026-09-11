import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import type { AxiosAdapter } from 'axios'
import { parse } from 'yaml'

const LIVE_MODULE_PATHS = {
  mst_3_0: '/home/admin/lx-data-models/lx_dtypes/data/mst_3_0',
  star_upper_gi: '/home/admin/lx-data-models/lx_dtypes/data/star_upper_gi',
  terminology: '/home/admin/lx-data-models/lx_dtypes/data/terminology'
} as const

const SHIPPED_FIXTURE_ROOT = resolve(process.cwd(), 'src/test-fixtures/knowledge-base')

const MODEL_TO_TRANSPORT_FIELD = {
  classification: 'classification',
  classification_type: 'classification_type',
  classification_choice: 'classification_choice',
  classification_choice_descriptor: 'classification_choice_descriptor',
  examination: 'examination',
  examination_type: 'examination_type',
  finding: 'finding',
  finding_type: 'finding_type',
  indication: 'indication',
  indication_type: 'indication_type',
  intervention: 'intervention',
  intervention_type: 'intervention_type',
  unit: 'unit',
  unit_type: 'unit_type',
  information_source: 'information_source',
  information_source_type: 'information_source_type',
  citation: 'citation'
} as const

const EXPLICITLY_EXCLUDED_MODELS = new Set([
  'examination_validator',
  'findings_validator',
  'report_finding',
  'report_template',
  'report_template_section'
])

type ModuleName = keyof typeof LIVE_MODULE_PATHS
type TransportField = (typeof MODEL_TO_TRANSPORT_FIELD)[keyof typeof MODEL_TO_TRANSPORT_FIELD]
type YamlRecord = Record<string, unknown> & { model: string; name: string }

export type RealYamlEndpointLoad = {
  moduleName: ModuleName
  source: 'live' | 'shipped'
  attemptedLivePath: string
  sourcePath: string
  loadedFiles: string[]
  excludedModelCounts: Record<string, number>
  liveLoadError?: string
}

export type RealYamlEndpointOptions = {
  sourcePreference?: 'live-first' | 'shipped-only'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function yamlFilesBelow(root: string): string[] {
  if (!existsSync(root)) {
    return []
  }
  return readdirSync(root)
    .flatMap((entry) => {
      const path = join(root, entry)
      return statSync(path).isDirectory() ? yamlFilesBelow(path) : [path]
    })
    .filter((path) => ['.yaml', '.yml'].includes(extname(path)))
    .sort()
}

export function requireYamlConceptRecords(yamlText: string, source: string): YamlRecord[] {
  let document: unknown
  try {
    document = parse(yamlText)
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : 'unknown YAML parser error'
    throw new TypeError(`${source} is not valid YAML: ${detail}`)
  }
  if (!Array.isArray(document)) {
    throw new TypeError(`${source} must contain a YAML array of concept records.`)
  }
  return document.map((value, index) => {
    if (!isRecord(value)) {
      throw new TypeError(`${source} record ${String(index)} must be an object.`)
    }
    if (typeof value.model !== 'string' || !value.model.trim()) {
      throw new TypeError(`${source} record ${String(index)} must define a model.`)
    }
    if (typeof value.name !== 'string' || !value.name.trim()) {
      throw new TypeError(`${source} record ${String(index)} must define a non-empty name.`)
    }
    return { ...value, model: value.model.trim(), name: value.name.trim() }
  })
}

function readConfigVersion(root: string, fallback: string): string {
  const configPath = join(root, 'config.yaml')
  if (!existsSync(configPath)) {
    return fallback
  }
  const config: unknown = parse(readFileSync(configPath, 'utf8'))
  if (!isRecord(config)) {
    return fallback
  }
  const version = config.version
  return typeof version === 'string' || typeof version === 'number' ? String(version) : fallback
}

function emptyTransportCollections(): Record<TransportField, YamlRecord[]> {
  return Object.fromEntries(
    Object.values(MODEL_TO_TRANSPORT_FIELD).map((field) => [field, []])
  ) as unknown as Record<TransportField, YamlRecord[]>
}

export function routeYamlConceptRecords(records: YamlRecord[], source: string) {
  const collections = emptyTransportCollections()
  const excludedModelCounts: Record<string, number> = {}
  for (const record of records) {
    if (Object.prototype.hasOwnProperty.call(MODEL_TO_TRANSPORT_FIELD, record.model)) {
      const field = MODEL_TO_TRANSPORT_FIELD[record.model as keyof typeof MODEL_TO_TRANSPORT_FIELD]
      collections[field].push(record)
      continue
    }
    if (EXPLICITLY_EXCLUDED_MODELS.has(record.model)) {
      excludedModelCounts[record.model] = (excludedModelCounts[record.model] ?? 0) + 1
      continue
    }
    throw new TypeError(`Unsupported YAML concept model "${record.model}" in ${source}.`)
  }
  return { collections, excludedModelCounts }
}

function payloadFromFiles(moduleName: ModuleName, files: string[], version: string) {
  const collections = emptyTransportCollections()
  const excludedModelCounts: Record<string, number> = {}

  for (const path of files) {
    const yamlText = readFileSync(path, 'utf8')
    let parsed: unknown
    try {
      parsed = parse(yamlText)
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown YAML parser error'
      throw new TypeError(`${path} is not valid YAML: ${detail}`)
    }
    if (!Array.isArray(parsed)) {
      continue
    }
    const records = requireYamlConceptRecords(yamlText, path)
    const routed = routeYamlConceptRecords(records, path)
    for (const field of Object.values(MODEL_TO_TRANSPORT_FIELD)) {
      collections[field].push(...routed.collections[field])
    }
    for (const [model, count] of Object.entries(routed.excludedModelCounts)) {
      excludedModelCounts[model] = (excludedModelCounts[model] ?? 0) + count
    }
  }

  return {
    payload: {
      module_name: moduleName,
      knowledge_base_module: moduleName,
      knowledge_base_version: version,
      ...collections
    },
    excludedModelCounts
  }
}

function isModuleName(value: string): value is ModuleName {
  return Object.prototype.hasOwnProperty.call(LIVE_MODULE_PATHS, value)
}

type FixtureGraphNodeKind = TransportField
type FixtureGraphRelationship =
  | 'has_choice'
  | 'has_descriptor'
  | 'uses_unit'
  | 'has_finding'
  | 'has_indication'
  | 'has_classification'
  | 'supports_intervention'
  | 'caused_by_intervention'
  | 'is_type'

function recordStringList(record: YamlRecord, field: string): string[] {
  const value = record[field]
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }
  return typeof value === 'string' && value.trim() ? [value.trim()] : []
}

function graphPayloadFromConceptPayload(
  payload: ReturnType<typeof payloadFromFiles>['payload']
): Record<string, unknown> {
  const nodes = new Set<string>()
  for (const kind of Object.values(MODEL_TO_TRANSPORT_FIELD)) {
    for (const record of payload[kind]) nodes.add(`${kind}:${record.name}`)
  }
  const edges: Array<Record<string, unknown>> = []
  const append = (
    sourceKind: FixtureGraphNodeKind,
    sourceName: string,
    relationship: FixtureGraphRelationship,
    targetKind: FixtureGraphNodeKind,
    targetNames: string[]
  ) => {
    for (const targetName of targetNames) {
      if (!nodes.has(`${targetKind}:${targetName}`)) {
        continue
      }
      edges.push({
        source: { kind: sourceKind, name: sourceName },
        relationship,
        target: { kind: targetKind, name: targetName }
      })
    }
  }

  for (const record of payload.classification) {
    append(
      'classification',
      record.name,
      'has_choice',
      'classification_choice',
      recordStringList(record, 'classification_choices')
    )
    append(
      'classification',
      record.name,
      'is_type',
      'classification_type',
      recordStringList(record, 'classification_types')
    )
  }
  for (const record of payload.classification_choice) {
    append(
      'classification_choice',
      record.name,
      'has_descriptor',
      'classification_choice_descriptor',
      recordStringList(record, 'classification_choice_descriptors')
    )
  }
  for (const record of payload.classification_choice_descriptor) {
    append(
      'classification_choice_descriptor',
      record.name,
      'uses_unit',
      'unit',
      recordStringList(record, 'unit')
    )
  }
  for (const record of payload.examination) {
    append(
      'examination',
      record.name,
      'has_finding',
      'finding',
      recordStringList(record, 'findings')
    )
    append(
      'examination',
      record.name,
      'has_indication',
      'indication',
      recordStringList(record, 'indications')
    )
    append(
      'examination',
      record.name,
      'is_type',
      'examination_type',
      recordStringList(record, 'examination_types')
    )
  }
  for (const record of payload.finding) {
    append(
      'finding',
      record.name,
      'is_type',
      'finding_type',
      recordStringList(record, 'finding_types')
    )
    append(
      'finding',
      record.name,
      'has_classification',
      'classification',
      recordStringList(record, 'classifications')
    )
    append(
      'finding',
      record.name,
      'supports_intervention',
      'intervention',
      recordStringList(record, 'interventions')
    )
    append(
      'finding',
      record.name,
      'caused_by_intervention',
      'intervention',
      recordStringList(record, 'caused_by_interventions')
    )
  }
  for (const record of payload.indication) {
    append(
      'indication',
      record.name,
      'is_type',
      'indication_type',
      recordStringList(record, 'indication_types')
    )
    append(
      'indication',
      record.name,
      'has_classification',
      'classification',
      recordStringList(record, 'classifications')
    )
    append(
      'indication',
      record.name,
      'supports_intervention',
      'intervention',
      recordStringList(record, 'interventions')
    )
  }
  for (const record of payload.intervention) {
    append(
      'intervention',
      record.name,
      'is_type',
      'intervention_type',
      recordStringList(record, 'intervention_types')
    )
  }
  for (const record of payload.unit) {
    append('unit', record.name, 'is_type', 'unit_type', recordStringList(record, 'unit_types'))
  }
  for (const record of payload.information_source) {
    append(
      'information_source',
      record.name,
      'is_type',
      'information_source_type',
      recordStringList(record, 'information_source_types')
    )
  }

  return {
    contract_version: 'knowledge_base_graph_v1',
    identity: {
      knowledge_base_module: payload.knowledge_base_module,
      knowledge_base_version: payload.knowledge_base_version
    },
    snapshot_id: `sha256:${'a'.repeat(64)}`,
    declaring_modules: [payload.knowledge_base_module],
    concepts: payload,
    report_templates: [],
    edges: edges.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  }
}

export function createRealYamlCoreConceptMockEndpoint(options: RealYamlEndpointOptions = {}): {
  adapter: AxiosAdapter
  loads: RealYamlEndpointLoad[]
} {
  const loads: RealYamlEndpointLoad[] = []
  const sourcePreference = options.sourcePreference ?? 'live-first'

  const adapter: AxiosAdapter = (config) => {
    const url = config.url || ''
    const coreConceptMatch = /\/dtypes-api\/core-concepts\/([^/?]+)/.exec(url)
    const graphMatch = /\/dtypes-api\/knowledge-bases\/([^/?]+)\/([^/?]+)\/graph(?:\?|$)/.exec(url)
    const requestedModuleSegment = coreConceptMatch?.[1] ?? graphMatch?.[1]
    const requestedModule = requestedModuleSegment ? decodeURIComponent(requestedModuleSegment) : ''
    if (!isModuleName(requestedModule)) {
      return Promise.resolve({
        data: { detail: `Unknown real-YAML mock module: ${requestedModule || '<missing>'}` },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config
      })
    }

    const livePath = LIVE_MODULE_PATHS[requestedModule]
    const shouldTryLive = sourcePreference === 'live-first' && existsSync(livePath)
    const fallbackVersion =
      requestedModule === 'mst_3_0'
        ? '3.0.0'
        : requestedModule === 'star_upper_gi'
          ? '0.1.1'
          : '0.1.0'
    let source: RealYamlEndpointLoad['source'] = 'shipped'
    let sourcePath = join(SHIPPED_FIXTURE_ROOT, `${requestedModule}.yml`)
    let files = [sourcePath]
    let liveLoadError: string | undefined
    let result: ReturnType<typeof payloadFromFiles> | undefined
    if (shouldTryLive) {
      try {
        source = 'live'
        sourcePath = livePath
        files = yamlFilesBelow(sourcePath)
        result = payloadFromFiles(
          requestedModule,
          files,
          readConfigVersion(sourcePath, fallbackVersion)
        )
      } catch (error: unknown) {
        liveLoadError = error instanceof Error ? error.message : 'unknown live YAML load error'
        source = 'shipped'
        sourcePath = join(SHIPPED_FIXTURE_ROOT, `${requestedModule}.yml`)
        files = [sourcePath]
      }
    }
    result ??= payloadFromFiles(requestedModule, files, fallbackVersion)
    const requestedVersion = graphMatch?.[2] ? decodeURIComponent(graphMatch[2]) : null
    if (requestedVersion && requestedVersion !== result.payload.knowledge_base_version) {
      return Promise.resolve({
        data: { detail: `Unknown mock version: ${requestedVersion}` },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config
      })
    }
    loads.push({
      moduleName: requestedModule,
      source,
      attemptedLivePath: livePath,
      sourcePath,
      loadedFiles: files.map((path) => basename(path)),
      excludedModelCounts: result.excludedModelCounts,
      ...(liveLoadError ? { liveLoadError } : {})
    })
    return Promise.resolve({
      data: graphMatch ? graphPayloadFromConceptPayload(result.payload) : result.payload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    })
  }

  return { adapter, loads }
}

export const realYamlLiveModulePaths = LIVE_MODULE_PATHS
export const realYamlModelToTransportField = MODEL_TO_TRANSPORT_FIELD
