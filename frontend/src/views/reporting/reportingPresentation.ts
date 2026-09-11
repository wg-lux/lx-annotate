export type ReportWorkflowStatus = string | null | undefined

export function reportStatusLabel(status: ReportWorkflowStatus): string {
  const normalized = status?.trim().toLowerCase()
  if (normalized === 'draft') {
    return 'Entwurf'
  }
  if (normalized === 'final') {
    return 'Abgeschlossen'
  }
  if (!normalized) {
    return 'Status nicht verfügbar'
  }
  return 'Unbekannter Status'
}

export function reportStatusBadgeClass(status: ReportWorkflowStatus): string {
  const normalized = status?.trim().toLowerCase()
  if (normalized === 'final') {
    return 'bg-success'
  }
  if (normalized === 'draft') {
    return 'bg-warning text-dark'
  }
  return 'bg-secondary'
}

export function formatGermanReportTimestamp(value?: string | null): string {
  if (!value) {
    return 'Nicht verfügbar'
  }
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return 'Ungültiges Datum'
  }
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(timestamp)
}

export function reportVersionLabel(version?: number | null): string {
  return typeof version === 'number' ? `Version ${String(version)}` : 'Version nicht verfügbar'
}
