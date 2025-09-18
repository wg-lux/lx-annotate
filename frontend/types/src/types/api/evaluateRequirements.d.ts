export interface EvaluateRequirementsItem {
    requirement_set_id: number | null;
    requirement_set_name: string;
    requirement_name: string;
    met: boolean;
    details: string;
    error: string | null;
}
export interface EvaluateRequirementsMeta {
    patientExaminationId: number | null;
    setsEvaluated: number;
    requirementsEvaluated: number;
    status: 'ok' | 'partial' | 'failed';
}
export interface EvaluateRequirementsResponse {
    ok: boolean;
    errors: string[];
    meta: EvaluateRequirementsMeta;
    results: EvaluateRequirementsItem[];
}
