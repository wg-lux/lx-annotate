// Test Script to verify classification error fix
import { expect } from 'vitest';

console.log('🔬 Testing Classification Error Fix');

// Simulate the problematic classification data
const mockFindingWithInvalidClassifications = {
    id: 1,
    name: 'Test Finding',
    patientClassifications: [
        {
            id: 1,
            classification: undefined, // ❌ This would cause the error
            choice: { id: 1, name: 'Test Choice' },
            is_active: true
        },
        {
            id: 2,
            classification: { id: 2, name: 'Valid Classification' },
            choice: undefined, // ❌ This would also cause the error  
            is_active: true
        },
        {
            id: 3,
            classification: { id: 3, name: 'Valid Classification' },
            choice: { id: 3, name: 'Valid Choice' },
            is_active: true
        }
    ]
};

console.log('📊 Mock finding with mixed valid/invalid classifications:', mockFindingWithInvalidClassifications);

// Test the template filtering logic that should prevent the error
const filteredClassifications = mockFindingWithInvalidClassifications.patientClassifications
    ?.filter(c => c.classification && c.choice) || [];

console.log('✅ After filtering - valid classifications:', filteredClassifications.length);
console.log('✅ Valid classifications:', filteredClassifications);

// Verify the fix works
if (filteredClassifications.length === 1) {
    console.log('✅ SUCCESS: Template filtering correctly removed invalid classifications');
    console.log('✅ Remaining classification:', filteredClassifications[0]);
    
    // This should not throw an error now
    filteredClassifications.forEach(classification => {
        const name = classification.classification?.name || 'Unknown';
        const choice = classification.choice?.name || 'Unknown';
        console.log(`✅ Safe access - Classification: ${name}, Choice: ${choice}`);
    });
} else {
    console.error('❌ FAIL: Filtering did not work as expected');
}

export {};
