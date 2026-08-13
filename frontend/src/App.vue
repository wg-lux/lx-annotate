<template>
  <div class="g-sidenav-show app-shell" :class="{ 'app-shell--nav-open': isMenuOpen }">
    <button
      v-if="isMenuOpen"
      type="button"
      class="app-shell-backdrop"
      aria-label="Navigation schließen"
      @click="closeMenu"
    ></button>

    <template v-if="!isMenuOpen">
      <aside id="sidenav-main" class="sidenav navbar navbar-vertical navbar-expand-xs sidebar-shell sidebar-shell--collapsed">
        <div class="g-sidenav-hidden">
          <div class="sidenav m-1">
            <button
              type="button"
            class="btn border-0 sidebar-toggle-button sidebar-toggle-button--closed"
              aria-label="Sidebar öffnen"
              :aria-expanded="String(isMenuOpen)"
              title="Sidebar öffnen"
              @click="toggleMenu"
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
      <aside id="sidenav-main" class="sidenav navbar navbar-vertical navbar-expand-xs border-0 fixed-start sidebar-shell sidebar-shell--open">
        <button
          type="button"
          class="btn mb-0 sidebar-toggle-button sidebar-toggle-button--open"
          aria-label="Sidebar schließen"
          :aria-expanded="String(isMenuOpen)"
          title="Sidebar schließen"
          @click="toggleMenu"
        >
          <i class="ni ni-fat-remove" aria-hidden="true"></i>
        </button>
        <SidebarComponent />
      </aside>
    </template>

    <main class="main-content position-relative app-main">
      <NavbarComponent />
      <div class="container-fluid w-100 app-content">
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
  mounted() {
    document.addEventListener('toggleSidebar', this.toggleMenu);
  },
  beforeUnmount() {
    document.removeEventListener('toggleSidebar', this.toggleMenu);
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
    closeMenu() {
      this.isMenuOpen = false;
    }
  }
};
</script>

<style>
.g-sidenav-show > aside.sidenav.navbar.sidebar-shell--collapsed {
  width: 4.5rem !important;
  min-width: 4.5rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 1rem;
  background: transparent !important;
  box-shadow: none !important;
}

.sidebar-shell--collapsed .g-sidenav-hidden,
.sidebar-shell--collapsed .sidenav {
  width: 100%;
  display: flex;
  justify-content: center;
}

.g-sidenav-show > aside.sidenav.navbar.sidebar-shell--open {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 17.5rem !important;
  margin: 1rem 0 1rem 1rem;
  height: calc(100vh - 2rem) !important;
  border-radius: 1.25rem;
  background: linear-gradient(165deg, #173b42 0%, #102b32 55%, #0b232a 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 1.25rem 3rem rgba(20, 46, 53, 0.22);
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
  border-radius: 0.8rem;
  box-shadow: none !important;
  transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
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
  color: #173b42;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(23, 59, 66, 0.14) !important;
  box-shadow: 0 0.5rem 1.5rem rgba(29, 58, 64, 0.12) !important;
}

.sidebar-toggle-button--closed:hover,
.sidebar-toggle-button--closed:focus {
  color: #0b6571;
  background: #ffffff;
  transform: translateY(-1px);
}

.sidebar-toggle-button--open {
  margin: 0.75rem 0.75rem 0.15rem auto !important;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
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

.app-shell-backdrop {
  display: none;
}

.g-sidenav-show.app-shell .app-main {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  margin-left: 4.5rem !important;
  padding-bottom: 2rem;
}

.g-sidenav-show.app-shell.app-shell--nav-open .app-main {
  margin-left: 18.5rem !important;
}

.app-content {
  padding: 0.75rem clamp(1rem, 2.25vw, 2.5rem) 2rem;
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
    width: 4.5rem !important;
    position: fixed !important;
    top: 0;
    left: 0;
    z-index: 1030;
  }

  .g-sidenav-show > aside.sidenav.navbar.sidebar-shell--open {
    position: fixed !important;
    inset: 0 auto 0 0;
    width: min(19rem, calc(100vw - 2rem)) !important;
    height: 100dvh !important;
    margin: 0;
    border-radius: 0 1.25rem 1.25rem 0;
    z-index: 1050;
  }

  .sidebar-shell--open .sidenav {
    transform: none !important;
    pointer-events: auto !important;
  }

  .app-shell-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 1040;
    border: 0;
    background: rgba(8, 24, 29, 0.54);
    backdrop-filter: blur(3px);
  }

  .g-sidenav-show.app-shell .app-main,
  .g-sidenav-show.app-shell.app-shell--nav-open .app-main {
    margin-left: 0 !important;
  }

  .app-content {
    padding-inline: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-toggle-button {
    transition: none;
  }
}
</style>
