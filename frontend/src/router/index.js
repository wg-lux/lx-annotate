import { createRouter, createWebHistory } from 'vue-router';
var router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL || '/'),
    routes: [
        {
            path: '/annotationen',
            name: 'Annotationen',
            component: function () { return import('src/views/AnnotationDashboard.vue'); },
            meta: {
                description: 'Hier können Sie alle Ihre Annotationen einsehen und verwalten.'
            }
        },
        {
            path: '/video-annotation',
            name: 'Video Annotation',
            component: function () { return import('src/views/VideoAnnotation.vue'); },
            meta: {
                description: 'Hier können Sie Videos annotieren.'
            }
        },
        {
            path: '/frame-annotation',
            name: 'Frame Annotation',
            component: function () { return import('src/views/FrameAnnotation.vue'); },
            meta: {
                description: 'Hier können Sie Frames annotieren.'
            }
        },
        {
            path: '/',
            name: 'Dashboard',
            component: function () { return import('src/views/Dashboard.vue'); },
            meta: {
                description: 'Hier finden Sie alle wichtigen Informationen zu Ihren Annotationen.'
            }
        },
        {
            path: '/ueber-uns',
            name: 'Über Uns',
            component: function () { return import('src/views/UeberUns.vue'); },
            meta: {
                description: 'Hier finden Sie Informationen über uns.'
            }
        },
        {
            path: '/fallgenerator',
            name: 'Fallgenerator',
            component: function () { return import('src/views/Fallgenerator.vue'); },
            meta: {
                description: 'Hier können Sie Fälle generieren.'
            }
        },
        {
            path: '/untersuchung',
            name: 'Untersuchung',
            component: function () { return import('src/views/Examination.vue'); },
            meta: {
                description: 'Hier können Sie Befunde erstellen.'
            }
        },
        {
            path: '/patient',
            name: 'Patient hinzufügen',
            component: function () { return import('src/views/PatientAdder.vue'); },
            meta: {
                description: 'Hier können Sie Patienten hinzufügen.'
            }
        },
        {
            path: '/profil',
            name: 'Profil',
            component: function () { return import('@/views/Profil.vue'); },
            meta: {
                description: 'Hier können Sie Ihr Profil einsehen und bearbeiten.'
            }
        },
        {
            path: '/anonymisierung',
            name: 'Anonymisierung',
            component: function () { return import('@/views/Anonymization.vue'); },
            meta: {
                description: 'Hier können Sie Anonymisierungsprozesse durchführen.'
            }
        },
        {
            path: '/validierung',
            name: 'Validierung',
            component: function () { return import('src/views/Validierung.vue'); },
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
