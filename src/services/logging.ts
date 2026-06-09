type LogContext = Record<string, unknown>;

class Logger {
  info(message: string, context?: LogContext): void {
    console.info(`[INFO] ${message}`, context ?? {});
  }

  warn(message: string, contextOrError?: LogContext | Error): void {
    console.warn(`[WARN] ${message}`, contextOrError ?? {});
  }

  error(message: string, error: Error, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error, context ?? {});
  }
}

class ContextualError extends Error {
  constructor(
    name: string,
    message: string,
    public readonly context?: LogContext
  ) {
    super(message);
    this.name = name;
  }
}

export class ArticleError extends ContextualError {
  constructor(message: string, context?: LogContext) {
    super('ArticleError', message, context);
  }
}

export class CacheError extends ContextualError {
  constructor(message: string, context?: LogContext) {
    super('CacheError', message, context);
  }
}

export const logger = new Logger();
