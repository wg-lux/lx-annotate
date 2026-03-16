declare const axiosInstance: import("axios").AxiosInstance;
export declare function r(path: string): string;
export declare function a(path: string): string;
export declare function silentRequestConfig<T extends Record<string, unknown>>(config?: T): T & {
    suppressErrorToast: true;
};
export default axiosInstance;
