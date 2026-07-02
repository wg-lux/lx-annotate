import axiosInstance, { r } from './axiosInstance'
import type { AxiosResponse } from 'axios'

// API Client Interface
export interface ApiClient {
  get<T = any>(url: string): Promise<AxiosResponse<T>>
  post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>>
  put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>>
  patch<T = any>(url: string, data?: any): Promise<AxiosResponse<T>>
  delete<T = any>(url: string): Promise<AxiosResponse<T>>
}

// Implementation of the API Client using the existing axiosInstance
class DefaultApiClient implements ApiClient {
  async get<T = any>(url: string): Promise<AxiosResponse<T>> {
    return axiosInstance.get<T>(r(url))
  }

  async post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return axiosInstance.post<T>(r(url), data)
  }

  async put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return axiosInstance.put<T>(r(url), data)
  }

  async patch<T = any>(url: string, data?: any): Promise<AxiosResponse<T>> {
    return axiosInstance.patch<T>(r(url), data)
  }

  async delete<T = any>(url: string): Promise<AxiosResponse<T>> {
    return axiosInstance.delete<T>(r(url))
  }
}

// Factory function to create an API client instance
export function createApiClient(): ApiClient {
  return new DefaultApiClient()
}

// Default export for convenience
export default createApiClient
