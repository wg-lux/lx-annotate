import { onScopeDispose, ref, type Ref } from 'vue'
import { fetchReportLlmModels, type LlmSelection, type LlmServerOption } from '@/api/reportLlmApi'
import { reportingApiErrorMessage } from '@/views/reporting/reportingError'

/** Allowlisted Ollama servers and their installed models; the backend default is preselected. */
export function useLlmModelSelection(locked: Ref<boolean>) {
  const servers = ref<LlmServerOption[]>([])
  const selection = ref<LlmSelection | null>(null)
  const modelsError = ref<string | null>(null)
  let controller: AbortController | null = null
  onScopeDispose(() => controller?.abort())

  async function loadModels() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    modelsError.value = null
    try {
      const options = await fetchReportLlmModels(current.signal)
      if (current.signal.aborted) {
        return
      }
      servers.value = options.servers
      const keep = selection.value
      const stillListed =
        keep !== null &&
        options.servers.some((s) => s.id === keep.server && s.models.includes(keep.model))
      selection.value = stillListed ? keep : options.default
    } catch (cause: unknown) {
      if (current.signal.aborted) {
        return
      }
      servers.value = []
      modelsError.value = reportingApiErrorMessage(
        cause,
        'Die LLM-Modelle konnten nicht geladen werden.'
      )
    }
  }

  function select(server: string, model: string) {
    if (!locked.value) {
      selection.value = { server, model }
    }
  }

  return { servers, selection, modelsError, loadModels, select }
}
