import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { normalizeTemplatePayload, validateReportTemplateRuntime } from '@/api/reportTemplatesApi';
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
                        operator: 'conditional',
                        query: {
                            finding: 'esophagus_polyp',
                            operator: 'conditional',
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
                        operator: 'conditional',
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
        const result = await validateReportTemplateRuntime('report_template_examples', 'star_upper_gi_main', [
            { finding: 'esophagus_polyp', classifications: [{ classification: 'size_mm', value: 12 }] }
        ]);
        expect(axiosInstance.post).toHaveBeenCalledWith('/base_api/report-templates/report_template_examples/star_upper_gi_main/validate', {
            findings: [{ finding: 'esophagus_polyp', classifications: [{ classification: 'size_mm', value: 12 }] }]
        });
        expect(result.templateName).toBe('star_upper_gi_main');
        expect(result.findingsValidators[0].missingRequiredClassifications).toEqual(['lst']);
        expect(result.issues[0].code).toBe('missing_required_classification');
    });
});
