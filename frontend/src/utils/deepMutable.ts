// src/utils/deepMutable.ts
export function deepMutable<T>(value: T): T {
  // Prefer structuredClone when available (preserves types better than JSON in some cases)
  try {
    // @ts-ignore - not in every TS lib target
    if (typeof structuredClone === 'function') {
      // @ts-ignore
      return structuredClone(value);
    }
  } catch (_) {
    // fall through to JSON copy
  }
  // Fallback: JSON roundtrip (good enough for plain data from API)
  return JSON.parse(JSON.stringify(value));
}
