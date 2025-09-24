import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import AnonymizationValidationComponent from '../../../src/components/Anonymizer/AnonymizationValidationComponent.vue';
import { 
  mountAnonymizationComponent, 
  createMockPdfData, 
  createMockVideoData,
  setStoreState,
  waitForStoreUpdate,
  expectFormValidation
} from '../../utils/anonymizationTestUtils';

describe('AnonymizationValidationComponent - Form Validation', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Patient Information Validation', () => {
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

    it('should validate first name as required', async () => {
      const firstNameInput = wrapper.find('input[type="text"]');
      
      // Clear first name to trigger validation
      await firstNameInput.setValue('');
      await nextTick();
      
      expectFormValidation.toShowError(wrapper, 'firstName', 'Vorname ist erforderlich');
      expectFormValidation.buttonToBeDisabled(wrapper, '.btn-success');
    });

    it('should validate last name as required', async () => {
      const inputs = wrapper.findAll('input[type="text"]');
      const lastNameInput = inputs[1]; // Second text input should be last name
      
      await lastNameInput.setValue('');
      await nextTick();
      
      expectFormValidation.toShowError(wrapper, 'lastName', 'Nachname ist erforderlich');
    });

    it('should validate date of birth as required', async () => {
      const dobInput = wrapper.find('input[type="date"]');
      
      await dobInput.setValue('');
      await nextTick();
      
      expectFormValidation.buttonToBeDisabled(wrapper, '.btn-success');
    });

    it('should validate examination date is after birth date', async () => {
      const dobInput = wrapper.find('input[type="date"]');
      
      // Set DOB to future date (after examination date)
      await dobInput.setValue('2025-01-01');
      await nextTick();
      
      // Find examination date input (might be in a different position)
      const inputs = wrapper.findAll('input');
      const examDateInput = inputs.find((input: any) => 
        input.element.type === 'date' && input.element !== dobInput.element
      );
      
      if (examDateInput) {
        await examDateInput.setValue('2023-01-15'); // Earlier than DOB
        await nextTick();
        
        expectFormValidation.buttonToBeDisabled(wrapper, '.btn-success');
      }
    });

    it('should enable approve button when all validations pass', async () => {
      // Fill all required fields with valid data
      const inputs = wrapper.findAll('input[type="text"]');
      await inputs[0].setValue('John');  // First name
      await inputs[1].setValue('Doe');   // Last name
      
      const dobInput = wrapper.find('input[type="date"]');
      await dobInput.setValue('1990-01-01');
      
      await nextTick();
      
      expectFormValidation.buttonToBeEnabled(wrapper, '.btn-success');
    });
  });

  describe('Date Format Validation', () => {
    beforeEach(async () => {
      const mockData = createMockPdfData({
        reportMeta: {
          patientFirstName: 'John',
          patientLastName: 'Doe',
          patientGender: 'male',
          patientDob: '01.01.1990', // German format
          examinationDate: '15.01.2023', // German format
          casenumber: 'CASE001'
        }
      });
      
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: {
            current: mockData
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should handle German date format conversion', async () => {
      // Component should normalize German dates to ISO format
      const dobInput = wrapper.find('input[type="date"]');
      expect(dobInput.element.value).toBe('1990-01-01');
    });

    it('should validate converted dates correctly', async () => {
      // After conversion, dates should be valid
      expectFormValidation.buttonToBeEnabled(wrapper, '.btn-success');
    });
  });

  describe('Gender Selection', () => {
    beforeEach(async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: {
            current: mockData
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should display gender options', () => {
      const genderSelect = wrapper.find('select');
      const options = genderSelect.findAll('option');
      
      expect(options.length).toBeGreaterThanOrEqual(3);
      expect(wrapper.text()).toContain('Männlich');
      expect(wrapper.text()).toContain('Weiblich');
      expect(wrapper.text()).toContain('Divers');
    });

    it('should preselect correct gender', () => {
      const genderSelect = wrapper.find('select');
      expect(genderSelect.element.value).toBe('male');
    });

    it('should allow gender change', async () => {
      const genderSelect = wrapper.find('select');
      await genderSelect.setValue('female');
      await nextTick();
      
      expect(genderSelect.element.value).toBe('female');
    });
  });

  describe('Case Number Validation', () => {
    beforeEach(async () => {
      const mockData = createMockPdfData();
      wrapper = mountAnonymizationComponent(AnonymizationValidationComponent, {
        storeStates: {
          anonymization: {
            current: mockData
          }
        }
      });
      await waitForStoreUpdate(wrapper);
    });

    it('should display case number field', () => {
      // Case number should be displayed in form
      expect(wrapper.text()).toContain('Fallnummer');
    });

    it('should allow case number modification', async () => {
      // Find case number input (might need to be more specific)
      const inputs = wrapper.findAll('input');
      const caseNumberInput = inputs.find((input: any) => 
        input.element.value === 'CASE001'
      );
      
      if (caseNumberInput) {
        await caseNumberInput.setValue('NEW-CASE-002');
        await nextTick();
        
        expect(caseNumberInput.element.value).toBe('NEW-CASE-002');
      }
    });
  });
});
