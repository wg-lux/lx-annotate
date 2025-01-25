import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/annotationen',
      name: 'Annotationen',
      component: () => import('../views/AnnotationenDashboard.vue'),
        meta: {
          description: 'Hier können Sie alle Ihre Annotationen einsehen und verwalten.'
        }
    },
    {
      path: '/video-annotation',
      name: 'Video Annotation',
      component: () => import('../views/VideoAnnotation.vue'),
      meta: {
        description: 'Hier können Sie Videos annotieren.'
        }
    },
    {
      path: '/frame-annotation',
      name: 'Frame Annotation',
      component: () => import('../views/FrameAnnotation.vue'),
      meta: {
        description: 'Hier können Sie Frames annotieren.'
        }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: {
        description: 'Hier finden Sie alle wichtigen Informationen zu Ihren Annotationen.'
        }
    },
    {
      path: '/ueber-uns',
      name: 'Über Uns',
      component: () => import('../views/UeberUns.vue'),
      meta: {
        description: 'Hier finden Sie Informationen über uns.'
        }
    },
  /*
    {
      path: '/fallgenerator',
      name: 'Fallgenerator',
      component: () => import('../views/Fallgenerator.vue'),
        meta: {
    description: 'Hier können Sie Fälle generieren.'
    }
},
  */
    {
      path: '/profil',
      name: 'Profil',
      component: () => import('../views/Profil.vue'),
      meta: {
        description: 'Hier können Sie Ihr Profil einsehen und bearbeiten.'
        }
    },
    {
      path: '/validierung',
      name: 'Validierung',
      component: () => import('../views/Validierung.vue'),
      meta: {
        description: 'Hier können Sie Annotationen validieren.'
        }
    },

  ]
});

export default router;
