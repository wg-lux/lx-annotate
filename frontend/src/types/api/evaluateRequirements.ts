export interface EvaluateRequirementsItem {
  requirement_set_id: number | null;
  requirement_set_name: string;
  requirement_name: string;
  met: boolean;
  details: string;         // already normalized to string by backend
  error: string | null;    // per-item error if evaluation failed
}

export interface EvaluateRequirementsMeta {
  patientExaminationId: number | null;
  setsEvaluated: number;
  requirementsEvaluated: number;
  status: 'ok' | 'partial' | 'failed';
}

export interface EvaluateRequirementsResponse {
  ok: boolean;                  // false if any errors occurred
  errors: string[];             // high-level problems (validation / data)
  meta: EvaluateRequirementsMeta;
  results: EvaluateRequirementsItem[];
}
