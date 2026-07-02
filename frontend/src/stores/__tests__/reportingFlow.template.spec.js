import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useReportingFlowStore } from '@/stores/reportingFlowStore';
const hoisted = vi.hoisted(() => ({
    reportDraftApi: {
        savePatientExaminationDraft: vi.fn()
    }
}));
vi.mock('@/api/reportDraftApi', () => ({
    savePatientExaminationDraft: hoisted.reportDraftApi.savePatientExaminationDraft
}));
describe('reportingFlowStore template draft state', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        setActivePinia(createPinia());
        hoisted.reportDraftApi.savePatientExaminationDraft.mockResolvedValue({
            patient_examination_id: 42,
            draft: {
                module_name: 'report_template_examples',
                template_name: 'star_upper_gi_main',
                payload: {
                    patient: 'patient_7',
                    examiners: [],
                    examination: 'colonoscopy',
                    patientFindings: []
                }
            },
            updated_at: '2026-03-19T14:00:00.000Z'
        });
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
        flow.setPatientExaminationContext({
            patientExaminationId: 42,
            selectedPatientId: 7,
            selectedExaminationId: 9
        });
        const reloaded = useReportingFlowStore();
        reloaded.bindAuthSubject('oidc:user-2');
        expect(reloaded.lookupToken).toBeNull();
        expect(reloaded.patientExaminationId).toBeNull();
        expect(reloaded.selectedPatientId).toBeNull();
        expect(reloaded.selectedExaminationId).toBeNull();
    });
    it('autosaves the current runtime draft to the backend draft endpoint', async () => {
        const flow = useReportingFlowStore();
        flow.bindAuthSubject('oidc:user-1');
        flow.setPatientExaminationContext({
            patientExaminationId: 42,
            selectedPatientId: 7,
            selectedExaminationId: 9
        });
        flow.setRuntimeDraft({
            draftId: 'draft_42',
            patientExaminationId: 42,
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            payload: {
                patient: 'patient_7',
                examiners: [],
                examination: 'colonoscopy',
                patientFindings: []
            },
            hydratedFrom: 'backend_context',
            updatedAt: '2026-03-19T13:55:00.000Z'
        });
        await vi.advanceTimersByTimeAsync(1500);
        expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledWith({
            patientExaminationId: 42,
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            payload: expect.objectContaining({
                patient: 'patient_7',
                examination: 'colonoscopy'
            })
        });
        expect(flow.draftPersistenceStatus).toBe('saved');
        expect(flow.lastPersistedDraftAt).toBe('2026-03-19T14:00:00.000Z');
    });
    it('tracks whether the current runtime draft has unpersisted changes', async () => {
        const flow = useReportingFlowStore();
        flow.bindAuthSubject('oidc:user-1');
        flow.setPatientExaminationContext({
            patientExaminationId: 42,
            selectedPatientId: 7,
            selectedExaminationId: 9
        });
        flow.setRuntimeDraft({
            draftId: 'draft_42',
            patientExaminationId: 42,
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            payload: {
                patient: 'patient_7',
                examiners: [],
                examination: 'colonoscopy',
                patientFindings: []
            },
            hydratedFrom: 'backend_context',
            updatedAt: '2026-03-19T13:55:00.000Z'
        });
        expect(flow.hasUnpersistedDraftChanges).toBe(true);
        await vi.advanceTimersByTimeAsync(1500);
        expect(flow.hasUnpersistedDraftChanges).toBe(false);
        flow.addFinding({ findingName: 'colon_polyp' });
        expect(flow.hasUnpersistedDraftChanges).toBe(true);
    });
    it('flushes pending autosave immediately when navigation requires a sync', async () => {
        const flow = useReportingFlowStore();
        flow.bindAuthSubject('oidc:user-1');
        flow.setPatientExaminationContext({
            patientExaminationId: 42,
            selectedPatientId: 7,
            selectedExaminationId: 9
        });
        flow.setRuntimeDraft({
            draftId: 'draft_42',
            patientExaminationId: 42,
            moduleName: 'report_template_examples',
            templateName: 'star_upper_gi_main',
            payload: {
                patient: 'patient_7',
                examiners: [],
                examination: 'colonoscopy',
                patientFindings: []
            },
            hydratedFrom: 'backend_context',
            updatedAt: '2026-03-19T13:55:00.000Z'
        });
        expect(hoisted.reportDraftApi.savePatientExaminationDraft).not.toHaveBeenCalled();
        await flow.flushDraftAutosave();
        expect(hoisted.reportDraftApi.savePatientExaminationDraft).toHaveBeenCalledTimes(1);
        expect(flow.hasUnpersistedDraftChanges).toBe(false);
    });
});
