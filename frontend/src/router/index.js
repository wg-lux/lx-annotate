import { createRouter, createWebHistory } from 'vue-router';
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
            path: '/video-meta-annotation',
            name: 'Video Patienten Annotation',
            component: () => import('@/views/VideoMetaAnnotation.vue'),
            meta: {
                description: 'Hier können Sie Videos annotieren.'
            }
        },
        {
            path: '/pdf-meta-annotation',
            name: 'PDF Patienten Annotation',
            component: () => import('@/views/PdfMetaAnnotation.vue'),
            meta: {
                description: 'Hier können Sie PDFs annotieren.'
            }
        },
        {
            path: '/video-examination',
            name: 'Video-Untersuchung',
            component: () => import('@/views/VideoExamination.vue'),
            meta: {
                description: 'Annotieren Sie Untersuchungen während der Videobetrachtung.'
            }
        },
        {
            path: '/frame-annotation',
            name: 'Frame Annotation',
            component: () => import('@/views/FrameAnnotation.vue'),
            meta: {
                description: 'Hier können Sie Frames annotieren.'
            }
        },
        {
            path: '/frame-selection',
            name: 'Frame Auswahl',
            component: () => import('@/views/FrameSelection.vue'),
            meta: {
                description: 'Wählen Sie Frames aus Videos für die Annotation aus.'
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
            path: '/fallgenerator',
            name: 'Fallgenerator',
            component: () => import('@/views/Fallgenerator.vue'),
            meta: {
                description: 'Hier können Sie Fälle generieren.'
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
                description: 'Hier können Sie alle Patienten einsehen und verwalten.'
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
            path: '/validierung',
            name: 'Validierung',
            component: () => import('@/views/Validierung.vue'),
            meta: {
                description: 'Hier können Sie Annotationen validieren.'
            }
        },
        // Catch-all redirect to Dashboard for any unmatched route
        {
            path: '/:catchAll(.*)',
            redirect: '/'
        }
    ]
});
export default router;
