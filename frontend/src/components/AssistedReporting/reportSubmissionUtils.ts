export type PatientFindingApiClassification = {
  classification?: number
  classificationId?: number
  classificationChoice?: number
  classificationChoiceId?: number
}

export type PatientFindingApiIntervention = {
  intervention?: number
  interventionId?: number
  state?: string | null
  date?: string | null
  timeStart?: string | null
  timeEnd?: string | null
}

export function formatDateOnly(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().split('T')[0] || null
}

export function mergeClassificationSelections(
  findingId: number,
  apiClassifications: Array<number | PatientFindingApiClassification> | undefined,
  localSelectionsByFinding: Record<number, Record<number, number>>
): Array<{ classification: number; classificationChoice: number }> {
  const merged = new Map<number, number>()

  for (const item of apiClassifications || []) {
    if (!item || typeof item === 'number') continue
    const classification = Number(item.classification ?? item.classificationId)
    const classificationChoice = Number(
      item.classificationChoice ?? item.classificationChoiceId
    )
    if (Number.isFinite(classification) && Number.isFinite(classificationChoice)) {
      merged.set(classification, classificationChoice)
    }
  }

  const localSelections = localSelectionsByFinding[findingId] || {}
  for (const [classificationId, choiceId] of Object.entries(localSelections)) {
    const cId = Number(classificationId)
    if (Number.isFinite(cId) && Number.isFinite(choiceId)) {
      merged.set(cId, choiceId)
    }
  }

  return Array.from(merged.entries()).map(([classification, classificationChoice]) => ({
    classification,
    classificationChoice
  }))
}

export function normalizeInterventions(
  apiInterventions: Array<number | PatientFindingApiIntervention> | undefined
): Array<{
  intervention: number
  state?: string | null
  date?: string | null
  timeStart?: string | null
  timeEnd?: string | null
}> {
  const result: Array<{
    intervention: number
    state?: string | null
    date?: string | null
    timeStart?: string | null
    timeEnd?: string | null
  }> = []

  for (const item of apiInterventions || []) {
    if (!item || typeof item === 'number') continue
    const intervention = Number(item.intervention ?? item.interventionId)
    if (!Number.isFinite(intervention)) continue
    result.push({
      intervention,
      state: item.state ?? null,
      date: item.date ?? null,
      timeStart: item.timeStart ?? null,
      timeEnd: item.timeEnd ?? null
    })
  }

  return result
}
