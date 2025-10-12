import pino, { type LoggerOptions as PinoLoggerOptions } from 'pino';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface CreateLoggerOptions {
  destination?: 'stderr';
}

export function createLogger(level: LogLevel = 'info', options: CreateLoggerOptions = {}) {
  const destination =
    options.destination === 'stderr' ? pino.destination({ dest: process.stderr.fd }) : undefined;

  const baseConfig: PinoLoggerOptions = {
    level,
    redact: {
      paths: ['token', 'authorization', '*.token', '*.authorization', '*.password', '*.secret'],
      censor: '[REDACTED]',
    },
    formatters: {
      level: (label: string) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      pid: process.pid,
      hostname: undefined, // Remove hostname for cleaner logs
    },
  };

  if (destination) {
    return pino(baseConfig, destination);
  }

  return pino(baseConfig);
}

export type Logger = ReturnType<typeof createLogger>;
