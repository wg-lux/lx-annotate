import axiosInstance, { dtypesApi } from './axiosInstance'
import type { ReportTemplateRuntimePayload } from '@/types/reportTemplate'

export type ReportingIndicationValidationContext = {
  examinationId: number
  patientExaminationId: number
  indications: ReadonlyArray<{
    examinationIndicationId: number | null
    indicationChoiceId: number | null
  }>
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Der Indikationskatalog enthält einen ungültigen Eintrag.')
  }
  return value as Record<string, unknown>
}

function name(value: Record<string, unknown>): string {
  if (typeof value.name !== 'string' || !value.name.trim()) {
    throw new Error('Im Indikationskatalog fehlt ein kanonischer Name.')
  }
  return value.name
}

function resolveChoice(indication: Record<string, unknown>, choiceId: number) {
  const matches: Array<{ classification: string; classificationChoice: string }> = []
  const classifications = indication.classifications
  if (Array.isArray(classifications)) {
    for (const raw of classifications) {
      const classification = record(raw)
      const choices =
        classification.choices ??
        classification.classificationChoices ??
        classification.classification_choices
      if (!Array.isArray(choices)) continue
      for (const rawChoice of choices) {
        const choice = record(rawChoice)
        if (choice.id === choiceId) {
          matches.push({ classification: name(classification), classificationChoice: name(choice) })
        }
      }
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      'Die gewählte Indikationsauswahl kann im versionierten Katalog nicht eindeutig aufgelöst werden. Bitte die Indikationsauswahl prüfen.'
    )
  }
  return matches
}

export async function resolveValidationIndications(
  context: ReportingIndicationValidationContext,
  moduleName: string,
  moduleVersion: string
): Promise<NonNullable<ReportTemplateRuntimePayload['patientIndications']>> {
  const selected = context.indications.filter((row) => row.examinationIndicationId !== null)
  if (
    context.indications.some(
      (row) => row.examinationIndicationId === null && row.indicationChoiceId !== null
    )
  ) {
    throw new Error('Bitte zuerst eine Untersuchungsindikation auswählen.')
  }
  if (!selected.length) return []
  const response = await axiosInstance.get<unknown>(
    dtypesApi(`examinations/${String(context.examinationId)}/indications/`),
    {
      params: {
        module_name: moduleName,
        module_version: moduleVersion,
        patient_examination_id: context.patientExaminationId
      }
    }
  )
  if (!Array.isArray(response.data)) throw new Error('Der Indikationskatalog ist ungültig.')
  const catalog = response.data.map(record)
  return selected.map((row) => {
    const matches = catalog.filter((item) => item.id === row.examinationIndicationId)
    if (matches.length !== 1) {
      throw new Error(
        'Die gewählte Indikation ist für diese Untersuchung und Terminologieversion nicht verfügbar.'
      )
    }
    return {
      indication: name(matches[0]),
      classifications:
        row.indicationChoiceId === null ? [] : resolveChoice(matches[0], row.indicationChoiceId)
    }
  })
}
