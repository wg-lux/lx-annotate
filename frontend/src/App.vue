{% load static %}
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
    <link rel="stylesheet" href="@assets/css/custom-overrides.css">
  </header>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />

  <AuthCheck>
    <template #unauthenticated-content>
      <template v-if="!isMenuOpen">
        <aside
          class="sidenav navbar navbar-vertical navbar-expand-xs ms-3"
          id="sidenav-main">
        
        <div class="g-sidenav-hidden">
        <div class="sidenav m-1">
          <button @click="toggleMenu" class="material-icons btn btn-outline-primary border-0 my-3 btn-sm mb-0 me-3">menu</button>
        </div>
        </div>
        </aside>
      </template>

      <div class="g-sidenav-show">

      <template v-if="isMenuOpen">
        <aside
          class="sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark"
          id="sidenav-main">
          <button @click="toggleMenu" class="material-icons btn btn-outline-info btn-sm mb-0 me-3 bg-gradient-dark">close</button>
          <SidebarComponent/>
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

    <template #authenticated-content>
      <div class="g-sidenav-hidden">
        
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <div class="container-fluid h-100 w-100 py-1 px-4">
          <main class="main-content center position-relative max-width max-height-vh-95 h-100 border-radius-lg">

            <LoginComponent />
          </main>
        </div>
      </div>
    </template>
  </AuthCheck>
</template>

<script>
import NavbarComponent from './components/NavbarComponent.vue';
import SidebarComponent from './components/SidebarComponent.vue';
import DashboardComponent from './components/DashboardComponent.vue';
import LoginComponent from './components/LoginComponent.vue';
import ToastMessageContainer from './components/Utils/ToastMessageContainer.vue';
import '@/assets/custom-overrides.css';

import axios from 'axios';
axios.defaults.baseURL = '/';


export default {
  name: "App",

  data() {

    return {
      staticUrl: window.STATIC_URL || "/static/",
      isMenuOpen: false,

    };
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    }
  },
  components: {
    NavbarComponent,
    SidebarComponent,
    DashboardComponent,
    LoginComponent,
    ToastMessageContainer,
  },
};

</script>

<style>
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