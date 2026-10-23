import type { ReportTemplateRuntimeInterventionInput } from '@/types/reportTemplate'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isRuntimeIntervention(value: unknown): value is ReportTemplateRuntimeInterventionInput {
  return isRecord(value) &&
    typeof value.intervention === 'string' && value.intervention.trim().length > 0 &&
    (value.localId === undefined ||
      (typeof value.localId === 'string' && value.localId.trim().length > 0))
}

/** Upgrade legacy draft names only at hydration boundaries; retain invalid data for validation. */
export function migrateRuntimeInterventions(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.patientFindings)) return payload
  return {
    ...payload,
    patientFindings: payload.patientFindings.map((finding: unknown) => {
      if (!isRecord(finding) || !Array.isArray(finding.interventions)) return finding
      return {
        ...finding,
        interventions: finding.interventions.map((entry: unknown) =>
          typeof entry === 'string' ? { intervention: entry } : entry
        )
      }
    })
  }
}
