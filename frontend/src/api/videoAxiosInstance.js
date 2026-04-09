import axios, {} from 'axios';
import { endpoints } from '@/types/api/endpoints';
const baseURL = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api/${endpoints.media.videos}`
    : `/api/${endpoints.media.videos}`;
const videoAxiosInstance = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
    }
    //withCredentials: true,
});
import Cookies from 'js-cookie';
videoAxiosInstance.interceptors.request.use((config) => {
    const csrftoken = Cookies.get('csrftoken');
    if (csrftoken && config.headers) {
        config.headers['X-CSRFToken'] = csrftoken;
    }
    return config;
});
export default videoAxiosInstance;
