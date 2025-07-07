import axios, {} from 'axios';
// Set the base URL for your video API endpoint.
// When you call `videoAxiosInstance.get(videoID)` it will append the videoID to this base URL.
const baseURL = 'http://localhost:8000/api/videos/'; // Fix: plural videos, not singular
const videoAxiosInstance = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
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
