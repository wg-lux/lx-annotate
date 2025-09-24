import { describe, it, expect } from 'vitest';
import { filterNecessaryFindings } from '@/utils/findingFilters';
import type { Finding } from '@/stores/findingStore';

type FC = { id: number; name: string; required?: boolean };
type TestFinding = {
  id: number;
  name: string;
  FindingClassifications?: FC[];
};

const mk = (id: number, reqs: (boolean | undefined)[], withArray = true): TestFinding => ({
  id,
  name: `F${id}`,
  ...(withArray
    ? { FindingClassifications: reqs.map((r, i) => ({ id: id * 10 + i, name: `C${id}-${i}`, required: r })) }
    : {})
});

describe('filterNecessaryFindings', () => {
  it('returns [] for undefined/null/empty', () => {
    expect(filterNecessaryFindings(undefined as any)).toEqual([]);
    expect(filterNecessaryFindings(null as any)).toEqual([]);
    expect(filterNecessaryFindings([])).toEqual([]);
  });

  it('keeps findings with ANY classification required === true', () => {
    const f1 = mk(1, [true]);             // keep
    const f2 = mk(2, [false, undefined]); // drop
    const f3 = mk(3, [false, true]);      // keep
    const f4 = mk(4, []);                  // drop (no required)
    const res = filterNecessaryFindings([f1, f2, f3, f4] as Finding[]);
    expect(res.map(f => f.id)).toEqual([1, 3]);
  });

  it('handles missing FindingClassifications array by excluding those findings', () => {
    const f1 = mk(1, [true]);      // keep
    const f2 = mk(2, [], false);   // no array -> drop
    const res = filterNecessaryFindings([f1, f2] as Finding[]);
    expect(res.map(f => f.id)).toEqual([1]);
  });

  it('ignores classifications where required is false or undefined', () => {
    const f = mk(5, [undefined, false, undefined]); // drop
    const res = filterNecessaryFindings([f] as Finding[]);
    expect(res).toEqual([]);
  });

  it('is pure and does not mutate input', () => {
    const input = [mk(6, [true]), mk(7, [false])] as Finding[];
    const snapshot = JSON.parse(JSON.stringify(input));
    filterNecessaryFindings(input);
    expect(input).toEqual(snapshot);
  });

  it('handles mixed data correctly', () => {
    const f1 = mk(1, [true, false]);      // keep (has one required)
    const f2 = mk(2, [false]);            // drop (none required)
    const f3 = mk(3, [undefined]);        // drop (none required)
    const f4 = mk(4, [true]);             // keep (has required)
    const f5 = mk(5, [], false);          // drop (no classifications array)
    
    const res = filterNecessaryFindings([f1, f2, f3, f4, f5] as Finding[]);
    expect(res.map(f => f.id)).toEqual([1, 4]);
  });

  it('handles empty classifications array', () => {
    const f = mk(1, []); // empty array -> drop
    const res = filterNecessaryFindings([f] as Finding[]);
    expect(res).toEqual([]);
  });

  it('handles findings with required === true at different positions', () => {
    const f1 = mk(1, [true]);                    // keep (first required)
    const f2 = mk(2, [false, true]);             // keep (second required)
    const f3 = mk(3, [false, false, true]);      // keep (third required)
    const f4 = mk(4, [false, false, false]);     // drop (none required)
    
    const res = filterNecessaryFindings([f1, f2, f3, f4] as Finding[]);
    expect(res.map(f => f.id)).toEqual([1, 2, 3]);
  });
});
