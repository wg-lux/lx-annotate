<template>
  <div class="g-sidenav-show">
    
    <template v-if="!isMenuOpen">
      <aside class="sidenav navbar navbar-vertical navbar-expand-xs ms-3 sidebar-shell sidebar-shell--collapsed" id="sidenav-main">
        <div class="g-sidenav-hidden">
          <div class="sidenav m-1">
            <button
              type="button"
              @click="toggleMenu"
              class="btn btn-outline-primary border-0 my-3 mb-0 me-3 sidebar-toggle-button sidebar-toggle-button--closed"
              aria-label="Sidebar öffnen"
              :aria-expanded="String(isMenuOpen)"
              title="Sidebar öffnen"
            >
              <span class="sidebar-toggle-icon sidebar-toggle-icon--menu" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </template>

    <template v-if="isMenuOpen">
      <aside class="sidenav navbar navbar-vertical navbar-expand-xs border-0 border-radius-xl my-3 fixed-start ms-3 bg-gradient-dark sidebar-shell sidebar-shell--open" id="sidenav-main">
        <button
          type="button"
          @click="toggleMenu"
          class="btn btn-outline-info mb-0 me-3 bg-gradient-dark sidebar-toggle-button sidebar-toggle-button--open"
          aria-label="Sidebar schließen"
          :aria-expanded="String(isMenuOpen)"
          title="Sidebar schließen"
        >
          <i class="ni ni-fat-remove" aria-hidden="true"></i>
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
.sidebar-shell--collapsed {
  width: 4.75rem !important;
  min-width: 4.75rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.25rem;
}

.sidebar-shell--collapsed .g-sidenav-hidden,
.sidebar-shell--collapsed .sidenav {
  width: 100%;
  display: flex;
  justify-content: center;
}

.sidebar-shell--open {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-shell--open > div {
  flex: 1 1 auto;
  min-height: 0;
}

.sidebar-shell--open > div > .sidenav {
  height: 100%;
}

.sidebar-toggle-button {
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  line-height: 1;
  border-radius: 0.5rem;
  box-shadow: none;
}

.sidebar-toggle-button .ni {
  font-size: 1.15rem;
  line-height: 1;
}

.sidebar-toggle-button:focus-visible {
  outline: 2px solid #9dc2ff;
  outline-offset: 2px;
}

.sidebar-toggle-button--closed {
  color: #2d3047;
  background: #ffffff;
  border-color: rgba(45, 48, 71, 0.16) !important;
}

.sidebar-toggle-button--closed:hover,
.sidebar-toggle-button--closed:focus {
  color: #263fff;
  background: #f5f7ff;
}

.sidebar-toggle-button--open {
  margin: 0.75rem 0.75rem 0.25rem auto !important;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.36);
  z-index: 2;
}

.sidebar-toggle-button--open:hover,
.sidebar-toggle-button--open:focus {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.16) !important;
  border-color: rgba(255, 255, 255, 0.5);
}

.sidebar-toggle-icon--menu {
  display: inline-flex;
  width: 1.35rem;
  height: 1rem;
  flex-direction: column;
  justify-content: space-between;
  color: currentColor;
}

.sidebar-toggle-icon--menu span {
  display: block;
  width: 100%;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

@media (max-width: 1199.98px) {
  .g-sidenav-show > aside.sidenav.navbar {
    transform: none !important;
    position: static;
    width: auto;
    height: auto;
    background: none;
  }

  .g-sidenav-show > aside.sidenav.navbar.sidebar-shell--collapsed {
    width: 4.75rem !important;
  }
}
</style>
