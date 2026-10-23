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
  if (!value) {
    return null
  }
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }
  return parsedDate.toISOString().split('T')[0] || null
}

function classificationSelection(
  item: number | PatientFindingApiClassification
): [number, number] | null {
  if (!item || typeof item === 'number') return null
  const classification = Number(item.classification ?? item.classificationId)
  const choice = Number(item.classificationChoice ?? item.classificationChoiceId)
  return Number.isFinite(classification) && Number.isFinite(choice)
    ? [classification, choice]
    : null
}

export function mergeClassificationSelections(
  findingId: number,
  apiClassifications: Array<number | PatientFindingApiClassification> | undefined,
  localSelectionsByFinding: Partial<Record<number, Record<number, number>>>
): Array<{ classification: number; classificationChoice: number }> {
  const merged = new Map<number, number>()

  for (const item of apiClassifications || []) {
    const selection = classificationSelection(item)
    if (selection) merged.set(...selection)
  }

  const localSelections = localSelectionsByFinding[findingId] ?? {}
  for (const [classificationId, choiceId] of Object.entries(localSelections)) {
    const numericClassificationId = Number(classificationId)
    if (Number.isFinite(numericClassificationId) && Number.isFinite(choiceId)) {
      merged.set(numericClassificationId, choiceId)
    }
  }

  return Array.from(merged.entries()).map(([classification, classificationChoice]) => ({
    classification,
    classificationChoice
  }))
}

type NormalizedIntervention = {
  intervention: number
  state?: string | null
  date?: string | null
  timeStart?: string | null
  timeEnd?: string | null
}

function normalizeIntervention(
  item: number | PatientFindingApiIntervention
): NormalizedIntervention | null {
  if (!item || typeof item === 'number') return null
  const intervention = Number(item.intervention ?? item.interventionId)
  if (!Number.isFinite(intervention)) return null
  return {
    intervention,
    state: item.state ?? null,
    date: item.date ?? null,
    timeStart: item.timeStart ?? null,
    timeEnd: item.timeEnd ?? null
  }
}

export function normalizeInterventions(
  apiInterventions: Array<number | PatientFindingApiIntervention> | undefined
): NormalizedIntervention[] {
  const result: NormalizedIntervention[] = []

  for (const item of apiInterventions || []) {
    const normalized = normalizeIntervention(item)
    if (normalized) result.push(normalized)
  }

  return result
}
