export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Date;
    context?: Record<string, any>;
    error?: Error;
}
declare class Logger {
    private logLevel;
    private logs;
    constructor();
    private getLogLevelFromConfig;
    private shouldLog;
    private createLogEntry;
    private formatLogMessage;
    private consoleLog;
    private sendToExternalService;
    debug(message: string, context?: Record<string, any>): void;
    info(message: string, context?: Record<string, any>): void;
    warn(message: string, context?: Record<string, any>): void;
    error(message: string, error?: Error, context?: Record<string, any>): void;
    getLogs(): LogEntry[];
    clearLogs(): void;
}
export declare const logger: Logger;
export {};
