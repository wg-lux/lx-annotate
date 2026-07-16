import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  uploadFiles: vi.fn(),
  pollUploadStatus: vi.fn(),
  resolveUploadedReportId: vi.fn()
}))

vi.mock('@/api/upload', () => ({
  uploadFiles: hoisted.uploadFiles,
  pollUploadStatus: hoisted.pollUploadStatus,
  resolveUploadedReportId: hoisted.resolveUploadedReportId
}))

import ReportImportPanel from '../ReportImportPanel.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :data-to="to"><slot /></a>'
}

function mountPanel() {
  return mount(ReportImportPanel, {
    props: { pollIntervalMs: 0 },
    global: {
      stubs: { RouterLink: RouterLinkStub }
    }
  })
}

async function selectFiles(wrapper: ReturnType<typeof mountPanel>, files: File[]) {
  const input = wrapper.get('[data-test="report-import-input"]')
  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: files
  })
  await input.trigger('change')
  await flushPromises()
}

describe('ReportImportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.uploadFiles.mockResolvedValue({
      uploadId: 'upload-1',
      statusUrl: '/endoreg-api/upload/upload-1/status/'
    })
    hoisted.pollUploadStatus.mockImplementation(async (_url: string, options: any) => {
      options.onProgress?.({ status: 'processing' })
      return {
        status: 'anonymized',
        reportLlmJob: {
          status: 'success',
          reportId: 73,
          result: { pdfId: 73 }
        }
      }
    })
    hoisted.resolveUploadedReportId.mockReturnValue(73)
  })

  it('imports one PDF, exposes progress, and emits the stable report id', async () => {
    const wrapper = mountPanel()
    const pdf = new File(['%PDF-1.4'], 'register-report.pdf', { type: 'application/pdf' })

    await selectFiles(wrapper, [pdf])

    expect(hoisted.uploadFiles).toHaveBeenCalledWith([pdf], {
      centerKey: undefined,
      sourceSystem: 'lx-annotate-reporting'
    })
    expect(hoisted.pollUploadStatus).toHaveBeenCalledWith(
      '/endoreg-api/upload/upload-1/status/',
      expect.objectContaining({ pollIntervalMs: 0, maxAttempts: 30 })
    )
    expect(wrapper.emitted('completed')?.[0]?.[0]).toBe(73)
    expect(wrapper.get('[data-test="report-import-completed"]').text()).toContain(
      'noch nicht manuell validiert'
    )
    expect(wrapper.get('[data-test="report-validation-link"]').attributes('data-to')).toBe(
      '/anonymisierung/validierung?fileId=73&mediaType=pdf'
    )
  })

  it('rejects non-PDF files without starting an upload', async () => {
    const wrapper = mountPanel()

    await selectFiles(wrapper, [new File(['notes'], 'notes.txt', { type: 'text/plain' })])

    expect(hoisted.uploadFiles).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="report-import-status"]').text()).toContain('Nur PDF-Berichte')
  })

  it('does not announce completion without a stable report id', async () => {
    hoisted.resolveUploadedReportId.mockReturnValue(null)
    const wrapper = mountPanel()

    await selectFiles(wrapper, [new File(['%PDF'], 'report.pdf', { type: 'application/pdf' })])

    expect(wrapper.emitted('completed')).toBeUndefined()
    expect(wrapper.get('[data-test="report-import-status"]').text()).toContain(
      'keine stabile Report-ID'
    )
    expect(wrapper.find('[data-test="report-import-completed"]').exists()).toBe(false)
  })
})
