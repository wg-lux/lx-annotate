/**
 * Unit Tests for DateConverter and DateValidator
 *
 * @module dateHelpers.test
 * @since Phase 2.1 - October 2025
 */

import { describe, it, expect } from 'vitest'
import { DateConverter, DateValidator } from './dateHelpers'

describe('DateConverter', () => {
  describe('toISO', () => {
    it('should convert German format to ISO', () => {
      expect(DateConverter.toISO('21.03.1994')).toBe('1994-03-21')
      expect(DateConverter.toISO('01.01.2025')).toBe('2025-01-01')
      expect(DateConverter.toISO('31.12.1999')).toBe('1999-12-31')
    })

    it('should pass through valid ISO format', () => {
      expect(DateConverter.toISO('1994-03-21')).toBe('1994-03-21')
      expect(DateConverter.toISO('2025-01-01')).toBe('2025-01-01')
      expect(DateConverter.toISO('1999-12-31')).toBe('1999-12-31')
    })

    it('should handle null and empty strings', () => {
      expect(DateConverter.toISO(null)).toBeNull()
      expect(DateConverter.toISO(undefined)).toBeNull()
      expect(DateConverter.toISO('')).toBeNull()
      expect(DateConverter.toISO('   ')).toBeNull()
    })

    it('should reject invalid dates', () => {
      expect(DateConverter.toISO('32.01.2025')).toBeNull() // Invalid day
      expect(DateConverter.toISO('01.13.2025')).toBeNull() // Invalid month
      expect(DateConverter.toISO('29.02.2025')).toBeNull() // Not a leap year
      expect(DateConverter.toISO('2025-02-29')).toBeNull() // Not a leap year (ISO)
      expect(DateConverter.toISO('invalid')).toBeNull()
    })

    it('should accept leap year dates', () => {
      expect(DateConverter.toISO('29.02.2024')).toBe('2024-02-29') // Leap year
      expect(DateConverter.toISO('2024-02-29')).toBe('2024-02-29') // Leap year (ISO)
    })

    it('should strip time component', () => {
      expect(DateConverter.toISO('1994-03-21 14:30:00')).toBe('1994-03-21')
      expect(DateConverter.toISO('21.03.1994 14:30:00')).toBe('1994-03-21')
    })
  })

  describe('toGerman', () => {
    it('should convert ISO to German format', () => {
      expect(DateConverter.toGerman('1994-03-21')).toBe('21.03.1994')
      expect(DateConverter.toGerman('2025-01-01')).toBe('01.01.2025')
      expect(DateConverter.toGerman('1999-12-31')).toBe('31.12.1999')
    })

    it('should handle null and empty strings', () => {
      expect(DateConverter.toGerman(null)).toBe('')
      expect(DateConverter.toGerman(undefined)).toBe('')
      expect(DateConverter.toGerman('')).toBe('')
    })

    it('should reject invalid ISO dates', () => {
      expect(DateConverter.toGerman('2025-13-01')).toBe('') // Invalid month
      expect(DateConverter.toGerman('2025-02-29')).toBe('') // Not a leap year
      expect(DateConverter.toGerman('invalid')).toBe('')
    })

    it('should accept leap year dates', () => {
      expect(DateConverter.toGerman('2024-02-29')).toBe('29.02.2024') // Leap year
    })
  })

  describe('validate', () => {
    it('should validate German format', () => {
      expect(DateConverter.validate('21.03.1994', 'German')).toBe(true)
      expect(DateConverter.validate('01.01.2025', 'German')).toBe(true)
      expect(DateConverter.validate('29.02.2024', 'German')).toBe(true) // Leap year
    })

    it('should reject invalid German format', () => {
      expect(DateConverter.validate('32.01.2025', 'German')).toBe(false) // Invalid day
      expect(DateConverter.validate('01.13.2025', 'German')).toBe(false) // Invalid month
      expect(DateConverter.validate('29.02.2025', 'German')).toBe(false) // Not a leap year
      expect(DateConverter.validate('1994-03-21', 'German')).toBe(false) // Wrong format
      expect(DateConverter.validate('', 'German')).toBe(false)
    })

    it('should validate ISO format', () => {
      expect(DateConverter.validate('1994-03-21', 'ISO')).toBe(true)
      expect(DateConverter.validate('2025-01-01', 'ISO')).toBe(true)
      expect(DateConverter.validate('2024-02-29', 'ISO')).toBe(true) // Leap year
    })

    it('should reject invalid ISO format', () => {
      expect(DateConverter.validate('2025-13-01', 'ISO')).toBe(false) // Invalid month
      expect(DateConverter.validate('2025-02-29', 'ISO')).toBe(false) // Not a leap year
      expect(DateConverter.validate('21.03.1994', 'ISO')).toBe(false) // Wrong format
      expect(DateConverter.validate('', 'ISO')).toBe(false)
    })
  })

  describe('compare', () => {
    it('should compare dates correctly', () => {
      expect(DateConverter.compare('1994-03-21', '2025-10-09')).toBe(-1) // Earlier
      expect(DateConverter.compare('2025-10-09', '1994-03-21')).toBe(1) // Later
      expect(DateConverter.compare('2025-10-09', '2025-10-09')).toBe(0) // Equal
    })

    it('should return null for invalid dates', () => {
      expect(DateConverter.compare('invalid', '2025-10-09')).toBeNull()
      expect(DateConverter.compare('2025-10-09', 'invalid')).toBeNull()
      expect(DateConverter.compare('invalid', 'invalid')).toBeNull()
    })
  })

  describe('isBefore', () => {
    it('should check if date1 is before date2', () => {
      expect(DateConverter.isBefore('1994-03-21', '2025-10-09')).toBe(true)
      expect(DateConverter.isBefore('2025-10-09', '1994-03-21')).toBe(false)
      expect(DateConverter.isBefore('2025-10-09', '2025-10-09')).toBe(false) // Equal
    })
  })

  describe('isAfter', () => {
    it('should check if date1 is after date2', () => {
      expect(DateConverter.isAfter('2025-10-09', '1994-03-21')).toBe(true)
      expect(DateConverter.isAfter('1994-03-21', '2025-10-09')).toBe(false)
      expect(DateConverter.isAfter('2025-10-09', '2025-10-09')).toBe(false) // Equal
    })
  })

  describe('isBeforeOrEqual', () => {
    it('should check if date1 is before or equal to date2', () => {
      expect(DateConverter.isBeforeOrEqual('1994-03-21', '2025-10-09')).toBe(true)
      expect(DateConverter.isBeforeOrEqual('2025-10-09', '2025-10-09')).toBe(true) // Equal
      expect(DateConverter.isBeforeOrEqual('2025-10-09', '1994-03-21')).toBe(false)
    })
  })

  describe('isAfterOrEqual', () => {
    it('should check if date1 is after or equal to date2', () => {
      expect(DateConverter.isAfterOrEqual('2025-10-09', '1994-03-21')).toBe(true)
      expect(DateConverter.isAfterOrEqual('2025-10-09', '2025-10-09')).toBe(true) // Equal
      expect(DateConverter.isAfterOrEqual('1994-03-21', '2025-10-09')).toBe(false)
    })
  })

  describe('today', () => {
    it('should return today in ISO format', () => {
      const result = DateConverter.today()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // Verify it's actually today
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      expect(result).toBe(`${year}-${month}-${day}`)
    })
  })

  describe('todayGerman', () => {
    it('should return today in German format', () => {
      const result = DateConverter.todayGerman()
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)

      // Verify it matches today() converted to German
      const isoToday = DateConverter.today()
      expect(result).toBe(DateConverter.toGerman(isoToday))
    })
  })
})

describe('DateValidator', () => {
  it('should collect field validation errors', () => {
    const validator = new DateValidator()

    validator.addField('DOB', '21.03.1994', 'German')
    validator.addField('Exam Date', 'invalid', 'ISO')

    expect(validator.hasErrors()).toBe(true)
    expect(validator.getErrors()).toHaveLength(1)
    expect(validator.getErrors()[0]).toContain('Exam Date')
    expect(validator.getErrors()[0]).toContain('YYYY-MM-DD')
  })

  it('should detect empty required fields', () => {
    const validator = new DateValidator()

    validator.addField('DOB', null, 'German')
    validator.addField('Exam Date', '', 'ISO')

    expect(validator.hasErrors()).toBe(true)
    expect(validator.getErrors()).toHaveLength(2)
    expect(validator.getErrors()[0]).toContain('Pflichtfeld')
    expect(validator.getErrors()[1]).toContain('Pflichtfeld')
  })

  it('should validate custom constraints', () => {
    const validator = new DateValidator()

    const dob = '2025-01-01'
    const examDate = '1994-03-21'

    validator.addConstraint(
      'DOB_BEFORE_EXAM',
      DateConverter.isBefore(dob, examDate),
      'Geburtsdatum muss vor Untersuchungsdatum liegen'
    )

    expect(validator.hasErrors()).toBe(true)
    expect(validator.getErrors()[0]).toContain('vor Untersuchungsdatum')
  })

  it('should generate summary messages', () => {
    const validator = new DateValidator()

    expect(validator.getSummary()).toBe('Alle Datumsfelder sind gültig')

    validator.addField('DOB', 'invalid', 'German')
    expect(validator.getSummary()).toBe('1 Datumsfehler gefunden')

    validator.addField('Exam Date', 'invalid', 'ISO')
    expect(validator.getSummary()).toBe('2 Datumsfehler gefunden')
  })

  it('should clear errors', () => {
    const validator = new DateValidator()

    validator.addField('DOB', 'invalid', 'German')
    expect(validator.hasErrors()).toBe(true)

    validator.clear()
    expect(validator.hasErrors()).toBe(false)
    expect(validator.getErrors()).toHaveLength(0)
  })

  it('should generate HTML error list', () => {
    const validator = new DateValidator()

    expect(validator.getErrorsAsHtml()).toBe('')

    validator.addField('DOB', 'invalid', 'German')
    validator.addField('Exam Date', 'invalid', 'ISO')

    const html = validator.getErrorsAsHtml()
    expect(html).toContain('<ul class="date-validation-errors">')
    expect(html).toContain('<li>')
    expect(html).toContain('DOB')
    expect(html).toContain('Exam Date')
  })

  it('should validate complete patient data scenario', () => {
    const validator = new DateValidator()

    // Simulate patient data validation
    const dob = '21.03.1994'
    const examDate = '09.10.2025'

    validator.addField('Geburtsdatum', dob, 'German')
    validator.addField('Untersuchungsdatum', examDate, 'German')

    const dobISO = DateConverter.toISO(dob)
    const examISO = DateConverter.toISO(examDate)

    if (dobISO && examISO) {
      validator.addConstraint(
        'DOB_BEFORE_EXAM',
        DateConverter.isBefore(dobISO, examISO),
        'Geburtsdatum muss vor Untersuchungsdatum liegen'
      )
    }

    expect(validator.hasErrors()).toBe(false)
    expect(validator.getSummary()).toBe('Alle Datumsfelder sind gültig')
  })
})
