export type ReportTemplateClassification = {
    classification: string;
    required: boolean;
};
export type ReportTemplateFinding = {
    finding: string;
    required: boolean;
    multipleAllowed: boolean;
    classifications: ReportTemplateClassification[];
};
export type ReportTemplateSection = {
    name: string;
    position: number;
    types: string[];
    findings: ReportTemplateFinding[];
};
export type FindingsValidatorOperator = 'exists' | 'missing' | 'conditional';
export type FindingsValidatorComparator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
export type FindingsValidatorConditionClause = {
    classification: string;
    comparator: FindingsValidatorComparator;
    value?: unknown;
    values?: unknown[];
};
export type FindingsValidatorCondition = {
    any: FindingsValidatorConditionClause[];
    all: FindingsValidatorConditionClause[];
    thenRequires: Array<{
        classification: string;
    }>;
};
export type FindingsValidatorQuery = {
    finding: string | null;
    operator: FindingsValidatorOperator | null;
    params: Record<string, unknown>;
    condition: FindingsValidatorCondition | null;
};
export type ReportTemplateFindingValidator = {
    kind: 'finding';
    name: string;
    finding: string;
    operator: FindingsValidatorOperator;
    query: FindingsValidatorQuery;
    summary: string;
    relatedSections: string[];
    relatedFindings: string[];
    requiredClassifications: string[];
};
export type ReportTemplateExaminationValidator = {
    kind: 'examination';
    name: string;
    findingValidators: string[];
    examinationValidators: string[];
    summary: string;
    relatedSections: string[];
    relatedFindings: string[];
};
export type ReportTemplateValidatorDescriptor = ReportTemplateFindingValidator | ReportTemplateExaminationValidator;
export type ReportTemplateValidators = {
    examinationValidators: ReportTemplateExaminationValidator[];
    findingsValidators: ReportTemplateFindingValidator[];
};
export type ReportTemplatePayload = {
    name: string;
    examination: string;
    reportSections: ReportTemplateSection[];
    validators: ReportTemplateValidators;
};
export type ReportTemplateSectionBlock = {
    name: string;
    position: number;
    title: string;
    subtitle: string;
    findings: ReportTemplateFinding[];
    requiredFindingsCount: number;
    optionalFindingsCount: number;
    requiredClassificationsCount: number;
};
export type ReportTemplateSectionDraft = {
    note: string;
    includePatientData: boolean;
    includeExaminationData: boolean;
};
export type RuntimeValidationIssue = {
    code: string;
    level: 'error' | 'warning';
    message: string;
    validatorName?: string;
    validatorKind?: 'findings_validator' | 'examination_validator' | 'template';
    details?: Record<string, unknown>;
};
export type RuntimeValidatorDependencyStatus = {
    name: string;
    ok: boolean;
};
export type FindingsValidatorExecution = {
    name: string;
    ok: boolean;
    operator: string;
    finding: string;
    matchedOccurrences: number;
    triggeredOccurrences: number;
    missingRequiredClassifications: string[];
    issues: RuntimeValidationIssue[];
};
export type ExaminationValidatorExecution = {
    name: string;
    ok: boolean;
    findingValidatorStatus: RuntimeValidatorDependencyStatus[];
    examinationValidatorStatus: RuntimeValidatorDependencyStatus[];
    issues: RuntimeValidationIssue[];
};
export type ReportTemplateRuntimeValidationResult = {
    templateName: string;
    ok: boolean;
    evaluatedFindingsCount: number;
    findingsValidators: FindingsValidatorExecution[];
    examinationValidators: ExaminationValidatorExecution[];
    issues: RuntimeValidationIssue[];
};
export type ReportTemplateRuntimeValidationClassificationInput = {
    classification: string;
    value?: unknown;
    values?: unknown[];
    classificationChoice?: string;
    choice?: string;
};
export type ReportTemplateRuntimeValidationFindingInput = {
    finding: string;
    classifications: ReportTemplateRuntimeValidationClassificationInput[];
};
