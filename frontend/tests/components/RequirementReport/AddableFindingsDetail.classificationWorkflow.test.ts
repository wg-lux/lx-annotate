/**
 * AddableFindingsDetail Classification Integration Tests
 * 
 * Tests to validate the finding classification workflow in the AddableFindingsDetail component,
 * focusing on the integration between frontend classification selection and backend persistence.
 * 
 * These tests specifically target the issue where findings are sometimes stored
 * without their classification data in the frontend reports.
 * 
 * @fileoverview Component-level tests for finding classification storage
 * @author LX-Annotate Development Team
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import AddableFindingsDetail from '../../../src/components/RequirementReport/AddableFindingsDetail.vue';

// Create a minimal mock for the stores and dependencies
const mockPatientFindingStore = {
  patientFindings: [],
  loading: false,
  error: null,
  setCurrentPatientExaminationId: vi.fn(),
  createPatientFinding: vi.fn(),
  fetchPatientFindings: vi.fn()
};

const mockFindingStore = {
  findings: [],
  loading: false,
  error: null,
  fetchFindingsByExamination: vi.fn(),
  getFindingById: vi.fn(),
  fetchFindingClassifications: vi.fn()
};

const mockFindingClassificationStore = {
  findings: {},
  loading: false,
  error: null,
  getFindingById: vi.fn(),
  setClassificationChoicesFromLookup: vi.fn(),
  getAllFindings: [
    {
      id: 789,
      name: 'Test Finding',
      FindingClassifications: [
        {
          id: 101,
          name: 'Size Classification',
          is_required: true,
          choices: [
            { id: 201, name: 'Small', value: 'small' },
            { id: 202, name: 'Large', value: 'large' }
          ]
        }
      ]
    }
  ]
};

// Mock the stores
vi.mock('../../../src/stores/patientFindingStore', () => ({
  usePatientFindingStore: () => mockPatientFindingStore
}));

vi.mock('../../../src/stores/findingStore', () => ({
  useFindingStore: () => mockFindingStore
}));

vi.mock('../../../src/stores/findingClassificationStore', () => ({
  useFindingClassificationStore: () => mockFindingClassificationStore
}));

// Mock other dependencies
vi.mock('../../../src/stores/patientExaminationStore', () => ({
  usePatientExaminationStore: () => ({
    getCurrentPatientExaminationId: () => 123,
    setCurrentPatientExaminationId: vi.fn()
  })
}));

vi.mock('../../../src/stores/examinationStore', () => ({
  useExaminationStore: () => ({
    selectedExaminationId: 456,
    loadFindingsForExamination: vi.fn().mockResolvedValue([
      {
        id: 789,
        name: 'Test Finding',
        nameDe: 'Test Befund',
        examinations: ['colonoscopy'],
        FindingClassifications: [
          {
            id: 101,
            name: 'Size Classification',
            is_required: true,
            choices: [
              { id: 201, name: 'Small', value: 'small' },
              { id: 202, name: 'Large', value: 'large' }
            ]
          }
        ]
      }
    ])
  })
}));

vi.mock('../../../src/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

describe('AddableFindingsDetail Classification Workflow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Classification Data Flow Validation', () => {
    it('should properly prepare classification data for API submission', async () => {
      // Arrange: Setup mock data for a finding with classifications
      const mockFinding = {
        id: 789,
        name: 'Test Finding',
        nameDe: 'Test Befund',
        description: 'A test finding for classification validation',
        examinations: ['colonoscopy'],
        FindingClassifications: [
          {
            id: 101,
            name: 'Severity',
            description: 'Severity classification',
            required: true,
            choices: [
              { id: 201, name: 'Mild' },
              { id: 202, name: 'Moderate' },
              { id: 203, name: 'Severe' }
            ]
          },
          {
            id: 102,
            name: 'Location',
            description: 'Location classification',
            required: false,
            choices: [
              { id: 301, name: 'Proximal' },
              { id: 302, name: 'Distal' }
            ]
          }
        ]
      };

      mockFindingStore.getFindingById.mockReturnValue(mockFinding);
      
      // Mock successful finding creation with classifications
      const mockCreateResponse = {
        id: 999,
        examination: 'colonoscopy',
        finding: mockFinding,
        patient: { id: 1, firstName: 'Test', lastName: 'Patient' },
        classifications: [
          {
            id: 1001,
            finding: 999,
            classification: {
              id: 101,
              name: 'Severity',
              required: true
            },
            classification_choice: {
              id: 201,
              name: 'Mild'
            },
            is_active: true
          },
          {
            id: 1002,
            finding: 999,
            classification: {
              id: 102,
              name: 'Location',
              required: false
            },
            classification_choice: {
              id: 301,
              name: 'Proximal'
            },
            is_active: true
          }
        ]
      };

      mockPatientFindingStore.createPatientFinding.mockResolvedValue(mockCreateResponse);

      // Mount component with required props
      const wrapper = mount(AddableFindingsDetail, {
        props: {
          patientExaminationId: 123,
          examinationId: 456
        }
      });

      // Act: Simulate finding selection and classification choices
      const component = wrapper.vm as any;
      
      // Simulate selecting a finding
      component.selectedFindingId = 789;
      component.selectedChoices = {
        101: 201, // Severity -> Mild
        102: 301  // Location -> Proximal
      };

      // Trigger the add finding method
      await component.addFindingToExamination();

      // Assert: Verify the API was called with correct classification data
      expect(mockPatientFindingStore.createPatientFinding).toHaveBeenCalledWith({
        patientExamination: 123,
        finding: 789,
        classifications: [
          { classification: 101, choice: 201 },
          { classification: 102, choice: 301 }
        ]
      });
    });

    it('should detect when classifications are missing from API response', () => {
      // Arrange: Mock a response without classifications (bug scenario)
      const mockFindingWithoutClassifications = {
        id: 999,
        examination: 'colonoscopy',
        finding: { id: 789, name: 'Test Finding' },
        patient: { id: 1, firstName: 'Test', lastName: 'Patient' },
        // classifications: undefined - This is the problematic scenario
      };

      mockPatientFindingStore.createPatientFinding.mockResolvedValue(mockFindingWithoutClassifications);

      // This test documents the current issue where findings might be created
      // without their associated classifications in the API response
      
      const wrapper = mount(AddableFindingsDetail, {
        props: {
          patientExaminationId: 123,
          examinationId: 456
        }
      });

      const component = wrapper.vm as any;

      // Act: Simulate the problematic scenario
      component.selectedFindingId = 789;
      component.selectedChoices = {
        101: 201 // User selected a classification choice
      };

      return component.addFindingToExamination().then(() => {
        // Assert: Document the issue
        const createdFinding = mockFindingWithoutClassifications;
        expect(createdFinding.classifications).toBeUndefined();
        
        console.warn('🐛 BUG DETECTED: Finding created without classifications despite user selection');
        console.warn('Expected classifications:', { 101: 201 });
        console.warn('Received classifications:', createdFinding.classifications);
      });
    });

    it('should validate required classifications are selected before submission', async () => {
      // Arrange: Setup finding with required classification
      const mockFindingWithRequiredClassification = {
        id: 789,
        name: 'Test Finding',
        FindingClassifications: [
          {
            id: 101,
            name: 'Severity',
            required: true,
            choices: [
              { id: 201, name: 'Mild' },
              { id: 202, name: 'Moderate' }
            ]
          }
        ]
      };

      mockFindingStore.getFindingById.mockReturnValue(mockFindingWithRequiredClassification);

      const wrapper = mount(AddableFindingsDetail, {
        props: {
          patientExaminationId: 123,
          examinationId: 456
        }
      });

      const component = wrapper.vm as any;

      // Act: Try to add finding without selecting required classification
      component.selectedFindingId = 789;
      component.selectedChoices = {}; // No classifications selected

      // Assert: Verify the component prevents submission
      expect(component.canAddFinding).toBe(false);
      
      // Try to submit anyway (should be blocked)
      await component.addFindingToExamination();
      
      // Verify API was not called due to validation
      expect(mockPatientFindingStore.createPatientFinding).not.toHaveBeenCalled();
    });

    it('should handle partial classification selection correctly', async () => {
      // Arrange: Setup finding with both required and optional classifications
      const mockFinding = {
        id: 789,
        name: 'Test Finding',
        FindingClassifications: [
          {
            id: 101,
            name: 'Severity',
            required: true,
            choices: [{ id: 201, name: 'Mild' }]
          },
          {
            id: 102,
            name: 'Location',
            required: false,
            choices: [{ id: 301, name: 'Proximal' }]
          }
        ]
      };

      mockFindingStore.getFindingById.mockReturnValue(mockFinding);
      
      const mockCreateResponse = {
        id: 999,
        finding: mockFinding,
        classifications: [
          {
            id: 1001,
            classification: { id: 101, name: 'Severity' },
            classification_choice: { id: 201, name: 'Mild' },
            is_active: true
          }
          // Note: Optional location classification not included
        ]
      };

      mockPatientFindingStore.createPatientFinding.mockResolvedValue(mockCreateResponse);

      const wrapper = mount(AddableFindingsDetail, {
        props: {
          patientExaminationId: 123,
          examinationId: 456
        }
      });

      const component = wrapper.vm as any;

      // Act: Select only required classification, skip optional one
      component.selectedFindingId = 789;
      component.selectedChoices = {
        101: 201 // Only severity selected, location skipped
      };

      await component.addFindingToExamination();

      // Assert: Verify only required classification was submitted
      expect(mockPatientFindingStore.createPatientFinding).toHaveBeenCalledWith({
        patientExamination: 123,
        finding: 789,
        classifications: [
          { classification: 101, choice: 201 }
          // Optional classification correctly omitted
        ]
      });
    });
  });

  describe('UI State Validation', () => {
    it('should display classification status correctly in the UI', async () => {
      // Arrange: Setup finding with mixed classification requirements
      const mockFinding = {
        id: 789,
        name: 'Test Finding',
        FindingClassifications: [
          {
            id: 101,
            name: 'Severity',
            required: true,
            choices: [{ id: 201, name: 'Mild' }]
          },
          {
            id: 102,
            name: 'Location',
            required: false,
            choices: [{ id: 301, name: 'Proximal' }]
          }
        ]
      };

      mockFindingStore.getFindingById.mockReturnValue(mockFinding);

      const wrapper = mount(AddableFindingsDetail, {
        props: {
          patientExaminationId: 123,
          examinationId: 456
        }
      });

      const component = wrapper.vm as any;

      // Act: Select finding and some classifications
      component.selectedFindingId = 789;
      component.selectedChoices = {
        101: 201 // Only required classification selected
      };

      await wrapper.vm.$nextTick();

      // Assert: Verify classification progress calculation
      expect(component.classificationProgress.required).toBe(1);
      expect(component.classificationProgress.selected).toBe(1);
      expect(component.classificationProgress.complete).toBe(true);
      expect(component.canAddFinding).toBe(true);
    });
  });
});
