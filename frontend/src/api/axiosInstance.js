import axios, {} from 'axios';
import Cookies from 'js-cookie';
// TODO: Use URL from .env file
// const baseURL = `${process.env.VUE_APP_BASE_URL}endoreg_db/api/`;
const baseURL = 'http://127.0.0.1:5174/api/';
const axiosInstance = axios.create({
    baseURL, // Set automatically the base URL for the requests
    timeout: 5000, // 5 seconds timeout
    withCredentials: true, // Ensures cookies are sent with requests
    headers: {
        'Content-Type': 'application/json',
    },
});
axiosInstance.interceptors.request.use((config) => {
    const csrftoken = Cookies.get('csrftoken');
    if (csrftoken && config.headers) {
        config.headers['X-CSRFToken'] = csrftoken;
    }
    return config;
});
export default axiosInstance;
