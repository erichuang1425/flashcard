import { analytics } from './firebase';
import { logEvent } from 'firebase/analytics';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, {
      ...context,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.isDevelopment) {
      const logFn = level === 'error' ? console.error : 
                    level === 'warn' ? console.warn : 
                    console.log;
      
      logFn(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, context || '');
    }

    if (level === 'error') {
      logEvent(analytics, 'error', {
        error_message: message,
        error_context: JSON.stringify(context),
        timestamp: entry.timestamp
      });
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