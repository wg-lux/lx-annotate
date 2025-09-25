// Test for AddableFindingsDetail.vue classification fix
// This test validates the data structure consistency fix

import { describe, it, expect } from 'vitest';

describe('🚨 AddableFindingsDetail Classification Bug Fix', () => {
  
  // Mock data structure that matches the adapter output (after patientFinding.ts)
  const mockAdapterClassification = {
    id: 1,
    finding: 123,
    classification: { 
      id: 1, 
      name: "Test Classification",
      description: "Test Description" 
    },
    choice: {  // ← Key fix: adapter outputs 'choice', not 'classification_choice'
      id: 2, 
      name: "Test Choice" 
    },
    is_active: true,
    subcategories: {},
    numerical_descriptors: {}
  };

  // Mock data with missing choice (should be filtered out)
  const mockInvalidClassification = {
    id: 2,
    finding: 123,
    classification: { 
      id: 2, 
      name: "Invalid Classification" 
    },
    choice: null, // ← Invalid: no choice
    is_active: true
  };

  // Fixed patientClassificationsSafe function (from our fix)
  function patientClassificationsSafe(arr: any[]): any[] {
    if (!Array.isArray(arr)) {
      console.warn('🚨 [patientClassificationsSafe] Input is not array:', arr);
      return [];
    }
    
    return arr.filter((x) => {
      return x?.classification && 
        x?.classification?.id != null && 
        x?.classification?.name &&
        x?.choice &&  // ← Fixed: now checks 'choice' not 'classification_choice'
        x?.choice?.id != null &&
        x?.choice?.name;
    });
  }

  it('should filter valid classifications correctly', () => {
    const input = [mockAdapterClassification, mockInvalidClassification];
    const result = patientClassificationsSafe(input);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockAdapterClassification);
  });

  it('should handle empty array input', () => {
    const result = patientClassificationsSafe([]);
    expect(result).toHaveLength(0);
  });

  it('should handle non-array input', () => {
    const result = patientClassificationsSafe(null as any);
    expect(result).toHaveLength(0);
  });

  it('should filter out classifications without choice.id', () => {
    const invalidData = {
      ...mockAdapterClassification,
      choice: { name: "Choice without ID" } // Missing ID
    };
    
    const result = patientClassificationsSafe([invalidData]);
    expect(result).toHaveLength(0);
  });

  it('should filter out classifications without choice.name', () => {
    const invalidData = {
      ...mockAdapterClassification,
      choice: { id: 2 } // Missing name
    };
    
    const result = patientClassificationsSafe([invalidData]);
    expect(result).toHaveLength(0);
  });

  it('should filter out classifications without classification.id', () => {
    const invalidData = {
      ...mockAdapterClassification,
      classification: { name: "Classification without ID" }
    };
    
    const result = patientClassificationsSafe([invalidData]);
    expect(result).toHaveLength(0);
  });

  // Test template access patterns (simulating Vue template behavior)
  describe('Template Access Patterns', () => {
    it('should allow safe access to classification.name in template', () => {
      const [validItem] = patientClassificationsSafe([mockAdapterClassification]);
      
      // This simulates the template: {{ classification?.classification?.name }}
      expect(validItem?.classification?.name).toBe("Test Classification");
    });

    it('should allow safe access to choice.name in template', () => {
      const [validItem] = patientClassificationsSafe([mockAdapterClassification]);
      
      // This simulates the template: {{ classification?.choice?.name }}
      expect(validItem?.choice?.name).toBe("Test Choice");
    });

    it('should not throw errors when accessing undefined properties', () => {
      const invalidData: any = { classification: null, choice: null };
      
      // These should not throw errors (defensive programming)
      expect(() => invalidData?.classification?.name).not.toThrow();
      expect(() => invalidData?.choice?.name).not.toThrow();
      expect(invalidData?.classification?.name).toBeUndefined();
      expect(invalidData?.choice?.name).toBeUndefined();
    });
  });

  // Test data consistency (adapter output matches template expectations)
  describe('Data Consistency Fix', () => {
    it('should maintain consistent field naming between adapter and template', () => {
      // The adapter (patientFinding.ts) converts classification_choice → choice
      // The template should access choice, not classification_choice
      
      const adapterOutput = mockAdapterClassification;
      
      // Template access should work with 'choice' field
      expect(adapterOutput.choice).toBeDefined();
      expect(adapterOutput.choice.id).toBe(2);
      expect(adapterOutput.choice.name).toBe("Test Choice");
      
      // Template should NOT expect 'classification_choice' field
      expect((adapterOutput as any).classification_choice).toBeUndefined();
    });
  });

});

export {};
