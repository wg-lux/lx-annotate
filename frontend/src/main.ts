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
import { useReportingFlowStore } from '@/stores/reportingFlowStore'
import { useToastStore } from '@/stores/toastStore'
import { createRuntimeLogger } from '@/utils/runtimeLogger'

const logger = createRuntimeLogger('application')

// 1. Axios / auth plumbing
initHttpKC()

// 2. Create app
const app = createApp(App)

// 3. Pinia FIRST
const pinia = createPinia()
app.use(pinia)

// 4. Global auth bootstrap (THIS WAS MISSING)
const authStore = useAuthKcStore()
const reportingFlowStore = useReportingFlowStore()
void authStore
  .loadBootstrap()
  .finally(() => {
    reportingFlowStore.bindAuthSubject(authStore.user?.sub ?? null)
  })
  .catch((error: unknown) => {
    logger.error('auth-bootstrap.failed', error)
    useToastStore().error({
      text: 'Die Anmeldung konnte nicht geprüft werden. Bitte laden Sie die Seite erneut.'
    })
  })

// 5. Directives & global components
app.directive('can', canKc)
app.component('AuthCheck', AuthCheck)

// 6. Plugins
app.use(router)
app.use(VueVirtualScroller)

// 7. Error handler
app.config.errorHandler = (err) => {
  logger.error('vue-error', err)
}

// 8. Mount
app.mount('#app')
