import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchExaminationReportingContext,
  fetchKnowledgeBaseGraphSnapshot,
  normalizeExaminationReportingContext,
  normalizeKnowledgeBaseGraphSnapshot
} from '@/api/knowledgeBaseGraphApi'

const axiosGet = vi.hoisted(() => vi.fn())

vi.mock('@/api/axiosInstance', () => ({
  default: { get: axiosGet },
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}))

const hash = `sha256:${'a'.repeat(64)}`
const contextHash = `sha256:${'b'.repeat(64)}`

function concepts() {
  return {
    moduleName: 'star_upper_gi',
    knowledgeBaseModule: 'star_upper_gi',
    knowledgeBaseVersion: '0.1.1',
    classification: [],
    classificationType: [],
    classificationChoice: [],
    classificationChoiceDescriptor: [],
    examination: [
      {
        name: 'star_upper_gi_endoscopy',
        nameDe: 'Ösophagogastroduodenoskopie',
        findings: ['star_upper_gi_polyp'],
        examinationTypes: ['upper_gi_endoscopy'],
        indications: []
      }
    ],
    examinationType: [{ name: 'upper_gi_endoscopy' }],
    finding: [
      {
        name: 'star_upper_gi_polyp',
        classifications: [],
        findingTypes: [],
        interventions: [],
        causedByInterventions: []
      }
    ],
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

function template() {
  return {
    name: 'star_upper_gi_main',
    nameDe: 'STAR Bericht',
    version: '1.0.0',
    examination: 'star_upper_gi_endoscopy',
    guidelineReferences: [],
    coverageConcepts: [],
    reportSections: [],
    validators: {},
    lifecycleStatus: 'published',
    readiness: { canPublish: true, blockingIssues: [], warnings: [] },
    issues: []
  }
}

function contextPayload() {
  return {
    contractVersion: 'knowledge_base_graph_v1',
    identity: {
      knowledgeBaseModule: 'star_upper_gi',
      knowledgeBaseVersion: '0.1.1'
    },
    graphSnapshotId: hash,
    contextId: contextHash,
    examinationName: 'star_upper_gi_endoscopy',
    concepts: concepts(),
    reportTemplates: [template()],
    edges: [
      {
        source: { kind: 'examination', name: 'star_upper_gi_endoscopy' },
        relationship: 'has_finding',
        target: { kind: 'finding', name: 'star_upper_gi_polyp' }
      },
      {
        source: { kind: 'report_template', name: 'star_upper_gi_main' },
        relationship: 'for_examination',
        target: { kind: 'examination', name: 'star_upper_gi_endoscopy' }
      }
    ]
  }
}

describe('knowledge-base graph API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads an exact versioned examination projection and preserves immutable identity', async () => {
    axiosGet.mockResolvedValue({ data: contextPayload() })

    const result = await fetchExaminationReportingContext(
      'star_upper_gi',
      '0.1.1',
      'star_upper_gi_endoscopy'
    )

    expect(axiosGet).toHaveBeenCalledWith(
      '/dtypes-api/knowledge-bases/star_upper_gi/0.1.1/examinations/star_upper_gi_endoscopy/reporting-context'
    )
    expect(result.graphSnapshotId).toBe(hash)
    expect(result.contextId).toBe(contextHash)
    expect(result.concepts.finding.map((finding) => finding.name)).toEqual(['star_upper_gi_polyp'])
    expect(result.reportTemplates[0]).toMatchObject({
      name: 'star_upper_gi_main',
      identity: {
        moduleName: 'star_upper_gi',
        knowledgeBaseVersion: '0.1.1',
        templateVersion: '1.0.0',
        lifecycleStatus: 'published'
      }
    })
  })

  it('loads and validates the complete graph snapshot', async () => {
    axiosGet.mockResolvedValue({
      data: {
        ...contextPayload(),
        snapshotId: hash,
        declaringModules: ['star_upper_gi'],
        reportTemplates: [template()]
      }
    })

    const result = await fetchKnowledgeBaseGraphSnapshot('star_upper_gi', '0.1.1')

    expect(axiosGet).toHaveBeenCalledWith('/dtypes-api/knowledge-bases/star_upper_gi/0.1.1/graph')
    expect(result.snapshotId).toBe(hash)
    expect(result.declaringModules).toEqual(['star_upper_gi'])
  })

  it('rejects unsupported contracts, contradictory identities, and dangling edges', () => {
    expect(() =>
      normalizeExaminationReportingContext({
        ...contextPayload(),
        contractVersion: 'knowledge_base_graph_v2'
      })
    ).toThrow('Unsupported knowledge-base graph contract version')

    expect(() =>
      normalizeExaminationReportingContext({
        ...contextPayload(),
        concepts: { ...concepts(), knowledgeBaseVersion: '9.9.9' }
      })
    ).toThrow('Concept collection identity does not match graph identity')

    expect(() =>
      normalizeExaminationReportingContext({
        ...contextPayload(),
        edges: [
          {
            source: { kind: 'examination', name: 'star_upper_gi_endoscopy' },
            relationship: 'has_finding',
            target: { kind: 'finding', name: 'not_in_projection' }
          }
        ]
      })
    ).toThrow('references missing node finding:not_in_projection')
  })

  it('rejects a coherent response for a different requested identity', async () => {
    axiosGet.mockResolvedValue({ data: contextPayload() })

    await expect(
      fetchExaminationReportingContext('different_module', '0.1.1', 'star_upper_gi_endoscopy')
    ).rejects.toThrow('response identity does not match the request')
    await expect(
      fetchExaminationReportingContext('star_upper_gi', '0.1.1', 'different_examination')
    ).rejects.toThrow('response identity does not match the request')
  })

  it('rejects malformed hashes and duplicate semantic edges', () => {
    expect(() =>
      normalizeKnowledgeBaseGraphSnapshot({
        ...contextPayload(),
        snapshotId: 'not-a-hash',
        declaringModules: ['star_upper_gi']
      })
    ).toThrow('snapshotId must be a sha256 identifier')

    const duplicateEdge = contextPayload().edges[0]
    expect(() =>
      normalizeExaminationReportingContext({
        ...contextPayload(),
        edges: [duplicateEdge, duplicateEdge]
      })
    ).toThrow('Graph edges must be unique')

    const malformedConcepts = concepts()
    malformedConcepts.finding = [{ ...malformedConcepts.finding[0], name: '' }]
    expect(() =>
      normalizeExaminationReportingContext({
        ...contextPayload(),
        concepts: malformedConcepts
      })
    ).toThrow('concepts.finding[0].name must be a non-empty string')
  })
})
