import { createRouter, createWebHistory } from 'vue-router';
import { useAnonymizationStore } from '@/stores/anonymizationStore';
import { useAuthKcStore } from '@/stores/auth_kc';
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL || '/'),
    routes: [
        {
            path: '/annotationen',
            name: 'Annotationen',
            component: () => import('@/views/AnnotationDashboard.vue'),
            meta: {
                description: 'Hier können Sie alle Ihre Annotationen einsehen und verwalten.'
            }
        },
        {
            path: '/video-untersuchung',
            name: 'Video-Untersuchung',
            component: () => import('@/views/VideoExamination.vue'),
            meta: {
                description: 'Annotieren Sie Untersuchungen während der Videobetrachtung.'
            }
        },
        {
            path: '/',
            name: 'Dashboard',
            component: () => import('@/views/Dashboard.vue'),
            meta: {
                description: 'Hier finden Sie alle wichtigen Informationen zu Ihren Annotationen.'
            }
        },
        {
            path: '/ueber-uns',
            name: 'Über Uns',
            component: () => import('@/views/UeberUns.vue'),
            meta: {
                description: 'Hier finden Sie Informationen über uns.'
            }
        },
        {
            path: '/uebersicht',
            name: 'Übersicht',
            component: () => import('@/views/PageOverview.vue'),
            meta: {
                description: 'Hier finden Sie eine Übersicht über Ihre Annotationen und deren Status.'
            }
        },
        {
            path: '/untersuchung',
            name: 'Untersuchung',
            component: () => import('@/views/Examination.vue'),
            meta: {
                description: 'Hier können Sie Befunde erstellen.'
            }
        },
        {
            path: '/patient',
            name: 'Patient hinzufügen',
            component: () => import('@/views/PatientAdder.vue'),
            meta: {
                description: 'Hier können Sie Patienten hinzufügen.'
            }
        },
        {
            path: '/patienten',
            name: 'Patienten',
            component: () => import('@/views/PatientOverview.vue'),
            meta: {
                description: 'Hier können Sie alle Patienten einsehen und verwalten.',
                cap: 'page.patients.view', // <-- add: capability tag for UI checks
                //hardProtect: true       // only add on routes you want to STRONGLY block
            }
        },
        {
            path: '/profil',
            name: 'Profil',
            component: () => import('@/views/Profil.vue'),
            meta: {
                description: 'Hier können Sie Ihr Profil einsehen und bearbeiten.'
            }
        },
        {
            path: '/anonymisierung',
            name: 'Anonymisierung',
            component: () => import('@/views/Anonymization.vue'),
            meta: {
                description: 'Hier können Sie Anonymisierungsprozesse durchführen.'
            }
        },
        {
            path: '/anonymisierung/uebersicht',
            name: 'Anonymisierung Übersicht',
            component: () => import('@/views/AnonymizationOverview.vue'),
            meta: {
                description: 'Übersicht aller hochgeladenen Dateien und deren Anonymisierungsstatus.'
            }
        },
        {
            path: '/anonymisierung/validierung',
            name: 'AnonymisierungValidierung',
            component: () => import('@/components/Anonymizer/AnonymizationValidationComponent.vue'),
            props: (route) => ({
                fileId: Number(route.query.fileId),
                mediaType: route.query.mediaType
            }),
            meta: {
                description: 'Validierung anonymisierter Dateien.'
            }
        },
        {
            path: '/anonymisierung/korrektur/:fileId(\\d+)',
            name: 'Anonymisierung Korrektur',
            component: () => import('@/components/Anonymizer/AnonymizationCorrectionComponent.vue'),
            props: (route) => ({ fileId: Number(route.params.fileId), mediaType: route.params.mediaType })
        },
        {
            path: '/validierung',
            name: 'Validierung',
            component: () => import('@/views/Validierung.vue'),
            meta: {
                description: 'Hier können Sie Annotationen validieren.'
            }
        },
        {
            path: '/report-generator',
            name: 'Report Generator',
            component: () => import('@/views/ReportGenerator.vue'),
            meta: {
                description: 'Hier können Sie Reports generieren.'
            }
        },
        // Catch-all redirect to Dashboard for any unmatched route
        {
            path: '/:catchAll(.*)',
            redirect: '/'
        }
    ]
});
router.beforeEach((_to, _from, next) => {
    const store = useAnonymizationStore();
    store.stopAllPolling();
    next();
});
// 2) capability-aware guard (ONLY hard-block when meta.hardProtect === true)
router.beforeEach((to, _from, next) => {
    const meta = to.meta || {};
    const cap = meta.cap;
    const hardProtect = !!meta.hardProtect; // default false
    // No cap → no guard behaviour
    if (!cap)
        return next();
    const auth = useAuthKcStore();
    // If bootstrap not loaded yet, don't block navigation.
    // AuthCheck component will decide if user sees app or login.
    if (!auth.loaded)
        return next();
    // If route is NOT hard-protected → ALWAYS allow navigation
    // You can still use `v-can` inside the components to hide buttons, etc.
    if (!hardProtect) {
        return next();
    }
    // Only for hard-protected routes:
    if (auth.can(cap, 'GET')) {
        return next();
    }
    // User is logged in but missing capability → redirect away
    return next({ path: '/', query: { denied: '1', from: to.path } });
});
export default router;
