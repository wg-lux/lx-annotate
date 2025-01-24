<template>
  <div class="sidenav-header">
    <i class="fas fa-times p-3 cursor-pointer text-white opacity-5 position-absolute end-0 top-0 d-none d-xl-none" aria-hidden="true" id="iconSidenav"></i>
    <a class="navbar-brand m-0" href="/">
      <div class="sidenav-header-inner text-center">
        <img src="@/assets/img/ukw.svg" class="navbar-brand-img h-100" alt="main_logo">
      </div>
      <div class="ms-1 font-weight-bold text-white text-center">AG Lux</div>

    </a>
    
    <div class="collapse navbar-collapse w-auto max-height-vh-100" id="sidenav-collapse-main">
      <ul class="navbar-nav">
        <li class="nav-item">
          <router-link to="/" class="nav-link" :class="{ active: $route.path === '/' }">
            <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
              <i class="material-icons opacity-10">dashboard</i>
            </div>
            <span class="nav-link-text ms-1">Dashboard</span>
          </router-link>
        </li>

        <li class="nav-item">
          <router-link to="/annotationen" class="nav-link" :class="{ active: $route.path === '/annotationen' }">
            <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
              <i class="material-icons opacity-10">note_add</i>
            </div>
            <span class="nav-link-text ms-1">Annotationen Übersicht</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/video-annotation" class="nav-link" :class="{ active: $route.path === '/annotationen' }">
            <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
              <i class="material-icons opacity-10">note_add</i>
            </div>
            <span class="nav-link-text ms-1">Video Annotation</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/frame-annotation" class="nav-link" :class="{ active: $route.path === '/annotationen' }">
            <div class="icon icon-shape icon-sm shadow border-radius-md text-center me-2 d-flex align-items-center justify-content-center">
              <i class="material-icons opacity-10">note_add</i>
            </div>
            <span class="nav-link-text ms-1">Frame Annotation</span>
          </router-link>
        </li>
<!--
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
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SidebarComponent'
}
</script>

<style scoped>
.sidenav-header {
}

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
}

.nav-link-text {
  font-size: 0.875rem;
  font-weight: 400;
}

hr.horizontal.light {
  background-image: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.4), rgba(255,255,255,0));
  height: 1px;
  border: 0;
  opacity: .25;
  margin: 1rem 0;
}
</style>