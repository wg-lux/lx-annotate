import axios, {} from 'axios';
import Cookies from 'js-cookie';
// This handles requests to the local Django API
const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? 'api/';
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL ?? 'http://127.0.0.1:8000/',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Füge Accept-Header als Standard hinzu
    },
    withCredentials: true, // Wichtig für Cookies/CSRF
});
// Helper zur Erzeugung des vollständigen API-Pfads
export function r(path) {
    return `${API_PREFIX}${path}`;
}
// Helper zur Erzeugung des API-Pfads für PDF-Endpunkte
export function a(path) {
    return r(`pdf/${path}`);
}
// Stelle sicher, dass der CSRF-Token-Interceptor aktiv ist (auskommentiert im Original)
axiosInstance.interceptors.request.use((config) => {
    const csrftoken = Cookies.get('csrftoken');
    if (csrftoken && config.headers) {
        config.headers['X-CSRFToken'] = csrftoken;
    }
    // Logge die Header vor dem Senden (optional, zum Debuggen)
    // console.log('Request Headers:', config.headers);
    return config;
});
export default axiosInstance;
