import { LOG_CONFIG, SERVICES_CONFIG } from '@/config';
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    logLevel;
    logs = [];
    constructor() {
        this.logLevel = this.getLogLevelFromConfig();
    }
    getLogLevelFromConfig() {
        const level = LOG_CONFIG.level.toLowerCase();
        switch (level) {
            case 'debug': return LogLevel.DEBUG;
            case 'info': return LogLevel.INFO;
            case 'warn': return LogLevel.WARN;
            case 'error': return LogLevel.ERROR;
            default: return LogLevel.INFO;
        }
    }
    shouldLog(level) {
        return level >= this.logLevel;
    }
    createLogEntry(level, message, context, error) {
        return {
            level,
            message,
            timestamp: new Date(),
            context,
            error,
        };
    }
    formatLogMessage(entry) {
        const timestamp = entry.timestamp.toISOString();
        const levelName = LogLevel[entry.level];
        let message = `[${timestamp}] ${levelName}: ${entry.message}`;
        if (entry.context) {
            message += ` | Context: ${JSON.stringify(entry.context)}`;
        }
        if (entry.error) {
            message += ` | Error: ${entry.error.message}`;
        }
        return message;
    }
    consoleLog(entry) {
        const message = this.formatLogMessage(entry);
        switch (entry.level) {
            case LogLevel.DEBUG:
                console.debug(message);
                break;
            case LogLevel.INFO:
                console.info(message);
                break;
            case LogLevel.WARN:
                console.warn(message);
                break;
            case LogLevel.ERROR:
                console.error(message, entry.error);
                break;
        }
    }
    async sendToExternalService(entry) {
        // Send to Sentry or other logging service
        if (SERVICES_CONFIG.sentryDsn && entry.level >= LogLevel.ERROR) {
            // Sentry integration would go here
            console.log('Would send to Sentry:', entry);
        }
    }
    debug(message, context) {
        if (!this.shouldLog(LogLevel.DEBUG))
            return;
        const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
        this.logs.push(entry);
        this.consoleLog(entry);
    }
    info(message, context) {
        if (!this.shouldLog(LogLevel.INFO))
            return;
        const entry = this.createLogEntry(LogLevel.INFO, message, context);
        this.logs.push(entry);
        this.consoleLog(entry);
    }
    warn(message, context) {
        if (!this.shouldLog(LogLevel.WARN))
            return;
        const entry = this.createLogEntry(LogLevel.WARN, message, context);
        this.logs.push(entry);
        this.consoleLog(entry);
        this.sendToExternalService(entry);
    }
    error(message, error, context) {
        if (!this.shouldLog(LogLevel.ERROR))
            return;
        const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
        this.logs.push(entry);
        this.consoleLog(entry);
        this.sendToExternalService(entry);
    }
    getLogs() {
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
    }
}
export const logger = new Logger();
