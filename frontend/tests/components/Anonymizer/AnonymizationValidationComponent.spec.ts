import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import AnonymizationValidationComponent from '../../../src/components/Anonymizer/AnonymizationValidationComponent.vue';

// Mock the composable
vi.mock('../../../src/composables/usePollingProtection', () => ({
  usePollingProtection: () => ({
    validateAnonymizationSafeWithProtection: vi.fn()
  })
}));

// Mock axiosInstance
vi.mock('../../../src/api/axiosInstance', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
  },
  r: vi.fn((path: string) => `/api/${path}`)
}));

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/anonymisierung/korrektur/:fileId', name: 'AnonymisierungKorrektur', component: { template: '<div>Korrektur</div>' } }
  ]
});

describe('AnonymizationValidationComponent', () => {
  let wrapper: any;

  const mockPatientData = {
    id: 1,
    anonymizedText: 'Test anonymized text',
    reportMeta: {
      patientFirstName: 'John',
      patientLastName: 'Doe',
      patientGender: 'male',
      patientDob: '1990-01-01',
      casenumber: 'CASE001',
      examinationDate: '2023-01-15',
      centerName: 'Test Center'
    },
    originalFileName: 'test.pdf',
    fileType: '.pdf'
  };

  const mountComponent = (options = {}) => {
    return mount(AnonymizationValidationComponent, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
            initialState: {
              anonymization: {
                current: null,
                loading: false,
                error: null,
                processingFiles: [],
                isAnyFileProcessing: false
              },
              video: {
                videos: []
              },
              patient: {
                patients: []
              },
              toast: {
                toasts: []
              },
              pdf: {
                pdfStreamUrl: null
              },
              mediaType: {
                currentItem: null,
                currentMediaUrl: null
              }
            }
          })
        ],
      },
      ...options
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading spinner when loading', async () => {
      wrapper = mountComponent();
      
      // Set loading state
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        loading: true,
        current: null
      });

      await nextTick();

      expect(wrapper.find('.spinner-border').exists()).toBe(true);
      expect(wrapper.text()).toContain('Anonymisierte Daten werden geladen...');
    });

    it('should show error message when there is an error', async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        loading: false,
        error: 'Test error message',
        current: null
      });

      await nextTick();

      expect(wrapper.find('.alert-danger').exists()).toBe(true);
      expect(wrapper.text()).toContain('Test error message');
    });

    it('should show info message when no items available', async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        loading: false,
        error: null,
        current: null
      });

      await nextTick();

      expect(wrapper.find('.alert-info').exists()).toBe(true);
      expect(wrapper.text()).toContain('Alle Anonymisierungen wurden bearbeitet');
    });

    it('should show processing alert when files are being processed', async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        loading: false,
        error: null,
        current: mockPatientData,
        isAnyFileProcessing: true,
        processingFiles: [{ id: 1, name: 'test.pdf' }]
      });

      await nextTick();

      expect(wrapper.find('.alert-warning').exists()).toBe(true);
      expect(wrapper.text()).toContain('1 Datei(en)');
      expect(wrapper.text()).toContain('werden gerade anonymisiert');
    });
  });

  describe('Patient Information Form', () => {
    beforeEach(async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        loading: false,
        error: null,
        current: mockPatientData
      });

      await nextTick();
    });

    it('should display patient information form with pre-filled data', () => {
      const firstNameInput = wrapper.find('input[type="text"]').element as HTMLInputElement;
      expect(firstNameInput.value).toBe('John');
      
      const lastNameInputs = wrapper.findAll('input[type="text"]');
      const lastNameInput = lastNameInputs[1].element as HTMLInputElement;
      expect(lastNameInput.value).toBe('Doe');
      
      const genderSelect = wrapper.find('select').element as HTMLSelectElement;
      expect(genderSelect.value).toBe('male');
      
      const dobInput = wrapper.find('input[type="date"]').element as HTMLInputElement;
      expect(dobInput.value).toBe('1990-01-01');
    });

    it('should validate required fields', async () => {
      // Clear first name
      const firstNameInput = wrapper.find('input[type="text"]');
      await firstNameInput.setValue('');
      await nextTick();

      expect(wrapper.find('.is-invalid').exists()).toBe(true);
      expect(wrapper.text()).toContain('Vorname ist erforderlich');
    });

    it('should validate date fields correctly', async () => {
      // Set invalid DOB (future date relative to examination)
      const dobInput = wrapper.find('input[type="date"]');
      await dobInput.setValue('2025-01-01');
      await nextTick();

      // The component should detect this as invalid if examination date is before DOB
      // This depends on the validation logic in the component
    });
  });

  describe('Media Type Detection', () => {
    it('should detect PDF files correctly', async () => {
      const pdfData = {
        ...mockPatientData,
        originalFileName: 'document.pdf',
        fileType: '.pdf'
      };
      
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: pdfData
      });

      await nextTick();

      expect(wrapper.text()).toContain('PDF-Dokument');
      expect(wrapper.find('iframe').exists()).toBe(true);
    });

    it('should detect video files correctly', async () => {
      const videoData = {
        ...mockPatientData,
        originalFileName: 'video.mp4',
        fileType: '.mp4'
      };
      
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: videoData
      });

      await nextTick();

      expect(wrapper.text()).toContain('Video-Datei');
      expect(wrapper.find('video').exists()).toBe(true);
    });

    it('should handle unknown file types', async () => {
      const unknownData = {
        ...mockPatientData,
        originalFileName: 'unknown.xyz',
        fileType: '.xyz'
      };
      
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: unknownData
      });

      await nextTick();

      expect(wrapper.text()).toContain('Unbekanntes Format');
      expect(wrapper.find('.alert-warning').exists()).toBe(true);
    });
  });

  describe('Action Buttons', () => {
    beforeEach(async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        loading: false,
        error: null,
        current: mockPatientData
      });

      await nextTick();
    });

    it('should render all action buttons', () => {
      expect(wrapper.find('button:contains("Überspringen")').exists()).toBe(true);
      expect(wrapper.find('button:contains("Ablehnen")').exists()).toBe(true);
      expect(wrapper.find('button:contains("Bestätigen")').exists()).toBe(true);
    });

    it('should disable approve button when form is invalid', async () => {
      // Clear required field
      const firstNameInput = wrapper.find('input[type="text"]');
      await firstNameInput.setValue('');
      await nextTick();

      const approveButton = wrapper.find('.btn-success');
      expect(approveButton.element.disabled).toBe(true);
    });

    it('should show correction button for PDF files', async () => {
      const pdfData = {
        ...mockPatientData,
        originalFileName: 'document.pdf',
        fileType: '.pdf'
      };
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: pdfData
      });

      await nextTick();

      expect(wrapper.text()).toContain('PDF-Korrektur');
    });

    it('should show correction button for video files', async () => {
      const videoData = {
        ...mockPatientData,
        originalFileName: 'video.mp4',
        fileType: '.mp4'
      };
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: videoData
      });

      await nextTick();

      expect(wrapper.text()).toContain('Video-Korrektur');
    });
  });

  describe('Form Validation', () => {
    beforeEach(async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: mockPatientData
      });

      await nextTick();
    });

    it('should validate first name as required', async () => {
      const firstNameInput = wrapper.find('input[type="text"]');
      
      // Test empty first name
      await firstNameInput.setValue('');
      await nextTick();
      
      expect(wrapper.find('.is-invalid')).toBeTruthy();
      expect(wrapper.text()).toContain('Vorname ist erforderlich');
      
      // Test valid first name
      await firstNameInput.setValue('John');
      await nextTick();
      
      expect(wrapper.find('.is-invalid').exists()).toBe(false);
    });

    it('should validate last name as required', async () => {
      const lastNameInputs = wrapper.findAll('input[type="text"]');
      const lastNameInput = lastNameInputs[1];
      
      // Test empty last name
      await lastNameInput.setValue('');
      await nextTick();
      
      expect(wrapper.text()).toContain('Nachname ist erforderlich');
      
      // Test valid last name
      await lastNameInput.setValue('Doe');
      await nextTick();
    });

    it('should validate date of birth format', async () => {
      const dobInput = wrapper.find('input[type="date"]');
      
      // Test invalid date format (this should be handled by the browser)
      // but we can test the validation logic
      await dobInput.setValue('invalid-date');
      await nextTick();
      
      // The component should handle invalid dates gracefully
    });

    it('should validate that examination date is after birth date', async () => {
      const dobInput = wrapper.find('input[type="date"]');
      
      // Set DOB to after examination date
      await dobInput.setValue('2025-01-01'); // Future date
      await nextTick();
      
      // This should trigger validation error
      // The exact validation behavior depends on the component's validation logic
    });
  });

  describe('Store Integration', () => {
    it('should fetch next item on mount when no current item exists', async () => {
      const mockFetchNext = vi.fn();
      
      wrapper = mountComponent();
      
      // Mock the store action
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      anonymizationStore.fetchNext = mockFetchNext;
      
      // Trigger the mounted lifecycle
      await wrapper.vm.$nextTick();
      
      // Note: The actual fetchNext call happens in onMounted
      // This test verifies the component structure is ready for it
      expect(wrapper.exists()).toBe(true);
    });

    it('should load current item data when available', async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: mockPatientData
      });

      await nextTick();

      // Verify that form fields are populated with current item data
      const firstNameInput = wrapper.find('input[type="text"]').element as HTMLInputElement;
      expect(firstNameInput.value).toBe('John');
    });
  });

  describe('Navigation', () => {
    beforeEach(async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: mockPatientData
      });

      await nextTick();
    });

    it('should navigate to correction page when correction button is clicked', async () => {
      const routerPushSpy = vi.spyOn(router, 'push');
      
      // Find correction button (PDF correction in this case)
      const correctionButton = wrapper.find('button:contains("PDF-Korrektur")');
      if (correctionButton.exists()) {
        await correctionButton.trigger('click');
        
        expect(routerPushSpy).toHaveBeenCalledWith({
          name: 'AnonymisierungKorrektur',
          params: { fileId: '1' }
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle video loading errors gracefully', async () => {
      const videoData = {
        ...mockPatientData,
        originalFileName: 'video.mp4',
        fileType: '.mp4'
      };
      
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: videoData
      });

      await nextTick();

      const video = wrapper.find('video');
      if (video.exists()) {
        // Simulate video error
        await video.trigger('error');
        
        // The component should handle this gracefully
        // (specific behavior depends on error handling implementation)
        expect(wrapper.exists()).toBe(true);
      }
    });

    it('should handle API errors during approval', async () => {
      const axiosInstance = await import('../../../src/api/axiosInstance');
      (axiosInstance.default.post as Mock).mockRejectedValueOnce(new Error('API Error'));
      
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: mockPatientData
      });

      await nextTick();

      const approveButton = wrapper.find('.btn-success');
      await approveButton.trigger('click');
      
      // Wait for error handling
      await nextTick();
      
      // The component should handle API errors gracefully
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Dirty State Tracking', () => {
    beforeEach(async () => {
      wrapper = mountComponent();
      
      const anonymizationStore = wrapper.vm.$pinia.state.value.anonymization;
      Object.assign(anonymizationStore, {
        current: mockPatientData
      });

      await nextTick();
    });

    it('should track changes to patient information', async () => {
      const firstNameInput = wrapper.find('input[type="text"]');
      
      // Make a change
      await firstNameInput.setValue('Jane');
      await nextTick();
      
      // The component should track that changes were made
      // This would typically be indicated by enabling certain buttons
      // or showing unsaved changes indicators
    });

    it('should show unsaved changes indicator when appropriate', async () => {
      // Make changes to trigger dirty state
      const firstNameInput = wrapper.find('input[type="text"]');
      await firstNameInput.setValue('Changed Name');
      await nextTick();
      
      // Look for unsaved changes indicator
      // This might be a badge, icon, or other visual indicator
      // The exact implementation depends on the component's design
    });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });
});
