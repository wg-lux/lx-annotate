import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({
  flow: {
    currentRuntimeDraft: null as null | {
      payload: { knowledgeBaseModule?: string; knowledgeBaseVersion?: string }
      templateIdentity?: { moduleName?: string; knowledgeBaseVersion?: string } | null
    },
    patientExaminationId: null as number | null
  },
  terminology: {
    activeBundle: null as null | { moduleName: string; version: string }
  }
}))

vi.mock('@/stores/reportingFlowStore', () => ({
  useReportingFlowStore: () => hoisted.flow
}))

vi.mock('@/stores/terminologyStore', () => ({
  useTerminologyStore: () => hoisted.terminology
}))

import { ReportingKnowledgeBaseMismatchError } from '../reportingKnowledgeBaseContext'
import { useReportingKnowledgeBase } from '../useReportingKnowledgeBase'

describe('useReportingKnowledgeBase', () => {
  beforeEach(() => {
    hoisted.flow.currentRuntimeDraft = null
    hoisted.flow.patientExaminationId = 314
    hoisted.terminology.activeBundle = null
  })

  it('pins catalog resolution to the runtime payload before all other identities', () => {
    // Arrange
    hoisted.flow.currentRuntimeDraft = {
      payload: {
        knowledgeBaseModule: 'runtime_module',
        knowledgeBaseVersion: '4.0.0'
      },
      templateIdentity: {
        moduleName: 'template_module',
        knowledgeBaseVersion: '3.0.0'
      }
    }
    hoisted.terminology.activeBundle = { moduleName: 'runtime_module', version: '4.0.0' }
    const detail = ref({
      knowledgeBaseModule: 'detail_module',
      knowledgeBaseVersion: '2.0.0'
    })

    // Act
    const reportingKnowledgeBase = useReportingKnowledgeBase(detail)

    // Assert
    expect(reportingKnowledgeBase.pinnedIdentity.value).toEqual({
      moduleName: 'runtime_module',
      moduleVersion: '4.0.0'
    })
    expect(reportingKnowledgeBase.getCatalogContext()).toEqual({
      moduleName: 'runtime_module',
      moduleVersion: '4.0.0',
      patientExaminationId: 314
    })
  })

  it('falls back from payload to template identity and then reactive detail identity', () => {
    // Arrange
    hoisted.flow.currentRuntimeDraft = {
      payload: {},
      templateIdentity: { moduleName: 'template_module', knowledgeBaseVersion: '3.0.0' }
    }
    const detail = ref({ knowledge_base_module: 'detail_module', knowledge_base_version: '2.0.0' })
    const reportingKnowledgeBase = useReportingKnowledgeBase(detail)

    // Act
    const fromTemplate = reportingKnowledgeBase.pinnedIdentity.value
    hoisted.flow.currentRuntimeDraft = null
    const fromDetail = useReportingKnowledgeBase(detail).pinnedIdentity.value

    // Assert
    expect(fromTemplate).toEqual({ moduleName: 'template_module', moduleVersion: '3.0.0' })
    expect(fromDetail).toEqual({ moduleName: 'detail_module', moduleVersion: '2.0.0' })
  })

  it('returns no catalog context until both bundle and patient examination exist', () => {
    // Arrange
    hoisted.terminology.activeBundle = { moduleName: 'clinical_reporting', version: '2.0.0' }
    hoisted.flow.patientExaminationId = null
    const reportingKnowledgeBase = useReportingKnowledgeBase()

    // Act
    const context = reportingKnowledgeBase.getCatalogContext()

    // Assert
    expect(context).toBeUndefined()
  })

  it('rejects an active bundle that contradicts the pinned runtime draft', () => {
    // Arrange
    hoisted.flow.currentRuntimeDraft = {
      payload: { knowledgeBaseModule: 'clinical_reporting', knowledgeBaseVersion: '2.0.0' }
    }
    hoisted.terminology.activeBundle = { moduleName: 'clinical_reporting', version: '3.0.0' }
    const reportingKnowledgeBase = useReportingKnowledgeBase()

    // Act
    const resolve = () => reportingKnowledgeBase.getCatalogContext()

    // Assert
    expect(resolve).toThrow(ReportingKnowledgeBaseMismatchError)
  })
})
