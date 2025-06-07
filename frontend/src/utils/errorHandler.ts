import { logger } from './logger';

export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN',
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

export class ErrorHandler {
  static createError(
    type: ErrorType,
    message: string,
    code?: string | number,
    details?: Record<string, any>,
    originalError?: Error
  ): AppError {
    return {
      type,
      message,
      code,
      details,
      originalError,
      timestamp: new Date(),
      userFriendlyMessage: this.getUserFriendlyMessage(type, message),
    };
  }

  static getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
      case ErrorType.AUTHENTICATION:
        return 'Anmeldung erforderlich. Bitte melden Sie sich an.';
      case ErrorType.AUTHORIZATION:
        return 'Keine Berechtigung für diese Aktion.';
      case ErrorType.NOT_FOUND:
        return 'Die angeforderte Ressource wurde nicht gefunden.';
      case ErrorType.VALIDATION:
        return 'Eingabedaten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.';
      case ErrorType.SERVER:
        return 'Serverfehler. Bitte versuchen Sie es später erneut.';
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten.';
    }
  }

  static handleApiError(error: any): AppError {
    logger.error('API Error occurred', error);

    if (!error.response) {
      // Network error
      return this.createError(
        ErrorType.NETWORK,
        'Network error occurred',
        'NETWORK_ERROR',
        { originalMessage: error.message },
        error
      );
    }

    const { status, data } = error.response;

    switch (status) {
      case 400:
        return this.createError(
          ErrorType.VALIDATION,
          data.message || 'Validation error',
          status,
          data,
          error
        );
      case 401:
        return this.createError(
          ErrorType.AUTHENTICATION,
          'Authentication required',
          status,
          data,
          error
        );
      case 403:
        return this.createError(
          ErrorType.AUTHORIZATION,
          'Access forbidden',
          status,
          data,
          error
        );
      case 404:
        return this.createError(
          ErrorType.NOT_FOUND,
          'Resource not found',
          status,
          data,
          error
        );
      case 422:
        return this.createError(
          ErrorType.VALIDATION,
          'Validation failed',
          status,
          data,
          error
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return this.createError(
          ErrorType.SERVER,
          'Server error occurred',
          status,
          data,
          error
        );
      default:
        return this.createError(
          ErrorType.UNKNOWN,
          `HTTP ${status} error`,
          status,
          data,
          error
        );
    }
  }

  static handleAsyncError<T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<{ data?: T; error?: AppError }> {
    return asyncFn()
      .then(data => ({ data }))
      .catch(error => {
        const appError = this.handleApiError(error);
        if (context) {
          logger.error(`Error in ${context}`, error, { appError });
        }
        return { error: appError };
      });
  }

  static showUserError(error: AppError, showToast?: (message: string, type: 'error' | 'warning') => void) {
    const message = error.userFriendlyMessage || error.message;
    
    if (showToast) {
      const toastType = error.type === ErrorType.VALIDATION ? 'warning' : 'error';
      showToast(message, toastType);
    } else {
      // Fallback to console or alert
      console.error('User Error:', message);
    }
  }
}

// Error boundary for Vue components
export function createErrorBoundary() {
  return {
    errorCaptured(error: Error, instance: any, info: string) {
      const appError = ErrorHandler.createError(
        ErrorType.CLIENT,
        'Component error occurred',
        undefined,
        { componentInfo: info },
        error
      );
      
      logger.error('Vue component error', error, { 
        component: instance?.$options.name || 'Unknown',
        info 
      });
      
      return false; // Propagate error to parent
    }
  };
}