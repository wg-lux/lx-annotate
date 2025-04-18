import axios from 'axios';
// Set the base URL for your video API endpoint.
// When you call `videoAxiosInstance.get(videoID)` it will append the videoID to this base URL.
var baseURL = 'http://localhost:8000/api/video/';
var videoAxiosInstance = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    //withCredentials: true,
});
export default videoAxiosInstance;
