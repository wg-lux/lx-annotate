import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StudyLedgerExchange from './StudyLedgerExchange.vue'
const api = vi.hoisted(() => ({
  fetchStoredStudyOptions: vi.fn(),
  fetchStudyLedgerWorkbook: vi.fn(),
  importStudyLedgerWorkbook: vi.fn(),
  sendStudyLedgerToHub: vi.fn(),
  acceptStudyHubTransfer: vi.fn()
}))
const saveDownload = vi.hoisted(() => vi.fn())
vi.mock('@/api/studyExportApi', () => api)
vi.mock('@/utils/saveDownload', () => ({ saveDownload }))

describe('stored study exchange panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchStoredStudyOptions.mockResolvedValue([{ uuid: 'study-uuid', name: 'Research' }])
    api.fetchStudyLedgerWorkbook.mockResolvedValue({
      blob: new Blob(['workbook']),
      filename: 'study.xlsx',
      rowCount: 4
    })
    api.sendStudyLedgerToHub.mockResolvedValue('receipt-uuid')
    api.acceptStudyHubTransfer.mockResolvedValue(undefined)
  })
  it('downloads the selected stored study and shows its collection count', async () => {
    const wrapper = mount(StudyLedgerExchange, { global: { stubs: { RouterLink: true } } })
    await flushPromises()
    await wrapper.get('#ledger-study').setValue('study-uuid')
    await wrapper.findAll('button')[0]?.trigger('click')
    await flushPromises()
    expect(api.fetchStudyLedgerWorkbook).toHaveBeenCalledWith('study-uuid')
    expect(saveDownload).toHaveBeenCalledWith(expect.any(Blob), 'study.xlsx')
    expect(wrapper.get('[role="status"]').text()).toContain('4 gespeicherte')
  })
  it('requires an explicit source and accepts a received transfer explicitly', async () => {
    const wrapper = mount(StudyLedgerExchange, { global: { stubs: { RouterLink: true } } })
    await flushPromises()
    await wrapper.get('#ledger-study').setValue('study-uuid')
    const send = wrapper.findAll('button')[1]
    expect(send.attributes('disabled')).toBeDefined()
    await wrapper.get('#ledger-source').setValue('source-node')
    await send.trigger('click')
    await flushPromises()
    expect(api.sendStudyLedgerToHub).toHaveBeenCalledWith('study-uuid', 'source-node', '')
    expect(wrapper.get('[role="status"]').text()).toContain('receipt-uuid')
    await wrapper.get('#ledger-transfer').setValue('transfer-uuid')
    await wrapper.findAll('button')[2]?.trigger('click')
    await flushPromises()
    expect(api.acceptStudyHubTransfer).toHaveBeenCalledWith('transfer-uuid')
  })
})
