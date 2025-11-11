// frontend/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import AuthCheck from '@/components/AuthCheck.vue'
import 'vite/modulepreload-polyfill'
import '@/assets/css/nucleo-icons.css'
import '@/assets/css/nucleo-svg.css'
import '@/assets/css/material-dashboard.css'
import '@/assets/custom-overrides.css'
import '@/assets/css/icon-fixes.css'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

import { initHttpKC } from '@/utils/http_kc'          // <-- add
import canKc from '@/directives/can_kc'               // <-- add
import { useAuthKcStore } from '@/stores/auth_kc'     // <-- add

const app = createApp(App)

app.component('AuthCheck', AuthCheck)

app.config.errorHandler = (err, vm, info) => {
  console.error('Global error handler:', err, info)
}

app.use(createPinia())
app.use(router)
app.use(VueVirtualScroller)

app.directive('can', canKc)                           // <-- register directive
initHttpKC()                                          // <-- init axios (cookies, 401→login)

app.mount('#app')

// Optional: warm auth context (no-op if backend lacks /auth/context)
const auth = useAuthKcStore()
auth.initOnce().catch(() => {})


