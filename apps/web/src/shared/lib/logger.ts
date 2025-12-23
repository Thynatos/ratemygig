type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
    [key: string]: unknown
}

interface LogEntry {
    level: LogLevel
    message: string
    timestamp: string
    context?: LogContext
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
}

// Minimum log level (can be configured via env)
const MIN_LOG_LEVEL: LogLevel = import.meta.env.DEV ? 'debug' : 'info'

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL]
}

function formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, context } = entry
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

function createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
        level,
        message,
        timestamp: new Date().toISOString(),
        context,
    }
}

function log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) return

    const entry = createLogEntry(level, message, context)
    const formatted = formatLogEntry(entry)

    switch (level) {
        case 'debug':
            console.debug(formatted)
            break
        case 'info':
            console.info(formatted)
            break
        case 'warn':
            console.warn(formatted)
            break
        case 'error':
            console.error(formatted)
            break
    }

    // In production, could send to external service
    // if (import.meta.env.PROD && level === 'error') {
    //   sendToMonitoringService(entry)
    // }
}

export const logger = {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),

    // Helper for logging errors with stack trace
    exception: (error: Error, context?: LogContext) => {
        log('error', error.message, {
            ...context,
            stack: error.stack,
            name: error.name,
        })
    },
}
