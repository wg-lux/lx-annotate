{% load static %}
<template>
  <header>
        <!--     Fonts and icons     -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap" rel="stylesheet">    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/latest/css/font-awesome.min.css">

  </header>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <AuthCheck>
    <template #unauthenticated-content>
      <div class="g-sidenav-show bg-gray-200">
        <aside class="sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark" id="sidenav-main">
          <SidebarComponent />
        </aside>
        <main class="main-content position-relative max-height-vh-95 h-100 border-radius-lg">
          <NavbarComponent />
          <div class="container-fluid h-100 w-100 py-1 px-4">
            <div class="row">
              <div class="col-12">
                <router-view />
              </div>
            </div>
          </div>
        </main>
      </div>
    </template>

    <template #authenticated-content>
      <body class="g-sidenav-hidden">
        
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <div class="container-fluid h-100 w-100 py-1 px-4">
          <main class="main-content center position-relative max-width max-height-vh-95 h-100 border-radius-lg">

            <LoginComponent />
          </main>
        </div>
      </body>
    </template>
  </AuthCheck>
</template>

<script>
import NavbarComponent from './components/NavbarComponent.vue';
import SidebarComponent from './components/SidebarComponent.vue';
import DashboardComponent from './components/DashboardComponent.vue';
import LoginComponent from './components/LoginComponent.vue';


import axios from 'axios';
axios.defaults.baseURL = '/';


export default {
  name: 'App',
  data() {
    return {
      staticUrl: window.STATIC_URL || '/static/'
    }
  },
  components: {
    NavbarComponent,
    SidebarComponent,
    DashboardComponent,
    LoginComponent
  },

};

</script>

<style>

</style>