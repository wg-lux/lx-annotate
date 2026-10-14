import { describe, expect, it } from 'vitest'

import {
  formatGermanReportTimestamp,
  reportStatusLabel,
  reportVersionLabel
} from '../reportingPresentation'

describe('reportingPresentation', () => {
  it('uses concise German workflow labels instead of transport values', () => {
    expect(reportStatusLabel('draft')).toBe('Entwurf')
    expect(reportStatusLabel('final')).toBe('Abgeschlossen')
    expect(reportStatusLabel('queued')).toBe('Unbekannter Status')
    expect(reportStatusLabel(null)).toBe('Status nicht verfügbar')
  })

  it('formats report metadata for German readers', () => {
    expect(formatGermanReportTimestamp('2026-02-27T08:00:00Z')).toMatch(/27\.02\.2026/)
    expect(formatGermanReportTimestamp('invalid')).toBe('Ungültiges Datum')
    expect(reportVersionLabel(4)).toBe('Version 4')
    expect(reportVersionLabel(null)).toBe('Version nicht verfügbar')
  })
})
