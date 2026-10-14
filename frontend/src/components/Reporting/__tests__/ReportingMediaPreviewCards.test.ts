import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ReportingMediaPreviewCards from '../ReportingMediaPreviewCards.vue'
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import type { PatientTimelineItem, TimelineLatestPayload } from '@/api/reportingTimelineApi'

const report: PatientTimelineItem = {
  id: 99,
  mediaType: 'full_report',
  rawPdfId: null,
  patientExaminationId: 10,
  timestamp: '2026-09-20',
  examinationDate: '2026-09-20',
  documentType: 'Koloskopie',
  fileName: null,
  anonymizedText: 'Vollständiger anonymisierter Bericht. '.repeat(80),
  streamOptions: []
}
const olderReport: PatientTimelineItem = {
  ...report,
  id: 98,
  patientExaminationId: 9,
  anonymizedText: 'Älterer Bericht'
}
const video: PatientTimelineItem = {
  ...report,
  id: 34,
  mediaType: 'video',
  anonymizedText: null,
  streamOptions: [{ type: 'processed', url: '/backend/video/34' }]
}
const olderVideo = {
  ...video,
  id: 33,
  patientExaminationId: 9,
  streamOptions: [{ type: 'processed', url: '/backend/video/33' }]
}
function payload(): TimelineLatestPayload {
  return {
    patient: {
      id: 42,
      firstName: 'Test',
      lastName: 'Patient',
      dob: null,
      isRealPerson: false,
      patientHash: null
    },
    latestReport: { ...report, anonymizedText: report.anonymizedText ?? null, streamOptions: [] },
    latestVideo: { ...video, streamOptions: video.streamOptions ?? [] },
    latestFrames: [],
    availableMedia: [report, olderReport, video, olderVideo]
  }
}
beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
  setActivePinia(createPinia())
  useReportingFlowStore().setMediaPreload(payload())
})

describe('patient report and video history', () => {
  it('shows the entire report text without requiring or inventing a PDF', () => {
    const wrapper = mount(ReportingMediaPreviewCards)
    expect(wrapper.get('.report-text-preview').text()).toBe(report.anonymizedText?.trim())
    expect(wrapper.findAll('button')).toHaveLength(1) // Only the real video stream.
    expect(wrapper.text()).not.toContain('latest_only')
  })

  it('selects reports and videos from earlier examinations without changing case ownership', async () => {
    const flow = useReportingFlowStore()
    flow.caseId = 'new-case'
    flow.patientExaminationId = 221
    const wrapper = mount(ReportingMediaPreviewCards)
    await wrapper.get('[data-testid="patient-report-select"]').setValue('full_report:98')
    expect(wrapper.get('.report-text-preview').text()).toBe('Älterer Bericht')
    await wrapper.get('[data-testid="patient-video-select"]').setValue('video:33')
    expect(flow.mediaPreload?.latestVideo?.id).toBe(33)
    expect(flow.mediaPreload?.latestReport?.id).toBe(98)
    expect(flow.mediaPreload?.latestFrames).toEqual([])
    expect(flow.caseId).toBe('new-case')
    expect(flow.patientExaminationId).toBe(221)
  })

  it('opens only the supplied correction-file URL, never a URL inferred from the text report ID', async () => {
    const data = payload()
    data.latestReport = {
      ...report,
      rawPdfId: 12,
      anonymizedText: 'Manuell korrigiert',
      streamOptions: [{ type: 'raw', url: '/backend/pdfs/12/stream/?type=raw' }]
    }
    useReportingFlowStore().setMediaPreload(data)
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const wrapper = mount(ReportingMediaPreviewCards)
    await wrapper.findAll('button')[0].trigger('click')
    expect(open).toHaveBeenCalledWith(
      '/backend/pdfs/12/stream/?type=raw',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('rejects media outside the loaded patient history', () => {
    const flow = useReportingFlowStore()
    expect(() => {
      flow.selectPatientMedia('full_report:1000')
    }).toThrow('loaded patient history')
    expect(flow.mediaPreload?.latestReport?.id).toBe(99)
  })

  it('clears text and links on loading, failure and context reset', async () => {
    const flow = useReportingFlowStore()
    const wrapper = mount(ReportingMediaPreviewCards)
    flow.setMediaPreloadLoading()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.report-text-preview').exists()).toBe(false)
    expect(flow.mediaPreload).toBeNull()
    flow.setMediaPreload(payload())
    flow.setMediaPreloadError('Zugriff verweigert')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Zugriff verweigert')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(flow.mediaPreload).toBeNull()
    flow.setMediaPreload(payload())
    flow.clearMediaPreload()
    expect(flow.mediaPreload).toBeNull()
  })
})
