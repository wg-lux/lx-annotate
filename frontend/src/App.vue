<template>
  <div class="g-sidenav-show">
    
    <template v-if="!isMenuOpen">
      <aside class="sidenav navbar navbar-vertical navbar-expand-xs ms-3" id="sidenav-main">
        <div class="g-sidenav-hidden">
          <div class="sidenav m-1">
            <button @click="toggleMenu" class="btn btn-outline-primary border-0 my-3 btn-sm mb-0 me-3">
              <i class="ni ni-collection"></i>
            </button>
          </div>
        </div>
      </aside>
    </template>

    <template v-if="isMenuOpen">
      <aside class="sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark" id="sidenav-main">
        <button @click="toggleMenu" class="btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark">
          <i class="ni ni-settings-gear-65"></i>
        </button>
        <SidebarComponent />
      </aside>
    </template>

    <main class="main-content position-relative max-height-vh-95 h-100 border-radius-lg">
      <NavbarComponent />
      <div class="container-fluid h-100 w-100 py-1 px-4">
        <div class="row">
          <div class="col-12">
            <router-view />
            <ToastMessageContainer />
          </div>
        </div>
      </div>
    </main>
    
  </div>
</template>

<script>
import NavbarComponent from './components/Menus/NavbarComponent.vue';
import SidebarComponent from './components/Menus/SidebarComponent.vue';
import ToastMessageContainer from './components/Utils/ToastMessageContainer.vue';
import axios from 'axios';

// Move this to your http_kc.ts or main.ts if possible, but it works here too
axios.defaults.baseURL = '/';

export default {
  name: "App",
  components: {
    NavbarComponent,
    SidebarComponent,
    ToastMessageContainer
  },
  data() {
    return {
      isMenuOpen: false,
    };
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    }
  }
};
</script>

<style>
@media (max-width: 1199.98px) {
  .g-sidenav-show > aside.sidenav.navbar {
    transform: none !important;
    position: static;
    width: auto;
    height: auto;
    background: none;
  }
}
</style>
