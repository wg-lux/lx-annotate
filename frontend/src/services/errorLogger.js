class ErrorLogger {
    baseUrl;
    maxRetries = 3;
    retryDelay = 1000;
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    }
    /**
     * Logs error to Django backend with retry mechanism
     */
    async logError(error, errorType = 'unknown', context) {
        const errorData = {
            message: error instanceof Error ? error.message : String(error.message || error),
            stack: error instanceof Error ? error.stack : String(error.stack || ''),
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            errorType,
            context: {
                ...context,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                localStorage: this.getSafeLocalStorageInfo(),
                cookies: document.cookie ? 'present' : 'none'
            }
        };
        console.error(`🚨 [${errorType.toUpperCase()}] Frontend Error:`, errorData);
        await this.sendErrorToBackend(errorData);
    }
    /**
     * Spezielle Keycloak-Fehlerbehandlung
     */
    async logKeycloakError(error, context) {
        await this.logError(error, 'keycloak', {
            ...context,
            keycloakUrl: window.location.href,
            hasAuthParams: window.location.href.includes('code=') || window.location.href.includes('state='),
            fragment: window.location.hash,
            search: window.location.search
        });
    }
    /**
     * Network/API Fehlerbehandlung
     */
    async logNetworkError(error, requestUrl, statusCode) {
        await this.logError(error, 'network', {
            requestUrl,
            statusCode,
            networkOnline: navigator.onLine
        });
    }
    /**
     * Vue Component Fehlerbehandlung
     */
    async logComponentError(error, componentName, props) {
        await this.logError(error, 'component', {
            componentName,
            props: props ? JSON.stringify(props) : undefined
        });
    }
    async sendErrorToBackend(errorData) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch('/api/log-frontend-error', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(errorData)
                });
                if (response.ok) {
                    console.log(`✅ Error logged to backend on attempt ${attempt}`);
                    return;
                }
                else {
                    throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
                }
            }
            catch (error) {
                console.warn(`⚠️ Failed to log error to backend (attempt ${attempt}/${this.maxRetries}):`, error);
                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }
        console.error('🚨 Failed to log error to backend after all retries');
    }
    getSafeLocalStorageInfo() {
        try {
            return {
                itemCount: localStorage.length,
                hasAuthData: localStorage.getItem('auth') ? 'present' : 'none'
            };
        }
        catch {
            return { error: 'localStorage not accessible' };
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
// Singleton instance
export const errorLogger = new ErrorLogger();
// Convenience functions
export const logError = (error, context) => errorLogger.logError(error, 'unknown', context);
export const logKeycloakError = (error, context) => errorLogger.logKeycloakError(error, context);
export const logNetworkError = (error, requestUrl, statusCode) => errorLogger.logNetworkError(error, requestUrl, statusCode);
export const logComponentError = (error, componentName, props) => errorLogger.logComponentError(error, componentName, props);
// Global error handlers
if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
        errorLogger.logError(event.error || new Error(event.message), 'unknown', {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    });
    window.addEventListener('unhandledrejection', (event) => {
        errorLogger.logError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), 'unknown', { type: 'unhandledPromiseRejection' });
    });
}
export default errorLogger;
