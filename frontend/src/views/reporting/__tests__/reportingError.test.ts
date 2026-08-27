import { describe, expect, it } from 'vitest'

import { reportingApiError, reportingApiErrorMessage } from '../reportingError'

describe('reportingError', () => {
  it.each([null, undefined, 'failure', 503])(
    'normalizes non-object error value %p to an empty error',
    (value) => {
      // Arrange
      const error: unknown = value

      // Act
      const result = reportingApiError(error)

      // Assert
      expect(result).toEqual({})
    }
  )

  it('prefers a non-empty backend detail over every lower-priority message', () => {
    // Arrange
    const error = {
      message: 'network message',
      response: { data: { detail: 'clinical detail', error: 'generic response error' } }
    }

    // Act
    const message = reportingApiErrorMessage(error, 'fallback')

    // Assert
    expect(message).toBe('clinical detail')
  })

  it('uses the backend error when detail is absent', () => {
    // Arrange
    const error = {
      message: 'network message',
      response: { data: { detail: '', error: 'registry unavailable' } }
    }

    // Act
    const message = reportingApiErrorMessage(error, 'fallback')

    // Assert
    expect(message).toBe('registry unavailable')
  })

  it.each([
    [{ message: 'network message' }, 'network message'],
    [{ message: '' }, 'safe fallback'],
    [{ response: { data: { detail: 409, error: false } } }, 'safe fallback']
  ])('falls through malformed or empty response fields', (error, expected) => {
    // Arrange
    const fallback = 'safe fallback'

    // Act
    const message = reportingApiErrorMessage(error, fallback)

    // Assert
    expect(message).toBe(expected)
  })
})
