import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkReportLlmStatus, generateLlmReport, type LlmReportRequest } from '../reportLlmApi'

const transport = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/api/axiosInstance', () => ({
  default: transport,
  r: (path: string) => `/endoreg-api/${path}`
}))

function request(): LlmReportRequest {
  return {
    patientExaminationId: 42,
    templateName: 'colon_report',
    language: 'de',
    documentedFindings: [],
    sectionNotes: [],
    graph: {
      contractVersion: 'knowledge_base_graph_v1',
      contextId: 'context-a',
      graphSnapshotId: 'snapshot-a',
      examinationName: 'colonoscopy',
      identity: { knowledgeBaseModule: 'test_kb', knowledgeBaseVersion: '1' },
      edges: [],
      reportTemplates: [],
      concepts: {
        moduleName: 'test_kb',
        knowledgeBaseModule: 'test_kb',
        knowledgeBaseVersion: '1',
        classification: [],
        classificationType: [],
        classificationChoice: [],
        classificationChoiceDescriptor: [],
        examination: [],
        examinationType: [],
        finding: [],
        findingType: [],
        indication: [],
        indicationType: [],
        intervention: [],
        interventionType: [],
        unit: [],
        unitType: [],
        informationSource: [],
        informationSourceType: [],
        citation: []
      }
    }
  }
}

describe('report LLM API boundary', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([{}, { ready: false, model: 'model' }, { ready: true, model: '' }, '<html>login</html>'])(
    'rejects a non-ready or malformed status response: %j',
    async (data) => {
      transport.get.mockResolvedValue({ data })
      await expect(checkReportLlmStatus(new AbortController().signal)).rejects.toThrow(
        'nicht bereit'
      )
    }
  )

  it('uses the same-origin authenticated route and a bounded status timeout', async () => {
    transport.get.mockResolvedValue({ data: { ready: true, model: 'glm-5.2' } })
    const signal = new AbortController().signal
    await expect(checkReportLlmStatus(signal)).resolves.toBe('glm-5.2')
    expect(transport.get).toHaveBeenCalledWith('/endoreg-api/reporting/llm/status/', {
      signal,
      timeout: 15_000
    })
  })

  it.each([
    { text: '', graphContextId: 'context-a' },
    { text: 'Wrong examination', graphContextId: 'context-b' },
    { text: 42, graphContextId: 'context-a' }
  ])('rejects incomplete or mismatched report responses: %j', async (data) => {
    transport.post.mockResolvedValue({ data })
    await expect(generateLlmReport(request(), new AbortController().signal)).rejects.toThrow(
      'LLM-Antwort'
    )
  })

  it('returns report text only for the requested graph context', async () => {
    transport.post.mockResolvedValue({
      data: { text: ' Befund: Erosion. ', graphContextId: 'context-a' }
    })
    const signal = new AbortController().signal
    const payload = request()
    await expect(generateLlmReport(payload, signal)).resolves.toBe('Befund: Erosion.')
    expect(transport.post).toHaveBeenCalledWith('/endoreg-api/reporting/llm/generate/', payload, {
      signal,
      timeout: 135_000
    })
  })
})
