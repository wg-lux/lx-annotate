import { type Finding } from '@/api/findings.contract';
import type { ReportTemplateDefinitionValidationResult, ReportTemplatePayload, ReportTemplateRuntimePayload, ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate';
export declare function normalizeTemplatePayload(payload: unknown): ReportTemplatePayload | null;
export declare function fetchReportTemplateByName(moduleName: string, templateName: string): Promise<ReportTemplatePayload | null>;
export declare function fetchReportTemplatesByExamination(moduleName: string, examinationName: string): Promise<ReportTemplatePayload[]>;
export declare function normalizeDefinitionValidationResult(payload: unknown): ReportTemplateDefinitionValidationResult | null;
export declare function validateReportTemplateDefinition(moduleName: string, templateName: string): Promise<ReportTemplateDefinitionValidationResult>;
export declare function normalizeRuntimeValidationResult(payload: unknown): ReportTemplateRuntimeValidationResult | null;
export declare function validateReportTemplateRuntime(moduleName: string, templateName: string, payload: ReportTemplateRuntimePayload): Promise<ReportTemplateRuntimeValidationResult>;
export declare function validateReportTemplateRuntimeFromLedger(moduleName: string, templateName: string, patientExaminationId: number): Promise<ReportTemplateRuntimeValidationResult>;
export declare function validatePatientFindingsAgainstTemplate(params: {
    moduleName: string;
    templateName: string;
    patientExaminationId: number;
    getFindingById?: (findingId: number) => Finding | undefined;
}): Promise<ReportTemplateRuntimeValidationResult>;
export declare function buildReportTemplateRuntimePayload(params: {
    moduleName: string;
    patientExaminationId: number;
    examination: string;
    patient?: string;
    examiners?: string[];
    knowledgeBaseVersion?: string | null;
    getFindingById?: (findingId: number) => Finding | undefined;
}): Promise<ReportTemplateRuntimePayload>;
export declare function describeSectionTitle(sectionName: string): string;
