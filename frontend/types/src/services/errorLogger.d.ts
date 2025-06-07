interface ErrorContext {
    [key: string]: any;
    viewport?: string;
    localStorage?: any;
    cookies?: string;
}
declare class ErrorLogger {
    private baseUrl;
    private maxRetries;
    private retryDelay;
    constructor();
    /**
     * Logs error to Django backend with retry mechanism
     */
    logError(error: Error | any, errorType?: string, context?: ErrorContext): Promise<void>;
    /**
     * Spezielle Keycloak-Fehlerbehandlung
     */
    logKeycloakError(error: Error, context?: Record<string, any>): Promise<void>;
    /**
     * Network/API Fehlerbehandlung
     */
    logNetworkError(error: Error, requestUrl: string, statusCode?: number): Promise<void>;
    /**
     * Vue Component Fehlerbehandlung
     */
    logComponentError(error: Error, componentName: string, props?: any): Promise<void>;
    private sendErrorToBackend;
    private getSafeLocalStorageInfo;
    private delay;
}
export declare const errorLogger: ErrorLogger;
export declare const logError: (error: Error, context?: ErrorContext) => Promise<void>;
export declare const logKeycloakError: (error: Error, context?: Record<string, any>) => Promise<void>;
export declare const logNetworkError: (error: Error, requestUrl: string, statusCode?: number) => Promise<void>;
export declare const logComponentError: (error: Error, componentName: string, props?: any) => Promise<void>;
export default errorLogger;
