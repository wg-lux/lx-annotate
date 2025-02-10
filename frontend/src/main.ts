import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from 'src/App.vue';
import router from 'src/router';
import AuthCheck from 'src/components/AuthCheck.vue';
import 'vite/modulepreload-polyfill';
import 'src/static/public/assets/css/nucleo-icons.css';
import 'src/static/public/assets/css/nucleo-svg.css';
import 'src/static/public/assets/css/material-dashboard.css?v=3.1.0';


const app = createApp(App);
app.component('AuthCheck', AuthCheck)

app.use(createPinia());
app.use(router);
app.mount('#app');
