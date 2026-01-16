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
            <img :src="staticUrl + 'img/ag_lux_logo_light_grey.svg'" alt="Logo" />
          </div>
          <div class="ms-1 font-weight-bold text-white text-center">AG Lux</div>
        </a>
        <div class="w-auto max-height-vh-100" >
          <ul class="navbar-nav">
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
            <li class="nav-item" v-can="'page.patients.view:GET'">
              <router-link to="/patienten" class="nav-link" :class="{ active: $route.path === '/patienten' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                 <i class="material-icons opacity-10">people</i>
                </div>
                <span class="nav-link-text ms-1">Patienten</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link to="/anonymisierung/uebersicht" class="nav-link" :class="{ active: $route.path === '/anonymisierung' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">check_circle</i>
                </div>
                <span class="nav-link-text ms-1">1. Anonymisierung</span>
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
              <router-link to="/untersuchung" class="nav-link" :class="{ active: $route.path === '/untersuchung' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">check_circle</i>
                </div>
                <span class="nav-link-text ms-1">Untersuchung</span>
              </router-link>
            </li>
            <!-- <li class="nav-item">
              <router-link to="/report-generator" class="nav-link" :class="{ active: $route.path === '/report-generator' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">article</i>
                </div>
                <span class="nav-link-text ms-1">Report Generator</span>
              </router-link>
            </li>
            <li class="nav-item">
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
              <router-link to="/profil" class="nav-link" :class="{ active: $route.path === '/profil' }">
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">person</i>
                </div>
                <span class="nav-link-text ms-1">Profil</span>
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
  </div>
</template>

<script>
export default {
  name: 'SidebarComponent',
  data() {
    return {
      staticUrl: window.STATIC_URL,
      isSidebarOpen: false
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
    }
  },
  mounted() {
    // Listen for custom events from navbar
    const handleToggle = () => {
      this.toggleSidebar();
    };
    
    document.addEventListener('toggleSidebar', handleToggle);
    
    // Handle window resize to close sidebar on larger screens
    const handleResize = () => {
      if (window.innerWidth >= 1200) {
        this.isSidebarOpen = false;
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup event listeners
    this.$once('hook:beforeDestroy', () => {
      document.removeEventListener('toggleSidebar', handleToggle);
      window.removeEventListener('resize', handleResize);
    });
  }
}
</script>

<style scoped>
/* Preserve original desktop sidebar styles */
.sidenav-header-inner {
  padding: 0.5rem 1rem;
  margin-bottom: 1.5rem;
  background-color: white;
}

.navbar-nav {
  padding-left: 0;
  margin-bottom: 0;
  list-style: none;
}

.nav-item {
  width: 100%;
  margin-bottom: 1.5px;
}

.nav-link {
  display: flex;
  align-items: center;
  white-space: nowrap;
  padding: 0.5rem 1rem;
  color: #fff;
  transition: all 0.2s ease-in-out;
  text-decoration: none;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
}

/* Mobile Responsiveness Improvements */
@media (max-width: 1199.98px) {
  .sidenav {
    position: fixed !important;
    top: 0;
    left: 0;
    width: 250px !important;
    height: 100vh;
    transform: translateX(-100%) !important;
    z-index: 9999;
    background: linear-gradient(195deg, #42424a, #191919) !important;
    transition: transform 0.3s ease-in-out !important;
  }
  
  .sidenav.show {
    transform: translateX(0) !important;
  }
  
  /* Ensure content doesn't get blocked when sidebar is closed */
  .sidenav:not(.show) + .main-content {
    margin-left: 0 !important;
  }
}

.nav-link.active {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.icon-shape {
  width: 32px;
  height: 32px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
}

.material-icons {
  font-size: 1rem;
  line-height: 0;
}

.nav-link-text {
  font-size: 0.875rem;
  font-weight: 400;
}

hr.horizontal.light {
  background-image: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.4), rgba(255,255,255,0));
  height: 1px;
  border: 0;
  opacity: 0.25;
  margin: 1rem 0;
}

.img {
  object-fit: contain;
}

/* Mobile sidebar backdrop */
.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  opacity: 0;
  animation: fadeIn 0.3s ease-in-out forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* Responsive improvements for larger screens */
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