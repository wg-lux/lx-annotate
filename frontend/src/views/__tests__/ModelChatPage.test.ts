import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ModelChatPage from '../ModelChatPage.vue'
import { fetchReportLlmModels, sendChatMessages } from '@/api/reportLlmApi'

vi.mock('@/api/reportLlmApi', () => ({
  sendChatMessages: vi.fn(),
  fetchReportLlmModels: vi.fn()
}))

describe('ModelChatPage', () => {
  it('lists models, sends a message and shows the reply', async () => {
    vi.mocked(fetchReportLlmModels).mockResolvedValue({
      servers: [
        { id: 'local', label: 'Lokal', ready: true, models: ['glm4:latest'], code: null },
        { id: 'gc-02', label: 'gc-02', ready: false, models: [], code: 'unavailable' }
      ],
      default: { server: 'local', model: 'glm4:latest' }
    })
    vi.mocked(sendChatMessages).mockResolvedValue('Hallo zurück')
    const wrapper = mount(ModelChatPage)
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-model-select"]').text()).toContain('glm4:latest')
    expect(wrapper.html()).toContain('gc-02 (nicht erreichbar)')
    await wrapper.get('[data-testid="chat-input"]').setValue('Hallo')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="chat-log"]').text()).toContain('Hallo zurück')
    expect((wrapper.get('[data-testid="chat-input"]').element as HTMLTextAreaElement).value).toBe(
      ''
    )
  })

  it('restores the typed text when sending fails', async () => {
    vi.mocked(fetchReportLlmModels).mockRejectedValue(new Error('disabled'))
    vi.mocked(sendChatMessages).mockRejectedValue(new Error('down'))
    const wrapper = mount(ModelChatPage)
    await flushPromises()
    expect(wrapper.find('[data-testid="chat-models-error"]').exists()).toBe(true)
    await wrapper.get('[data-testid="chat-input"]').setValue('Frage')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="chat-error"]').exists()).toBe(true)
    expect((wrapper.get('[data-testid="chat-input"]').element as HTMLTextAreaElement).value).toBe(
      'Frage'
    )
  })
})
