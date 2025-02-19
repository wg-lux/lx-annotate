import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import router from '@/router';
import AuthCheck from '@/components/AuthCheck.vue';
import 'vite/modulepreload-polyfill';
/* Ensure assets are loaded correctly from `public/` */
import '@/assets/css/nucleo-icons.css';
import '@/assets/css/nucleo-svg.css';
import '@/assets/css/material-dashboard.min.css';
import axios from 'axios';
import Cookies from 'js-cookie';
const app = createApp(App);
app.component('AuthCheck', AuthCheck);
app.use(createPinia());
app.use(router);
app.mount('#app');
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRFToken'] = Cookies.get('csrftoken');
