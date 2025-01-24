<template>
  <nav class="navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl position-sticky top-1" id="navbarBlur" navbar-scroll="true">
    <div class="container-fluid py-1 px-3">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb bg-transparent mb-0 pb-0 pt-1 px-0 me-sm-6 me-5">
          <li class="breadcrumb-item text-sm">
            <a class="opacity-5 text-dark" href="javascript:;">Aktuelle Seite</a>
          </li>
          <li class="breadcrumb-item text-sm text-dark active" aria-current="page">
            {{ currentRouteName }}
          </li>
        </ol>
      </nav>
      
      <div class="collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4" id="navbar">
        <div class="ms-md-auto pe-md-3 d-flex align-items-center">

        </div>
        <ul class="navbar-nav justify-content-end">
          <li class="nav-item d-flex align-items-center">
            <a class="btn btn-outline-primary btn-sm mb-0 me-3" href="javascript:;" id="annotationsButton">
              Annotationen <span class="badge bg-gradient-primary">3</span>
            </a>
          </li>
          <li class="nav-item d-flex align-items-center" v-if="isAuthenticated">
            <a class="nav-link text-body font-weight-bold px-0" href="javascript:;" @click="handleLogout">
              <i class="fa fa-user me-sm-1"></i>
              <span class="d-sm-inline d-none">Logout</span>
            </a>
          </li>
          <li class="nav-item d-flex align-items-center" v-else>
            <a class="nav-link text-body font-weight-bold px-0" href="javascript:;" @click="handleLogin">
              <i class="fa fa-user me-sm-1"></i>
              <span class="d-sm-inline d-none">Login</span>
            </a>
          </li>
          <li class="nav-item d-flex align-items-center ms-3" v-if="isAuthenticated">
            <span class="nav-link text-body font-weight-bold px-0">
              <i class="fa fa-circle text-success me-sm-1"></i>
              <span class="d-sm-inline d-none">{{ username }}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.ts';

export default {
  name: 'NavbarComponent',
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();
    return { authStore, router };
  },
  computed: {
    isAuthenticated() {
      return this.authStore.isAuthenticated;
    },
    username() {
      return this.authStore.user?.name || 'Unbekannt';
    },
    currentRouteName() {
      // Get the current route name and format it for display
      const name = this.$route.name;
      if (!name) return 'Dashboard';
      
      // Convert route name to display format (e.g., 'home' -> 'Home')
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  },
  methods: {
    handleLogin() {
      this.authStore.login();
    },
    handleLogout() {
      this.authStore.logout();
    }
  }
};
</script>

<style scoped>
.breadcrumb-item + .breadcrumb-item::before {
  content: ">";
}

.breadcrumb-item.active {
  font-weight: 600;
}
</style>