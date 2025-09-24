import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import RequirementGenerator from '../../../src/components/RequirementReport/RequirementGenerator.vue';

// Mock non-Pinia dependencies only
vi.mock('../../../src/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  }
}));

// Simple mount utility with createTestingPinia
function mountComponent(options = {}) {
  const wrapper = mount(RequirementGenerator, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn,
          stubActions: false,
        })
      ],
      stubs: {
        AddableFindingsDetail: true,
        FindingsDetail: true,
        PatientAdder: true,
      },
    },
    ...options,
  });

  // Access stores after mounting and set up mock data
  const patientStore = wrapper.vm.$pinia.state.value.patient || {};
  const examinationStore = wrapper.vm.$pinia.state.value.examination || {};

  // Set mock data directly on the store states
  Object.assign(patientStore, {
    patients: [
      { id: 1, firstName: 'John', lastName: 'Doe' },
      { id: 2, firstName: 'Jane', lastName: 'Smith' },
    ],
    genders: [],
    centers: [],
    isLoading: false,
    isError: false,
    error: null,
  });

  Object.assign(examinationStore, {
    examinations: [
      { id: 1, displayName: 'Blood Test' },
      { id: 2, displayName: 'X-Ray' },
    ],
    isLoading: false,
    isError: false,
    error: null,
  });

  return wrapper;
}

describe('RequirementGenerator - Simplified Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  describe('Basic rendering', () => {
    it('should render the main title', () => {
      const wrapper = mountComponent();
      expect(wrapper.text()).toContain('1. Patient und Untersuchung auswählen');
    });

    it('should render patient and examination selects', () => {
      const wrapper = mountComponent();
      expect(wrapper.find('#patient-select').exists()).toBe(true);
      expect(wrapper.find('#examination-select').exists()).toBe(true);
    });

    it('should disable examination select initially', () => {
      const wrapper = mountComponent();
      const examinationSelect = wrapper.find('#examination-select');
      expect(examinationSelect.attributes('disabled')).toBeDefined();
    });
  });

  describe('Patient selection', () => {
    it('should populate patient options', async () => {
      const wrapper = mountComponent();
      
      // Wait for component to be fully mounted and reactive
      await nextTick();
      
      const patientSelect = wrapper.find('#patient-select');
      const options = patientSelect.findAll('option');
      
      expect(options.length).toBeGreaterThan(2); // At least disabled option + 2 patients
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Jane Smith');
    });

    it('should enable examination select when patient is selected', async () => {
      const wrapper = mountComponent();
      
      // Wait for initial mount
      await nextTick();
      
      const patientSelect = wrapper.find('#patient-select');
      await patientSelect.setValue('1'); // Use string value for select elements
      
      // Wait for reactivity to update
      await nextTick();

      const examinationSelect = wrapper.find('#examination-select');
      expect(examinationSelect.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Create PatientExamination button', () => {
    it('should be disabled initially', () => {
      const wrapper = mountComponent();
      const createButton = wrapper.find('button').element as HTMLButtonElement;
      expect(createButton.disabled).toBe(true);
    });

    it('should be enabled when both patient and examination are selected', async () => {
      const wrapper = mountComponent();

      // Wait for initial mount
      await nextTick();

      // Select patient
      const patientSelect = wrapper.find('#patient-select');
      await patientSelect.setValue('1'); // Use string value
      await nextTick();

      // Select examination
      const examinationSelect = wrapper.find('#examination-select');
      await examinationSelect.setValue('1'); // Use string value
      await nextTick();

      // Find the main create button (the primary button)
      const createButton = wrapper.find('button.btn-primary');
      expect(createButton.exists()).toBe(true);
      expect((createButton.element as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('Loading states', () => {
    it('should show loading text when patients are loading', async () => {
      const wrapper = mount(RequirementGenerator, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              stubActions: false,
            })
          ],
          stubs: {
            AddableFindingsDetail: true,
            FindingsDetail: true,
            PatientAdder: true,
          },
        },
      });

      // Set loading state after mount
      const patientStore = wrapper.vm.$pinia.state.value.patient || {};
      Object.assign(patientStore, {
        patients: [],
        isLoading: true,
        isError: false,
        error: null,
      });

      await nextTick();

      expect(wrapper.text()).toContain('Lade Patienten...');
    });
  });

  describe('Error states', () => {
    it('should display patient store errors', async () => {
      const wrapper = mount(RequirementGenerator, {
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              stubActions: false,
            })
          ],
          stubs: {
            AddableFindingsDetail: true,
            FindingsDetail: true,
            PatientAdder: true,
          },
        },
      });

      // Set error state after mount
      const patientStore = wrapper.vm.$pinia.state.value.patient || {};
      Object.assign(patientStore, {
        patients: [],
        isLoading: false,
        isError: true,
        error: 'Test patient error',
      });

      await nextTick();

      expect(wrapper.text()).toContain('Test patient error');
    });
  });
});
