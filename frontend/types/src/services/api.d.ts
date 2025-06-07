import { type AxiosInstance } from 'axios';
export declare const api: AxiosInstance;
export declare class ApiService {
    private axiosInstance;
    constructor(axiosInstance?: AxiosInstance);
    get<T = any>(url: string, config?: any): Promise<T>;
    post<T = any>(url: string, data?: any): Promise<T>;
    put<T = any>(url: string, data?: any): Promise<T>;
    delete<T = any>(url: string): Promise<T>;
    uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T>;
}
export declare const apiService: ApiService;
