/**
 * Test Script: Debug Classification Error
 * 
 * This script demonstrates the TypeError: can't access property "id", H.classification is undefined
 * that occurs when invalid classification data is returned from the API.
 */

console.log('🔬 [Debug] Testing Classification Error Scenario');

// Simulate the problematic data structure that causes the error
const mockPatientFindingWithInvalidClassification = {
    id: 1,
    finding: { id: 1, name: 'Test Finding' },
    classifications: [
        {
            id: 1,
            classification: undefined, // THIS CAUSES THE ERROR!
            classification_choice: { id: 1, name: 'Test Choice' },
            is_active: true
        },
        {
            id: 2,
            classification: { id: 2, name: 'Valid Classification' },
            classification_choice: undefined, // THIS ALSO CAUSES ERRORS!
            is_active: true
        },
        {
            id: 3,
            classification: { id: 3, name: 'Valid Classification' },
            classification_choice: { id: 3, name: 'Valid Choice' },
            is_active: true
        }
    ]
};

console.log('📊 [Debug] Mock data with invalid classifications:', mockPatientFindingWithInvalidClassification);

// Demonstrate the filtering logic that should prevent the error
const validClassifications = mockPatientFindingWithInvalidClassification.classifications
    .filter((cls: any) => {
        const isValid = cls.classification && cls.classification_choice;
        if (!isValid) {
            console.warn('🚫 [Debug] Would filter out invalid classification:', {
                id: cls.id,
                hasClassification: !!cls.classification,
                hasClassificationChoice: !!cls.classification_choice
            });
        }
        return isValid;
    });

console.log('✅ [Debug] After filtering, valid classifications:', validClassifications.length);
console.log('✅ [Debug] Valid classifications:', validClassifications);

// Test the template logic that would cause the error
mockPatientFindingWithInvalidClassification.classifications.forEach((classification: any, index: number) => {
    console.log(`🧪 [Debug] Testing classification ${index}:`);
    
    try {
        // This would cause the error: "can't access property 'id', classification is undefined"
        const classificationName = classification.classification.name;
        console.log(`✅ [Debug] Classification ${index} name: ${classificationName}`);
    } catch (error) {
        console.error(`❌ [Debug] Error accessing classification ${index}:`, error);
        console.error(`❌ [Debug] classification object:`, classification.classification);
    }
    
    try {
        const choiceName = classification.classification_choice.name;
        console.log(`✅ [Debug] Choice ${index} name: ${choiceName}`);
    } catch (error) {
        console.error(`❌ [Debug] Error accessing choice ${index}:`, error);
        console.error(`❌ [Debug] choice object:`, classification.classification_choice);
    }
});

export {};
