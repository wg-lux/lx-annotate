import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import AnonymizationValidationComponent from '../../../src/components/Anonymizer/AnonymizationValidationComponent.vue';
import { 
  mountAnonymizationComponent, 
  createMockPdfData, 
  createMockVideoData,
  setStoreState,
  waitForStoreUpdate
} from '../../utils/anonymizationTestUtils';

// Mock axios for API calls
import axios from 'axios';
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('AnonymizationValidationComponent - Store Integration', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock axios methods as functions
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Anonymization Store Integration', () => {
    beforeEach(async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: {
            current: mockData,
            loading: false,
            error: null
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should access anonymization store data', () => {
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      expect(anonymizationStore.current).toBeDefined();
      expect(anonymizationStore.current.reportMeta).toBeDefined();
    });

    it('should react to store loading state changes', async () => {
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      
      // Set loading state
      anonymizationStore.loading = true;
      await nextTick();
      
      // Component should show loading indicator
      expect(wrapper.find('.loading').exists() || wrapper.text().includes('Loading')).toBe(true);
      
      // Clear loading state
      anonymizationStore.loading = false;
      await nextTick();
      
      // Loading indicator should be gone
      expect(wrapper.find('.loading').exists()).toBe(false);
    });

    it('should handle store error states', async () => {
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      
      // Set error state
      anonymizationStore.error = 'Failed to load data';
      await nextTick();
      
      // Component should show error message
      expect(wrapper.text()).toContain('Failed to load data');
    });

    it('should clear store error on successful action', async () => {
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      
      // Set initial error
      anonymizationStore.error = 'Previous error';
      await nextTick();
      
      // Perform successful action (approve)
      const approveButton = wrapper.find('.btn-success');
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        // Error should be cleared
        expect(anonymizationStore.error).toBeNull();
      }
    });
  });

  describe('Toast Store Integration', () => {
    beforeEach(async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockData },
          toast: {
            show: vi.fn(),
            success: vi.fn(),
            error: vi.fn(),
            warning: vi.fn()
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should show success toast on approve', async () => {
      const toastStore = wrapper.vm.$pinia._s.get('toast');
      const approveButton = wrapper.find('.btn-success');
      
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        // Should call toast success method
        expect(toastStore.success).toHaveBeenCalled();
      }
    });

    it('should show error toast on API failure', async () => {
      // Mock API failure
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('API Error'));
      
      const toastStore = wrapper.vm.$pinia._s.get('toast');
      const approveButton = wrapper.find('.btn-success');
      
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        // Should call toast error method
        expect(toastStore.error).toHaveBeenCalled();
      }
    });

    it('should show warning toast on validation issues', async () => {
      const toastStore = wrapper.vm.$pinia._s.get('toast');
      
      // Clear required fields to trigger validation
      const firstNameInput = wrapper.find('input[type="text"]');
      if (firstNameInput.exists()) {
        await firstNameInput.setValue('');
        await nextTick();
        
        const approveButton = wrapper.find('.btn-success');
        await approveButton.trigger('click');
        await nextTick();
        
        // Should show warning for validation issues
        expect(toastStore.warning).toHaveBeenCalled();
      }
    });
  });

  describe('Patient Store Integration', () => {
    beforeEach(async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockData },
          patient: {
            currentPatient: null,
            createPatient: vi.fn().mockResolvedValue({ id: 123, pseudonym: 'P001' }),
            updatePatient: vi.fn()
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should create patient on approve', async () => {
      const patientStore = wrapper.vm.$pinia._s.get('patient');
      const approveButton = wrapper.find('.btn-success');
      
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        // Should call patient creation
        expect(patientStore.createPatient).toHaveBeenCalled();
      }
    });

    it('should handle patient creation with form data', async () => {
      const patientStore = wrapper.vm.$pinia._s.get('patient');
      
      // Fill form data
      const inputs = wrapper.findAll('input[type="text"]');
      if (inputs.length >= 2) {
        await inputs[0].setValue('John');
        await inputs[1].setValue('Doe');
      }
      
      const approveButton = wrapper.find('.btn-success');
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        // Should call with correct patient data
        expect(patientStore.createPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe'
          })
        );
      }
    });
  });

  describe('Video Store Integration', () => {
    beforeEach(async () => {
      const mockVideoData = createMockVideoData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockVideoData },
          mediaType: { currentType: 'video' },
          video: {
            currentVideo: mockVideoData,
            approveVideo: vi.fn(),
            rejectVideo: vi.fn()
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should interact with video store for video media', async () => {
      const videoStore = wrapper.vm.$pinia._s.get('video');
      
      expect(videoStore.currentVideo).toBeDefined();
      expect(videoStore.currentVideo).toEqual(expect.objectContaining({
        type: 'video'
      }));
    });

    it('should call video store approve method', async () => {
      const videoStore = wrapper.vm.$pinia._s.get('video');
      const approveButton = wrapper.find('.btn-success');
      
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        expect(videoStore.approveVideo).toHaveBeenCalled();
      }
    });

    it('should call video store reject method', async () => {
      const videoStore = wrapper.vm.$pinia._s.get('video');
      const rejectButton = wrapper.find('.btn-danger');
      
      if (rejectButton.exists()) {
        await rejectButton.trigger('click');
        await nextTick();
        
        expect(videoStore.rejectVideo).toHaveBeenCalled();
      }
    });
  });

  describe('Store State Synchronization', () => {
    it('should keep stores synchronized during operations', async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { current: mockData },
          patient: { createPatient: vi.fn().mockResolvedValue({ id: 123 }) },
          toast: { success: vi.fn() }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      const patientStore = wrapper.vm.$pinia._s.get('patient');
      const toastStore = wrapper.vm.$pinia._s.get('toast');
      
      // Perform approve action
      const approveButton = wrapper.find('.btn-success');
      if (approveButton.exists()) {
        await approveButton.trigger('click');
        await nextTick();
        
        // All relevant stores should be updated
        expect(patientStore.createPatient).toHaveBeenCalled();
        expect(toastStore.success).toHaveBeenCalled();
      }
    });

    it('should handle store state conflicts gracefully', async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: { 
            current: mockData,
            loading: true  // Loading state
          },
          patient: { 
            createPatient: vi.fn() 
          }
        }
      });
      await waitForStoreUpdate(wrapper);
      
      // Component should handle conflicting states (loading but trying to approve)
      const approveButton = wrapper.find('.btn-success');
      expect(approveButton.element.disabled).toBe(true);
    });
  });
});
