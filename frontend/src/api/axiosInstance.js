import axios, {} from 'axios';
import Cookies from 'js-cookie';
import camelcaseKeys from 'camelcase-keys';
import snakecaseKeys from 'snakecase-keys';
// This handles requests to the local Django API
const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? '';
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
function localSnakecaseKeys(obj, options = {}) {
    if (Array.isArray(obj)) {
        return obj.map((item) => snakecaseKeys(item, options));
    }
    else if (obj && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const newKey = key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
            acc[newKey] = options.deep && typeof obj[key] === 'object' ? snakecaseKeys(obj[key], options) : obj[key];
            return acc;
        }, {});
    }
    return obj;
}
// ─── Convert outgoing payload from camelCase → snake_case ───────────
axiosInstance.interceptors.request.use((config) => {
    if (config.data && typeof config.data === 'object') {
        config.data = localSnakecaseKeys(config.data, { deep: true });
    }
    return config;
});
// ─── Convert incoming payload from snake_case → camelCase ───────────
axiosInstance.interceptors.response.use((response) => {
    if (response.data && typeof response.data === 'object') {
        response.data = camelcaseKeys(response.data, { deep: true });
    }
    return response;
});
export default axiosInstance;
