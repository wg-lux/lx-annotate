export type ReportTemplateClassificationDescriptorInput = {
  name: string
  type: 'numeric' | 'text' | 'boolean' | 'selection' | string
  unit: string | null
  unitAbbreviation: string | null
  numericMin: number | null
  numericMax: number | null
}

export type ReportTemplateClassificationChoiceInput = {
  name: string
  descriptors: ReportTemplateClassificationDescriptorInput[]
}

export type ReportTemplateClassification = {
  classification: string
  required: boolean
  input?: {
    choices: ReportTemplateClassificationChoiceInput[]
  } | null
}

export type ReportTemplateFinding = {
  finding: string
  required: boolean
  multipleAllowed: boolean
  applicability?: 'required' | 'optional' | 'conditional' | 'not_applicable'
  applicabilityRule?: string | null
  classifications: ReportTemplateClassification[]
}

export type ReportTemplateSection = {
  name: string
  position: number
  sectionKind: 'findings' | 'patient_data' | 'history'
  fields: ReportTemplateSectionField[]
  types: string[]
  findings: ReportTemplateFinding[]
}

export type ReportTemplateSectionField = {
  key: string
  required: boolean
  label: string | null
  source: 'patient' | 'patient_examination' | 'history' | null
}

export type ReportTemplateLifecycleStatus = 'draft' | 'published'

export type ReportTemplateReadiness = {
  canPublish: boolean | null
  blockingIssues: string[]
  warnings: string[]
  raw: Record<string, unknown>
}

export type ReportTemplateIdentity = {
  moduleName: string | null
  knowledgeBaseVersion: string | null
  templateVersion: string | null
  templateHash: string | null
  lifecycleStatus: ReportTemplateLifecycleStatus | null
  readiness: ReportTemplateReadiness | null
}

export type ReportConceptCoverageContractVersion = 'report_concept_coverage_v1'
export type ReportConceptApplicabilityStatus =
  | 'required'
  | 'conditional'
  | 'not_applicable'
  | 'unknown'
export type ReportConceptValidationStatus =
  | 'present'
  | 'missing'
  | 'invalid'
  | 'unknown'
  | 'undetermined'

export type ReportConceptCoverageIdentity = {
  moduleName: string
  moduleVersion: string
  moduleDigest: string
  templateName: string
  templateVersion: string
  templateDigest: string
}

export type ReportConceptCoverageProvenance = {
  resolver: string
  resolverVersion: string
  evidenceDigest: string
}

export type ReportConceptApplicability = {
  status: ReportConceptApplicabilityStatus
  rule: string | null
  reason: string | null
}

export type ReportConceptCoverageItem = {
  conceptId: string
  label: string
  applicability: ReportConceptApplicability
  validationStatus: ReportConceptValidationStatus
  evidencePath: string[]
}

export type ReportConceptCoverage = {
  contractVersion: ReportConceptCoverageContractVersion
  identity: ReportConceptCoverageIdentity
  provenance: ReportConceptCoverageProvenance
  concepts: ReportConceptCoverageItem[]
}

export type ReportTemplateCoverageState = 'valid' | 'missing' | 'invalid'

export type FindingsValidatorOperator = 'exists' | 'missing' | 'condition'

export type FindingsValidatorComparator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'

export type FindingsValidatorConditionClause = {
  classification: string
  comparator: FindingsValidatorComparator
  value?: unknown
  values?: unknown[]
}

export type FindingsValidatorCondition = {
  any: FindingsValidatorConditionClause[]
  all: FindingsValidatorConditionClause[]
  thenRequires: Array<{ classification: string }>
}

export type FindingsValidatorQuery = {
  finding: string | null
  operator: FindingsValidatorOperator | null
  params: Record<string, unknown>
  condition: FindingsValidatorCondition | null
}

export type ReportTemplateFindingValidator = {
  kind: 'finding'
  name: string
  finding: string
  operator: FindingsValidatorOperator
  query: FindingsValidatorQuery
  summary: string
  relatedSections: string[]
  relatedFindings: string[]
  requiredClassifications: string[]
}

export type ReportTemplateExaminationValidator = {
  kind: 'examination'
  name: string
  findingValidators: string[]
  examinationValidators: string[]
  summary: string
  relatedSections: string[]
  relatedFindings: string[]
}

export type ReportTemplateValidatorDescriptor =
  | ReportTemplateFindingValidator
  | ReportTemplateExaminationValidator

export type ReportTemplateValidators = {
  examinationValidators: ReportTemplateExaminationValidator[]
  findingsValidators: ReportTemplateFindingValidator[]
}

export type ReportTemplatePayload = {
  name: string
  examination: string
  identity: ReportTemplateIdentity
  reportSections: ReportTemplateSection[]
  validators: ReportTemplateValidators
  conceptCoverage: ReportConceptCoverage | null
  conceptCoverageState: ReportTemplateCoverageState
}

export type ReportTemplateSectionBlock = {
  name: string
  position: number
  title: string
  subtitle: string
  findings: ReportTemplateFinding[]
  requiredFindingsCount: number
  optionalFindingsCount: number
  requiredClassificationsCount: number
}

export type ReportTemplateSectionDraft = {
  note: string
  includePatientData: boolean
  includeExaminationData: boolean
}

export type RuntimeValidationIssue = {
  code: string
  level: 'error' | 'warning'
  message: string
  validatorName?: string
  validatorKind?:
    | 'classification_validator'
    | 'intervention_validator'
    | 'findings_validator'
    | 'examination_validator'
    | 'template'
    | 'unit_validator'
  details?: Record<string, unknown>
}

export type RuntimeValidatorDependencyStatus = {
  name: string
  ok: boolean
}

export type ReportTemplateGraphNode = {
  nodeId: string
  nodeType:
    | 'template'
    | 'section'
    | 'finding'
    | 'classification'
    | 'validator'
    | 'patient_field'
    | 'history_field'
  name: string
  tokens: string[]
}

export type ReportTemplateGraphEdge = {
  sourceNodeId: string
  targetNodeId: string
  edgeType:
    | 'template_to_section'
    | 'section_sequence'
    | 'section_to_finding'
    | 'section_to_patient_field'
    | 'section_to_history_field'
    | 'finding_to_classification'
    | 'template_to_validator'
  weight: number
}

export type ReportTemplateStructureGraph = {
  templateName: string
  examination: string
  startNodeId: string
  orderedSectionNodeIds: string[]
  nodes: ReportTemplateGraphNode[]
  edges: ReportTemplateGraphEdge[]
}

export type ReportTemplateStructureIssue = {
  code: string
  message: string
  level: 'error' | 'warning'
  nodeId: string | null
}

export type ReportTemplateDefinitionValidationResult = {
  templateName: string
  ok: boolean
  graph: ReportTemplateStructureGraph
  issues: ReportTemplateStructureIssue[]
}

export type FindingsValidatorExecution = {
  name: string
  ok: boolean
  operator: string
  finding: string
  matchedOccurrences: number
  triggeredOccurrences: number
  missingRequiredClassifications: string[]
  issues: RuntimeValidationIssue[]
}

export type ExaminationValidatorExecution = {
  name: string
  ok: boolean
  findingValidatorStatus: RuntimeValidatorDependencyStatus[]
  examinationValidatorStatus: RuntimeValidatorDependencyStatus[]
  issues: RuntimeValidationIssue[]
}

export type ClassificationValidatorExecution = {
  name: string
  ok: boolean
  operator: string
  finding: string
  classification: string
  precedence: 'required' | 'optional'
  matchedOccurrences: number
  triggeredOccurrences: number
  hint: Record<string, unknown>
  issues: RuntimeValidationIssue[]
}

export type InterventionValidatorExecution = {
  name: string
  ok: boolean
  operator: string
  finding: string
  intervention: string
  precedence: 'required' | 'optional'
  matchedOccurrences: number
  triggeredOccurrences: number
  hint: Record<string, unknown>
  issues: RuntimeValidationIssue[]
}

export type UnitValidatorExecution = {
  name: string
  ok: boolean
  operator: string
  finding: string
  classification: string
  unit: string
  precedence: 'required' | 'optional'
  matchedOccurrences: number
  triggeredOccurrences: number
  hint: Record<string, unknown>
  issues: RuntimeValidationIssue[]
}

export type ReportTemplateRuntimeValidationResult = {
  templateName: string
  ok: boolean
  evaluatedFindingsCount: number
  classificationValidators: ClassificationValidatorExecution[]
  interventionValidators: InterventionValidatorExecution[]
  findingsValidators: FindingsValidatorExecution[]
  examinationValidators: ExaminationValidatorExecution[]
  unitValidators: UnitValidatorExecution[]
  issues: RuntimeValidationIssue[]
}

export type ReportTemplateRuntimeValidationClassificationInput = {
  classification: string
  value?: unknown
  values?: unknown[]
  classificationChoice?: string
  choice?: string
}

export type ReportTemplateRuntimeValidationFindingInput = {
  finding: string
  classifications: ReportTemplateRuntimeValidationClassificationInput[]
}

export type ReportTemplateRuntimeDescriptorInput = {
  localId?: string
  classificationChoiceDescriptor: string
  descriptorValue: unknown
}

export type ReportTemplateRuntimeClassificationChoiceInput = {
  localId?: string
  classification: string
  classificationChoice: string
  descriptors: ReportTemplateRuntimeDescriptorInput[]
}

export type ReportTemplateRuntimePatientFindingInput = {
  localId?: string
  finding: string
  classificationChoices: ReportTemplateRuntimeClassificationChoiceInput[]
}

export type ReportTemplateRuntimePayload = {
  patient: string
  examiners: string[]
  date?: string | null
  examination: string
  knowledgeBaseModule?: string | null
  knowledgeBaseVersion?: string | null
  patientFindings: ReportTemplateRuntimePatientFindingInput[]
}
