/**
 * Frontend logging utility
 * Only logs to console in development mode
 * In production, logs are suppressed or sent to monitoring service
 */

const isDev = process.env.NODE_ENV === 'development'
const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogContext {
  component?: string
  action?: string
  [key: string]: any
}

class Logger {
  private context: string

  constructor(context: string = 'App') {
    this.context = context
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`
    return data ? `${prefix} ${message}` : `${prefix} ${message}`
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') return true

    // In development, log everything
    if (isDev || isDevMode) return true

    // In production, only log errors and warnings
    return level === 'warn'
  }

  info(message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), data || '')
    }
  }

  warn(message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data || '')
    }
  }

  error(message: string, error?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error || '')

      // In production, send to monitoring service (e.g., Sentry)
      if (!isDev && !isDevMode && typeof window !== 'undefined') {
        // TODO: Send to error tracking service
        // Example: Sentry.captureException(error, { extra: { message } })
      }
    }
  }

  debug(message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), data || '')
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`)
  }
}

// Export default logger instance
export const logger = new Logger('VidyaVaani')

// Export Logger class for creating custom loggers
export { Logger }

// Convenience function to create contextual loggers
export function createLogger(context: string): Logger {
  return new Logger(context)
}
