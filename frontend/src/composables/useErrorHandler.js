import { ref } from 'vue';
import { ErrorHandler, ErrorType } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';
export function useErrorHandler() {
    const error = ref(null);
    const isError = ref(false);
    const clearError = () => {
        error.value = null;
        isError.value = false;
    };
    const handleError = (err, context) => {
        const appError = ErrorHandler.handleApiError(err);
        error.value = appError;
        isError.value = true;
        if (context) {
            logger.error(`Error in ${context}`, err, { appError });
        }
        return appError;
    };
    const handleAsyncOperation = async (operation, context) => {
        try {
            clearError();
            const data = await operation();
            return { data };
        }
        catch (err) {
            const appError = handleError(err, context);
            return { error: appError };
        }
    };
    return {
        error,
        isError,
        clearError,
        handleError,
        handleAsyncOperation,
    };
}
