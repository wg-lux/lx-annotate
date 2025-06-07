// src/services/api.ts
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/auth';

// Common base – override with VITE_API_BASE if you proxy in dev
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  timeout: 10000, // 10 Sekunden für API-Calls
  withCredentials: true
});

// 🔧 FIXED: Use Auth Store with correct properties
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    
    // 🔧 DEVELOPMENT MODE: Skip token or use mock token
    if (import.meta.env.NODE_ENV === 'development') {
      console.log('🚀 DEV MODE: Making API request to:', config.url);
      
      if (authStore.isAuthenticated) {
        // In dev mode with auth store authenticated, add a mock token for consistency
        config.headers.Authorization = 'Bearer dev-mock-token';
        console.log('📤 DEV MODE: Added mock token for authenticated user:', authStore.username);
      }
      return config;
    }

    // 🔧 PRODUCTION MODE: In production, we would need to implement token storage
    // For now, we just log the authentication state
    if (authStore.isAuthenticated) {
      console.log('📤 PRODUCTION: API Request for authenticated user:', authStore.username);
      // TODO: In production, you would get the actual Keycloak token here
      // config.headers.Authorization = `Bearer ${actualKeycloakToken}`;
    } else {
      console.log('⚠️ Making unauthenticated request to:', config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('🚨 Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 🔧 FIXED: Response interceptor using Auth Store
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response successful:', response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 🔧 Handle 401 errors using Auth Store
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔄 Received 401 - checking authentication...');
      originalRequest._retry = true;

      const authStore = useAuthStore();

      // 🔧 DEVELOPMENT MODE: Log error but don't try complex refresh
      if (import.meta.env.NODE_ENV === 'development') {
        console.log('🚀 DEV MODE: 401 error - backend might need auth disabled for dev');
        console.log('🚀 DEV MODE: Auth Store state:', {
          isAuthenticated: authStore.isAuthenticated,
          username: authStore.username,
          loading: authStore.isLoading
        });
        return Promise.reject(error);
      }

      // 🔧 PRODUCTION MODE: Try to refresh auth through auth store
      try {
        console.log('🔄 PRODUCTION: Attempting auth refresh...');
        
        // Use auth store's checkAuth to refresh authentication
        await authStore.checkAuth();
        
        if (authStore.isAuthenticated) {
          console.log('✅ Auth refreshed successfully for user:', authStore.username);
          
          // In production, you would get the fresh token here and retry
          // For now, we just retry without token
          return api(originalRequest);
        } else {
          console.log('❌ Auth refresh failed, redirecting to login');
          authStore.login();
          return Promise.reject(error);
        }
      } catch (authError) {
        console.error('🚨 Auth refresh failed:', authError);
        authStore.login();
        return Promise.reject(error);
      }
    }

    // 🔧 Other errors - log but don't auto-redirect to login
    console.error('🚨 API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// API Service class for structured API calls
export class ApiService {
  private axiosInstance: AxiosInstance;

  constructor(axiosInstance: AxiosInstance = api) {
    this.axiosInstance = axiosInstance;
  }

  async get<T = any>(url: string, config?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.post(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.put(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.axiosInstance.delete(url);
    return response.data;
  }

  // File upload method
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          onProgress(Math.round(progress));
        }
      },
    };

    const response: AxiosResponse<T> = await this.axiosInstance.post(url, formData, config);
    return response.data;
  }
}

// Export singleton instance
export const apiService = new ApiService();
