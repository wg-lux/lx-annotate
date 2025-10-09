<template>
  <nav class="navbar navbar-main navbar-expand-lg px-0 mx-4 shadow-none border-radius-xl position-sticky top-1" id="navbarBlur" navbar-scroll="true">
    <div class="container-fluid py-1 px-3">
      <!-- Mobile sidebar toggle button -->
      <button 
        class="navbar-toggler d-lg-none" 
        type="button" 
        @click="toggleSidebar"
        aria-controls="sidebar"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon">
          <span class="navbar-toggler-bar"></span>
          <span class="navbar-toggler-bar"></span>
          <span class="navbar-toggler-bar"></span>
        </span>
      </button>
      
      <div class="collapse navbar-collapse mt-sm-0 mt-2 me-md-0 me-sm-4" id="navbar">
        <div class="ms-md-auto pe-md-3 d-flex align-items-center">
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
        </div>
        <ul class="navbar-nav justify-content-end">
          <li class="nav-item d-flex align-items-center">
            <router-link 
              to="/annotationen" 
              class="btn btn-outline-primary btn-sm mb-0 me-3"
              :class="{ 'btn-warning': totalPendingAnnotations > 0 }"
            >
              <i class="fas fa-tasks me-1"></i>
              Annotationen
              <span 
                v-if="totalPendingAnnotations > 0" 
                class="badge bg-danger ms-1"
                :title="`${totalPendingAnnotations} ausstehende Annotationen`"
              >
                {{ totalPendingAnnotations }}
              </span>
              <span 
                v-else-if="annotationStatsStore.isLoading"
                class="spinner-border spinner-border-sm ms-1"
                role="status"
              >
                <span class="visually-hidden">Laden...</span>
              </span>
            </router-link>
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

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAnnotationStatsStore } from '@/stores/annotationStats';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const annotationStatsStore = useAnnotationStatsStore();

// Computed properties
const isAuthenticated = computed(() => authStore.isAuthenticated);

const username = computed(() => authStore.user?.username || 'Unknown');

const currentRouteName = computed(() => {
  const name = route.name as string;
  return !name ? 'Dashboard' : name.charAt(0).toUpperCase() + name.slice(1);
});

const totalPendingAnnotations = computed(() => {
  return annotationStatsStore.stats.totalPending;
});

// Methods
const handleLogin = () => {
  authStore.login();
};

const handleLogout = () => {
  authStore.logout();
};

const toggleSidebar = () => {
  // Dispatch custom event to toggle sidebar
  const event = new CustomEvent('toggleSidebar');
  document.dispatchEvent(event);
};

// Load annotation stats on mount and refresh periodically
onMounted(async () => {
  await annotationStatsStore.fetchAnnotationStats();
  
  // Auto-refresh every 5 minutes
  setInterval(async () => {
    if (annotationStatsStore.needsRefresh) {
      await annotationStatsStore.refreshIfNeeded();
    }
  }, 5 * 60 * 1000);
});
</script>

<style scoped>
.breadcrumb-item + .breadcrumb-item::before {
  content: ">";
}

.breadcrumb-item.active {
  font-weight: 600;
}

.btn-warning {
  animation: pulse-warning 2s infinite;
}

@keyframes pulse-warning {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(255, 193, 7, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
  }
}

.badge {
  font-size: 0.7rem;
  padding: 0.25em 0.4em;
}

.spinner-border-sm {
  width: 0.875rem;
  height: 0.875rem;
}

.nav-link {
  transition: color 0.15s ease-in-out;
}

.nav-link:hover {
  color: #495057 !important;
}

.btn {
  transition: all 0.15s ease-in-out;
}

.btn:hover {
  transform: translateY(-1px);
}

/* Mobile sidebar toggle button */
.navbar-toggler {
  border: none;
  padding: 0.25rem 0.5rem;
  background: transparent;
  margin-right: 1rem;
}

.navbar-toggler:focus {
  box-shadow: none;
}

.navbar-toggler-icon {
  background-image: none;
  display: inline-block;
  width: 1.5em;
  height: 1.5em;
}

.navbar-toggler-bar {
  display: block;
  width: 22px;
  height: 2px;
  background-color: #2d3047;
  border-radius: 1px;
  margin: 4px 0;
  transition: all 0.2s;
}

.navbar-toggler:hover .navbar-toggler-bar {
  background-color: #596CFF;
}

@media (min-width: 1200px) {
  .navbar-toggler {
    display: none !important;
  }
}
</style>