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
import axios from 'axios';
import Cookies from 'js-cookie';
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
const app = createApp(App);
app.component('AuthCheck', AuthCheck);
app.config.errorHandler = (err, vm, info) => {
    console.error('Global error handler:', err, info);
    // Optionally, send the error details to an external logging service (e.g., Sentry)
};
app.use(createPinia());
app.use(router);
app.use(VueVirtualScroller);
app.mount('#app');
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRFToken'] = Cookies.get('csrftoken');
