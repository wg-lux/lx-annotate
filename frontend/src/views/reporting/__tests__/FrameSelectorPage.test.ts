import { computed, reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endpoints } from '@/types/api/endpoints'

import FrameSelectorPage from '../FrameSelectorPage.vue'

const PATIENT_EXAMINATION_ID = 42
const REPORT_ID = 88
const VIDEO_ID = 5
const SEGMENT_ID = 7
const INITIAL_FRAME_NUMBER = 15
const MANUAL_FRAME_NUMBER = 19
const EXAMINATION_ID = 9

const hoisted = vi.hoisted(() => {
  let flowFixture: ReturnType<typeof buildFlowStore> | undefined
  return {
    flowRef: {
      get current(): ReturnType<typeof buildFlowStore> {
        if (flowFixture === undefined) {
          throw new Error('Reporting flow fixture was not initialized.')
        }
        return flowFixture
      },
      set current(value: ReturnType<typeof buildFlowStore>) {
        flowFixture = value
      }
    },
    get: vi.fn(),
    patch: vi.fn(),
    ensureCatalogLoaded: vi.fn()
  }
})

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get,
    patch: hoisted.patch
  },
  r: (path: string) => path
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flowRef.current
}))

vi.mock('@/composables/reporting/useFindingSelectors', () => ({
  useFindingSelectors: () => ({
    catalogFindings: computed(() => [
      { id: 11, name: 'polyp', nameDe: 'Polyp' },
      { id: 12, name: 'bleeding', nameDe: 'Blutung' }
    ]),
    ensureCatalogLoaded: hoisted.ensureCatalogLoaded
  })
}))

function buildFrameSelectorState() {
  return {
    patientExaminationId: PATIENT_EXAMINATION_ID,
    reportId: REPORT_ID,
    reportStatus: 'draft',
    count: 1,
    results: [
      {
        segmentId: SEGMENT_ID,
        videoId: VIDEO_ID,
        labelName: 'Antrum',
        startFrameNumber: 10,
        endFrameNumber: 30,
        selectedFrameNumber: INITIAL_FRAME_NUMBER,
        selectedFrame: {
          frameId: 901,
          frameNumber: INITIAL_FRAME_NUMBER,
          timestamp: 1.5,
          relativePath: 'frames/frame-15.jpg',
          fileExists: true
        },
        attachedFinding: {
          patientFindingId: 501,
          findingId: 11,
          findingName: 'Polyp'
        }
      }
    ]
  }
}

function buildFlowStore() {
  const flow = reactive({
    patientExaminationId: PATIENT_EXAMINATION_ID,
    selectedExaminationId: EXAMINATION_ID,
    activeReportId: null as number | null,
    lookupToken: 'lookup-token',
    mediaPreload: {
      latestFrames: [
        {
          videoId: VIDEO_ID,
          frameNumber: 22,
          category: 'recent',
          streamUrl: `/api/${endpoints.media.videoStream(VIDEO_ID)}?frame=22`
        }
      ]
    },
    setActiveReportId: vi.fn((id: number | null) => {
      flow.activeReportId = id
    })
  })

  return flow
}

function getButtonByText(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes(label))

  if (!button) {
    throw new Error(`Button with label "${label}" not found.`)
  }

  return button
}

describe('FrameSelectorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hoisted.flowRef.current = buildFlowStore()
    hoisted.ensureCatalogLoaded.mockResolvedValue(undefined)
  })

  it('loads the selector state on mount and opens latest preload frames', async () => {
    hoisted.get.mockResolvedValue({ data: buildFrameSelectorState() })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const wrapper = mount(FrameSelectorPage, {
      global: {
        stubs: {
          LookupStatusPanel: true
        }
      }
    })
    await flushPromises()

    expect(hoisted.ensureCatalogLoaded).toHaveBeenCalledWith(EXAMINATION_ID)
    expect(hoisted.get).toHaveBeenCalledWith(
      'patient-examination-reports/segment-frame-selector?patient_examination_id=42'
    )
    expect(hoisted.flowRef.current.setActiveReportId).toHaveBeenCalledWith(REPORT_ID)
    expect(wrapper.text()).toContain('Antrum')
    expect(wrapper.text()).toContain('Ausgewählt: 15')

    await getButtonByText(wrapper, '#22').trigger('click')
    expect(openSpy).toHaveBeenCalledWith(
      `/api/${endpoints.media.videoStream(VIDEO_ID)}?frame=22`,
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('does not replace the active report when the selector response omits its report id', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        ...buildFrameSelectorState(),
        reportId: undefined
      }
    })

    const wrapper = mount(FrameSelectorPage, {
      global: {
        stubs: {
          LookupStatusPanel: true
        }
      }
    })
    await flushPromises()

    expect(hoisted.flowRef.current.setActiveReportId).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Antrum')
  })

  it('patches segment actions and manual frame selection through the reporting route', async () => {
    hoisted.get.mockResolvedValue({ data: buildFrameSelectorState() })
    hoisted.patch.mockResolvedValueOnce({ data: buildFrameSelectorState() }).mockResolvedValueOnce({
      data: {
        ...buildFrameSelectorState(),
        results: [
          {
            ...buildFrameSelectorState().results[0],
            selectedFrameNumber: MANUAL_FRAME_NUMBER,
            selectedFrame: {
              frameId: 902,
              frameNumber: MANUAL_FRAME_NUMBER,
              timestamp: 1.9,
              relativePath: 'frames/frame-19.jpg',
              fileExists: true
            }
          }
        ]
      }
    })

    const wrapper = mount(FrameSelectorPage, {
      global: {
        stubs: {
          LookupStatusPanel: true
        }
      }
    })
    await flushPromises()

    await getButtonByText(wrapper, 'Zufallsframe').trigger('click')
    await flushPromises()

    expect(hoisted.patch).toHaveBeenNthCalledWith(
      1,
      'patient-examination-reports/segment-frame-selector',
      {
        patientExaminationId: PATIENT_EXAMINATION_ID,
        reportId: REPORT_ID,
        segmentId: SEGMENT_ID,
        action: 'random',
        findingId: 11
      }
    )

    await wrapper.get('input[type="number"]').setValue('19')
    await getButtonByText(wrapper, 'Setzen').trigger('click')
    await flushPromises()

    expect(hoisted.patch).toHaveBeenNthCalledWith(
      2,
      'patient-examination-reports/segment-frame-selector',
      {
        patientExaminationId: PATIENT_EXAMINATION_ID,
        reportId: REPORT_ID,
        segmentId: SEGMENT_ID,
        action: 'set',
        frameNumber: MANUAL_FRAME_NUMBER,
        findingId: 11
      }
    )
    expect(wrapper.text()).toContain('Frame manuell gesetzt.')
  })
})
