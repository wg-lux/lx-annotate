import axios, { r } from '@/api/axiosInstance'

export interface FindingSuggestion {
  id: number
  name: string
  title: string
  source: 'report' | 'prediction'
  presence: 'present' | 'absent' | 'uncertain'
  evidence: string[]
  instance: string
  approved: boolean
}

export interface FindingSuggestions {
  examination: number | null
  candidates: FindingSuggestion[]
  reason: string
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Ungültige Befundvorschläge.')
  }
  return value as Record<string, unknown>
}

function positive_id(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error('Ungültige Befund-ID.')
  }
  return value
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Ungültige Befundbezeichnung.')
  return value
}

function choice<T extends string>(value: unknown, options: readonly T[]): T {
  const found = options.find((option) => option === value)
  if (!found) throw new Error('Ungültiger Befundstatus.')
  return found
}

export async function load_finding_suggestions(
  media_type: 'pdf' | 'video', file_id: number
): Promise<FindingSuggestions> {
  const response = await axios.get<unknown>(
    r(`media/${media_type === 'pdf' ? 'pdfs' : 'videos'}/${String(file_id)}/finding-suggestions/`)
  )
  const data = record(response.data)
  if (
    (data.examination !== null && (typeof data.examination !== 'number' || !Number.isInteger(data.examination) || data.examination <= 0)) ||
    !Array.isArray(data.candidates) || typeof data.reason !== 'string'
  ) throw new Error('Ungültiger Untersuchungskontext für Befundvorschläge.')
  const candidates = (data.candidates as unknown[]).map((entry): FindingSuggestion => {
    const row = record(entry)
    if (
      !Array.isArray(row.evidence) || !row.evidence.every((item: unknown) => typeof item === 'string') ||
      typeof row.instance !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(row.instance) ||
      typeof row.approved !== 'boolean'
    ) throw new Error('Ungültiger Befundvorschlag.')
    return {
      id: positive_id(row.id), name: text(row.name), title: text(row.title),
      source: choice(row.source, ['report', 'prediction'] as const),
      presence: choice(row.presence, ['present', 'absent', 'uncertain'] as const), evidence: row.evidence as string[],
      instance: row.instance, approved: row.approved
    }
  })
  return { examination: data.examination, candidates, reason: data.reason }
}
