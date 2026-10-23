import { computed, onScopeDispose, ref } from 'vue'
import { sendChatMessages, type ChatMessage } from '@/api/reportLlmApi'
import { useLlmModelSelection } from '@/composables/reporting/useLlmModelSelection'
import { reportingApiErrorMessage } from '@/views/reporting/reportingError'

// Mirrors the backend limit; the history lives in memory only and is never persisted.
export const CHAT_MAX_MESSAGES = 40

export function useModelChat() {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const error = ref<string | null>(null)
  const models = useLlmModelSelection(sending)
  let controller: AbortController | null = null

  const limitReached = computed(() => messages.value.length >= CHAT_MAX_MESSAGES)

  function cancel() {
    controller?.abort()
    controller = null
    sending.value = false
  }
  onScopeDispose(cancel)

  async function send(content: string) {
    const text = content.trim()
    if (!text || sending.value || limitReached.value) {
      return false
    }
    const history: ChatMessage[] = [...messages.value, { role: 'user', content: text }]
    messages.value = history
    error.value = null
    sending.value = true
    const current = new AbortController()
    controller = current
    try {
      const reply = await sendChatMessages(history, models.selection.value, current.signal)
      if (current.signal.aborted) {
        return false
      }
      messages.value = [...history, { role: 'assistant', content: reply }]
      return true
    } catch (cause: unknown) {
      if (current.signal.aborted) {
        return false
      }
      // Keep the question so the user can retry; drop nothing silently.
      error.value = reportingApiErrorMessage(cause, 'Die Antwort konnte nicht erstellt werden.')
      return false
    } finally {
      if (controller === current) {
        controller = null
        sending.value = false
      }
    }
  }

  function clear() {
    cancel()
    messages.value = []
    error.value = null
  }

  return { messages, sending, error, limitReached, send, clear, cancel, ...models }
}
