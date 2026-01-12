<template>
    <header>
        <!--     Fonts and icons     -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap" rel="stylesheet">    
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css">
    <link
        rel="stylesheet"
        type="text/css"
        href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|Roboto+Slab:400,700|Material+Icons"
      />
    <!-- Font Awesome 6.5.1 Free (CSS only, no JS kit required) -->
    <link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      integrity="sha512-xh6IYswF2Yt+0e1yz3F6j2CvkJyDk6cfogmfVZBt3WgBp1x5Yp1p9ggbo2mcqzg4bV7+ydRZo7ljZHFQUNq9PQ=="
      crossorigin="anonymous"
      referrerpolicy="no-referrer">

  </header>
  <div class="g-sidenav-show">
    
    <template v-if="!isMenuOpen">
      <aside class="sidenav navbar navbar-vertical navbar-expand-xs ms-3" id="sidenav-main">
        <div class="g-sidenav-hidden">
          <div class="sidenav m-1">
            <button @click="toggleMenu" class="material-icons btn btn-outline-primary border-0 my-3 btn-sm mb-0 me-3">
              menu
            </button>
          </div>
        </div>
      </aside>
    </template>

    <template v-if="isMenuOpen">
      <aside class="sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark" id="sidenav-main">
        <button @click="toggleMenu" class="material-icons btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark">
          close
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
import DashboardComponent from './components/Dashboard/DashboardComponent.vue';
import ToastMessageContainer from './components/Utils/ToastMessageContainer.vue';
import axios from 'axios';

// Move this to your http_kc.ts or main.ts if possible, but it works here too
axios.defaults.baseURL = '/';

export default {
  name: "App",
  components: {
    NavbarComponent,
    SidebarComponent,
    DashboardComponent,
    ToastMessageContainer,
  },
  data() {
    return {
      // Use window.STATIC_URL injected from base.html
      staticUrl: window.STATIC_URL,
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
/* CSS imports in Vue usually go in main.ts, but simple component styles go here */
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap');

@media (max-width: 1200px) {
  .sidenav {
    transform: none !important;
    position: static;
    width: auto;
    height: auto;
    background: none;
  }
}
</style>
