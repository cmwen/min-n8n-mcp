import pino from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(level: LogLevel = 'info') {
  return pino({
    level,
    redact: {
      paths: ['token', 'authorization', '*.token', '*.authorization', '*.password', '*.secret'],
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      pid: process.pid,
      hostname: undefined, // Remove hostname for cleaner logs
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
