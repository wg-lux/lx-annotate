import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { normalizeDefinitionValidationResult, normalizeTemplatePayload, validateReportTemplateRuntime } from '@/api/reportTemplatesApi';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn()
    }
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
    it('normalizes runtime validation responses', async () => {
        vi.mocked(axiosInstance.post).mockResolvedValue({
            data: {
                templateName: 'star_upper_gi_main',
                ok: false,
                evaluatedFindingsCount: 2,
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
        expect(axiosInstance.post).toHaveBeenCalledWith('/base_api/report-templates/report_template_examples/star_upper_gi_main/validate', {
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
        expect(result.findingsValidators[0].missingRequiredClassifications).toEqual(['lst']);
        expect(result.issues[0].code).toBe('missing_required_classification');
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
