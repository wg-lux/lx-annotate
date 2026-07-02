import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
const Stub = { template: '<div />' };
function buildReportingRouter(flow) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/untersuchung', redirect: '/reporting/case-setup' },
            { path: '/report-generator', redirect: '/reporting/case-setup' },
            {
                path: '/reporting',
                component: Stub,
                children: [
                    { path: '', component: Stub },
                    { path: 'template-builder', component: Stub },
                    { path: 'case-setup', component: Stub },
                    { path: ':patient_examination_id/template-requirements', redirect: (to) => `/reporting/${to.params.patient_examination_id}/findings` },
                    { path: ':patient_examination_id/findings', component: Stub },
                    { path: ':patient_examination_id/report-editor', component: Stub },
                    { path: ':patient_examination_id/frame-selector', component: Stub },
                    { path: ':patient_examination_id/report-export', component: Stub },
                    { path: ':patient_examination_id/finalized', component: Stub }
                ]
            }
        ]
    });
    // Mirrors the dedicated reporting guard in src/router/index.ts
    router.beforeEach((to, _from, next) => {
        if (!to.path.startsWith('/reporting/'))
            return next();
        const peParam = to.params.patient_examination_id;
        if (peParam === ':patient_examination_id') {
            return next('/reporting/case-setup');
        }
        next();
    });
    const reportingPatientExaminationId = (route) => {
        if (!route.path.startsWith('/reporting/'))
            return null;
        const raw = route.params.patient_examination_id;
        if (typeof raw === 'string' && raw.trim())
            return raw;
        if (typeof raw === 'number' && Number.isFinite(raw))
            return String(raw);
        return null;
    };
    router.beforeEach(async (to, from, next) => {
        const fromIsReporting = from.path.startsWith('/reporting/');
        if (!fromIsReporting)
            return next();
        if (flow.savingFinalReport)
            return next();
        const fromPeId = reportingPatientExaminationId(from);
        const toPeId = reportingPatientExaminationId(to);
        const stayingWithinSameReportingDraft = !!fromPeId && !!toPeId && fromPeId === toPeId;
        if (stayingWithinSameReportingDraft)
            return next();
        if (!flow.hasUnpersistedDraftChanges)
            return next();
        try {
            await flow.flushDraftAutosave();
            next();
        }
        catch {
            next(false);
        }
    });
    return router;
}
describe('reporting flow smoke routes', () => {
    let router;
    let flow;
    beforeEach(async () => {
        flow = {
            hasUnpersistedDraftChanges: false,
            savingFinalReport: false,
            flushDraftAutosave: vi.fn().mockResolvedValue(undefined)
        };
        router = buildReportingRouter(flow);
        await router.push('/reporting/case-setup');
    });
    it('navigates case-setup -> report-editor -> report-export -> finalized', async () => {
        expect(router.currentRoute.value.path).toBe('/reporting/case-setup');
        await router.push('/reporting/123/report-editor');
        expect(router.currentRoute.value.path).toBe('/reporting/123/report-editor');
        await router.push('/reporting/123/report-export');
        expect(router.currentRoute.value.path).toBe('/reporting/123/report-export');
        await router.push('/reporting/123/finalized');
        expect(router.currentRoute.value.path).toBe('/reporting/123/finalized');
    });
    it('allows the template builder without a patient examination id', async () => {
        await router.push('/reporting/template-builder');
        expect(router.currentRoute.value.path).toBe('/reporting/template-builder');
    });
    it('redirects legacy reporting entry routes to case-setup', async () => {
        await router.push('/untersuchung');
        expect(router.currentRoute.value.path).toBe('/reporting/case-setup');
        await router.push('/report-generator');
        expect(router.currentRoute.value.path).toBe('/reporting/case-setup');
    });
    it('redirects placeholder patient_examination route param to case-setup', async () => {
        await router.push('/reporting/:patient_examination_id/findings');
        expect(router.currentRoute.value.path).toBe('/reporting/case-setup');
    });
    it('redirects legacy template route to findings', async () => {
        await router.push('/reporting/123/template-requirements');
        expect(router.currentRoute.value.path).toBe('/reporting/123/findings');
    });
    it('allows seamless navigation inside the same reporting draft without forcing a flush', async () => {
        flow.hasUnpersistedDraftChanges = true;
        await router.push('/reporting/123/findings');
        flow.flushDraftAutosave.mockClear();
        await router.push('/reporting/123/report-editor');
        expect(router.currentRoute.value.path).toBe('/reporting/123/report-editor');
        expect(flow.flushDraftAutosave).not.toHaveBeenCalled();
    });
    it('flushes the draft before leaving the reporting domain', async () => {
        flow.hasUnpersistedDraftChanges = true;
        await router.push('/reporting/123/findings');
        flow.flushDraftAutosave.mockClear();
        await router.push('/reporting');
        expect(flow.flushDraftAutosave).toHaveBeenCalledTimes(1);
        expect(router.currentRoute.value.path).toBe('/reporting');
    });
    it('allows finalization navigation to proceed while a final save is active', async () => {
        flow.hasUnpersistedDraftChanges = true;
        flow.savingFinalReport = true;
        await router.push('/reporting/123/report-editor');
        await router.push('/reporting/123/finalized');
        expect(router.currentRoute.value.path).toBe('/reporting/123/finalized');
        expect(flow.flushDraftAutosave).not.toHaveBeenCalled();
    });
});
