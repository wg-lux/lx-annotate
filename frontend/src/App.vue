<template>
  <div
    class="g-sidenav-show app-shell"
    :class="{ 'app-shell--nav-open': isMenuOpen }"
  >
    <a
      class="app-skip-link"
      href="#page-content"
      @click.prevent="focusContent"
    >Zum Inhalt springen</a>
    <button
      v-if="isMenuOpen"
      type="button"
      class="app-shell-backdrop"
      aria-label="Navigation schließen"
      @click="closeMenu"
    ></button>

    <template v-if="!isMenuOpen">
      <aside
        id="sidenav-main"
        class="sidenav navbar navbar-vertical navbar-expand-xs sidebar-shell sidebar-shell--collapsed"
      >
        <div class="g-sidenav-hidden">
          <div class="sidenav m-1">
            <button
              ref="sidebarOpener"
              type="button"
              class="btn border-0 sidebar-toggle-button sidebar-toggle-button--closed"
              aria-label="Sidebar öffnen"
              :aria-expanded="isMenuOpen"
              title="Sidebar öffnen"
              @click="toggleMenu"
            >
              <span
                class="sidebar-toggle-icon sidebar-toggle-icon--menu"
                aria-hidden="true"
              >
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
      <aside
        id="sidenav-main"
        class="sidenav navbar navbar-vertical navbar-expand-xs border-0 fixed-start sidebar-shell sidebar-shell--open"
        aria-label="Hauptnavigation"
        @keydown.esc.stop.prevent="closeMenu"
      >
        <div class="sidebar-shell__toolbar">
          <button
            ref="sidebarCloser"
            type="button"
            class="btn mb-0 sidebar-toggle-button sidebar-toggle-button--open"
            aria-label="Sidebar schließen"
            aria-controls="sidenav-main"
            :aria-expanded="isMenuOpen"
            title="Sidebar schließen"
            @click="toggleMenu"
          >
            <i
              class="ni ni-fat-remove"
              aria-hidden="true"
            ></i>
          </button>
        </div>

        <SidebarComponent class="sidebar-shell__content" />
      </aside>
    </template>

    <main class="main-content position-relative app-main">
      <NavbarComponent
        :is-sidebar-open="isMenuOpen"
        @toggle-sidebar="toggleMenu"
      />
      <div
        id="page-content"
        ref="pageContent"
        tabindex="-1"
        class="container-fluid w-100 app-content"
      >
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
      menuOpener: null,
    };
  },
  methods: {
    toggleMenu() {
      if (this.isMenuOpen) {
        this.closeMenu();
        return;
      }
      this.menuOpener = document.activeElement;
      this.isMenuOpen = true;
      this.$nextTick(() => this.$refs.sidebarCloser?.focus());
    },
    closeMenu() {
      this.isMenuOpen = false;
      this.$nextTick(() => {
        const opener = this.menuOpener;
        if (opener instanceof HTMLElement && opener.isConnected && opener !== document.body) {
          opener.focus();
        } else {
          this.$refs.sidebarOpener?.focus();
        }
        this.menuOpener = null;
      });
    },
    focusContent() {
      this.isMenuOpen = false;
      this.menuOpener = null;
      this.$nextTick(() => this.$refs.pageContent.focus());
    }
  }
};
</script>

<style>
.app-skip-link {
  position: fixed;
  top: 0.75rem;
  left: 1rem;
  z-index: 1060;
  padding: 0.75rem 1rem;
  color: #ffffff;
  background: #173b42;
  border-radius: var(--lx-corner-radius);
  transform: translateY(calc(-100% - 1rem));
}

.app-skip-link:focus {
  transform: translateY(0);
  color: #ffffff;
  outline: 3px solid #9dc2ff;
  outline-offset: 2px;
}

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
  border-radius: var(--lx-corner-radius);
  background: linear-gradient(165deg, #173b42 0%, #102b32 55%, #0b232a 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 1.25rem 3rem rgba(20, 46, 53, 0.22);
  position: fixed;
}

.g-sidenav-show
  > aside.sidenav.navbar.sidebar-shell--open
  > .sidebar-panel {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
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
  border-radius: var(--lx-corner-radius);
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
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  margin: 0 !important;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  z-index: 2;
}
/* Ensure the parent toolbar acts as the absolute anchor */
.sidebar-shell__toolbar {
  position: relative;
  width: 100%;
}

/* For Top-Left Placement We Use The Most Specific Selector */
.g-sidenav-show .sidebar-shell--open .sidebar-toggle-button--open {
  position: absolute !important;
  top: 0.75rem !important;
  left: 0.75rem !important;
  right: auto !important;
  color: #ffffff;
  margin: 0 !important;
  z-index: 10;
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
    display: none !important;
  }

  .g-sidenav-show > aside.sidenav.navbar.sidebar-shell--open {
    position: fixed !important;
    inset: 0 auto 0 0;
    width: min(19rem, calc(100vw - 2rem)) !important;
    height: 100dvh !important;
    margin: 0;
    border-radius: 0 var(--lx-corner-radius) var(--lx-corner-radius) 0;
    z-index: 1050;
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
