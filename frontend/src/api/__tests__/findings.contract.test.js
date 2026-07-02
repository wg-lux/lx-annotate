import { describe, expect, it } from 'vitest';
import { extractFindingId, mergeFindingClassifications, normalizeFinding, normalizePatientFindingRow } from '@/api/findings.contract';
describe('findings contract normalization', () => {
    it('normalizes lx_dtypes finding payloads into one typed finding model', () => {
        const finding = normalizeFinding({
            id: 7,
            name: 'colon_polyp',
            description: 'Polyp',
            name_de: 'Kolonpolyp',
            classifications: [
                {
                    id: 10,
                    name: 'size',
                    required: true,
                    classification_types: ['morphology'],
                    choices: [{ id: 20, name: 'small', numerical_descriptors: { size_mm: 5 } }]
                }
            ],
            location_classifications: [
                {
                    id: 11,
                    name: 'segment',
                    required: false,
                    classification_types: ['location'],
                    choices: [{ id: 21, name: 'sigmoid' }]
                }
            ]
        });
        expect(finding.nameDe).toBe('Kolonpolyp');
        expect(finding.displayName).toBe('Kolonpolyp');
        expect(finding.classifications[0].classificationTypes).toEqual(['morphology']);
        expect(finding.classifications[0].displayName).toBe('size');
        expect(finding.classifications[0].choices[0].displayName).toBe('small');
        expect(finding.classifications[0].choices[0].numericalDescriptors).toEqual({ size_mm: 5 });
        expect(mergeFindingClassifications(finding).map((entry) => entry.id)).toEqual([10, 11]);
        expect(finding.FindingClassifications.map((entry) => entry.id)).toEqual([10]);
    });
    it('normalizes patient finding rows and keeps snake_case semantics at the boundary', () => {
        const row = normalizePatientFindingRow({
            id: 3,
            patient_examination: 99,
            finding: { id: 7 },
            is_active: false,
            classifications: [
                {
                    id: 5,
                    classification: 10,
                    classification_choice: 20,
                    classification_name: 'size',
                    classification_choice_name: 'small',
                    numerical_descriptors: { size_mm: 5 }
                }
            ]
        });
        expect(row.patientExamination).toBe(99);
        expect(extractFindingId(row.finding)).toBe(7);
        expect(row.isActive).toBe(false);
        expect(row.classifications[0].classificationChoiceName).toBe('small');
        expect(row.classifications[0].numericalDescriptors).toEqual({ size_mm: 5 });
    });
});
