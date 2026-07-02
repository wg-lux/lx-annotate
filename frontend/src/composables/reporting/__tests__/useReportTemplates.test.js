import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn()
    },
    endoregApi: (path) => `/endoreg-api/${path.replace(/^\/+/, '')}`,
    dtypesApi: (path) => `/dtypes-api/${path.replace(/^\/+/, '')}`
}));
describe('useReportTemplates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('loads templates by examination with module-scoped endpoint', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: [
                {
                    name: 'star_upper_gi_main',
                    examination: 'star_upper_gi_endoscopy',
                    reportSections: [],
                    validators: { examinationValidators: [], findingsValidators: [] }
                }
            ]
        });
        const catalog = useReportTemplates({
            initialModuleName: 'report_template_examples',
            initialTemplateName: null
        });
        await catalog.fetchTemplatesByExamination('star_upper_gi_endoscopy');
        expect(axiosInstance.get).toHaveBeenCalledWith('/dtypes-api/report-templates/by-examination/report_template_examples/star_upper_gi_endoscopy');
        expect(catalog.selectedTemplateName.value).toBe('star_upper_gi_main');
    });
    it('loads a template by explicit name endpoint when not in local options', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: {
                name: 'custom_template',
                examination: 'star_upper_gi_endoscopy',
                reportSections: [],
                validators: { examinationValidators: [], findingsValidators: [] }
            }
        });
        const catalog = useReportTemplates({
            initialModuleName: 'report_template_examples',
            initialTemplateName: null
        });
        await catalog.selectTemplateByName('custom_template');
        expect(axiosInstance.get).toHaveBeenCalledWith('/dtypes-api/report-templates/report_template_examples/custom_template');
        expect(catalog.selectedTemplateName.value).toBe('custom_template');
    });
    it('normalizes malformed template payloads to stable defaults', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: [
                {
                    name: 'broken_template',
                    examination: 'colonoscopy',
                    reportSections: [
                        {
                            name: 'findings',
                            position: '2',
                            findings: { invalid: true }
                        }
                    ],
                    validators: null
                }
            ]
        });
        const catalog = useReportTemplates({
            initialModuleName: 'report_template_examples',
            initialTemplateName: null
        });
        const templates = await catalog.fetchTemplatesByExamination('colonoscopy');
        expect(templates).toHaveLength(1);
        expect(templates[0].reportSections[0].findings).toEqual([]);
        expect(templates[0].validators.examinationValidators).toEqual([]);
        expect(templates[0].validators.findingsValidators).toEqual([]);
        expect(catalog.sectionBlocks.value[0].requiredFindingsCount).toBe(0);
    });
    it('derives validator descriptors with related sections', async () => {
        vi.mocked(axiosInstance.get).mockResolvedValue({
            data: {
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
            }
        });
        const catalog = useReportTemplates({
            initialModuleName: 'report_template_examples',
            initialTemplateName: null
        });
        await catalog.selectTemplateByName('star_upper_gi_main');
        expect(catalog.validatorDescriptors.value).toHaveLength(2);
        expect(catalog.validatorDescriptors.value[0].relatedSections).toEqual(['examination_baseline']);
        expect(catalog.validatorDescriptors.value[1].relatedSections).toEqual(['examination_baseline']);
    });
});
