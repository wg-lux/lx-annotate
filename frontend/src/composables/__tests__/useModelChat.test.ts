import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHAT_MAX_MESSAGES, useModelChat } from '../useModelChat'
import { fetchReportLlmModels, sendChatMessages } from '@/api/reportLlmApi'

vi.mock('@/api/reportLlmApi', () => ({
  sendChatMessages: vi.fn(),
  fetchReportLlmModels: vi.fn()
}))

const scopes: ReturnType<typeof effectScope>[] = []
function setup() {
  const scope = effectScope()
  scopes.push(scope)
  const chat = scope.run(() => useModelChat())
  if (!chat) throw new Error('scope did not initialize')
  return chat
}
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  vi.resetAllMocks()
})

describe('useModelChat', () => {
  it('sends the full history with the selected model and appends the reply', async () => {
    vi.mocked(fetchReportLlmModels).mockResolvedValue({
      servers: [{ id: 'local', label: 'Lokal', ready: true, models: ['glm4:latest'], code: null }],
      default: { server: 'local', model: 'glm4:latest' }
    })
    vi.mocked(sendChatMessages).mockResolvedValueOnce('Hallo').mockResolvedValueOnce('Gern')
    const chat = setup()
    await chat.loadModels()
    expect(await chat.send('  Hi  ')).toBe(true)
    expect(await chat.send('Mehr')).toBe(true)
    expect(vi.mocked(sendChatMessages).mock.calls[1][0]).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hallo' },
      { role: 'user', content: 'Mehr' }
    ])
    expect(vi.mocked(sendChatMessages).mock.calls[1][1]).toEqual({
      server: 'local',
      model: 'glm4:latest'
    })
    expect(chat.messages.value).toHaveLength(4)
  })

  it('ignores empty input and keeps the question after a failure', async () => {
    vi.mocked(sendChatMessages).mockRejectedValue(new Error('down'))
    const chat = setup()
    expect(await chat.send('   ')).toBe(false)
    expect(sendChatMessages).not.toHaveBeenCalled()
    expect(await chat.send('Frage')).toBe(false)
    expect(chat.error.value).toBeTruthy()
    expect(chat.messages.value).toEqual([{ role: 'user', content: 'Frage' }])
    expect(chat.sending.value).toBe(false)
  })

  it('blocks overlapping sends and stops at the history limit', async () => {
    let finish: ((text: string) => void) | undefined
    vi.mocked(sendChatMessages).mockImplementation(
      () => new Promise<string>((resolve) => (finish = resolve))
    )
    const chat = setup()
    const first = chat.send('a')
    expect(await chat.send('b')).toBe(false)
    finish?.('x')
    await first
    chat.messages.value = Array.from({ length: CHAT_MAX_MESSAGES }, () => ({
      role: 'user' as const,
      content: 'x'
    }))
    expect(chat.limitReached.value).toBe(true)
    expect(await chat.send('c')).toBe(false)
  })

  it('discards a pending reply after clear', async () => {
    let finish: ((text: string) => void) | undefined
    vi.mocked(sendChatMessages).mockImplementation(
      () => new Promise<string>((resolve) => (finish = resolve))
    )
    const chat = setup()
    const pending = chat.send('a')
    chat.clear()
    finish?.('late')
    await pending
    expect(chat.messages.value).toEqual([])
    expect(chat.sending.value).toBe(false)
  })
})
