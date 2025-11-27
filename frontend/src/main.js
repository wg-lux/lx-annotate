// frontend/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import router from '@/router';
import AuthCheck from '@/components/AuthCheck.vue';
import 'vite/modulepreload-polyfill';
import '@/assets/css/nucleo-icons.css';
import '@/assets/css/nucleo-svg.css';
import '@/assets/css/material-dashboard.css';
import '@/assets/custom-overrides.css';
import '@/assets/css/icon-fixes.css';
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
// ✅ Make sure this path matches your file location:
//   - If you followed my earlier suggestion, the file is `src/lib/http_kc.ts` and the export is `installAxiosAuth`.
//   - If your project has it in `src/utils/http_kc.ts` and exports `initHttpKC`, keep that.
import { initHttpKC } from '@/utils/http_kc'; // or: import { installAxiosAuth as initHttpKC } from '@/lib/http_kc'
import canKc from '@/directives/can_kc';
// 🔑 Initialize axios (cookies + CSRF + 401→/oidc/authenticate) BEFORE app creation
initHttpKC();
const app = createApp(App);
app.directive('can', canKc);
// Optional: you already register AuthCheck locally in App.vue —
// pick ONE style (global here or local in App.vue). Global is fine:
app.component('AuthCheck', AuthCheck);
app.config.errorHandler = (err, _vm, info) => {
    console.error('Global error handler:', err, info);
};
app.use(createPinia());
app.use(router);
app.use(VueVirtualScroller);
// v-can directive (reads Pinia store capabilities)
app.directive('can', canKc);
app.mount('#app');
