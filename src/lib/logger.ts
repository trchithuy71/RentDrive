type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const getLogLevel = (): number => {
  const level = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
  return logLevels[level] !== undefined ? logLevels[level] : 1;
};

const formatMessage = (level: LogLevel, message: string, context?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  
  if (process.env.NODE_ENV === 'production') {
    return JSON.stringify({
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    });
  } else {
    const contextString = context ? ` | Context: ${JSON.stringify(context)}` : '';
    const colorCode = 
      level === 'error' ? '\x1b[31m' :
      level === 'warn' ? '\x1b[33m' :
      level === 'info' ? '\x1b[36m' : '\x1b[90m';
    const resetCode = '\x1b[0m';
    return `[${timestamp}] ${colorCode}${level.toUpperCase()}${resetCode}: ${message}${contextString}`;
  }
};

export const logger = {
  debug: (message: string, context?: Record<string, any>) => {
    if (getLogLevel() <= logLevels.debug) {
      console.log(formatMessage('debug', message, context));
    }
  },
  info: (message: string, context?: Record<string, any>) => {
    if (getLogLevel() <= logLevels.info) {
      console.log(formatMessage('info', message, context));
    }
  },
  warn: (message: string, context?: Record<string, any>) => {
    if (getLogLevel() <= logLevels.warn) {
      console.warn(formatMessage('warn', message, context));
    }
  },
  error: (message: string, error?: Error | string | any, context?: Record<string, any>) => {
    if (getLogLevel() <= logLevels.error) {
      const errContext = error instanceof Error 
        ? { errorName: error.name, errorMessage: error.message, errorStack: error.stack }
        : { errorDetails: error };
      console.error(formatMessage('error', message, { ...errContext, ...context }));
    }
  },
};
