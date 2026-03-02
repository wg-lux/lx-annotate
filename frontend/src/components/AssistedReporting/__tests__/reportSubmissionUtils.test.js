import { describe, expect, it } from 'vitest';
import { formatDateOnly, mergeClassificationSelections, normalizeInterventions } from '../reportSubmissionUtils';
describe('reportSubmissionUtils', () => {
    it('formats valid date strings to YYYY-MM-DD', () => {
        expect(formatDateOnly('2026-02-24T09:00:00Z')).toBe('2026-02-24');
        expect(formatDateOnly('2026-02-24')).toBe('2026-02-24');
    });
    it('returns null for invalid or empty dates', () => {
        expect(formatDateOnly(null)).toBeNull();
        expect(formatDateOnly(undefined)).toBeNull();
        expect(formatDateOnly('not-a-date')).toBeNull();
    });
    it('merges API and local classification selections with local taking precedence', () => {
        const merged = mergeClassificationSelections(10, [
            { classification: 1, classificationChoice: 11 },
            { classificationId: 2, classificationChoiceId: 22 }
        ], {
            10: {
                2: 222, // override existing API selection
                3: 333 // add new local-only selection
            }
        });
        expect(merged).toEqual(expect.arrayContaining([
            { classification: 1, classificationChoice: 11 },
            { classification: 2, classificationChoice: 222 },
            { classification: 3, classificationChoice: 333 }
        ]));
        expect(merged).toHaveLength(3);
    });
    it('normalizes interventions and filters invalid entries', () => {
        const normalized = normalizeInterventions([
            123, // ignored primitive entry
            { intervention: 9, state: 'done' },
            { interventionId: 10, date: '2026-02-24', timeStart: '2026-02-24T09:00:00Z' },
            { intervention: Number.NaN }
        ]);
        expect(normalized).toEqual([
            { intervention: 9, state: 'done', date: null, timeStart: null, timeEnd: null },
            {
                intervention: 10,
                state: null,
                date: '2026-02-24',
                timeStart: '2026-02-24T09:00:00Z',
                timeEnd: null
            }
        ]);
    });
});
