import axios, { type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// This handles requests to the local Django API

// TODO: Use URL from .env file
// const baseURL = `${process.env.VUE_APP_BASE_URL}`;
const baseURL = 'http://127.0.0.1:8000/';

const axiosInstance = axios.create({
  baseURL, // Set automatically the base URL for the requests
  withCredentials: true, // Ensures cookies are sent with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

import type { InternalAxiosRequestConfig } from 'axios';

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const csrftoken = Cookies.get('csrftoken');
  if (csrftoken && config.headers) {
    config.headers['X-CSRFToken'] = csrftoken;
  }
  return config;
});

export default axiosInstance;
