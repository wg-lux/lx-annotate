import axiosInstance, { r } from '@/api/axiosInstance'
import type { ExaminationReportingContext } from '@/types/knowledgeBaseGraph'
import type {
  ReportTemplateRuntimePatientFindingInput,
  ReportVerbosity
} from '@/types/reportTemplate'
import type { ReportLanguageCode } from '@/api/reportingLanguagesApi'

export type LlmReportRequest = {
  patientExaminationId: number
  templateName: string
  language: ReportLanguageCode
  verbosity?: ReportVerbosity
  graph: ExaminationReportingContext
  documentedFindings: ReportTemplateRuntimePatientFindingInput[]
  sectionNotes: { name: string; note: string }[]
  llmServer?: string
  llmModel?: string
}

export type LlmSelection = { server: string; model: string }
export type LlmServerOption = {
  id: string
  label: string
  ready: boolean
  models: string[]
  code: string | null
}
export type LlmModelOptions = { servers: LlmServerOption[]; default: LlmSelection }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseLlmModelOptions(data: unknown): LlmModelOptions {
  if (!isRecord(data) || !Array.isArray(data.servers) || !isRecord(data.default)) {
    throw new Error('Die LLM-Modellliste ist ungültig.')
  }
  const { server, model } = data.default
  if (typeof server !== 'string' || typeof model !== 'string') {
    throw new Error('Die LLM-Modellliste ist ungültig.')
  }
  const servers = data.servers.map((entry: unknown): LlmServerOption => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.label !== 'string' ||
      typeof entry.ready !== 'boolean' ||
      !Array.isArray(entry.models) ||
      !entry.models.every((name: unknown) => typeof name === 'string') ||
      (entry.code !== null && typeof entry.code !== 'string')
    ) {
      throw new Error('Die LLM-Modellliste ist ungültig.')
    }
    return {
      id: entry.id,
      label: entry.label,
      ready: entry.ready,
      models: entry.models as string[],
      code: entry.code
    }
  })
  return { servers, default: { server, model } }
}

export async function fetchReportLlmModels(signal: AbortSignal): Promise<LlmModelOptions> {
  const response = await axiosInstance.get<unknown>(r('reporting/llm/models/'), {
    signal,
    timeout: 20_000
  })
  return parseLlmModelOptions(response.data)
}

export async function checkReportLlmStatus(
  signal: AbortSignal,
  selection?: LlmSelection | null
): Promise<string> {
  const response = await axiosInstance.get<unknown>(r('reporting/llm/status/'), {
    signal,
    timeout: 15_000,
    ...(selection ? { params: { server: selection.server, model: selection.model } } : {})
  })
  const data = response.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('ready' in data) ||
    data.ready !== true ||
    !('model' in data) ||
    typeof data.model !== 'string' ||
    !data.model.trim()
  ) {
    throw new Error('Das konfigurierte LLM-Modell ist nicht bereit.')
  }
  return data.model
}

export async function generateLlmReport(
  request: LlmReportRequest,
  signal: AbortSignal
): Promise<string> {
  const response = await axiosInstance.post<unknown>(r('reporting/llm/generate/'), request, {
    signal,
    timeout: 135_000
  })
  const data = response.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('text' in data) ||
    typeof data.text !== 'string' ||
    !data.text.trim() ||
    !('graphContextId' in data) ||
    data.graphContextId !== request.graph.contextId
  ) {
    throw new Error('Die LLM-Antwort ist leer oder gehört zu einem anderen Untersuchungskontext.')
  }
  return data.text.trim()
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function sendChatMessages(
  messages: ChatMessage[],
  selection: LlmSelection | null,
  signal: AbortSignal
): Promise<string> {
  const response = await axiosInstance.post<unknown>(
    r('reporting/llm/chat/'),
    {
      messages,
      ...(selection ? { llmServer: selection.server, llmModel: selection.model } : {})
    },
    { signal, timeout: 135_000 }
  )
  const data = response.data
  if (!isRecord(data) || typeof data.text !== 'string' || !data.text.trim()) {
    throw new Error('Die LLM-Antwort ist leer.')
  }
  return data.text.trim()
}
