import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'
import AnonymizationEvaluation from '../AnonymizationEvaluation.vue'

function readContentType(config: unknown): unknown {
  if (typeof config !== 'object' || config === null || !('params' in config)) {
    return undefined
  }
  const { params } = config
  if (typeof params !== 'object' || params === null || !('content_type' in params)) {
    return undefined
  }
  return params.content_type
}

const axiosGet = vi.hoisted(() => vi.fn())

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: axiosGet
  },
  r: (path: string) => `/endoreg-api/${path}`
}))

describe('AnonymizationEvaluation', () => {
  beforeEach(() => {
    axiosGet.mockReset()
  })

  it('loads and displays SensitiveMeta rows for videos and PDFs', async () => {
    axiosGet.mockImplementation((_url, config) => {
      const contentType = readContentType(config)

      if (contentType === 'video') {
        return Promise.resolve({
          data: {
            count: 1,
            results: [
              {
                id: 10,
                patientFirstName: 'Ada',
                patientLastName: 'Lovelace',
                patientDobDisplay: '1815-12-10',
                casenumber: 'VID-42',
                examinationDateDisplay: '2026-07-09',
                patientGenderName: 'female',
                centerName: 'Center A',
                isVerified: true,
                text: 'raw video metadata',
                anonymizedText: 'anonymized video metadata'
              }
            ]
          }
        } as AxiosResponse)
      }

      return Promise.resolve({
        data: {
          count: 1,
          results: [
            {
              id: 20,
              patientFirstName: 'Grace',
              patientLastName: 'Hopper',
              patientDobDisplay: '1906-12-09',
              casenumber: 'PDF-7',
              examinationDateDisplay: '2026-07-10',
              patientGenderName: 'female',
              centerName: 'Center B',
              isVerified: false,
              text: 'raw report metadata',
              anonymizedText: 'redacted report metadata'
            }
          ]
        }
      } as AxiosResponse)
    })

    const wrapper = mount(AnonymizationEvaluation)
    await flushPromises()

    expect(axiosGet).toHaveBeenCalledWith('/endoreg-api/media/sensitive-metadata/', {
      params: {
        content_type: 'video',
        ordering: '-id'
      }
    })
    expect(axiosGet).toHaveBeenCalledWith('/endoreg-api/media/sensitive-metadata/', {
      params: {
        content_type: 'pdf',
        ordering: '-id'
      }
    })

    expect(wrapper.text()).toContain('Videos 1')
    expect(wrapper.text()).toContain('PDFs 1')
    expect(wrapper.text()).toContain('Ada')
    expect(wrapper.text()).toContain('VID-42')
    expect(wrapper.text()).toContain('Grace')
    expect(wrapper.text()).toContain('PDF-7')
    expect(wrapper.text()).toContain('redacted report metadata')
  })
})
