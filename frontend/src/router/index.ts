import { useToastStore } from '@/stores/toastStore'
import { createRouter, createWebHistory } from 'vue-router'
import { useAnonymizationStore } from '@/stores/anonymizationStore'
import { useAuthKcStore } from '@/stores/auth_kc'
const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/reporting',
      component: () => import('@/views/reporting/ReportingShell.vue'),
      meta: {
        description: 'Page-based reporting workflow (new scaffold).'
      },
      children: [
        {
          path: '',
          name: 'Reporting Arbeitsliste',
          component: () => import('@/views/reporting/ReportingWorklistPage.vue')
        },
        {
          path: 'case-setup',
          name: 'Reporting Fall-Setup',
          component: () => import('@/views/reporting/CaseSetupPage.vue')
        },
        {
          path: ':patient_examination_id/template-requirements',
          name: 'Reporting Template und Anforderungssets',
          component: () => import('@/views/reporting/TemplateRequirementsPage.vue')
        },
        {
          path: ':patient_examination_id/findings',
          name: 'Reporting Befunderfassung',
          component: () => import('@/views/reporting/FindingsCapturePage.vue')
        },
        {
          path: ':patient_examination_id/requirements-review',
          name: 'Reporting Anforderungsprüfung',
          component: () => import('@/views/reporting/RequirementsReviewPage.vue')
        },
        {
          path: ':patient_examination_id/report-editor',
          name: 'Reporting Berichtseditor',
          component: () => import('@/views/reporting/ReportEditorPage.vue')
        },
        {
          path: ':patient_examination_id/frame-selector',
          name: 'Reporting Segment-Frame-Auswahl',
          component: () => import('@/views/reporting/FrameSelectorPage.vue')
        },
        {
          path: ':patient_examination_id/finalized',
          name: 'Reporting Finalisierung und Artefakte',
          component: () => import('@/views/reporting/FinalizedResultPage.vue')
        }
      ]
    },
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
      path: '/export',
      name: 'Export',
      component: () => import('@/views/Export.vue'),
      meta: {
        description: 'Hier können Sie Annotationen exportieren.'
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
        cap: 'page.patients.view',                      // <-- add: capability tag for UI checks
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
        description: 'Übersicht aller hochgeladenen Dateien und deren Anonymisierungsstatus.',
        cap: 'page.anonymization.overview',
        //hardProtect: true, //  optional: block route if user lacks permission
      }
    },
    {
      path: '/anonymisierung/validierung',
      name: 'AnonymisierungValidierung',
      component: () => import('@/components/Anonymizer/AnonymizationValidationComponent.vue'),
      props: (route) => ({
        fileId: Number(route.query.fileId),
        mediaType: route.query.mediaType as string
      }),
      meta: {
        description: 'Validierung anonymisierter Dateien.'
      }
    },
    {
      path: '/anonymisierung/korrektur/:fileId(\\d+)',
      name: 'Anonymisierung Korrektur',
      component: () => import('@/components/Anonymizer/AnonymizationCorrectionComponent.vue'),
      props: (route) => ({ fileId: Number(route.params.fileId), mediaType: route.params.mediaType as string })
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
})

// 🔐 Global auth guard: require Keycloak login + endoregdb_user for ALL routes
router.beforeEach(async (to, _from, next) => {
  const auth = useAuthKcStore()

  // If auth not bootstrapped yet, let the app decide (e.g. AuthCheck component),
  // just don't block navigation here.
  if (!auth.loaded) {
    return next()
  }

  // Not logged in → go to Keycloak login, not /login
  if (!auth.isAuthenticated) {
    // optional: remember target path
    auth.login()
    return
  }

  // Logged in but missing global role → you can later refine this
   // Logged in but missing global role → block navigation cleanly
  //if (!auth.roles.includes('endoregdb_user')) {
    // OPTIONAL: show a toast (if you like)
    // const toast = useToastStore()
    // toast.error({ text: 'Sie haben keinen Zugriff auf diese Anwendung. Bitte wenden Sie sich an den Administrator.' })

    // Cancel navigation, stay on current page (no infinite redirect)
    //return next(false)
  // }

  if (!auth.roles.includes('endoregdb_user')) {
  const toast = useToastStore()
  
  toast.error({
    text: 'You are not authorized to access this system.'
  })

  // Force logout and redirect to Keycloak login
  await auth.logout()        // <-- ENSURE this calls keycloak.logout()
  auth.login()               // <-- send to Keycloak login, not internal route
  
  return next(false)
}



  // OK → continue to route
  next()
})


router.beforeEach((_to, _from, next) => {
  const store = useAnonymizationStore()
  store.stopAllPolling()
  next()
})

// 2) capability-aware guard (ONLY hard-block when meta.hardProtect === true)
router.beforeEach((to, _from, next) => {
  const meta: any = to.meta || {}
  const cap = meta.cap as string | undefined
  const hardProtect = !!meta.hardProtect   // default false

  // No cap → no guard behaviour
  if (!cap) return next()

  const auth = useAuthKcStore()

  // If bootstrap not loaded yet, don't block navigation.
  // AuthCheck component will decide if user sees app or login.
  if (!auth.loaded) return next()

  // If route is NOT hard-protected → ALWAYS allow navigation
  // You can still use `v-can` inside the components to hide buttons, etc.
  if (!hardProtect) {
    return next()
  }

  // Only for hard-protected routes:
  if (auth.can(cap, 'GET')) {
    return next()
  }

  // User is logged in but missing capability → redirect away
  return next({ path: '/', query: { denied: '1', from: to.path } })
})

router.beforeEach((to, _from, next) => {
  if (!to.path.startsWith('/reporting/')) return next()
  const peParam = to.params.patient_examination_id
  if (peParam === ':patient_examination_id') {
    return next('/reporting/case-setup')
  }
  next()
})

export default router
