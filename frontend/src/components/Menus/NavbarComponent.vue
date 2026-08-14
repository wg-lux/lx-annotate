<template>
  <nav id="navbarBlur" class="navbar navbar-main app-topbar position-sticky" navbar-scroll="true" aria-label="Seitennavigation">
    <div class="container-fluid app-topbar-inner">
      <!-- Mobile sidebar toggle button -->
      <button 
        class="navbar-toggler app-topbar-menu"
        type="button" 
        aria-controls="sidenav-main"
        :aria-expanded="isSidebarOpen"
        aria-label="Navigation öffnen"
        @click="toggleSidebar"
      >
        <span class="navbar-toggler-icon">
          <span class="navbar-toggler-bar"></span>
          <span class="navbar-toggler-bar"></span>
          <span class="navbar-toggler-bar"></span>
        </span>
      </button>
      
      <div id="navbar" class="navbar-collapse app-topbar-content">
        <div class="app-page-context">
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb app-breadcrumb">
              <li class="breadcrumb-item app-breadcrumb-eyebrow">
                Arbeitsbereich
              </li>
              <li class="breadcrumb-item active app-breadcrumb-current" aria-current="page">
                {{ currentRouteName }}
              </li>
            </ol>
          </nav>
        </div>
        <ul class="navbar-nav app-topbar-actions">
          <li class="nav-item d-flex align-items-center">
            <router-link 
              to="/annotationen" 
              class="btn btn-outline-primary btn-sm mb-0 annotation-status-button"
              :class="{ 'btn-warning': showPendingCount, 'stats-unavailable': annotationStatsStore.hasError }"
              :title="annotationStatsStatusTitle"
            >
              <i class="ni ni-single-copy-04 me-1"></i>
              Annotationen
              <span 
                v-if="annotationStatsStore.isLoading"
                class="spinner-border spinner-border-sm ms-1"
                role="status"
                data-test="annotation-stats-loading"
              >
                <span class="visually-hidden">Laden...</span>
              </span>
              <span
                v-else-if="annotationStatsStore.hasError"
                class="badge bg-warning text-dark ms-1"
                data-test="annotation-stats-unavailable"
                aria-label="Annotationsstatistik nicht verfügbar"
              >
                !
              </span>
              <span
                v-else-if="showPendingCount"
                class="badge bg-danger ms-1"
                :title="`${totalPendingAnnotations} ausstehende Annotationen`"
                data-test="annotation-pending-count"
              >
                {{ totalPendingAnnotations }}
              </span>
            </router-link>
          </li>
          <li v-if="isAuthenticated" class="nav-item d-flex align-items-center">
            <button type="button" class="nav-link account-action" @click="handleLogout">
              <i class="ni ni-circle-08 me-sm-1"></i>
              <span class="d-sm-inline d-none">Logout</span>
            </button>
          </li>
          <li v-else class="nav-item d-flex align-items-center">
            <button type="button" class="nav-link account-action" @click="handleLogin">
              <i class="ni ni-circle-08 me-sm-1"></i>
              <span class="d-sm-inline d-none">Login</span>
            </button>
          </li>
          <li v-if="isAuthenticated" class="nav-item d-flex align-items-center">
            <span class="nav-link account-identity">
              <span class="account-presence" aria-hidden="true"></span>
              <span class="d-sm-inline d-none">{{ username }}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthKcStore } from '@/stores/auth_kc'             //  NEW store
import { useAnnotationStatsStore } from '@/stores/annotationStats'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('navbar')
const { isSidebarOpen = false } = defineProps<{
  isSidebarOpen?: boolean
}>()
const emit = defineEmits<{
  toggleSidebar: []
}>()

const route = useRoute()
const authStore = useAuthKcStore()                            //  use Keycloak store
const annotationStatsStore = useAnnotationStatsStore()
let annotationStatsRefreshTimer: ReturnType<typeof setInterval> | null = null
let isUnmounted = false

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated)

const username = computed(() => {
  const u = authStore.user
  // If you later include first_name/last_name in backend, you can prefer that:
  // return u ? `${u.first_name} ${u.last_name}`.trim() || u.username : 'Unknown'
  return u?.username || 'Unknown'
})

const currentRouteName = computed(() => {
  const name = route.name as string
  return !name ? 'Dashboard' : name.charAt(0).toUpperCase() + name.slice(1)
})

const totalPendingAnnotations = computed(() => {
  return annotationStatsStore.stats.totalPending
})

const showPendingCount = computed(
  () =>
    !annotationStatsStore.isLoading &&
    !annotationStatsStore.hasError &&
    totalPendingAnnotations.value > 0
)

const annotationStatsStatusTitle = computed(() => {
  if (annotationStatsStore.isLoading) return 'Annotationsstatistik wird aktualisiert'
  if (annotationStatsStore.hasError) return 'Annotationsstatistik ist derzeit nicht verfügbar'
  if (totalPendingAnnotations.value > 0) {
    return `${String(totalPendingAnnotations.value)} ausstehende Annotationen`
  }
  return 'Keine ausstehenden Annotationen'
})

// Methods
const handleLogin = () => {
  authStore.login()
}

const handleLogout = () => {
  const form = document.getElementById('oidc-logout-form') as HTMLFormElement | null
  if (form) {
    form.submit()              //  real POST with CSRF, browser follows redirects
  } else {
    // Fallback (should not happen if base.html is correct)
    window.location.href = '/oidc/logout/'
  }
}


const toggleSidebar = () => {
  emit('toggleSidebar')
}

// Load annotation stats on mount and refresh periodically
onMounted(async () => {
  await annotationStatsStore.fetchAnnotationStats()

  if (isUnmounted) return

  // Auto-refresh every 5 minutes
  annotationStatsRefreshTimer = setInterval(() => {
    if (annotationStatsStore.needsRefresh) {
      annotationStatsStore.refreshIfNeeded().catch((error: unknown) => {
        logger.error('annotation-stats-refresh-failed', error)
      })
    }
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  isUnmounted = true
  if (annotationStatsRefreshTimer !== null) {
    clearInterval(annotationStatsRefreshTimer)
    annotationStatsRefreshTimer = null
  }
})
</script>


<style scoped>
.breadcrumb-item + .breadcrumb-item::before {
  content: "/";
  color: #8a9a9e;
  padding-inline: 0.55rem;
}

.breadcrumb-item.active {
  font-weight: 700;
}

.app-topbar {
  top: 0.75rem;
  z-index: 1020;
  margin: 0.75rem clamp(1rem, 2.25vw, 2.5rem) 0;
  padding: 0;
  border: 1px solid rgba(23, 59, 66, 0.1);
  border-radius: var(--lx-corner-radius);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0.75rem 2.25rem rgba(26, 53, 60, 0.08);
  backdrop-filter: blur(14px);
}

.app-topbar-inner {
  min-height: 4.25rem;
  padding: 0.7rem 1rem;
}

.app-topbar-content {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.app-page-context {
  min-width: 0;
}

.app-breadcrumb {
  align-items: center;
  margin: 0;
  padding: 0;
  background: transparent;
}

.app-breadcrumb-eyebrow {
  color: #718287;
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.app-breadcrumb-current {
  max-width: min(38vw, 30rem);
  overflow: hidden;
  color: #173b42;
  font-family: 'Comfortaa', system-ui, sans-serif;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-topbar-actions {
  align-items: center;
  flex-direction: row;
  gap: 0.5rem;
}

.annotation-status-button {
  min-height: 2.35rem;
  padding-inline: 0.85rem;
  border-color: rgba(11, 101, 113, 0.32);
  color: #0b6571;
  box-shadow: none !important;
}

.account-action,
.account-identity {
  display: inline-flex;
  align-items: center;
  min-height: 2.35rem;
  gap: 0.25rem;
  margin: 0;
  padding: 0.45rem 0.7rem !important;
  border: 0;
  border-radius: var(--lx-corner-radius);
  color: #435c62 !important;
  font-size: 0.78rem;
  font-weight: 700;
  background: transparent;
}

.account-action:hover {
  color: #173b42 !important;
  background: #eef5f4;
}

.account-action:focus-visible,
.annotation-status-button:focus-visible,
.app-topbar-menu:focus-visible {
  outline: 3px solid rgba(11, 101, 113, 0.26);
  outline-offset: 2px;
}

.account-presence {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #50874e;
  box-shadow: 0 0 0 3px rgba(80, 135, 78, 0.14);
}

.btn-warning {
  animation: pulse-warning 2.4s infinite;
}

@keyframes pulse-warning {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
  }
}

.badge {
  font-size: 0.7rem;
  padding: 0.25em 0.4em;
}

.spinner-border-sm {
  width: 0.875rem;
  height: 0.875rem;
}

.nav-link {
  transition: color 0.15s ease-in-out;
}

.nav-link:hover {
  color: #495057 !important;
}

.btn {
  transition: all 0.15s ease-in-out;
}

.btn:hover {
  transform: translateY(-1px);
}

/* Mobile sidebar toggle button */
.navbar-toggler {
  border: none;
  padding: 0.25rem 0.5rem;
  background: transparent;
  margin-right: 1rem;
}

.app-topbar-menu {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
}

.navbar-toggler:focus {
  box-shadow: none;
}

.navbar-toggler-icon {
  background-image: none;
  display: inline-block;
  width: 1.5em;
  height: 1.5em;
}

.navbar-toggler-bar {
  display: block;
  width: 22px;
  height: 2px;
  background-color: #2d3047;
  border-radius: 1px;
  margin: 4px 0;
  transition: all 0.2s;
}

.navbar-toggler:hover .navbar-toggler-bar {
  background-color: #596CFF;
}

@media (min-width: 1200px) {
  .navbar-toggler {
    display: none !important;
  }
}

@media (max-width: 767.98px) {
  .app-topbar {
    top: 0.5rem;
    margin: 0.5rem 1rem 0;
  }

  .app-topbar-inner {
    min-height: 3.75rem;
    padding-inline: 0.75rem;
  }

  .app-topbar-content {
    gap: 0.5rem;
  }

  .app-breadcrumb-eyebrow {
    display: none;
  }

  .breadcrumb-item + .breadcrumb-item::before {
    display: none;
  }

  .app-breadcrumb-current {
    max-width: 32vw;
    font-size: 0.8rem;
  }

  .annotation-status-button {
    margin: 0 !important;
    padding-inline: 0.65rem;
    font-size: 0.68rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-warning {
    animation: none;
  }

  .nav-link,
  .btn,
  .navbar-toggler-bar {
    transition: none;
  }

  .btn:hover {
    transform: none;
  }
}
</style>
