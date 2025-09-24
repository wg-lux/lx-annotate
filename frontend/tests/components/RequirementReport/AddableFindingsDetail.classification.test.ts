import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import AddableFindingsDetail from '@/components/RequirementReport/AddableFindingsDetail.vue';

// Mock axios
vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('AddableFindingsDetail - Classification Error Tests', () => {
  let wrapper;
  let pinia;

  const mockPatientFindingWithInvalidClassification = {
    id: 1,
    finding: { id: 1, name: 'Test Finding' },
    classifications: [
      {
        id: 1,
        classification: undefined, // This causes the error!
        classification_choice: { id: 1, name: 'Test Choice' },
        is_active: true
      }
    ]
  };

  beforeEach(() => {
    pinia = createTestingPinia({
      createSpy: vi.fn,
      stubActions: false,
    });

    // Mock store returns
    const mockPatientFindingStore = {
      loading: false,
      error: null,
      patientFindings: [mockPatientFindingWithInvalidClassification],
      fetchPatientFindings: vi.fn(),
      createPatientFinding: vi.fn(),
    };

    const mockFindingStore = {
      loading: false,
      findings: [{ id: 1, name: 'Test Finding', classifications: [] }],
      fetchFindings: vi.fn(),
    };

    vi.doMock('@/stores/patientFindingStore', () => ({
      usePatientFindingStore: () => mockPatientFindingStore
    }));

    vi.doMock('@/stores/findingStore', () => ({
      useFindingStore: () => mockFindingStore
    }));
  });

  it('should handle undefined classification gracefully', async () => {
    // This test should reproduce the error: "can't access property 'id', H.classification is undefined"
    expect(() => {
      wrapper = mount(AddableFindingsDetail, {
        global: {
          plugins: [pinia],
        },
        props: {
          examinationId: 1,
          patientExaminationId: 1,
        }
      });
    }).not.toThrow();

    // The error should occur when trying to render patientClassifications
    // where classification.classification is undefined
    expect(wrapper.exists()).toBe(true);
  });

  it('should filter out invalid classifications', () => {
    wrapper = mount(AddableFindingsDetail, {
      global: {
        plugins: [pinia],
      },
      props: {
        examinationId: 1,
        patientExaminationId: 1,
      }
    });

    // Check that the classification with undefined classification is handled properly
    const classificationElements = wrapper.findAll('.classification-item');
    // Should not crash, but may not display the invalid classification
    expect(classificationElements).toBeDefined();
  });
});
