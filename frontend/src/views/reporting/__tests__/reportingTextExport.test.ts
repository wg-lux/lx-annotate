import { describe, expect, it } from 'vitest'

import { formatReportingTextDocument, reportingTextFilename } from '../reportingTextExport'

describe('reportingTextExport', () => {
  it('formats clinical metadata and preserves the rendered report as plain text', () => {
    const document = formatReportingTextDocument({
      firstName: ' Ada ',
      lastName: 'Lovelace',
      dob: '1815-12-10',
      examination: 'Koloskopie',
      templateName: 'Standard Koloskopie',
      status: 'Final',
      version: 3,
      updatedAt: '2026-08-04T10:05:00Z',
      renderedText: 'Befund\r\n\r\nUnauffällige Schleimhaut.\r\n'
    })

    expect(document).toContain('BEFUNDBERICHT\n==============')
    expect(document).toContain('Patient: Ada Lovelace')
    expect(document).toContain('Geburtsdatum: 10.12.1815')
    expect(document).toContain('Untersuchung: Koloskopie')
    expect(document).toContain('Aktualisiert: 04.08.2026, 10:05 UTC')
    expect(document).toContain('BERICHTSTEXT\n-------------\n\nBefund\n\nUnauffällige Schleimhaut.')
    expect(document).not.toContain('<html')
  })

  it('creates a readable filename without patient identity data', () => {
    expect(reportingTextFilename(88)).toBe('Befundbericht_88.txt')
  })
})
