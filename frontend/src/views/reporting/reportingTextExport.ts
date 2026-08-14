export type ReportingTextExportInput = {
  firstName: string
  lastName: string
  dob: string
  examination: string
  templateName?: string | null
  status: string
  version?: number | null
  updatedAt?: string | null
  renderedText: string
}

const cleanInlineText = (value: string): string => value.replace(/\s+/g, ' ').trim()

const formatIsoDate = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  return match ? `${match[3]}.${match[2]}.${match[1]}` : cleanInlineText(value)
}

const formatTimestamp = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim())
  return match
    ? `${match[3]}.${match[2]}.${match[1]}, ${match[4]}:${match[5]} UTC`
    : cleanInlineText(value)
}

export function formatReportingTextDocument(input: ReportingTextExportInput): string {
  const body = input.renderedText.replace(/\r\n?/g, '\n').trim()
  const metadata = [
    `Patient: ${cleanInlineText(`${input.firstName} ${input.lastName}`)}`,
    `Geburtsdatum: ${formatIsoDate(input.dob)}`,
    `Untersuchung: ${cleanInlineText(input.examination) || 'Nicht angegeben'}`,
    ...(input.templateName ? [`Vorlage: ${cleanInlineText(input.templateName)}`] : []),
    `Status: ${cleanInlineText(input.status)}`,
    ...(input.version ? [`Version: ${String(input.version)}`] : []),
    ...(input.updatedAt ? [`Aktualisiert: ${formatTimestamp(input.updatedAt)}`] : [])
  ]

  return [
    'BEFUNDBERICHT',
    '==============',
    '',
    ...metadata,
    '',
    'BERICHTSTEXT',
    '-------------',
    '',
    body,
    ''
  ].join('\n')
}

export function reportingTextFilename(reportId: number): string {
  return `Befundbericht_${String(reportId)}.txt`
}
