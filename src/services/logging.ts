import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

interface LogData {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, data?: LogData) {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, data || '');
    }
    this.trackEvent('info_log', { message, ...data });
  }

  warn(message: string, data?: LogData) {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, data || '');
    }
    this.trackEvent('warning_log', { message, ...data });
  }

  error(message: string, error: Error, data?: LogData) {
    console.error(`[ERROR] ${message}`, error);
    this.trackEvent('error_log', {
      message,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ...data
    });
  }

  private trackEvent(eventName: string, eventData?: LogData) {
    try {
      logEvent(analytics, eventName, eventData);
    } catch (error) {
      if (this.isDevelopment) {
        console.error('Failed to log analytics event:', error);
      }
    }
  }
}

export const logger = new Logger();

export class ArticleError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'ArticleError';
  }
}

export class CacheError extends Error {
  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = 'CacheError';
  }
}