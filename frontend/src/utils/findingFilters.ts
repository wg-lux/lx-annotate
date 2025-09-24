// frontend/src/utils/findingFilters.ts
import type { Finding } from "@/stores/findingStore";

/**
 * A finding is "necessary" iff ANY of its FindingClassifications has required === true.
 */
export function filterNecessaryFindings(findings: readonly Finding[] | Finding[] | undefined | null): Finding[] {
  if (!Array.isArray(findings) || findings.length === 0) return [];
  return findings.filter(f =>
    Array.isArray((f as any).FindingClassifications) &&
    (f as any).FindingClassifications.some((fc: any) => fc?.required === true)
  );
}
