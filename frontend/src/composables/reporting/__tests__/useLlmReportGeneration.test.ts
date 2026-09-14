import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, reactive } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { useLlmReportGeneration, type LlmReportContext } from '../useLlmReportGeneration'
import { checkReportLlmStatus, generateLlmReport } from '@/api/reportLlmApi'
import { fetchExaminationReportingContext } from '@/api/knowledgeBaseGraphApi'
import type { ExaminationReportingContext } from '@/types/knowledgeBaseGraph'

vi.mock('@/api/reportLlmApi', () => ({
  checkReportLlmStatus: vi.fn(),
  generateLlmReport: vi.fn()
}))
vi.mock('@/api/knowledgeBaseGraphApi', () => ({ fetchExaminationReportingContext: vi.fn() }))

function context(): LlmReportContext {
  return {
    patientExaminationId: 42,
    moduleName: 'test_kb',
    moduleVersion: '1.0.0',
    examinationName: 'colonoscopy',
    templateName: 'colon_report',
    language: 'de',
    templateIdentity: {
      moduleName: 'test_kb',
      knowledgeBaseVersion: '1.0.0',
      templateVersion: '1',
      templateHash: 'abc',
      lifecycleStatus: 'published',
      readiness: null
    },
    documentedFindings: [{ finding: 'erosion', classificationChoices: [] }],
    sectionNotes: [{ name: 'findings', note: 'Documented note' }],
    existingText: ''
  }
}

function graph(): ExaminationReportingContext {
  return {
    contractVersion: 'knowledge_base_graph_v1',
    identity: { knowledgeBaseModule: 'test_kb', knowledgeBaseVersion: '1.0.0' },
    graphSnapshotId: `sha256:${'a'.repeat(64)}`,
    contextId: `sha256:${'b'.repeat(64)}`,
    examinationName: 'colonoscopy',
    edges: [],
    concepts: {
      moduleName: 'test_kb',
      knowledgeBaseModule: 'test_kb',
      knowledgeBaseVersion: '1.0.0',
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
    },
    reportTemplates: [
      {
        name: 'colon_report',
        examination: 'colonoscopy',
        identity: context().templateIdentity,
        reportSections: [],
        validators: { examinationValidators: [], findingsValidators: [] },
        conceptCoverage: null,
      }
    ]
  }
}

const scopes: ReturnType<typeof effectScope>[] = []
function setup(initial = context()) {
  const current = reactive(initial)
  const applyText = vi.fn()
  const confirmReplace = vi.fn(() => true)
  const scope = effectScope()
  scopes.push(scope)
  const generation = scope.run(() =>
    useLlmReportGeneration({
      getContext: () => current,
      applyText,
      confirmReplace
    })
  )
  if (!generation) {
    throw new Error('Composable scope did not initialize')
  }
  return { current, applyText, confirmReplace, generation, scope }
}

beforeEach(() => {
  vi.mocked(checkReportLlmStatus).mockResolvedValue('clinical-test')
  vi.mocked(fetchExaminationReportingContext).mockResolvedValue(graph())
  vi.mocked(generateLlmReport).mockResolvedValue('Befund: Erosion.')
})
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
})

describe('status-gated LLM report generation', () => {
  it('checks status, obtains the graph, then generates and applies editable text', async () => {
    const { generation, applyText } = setup({ ...context(), verbosity: 'detailed' })
    await generation.generate()
    expect(checkReportLlmStatus).toHaveBeenCalledOnce()
    expect(fetchExaminationReportingContext).toHaveBeenCalledWith('test_kb', '1.0.0', 'colonoscopy')
    expect(vi.mocked(checkReportLlmStatus).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(fetchExaminationReportingContext).mock.invocationCallOrder[0]
    )
    expect(vi.mocked(fetchExaminationReportingContext).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(generateLlmReport).mock.invocationCallOrder[0]
    )
    expect(generateLlmReport).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: graph(),
        verbosity: 'detailed',
        documentedFindings: context().documentedFindings,
        sectionNotes: context().sectionNotes
      }),
      expect.any(AbortSignal)
    )
    expect(applyText).toHaveBeenCalledWith('Befund: Erosion.', 42)
    expect(generation.notice.value).toContain('fachlich prüfen')
  })

  it('never fetches the graph or sends clinical content when status fails', async () => {
    vi.mocked(checkReportLlmStatus).mockRejectedValue(new Error('Model unavailable'))
    const { generation, applyText } = setup()
    await generation.generate()
    expect(fetchExaminationReportingContext).not.toHaveBeenCalled()
    expect(generateLlmReport).not.toHaveBeenCalled()
    expect(applyText).not.toHaveBeenCalled()
    expect(generation.error.value).toBe('Model unavailable')
    expect(generation.busy.value).toBe(false)
  })

  it('preserves existing text when replacement is declined', async () => {
    const { generation, confirmReplace, applyText } = setup({
      ...context(),
      existingText: 'Clinician text'
    })
    confirmReplace.mockReturnValue(false)
    await generation.generate()
    expect(checkReportLlmStatus).not.toHaveBeenCalled()
    expect(applyText).not.toHaveBeenCalled()
  })

  it.each(['patient', 'text', 'findings', 'template', 'language'] as const)(
    'discards a late response after %s changes',
    async (change) => {
      let resolve: (text: string) => void = () => {
        throw new Error('Request not initialized')
      }
      vi.mocked(generateLlmReport).mockImplementation(
        () =>
          new Promise<string>((done) => {
            resolve = done
          })
      )
      const { generation, current, applyText } = setup()
      const pending = generation.generate()
      await flushPromises()
      expect(generation.phase.value).toBe('generating')
      if (change === 'patient') {
        current.patientExaminationId = 43
      }
      if (change === 'text') {
        current.existingText = 'New clinician edit'
      }
      if (change === 'findings') {
        current.documentedFindings.push({ finding: 'polyp', classificationChoices: [] })
      }
      if (change === 'template') {
        current.templateName = 'other_template'
      }
      if (change === 'language') {
        current.language = 'en'
      }
      resolve('Outdated report')
      await pending
      expect(applyText).not.toHaveBeenCalled()
      expect(generation.notice.value).toContain('geändert')
    }
  )

  it('prevents duplicate clicks and ignores responses after unmount', async () => {
    let resolve: (model: string) => void = () => {
      throw new Error('Request not initialized')
    }
    vi.mocked(checkReportLlmStatus).mockImplementation(
      () =>
        new Promise<string>((done) => {
          resolve = done
        })
    )
    const { generation, scope, applyText } = setup()
    const pending = generation.generate()
    await generation.generate()
    expect(checkReportLlmStatus).toHaveBeenCalledOnce()
    scope.stop()
    resolve('model')
    await pending
    expect(generateLlmReport).not.toHaveBeenCalled()
    expect(applyText).not.toHaveBeenCalled()
  })

  it('preserves the draft after a generation timeout', async () => {
    vi.mocked(generateLlmReport).mockRejectedValue(new Error('Timeout'))
    const { generation, applyText } = setup()
    await generation.generate()
    expect(generation.error.value).toBe('Timeout')
    expect(applyText).not.toHaveBeenCalled()
  })
})
