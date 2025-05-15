import axios from 'axios';
import Cookies from 'js-cookie';
import camelcaseKeys from 'camelcase-keys';
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
