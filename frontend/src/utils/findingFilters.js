/**
 * A finding is "necessary" iff ANY of its FindingClassifications has required === true.
 */
export function filterNecessaryFindings(findings) {
    if (!Array.isArray(findings) || findings.length === 0)
        return [];
    return findings.filter(f => Array.isArray(f.FindingClassifications) &&
        f.FindingClassifications.some((fc) => fc?.required === true));
}
