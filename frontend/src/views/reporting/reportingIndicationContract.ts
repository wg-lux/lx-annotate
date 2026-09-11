import type { ReportingIndicationRow } from '@/stores/reportingFlowStore'

export type ReportingIndicationChoiceOption = {
  id: number
  label: string
}

export type ReportingIndicationOption = {
  id: number
  label: string
  choices: ReportingIndicationChoiceOption[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {})

const positiveInteger = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

const displayLabel = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const canonicalGermanLabel = (value: Record<string, unknown>): string | null =>
  displayLabel(
    value.label ?? value.nameDe ?? value.name_de ?? value.displayName ?? value.display_name ?? value.name
  )

const indicationIdFromRecord = (row: Record<string, unknown>): number | null =>
  positiveInteger(
    row.examinationIndicationId ??
      row.examination_indication_id ??
      row.indicationId ??
      row.indication_id ??
      row.id
  )

const choiceIdFromRecord = (row: Record<string, unknown>): number | null =>
  positiveInteger(
    row.indicationChoiceId ?? row.indication_choice_id ?? row.choiceId ?? row.choice_id ?? row.id
  )

function normalizeChoice(value: unknown): ReportingIndicationChoiceOption | null {
  if (!isRecord(value)) {
    return null
  }
  const choiceId = choiceIdFromRecord(value) ?? positiveInteger(value.value)
  const label = canonicalGermanLabel(value)
  if (choiceId === null || label === null) {
    return null
  }
  return {
    id: choiceId,
    label
  }
}

function normalizeChoices(value: unknown): ReportingIndicationChoiceOption[] {
  const candidates = Array.isArray(value) ? value : value === undefined ? [] : [value]
  const byId = new Map<number, ReportingIndicationChoiceOption>()
  for (const candidate of candidates) {
    const choice = normalizeChoice(candidate)
    if (choice) {
      byId.set(choice.id, choice)
    }
  }
  return Array.from(byId.values())
}

function choicesFromClassifications(value: unknown): ReportingIndicationChoiceOption[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.flatMap((entry) => {
    const classification = asRecord(entry)
    const nestedChoices = [
      ...normalizeChoices(classification.choices),
      ...normalizeChoices(classification.classificationChoices),
      ...normalizeChoices(classification.classification_choices)
    ]
    return nestedChoices.length ? nestedChoices : normalizeChoices(classification)
  })
}

function normalizeIndication(value: unknown): ReportingIndicationOption | null {
  if (!isRecord(value)) {
    return null
  }
  const indicationId = indicationIdFromRecord(value)
  const label = canonicalGermanLabel(value)
  if (indicationId === null || label === null) {
    return null
  }
  const choices = [
    ...normalizeChoices(value.choices),
    ...normalizeChoices(value.indicationChoices),
    ...normalizeChoices(value.indication_choices),
    ...choicesFromClassifications(value.classifications)
  ]
  return {
    id: indicationId,
    label,
    choices: Array.from(new Map(choices.map((choice) => [choice.id, choice])).values())
  }
}

function indicationCandidates(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }
  if (!isRecord(value)) {
    return []
  }
  if (indicationIdFromRecord(value) !== null) {
    return [value]
  }
  return Object.entries(value).map(([key, entry]) =>
    isRecord(entry) ? { ...entry, id: positiveInteger(key) } : { id: key, choices: entry }
  )
}

function mergeOption(
  optionsById: Map<number, ReportingIndicationOption>,
  option: ReportingIndicationOption
): void {
  const existing = optionsById.get(option.id)
  if (!existing) {
    optionsById.set(option.id, { ...option, choices: option.choices.slice() })
    return
  }
  const choicesById = new Map(existing.choices.map((choice) => [choice.id, choice]))
  for (const choice of option.choices) choicesById.set(choice.id, choice)
  existing.choices = Array.from(choicesById.values())
}

function appendLinkedChoices(
  optionsById: Map<number, ReportingIndicationOption>,
  value: unknown
): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!isRecord(entry)) {
        continue
      }
      const indicationId = positiveInteger(
        entry.examinationIndicationId ??
          entry.examination_indication_id ??
          entry.indicationId ??
          entry.indication_id
      )
      const choice = normalizeChoice(entry)
      const option = indicationId === null ? null : optionsById.get(indicationId)
      if (option && choice && !option.choices.some((candidate) => candidate.id === choice.id)) {
        option.choices.push(choice)
      }
    }
    return
  }
  if (!isRecord(value)) {
    return
  }
  for (const [rawIndicationId, rawChoices] of Object.entries(value)) {
    const indicationId = positiveInteger(rawIndicationId)
    const option = indicationId === null ? null : optionsById.get(indicationId)
    if (!option) {
      continue
    }
    for (const choice of normalizeChoices(rawChoices)) {
      if (!option.choices.some((candidate) => candidate.id === choice.id)) {
        option.choices.push(choice)
      }
    }
  }
}

function payloadRecords(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) {
    return []
  }
  const nested = isRecord(payload.examination) ? payload.examination : null
  return nested ? [payload, nested] : [payload]
}

export function normalizeReportingIndicationOptions(
  payloads: readonly unknown[]
): ReportingIndicationOption[] {
  const optionsById = new Map<number, ReportingIndicationOption>()
  for (const payload of payloads) {
    if (!Array.isArray(payload)) {
      continue
    }
    for (const entry of payload) {
      const option = normalizeIndication(entry)
      if (option) {
        mergeOption(optionsById, option)
      }
    }
  }
  const records = payloads.flatMap(payloadRecords)
  for (const record of records) {
    const candidates = [
      record.indications,
      record.examinationIndications,
      record.examination_indications,
      record.indicationOptions,
      record.indication_options,
      record.examinationIndicationOptions,
      record.examination_indication_options
    ]
    for (const candidate of candidates) {
      for (const entry of indicationCandidates(candidate)) {
        const option = normalizeIndication(entry)
        if (option) {
          mergeOption(optionsById, option)
        }
      }
    }
  }
  for (const record of records) {
    appendLinkedChoices(optionsById, record.indicationChoices)
    appendLinkedChoices(optionsById, record.indication_choices)
  }
  return Array.from(optionsById.values())
}

function selectionCandidates(payload: unknown): unknown[] {
  if (!isRecord(payload)) {
    return []
  }
  const nested = isRecord(payload.examination) ? payload.examination : null
  return [
    payload.indications,
    payload.examination_indications,
    payload.examinationIndications,
    nested?.indications,
    nested?.examination_indications,
    nested?.examinationIndications
  ]
}

export function normalizeReportingIndicationSelections(payload: unknown): ReportingIndicationRow[] {
  const rows: ReportingIndicationRow[] = []
  for (const candidate of selectionCandidates(payload)) {
    if (!Array.isArray(candidate)) {
      continue
    }
    for (const entry of candidate) {
      if (!isRecord(entry)) {
        continue
      }
      const examinationIndicationId = indicationIdFromRecord(entry)
      if (examinationIndicationId === null) {
        continue
      }
      const choice = asRecord(entry.choice)
      rows.push({
        examinationIndicationId,
        indicationChoiceId:
          positiveInteger(
            entry.indicationChoiceId ??
              entry.indication_choice_id ??
              entry.choiceId ??
              entry.choice_id ??
              choice.id
          ) ?? null
      })
    }
  }
  if (!rows.length) {
    return [{ examinationIndicationId: null, indicationChoiceId: null }]
  }
  const uniqueRows = new Map(
    rows.map((row) => [
      `${String(row.examinationIndicationId)}:${String(row.indicationChoiceId)}`,
      row
    ])
  )
  return Array.from(uniqueRows.values())
}
