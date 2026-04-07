import axios, { type AxiosRequestConfig } from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api/media/videos/`
  : '/api/media/videos/'

const videoAxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
  //withCredentials: true,
})

import type { InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'

videoAxiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const csrftoken = Cookies.get('csrftoken')
  if (csrftoken && config.headers) {
    config.headers['X-CSRFToken'] = csrftoken
  }
  return config
})

export default videoAxiosInstance
