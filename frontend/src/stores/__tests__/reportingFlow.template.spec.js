import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
describe('reportingFlowStore template draft state', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });
    it('stores template selection and section drafts for report reuse', () => {
        const flow = useReportingFlowStore();
        flow.setTemplateSelection({
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main'
        });
        flow.setTemplateSectionDraft('examination_baseline', {
            note: 'Baseline details',
            includePatientData: true
        });
        expect(flow.selectedKbModule).toBe('report_template_examples');
        expect(flow.selectedTemplateName).toBe('star_upper_gi_main');
        expect(flow.templateSectionDrafts.examination_baseline).toEqual({
            note: 'Baseline details',
            includePatientData: true,
            includeExaminationData: false
        });
    });
});
