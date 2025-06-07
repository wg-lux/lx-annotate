export declare enum ErrorType {
    NETWORK = "NETWORK",
    VALIDATION = "VALIDATION",
    AUTHENTICATION = "AUTHENTICATION",
    AUTHORIZATION = "AUTHORIZATION",
    NOT_FOUND = "NOT_FOUND",
    SERVER = "SERVER",
    CLIENT = "CLIENT",
    UNKNOWN = "UNKNOWN"
}
export interface AppError {
    type: ErrorType;
    message: string;
    code?: string | number;
    details?: Record<string, any>;
    originalError?: Error;
    timestamp: Date;
    userFriendlyMessage?: string;
}
export declare class ErrorHandler {
    static createError(type: ErrorType, message: string, code?: string | number, details?: Record<string, any>, originalError?: Error): AppError;
    static getUserFriendlyMessage(type: ErrorType, originalMessage: string): string;
    static handleApiError(error: any): AppError;
    static handleAsyncError<T>(asyncFn: () => Promise<T>, context?: string): Promise<{
        data?: T;
        error?: AppError;
    }>;
    static showUserError(error: AppError, showToast?: (message: string, type: 'error' | 'warning') => void): void;
}
export declare function createErrorBoundary(): {
    errorCaptured(error: Error, instance: any, info: string): boolean;
};
