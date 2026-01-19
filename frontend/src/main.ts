import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'


import '@/assets/css/nucleo-icons.css'
import '@/assets/css/nucleo-svg.css'
import '@/assets/css/material-dashboard.css'
import '@/assets/css/icon-fixes.css'
import '@/assets/custom-overrides.css'

import 'vite/modulepreload-polyfill'

import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import AuthCheck from '@/components/Authentification/AuthCheck.vue'
import { initHttpKC } from '@/utils/http_kc'
import canKc from '@/directives/can_kc'
import { useAuthKcStore } from '@/stores/auth_kc'

// 1. Axios / auth plumbing
initHttpKC()

// 2. Create app
const app = createApp(App)

// 3. Pinia FIRST
const pinia = createPinia()
app.use(pinia)

// 4. Global auth bootstrap (THIS WAS MISSING)
const authStore = useAuthKcStore()
authStore.loadBootstrap()

// 5. Directives & global components
app.directive('can', canKc)
app.component('AuthCheck', AuthCheck)

// 6. Plugins
app.use(router)
app.use(VueVirtualScroller)

// 7. Error handler
app.config.errorHandler = (err, _vm, info) => {
  console.error('Global error handler:', err, info)
}

// 8. Mount
app.mount('#app')
