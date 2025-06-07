import { LOG_CONFIG, SERVICES_CONFIG } from '@/config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];

  constructor() {
    this.logLevel = this.getLogLevelFromConfig();
  }

  private getLogLevelFromConfig(): LogLevel {
    const level = LOG_CONFIG.level.toLowerCase();
    switch (level) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
    };
  }

  private formatLogMessage(entry: LogEntry): string {
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

  private consoleLog(entry: LogEntry) {
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

  private async sendToExternalService(entry: LogEntry) {
    // Send to Sentry or other logging service
    if (SERVICES_CONFIG.sentryDsn && entry.level >= LogLevel.ERROR) {
      // Sentry integration would go here
      console.log('Would send to Sentry:', entry);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    this.logs.push(entry);
    this.consoleLog(entry);
  }

  info(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    this.logs.push(entry);
    this.consoleLog(entry);
  }

  warn(message: string, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    this.logs.push(entry);
    this.consoleLog(entry);
    this.sendToExternalService(entry);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    this.logs.push(entry);
    this.consoleLog(entry);
    this.sendToExternalService(entry);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();