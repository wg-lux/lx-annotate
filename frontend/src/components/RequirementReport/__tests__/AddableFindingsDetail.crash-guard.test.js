/**
 * Crash Guard Tests for AddableFindingsDetail
 *
 * Tests the exact scenarios that cause "H.classification is undefined" crashes.
 * Based on socratic debugging analysis from the user.
 */
import { describe, it, expect } from 'vitest';
const isPatientClassification = (x) => !!x?.classification?.id && !!x?.classification_choice?.id;
const isClassificationDefinition = (x) => !!x?.id && typeof x?.name === 'string' && (!x.choices || Array.isArray(x.choices));
// Central safe filter (same as in component)
const patientClassificationsSafe = (arr) => (Array.isArray(arr) ? arr : [])
    .filter((x) => x?.classification &&
    x?.classification?.id != null &&
    x?.classification?.name &&
    x?.classification_choice &&
    x?.classification_choice?.id != null &&
    x?.classification_choice?.name);
// Safe mapping function (same as in component)
const safeMapPatientClassifications = (arr, mapFn, findingId) => {
    const safeData = patientClassificationsSafe(arr);
    return safeData
        .map((cls, index) => {
        try {
            // Extra safety check before mapping
            if (!cls?.classification?.id || !cls?.classification_choice?.id) {
                console.warn('🚨 [safeMapPatientClassifications] Skipping invalid classification in map:', {
                    index,
                    findingId,
                    cls
                });
                return null;
            }
            return mapFn(cls, index);
        }
        catch (error) {
            console.error('🚨 [safeMapPatientClassifications] Mapping error:', {
                error,
                index,
                findingId,
                cls
            });
            return null;
        }
    })
        .filter(item => item !== null);
};
describe('AddableFindingsDetail Crash Guards', () => {
    describe('Mixed Data Shapes', () => {
        it('should handle mixed definitions + patient classifications without crash', () => {
            const mixed = [
                { id: 9, name: 'Definition', choices: [] }, // Classification Definition
                {
                    classification: { id: 7, name: 'X' },
                    classification_choice: { id: 5, name: 'A' }
                }, // Valid Patient Classification
                { classification: null }, // Broken data
                { classification_choice: { id: 1, name: 'B' } }, // Missing classification
                { classification: { id: 8 } }, // Missing classification_choice
            ];
            const safePcs = patientClassificationsSafe(mixed);
            expect(safePcs).toHaveLength(1);
            expect(safePcs[0].classification.id).toBe(7);
            expect(safePcs[0].classification_choice.id).toBe(5);
        });
        it('should distinguish between definitions and patient classifications', () => {
            const mixed = [
                { id: 1, name: 'Finding A', choices: [{ id: 1, name: 'Choice 1' }] },
                {
                    classification: { id: 2, name: 'Class B' },
                    classification_choice: { id: 3, name: 'Choice B' }
                }
            ];
            const definitions = mixed.filter(isClassificationDefinition);
            const patientClassifications = mixed.filter(isPatientClassification);
            expect(definitions).toHaveLength(1);
            expect(definitions[0].name).toBe('Finding A');
            expect(patientClassifications).toHaveLength(1);
            expect(patientClassifications[0].classification.name).toBe('Class B');
        });
    });
    describe('Key Generation Safety', () => {
        it('should generate safe keys even with undefined classification data', () => {
            const unsafeData = [
                { id: 1, classification: null },
                { id: 2, classification: { id: null } },
                { id: 3, classification: { id: 5, name: 'Valid' } },
            ];
            // Simulate template key generation logic
            const keys = unsafeData.map((item, idx) => `pc-123-${idx}-${item?.classification?.id ?? 'none'}`);
            expect(keys).toEqual([
                'pc-123-0-none',
                'pc-123-1-none',
                'pc-123-2-5'
            ]);
            // No crashes should occur during key generation
            expect(keys.length).toBe(3);
        });
    });
    describe('Sort/Reduce Operations', () => {
        it('should sort safely after filtering', () => {
            const unsafeData = [
                { classification: { id: 3, name: 'C' }, classification_choice: { id: 1, name: 'A' } },
                { classification: null }, // This would crash .sort()
                { classification: { id: 1, name: 'A' }, classification_choice: { id: 2, name: 'B' } },
            ];
            // Filter FIRST, then sort - prevents crashes
            const safe = patientClassificationsSafe(unsafeData);
            const sorted = safe.sort((a, b) => a.classification.id - b.classification.id);
            expect(sorted).toHaveLength(2);
            expect(sorted[0].classification.id).toBe(1);
            expect(sorted[1].classification.id).toBe(3);
        });
        it('should reduce safely into Map', () => {
            const unsafeData = [
                { classification: { id: 5, name: 'E' }, classification_choice: { id: 1, name: 'A' } },
                { classification: undefined }, // This would crash Map.set()
                { classification: { id: 2, name: 'B' }, classification_choice: { id: 3, name: 'C' } },
            ];
            const safe = patientClassificationsSafe(unsafeData);
            const byId = safe.reduce((map, pc) => {
                map.set(pc.classification.id, pc);
                return map;
            }, new Map());
            expect(byId.size).toBe(2);
            expect(byId.get(5)?.classification.name).toBe('E');
            expect(byId.get(2)?.classification.name).toBe('B');
        });
    });
    describe('Edge Cases', () => {
        it('should handle null/undefined arrays', () => {
            expect(patientClassificationsSafe(null)).toEqual([]);
            expect(patientClassificationsSafe(undefined)).toEqual([]);
            expect(patientClassificationsSafe([])).toEqual([]);
        });
        it('should handle arrays with all invalid data', () => {
            const allInvalid = [
                { notAClassification: true },
                { classification: null },
                { classification_choice: null },
                null,
                undefined
            ];
            expect(patientClassificationsSafe(allInvalid)).toEqual([]);
        });
    });
    describe('Safe Mapping Function', () => {
        it('should safely map valid classifications without crashes', () => {
            const input = [
                {
                    classification: { id: 1, name: 'Valid' },
                    classification_choice: { id: 10, name: 'ChoiceA' }
                },
                { classification: null }, // Invalid - should be filtered out
                {
                    classification: { id: 2, name: 'Another' },
                    classification_choice: { id: 20, name: 'ChoiceB' }
                }
            ];
            const result = safeMapPatientClassifications(input, (cls) => ({
                classificationName: cls.classification.name,
                choiceName: cls.classification_choice.name
            }));
            expect(result).toHaveLength(2);
            expect(result[0].classificationName).toBe('Valid');
            expect(result[0].choiceName).toBe('ChoiceA');
            expect(result[1].classificationName).toBe('Another');
            expect(result[1].choiceName).toBe('ChoiceB');
        });
        it('should handle mapping errors gracefully', () => {
            const input = [
                {
                    classification: { id: 1, name: 'Valid' },
                    classification_choice: { id: 10, name: 'ChoiceA' }
                }
            ];
            // Mapping function that throws an error
            const result = safeMapPatientClassifications(input, (cls) => {
                throw new Error('Test error');
            });
            expect(result).toEqual([]);
        });
        it('should handle completely invalid input arrays', () => {
            const result1 = safeMapPatientClassifications(null, cls => cls);
            const result2 = safeMapPatientClassifications(undefined, cls => cls);
            const result3 = safeMapPatientClassifications([], cls => cls);
            expect(result1).toEqual([]);
            expect(result2).toEqual([]);
            expect(result3).toEqual([]);
        });
    });
});
