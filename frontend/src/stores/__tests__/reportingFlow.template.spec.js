import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
describe('reportingFlowStore template draft state', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        setActivePinia(createPinia());
    });
    it('stores template selection and section drafts for report reuse', () => {
        const flow = useReportingFlowStore();
        flow.bindAuthSubject('oidc:user-1');
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
    it('drops persisted reporting state when the authenticated user changes', () => {
        const flow = useReportingFlowStore();
        flow.bindAuthSubject('oidc:user-1');
        flow.setLookupSession({
            lookupToken: 'lookup-token-1',
            patientExaminationId: 42
        });
        const reloaded = useReportingFlowStore();
        reloaded.bindAuthSubject('oidc:user-2');
        expect(reloaded.lookupToken).toBeNull();
        expect(reloaded.patientExaminationId).toBeNull();
    });
});
