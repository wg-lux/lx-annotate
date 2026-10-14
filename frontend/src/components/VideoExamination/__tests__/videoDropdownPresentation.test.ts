import { describe, expect, it } from 'vitest'

import {
  getAgeFromDob,
  getValidatedAnnotatorLabel,
  getVideoDropdownItemClass,
  getVideoDropdownStatusBadgeClass,
  getVideoDropdownStatusText,
  normalizeGenderLabel,
  normalizeValidatedAnnotators,
  resolveVideoDropdownStatus
} from '../videoDropdownPresentation'

describe('video dropdown presentation', () => {
  it('formats patient metadata without depending on component state', () => {
    const today = new Date(2026, 7, 3)
    expect(getAgeFromDob('31.12.2000', today)).toBe(25)
    expect(getAgeFromDob('2000-08-03', today)).toBe(26)
    expect(getAgeFromDob('unknown', today)).toBeNull()
    expect(normalizeGenderLabel('female')).toBe('Weiblich')
    expect(normalizeGenderLabel(null)).toBe('Unbekannt')
  })

  it('normalizes annotators and distinguishes another annotation track', () => {
    const annotators = normalizeValidatedAnnotators([' reviewer ', 'reviewer', '', 'active'])
    expect(annotators).toEqual(['active', 'reviewer'])
    expect(getValidatedAnnotatorLabel(annotators, 'active')).toBe(
      'Vorannotation von: active, reviewer'
    )
    expect(getValidatedAnnotatorLabel(['active'], 'active')).toBe('Validiert von: active')
  })

  it.each([
    [false, 'not_started', false, 'not_usable'],
    [true, 'not_started', false, 'pending_anonymization_validation'],
    [true, 'not_started', true, 'ready_for_annotation'],
    [true, 'cleanup_running', true, 'annotation_cleanup_pending'],
    [true, 'cleanup_required', true, 'annotation_cleanup_failed'],
    [true, 'validated', true, 'annotation_validated']
  ] as const)(
    'resolves viewable=%s, segment=%s, anonymization=%s to %s',
    (canViewProcessedVideo, segmentAnnotationStatus, isAnonymizationValidated, expected) => {
      expect(
        resolveVideoDropdownStatus({
          canViewProcessedVideo,
          segmentAnnotationStatus,
          isAnonymizationValidated
        })
      ).toBe(expected)
    }
  )

  it('maps status copy and styling consistently', () => {
    expect(getVideoDropdownStatusText('not_usable', 'Anonymisierung läuft')).toBe(
      'Noch nicht nutzbar: Anonymisierung läuft'
    )
    expect(getVideoDropdownStatusBadgeClass('annotation_validated')).toBe('badge-validated')
    expect(getVideoDropdownItemClass('annotation_cleanup_failed')).toBe(
      'video-dropdown-item-pending'
    )
  })
})
