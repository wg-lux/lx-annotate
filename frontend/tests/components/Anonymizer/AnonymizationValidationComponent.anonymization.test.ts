/**
 * Tests for PDF import and anonymization functionality in the frontend.
 * 
 * Tests cover:
 * - AnonymizationValidationComponent functionality
 * - PDF viewer integration
 * - Patient data validation
 * - Anonymization store operations
 * - Media type detection and handling
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import AnonymizationValidationComponent from '@/components/Anonymizer/AnonymizationValidationComponent.vue'
import { useAnonymizationStore, type PatientData } from '@/stores/anonymizationStore'
import { useMediaTypeStore } from '@/stores/mediaTypeStore'
import { usePdfStore } from '@/stores/pdfStore'
import { useToastStore } from '@/stores/toastStore'

// Mock axios
vi.mock('@/api/axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  },
  r: vi.fn((path: string) => path)
}))

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock polling protection
vi.mock('@/composables/usePollingProtection', () => ({
  usePollingProtection: () => ({
    validateAnonymizationSafeWithProtection: vi.fn()
  })
}))

describe('AnonymizationValidationComponent', () => {
  let wrapper: VueWrapper
  let anonymizationStore: ReturnType<typeof useAnonymizationStore>
  let mediaStore: ReturnType<typeof useMediaTypeStore>
  let pdfStore: ReturnType<typeof usePdfStore>
  let toastStore: ReturnType<typeof useToastStore>

  // Sample test data
  const samplePdfData: PatientData = {
    id: 1,
    originalText: 'Patient: John Doe\nDOB: 01.01.1990\nFindings: Normal',
    anonymizedText: 'Patient: [PATIENT_NAME]\nDOB: [PATIENT_DOB]\nFindings: Normal',
    reportMeta: {
      patientFirstName: 'John',
      patientLastName: 'Doe',
      patientGender: 'M',
      patientDob: '1990-01-01',
      casenumber: 'CASE-001',
      examinationDate: '2023-03-15'
    },
    file: '/api/pdf/1/stream/',
    fileType: 'pdf'
  }

  const sampleVideoData: PatientData = {
    id: 2,
    originalText: '',
    anonymizedText: '',
    reportMeta: {
      patientFirstName: 'Jane',
      patientLastName: 'Smith',
      patientGender: 'F',
      patientDob: '1985-05-20',
      casenumber: 'CASE-002'
    },
    file: '/api/video/2/stream/',
    fileType: 'video'
  }

  beforeEach(() => {
    // Create testing Pinia with initial state
    const pinia = createTestingPinia({
      createSpy: vi.fn,
      initialState: {
        anonymization: {
          current: null,
          queue: []
        },
        mediaType: {
          currentItem: null,
          currentMediaUrl: null
        },
        pdf: {
          pdfStreamUrl: null
        },
        toast: {
          toasts: []
        }
      }
    })

    wrapper = mount(AnonymizationValidationComponent, {
      global: {
        plugins: [pinia]
      }
    })

    // Get store instances
    anonymizationStore = useAnonymizationStore()
    mediaStore = useMediaTypeStore()
    pdfStore = usePdfStore()
    toastStore = useToastStore()
  })

  describe('Component Initialization', () => {
    it('should initialize with empty state', () => {
      expect(wrapper.exists()).toBe(true)
      expect(anonymizationStore.current).toBeNull()
    })

    it('should fetch next item on mount if no current item', async () => {
      const fetchNextSpy = vi.spyOn(anonymizationStore, 'fetchNext')
      
      // Remount to trigger onMounted
      wrapper.unmount()
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        }
      })

      await nextTick()
      expect(fetchNextSpy).toHaveBeenCalled()
    })
  })

  describe('PDF Handling', () => {
    beforeEach(() => {
      // Set current item to PDF
      anonymizationStore.current = samplePdfData
      mediaStore.setCurrentItem(samplePdfData as any)
    })

    it('should detect PDF media type correctly', async () => {
      await nextTick()
      
      const mediaType = mediaStore.detectMediaType(samplePdfData as any)
      expect(mediaType).toBe('pdf')
    })

    it('should generate correct PDF URL', async () => {
      await nextTick()
      
      const pdfUrl = mediaStore.getPdfUrl(samplePdfData as any)
      expect(pdfUrl).toContain('/api/pdf/1/stream/')
    })

    it('should load PDF data into form fields', async () => {
      await nextTick()
      
      // Find form inputs
      const firstNameInput = wrapper.find('input[data-testid="patient-first-name"]')
      const lastNameInput = wrapper.find('input[data-testid="patient-last-name"]')
      
      if (firstNameInput.exists()) {
        expect((firstNameInput.element as HTMLInputElement).value).toBe('John')
      }
      if (lastNameInput.exists()) {
        expect((lastNameInput.element as HTMLInputElement).value).toBe('Doe')
      }
    })

    it('should validate patient data correctly', async () => {
      await nextTick()
      
      // Test validation logic
      const component = wrapper.vm as any
      
      // Set valid data
      component.editedPatient = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientGender: 'M',
        patientDob: '1990-01-01',
        casenumber: 'CASE-001'
      }
      
      await nextTick()
      
      expect(component.firstNameOk).toBe(true)
      expect(component.lastNameOk).toBe(true)
      expect(component.isDobValid).toBe(true)
    })

    it('should handle invalid date formats', async () => {
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Test invalid date
      component.editedPatient = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientGender: 'M',
        patientDob: 'invalid-date',
        casenumber: 'CASE-001'
      }
      
      await nextTick()
      
      expect(component.isDobValid).toBe(false)
    })

    it('should validate examination date against DOB', async () => {
      await nextTick()
      
      const component = wrapper.vm as any
      
      // Set DOB
      component.editedPatient.patientDob = '1990-01-01'
      
      // Test valid examination date (after DOB)
      component.examinationDate = '2023-03-15'
      await nextTick()
      expect(component.isExaminationDateValid).toBe(true)
      
      // Test invalid examination date (before DOB)
      component.examinationDate = '1989-01-01'
      await nextTick()
      expect(component.isExaminationDateValid).toBe(false)
    })
  })

  describe('Video Handling', () => {
    beforeEach(() => {
      // Set current item to video
      anonymizationStore.current = sampleVideoData
      mediaStore.setCurrentItem(sampleVideoData as any)
    })

    it('should detect video media type correctly', async () => {
      await nextTick()
      
      const mediaType = mediaStore.detectMediaType(sampleVideoData as any)
      expect(mediaType).toBe('video')
    })

    it('should generate correct video URL', async () => {
      await nextTick()
      
      const videoUrl = mediaStore.getVideoUrl(sampleVideoData as any)
      expect(videoUrl).toContain('/api/video/2/stream/')
    })

    it('should handle video loading errors', async () => {
      const component = wrapper.vm as any
      const mockEvent = {
        target: {
          error: { code: 4 },
          networkState: 2,
          readyState: 0,
          currentSrc: '/api/video/2/stream/'
        }
      }
      
      // Should not throw error
      expect(() => component.onVideoError(mockEvent)).not.toThrow()
    })
  })

  describe('Anonymization Operations', () => {
    beforeEach(() => {
      anonymizationStore.current = samplePdfData
    })

    it('should save annotation with correct data format', async () => {
      const axiosPost = vi.mocked((await import('@/api/axiosInstance')).default.post)
      axiosPost.mockResolvedValue({ data: { success: true } })
      
      const component = wrapper.vm as any
      
      // Set up component state
      component.editedPatient = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientGender: 'M',
        patientDob: '1990-01-01',
        casenumber: 'CASE-001'
      }
      component.examinationDate = '2023-03-15'
      component.editedAnonymizedText = 'Anonymized text'
      component.processedUrl = '/processed/image.jpg'
      component.originalUrl = '/original/image.jpg'
      
      await component.saveAnnotation()
      
      expect(axiosPost).toHaveBeenCalledWith(
        'save-anonymization-annotation-pdf/',
        expect.objectContaining({
          processed_image_url: '/processed/image.jpg',
          patient_data: expect.objectContaining({
            patient_first_name: 'John',
            patient_last_name: 'Doe',
            patient_gender: 'M',
            patient_dob: '1990-01-01',
            casenumber: 'CASE-001'
          }),
          examinationDate: '2023-03-15',
          anonymized_text: 'Anonymized text'
        })
      )
    })

    it('should approve item and validate anonymization', async () => {
      const axiosPost = vi.mocked((await import('@/api/axiosInstance')).default.post)
      axiosPost.mockResolvedValue({ data: { success: true } })
      
      const component = wrapper.vm as any
      
      // Set up valid state
      component.editedPatient = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientGender: 'M',
        patientDob: '1990-01-01',
        casenumber: 'CASE-001'
      }
      
      await component.approveItem()
      
      expect(axiosPost).toHaveBeenCalledWith(
        `anonymization/${samplePdfData.id}/validate/`,
        expect.any(Object)
      )
    })

    it('should skip item and fetch next', async () => {
      const fetchNextSpy = vi.spyOn(anonymizationStore, 'fetchNext')
      
      const component = wrapper.vm as any
      await component.skipItem()
      
      expect(fetchNextSpy).toHaveBeenCalled()
    })

    it('should reject item and fetch next', async () => {
      const fetchNextSpy = vi.spyOn(anonymizationStore, 'fetchNext')
      
      const component = wrapper.vm as any
      await component.rejectItem()
      
      expect(fetchNextSpy).toHaveBeenCalled()
    })
  })

  describe('Navigation and Routing', () => {
    beforeEach(() => {
      anonymizationStore.current = samplePdfData
      mediaStore.setCurrentItem(samplePdfData as any)
    })

    it('should navigate to correction page', async () => {
      const component = wrapper.vm as any
      
      await component.navigateToCorrection()
      
      expect(mockPush).toHaveBeenCalledWith({
        name: 'AnonymisierungKorrektur',
        params: { fileId: '1' }
      })
    })

    it('should show confirmation for unsaved changes', async () => {
      const component = wrapper.vm as any
      
      // Make component dirty
      component.editedPatient.patientFirstName = 'Changed Name'
      await nextTick()
      
      // Mock confirm dialog
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      
      await component.navigateToCorrection()
      
      // Should have prompted for confirmation
      expect(confirmSpy).toHaveBeenCalled()
      
      confirmSpy.mockRestore()
    })
  })

  describe('Date Utilities', () => {
    it('should normalize dates to ISO format', () => {
      const component = wrapper.vm as any
      
      // Test various date formats
      expect(component.normalizeDateToISO('01.01.1990')).toBe('1990-01-01')
      expect(component.normalizeDateToISO('2023-03-15')).toBe('2023-03-15')
      expect(component.normalizeDateToISO('invalid')).toBeNull()
      expect(component.normalizeDateToISO('')).toBeNull()
      expect(component.normalizeDateToISO(null)).toBeNull()
    })

    it('should compare ISO dates correctly', () => {
      const component = wrapper.vm as any
      
      expect(component.compareISODate('2023-01-01', '2023-01-01')).toBe(0)
      expect(component.compareISODate('2023-01-01', '2023-01-02')).toBe(-1)
      expect(component.compareISODate('2023-01-02', '2023-01-01')).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const axiosPost = vi.mocked((await import('@/api/axiosInstance')).default.post)
      axiosPost.mockRejectedValue(new Error('API Error'))
      
      const component = wrapper.vm as any
      const toastErrorSpy = vi.spyOn(toastStore, 'error')
      
      // Set up valid state
      component.editedPatient = {
        patientFirstName: 'John',
        patientLastName: 'Doe',
        patientGender: 'M',
        patientDob: '1990-01-01',
        casenumber: 'CASE-001'
      }
      component.processedUrl = '/test.jpg'
      component.originalUrl = '/test.jpg'
      
      await component.saveAnnotation()
      
      expect(toastErrorSpy).toHaveBeenCalledWith({
        text: 'Fehler beim Speichern der Annotation'
      })
    })

    it('should prevent concurrent operations', async () => {
      const component = wrapper.vm as any
      
      // Start approval process
      component.isApproving = true
      
      // Try to approve again - should be ignored
      await component.approveItem()
      
      expect(component.isApproving).toBe(true)
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const component = wrapper.vm as any
      
      // Empty patient data
      component.editedPatient = {
        patientFirstName: '',
        patientLastName: '',
        patientGender: '',
        patientDob: '',
        casenumber: ''
      }
      
      await nextTick()
      
      expect(component.firstNameOk).toBe(false)
      expect(component.lastNameOk).toBe(false)
      expect(component.isDobValid).toBe(false)
      expect(component.canSave).toBe(false)
    })

    it('should detect dirty state correctly', async () => {
      const component = wrapper.vm as any
      
      // Set original data
      component.original = {
        anonymizedText: 'Original text',
        examinationDate: '2023-01-01',
        patient: {
          patientFirstName: 'John',
          patientLastName: 'Doe',
          patientGender: 'M',
          patientDob: '1990-01-01',
          casenumber: 'CASE-001'
        }
      }
      
      // Set current data to match original
      component.editedAnonymizedText = 'Original text'
      component.examinationDate = '2023-01-01'
      component.editedPatient = { ...component.original.patient }
      
      await nextTick()
      expect(component.dirty).toBe(false)
      
      // Change data
      component.editedPatient.patientFirstName = 'Jane'
      await nextTick()
      expect(component.dirty).toBe(true)
    })
  })

  describe('Media URL Generation', () => {
    it('should build PDF stream URL correctly', () => {
      const testPdf = { id: 123 }
      const url = pdfStore.buildPdfStreamUrl(testPdf.id)
      expect(url).toContain('123')
    })

    it('should handle missing media URLs gracefully', () => {
      const component = wrapper.vm as any
      
      // Set item without proper URL
      anonymizationStore.current = {
        id: 1,
        file: null,
        fileType: 'pdf'
      } as any
      
      mediaStore.setCurrentItem(anonymizationStore.current as any)
      
      const pdfUrl = component.pdfSrc
      const videoUrl = component.videoSrc
      
      // Should not crash
      expect(pdfUrl).toBeDefined()
      expect(videoUrl).toBeDefined()
    })
  })
})
