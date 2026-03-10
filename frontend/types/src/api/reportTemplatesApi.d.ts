import { type Finding } from '@/api/findings.contract';
import type { ReportTemplatePayload, ReportTemplateRuntimeValidationFindingInput, ReportTemplateRuntimeValidationResult } from '@/types/reportTemplate';
export declare function normalizeTemplatePayload(payload: unknown): ReportTemplatePayload | null;
export declare function fetchReportTemplateByName(moduleName: string, templateName: string): Promise<ReportTemplatePayload | null>;
export declare function fetchReportTemplatesByExamination(moduleName: string, examinationName: string): Promise<ReportTemplatePayload[]>;
export declare function normalizeRuntimeValidationResult(payload: unknown): ReportTemplateRuntimeValidationResult | null;
export declare function validateReportTemplateRuntime(moduleName: string, templateName: string, findings: ReportTemplateRuntimeValidationFindingInput[]): Promise<ReportTemplateRuntimeValidationResult>;
export declare function validatePatientFindingsAgainstTemplate(params: {
    moduleName: string;
    templateName: string;
    patientExaminationId: number;
    getFindingById?: (findingId: number) => Finding | undefined;
}): Promise<ReportTemplateRuntimeValidationResult>;
export declare function describeSectionTitle(sectionName: string): string;
