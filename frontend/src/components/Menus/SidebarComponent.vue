<template>
  <div>
    <!-- Header with font and icon links -->
    <header>
      <link
        rel="stylesheet"
        type="text/css"
        href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"
      />
      <link
        rel="stylesheet"
        href="https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css"
      />
    </header>

    <!-- Mobile backdrop -->
    <div v-if="isSidebarOpen" class="sidebar-backdrop" @click="closeSidebar"></div>

    <div class="sidenav" :class="{ show: isSidebarOpen }">
      <div class="sidenav-header">
        <a class="navbar-brand m-0" href="/">
          <div class="sidenav-header-inner text-center">
            <img :src="logoSrc" alt="Logo" class="logo-img" />
          </div>
          <div class="ms-1 font-weight-bold text-white text-center">AG Lux</div>
        </a>
      </div>
      <div class="sidenav-body w-auto max-height-vh-100">
        <ul class="navbar-nav">
          <li class="nav-section-title">Workflow</li>
          <li class="nav-item">
            <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="material-icons opacity-10">dashboard</i>
              </div>
              <span class="nav-link-text ms-1">Dashboard</span>
            </router-link>
          </li>
          <li>
            <router-link to="/uebersicht" class="nav-link" :class="{ active: $route.path === '/uebersicht' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="material-icons opacity-10">dashboard</i>
              </div>
              <span class="nav-link-text ms-1">Alle Seiten</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/documentation" class="nav-link" :class="{ active: $route.path === '/documentation' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="material-icons opacity-10">menu_book</i>
              </div>
              <span class="nav-link-text ms-1">Dokumentation</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/einstellungen" class="nav-link" :class="{ active: $route.path === '/einstellungen' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="material-icons opacity-10">tune</i>
              </div>
              <span class="nav-link-text ms-1">Einstellungen</span>
            </router-link>
          </li>
          <li class="nav-item" v-can="'page.patients.view:GET'">
            <router-link to="/patienten" class="nav-link" :class="{ active: $route.path === '/patienten' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
               <i class="material-icons opacity-10">people</i>
              </div>
              <span class="nav-link-text ms-1">Patienten</span>
            </router-link>
          </li>

            <li class="nav-item">
              <router-link
                to="/anonymisierung/uebersicht"
                class="nav-link"
                :class="{ active: isAnonymizationOverviewRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">check_circle</i>
                </div>
                <span class="nav-link-text nav-link-text-with-badge ms-1">
                  1. Anonymisierung
                  <span
                    v-if="processingCount > 0"
                    class="workflow-badge workflow-badge-processing"
                    title="Dateien werden aktuell anonymisiert"
                  >
                    {{ processingCount }}
                  </span>
                </span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                :to="lastValidationTo"
                class="nav-link"
                :class="{ active: isAnonymizationValidationRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">verified_user</i>
                </div>
                <span class="nav-link-text nav-link-text-with-badge ms-1">
                  1b. Validierung fortsetzen
                  <span
                    v-if="pendingValidationCount > 0"
                    class="workflow-badge"
                    title="Dateien warten auf Validierung"
                  >
                    {{ pendingValidationCount }}
                  </span>
                </span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/video-untersuchung" class="nav-link" :class="{ active: $route.path === '/video-untersuchung' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">video_call</i>
                </div>
                <span class="nav-link-text ms-1">2. Video-Untersuchung</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/frame-annotation" class="nav-link" :class="{ active: $route.path === '/frame-annotation' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">note_add</i>
                </div>
                <span class="nav-link-text ms-1">2b. Frame Annotation</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                to="/reporting/case-setup"
                class="nav-link"
                :class="{ active: isReportingCaseSetupRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">playlist_add_check</i>
                </div>
                <span class="nav-link-text ms-1">3. Befundung starten</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                to="/reporting"
                class="nav-link"
                :class="{ active: isReportingRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">fact_check</i>
                </div>
                <span class="nav-link-text ms-1">Befundung: Übersicht</span>
              </router-link>
            </li>
            <!-- #TODO: Add back when ready
            <li class="nav-item">
              <router-link to="/frame-annotation" class="nav-link" :class="{ active: $route.path === '/frame-annotation' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">note_add</i>
                </div>
                <span class="nav-link-text ms-1">Frame Annotation</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/frame-selection" class="nav-link" :class="{ active: $route.path === '/frame-selection' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">photo_library</i>
                </div>
                <span class="nav-link-text ms-1">Frame Auswahl</span>
              </router-link>
            </li>

            
            <li class="nav-item">
              <router-link to="/fallgenerator" class="nav-link" :class="{ active: $route.path === '/fallgenerator' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">check_circle</i>
                </div>
                <span class="nav-link-text ms-1">Fallgenerator</span>
              </router-link>
            </li>
                                    -->

            <li class="nav-item">
              <router-link to="/export" class="nav-link" :class="{ active: $route.path === '/export' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">arrow</i>
                </div>
                <span class="nav-link-text ms-1">Export</span>
              </router-link>
            </li>
            <!-- <li class="nav-item">
              <router-link to="anonymisierung/validierung" class="nav-link" :class="{ active: $route.path === '/validierung' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">check_circle</i>
                </div>
                <span class="nav-link-text ms-1">Datenvalidierung</span>
              </router-link>
            </li> -->
            <!--
            <li class="nav-item">
              <router-link to="/pdf-meta-annotation" class="nav-link" :class="{ active: $route.path === '/pdf-annotation' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">note_add</i>
                </div>
                <span class="nav-link-text ms-1">PDF Annotation</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/profile" class="nav-link" :class="{ active: $route.path === '/profile' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">person</i>
                </div>
                <span class="nav-link-text ms-1">Profile</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/ueber-uns" class="nav-link" :class="{ active: $route.path === '/ueber-uns' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">people</i>
                </div>
                <span class="nav-link-text ms-1">Über Uns</span>
              </router-link>
            </li>
            -->
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import { getStaticUrl } from '@/utils/getStaticUrl'

export default {
  name: 'SidebarComponent',
  data() {
    return {
      staticUrl: getStaticUrl(),
      isSidebarOpen: false,
      pendingValidationCount: 0,
      processingCount: 0,
      workflowCountsInterval: null
    }
  },
  computed: {
    logoSrc() {
      return `${this.staticUrl}img/ColoReg.png`
    },
    isAnonymizationOverviewRoute() {
      return this.$route.path === '/anonymisierung' || this.$route.path.startsWith('/anonymisierung/uebersicht')
    },
    isAnonymizationValidationRoute() {
      return this.$route.path.startsWith('/anonymisierung/validierung')
    },
    isReportingRoute() {
      return this.$route.path.startsWith('/reporting')
    },
    isReportingCaseSetupRoute() {
      return this.$route.path.startsWith('/reporting/case-setup')
    },
    lastValidationTo() {
      const fileIdRaw = sessionStorage.getItem('last:fileId')
      const mediaTypeRaw = sessionStorage.getItem('last:scope')
      const fileId = Number(fileIdRaw)
      const mediaType = mediaTypeRaw === 'video' || mediaTypeRaw === 'pdf' ? mediaTypeRaw : null

      if (Number.isFinite(fileId) && mediaType) {
        return {
          path: '/anonymisierung/validierung',
          query: {
            fileId: String(fileId),
            mediaType
          }
        }
      }

      return '/anonymisierung/validierung'
    }
  },
  methods: {
    toggleSidebar() {
      this.isSidebarOpen = !this.isSidebarOpen;
    },
    closeSidebar() {
      this.isSidebarOpen = false;
    },
    openSidebar() {
      this.isSidebarOpen = true;
    },
    async refreshWorkflowCounts() {
      try {
        const { data } = await axiosInstance.get(r(endpoints.anonymization.itemsOverview))
        if (!Array.isArray(data)) {
          this.pendingValidationCount = 0
          this.processingCount = 0
          return
        }

        this.pendingValidationCount = data.filter((item) => {
          return (
            item?.anonymizationStatus === 'done_processing_anonymization' &&
            item?.annotationStatus !== 'validated'
          )
        }).length

        this.processingCount = data.filter((item) => {
          return [
            'processing_anonymization',
            'extracting_frames',
            'predicting_segments'
          ].includes(item?.anonymizationStatus)
        }).length
      } catch (error) {
        console.error('Failed to refresh workflow counts in sidebar:', error)
      }
    },
    handleToggleSidebarEvent() {
      this.toggleSidebar();
    },
    handleWindowResize() {
      if (window.innerWidth >= 1200) {
        this.isSidebarOpen = false;
      }
    }
  },
  mounted() {
    document.addEventListener('toggleSidebar', this.handleToggleSidebarEvent);
    window.addEventListener('resize', this.handleWindowResize);
    this.refreshWorkflowCounts();
    this.workflowCountsInterval = window.setInterval(() => {
      this.refreshWorkflowCounts();
    }, 30000);
  },
  beforeUnmount() {
    document.removeEventListener('toggleSidebar', this.handleToggleSidebarEvent);
    window.removeEventListener('resize', this.handleWindowResize);
    if (this.workflowCountsInterval) {
      window.clearInterval(this.workflowCountsInterval);
      this.workflowCountsInterval = null;
    }
  }
}
</script>

<style scoped>
.sidenav {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #f5f8ff;
}

.sidenav * {
  box-sizing: border-box;
}

.sidenav-header {
  flex: 0 0 auto;
  height: auto !important;
  min-height: 0;
  position: relative;
  z-index: 1;
}

.sidenav-header .navbar-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  padding: 0 !important;
  margin: 0 !important;
  white-space: normal;
}

.sidenav-header .font-weight-bold {
  color: #fff !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  object-fit: contain;
}

.sidenav-header-inner {
  padding: 0.5rem 1rem;
  margin-bottom: 1.5rem;
}

.logo-img {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

.sidenav-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: none;
  padding: 0.2rem 0.45rem 0.8rem;
  -webkit-overflow-scrolling: touch;
}

.navbar-nav {
  padding-left: 0;
  margin-bottom: 0;
  list-style: none;
}

.nav-section-title {
  padding: 0.35rem 0.75rem 0.6rem;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d6deed;
  font-weight: 700;
}

.nav-item {
  width: 100%;
  margin-bottom: 2px;
}

.nav-link {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  white-space: normal;
  min-height: 2.25rem;
  padding: 0.5rem 0.65rem;
  color: #f5f8ff !important;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  text-decoration: none;
}

.nav-link .nav-link-text {
  color: inherit !important;
}

.nav-link .material-icons {
  color: inherit !important;
  opacity: 0.92 !important;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.18);
}

.nav-link:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 1px;
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.24);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
}

.icon-shape {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  background-color: rgba(255, 255, 255, 0.16);
  border-radius: 0.75rem;
}

.material-icons {
  font-size: 1rem;
  line-height: 0;
}

.nav-link-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.3;
  white-space: normal;
  overflow-wrap: anywhere;
}

.nav-link-text-with-badge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.workflow-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  color: #111827;
  background: #ffd24a;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.workflow-badge-processing {
  color: #fff;
  background: #1a73e8;
  border-color: rgba(255, 255, 255, 0.22);
}

hr.horizontal.light {
  background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0));
  height: 1px;
  border: 0;
  opacity: 0.25;
  margin: 1rem 0;
}

.img {
  object-fit: contain;
}

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  background-color: rgba(12, 18, 32, 0.56);
  z-index: 1040;
  opacity: 0;
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

@media (max-width: 1199.98px) {
  .sidenav {
    position: fixed !important;
    top: 0;
    left: 0;
    width: min(320px, 82vw) !important;
    height: 100dvh;
    transform: translateX(-110%) !important;
    z-index: 1050;
    background: linear-gradient(195deg, #42424a, #191919) !important;
    transition: transform 0.22s ease-out !important;
    overflow: hidden;
    box-shadow: 14px 0 28px rgba(0, 0, 0, 0.36);
    pointer-events: none;
  }

  .sidenav.show {
    transform: translateX(0) !important;
    pointer-events: auto;
  }
}

@media (min-width: 1200px) {
  .sidebar-backdrop {
    display: none;
  }

  .sidenav {
    transform: none !important;
    position: relative !important;
  }
}
</style>
