import type { Finding } from "@/stores/findingStore";
/**
 * A finding is "necessary" iff ANY of its FindingClassifications has required === true.
 */
export declare function filterNecessaryFindings(findings: readonly Finding[] | Finding[] | undefined | null): Finding[];
