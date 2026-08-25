import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchReportTemplatesByExamination,
  fetchBuilderReportTemplatesByExamination,
  fetchReportTemplatePreviewByName,
  getReportTemplateSectionDisplayName,
  getReportTemplateDisplayName,
  normalizeDefinitionValidationResult,
  normalizeReportConceptCoverage,
  normalizeTemplatePayload,
  validatePatientFindingsAgainstTemplate,
  validateReportTemplateRuntimeFromLedger,
  validateReportTemplateRuntime
} from '@/api/reportTemplatesApi'

const hoisted = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: hoisted.get,
    post: hoisted.post
  },
  endoregApi: (path: string) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
  dtypesApi: (path: string) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}))

describe('reportTemplatesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('preserves and selects canonical report-template translations', () => {
    const payload = normalizeTemplatePayload({
      name: 'colonoscopy_training_basic',
      name_de: 'Koloskopie – leitlinienbasierte Qualitätsdokumentation',
      name_en: 'Colonoscopy – guideline-based quality documentation',
      examination: 'colonoscopy'
    })

    expect(payload?.nameDe).toBe('Koloskopie – leitlinienbasierte Qualitätsdokumentation')
    expect(payload?.nameEn).toBe('Colonoscopy – guideline-based quality documentation')
    expect(payload && getReportTemplateDisplayName(payload, 'de')).toBe(
      'Koloskopie – leitlinienbasierte Qualitätsdokumentation'
    )
    expect(payload && getReportTemplateDisplayName(payload, 'en')).toBe(
      'Colonoscopy – guideline-based quality documentation'
    )
    expect(getReportTemplateDisplayName({ name: 'colonoscopy_training_basic' }, 'de')).toBe(
      'Colonoscopy Training Basic'
    )
  })

  it('preserves localized section titles without synthesizing frontend labels', () => {
    const payload = normalizeTemplatePayload({
      name: 'localized_template',
      examination: 'colonoscopy',
      report_sections: [
        {
          name: 'pathologische_befunde',
          title_de: 'Pathologische Befunde',
          title_en: 'Pathological findings'
        }
      ]
    })
    const section = payload?.reportSections[0]

    expect(section?.titleDe).toBe('Pathologische Befunde')
    expect(section?.titleEn).toBe('Pathological findings')
    expect(section && getReportTemplateSectionDisplayName(section, 'de')).toBe(
      'Pathologische Befunde'
    )
    expect(section && getReportTemplateSectionDisplayName(section, 'en')).toBe(
      'Pathological findings'
    )
  })

  it('normalizes validators into typed descriptors', () => {
    const payload = normalizeTemplatePayload({
      name: 'star_upper_gi_main',
      examination: 'star_upper_gi_endoscopy',
      reportSections: [
        {
          name: 'examination_baseline',
          position: 0,
          findings: [
            {
              finding: 'esophagus_polyp',
              required: false,
              multipleAllowed: true,
              classifications: [{ classification: 'size_mm', required: true }]
            }
          ]
        }
      ],
      validators: {
        findingsValidators: [
          {
            name: 'polyp_has_lst_if_large',
            finding: 'esophagus_polyp',
            operator: 'condition',
            query: {
              finding: 'esophagus_polyp',
              operator: 'condition',
              condition: {
                any: [{ classification: 'size_mm', comparator: 'gt', value: 10 }],
                thenRequires: [{ classification: 'lst' }]
              }
            }
          }
        ],
        examinationValidators: [
          {
            name: 'gastroscopy_has_baseline_info',
            findingValidators: ['polyp_has_lst_if_large'],
            examinationValidators: []
          }
        ]
      }
    })

    expect(payload).not.toBeNull()
    expect(payload?.validators.findingsValidators[0].requiredClassifications).toEqual(['lst'])
    expect(payload?.validators.findingsValidators[0].relatedSections).toEqual([
      'examination_baseline'
    ])
    expect(payload?.validators.examinationValidators[0].relatedSections).toEqual([
      'examination_baseline'
    ])
  })

  it('uses an explicit fallback for malformed condition values in summaries', () => {
    const payload = normalizeTemplatePayload({
      name: 'safe_summary',
      examination: 'upper_gi_endoscopy',
      validators: {
        findingsValidators: [
          {
            name: 'malformed_value',
            finding: 'esophagus_polyp',
            operator: 'condition',
            query: {
              condition: {
                any: [
                  {
                    classification: 'size_mm',
                    comparator: 'gt',
                    value: { unexpected: true }
                  }
                ]
              }
            }
          }
        ]
      }
    })

    const summary = payload?.validators.findingsValidators[0]?.summary
    expect(summary).toContain('ungültiger Wert')
    expect(summary).not.toContain('[object Object]')
  })

  it('preserves validated custom descriptor kinds from the knowledge base', () => {
    const payload = normalizeTemplatePayload({
      name: 'custom_descriptor_template',
      examination: 'upper_gi_endoscopy',
      report_sections: [
        {
          name: 'baseline',
          findings: [
            {
              finding: 'esophagus_polyp',
              classifications: [
                {
                  classification: 'custom_measurement',
                  input: {
                    choices: [
                      {
                        name: 'measurement_choice',
                        descriptors: [{ name: 'measurement_value', type: 'custom_measurement' }]
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      ]
    })

    expect(
      payload?.reportSections[0]?.findings[0]?.classifications[0]?.input?.choices[0]?.descriptors[0]
        ?.type
    ).toBe('custom_measurement')
  })

  it('loads draft templates through the preview endpoint', async () => {
    hoisted.get.mockResolvedValue({
      data: {
        name: 'draft_template',
        examination: 'colonoscopy',
        report_sections: [],
        validators: { findings_validators: [], examination_validators: [] }
      }
    })

    await expect(
      fetchReportTemplatePreviewByName('report_template_examples', '0.1.0', 'draft_template')
    ).resolves.toMatchObject({ name: 'draft_template', examination: 'colonoscopy' })
    expect(hoisted.get).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/report_template_examples/draft_template/preview?version=0.1.0'
    )
  })

  it('uses the builder list endpoint so drafts remain outside clinical selection', async () => {
    hoisted.get.mockResolvedValue({
      data: [
        {
          name: 'draft_template',
          examination: 'colonoscopy',
          lifecycle_status: 'draft',
          report_sections: [],
          validators: { findings_validators: [], examination_validators: [] }
        }
      ]
    })

    await expect(
      fetchBuilderReportTemplatesByExamination('module', '2.0.0', 'colonoscopy')
    ).resolves.toMatchObject([{ name: 'draft_template' }])
    expect(hoisted.get).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/builder/by-examination/module/colonoscopy?version=2.0.0'
    )
  })

  it('normalizes snake_case template payloads', () => {
    const payload = normalizeTemplatePayload({
      name: 'snake_template',
      examination: 'snake_exam',
      report_sections: [
        {
          name: 'section_a',
          position: '2',
          findings: [
            {
              finding: 'f1',
              required: true,
              multiple_allowed: true,
              classifications: [
                {
                  classification: 'c1',
                  required: true,
                  input: {
                    choices: [
                      {
                        name: 'medication_propofol',
                        descriptors: [
                          {
                            name: 'propofol_dose_mg_value',
                            type: 'numeric',
                            unit: 'milligram',
                            unit_abbreviation: 'mg',
                            numeric_min: 0,
                            numeric_max: 2000
                          }
                        ]
                      }
                    ]
                  }
                }
              ]
            }
          ]
        },
        {
          name: 'section_b',
          position: 1,
          findings: ['f2']
        }
      ],
      validators: {
        findings_validators: [
          {
            name: 'v1',
            finding: 'f1',
            operator: 'condition',
            query: {
              finding: 'f1',
              operator: 'condition',
              condition: {
                any: [{ classification: 'size_mm', comparator: 'gt', value: 10 }],
                then_requires: [{ classification: 'c1' }]
              }
            }
          }
        ],
        examination_validators: [
          {
            name: 'ev1',
            finding_validators: ['v1'],
            examination_validators: []
          }
        ]
      }
    })

    expect(payload).not.toBeNull()
    expect(payload?.reportSections.map((section) => section.name)).toEqual([
      'section_b',
      'section_a'
    ])
    expect(payload?.reportSections[1].findings[0].multipleAllowed).toBe(true)
    expect(
      payload?.reportSections[1].findings[0].classifications[0].input?.choices[0].descriptors[0]
    ).toEqual({
      name: 'propofol_dose_mg_value',
      type: 'numeric',
      unit: 'milligram',
      unitAbbreviation: 'mg',
      numericMin: 0,
      numericMax: 2000
    })
    expect(payload?.validators.findingsValidators[0].requiredClassifications).toEqual(['c1'])
    expect(payload?.validators.examinationValidators[0].findingValidators).toEqual(['v1'])
  })

  it('keeps template identity, readiness and patient/history section fields', () => {
    const payload = normalizeTemplatePayload({
      name: 'published_template',
      examination: 'star_upper_gi_endoscopy',
      lifecycle_status: 'published',
      knowledge_base_module: 'report_template_examples',
      knowledge_base_version: '0.2.8',
      template_version: '3',
      template_hash: 'sha256:template',
      readiness: { can_publish: true, warnings: ['reviewed'] },
      report_sections: [
        {
          name: 'patient_context',
          position: 0,
          section_kind: 'patient_data',
          fields: [{ key: 'date_of_birth', required: true, source: 'patient' }],
          findings: []
        }
      ]
    })

    expect(payload?.identity).toMatchObject({
      lifecycleStatus: 'published',
      knowledgeBaseVersion: '0.2.8',
      templateVersion: '3',
      templateHash: 'sha256:template'
    })
    expect(payload?.identity.readiness?.canPublish).toBe(true)
    expect(payload?.reportSections[0]).toMatchObject({
      sectionKind: 'patient_data',
      fields: [{ key: 'date_of_birth', source: 'patient' }]
    })
  })

  it('validates and normalizes the server concept_coverage contract', () => {
    const coverage = normalizeReportConceptCoverage({
      contract_version: 'report_concept_coverage_v1',
      identity: {
        moduleName: 'colonoscopy',
        module_version: '1.2.0',
        moduleDigest: 'a'.repeat(64),
        template_name: 'standard',
        template_version: '3',
        templateDigest: 'b'.repeat(64)
      },
      provenance: {
        resolver: 'lx-resolver',
        resolverVersion: '1.0.0',
        evidence_digest: 'c'.repeat(64)
      },
      concepts: [
        {
          conceptId: 'lesion.size',
          label: 'Größe',
          applicability: { status: 'required', rule: null, reason: null },
          validation_status: 'present',
          evidencePath: ['findings', '0', 'classifications', 'size']
        }
      ]
    })

    expect(coverage).toMatchObject({
      contractVersion: 'report_concept_coverage_v1',
      identity: { moduleName: 'colonoscopy', templateDigest: 'b'.repeat(64) },
      concepts: [{ conceptId: 'lesion.size', validationStatus: 'present' }]
    })
    expect(
      normalizeReportConceptCoverage({
        ...coverage,
        concepts: [{ ...(coverage?.concepts[0] || {}), evidencePath: [] }]
      })
    ).toBeNull()
  })

  it('marks a present but malformed server coverage block as invalid', () => {
    const payload = normalizeTemplatePayload({
      name: 'template',
      examination: 'colonoscopy',
      concept_coverage: { contract_version: 'report_concept_coverage_v1', concepts: [] }
    })

    expect(payload?.conceptCoverage).toBeNull()
    expect(payload?.conceptCoverageState).toBe('invalid')
  })

  it('normalizes runtime validation responses', async () => {
    hoisted.post.mockResolvedValue({
      data: {
        templateName: 'star_upper_gi_main',
        ok: false,
        evaluatedFindingsCount: 2,
        classification_validators: [
          {
            name: 'lst_required_when_large',
            ok: false,
            operator: 'condition',
            finding: 'esophagus_polyp',
            classification: 'lst',
            precedence: 'required',
            matched_occurrences: 1,
            triggered_occurrences: 0,
            hint: { classification_name: 'lst' },
            issues: [
              {
                code: 'missing_data_requirement',
                level: 'warning',
                message: 'Missing source data',
                validator_name: 'lst_required_when_large',
                validator_kind: 'classification_validator',
                details: { missing_condition_classifications: ['size_mm'] }
              }
            ]
          }
        ],
        intervention_validators: [
          {
            name: 'biopsy_required_when_large',
            ok: false,
            operator: 'condition',
            finding: 'esophagus_polyp',
            intervention: 'biopsy',
            precedence: 'required',
            matched_occurrences: 1,
            triggered_occurrences: 1,
            hint: { intervention_name: 'biopsy' },
            issues: []
          }
        ],
        findingsValidators: [
          {
            name: 'polyp_has_lst_if_large',
            ok: false,
            operator: 'condition',
            finding: 'esophagus_polyp',
            matchedOccurrences: 1,
            triggeredOccurrences: 1,
            missingRequiredClassifications: ['lst'],
            issues: [
              {
                code: 'missing_required_classification',
                level: 'error',
                message: 'Missing lst',
                validatorName: 'polyp_has_lst_if_large',
                validatorKind: 'findings_validator'
              }
            ]
          }
        ],
        examinationValidators: [],
        unit_validators: [
          {
            name: 'size_uses_mm',
            ok: false,
            operator: 'exists',
            finding: 'esophagus_polyp',
            classification: 'size_mm',
            unit: 'mm',
            precedence: 'required',
            matched_occurrences: 1,
            triggered_occurrences: 0,
            hint: { unit_name: 'mm' },
            issues: []
          }
        ],
        issues: [
          {
            code: 'missing_required_classification',
            level: 'error',
            message: 'Missing lst',
            validatorName: 'polyp_has_lst_if_large',
            validatorKind: 'findings_validator'
          }
        ]
      }
    })

    const result = await validateReportTemplateRuntime(
      'report_template_examples',
      '0.1.0',
      'star_upper_gi_main',
      {
        patient: 'test_patient',
        examiners: [],
        examination: 'star_upper_gi_endoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '0.1.0',
        patientFindings: [
          {
            finding: 'esophagus_polyp',
            classificationChoices: [
              {
                classification: 'size_mm',
                classificationChoice: 'size_mm',
                descriptors: [
                  {
                    classificationChoiceDescriptor: 'length_mm_descriptor',
                    descriptorValue: 12
                  }
                ]
              }
            ]
          }
        ]
      }
    )

    expect(hoisted.post).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/report_template_examples/star_upper_gi_main/validate?version=0.1.0',
      {
        patient: 'test_patient',
        examiners: [],
        examination: 'star_upper_gi_endoscopy',
        knowledge_base_module: 'report_template_examples',
        knowledge_base_version: '0.1.0',
        patient_findings: [
          {
            finding: 'esophagus_polyp',
            patient_examination: 'frontend_runtime_exam',
            patient_finding_classifications: [
              {
                patient_finding: 'frontend_runtime_exam_finding_1',
                patient_finding_classification_choices: [
                  {
                    classification: 'size_mm',
                    classification_choice: 'size_mm',
                    patient_finding_classifications:
                      'frontend_runtime_exam_finding_1_classifications_1',
                    patient_finding_classification_choice_descriptors: [
                      {
                        descriptor_value: 12,
                        classification_choice_descriptor: 'length_mm_descriptor',
                        patient_finding_classification_choice:
                          'frontend_runtime_exam_finding_1_classifications_1_choice_1_descriptor_parent',
                        uuid: 'frontend_runtime_exam_finding_1_classifications_1_choice_1_descriptor_1'
                      }
                    ],
                    uuid: 'frontend_runtime_exam_finding_1_classifications_1_choice_1'
                  }
                ],
                uuid: 'frontend_runtime_exam_finding_1_classifications_1'
              }
            ],
            patient_finding_interventions: [],
            uuid: 'frontend_runtime_exam_finding_1'
          }
        ]
      }
    )
    expect(result.templateName).toBe('star_upper_gi_main')
    expect(result.classificationValidators[0]).toMatchObject({
      name: 'lst_required_when_large',
      classification: 'lst',
      matchedOccurrences: 1,
      triggeredOccurrences: 0
    })
    expect(result.classificationValidators[0].issues[0]).toMatchObject({
      code: 'missing_data_requirement',
      level: 'warning',
      validatorKind: 'classification_validator',
      details: { missing_condition_classifications: ['size_mm'] }
    })
    expect(result.interventionValidators[0]).toMatchObject({
      name: 'biopsy_required_when_large',
      intervention: 'biopsy',
      triggeredOccurrences: 1
    })
    expect(result.findingsValidators[0].missingRequiredClassifications).toEqual(['lst'])
    expect(result.unitValidators[0]).toMatchObject({
      name: 'size_uses_mm',
      unit: 'mm'
    })
    expect(result.issues[0].code).toBe('missing_required_classification')
  })

  it('calls validate-from-ledger endpoint for runtime validation', async () => {
    hoisted.post.mockResolvedValue({
      data: {
        templateName: 'star_upper_gi_main',
        ok: true,
        evaluatedFindingsCount: 0,
        findingsValidators: [],
        examinationValidators: [],
        issues: []
      }
    })

    const result = await validateReportTemplateRuntimeFromLedger(
      'report_template_examples',
      '0.1.0',
      'star_upper_gi_main',
      42
    )

    expect(hoisted.post).toHaveBeenCalledWith(
      '/dtypes-api/report-templates/report_template_examples/star_upper_gi_main/validate-from-ledger/42?version=0.1.0'
    )
    expect(result.templateName).toBe('star_upper_gi_main')
    expect(result.ok).toBe(true)
  })

  it('throws on invalid runtime validation payloads', async () => {
    hoisted.post.mockResolvedValue({
      data: {
        ok: true
      }
    })

    await expect(
      validateReportTemplateRuntime('report_template_examples', '0.1.0', 'star_upper_gi_main', {
        patient: 'test_patient',
        examiners: [],
        examination: 'star_upper_gi_endoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '0.1.0',
        patientFindings: []
      })
    ).rejects.toThrow('Ungültiges Runtime-Validierungsergebnis.')
  })

  it('rejects a runtime payload pinned to a different terminology version', async () => {
    await expect(
      validateReportTemplateRuntime('report_template_examples', '2.0.0', 'template', {
        patient: 'test_patient',
        examiners: [],
        examination: 'colonoscopy',
        knowledgeBaseModule: 'report_template_examples',
        knowledgeBaseVersion: '1.0.0',
        patientFindings: []
      })
    ).rejects.toThrow('gehört nicht zur angeforderten Terminologieversion')
    expect(hoisted.post).not.toHaveBeenCalled()
  })

  it('fails closed when the canonical ledger validation endpoint is unavailable', async () => {
    hoisted.post.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { detail: 'Not Found' }
      }
    })

    await expect(
      validatePatientFindingsAgainstTemplate({
        moduleName: 'report_template_examples',
        moduleVersion: '0.1.0',
        templateName: 'star_upper_gi_main',
        patientExaminationId: 42
      })
    ).rejects.toMatchObject({ response: { status: 404 } })

    expect(hoisted.post).toHaveBeenCalledTimes(1)
  })

  it('preserves specific ledger validation errors', async () => {
    hoisted.post.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { detail: 'Template not found for module' }
      }
    })

    await expect(
      validatePatientFindingsAgainstTemplate({
        moduleName: 'report_template_examples',
        moduleVersion: '0.1.0',
        templateName: 'star_upper_gi_main',
        patientExaminationId: 42
      })
    ).rejects.toMatchObject({
      response: {
        status: 404
      }
    })
  })

  it('fetchReportTemplatesByExamination returns empty array for non-array payloads', async () => {
    hoisted.get.mockResolvedValue({
      data: { results: [] }
    })

    const result = await fetchReportTemplatesByExamination(
      'report_template_examples',
      '0.1.0',
      'star_upper_gi_endoscopy'
    )

    expect(result).toEqual([])
  })

  it('normalizes structure validation responses', () => {
    const result = normalizeDefinitionValidationResult({
      template_name: 'star_upper_gi_main',
      ok: true,
      graph: {
        template_name: 'star_upper_gi_main',
        examination: 'star_upper_gi_endoscopy',
        start_node_id: 'template::star_upper_gi_main',
        ordered_section_node_ids: ['section::baseline'],
        nodes: [
          {
            node_id: 'template::star_upper_gi_main',
            node_type: 'template',
            name: 'star_upper_gi_main',
            tokens: ['star_upper_gi_main']
          }
        ],
        edges: []
      },
      issues: []
    })

    expect(result).not.toBeNull()
    expect(result?.graph.templateName).toBe('star_upper_gi_main')
    expect(result?.graph.nodes[0].nodeType).toBe('template')
  })
})
