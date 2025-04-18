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
import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { initKeycloak, setupTokenRefresh } from '@/services/keycloak';
import '@/services/axios-config';
// Keycloak initialisieren und dann App erstellen
initKeycloak(function () {
    var app = createApp(App);
    app.component('AuthCheck', AuthCheck);
    app.config.errorHandler = function (err, vm, info) {
        console.error("Global error handler:", err, info);
        // Optionally, send the error details to an external logging service (e.g., Sentry)
    };
    app.use(createPinia());
    app.use(router);
    app.use(VueVirtualScroller);
    app.mount('#app');
    // Token-Aktualisierung einrichten
    setupTokenRefresh();
});
