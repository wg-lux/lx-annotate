import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate';
export type ReportDraftBlob = {
    module_name?: string;
    template_name?: string;
    payload?: unknown;
};
export type ReportDraftResponse = {
    patient_examination_id: number;
    draft: ReportDraftBlob;
    updated_at: string | null;
};
export declare function fetchPatientExaminationDraft(patientExaminationId: number): Promise<ReportDraftResponse>;
export declare function savePatientExaminationDraft(params: {
    patientExaminationId: number;
    moduleName: string;
    templateName: string | null;
    payload: ReportTemplateRuntimePayload;
}): Promise<ReportDraftResponse>;
