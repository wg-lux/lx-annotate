<template>
  <div class="container-fluid py-4">
    <main class="main-content border-radius-lg">
      <div id="app" class="container-fluid py-4">
        <h1>G-Play-Toolkit</h1>
        <p>
          Hier finden Sie das Annotationstoolkit der Arbeitsgruppe von Dr.
          Thomas Lux am Universitätsklinikum Würzburg. 
        </p>
        <div class="row">
          <div
            v-for="(route, index) in availableRoutes"
            :key="index"
            class="col-md-4 col-sm-6 mb-4"
          >
            <div class="card h-100">
              <div class="card-body d-flex flex-column justify-content-between">
                <h5 class="card-title">{{ route.name }}</h5>
                <p class="card-text">
                  {{ route.description || "Keine Beschreibung verfügbar" }}
                </p>
                <router-link 
                  :to="route.path" 
                  class="btn btn-primary mt-auto"
                >
                  Gehe zu {{ route.name }}
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { computed } from 'vue'

export default {
  name: 'DashboardView',
  setup() {
    const router = useRouter()

    const availableRoutes = computed(() => {
      return router.options.routes.filter(route => {
        // Filter out login route and routes without names
        return route.name && route.name !== 'Login'
      })
    })

    return {
      availableRoutes
    }
  }
}
</script>

<style>
@import url("https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900|Roboto+Slab:400,700");
@import url("../assets/css/material-dashboard.css?v=3.1.0");

.card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}
</style>