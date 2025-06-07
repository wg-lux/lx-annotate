import { type Ref } from 'vue';
import { type AppError } from '@/utils/errorHandler';
export interface UseErrorHandlerReturn {
    error: Ref<AppError | null>;
    isError: Ref<boolean>;
    clearError: () => void;
    handleError: (error: any, context?: string) => AppError;
    handleAsyncOperation: <T>(operation: () => Promise<T>, context?: string) => Promise<{
        data?: T;
        error?: AppError;
    }>;
}
export declare function useErrorHandler(): UseErrorHandlerReturn;
