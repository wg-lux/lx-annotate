import { describe, expect, it } from 'vitest'
import {
  buildValidationReturnPath,
  formatAnonymizationModel,
  formatValidationFileId,
  validationFileQuery
} from '../anonymizationValidationPresentation'

describe('anonymization navigation context', () => {
  it('preserves a complete video context in both navigation destinations', () => {
    expect(buildValidationReturnPath(42, 'video')).toBe(
      '/anonymisierung/validierung?fileId=42&mediaType=video'
    )
    expect(validationFileQuery(42, 'video')).toEqual({ fileId: '42', mediaType: 'video' })
    expect(formatValidationFileId(42, 'video')).toBe('Video-ID: 42')
  })

  it('preserves partial context for frame annotation without claiming a return target', () => {
    expect(buildValidationReturnPath(42, null)).toBe('/anonymisierung/validierung')
    expect(validationFileQuery(42, null)).toEqual({ fileId: '42' })
    expect(buildValidationReturnPath(null, 'pdf')).toBe('/anonymisierung/validierung')
    expect(validationFileQuery(null, 'pdf')).toEqual({ mediaType: 'pdf' })
    expect(validationFileQuery(null, null)).toEqual({})
    expect(formatValidationFileId(null, 'pdf')).toBe('')
  })

  it('labels PDF and unresolved scopes without assigning the wrong media kind', () => {
    expect(formatValidationFileId(42, 'pdf')).toBe('PDF-ID: 42')
    expect(formatValidationFileId(42, null)).toBe('Datei-ID: 42')
    expect(formatValidationFileId(42, 'unknown')).toBe('Datei-ID: 42')
    expect(formatValidationFileId(42, 'meta')).toBe('Datei-ID: 42')
  })
})

describe('anonymization model identity', () => {
  it('shows one consistent identity and shortened checksum in correction and validation', () => {
    expect(
      formatAnonymizationModel({
        name: 'detector',
        version: '2',
        sha256: '1234567890abcdef'
      })
    ).toBe('detector 2 · SHA-256 1234567890ab…')
  })

  it('retains available identity fields and makes missing model metadata explicit', () => {
    expect(formatAnonymizationModel()).toBe('Nicht gemeldet')
    expect(formatAnonymizationModel(null)).toBe('Nicht gemeldet')
    expect(formatAnonymizationModel({})).toBe('Nicht gemeldet')
    expect(formatAnonymizationModel({ version: '2' })).toBe('2')
    expect(formatAnonymizationModel({ sha256: 'abc' })).toBe('SHA-256 abc…')
  })
})
