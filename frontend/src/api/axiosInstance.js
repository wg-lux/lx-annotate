import axios from 'axios';
import Cookies from 'js-cookie';
import camelcaseKeys from 'camelcase-keys';
// This handles requests to the local Django API
const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? 'api/';
const axiosInstance = axios.create({
    // Da die Vue-App als statische Dateien über Django serviert wird,
    // verwenden wir relative URLs (kein baseURL nötig)
    baseURL: '/',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});
// Helper zur Erzeugung des vollständigen API-Pfads
export function r(path) {
    return `${API_PREFIX}${path}`;
}
// Helper zur Erzeugung des API-Pfads für PDF-Endpunkte
export function a(path) {
    return r(`pdf/${path}`);
}
axiosInstance.interceptors.request.use((config) => {
    const csrftoken = Cookies.get('csrftoken');
    if (config.data instanceof FormData) {
        // Let the browser automatically set 'Content-Type: multipart/form-data; boundary=…'
        // Do NOT manually set Content-Type for FormData - the browser handles this correctly
        delete config.headers['Content-Type'];
        // Don't set it back! The browser will add the correct boundary automatically
    }
    if (csrftoken && config.headers) {
        config.headers['X-CSRFToken'] = csrftoken;
    }
    // Log headers for debugging TODO: Remove in production
    console.log('Request Headers:', config.headers);
    return config;
});
// Die Funktion muss exportiert werden, um sie im Test direkt verwenden zu können.
export function localSnakecaseKeys(obj, options = {}) {
    if (Array.isArray(obj)) {
        return obj.map((item) => localSnakecaseKeys(item, options)); // Rekursiver Aufruf für Array-Elemente, snakecaseKeys(item, options) wäre hier falsch, wenn es die Logik von localSnakecaseKeys beibehalten soll.
    }
    else if (obj && typeof obj === 'object' && !(obj instanceof File) && !(obj instanceof Blob)) { // Hinzugefügt: instanceof File/Blob-Prüfung
        return Object.keys(obj).reduce((acc, key) => {
            const newKey = key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`);
            acc[newKey] = options.deep && typeof obj[key] === 'object' ? localSnakecaseKeys(obj[key], options) : obj[key]; // Rekursiver Aufruf für tiefe Objekte
            return acc;
        }, {});
    }
    return obj;
}
// ─── Convert outgoing payload from camelCase → snake_case ───────────
axiosInstance.interceptors.request.use((config) => {
    // Skip snake_case conversion for FormData - it should be passed through as-is
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
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
axiosInstance.interceptors.response.use(r => r, err => {
    console.error("AXIOS ERROR", {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
    });
    return Promise.reject(err);
});
export default axiosInstance;
