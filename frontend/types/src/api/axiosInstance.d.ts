declare const axiosInstance: import("axios").AxiosInstance;
export declare function r(path: string): string;
export declare function a(path: string): string;
export declare function localSnakecaseKeys(obj: any, options?: {
    deep?: boolean;
}): any;
export declare function fetchStats(): Promise<import("axios").AxiosResponse<any, any>>;
export default axiosInstance;
