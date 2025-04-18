import axios from 'axios';
import keycloak from './keycloak';
import Cookies from 'js-cookie';
// Basis-URL und CSRF-Token konfigurieren
axios.defaults.baseURL = '/api/';
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-CSRFToken'] = Cookies.get('csrftoken');
// Request-Interceptor hinzufügen, um das Keycloak-Token einzufügen
axios.interceptors.request.use((config) => {
    if (keycloak.authenticated && keycloak.token) {
        config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response-Interceptor für den Umgang mit Token-Ablauf
axios.interceptors.response.use((response) => {
    return response;
}, async (error) => {
    if (error.response && error.response.status === 401 && keycloak.authenticated) {
        try {
            // Token aktualisieren versuchen
            await keycloak.updateToken(10);
            // Original-Request mit neuem Token wiederholen
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
            return axios(originalRequest);
        }
        catch (refreshError) {
            // Bei Fehler bei der Token-Aktualisierung neu anmelden
            keycloak.login();
            return Promise.reject(refreshError);
        }
    }
    return Promise.reject(error);
});
export default axios;
