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
export type ReportTemplatePayload = {
    name: string;
    examination: string;
    reportSections: ReportTemplateSection[];
    validators: {
        examinationValidators: Array<Record<string, unknown> | string>;
        findingsValidators: Array<Record<string, unknown> | string>;
    };
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
