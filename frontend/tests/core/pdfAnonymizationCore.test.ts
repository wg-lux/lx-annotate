/**
 * Tests for PDF import and anonymization functionality - Core Logic Tests
 * 
 * These tests focus on the core logic without requiring all store dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock types for testing
interface PatientData {
  id: number
  originalText?: string
  anonymizedText?: string
  reportMeta?: {
    patientFirstName?: string
    patientLastName?: string
    patientGender?: string
    patientDob?: string
    casenumber?: string
    examinationDate?: string
  }
  file?: string
  fileType?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Core validation functions to test
class AnonymizationValidator {
  static validatePatientName(firstName: string, lastName: string): ValidationResult {
    const errors: string[] = []
    
    if (!firstName || firstName.trim().length === 0) {
      errors.push('First name is required')
    }
    
    if (!lastName || lastName.trim().length === 0) {
      errors.push('Last name is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateDateOfBirth(dob: string): ValidationResult {
    const errors: string[] = []
    
    if (!dob || dob.trim().length === 0) {
      errors.push('Date of birth is required')
      return { isValid: false, errors }
    }
    
    // Check ISO format
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/
    if (!isoPattern.test(dob)) {
      errors.push('Date must be in YYYY-MM-DD format')
      return { isValid: false, errors }
    }
    
    // Check if it's a valid date - strict validation
    const date = new Date(dob)
    if (isNaN(date.getTime())) {
      errors.push('Invalid date')
      return { isValid: false, errors }
    }
    
    // Additional check: ensure the date doesn't get auto-corrected by JavaScript Date constructor
    // E.g., '2023-02-30' becomes '2023-03-02', but we want to reject it
    const [year, month, day] = dob.split('-').map(Number)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      errors.push('Invalid date')
      return { isValid: false, errors }
    }
    
    // Check if it's not in the future
    const today = new Date()
    if (date > today) {
      errors.push('Date of birth cannot be in the future')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static validateExaminationDate(examDate: string, dob: string): ValidationResult {
    const errors: string[] = []
    
    // Examination date is optional
    if (!examDate || examDate.trim().length === 0) {
      return { isValid: true, errors: [] }
    }
    
    // If provided, must be valid
    const dobValidation = this.validateDateOfBirth(examDate)
    if (!dobValidation.isValid) {
      return dobValidation
    }
    
    // Must be after DOB
    if (dob) {
      const dobDate = new Date(dob)
      const examDateObj = new Date(examDate)
      
      if (!isNaN(dobDate.getTime()) && examDateObj < dobDate) {
        errors.push('Examination date must be after date of birth')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  static normalizeDate(dateStr: string): string | null {
    if (!dateStr) return null
    
    const trimmed = dateStr.trim().split(' ')[0] // remove time if present
    
    // Check if already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed
    }
    
    // German format DD.MM.YYYY
    const germanMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed)
    if (germanMatch) {
      const [, dd, mm, yyyy] = germanMatch
      return `${yyyy}-${mm}-${dd}`
    }
    
    return null
  }
  
  static buildSensitiveMetaPayload(patientData: any, dobIso: string, examinationDate?: string) {
    return {
      patient_first_name: patientData.patientFirstName || '',
      patient_last_name: patientData.patientLastName || '',
      patient_gender: patientData.patientGender || '',
      patient_dob: dobIso,
      casenumber: patientData.casenumber || '',
      examination_date: examinationDate || null
    }
  }
}

// Media type detection
class MediaTypeDetector {
  static detectMediaType(item: PatientData): string {
    if (!item) return 'unknown'
    
    // Check explicit fileType
    if (item.fileType) {
      return item.fileType.toLowerCase()
    }
    
    // Check file extension
    if (item.file) {
      const extension = item.file.split('.').pop()?.toLowerCase()
      if (extension === 'pdf') return 'pdf'
      if (['mp4', 'avi', 'mov', 'wmv'].includes(extension || '')) return 'video'
    }
    
    // Check URL patterns
    if (item.file?.includes('/pdf/')) return 'pdf'
    if (item.file?.includes('/video/')) return 'video'
    
    return 'unknown'
  }
  
  static isPdf(item: PatientData): boolean {
    return this.detectMediaType(item) === 'pdf'
  }
  
  static isVideo(item: PatientData): boolean {
    return this.detectMediaType(item) === 'video'
  }
  
  static buildPdfUrl(item: PatientData): string | null {
    if (!this.isPdf(item)) return null
    
    if (item.file) return item.file
    if (item.id) return `/api/pdf/${item.id}/stream/`
    
    return null
  }
  
  static buildVideoUrl(item: PatientData): string | null {
    if (!this.isVideo(item)) return null
    
    if (item.file) return item.file
    if (item.id) return `/api/video/${item.id}/stream/`
    
    return null
  }
}

// Anonymization operations
class AnonymizationProcessor {
  static anonymizeText(originalText: string, patientData: any): string {
    if (!originalText) return ''
    
    let anonymized = originalText
    
    // Replace patient names
    if (patientData.patientFirstName) {
      anonymized = anonymized.replace(
        new RegExp(patientData.patientFirstName, 'gi'),
        '[PATIENT_FIRST_NAME]'
      )
    }
    
    if (patientData.patientLastName) {
      anonymized = anonymized.replace(
        new RegExp(patientData.patientLastName, 'gi'),
        '[PATIENT_LAST_NAME]'
      )
    }
    
    // Replace dates
    if (patientData.patientDob) {
      // Replace both ISO and German formats
      const isoDate = patientData.patientDob
      const germanDate = this.convertToGermanDate(isoDate)
      
      anonymized = anonymized.replace(new RegExp(isoDate, 'g'), '[PATIENT_DOB]')
      if (germanDate) {
        anonymized = anonymized.replace(new RegExp(germanDate, 'g'), '[PATIENT_DOB]')
      }
    }
    
    return anonymized
  }
  
  static convertToGermanDate(isoDate: string): string | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
    if (match) {
      const [, yyyy, mm, dd] = match
      return `${dd}.${mm}.${yyyy}`
    }
    return null
  }
  
  static extractMetadataFromText(text: string): Partial<PatientData['reportMeta']> {
    const metadata: Partial<PatientData['reportMeta']> = {}
    
    if (!text) return metadata
    
    const lines = text.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Patient name extraction
      if (trimmed.match(/^(Patient|Name):\s*(.+)$/i)) {
        const match = trimmed.match(/^(Patient|Name):\s*(.+)$/i)
        if (match) {
          const fullName = match[2].trim()
          const nameParts = fullName.split(' ')
          if (nameParts.length >= 2) {
            metadata.patientFirstName = nameParts[0]
            metadata.patientLastName = nameParts.slice(1).join(' ')
          }
        }
      }
      
      // DOB extraction
      if (trimmed.match(/^(DOB|Date of Birth|Geburtsdatum):\s*(.+)$/i)) {
        const match = trimmed.match(/^(DOB|Date of Birth|Geburtsdatum):\s*(.+)$/i)
        if (match) {
          const dobStr = match[2].trim()
          const normalizedDob = AnonymizationValidator.normalizeDate(dobStr)
          if (normalizedDob) {
            metadata.patientDob = normalizedDob
          }
        }
      }
      
      // Examination date extraction
      if (trimmed.match(/^(Date|Examination Date|Datum):\s*(.+)$/i)) {
        const match = trimmed.match(/^(Date|Examination Date|Datum):\s*(.+)$/i)
        if (match) {
          const dateStr = match[2].trim()
          const normalizedDate = AnonymizationValidator.normalizeDate(dateStr)
          if (normalizedDate) {
            metadata.examinationDate = normalizedDate
          }
        }
      }
    }
    
    return metadata
  }
}

describe('AnonymizationValidator', () => {
  describe('validatePatientName', () => {
    it('should validate correct names', () => {
      const result = AnonymizationValidator.validatePatientName('John', 'Doe')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('should reject empty first name', () => {
      const result = AnonymizationValidator.validatePatientName('', 'Doe')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('First name is required')
    })
    
    it('should reject empty last name', () => {
      const result = AnonymizationValidator.validatePatientName('John', '')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Last name is required')
    })
    
    it('should reject whitespace-only names', () => {
      const result = AnonymizationValidator.validatePatientName('   ', '   ')
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })
  })
  
  describe('validateDateOfBirth', () => {
    it('should validate correct ISO date', () => {
      const result = AnonymizationValidator.validateDateOfBirth('1990-01-01')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
    
    it('should reject invalid format', () => {
      const result = AnonymizationValidator.validateDateOfBirth('01.01.1990')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Date must be in YYYY-MM-DD format')
    })
    
    it('should reject future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      const futureDateStr = futureDate.toISOString().split('T')[0]
      
      const result = AnonymizationValidator.validateDateOfBirth(futureDateStr)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Date of birth cannot be in the future')
    })
    
    it('should reject invalid dates', () => {
      const result = AnonymizationValidator.validateDateOfBirth('2023-02-30')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid date')
    })
  })
  
  describe('validateExaminationDate', () => {
    it('should allow empty examination date', () => {
      const result = AnonymizationValidator.validateExaminationDate('', '1990-01-01')
      expect(result.isValid).toBe(true)
    })
    
    it('should validate examination date after DOB', () => {
      const result = AnonymizationValidator.validateExaminationDate('2023-01-01', '1990-01-01')
      expect(result.isValid).toBe(true)
    })
    
    it('should reject examination date before DOB', () => {
      const result = AnonymizationValidator.validateExaminationDate('1989-01-01', '1990-01-01')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Examination date must be after date of birth')
    })
  })
  
  describe('normalizeDate', () => {
    it('should handle ISO dates', () => {
      expect(AnonymizationValidator.normalizeDate('2023-01-01')).toBe('2023-01-01')
    })
    
    it('should convert German dates', () => {
      expect(AnonymizationValidator.normalizeDate('01.01.2023')).toBe('2023-01-01')
    })
    
    it('should handle invalid dates', () => {
      expect(AnonymizationValidator.normalizeDate('invalid')).toBeNull()
      expect(AnonymizationValidator.normalizeDate('')).toBeNull()
    })
    
    it('should strip time from datetime', () => {
      expect(AnonymizationValidator.normalizeDate('2023-01-01 12:34:56')).toBe('2023-01-01')
    })
  })
})

describe('MediaTypeDetector', () => {
  const samplePdfData: PatientData = {
    id: 1,
    file: '/api/pdf/1/stream/',
    fileType: 'pdf'
  }
  
  const sampleVideoData: PatientData = {
    id: 2,
    file: '/api/video/2/stream/',
    fileType: 'video'
  }
  
  describe('detectMediaType', () => {
    it('should detect PDF from fileType', () => {
      expect(MediaTypeDetector.detectMediaType(samplePdfData)).toBe('pdf')
    })
    
    it('should detect video from fileType', () => {
      expect(MediaTypeDetector.detectMediaType(sampleVideoData)).toBe('video')
    })
    
    it('should detect PDF from URL pattern', () => {
      const data = { id: 1, file: '/api/pdf/1/stream/' }
      expect(MediaTypeDetector.detectMediaType(data)).toBe('pdf')
    })
    
    it('should detect video from URL pattern', () => {
      const data = { id: 1, file: '/api/video/1/stream/' }
      expect(MediaTypeDetector.detectMediaType(data)).toBe('video')
    })
    
    it('should handle unknown types', () => {
      const data = { id: 1 }
      expect(MediaTypeDetector.detectMediaType(data)).toBe('unknown')
    })
  })
  
  describe('URL building', () => {
    it('should build PDF URL', () => {
      const url = MediaTypeDetector.buildPdfUrl(samplePdfData)
      expect(url).toBe('/api/pdf/1/stream/')
    })
    
    it('should build video URL', () => {
      const url = MediaTypeDetector.buildVideoUrl(sampleVideoData)
      expect(url).toBe('/api/video/2/stream/')
    })
    
    it('should return null for wrong media type', () => {
      const url = MediaTypeDetector.buildPdfUrl(sampleVideoData)
      expect(url).toBeNull()
    })
  })
})

describe('AnonymizationProcessor', () => {
  const sampleText = `
Endoscopy Report
Patient: John Doe
DOB: 01.01.1990
Date: 15.03.2023
Examiner: Dr. Smith

Findings: Normal mucosa observed.
Conclusion: No abnormalities detected.
  `
  
  describe('anonymizeText', () => {
    it('should anonymize patient names', () => {
      const patientData = {
        patientFirstName: 'John',
        patientLastName: 'Doe'
      }
      
      const anonymized = AnonymizationProcessor.anonymizeText(sampleText, patientData)
      
      expect(anonymized).not.toContain('John')
      expect(anonymized).not.toContain('Doe')
      expect(anonymized).toContain('[PATIENT_FIRST_NAME]')
      expect(anonymized).toContain('[PATIENT_LAST_NAME]')
    })
    
    it('should anonymize dates', () => {
      const patientData = {
        patientDob: '1990-01-01'
      }
      
      const anonymized = AnonymizationProcessor.anonymizeText(sampleText, patientData)
      
      expect(anonymized).not.toContain('01.01.1990')
      expect(anonymized).toContain('[PATIENT_DOB]')
    })
    
    it('should handle empty text', () => {
      const result = AnonymizationProcessor.anonymizeText('', {})
      expect(result).toBe('')
    })
  })
  
  describe('extractMetadataFromText', () => {
    it('should extract patient name', () => {
      const metadata = AnonymizationProcessor.extractMetadataFromText(sampleText)
      
      expect(metadata.patientFirstName).toBe('John')
      expect(metadata.patientLastName).toBe('Doe')
    })
    
    it('should extract DOB', () => {
      const metadata = AnonymizationProcessor.extractMetadataFromText(sampleText)
      
      expect(metadata.patientDob).toBe('1990-01-01')
    })
    
    it('should extract examination date', () => {
      const metadata = AnonymizationProcessor.extractMetadataFromText(sampleText)
      
      expect(metadata.examinationDate).toBe('2023-03-15')
    })
    
    it('should handle empty text', () => {
      const metadata = AnonymizationProcessor.extractMetadataFromText('')
      
      expect(Object.keys(metadata)).toHaveLength(0)
    })
  })
  
  describe('convertToGermanDate', () => {
    it('should convert ISO to German format', () => {
      expect(AnonymizationProcessor.convertToGermanDate('2023-01-15')).toBe('15.01.2023')
    })
    
    it('should handle invalid format', () => {
      expect(AnonymizationProcessor.convertToGermanDate('invalid')).toBeNull()
    })
  })
})

describe('Integration Tests', () => {
  it('should handle complete PDF processing workflow', () => {
    const samplePdf: PatientData = {
      id: 1,
      originalText: 'Patient: John Doe\nDOB: 01.01.1990\nFindings: Normal',
      file: '/api/pdf/1/stream/',
      fileType: 'pdf'
    }
    
    // Detect media type
    expect(MediaTypeDetector.isPdf(samplePdf)).toBe(true)
    
    // Extract metadata
    const metadata = AnonymizationProcessor.extractMetadataFromText(samplePdf.originalText!)
    expect(metadata.patientFirstName).toBe('John')
    expect(metadata.patientLastName).toBe('Doe')
    
    // Validate extracted data
    const nameValidation = AnonymizationValidator.validatePatientName(
      metadata.patientFirstName!,
      metadata.patientLastName!
    )
    expect(nameValidation.isValid).toBe(true)
    
    const dobValidation = AnonymizationValidator.validateDateOfBirth(metadata.patientDob!)
    expect(dobValidation.isValid).toBe(true)
    
    // Anonymize text
    const anonymized = AnonymizationProcessor.anonymizeText(samplePdf.originalText!, metadata)
    expect(anonymized).toContain('[PATIENT_FIRST_NAME]')
    expect(anonymized).toContain('[PATIENT_DOB]')
  })
  
  it('should handle validation errors gracefully', () => {
    const invalidData = {
      patientFirstName: '',
      patientLastName: 'Doe',
      patientDob: 'invalid-date'
    }
    
    const nameValidation = AnonymizationValidator.validatePatientName(
      invalidData.patientFirstName,
      invalidData.patientLastName
    )
    expect(nameValidation.isValid).toBe(false)
    
    const dobValidation = AnonymizationValidator.validateDateOfBirth(invalidData.patientDob)
    expect(dobValidation.isValid).toBe(false)
    
    // Should still be able to process partial data
    const anonymized = AnonymizationProcessor.anonymizeText('Test text', invalidData)
    expect(typeof anonymized).toBe('string')
  })
})
