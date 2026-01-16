/**
 * Centralized Date Conversion Utilities
 *
 * Purpose: Eliminate date format confusion and bugs by providing
 * a single source of truth for German ↔ ISO date conversions.
 *
 * Medical Context:
 * - German medical staff expect DD.MM.YYYY format
 * - Backend database stores ISO (YYYY-MM-DD)
 * - HTML5 date inputs use YYYY-MM-DD
 *
 * Usage:
 * ```typescript
 * // Convert user input to ISO for database
 * const isoDate = DateConverter.toISO('21.03.1994'); // '1994-03-21'
 *
 * // Display ISO date to user in German format
 * const germanDate = DateConverter.toGerman('1994-03-21'); // '21.03.1994'
 *
 * // Validate date format
 * const isValid = DateConverter.validate('21.03.1994', 'German'); // true
 *
 * // Compare dates
 * const diff = DateConverter.compare('1994-03-21', '2025-10-09'); // -1 (earlier)
 * ```
 *
 * @module dateHelpers
 * @since Phase 2.1 - October 2025
 */

export class DateConverter {
  /**
   * Convert any supported date format to ISO (YYYY-MM-DD)
   *
   * Supports:
   * - German format: DD.MM.YYYY
   * - ISO format: YYYY-MM-DD (passthrough)
   * - Browser date input: YYYY-MM-DD (passthrough)
   *
   * @param input - Date string in any supported format
   * @returns ISO date string (YYYY-MM-DD) or null if invalid
   *
   * @example
   * DateConverter.toISO('21.03.1994')    // '1994-03-21'
   * DateConverter.toISO('1994-03-21')    // '1994-03-21'
   * DateConverter.toISO('invalid')       // null
   * DateConverter.toISO('')              // null
   * DateConverter.toISO(null)            // null
   */
  static toISO(input?: string | null): string | null {
    if (!input) return null

    const trimmed = input.trim().split(' ')[0] // Remove time if present

    // Check if already ISO format (YYYY-MM-DD)
    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/
    const isoMatch = isoPattern.exec(trimmed)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      if (this._isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
        return trimmed
      }
      return null
    }

    // Try German format (DD.MM.YYYY)
    const germanPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/
    const germanMatch = germanPattern.exec(trimmed)
    if (germanMatch) {
      const [, day, month, year] = germanMatch
      if (this._isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
        return `${year}-${month}-${day}`
      }
      return null
    }

    return null
  }

  /**
   * Convert ISO date (YYYY-MM-DD) to German format (DD.MM.YYYY)
   *
   * @param iso - ISO date string (YYYY-MM-DD)
   * @returns German date string (DD.MM.YYYY) or empty string if invalid
   *
   * @example
   * DateConverter.toGerman('1994-03-21')  // '21.03.1994'
   * DateConverter.toGerman('invalid')     // ''
   * DateConverter.toGerman(null)          // ''
   */
  static toGerman(iso?: string | null): string {
    if (!iso) return ''

    const trimmed = iso.trim()
    const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/
    const match = isoPattern.exec(trimmed)

    if (!match) return ''

    const [, year, month, day] = match

    // Validate date before converting
    if (!this._isValidDate(parseInt(year), parseInt(month), parseInt(day))) {
      return ''
    }

    return `${day}.${month}.${year}`
  }

  /**
   * Validate date string against specified format
   *
   * @param date - Date string to validate
   * @param format - Expected format ('ISO' or 'German')
   * @returns true if date matches format and is valid calendar date
   *
   * @example
   * DateConverter.validate('21.03.1994', 'German')   // true
   * DateConverter.validate('1994-03-21', 'ISO')      // true
   * DateConverter.validate('32.13.2025', 'German')   // false (invalid day/month)
   * DateConverter.validate('2025-13-01', 'ISO')      // false (invalid month)
   */
  static validate(date: string, format: 'ISO' | 'German'): boolean {
    if (!date) return false

    const trimmed = date.trim()

    if (format === 'ISO') {
      const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/
      const match = isoPattern.exec(trimmed)
      if (!match) return false

      const [, year, month, day] = match
      return this._isValidDate(parseInt(year), parseInt(month), parseInt(day))
    }

    if (format === 'German') {
      const germanPattern = /^(\d{2})\.(\d{2})\.(\d{4})$/
      const match = germanPattern.exec(trimmed)
      if (!match) return false

      const [, day, month, year] = match
      return this._isValidDate(parseInt(year), parseInt(month), parseInt(day))
    }

    return false
  }

  /**
   * Compare two ISO dates
   *
   * @param date1 - First ISO date (YYYY-MM-DD)
   * @param date2 - Second ISO date (YYYY-MM-DD)
   * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2, null if invalid
   *
   * @example
   * DateConverter.compare('1994-03-21', '2025-10-09')  // -1 (date1 earlier)
   * DateConverter.compare('2025-10-09', '2025-10-09')  // 0  (equal)
   * DateConverter.compare('2025-10-09', '1994-03-21')  // 1  (date1 later)
   * DateConverter.compare('invalid', '2025-10-09')     // null
   */
  static compare(date1: string, date2: string): number | null {
    if (!this.validate(date1, 'ISO') || !this.validate(date2, 'ISO')) {
      return null
    }

    const d1 = new Date(date1)
    const d2 = new Date(date2)

    if (d1 < d2) return -1
    if (d1 > d2) return 1
    return 0
  }

  /**
   * Check if date1 is before date2 (strict)
   *
   * @param date1 - First ISO date (YYYY-MM-DD)
   * @param date2 - Second ISO date (YYYY-MM-DD)
   * @returns true if date1 < date2, false otherwise
   *
   * @example
   * DateConverter.isBefore('1994-03-21', '2025-10-09')  // true
   * DateConverter.isBefore('2025-10-09', '2025-10-09')  // false (equal)
   */
  static isBefore(date1: string, date2: string): boolean {
    return this.compare(date1, date2) === -1
  }

  /**
   * Check if date1 is after date2 (strict)
   *
   * @param date1 - First ISO date (YYYY-MM-DD)
   * @param date2 - Second ISO date (YYYY-MM-DD)
   * @returns true if date1 > date2, false otherwise
   *
   * @example
   * DateConverter.isAfter('2025-10-09', '1994-03-21')  // true
   * DateConverter.isAfter('2025-10-09', '2025-10-09')  // false (equal)
   */
  static isAfter(date1: string, date2: string): boolean {
    return this.compare(date1, date2) === 1
  }

  /**
   * Check if date1 is before or equal to date2
   *
   * @param date1 - First ISO date (YYYY-MM-DD)
   * @param date2 - Second ISO date (YYYY-MM-DD)
   * @returns true if date1 <= date2, false otherwise
   */
  static isBeforeOrEqual(date1: string, date2: string): boolean {
    const result = this.compare(date1, date2)
    return result === -1 || result === 0
  }

  /**
   * Check if date1 is after or equal to date2
   *
   * @param date1 - First ISO date (YYYY-MM-DD)
   * @param date2 - Second ISO date (YYYY-MM-DD)
   * @returns true if date1 >= date2, false otherwise
   */
  static isAfterOrEqual(date1: string, date2: string): boolean {
    const result = this.compare(date1, date2)
    return result === 1 || result === 0
  }

  /**
   * Get today's date in ISO format
   *
   * @returns Today's date (YYYY-MM-DD)
   *
   * @example
   * DateConverter.today()  // '2025-10-09'
   */
  static today(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Get today's date in German format
   *
   * @returns Today's date (DD.MM.YYYY)
   *
   * @example
   * DateConverter.todayGerman()  // '09.10.2025'
   */
  static todayGerman(): string {
    return this.toGerman(this.today())
  }

  /**
   * Internal: Validate calendar date (checks for invalid dates like Feb 30)
   *
   * @param year - Year (1900-2100)
   * @param month - Month (1-12)
   * @param day - Day (1-31)
   * @returns true if valid calendar date
   *
   * @private
   */
  private static _isValidDate(year: number, month: number, day: number): boolean {
    // Basic range checks
    if (year < 1900 || year > 2100) return false
    if (month < 1 || month > 12) return false
    if (day < 1 || day > 31) return false

    // Use Date object to validate (catches Feb 30, etc.)
    const date = new Date(year, month - 1, day)

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  }
}

/**
 * Validation error aggregator for date fields
 *
 * Purpose: Collect all date validation errors in one place
 * instead of showing them individually per field.
 *
 * Usage:
 * ```typescript
 * const validator = new DateValidator();
 *
 * validator.addField('DOB', dobValue, 'German');
 * validator.addField('Examination Date', examValue, 'ISO');
 *
 * if (validator.hasErrors()) {
 *   console.log(validator.getErrors());  // ['DOB: Invalid format', ...]
 *   console.log(validator.getSummary()); // 'Found 2 date errors'
 * }
 * ```
 *
 * @since Phase 2.2 - October 2025
 */
export class DateValidator {
  private errors: Map<string, string> = new Map()

  /**
   * Add field for validation
   *
   * @param fieldName - Human-readable field name (e.g., 'Date of Birth')
   * @param value - Date value to validate
   * @param expectedFormat - Expected format ('ISO' or 'German')
   */
  addField(
    fieldName: string,
    value: string | null | undefined,
    expectedFormat: 'ISO' | 'German'
  ): void {
    if (!value) {
      this.errors.set(fieldName, `${fieldName}: Pflichtfeld (darf nicht leer sein)`)
      return
    }

    if (!DateConverter.validate(value, expectedFormat)) {
      const formatHint = expectedFormat === 'ISO' ? 'YYYY-MM-DD' : 'DD.MM.YYYY'
      this.errors.set(fieldName, `${fieldName}: Ungültiges Format (erwartet: ${formatHint})`)
    }
  }

  /**
   * Add custom constraint (e.g., DOB must be before Exam Date)
   *
   * @param constraintName - Human-readable constraint name
   * @param condition - Validation condition (true = valid)
   * @param errorMessage - Error message if condition fails
   */
  addConstraint(constraintName: string, condition: boolean, errorMessage: string): void {
    if (!condition) {
      this.errors.set(constraintName, errorMessage)
    }
  }

  /**
   * Check if any errors exist
   *
   * @returns true if validation failed
   */
  hasErrors(): boolean {
    return this.errors.size > 0
  }

  /**
   * Get all error messages
   *
   * @returns Array of error messages
   */
  getErrors(): string[] {
    return Array.from(this.errors.values())
  }

  /**
   * Get summary message
   *
   * @returns Summary like "Found 2 date errors" or "All dates valid"
   */
  getSummary(): string {
    const count = this.errors.size
    if (count === 0) return 'Alle Datumsfelder sind gültig'
    if (count === 1) return '1 Datumsfehler gefunden'
    return `${count} Datumsfehler gefunden`
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors.clear()
  }

  /**
   * Get errors as formatted HTML list
   *
   * @returns HTML string with <ul><li> structure
   */
  getErrorsAsHtml(): string {
    if (this.errors.size === 0) return ''

    const items = this.getErrors()
      .map((err) => `<li>${err}</li>`)
      .join('')

    return `<ul class="date-validation-errors">${items}</ul>`
  }
}
