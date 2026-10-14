import type { CoreConceptCollection } from '@/types/coreConcepts'
import type { ReportTemplatePayload } from '@/types/reportTemplate'

export const KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION = 'knowledge_base_graph_v1' as const

export type KnowledgeBaseGraphNodeKind =
  | 'classification'
  | 'classification_type'
  | 'classification_choice'
  | 'classification_choice_descriptor'
  | 'examination'
  | 'examination_type'
  | 'finding'
  | 'finding_type'
  | 'indication'
  | 'indication_type'
  | 'intervention'
  | 'intervention_type'
  | 'unit'
  | 'unit_type'
  | 'information_source'
  | 'information_source_type'
  | 'citation'
  | 'report_template'

export type KnowledgeBaseGraphRelationship =
  | 'has_choice'
  | 'has_descriptor'
  | 'uses_unit'
  | 'has_finding'
  | 'has_indication'
  | 'has_classification'
  | 'supports_intervention'
  | 'caused_by_intervention'
  | 'is_type'
  | 'for_examination'

export type KnowledgeBaseIdentity = {
  knowledgeBaseModule: string
  knowledgeBaseVersion: string
}

export type KnowledgeBaseGraphNodeRef = {
  kind: KnowledgeBaseGraphNodeKind
  name: string
}

export type KnowledgeBaseGraphEdge = {
  source: KnowledgeBaseGraphNodeRef
  relationship: KnowledgeBaseGraphRelationship
  target: KnowledgeBaseGraphNodeRef
}

export type KnowledgeBaseGraphSnapshot = {
  contractVersion: typeof KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION
  identity: KnowledgeBaseIdentity
  snapshotId: string
  declaringModules: string[]
  concepts: CoreConceptCollection
  reportTemplates: ReportTemplatePayload[]
  edges: KnowledgeBaseGraphEdge[]
}

export type ExaminationReportingContext = {
  contractVersion: typeof KNOWLEDGE_BASE_GRAPH_CONTRACT_VERSION
  identity: KnowledgeBaseIdentity
  graphSnapshotId: string
  contextId: string
  examinationName: string
  concepts: CoreConceptCollection
  reportTemplates: ReportTemplatePayload[]
  edges: KnowledgeBaseGraphEdge[]
}
