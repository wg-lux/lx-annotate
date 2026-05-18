declare const axiosInstance: import("axios").AxiosInstance;
export declare function endoregApi(path: string): string;
export declare function dtypesApi(path: string): string;
export declare function r(path: string): string;
export declare function a(path: string): string;
export declare function silentRequestConfig<T extends AxiosRequestConfig = AxiosRequestConfig>(config?: T): T & {
    suppressErrorToast: true;
};
import type { AxiosRequestConfig } from 'axios';
export default axiosInstance;
