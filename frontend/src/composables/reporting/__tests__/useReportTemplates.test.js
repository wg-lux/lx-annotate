import { beforeEach, describe, expect, it, vi } from 'vitest';
import axiosInstance from '@/api/axiosInstance';
import { useReportTemplates } from '@/composables/reporting/useReportTemplates';
vi.mock('@/api/axiosInstance', () => ({
    default: {
        get: vi.fn()
    }
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
        expect(axiosInstance.get).toHaveBeenCalledWith('/base_api/report-templates/by-examination/report_template_examples/star_upper_gi_endoscopy');
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
        expect(axiosInstance.get).toHaveBeenCalledWith('/base_api/report-templates/report_template_examples/custom_template');
        expect(catalog.selectedTemplateName.value).toBe('custom_template');
    });
});
