import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { findingsApi } from '@/api/findingsApi';
import { fetchReportTemplatesByExamination, normalizeDefinitionValidationResult, normalizeTemplatePayload, validatePatientFindingsAgainstTemplate, validateReportTemplateRuntimeFromLedger, validateReportTemplateRuntime } from '@/api/reportTemplatesApi';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn()
    },
    endoregApi: (path) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
    dtypesApi: (path) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}));
describe('reportTemplatesApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
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
        });
        expect(payload).not.toBeNull();
        expect(payload?.validators.findingsValidators[0].requiredClassifications).toEqual(['lst']);
        expect(payload?.validators.findingsValidators[0].relatedSections).toEqual([
            'examination_baseline'
        ]);
        expect(payload?.validators.examinationValidators[0].relatedSections).toEqual([
            'examination_baseline'
        ]);
    });
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
                            classifications: [{ classification: 'c1', required: true }]
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
        });
        expect(payload).not.toBeNull();
        expect(payload?.reportSections.map((section) => section.name)).toEqual([
            'section_b',
            'section_a'
        ]);
        expect(payload?.reportSections[1].findings[0].multipleAllowed).toBe(true);
        expect(payload?.validators.findingsValidators[0].requiredClassifications).toEqual(['c1']);
        expect(payload?.validators.examinationValidators[0].findingValidators).toEqual(['v1']);
    });
    it('normalizes runtime validation responses', async () => {
        vi.mocked(axiosInstance.post).mockResolvedValue({
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
        });
        const result = await validateReportTemplateRuntime('report_template_examples', 'star_upper_gi_main', {
            patient: 'test_patient',
            examiners: [],
            examination: 'star_upper_gi_endoscopy',
            knowledgeBaseModule: 'report_template_examples',
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
        });
        expect(axiosInstance.post).toHaveBeenCalledWith('/dtypes-api/report-templates/report_template_examples/star_upper_gi_main/validate', {
            patient: 'test_patient',
            examiners: [],
            examination: 'star_upper_gi_endoscopy',
            knowledge_base_module: 'report_template_examples',
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
                                    patient_finding_classifications: 'frontend_runtime_exam_finding_1_classifications_1',
                                    patient_finding_classification_choice_descriptors: [
                                        {
                                            descriptor_value: 12,
                                            classification_choice_descriptor: 'length_mm_descriptor',
                                            patient_finding_classification_choice: 'frontend_runtime_exam_finding_1_classifications_1_choice_1_descriptor_parent',
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
        });
        expect(result.templateName).toBe('star_upper_gi_main');
        expect(result.classificationValidators[0]).toMatchObject({
            name: 'lst_required_when_large',
            classification: 'lst',
            matchedOccurrences: 1,
            triggeredOccurrences: 0
        });
        expect(result.classificationValidators[0].issues[0]).toMatchObject({
            code: 'missing_data_requirement',
            level: 'warning',
            validatorKind: 'classification_validator',
            details: { missing_condition_classifications: ['size_mm'] }
        });
        expect(result.interventionValidators[0]).toMatchObject({
            name: 'biopsy_required_when_large',
            intervention: 'biopsy',
            triggeredOccurrences: 1
        });
        expect(result.findingsValidators[0].missingRequiredClassifications).toEqual(['lst']);
        expect(result.unitValidators[0]).toMatchObject({
            name: 'size_uses_mm',
            unit: 'mm'
        });
        expect(result.issues[0].code).toBe('missing_required_classification');
    });
    it('calls validate-from-ledger endpoint for runtime validation', async () => {
        vi.mocked(axiosInstance.post).mockResolvedValue({
            data: {
                templateName: 'star_upper_gi_main',
                ok: true,
                evaluatedFindingsCount: 0,
                findingsValidators: [],
                examinationValidators: [],
                issues: []
            }
        });
        const result = await validateReportTemplateRuntimeFromLedger('report_template_examples', 'star_upper_gi_main', 42);
        expect(axiosInstance.post).toHaveBeenCalledWith('/dtypes-api/report-templates/report_template_examples/star_upper_gi_main/validate-from-ledger/42');
        expect(result.templateName).toBe('star_upper_gi_main');
        expect(result.ok).toBe(true);
    });
    it('throws on invalid runtime validation payloads', async () => {
        vi.mocked(axiosInstance.post).mockResolvedValue({
            data: {
                ok: true
            }
        });
        await expect(validateReportTemplateRuntime('report_template_examples', 'star_upper_gi_main', {
            patient: 'test_patient',
            examiners: [],
            examination: 'star_upper_gi_endoscopy',
            knowledgeBaseModule: 'report_template_examples',
            patientFindings: []
        })).rejects.toThrow('Ungültiges Runtime-Validierungsergebnis.');
    });
    it('falls back to payload validation on generic ledger endpoint not-found', async () => {
        vi.spyOn(findingsApi, 'listPatientFindings').mockResolvedValue([
            {
                id: 10,
                finding: 11,
                patientExamination: 42,
                isActive: true,
                classifications: [
                    {
                        classification: 101,
                        classificationChoice: 1001,
                        classificationName: 'size_mm',
                        classificationChoiceName: 'size_mm',
                        numericalDescriptors: {},
                        isActive: true
                    }
                ]
            }
        ]);
        vi.spyOn(findingsApi, 'getFindingClassifications').mockResolvedValue([
            {
                id: 101,
                name: 'size_mm',
                choices: [{ id: 1001, name: 'size_mm' }]
            }
        ]);
        vi.mocked(axiosInstance.post)
            .mockRejectedValueOnce({
            response: {
                status: 404,
                data: { detail: 'Not Found' }
            }
        })
            .mockResolvedValueOnce({
            data: {
                templateName: 'star_upper_gi_main',
                ok: true,
                evaluatedFindingsCount: 1,
                findingsValidators: [],
                examinationValidators: [],
                issues: []
            }
        });
        vi.mocked(axiosInstance.get).mockResolvedValueOnce({
            data: {
                name: 'star_upper_gi_main',
                examination: 'star_upper_gi_endoscopy'
            }
        });
        const result = await validatePatientFindingsAgainstTemplate({
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            patientExaminationId: 42,
            getFindingById: () => ({
                id: 11,
                name: 'esophagus_polyp'
            })
        });
        expect(axiosInstance.post).toHaveBeenNthCalledWith(1, '/dtypes-api/report-templates/report_template_examples/star_upper_gi_main/validate-from-ledger/42');
        expect(axiosInstance.post).toHaveBeenNthCalledWith(2, '/dtypes-api/report-templates/report_template_examples/star_upper_gi_main/validate', expect.objectContaining({
            patient: 'patient_examination_42',
            examination: 'star_upper_gi_endoscopy'
        }));
        expect(result.ok).toBe(true);
    });
    it('does not fallback for non-generic not-found details', async () => {
        vi.mocked(axiosInstance.post).mockRejectedValueOnce({
            response: {
                status: 404,
                data: { detail: 'Template not found for module' }
            }
        });
        await expect(validatePatientFindingsAgainstTemplate({
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            patientExaminationId: 42
        })).rejects.toMatchObject({
            response: {
                status: 404
            }
        });
    });
    it('fetchReportTemplatesByExamination returns empty array for non-array payloads', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: { results: [] }
        });
        const result = await fetchReportTemplatesByExamination('report_template_examples', 'star_upper_gi_endoscopy');
        expect(result).toEqual([]);
    });
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
        });
        expect(result).not.toBeNull();
        expect(result?.graph.templateName).toBe('star_upper_gi_main');
        expect(result?.graph.nodes[0].nodeType).toBe('template');
    });
});
