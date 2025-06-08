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
      path: '/video-annotation',
      name: 'Video Annotation',
      component: () => import('@/views/VideoAnnotation.vue'),
      meta: {
        description: 'Hier können Sie Videos annotieren.'
      }
    },
    {
      path: '/video-examination',
      name: 'Video-Untersuchung',
      component: () => import('@/views/VideoExaminationAnnotation.vue'),
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
      path: '/sensitive-meta-annotation',
      name: 'Patientendaten Annotation',
      component: () => import('@/components/SensitiveMeta/PatientSensitiveMetaAnnotation.vue'),
      meta: {
        description: 'Hier können Sie Patientendaten validieren und bearbeiten.'
      }
    },
    {
      path: '/sensitive-meta/:patientId?',
      name: 'Patientendaten Detail',
      component: () => import('@/components/SensitiveMeta/PatientSensitiveMetaAnnotation.vue'),
      props: (route) => ({ 
        patientId: route.params.patientId ? Number(route.params.patientId) : undefined 
      }),
      meta: {
        description: 'Detailansicht für spezifische Patientendaten.'
      }
    },
    {
      path: '/sensitive-meta-video',
      name: 'Patientendaten Video Annotation',
      component: () => import('@/components/SensitiveMeta/PatientSensitiveMetaVideoAnnotation.vue'),
      meta: {
          description: 'Hier können Sie Patientendaten in Videos annotieren.'
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
