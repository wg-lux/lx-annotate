import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createWebHistory } from 'vue-router';
import AnonymizationValidationComponent from '../../../src/components/Anonymizer/AnonymizationValidationComponent.vue';

// Create mock router
const mockRouter = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/anonymisierung/uebersicht', component: { template: '<div>Übersicht</div>' } }
  ]
});

// Helper function to mount component with proper setup
function mountComponentWithRouter(options: any = {}) {
  return mount(AnonymizationValidationComponent, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), mockRouter],
      ...options.global
    },
    ...options
  });
}

// Simple focused tests for core functionality
describe('AnonymizationValidationComponent - Core Functionality', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  // Helper to setup store with data
  const setupStoreWithData = (storeData: any = {}) => {
    const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
    Object.assign(anonymizationStore, {
      loading: false,
      error: null,
      current: null,
      ...storeData
    });
  };

  describe('Component Mounting and Basic Structure', () => {
    it('should mount successfully', () => {
      wrapper = mountComponentWithRouter();
      
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('.card').exists()).toBe(true);
    });

    it('should display main title', () => {
      wrapper = mountComponentWithRouter();
      
      expect(wrapper.text()).toContain('Anonymisierungsvalidierung und Annotationen');
    });

    it('should have action buttons when data is available', async () => {
      wrapper = mountComponentWithRouter();

      // Set up data so buttons are shown
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.error = null;
      anonymizationStore.current = {
        id: 1,
        reportMeta: {}
      };
      
      await nextTick();
      
      // Look for button texts that are present when data is available
      expect(wrapper.text()).toContain('Überspringen');
      expect(wrapper.text()).toContain('Ablehnen'); 
      expect(wrapper.text()).toContain('Bestätigen');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when data is loading', async () => {
      wrapper = mountComponentWithRouter();

      // Get the store and set loading state
      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = true;
      
      await nextTick();
      
      expect(wrapper.find('.spinner-border').exists()).toBe(true);
      expect(wrapper.text()).toContain('Wird geladen');
    });

    it('should show error state when there is an error', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.error = 'Test error message';
      
      await nextTick();
      
      expect(wrapper.find('.alert-danger').exists()).toBe(true);
      expect(wrapper.text()).toContain('Test error message');
    });

    it('should show info message when no items available', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.error = null;
      anonymizationStore.current = null;
      
      await nextTick();
      
      expect(wrapper.find('.alert-info').exists()).toBe(true);
      expect(wrapper.text()).toContain('Alle Anonymisierungen wurden bearbeitet');
    });
  });

  describe('Content Display', () => {
    it('should display patient information form when data is available', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.error = null;
      anonymizationStore.current = {
        id: 1,
        sensitiveMetaId: 'meta_1',
        reportMeta: {
          patientFirstName: 'John',
          patientLastName: 'Doe',
          patientGender: 'male',
          patientDob: '01.01.1990',
          examinationDate: '15.01.2023',
          casenumber: 'CASE001',
          centerName: 'Test Center'
        }
      };
      
      await nextTick();
      
      // Check for patient form elements
      expect(wrapper.text()).toContain('Patienteninformationen');
      expect(wrapper.text()).toContain('Vorname');
      expect(wrapper.text()).toContain('Nachname');
      expect(wrapper.text()).toContain('Geburtsdatum');
      expect(wrapper.text()).toContain('Fallnummer');
    });

    it('should show debug information when media type is unknown', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.error = null;
      anonymizationStore.current = {
        id: 1,
        sensitiveMetaId: null
      };
      
      await nextTick();
      
      expect(wrapper.text()).toContain('Debug-Informationen');
      expect(wrapper.text()).toContain('Current Item ID');
      expect(wrapper.text()).toContain('Is PDF');
      expect(wrapper.text()).toContain('Is Video');
    });
  });

  describe('Form Interactions', () => {
    it('should handle form input changes', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.current = {
        id: 1,
        reportMeta: {
          patientFirstName: 'John',
          patientLastName: 'Doe',
          patientGender: 'male',
          patientDob: '01.01.1990'
        }
      };
      
      await nextTick();
      
      // Find and interact with form inputs
      const textInputs = wrapper.findAll('input[type="text"]');
      if (textInputs.length > 0) {
        await textInputs[0].setValue('Updated Name');
        expect(textInputs[0].element.value).toBe('Updated Name');
      }
    });

    it('should handle button clicks', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.current = { id: 1, reportMeta: {} };
      
      await nextTick();
      
      // Try to click skip button
      const skipButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Überspringen')
      );
      
      if (skipButton) {
        await skipButton.trigger('click');
        // Button click should not throw error
        expect(true).toBe(true);
      }
    });
  });

  describe('Media Type Detection', () => {
    it('should detect when no valid media type is present', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.current = {
        id: 1,
        sensitiveMetaId: null
      };
      
      await nextTick();
      
      // Should show unknown format message
      expect(wrapper.text()).toContain('Unbekanntes Format');
    });

    it('should show appropriate validation message', async () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      
      wrapper = mount(AnonymizationValidationComponent, {
        global: {
          plugins: [pinia]
        }
      });

      const anonymizationStore = wrapper.vm.$pinia._s.get('anonymization');
      anonymizationStore.loading = false;
      anonymizationStore.current = {
        id: 1,
        reportMeta: {
          centerName: 'Test Center'
        }
      };
      
      await nextTick();
      
      expect(wrapper.text()).toContain('Validierung:');
      expect(wrapper.text()).toContain('Test Center');
    });
  });
});
