import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import AuthCheck from './components/AuthCheck.vue';

import './assets/css/nucleo-icons.css';
import './assets/css/nucleo-svg.css';
import './assets/css/material-dashboard.css?v=3.1.0';

const app = createApp(App);
app.component('AuthCheck', AuthCheck)

app.use(createPinia());
app.use(router);

app.mount('#app');
