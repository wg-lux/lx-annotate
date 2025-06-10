import type { AxiosResponse } from 'axios';
export interface ApiClient {
    get<T = any>(url: string): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: any): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: any): Promise<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: any): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string): Promise<AxiosResponse<T>>;
}
export declare function createApiClient(): ApiClient;
export default createApiClient;
