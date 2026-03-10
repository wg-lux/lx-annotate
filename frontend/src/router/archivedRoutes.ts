import type { RouteRecordRaw } from 'vue-router'

type ArchivedRedirect = {
  path: string
  redirect: string
}

const archivedRedirects: ArchivedRedirect[] = [
  // Legacy top-level pages replaced by current sidebar destinations.
  { path: '/anonymisierung', redirect: '/anonymisierung/uebersicht' },
  { path: '/patient', redirect: '/patienten' },
  { path: '/profil', redirect: '/' },
  { path: '/ueber-uns', redirect: '/' },
  { path: '/validierung', redirect: '/anonymisierung/uebersicht' },

  // Legacy aliases still referenced by older dashboard/stats code.
  { path: '/validation', redirect: '/anonymisierung/uebersicht' },
  { path: '/examination', redirect: '/untersuchung' },
  { path: '/video-meta-annotation', redirect: '/anonymisierung/uebersicht' },
  { path: '/pdf-meta-annotation', redirect: '/anonymisierung/uebersicht' },
  { path: '/frame-selection', redirect: '/reporting' },
  { path: '/fallgenerator', redirect: '/reporting' },
  { path: '/segments', redirect: '/annotationen' },
  { path: '/examinations', redirect: '/annotationen' },
  { path: '/sensitive-meta', redirect: '/annotationen' }
]

export const archivedLegacyRoutes: RouteRecordRaw[] = archivedRedirects.map((route) => ({
  path: route.path,
  redirect: route.redirect,
  meta: {
    archived: true,
    description: `Archived legacy route redirecting to ${route.redirect}.`
  }
}))
