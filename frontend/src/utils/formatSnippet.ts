export function formatSnippet(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value)
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol' ||
    typeof value === 'function'
  ) {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return '[object value]'
  }
}
