// frontend/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import router from '@/router';
// CSS Imports
import '@/assets/css/nucleo-icons.css';
import '@/assets/css/nucleo-svg.css';
import '@/assets/css/material-dashboard.css';
import '@/assets/css/icon-fixes.css';
import '@/assets/custom-overrides.css';
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { initHttpKC } from '@/utils/http_kc';
import canKc from '@/directives/can_kc';
// 1. Initialize Auth
initHttpKC();
// 2. Create App
const app = createApp(App);
// 3. Configure App
app.config.errorHandler = (err, _vm, info) => {
    console.error('Global error handler:', err, info);
};
// 4. Use Plugins
app.use(createPinia());
app.use(router);
app.use(VueVirtualScroller);
// 5. Register Directives (Once is enough!)
app.directive('can', canKc);
// 6. Mount
app.mount('#app');
