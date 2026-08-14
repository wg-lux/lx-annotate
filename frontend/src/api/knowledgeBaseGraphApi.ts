import axiosInstance, { dtypesApi } from '@/api/axiosInstance'
import { normalizeCoreConceptCollection } from '@/api/coreConcepts'
import { normalizeTemplatePayload } from '@/api/reportTemplatesApi'
import type { CoreConceptCollection } from '@/types/coreConcepts'
import {
  KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION,
  type ExaminationReportingContext,
  type KnowledgeBaseGraphEdge,
  type KnowledgeBaseGraphNodeKind,
  type KnowledgeBaseGraphNodeRef,
  type KnowledgeBaseGraphRelationship,
  type KnowledgeBaseGraphSnapshot,
  type KnowledgeBaseIdentity
} from '@/types/knowledgeBaseGraph'
import type { ReportTemplatePayload } from '@/types/reportTemplate'

const GRAPH_NODE_KINDS = new Set<KnowledgeBaseGraphNodeKind>([
  'classification',
  'classification_type',
  'classification_choice',
  'classification_choice_descriptor',
  'examination',
  'examination_type',
  'finding',
  'finding_type',
  'indication',
  'indication_type',
  'intervention',
  'intervention_type',
  'unit',
  'unit_type',
  'information_source',
  'information_source_type',
  'citation',
  'report_template'
])

const GRAPH_RELATIONSHIPS = new Set<KnowledgeBaseGraphRelationship>([
  'has_choice',
  'has_descriptor',
  'uses_unit',
  'has_finding',
  'has_indication',
  'has_classification',
  'supports_intervention',
  'caused_by_intervention',
  'is_type',
  'for_examination'
])

const SHA256_ID = /^sha256:[0-9a-f]{64}$/

const CONCEPT_COLLECTION_BY_KIND = {
  classification: 'classification',
  classification_type: 'classificationType',
  classification_choice: 'classificationChoice',
  classification_choice_descriptor: 'classificationChoiceDescriptor',
  examination: 'examination',
  examination_type: 'examinationType',
  finding: 'finding',
  finding_type: 'findingType',
  indication: 'indication',
  indication_type: 'indicationType',
  intervention: 'intervention',
  intervention_type: 'interventionType',
  unit: 'unit',
  unit_type: 'unitType',
  information_source: 'informationSource',
  information_source_type: 'informationSourceType',
  citation: 'citation'
} as const satisfies Partial<Record<KnowledgeBaseGraphNodeKind, keyof CoreConceptCollection>>

const CONCEPT_TRANSPORT_FIELDS = {
  classification: 'classification',
  classification_type: 'classificationType',
  classification_choice: 'classificationChoice',
  classification_choice_descriptor: 'classificationChoiceDescriptor',
  examination: 'examination',
  examination_type: 'examinationType',
  finding: 'finding',
  finding_type: 'findingType',
  indication: 'indication',
  indication_type: 'indicationType',
  intervention: 'intervention',
  intervention_type: 'interventionType',
  unit: 'unit',
  unit_type: 'unitType',
  information_source: 'informationSource',
  information_source_type: 'informationSourceType',
  citation: 'citation'
} as const

function requireRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object.`)
  }
  return value as Record<string, unknown>
}

function field(record: Record<string, unknown>, camel: string, snake: string): unknown {
  return record[camel] ?? record[snake]
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${fieldName} must be a non-empty string.`)
  }
  return value.trim()
}

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`)
  return value.map((entry, index) => requireString(entry, `${fieldName}[${String(index)}]`))
}

function requireArray(value: unknown, fieldName: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${fieldName} must be an array.`)
  return value
}

function requireHash(value: unknown, fieldName: string): string {
  const hash = requireString(value, fieldName)
  if (!SHA256_ID.test(hash)) throw new TypeError(`${fieldName} must be a sha256 identifier.`)
  return hash
}

function normalizeIdentity(value: unknown): KnowledgeBaseIdentity {
  const record = requireRecord(value, 'identity')
  const knowledgeBaseModule = requireString(
    field(record, 'knowledgeBaseModule', 'knowledge_base_module'),
    'identity.knowledgeBaseModule'
  )
  const knowledgeBaseVersion = requireString(
    field(record, 'knowledgeBaseVersion', 'knowledge_base_version'),
    'identity.knowledgeBaseVersion'
  )
  if (knowledgeBaseModule.includes('@') || knowledgeBaseVersion.includes('@')) {
    throw new TypeError('Knowledge-base identity segments must not contain "@".')
  }
  return { knowledgeBaseModule, knowledgeBaseVersion }
}

function normalizeNodeRef(value: unknown, fieldName: string): KnowledgeBaseGraphNodeRef {
  const record = requireRecord(value, fieldName)
  const kind = requireString(record.kind, `${fieldName}.kind`)
  if (!GRAPH_NODE_KINDS.has(kind as KnowledgeBaseGraphNodeKind)) {
    throw new TypeError(`${fieldName}.kind contains unsupported graph node kind "${kind}".`)
  }
  return {
    kind: kind as KnowledgeBaseGraphNodeKind,
    name: requireString(record.name, `${fieldName}.name`)
  }
}

function normalizeEdges(value: unknown): KnowledgeBaseGraphEdge[] {
  const edges = requireArray(value, 'edges').map((entry, index) => {
    const record = requireRecord(entry, `edges[${String(index)}]`)
    const relationship = requireString(record.relationship, `edges[${String(index)}].relationship`)
    if (!GRAPH_RELATIONSHIPS.has(relationship as KnowledgeBaseGraphRelationship)) {
      throw new TypeError(`Unsupported graph relationship "${relationship}".`)
    }
    return {
      source: normalizeNodeRef(record.source, `edges[${String(index)}].source`),
      relationship: relationship as KnowledgeBaseGraphRelationship,
      target: normalizeNodeRef(record.target, `edges[${String(index)}].target`)
    }
  })
  const keys = edges.map(
    (edge) =>
      `${edge.source.kind}:${edge.source.name}:${edge.relationship}:${edge.target.kind}:${edge.target.name}`
  )
  if (new Set(keys).size !== keys.length) throw new TypeError('Graph edges must be unique.')
  return edges
}

function normalizeConcepts(value: unknown, identity: KnowledgeBaseIdentity): CoreConceptCollection {
  const rawConcepts = requireRecord(value, 'concepts')
  for (const [snakeName, camelName] of Object.entries(CONCEPT_TRANSPORT_FIELDS)) {
    const records = requireArray(field(rawConcepts, camelName, snakeName), `concepts.${camelName}`)
    records.forEach((record, index) => {
      const concept = requireRecord(record, `concepts.${camelName}[${String(index)}]`)
      requireString(concept.name, `concepts.${camelName}[${String(index)}].name`)
    })
  }
  const concepts = normalizeCoreConceptCollection(value)
  if (
    concepts.knowledgeBaseModule !== identity.knowledgeBaseModule ||
    concepts.knowledgeBaseVersion !== identity.knowledgeBaseVersion
  ) {
    throw new TypeError('Concept collection identity does not match graph identity.')
  }
  for (const [kind, collectionName] of Object.entries(CONCEPT_COLLECTION_BY_KIND)) {
    const records = concepts[collectionName as keyof typeof concepts]
    if (!Array.isArray(records)) continue
    const names = records.map((record) => requireString(record.name, `${kind}.name`))
    if (new Set(names).size !== names.length) {
      throw new TypeError(`Concept collection ${kind} contains duplicate semantic names.`)
    }
  }
  return concepts
}

function normalizeTemplates(
  value: unknown,
  identity: KnowledgeBaseIdentity,
  examinationName?: string
): ReportTemplatePayload[] {
  return requireArray(value, 'reportTemplates').map((entry, index) => {
    const record = requireRecord(entry, `reportTemplates[${String(index)}]`)
    const name = requireString(record.name, `reportTemplates[${String(index)}].name`)
    const examination = requireString(
      record.examination,
      `reportTemplates[${String(index)}].examination`
    )
    const templateVersion = requireString(
      record.version,
      `reportTemplates[${String(index)}].version`
    )
    const lifecycleStatus = requireString(
      field(record, 'lifecycleStatus', 'lifecycle_status'),
      `reportTemplates[${String(index)}].lifecycleStatus`
    )
    if (lifecycleStatus !== 'published') {
      throw new TypeError(`Graph template "${name}" is not published.`)
    }
    if (examinationName && examination !== examinationName) {
      throw new TypeError(`Graph template "${name}" belongs to another examination.`)
    }
    const normalized = normalizeTemplatePayload({
      ...record,
      knowledgeBaseModule: identity.knowledgeBaseModule,
      knowledgeBaseVersion: identity.knowledgeBaseVersion,
      templateVersion,
      lifecycleStatus
    })
    if (!normalized) throw new TypeError(`Graph template "${name}" is malformed.`)
    return normalized
  })
}

function validateEdgeTargets(
  concepts: CoreConceptCollection,
  templates: ReportTemplatePayload[],
  edges: KnowledgeBaseGraphEdge[]
): void {
  const nodes = new Set<string>()
  for (const [kind, collectionName] of Object.entries(CONCEPT_COLLECTION_BY_KIND)) {
    const records = concepts[collectionName as keyof typeof concepts]
    if (!Array.isArray(records)) continue
    for (const record of records) nodes.add(`${kind}:${record.name}`)
  }
  for (const template of templates) nodes.add(`report_template:${template.name}`)
  for (const edge of edges) {
    for (const node of [edge.source, edge.target]) {
      if (!nodes.has(`${node.kind}:${node.name}`)) {
        throw new TypeError(`Graph edge references missing node ${node.kind}:${node.name}.`)
      }
    }
  }
}

function normalizeContractVersion(record: Record<string, unknown>): void {
  const version = field(record, 'contractVersion', 'contract_version')
  if (version !== KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION) {
    throw new TypeError(`Unsupported knowledge-base graph contract version: ${String(version)}.`)
  }
}

export function normalizeKnowledgeBaseGraphSnapshot(value: unknown): KnowledgeBaseGraphSnapshot {
  const record = requireRecord(value, 'knowledge-base graph')
  normalizeContractVersion(record)
  const identity = normalizeIdentity(record.identity)
  const concepts = normalizeConcepts(record.concepts, identity)
  const reportTemplates = normalizeTemplates(
    field(record, 'reportTemplates', 'report_templates'),
    identity
  )
  const edges = normalizeEdges(record.edges)
  validateEdgeTargets(concepts, reportTemplates, edges)
  return {
    contractVersion: KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION,
    identity,
    snapshotId: requireHash(field(record, 'snapshotId', 'snapshot_id'), 'snapshotId'),
    declaringModules: requireStringArray(
      field(record, 'declaringModules', 'declaring_modules'),
      'declaringModules'
    ),
    concepts,
    reportTemplates,
    edges
  }
}

export function normalizeExaminationReportingContext(value: unknown): ExaminationReportingContext {
  const record = requireRecord(value, 'examination reporting context')
  normalizeContractVersion(record)
  const identity = normalizeIdentity(record.identity)
  const examinationName = requireString(
    field(record, 'examinationName', 'examination_name'),
    'examinationName'
  )
  const concepts = normalizeConcepts(record.concepts, identity)
  if (concepts.examination.length !== 1 || concepts.examination[0]?.name !== examinationName) {
    throw new TypeError('Reporting context must contain exactly its requested examination.')
  }
  const reportTemplates = normalizeTemplates(
    field(record, 'reportTemplates', 'report_templates'),
    identity,
    examinationName
  )
  const edges = normalizeEdges(record.edges)
  validateEdgeTargets(concepts, reportTemplates, edges)
  return {
    contractVersion: KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION,
    identity,
    graphSnapshotId: requireHash(
      field(record, 'graphSnapshotId', 'graph_snapshot_id'),
      'graphSnapshotId'
    ),
    contextId: requireHash(field(record, 'contextId', 'context_id'), 'contextId'),
    examinationName,
    concepts,
    reportTemplates,
    edges
  }
}

function graphBasePath(moduleName: string, version: string): string {
  return dtypesApi(
    `knowledge-bases/${encodeURIComponent(moduleName)}/${encodeURIComponent(version)}`
  )
}

export async function fetchKnowledgeBaseGraphSnapshot(
  moduleName: string,
  version: string
): Promise<KnowledgeBaseGraphSnapshot> {
  const response = await axiosInstance.get(`${graphBasePath(moduleName, version)}/graph`)
  const snapshot = normalizeKnowledgeBaseGraphSnapshot(response.data)
  if (
    snapshot.identity.knowledgeBaseModule !== moduleName ||
    snapshot.identity.knowledgeBaseVersion !== version
  ) {
    throw new TypeError('Graph response identity does not match the requested knowledge base.')
  }
  return snapshot
}

export async function fetchExaminationReportingContext(
  moduleName: string,
  version: string,
  examinationName: string
): Promise<ExaminationReportingContext> {
  const response = await axiosInstance.get(
    `${graphBasePath(moduleName, version)}/examinations/${encodeURIComponent(examinationName)}/reporting-context`
  )
  const context = normalizeExaminationReportingContext(response.data)
  if (
    context.identity.knowledgeBaseModule !== moduleName ||
    context.identity.knowledgeBaseVersion !== version ||
    context.examinationName !== examinationName
  ) {
    throw new TypeError('Reporting-context response identity does not match the request.')
  }
  return context
}
