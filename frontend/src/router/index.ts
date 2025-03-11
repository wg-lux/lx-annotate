import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL || '/'),
  routes: [
    {
      path: '/annotationen',
      name: 'Annotationen',
      component: () => import('src/views/AnnotationenDashboard.vue'),
      meta: {
        description: 'Hier können Sie alle Ihre Annotationen einsehen und verwalten.'
      }
    },
    {
      path: '/video-annotation',
      name: 'Video Annotation',
      component: () => import('src/views/VideoAnnotation.vue'),
      meta: {
        description: 'Hier können Sie Videos annotieren.'
      }
    },
    {
      path: '/frame-annotation',
      name: 'Frame Annotation',
      component: () => import('src/views/FramesDemo.vue'),
      meta: {
        description: 'Hier können Sie Frames annotieren.'
      }
    },
    {
      path: '',
      name: 'Dashboard',
      component: () => import('src/views/Dashboard.vue'),
      meta: {
        description: 'Hier finden Sie alle wichtigen Informationen zu Ihren Annotationen.'
      }
    },
    {
      path: '/ueber-uns',
      name: 'Über Uns',
      component: () => import('src/views/UeberUns.vue'),
      meta: {
        description: 'Hier finden Sie Informationen über uns.'
      }
    },
    {
      path: '/fallgenerator',
      name: 'Fallgenerator',
      component: () => import('src/views/Fallgenerator.vue'),
      meta: {
        description: 'Hier können Sie Fälle generieren.'
      }
    },
    {
      path: '/befund',
      name: 'Befund',
      component: () => import('src/views/Report.vue'),
      meta: {
        description: 'Hier können Sie Befunde erstellen.'
      }
    },
    {
      path: '/patient',
      name: 'Patient hinzufügen',
      component: () => import('src/views/PatientAdder.vue'),
      meta: {
        description: 'Hier können Sie Patienten hinzufügen.'
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
      path: '/validierung',
      name: 'Validierung',
      component: () => import('src/views/Validierung.vue'),
      meta: {
        description: 'Hier können Sie Annotationen validieren.'
      }
    },
    // Catch-all redirect to Dashboard for any unmatched route
    {
      path: '/:catchAll(.*)',
      redirect: ''
    }
  ]
});

export default router;
