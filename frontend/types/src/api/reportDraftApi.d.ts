import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate';
export type ReportDraftBlob = {
    moduleName?: string;
    module_name?: string;
    templateName?: string;
    template_name?: string;
    payload?: unknown;
};
export type ReportDraftResponse = {
    patientExaminationId?: number;
    patient_examination_id?: number;
    draft: ReportDraftBlob;
    updatedAt?: string | null;
    updated_at?: string | null;
};
export declare function fetchPatientExaminationDraft(patientExaminationId: number): Promise<ReportDraftResponse>;
export declare function savePatientExaminationDraft(params: {
    patientExaminationId: number;
    moduleName: string;
    templateName: string | null;
    payload: ReportTemplateRuntimePayload;
}): Promise<ReportDraftResponse>;
