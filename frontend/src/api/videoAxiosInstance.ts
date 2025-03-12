import axios, { type AxiosRequestConfig } from 'axios';

// Set the base URL for your video API endpoint.
// When you call `videoAxiosInstance.get(videoID)` it will append the videoID to this base URL.
const baseURL = 'http://localhost:8000/api/video/';

const videoAxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  //withCredentials: true,
});
/*
import type { InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

videoAxiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const csrftoken = Cookies.get('csrftoken');
    if (csrftoken && config.headers) {
      config.headers['X-CSRFToken'] = csrftoken;
    }
    return config;
  });
*/
// This interface describes the expected response from the video endpoint.
export interface VideoResponse {
  video_url: string;
}

export default videoAxiosInstance;
