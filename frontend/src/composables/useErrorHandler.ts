import { ref, type Ref } from 'vue'
import { ErrorHandler, type AppError, ErrorType } from '@/utils/errorHandler'
import { logger } from '@/utils/logger'

export interface UseErrorHandlerReturn {
  error: Ref<AppError | null>
  isError: Ref<boolean>
  clearError: () => void
  handleError: (error: any, context?: string) => AppError
  handleAsyncOperation: <T>(
    operation: () => Promise<T>,
    context?: string
  ) => Promise<{ data?: T; error?: AppError }>
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const error = ref<AppError | null>(null)
  const isError = ref(false)

  const clearError = () => {
    error.value = null
    isError.value = false
  }

  const handleError = (err: any, context?: string): AppError => {
    const appError = ErrorHandler.handleApiError(err)
    error.value = appError
    isError.value = true

    if (context) {
      logger.error(`Error in ${context}`, err, { appError })
    }

    return appError
  }

  const handleAsyncOperation = async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<{ data?: T; error?: AppError }> => {
    try {
      clearError()
      const data = await operation()
      return { data }
    } catch (err) {
      const appError = handleError(err, context)
      return { error: appError }
    }
  }

  return {
    error,
    isError,
    clearError,
    handleError,
    handleAsyncOperation
  }
}
