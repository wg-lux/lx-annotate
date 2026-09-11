<template>
  <div class="sidebar-panel">
      <div class="sidenav-header">
        <a
          class="navbar-brand m-0"
          href="/"
        >
          <div class="sidenav-header-inner text-center">
            <img
              :src="logoSrc"
              alt="Logo"
              class="logo-img"
            />
          </div>
          <div class="brand-name">AG Lux</div>
          <div class="brand-context">Klinischer Arbeitsbereich</div>
        </a>
      </div>
      <div class="sidenav-body w-auto max-height-vh-100">
        <ul class="navbar-nav">
          <li class="nav-section-title">Workflow</li>
          <li class="nav-item">
            <router-link
              to="/"
              class="nav-link"
              :class="{ active: $route.path === '/' }"
            >
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="ni ni-tv-2 opacity-10"></i>
              </div>
              <span class="nav-link-text ms-1">Dashboard</span>
            </router-link>
          </li><!--
          <li>
            <router-link to="/uebersicht" class="nav-link" :class="{ active: $route.path === '/uebersicht' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="ni ni-collection opacity-10"></i>
              </div>
              <span class="nav-link-text ms-1">Alle Seiten</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/documentation" class="nav-link" :class="{ active: $route.path === '/documentation' }">
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="ni ni-book-bookmark opacity-10"></i>
              </div>
              <span class="nav-link-text ms-1">Dokumentation</span>
            </router-link>
          </li>-->
          <li class="nav-item">
            <router-link
              to="/einstellungen"
              class="nav-link"
              :class="{ active: $route.path === '/einstellungen' }"
            >
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="ni ni-settings-gear-65 opacity-10"></i>
              </div>
              <span class="nav-link-text ms-1">Einstellungen</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link
              to="/administration"
              class="nav-link"
              :class="{ active: $route.path === '/administration' }"
            >
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                <i class="ni ni-settings opacity-10"></i>
              </div>
              <span class="nav-link-text ms-1">Administration</span>
            </router-link>
          </li>
          <li
            v-can="'page.patients.view:GET'"
            class="nav-item"
          >
            <router-link
              to="/patienten"
              class="nav-link"
              :class="{ active: $route.path === '/patienten' }"
            >
              <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
               <i class="ni ni-circle-08 opacity-10"></i>
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
                  <i class="ni ni-check-bold opacity-10"></i>
                </div>
                <span class="nav-link-text nav-link-text-with-badge ms-1">
                  1. Videoübersicht - Anonymisierung starten
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
                  <i class="ni ni-user-run opacity-10"></i>
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
              <router-link
                to="/video-untersuchung"
                class="nav-link"
                :class="{ active: $route.path === '/video-untersuchung' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-button-play opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">2. Videountersuchung bearbeiten</span>
              </router-link>
            </li>

                        <li class="nav-item">
              <router-link
                to="/reporting/case-setup"
                class="nav-link"
                :class="{ active: isReportingCaseSetupRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-check-bold opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">3. Dokumentation starten</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                to="/reporting"
                class="nav-link"
                :class="{ active: isReportingRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-single-copy-04 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Dokumentation: Übersicht</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/frame-annotation"
                class="nav-link"
                :class="{ active: $route.path === '/frame-annotation' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-single-copy-04 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Frame-Annotation</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/model-training"
                class="nav-link"
                :class="{ active: $route.path === '/model-training' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-chart-bar-32 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Modelltraining</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/ai-dataset-buckets"
                class="nav-link"
                :class="{ active: $route.path === '/ai-dataset-buckets' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-chart-pie-35 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Datensatz</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/ai-dataset-settings"
                class="nav-link"
                :class="{ active: $route.path === '/ai-dataset-settings' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-settings opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Datensatz-Einstellungen</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/studies"
                class="nav-link"
                :class="{ active: $route.path === '/studies' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-chart-pie-35 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Registerstudien</span>
              </router-link>
            </li>
                        <li
                          v-can="'page.anonymization.metrics:GET'"
                          class="nav-item"
                        >
              <router-link
                to="/anonymisierung/metriken"
                class="nav-link"
                :class="{ active: isAnonymizationMetricsRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-chart-bar-32 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Anonymisierungsmetriken</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                to="/anonymisierung/evaluation"
                class="nav-link"
                :class="{ active: isAnonymizationEvaluationRoute }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-single-copy-04 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Anonymisierungsevaluation</span>
              </router-link>
            </li>


            <!-- 
            #TODO: Add back when ready
            <li class="nav-item">
              <router-link to="/frame-annotation" class="nav-link" :class="{ active: $route.path === '/frame-annotation' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-fat-add opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Frame Annotation</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/frame-selection" class="nav-link" :class="{ active: $route.path === '/frame-selection' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-album-2 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Frame Auswahl</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/fallgenerator" class="nav-link" :class="{ active: $route.path === '/fallgenerator' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-check-bold opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Fallgenerator</span>
              </router-link>
            </li>
            -->
            <li class="nav-item">
              <router-link
                to="/export"
                class="nav-link"
                :class="{ active: $route.path === '/export' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-bold-right opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Export</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link
                to="/hub-export"
                class="nav-link"
                :class="{ active: $route.path === '/hub-export' }"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-cloud-upload-96 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Registerexport</span>
              </router-link>
            </li>
            <!-- <li class="nav-item">
              <router-link to="anonymisierung/validierung" class="nav-link" :class="{ active: $route.path === '/validierung' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-check-bold opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Datenvalidierung</span>
              </router-link>
            </li> -->
            <!--
            <li class="nav-item">
              <router-link to="/pdf-meta-annotation" class="nav-link" :class="{ active: $route.path === '/pdf-annotation' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-fat-add opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">PDF Annotation</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/profile" class="nav-link" :class="{ active: $route.path === '/profile' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-circle-08 opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Profile</span>
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/ueber-uns" class="nav-link" :class="{ active: $route.path === '/ueber-uns' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="ni ni-badge opacity-10"></i>
                </div>
                <span class="nav-link-text ms-1">Über Uns</span>
              </router-link>
            </li>
            -->
        </ul>
      </div>
  </div>
</template>

<script>
import axiosInstance, { r } from '@/api/axiosInstance'
import { endpoints } from '@/types/api/endpoints'
import coloRegLogo from '@/assets/ColoReg.png'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('sidebar')

export default {
  name: 'SidebarComponent',
  data() {
    return {
      coloRegLogo,
      pendingValidationCount: 0,
      processingCount: 0,
      workflowCountsInterval: null
    }
  },
  computed: {
    logoSrc() {
      return this.coloRegLogo
    },
    isAnonymizationOverviewRoute() {
      return this.$route.path === '/anonymisierung' || this.$route.path.startsWith('/anonymisierung/uebersicht')
    },
    isAnonymizationValidationRoute() {
      return this.$route.path.startsWith('/anonymisierung/validierung')
    },
    isAnonymizationMetricsRoute() {
      return this.$route.path.startsWith('/anonymisierung/metriken')
    },
    isAnonymizationEvaluationRoute() {
      return this.$route.path.startsWith('/anonymisierung/evaluation')
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
  mounted() {
    this.refreshWorkflowCounts();
    this.workflowCountsInterval = window.setInterval(() => {
      this.refreshWorkflowCounts();
    }, 30000);
  },
  beforeUnmount() {
    if (this.workflowCountsInterval) {
      window.clearInterval(this.workflowCountsInterval);
      this.workflowCountsInterval = null;
    }
  },
  methods: {
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
        logger.error('workflow-count-refresh-failed', error)
      }
    }
  }
}
</script>

<style scoped>
.sidebar-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: #f4f8f7;
  background: transparent !important;
}

.sidebar-panel * {
  box-sizing: border-box;
}

.sidenav-header {
  flex: 0 0 auto;
  height: auto !important;
  min-height: 0;
  position: relative;
  z-index: 1;
  padding: 0 0.65rem 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

.brand-name {
  color: #fff !important;
  font-family: 'Comfortaa', system-ui, sans-serif;
  font-size: 0.96rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-align: center;
}

.brand-context {
  margin-top: 0.12rem;
  color: rgba(229, 241, 239, 0.68);
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  text-align: center;
}

.sidenav-header-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.15rem 1rem 0.25rem;
  margin-bottom: 0.2rem;
}

.logo-img {
  display: block;
  width: auto;
  max-width: 132px;
  max-height: 78px;
  object-fit: contain;
}

.sidenav-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: none;
  padding: 0.75rem 0.55rem 1rem;
  -webkit-overflow-scrolling: touch;
}

.navbar-nav {
  padding-left: 0;
  margin-bottom: 0;
  list-style: none;
}

.nav-section-title {
  padding: 0.2rem 0.75rem 0.65rem;
  font-size: 0.66rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(221, 237, 235, 0.62);
  font-weight: 700;
}

.nav-item {
  width: 100%;
  margin-bottom: 0.18rem;
}

.nav-link {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  white-space: normal;
  min-height: 2.55rem;
  padding: 0.48rem 0.55rem;
  color: rgba(244, 248, 247, 0.83) !important;
  border: 1px solid transparent;
  border-radius: var(--lx-corner-radius);
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
  text-decoration: none;
}

.nav-link .nav-link-text {
  color: inherit !important;
}

.nav-link .icon i {
  color: inherit !important;
  opacity: 0.92 !important;
}

.nav-link:hover {
  color: #fff !important;
  background-color: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(2px);
}

.nav-link:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 1px;
}

.nav-link.active {
  color: #fff !important;
  background: linear-gradient(100deg, rgba(94, 172, 169, 0.24), rgba(255, 255, 255, 0.08));
  border-color: rgba(148, 211, 205, 0.25);
  box-shadow: inset 3px 0 0 #73c3bd;
}

.icon-shape {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--lx-corner-radius);
  box-shadow: none !important;
}

.icon-shape i {
  font-size: 1rem;
  line-height: 1;
}

.nav-link-text {
  flex: 1 1 auto;
  min-width: 0;
  align-self: center;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.35;
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
  color: #372d06;
  background: #f3ce72;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.workflow-badge-processing {
  color: #fff;
  background: #3c7fa8;
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

@media (prefers-reduced-motion: reduce) {
  .nav-link {
    transition: none !important;
  }

  .nav-link:hover {
    transform: none;
  }
}
</style>
