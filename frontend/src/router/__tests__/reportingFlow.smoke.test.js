import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
const Stub = { template: '<div />' };
function buildReportingRouter() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            {
                path: '/reporting',
                component: Stub,
                children: [
                    { path: '', component: Stub },
                    { path: 'case-setup', component: Stub },
                    { path: ':patient_examination_id/template-requirements', redirect: (to) => `/reporting/${to.params.patient_examination_id}/findings` },
                    { path: ':patient_examination_id/findings', component: Stub },
                    { path: ':patient_examination_id/report-editor', component: Stub },
                    { path: ':patient_examination_id/frame-selector', component: Stub },
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
    return router;
}
describe('reporting flow smoke routes', () => {
    let router;
    beforeEach(async () => {
        router = buildReportingRouter();
        await router.push('/reporting/case-setup');
    });
    it('navigates case-setup -> report-editor -> finalized', async () => {
        expect(router.currentRoute.value.path).toBe('/reporting/case-setup');
        await router.push('/reporting/123/report-editor');
        expect(router.currentRoute.value.path).toBe('/reporting/123/report-editor');
        await router.push('/reporting/123/finalized');
        expect(router.currentRoute.value.path).toBe('/reporting/123/finalized');
    });
    it('redirects placeholder patient_examination route param to case-setup', async () => {
        await router.push('/reporting/:patient_examination_id/findings');
        expect(router.currentRoute.value.path).toBe('/reporting/case-setup');
    });
    it('redirects legacy template route to findings', async () => {
        await router.push('/reporting/123/template-requirements');
        expect(router.currentRoute.value.path).toBe('/reporting/123/findings');
    });
});
