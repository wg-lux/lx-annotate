<template>
  <div>
    <!-- Font and icon links (consider moving these to your index.html) -->
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


  
    <!-- Sidebar container -->
    <div class="sidebar sidebar-offcanvas nav">
      <div class="sidenav-header">
        <a class="navbar-brand" href="/">
        <div class="text-center">
          <img :src="staticUrl + 'img/ag_lux_logo_light_grey.svg'" alt="Logo" />
        </div>
        <div class="ms-1 font-weight-bold text-white text-center">AG Lux</div>
        </a>
        <div class="collapse navbar-collapse w-auto max-height-vh-100" id="sidenav-collapse-main">
          <ul class="navbar-nav">
            <!-- Loop through navigation links -->
            <li class="nav-item" v-for="link in navLinks" :key="link.path">
              <!-- Using @click.native (Vue 2) or simply @click (Vue 3) to close sidebar on mobile -->
              <router-link
                :to="link.path"
                class="nav-link"
                :class="{ active: $route.path === link.path }"
                @click.native="closeSidebar"
              >
                <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
                  <i class="material-icons opacity-10">{{ link.icon }}</i>
                </div>
                <span class="nav-link-text ms-1">{{ link.label }}</span>
              </router-link>
            </li>
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
      staticUrl: window.STATIC_URL || '/static/',
      navLinks: [
        { path: '/', icon: 'dashboard', label: 'Dashboard' },
        { path: '/annotationen', icon: 'note_add', label: 'Annotationen Übersicht' },
        { path: '/video-annotation', icon: 'note_add', label: 'Video Annotation' },
        { path: '/frame-annotation', icon: 'note_add', label: 'Frame Annotation' },
        { path: '/fallgenerator', icon: 'check_circle', label: 'Fallgenerator' },
        { path: '/befund', icon: 'check_circle', label: 'Befunde' },
        { path: '/profil', icon: 'person', label: 'Profil' },
        { path: '/ueber-uns', icon: 'people', label: 'Über Uns' }
      ]
    }
  },
}
</script>

<style scoped>
/* Sidebar header styles */
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
  padding: 1rem;
  border-radius: 0.375rem;
}

.nav-link-text {
  font-size: 0.875rem;
  font-weight: 400;
}



</style>
