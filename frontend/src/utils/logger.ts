export const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

export type LogLevel = keyof typeof logLevels;

export type TimestampFormat = 'off' | 'iso' | 'unix';

export interface ProximaLoggerConfig {
  level?: LogLevel;
  timestamp?: TimestampFormat;
  structured?: boolean;
}

let currentLogLevel: LogLevel = 'warn';
let currentTimestampFormat: TimestampFormat = 'off';
let isStructured = false;

export function configureProximaLogger(config: ProximaLoggerConfig = {}): void {
  if (config.level && logLevels[config.level] !== undefined) {
    currentLogLevel = config.level;
  }
  if (config.timestamp) {
    currentTimestampFormat = config.timestamp;
  }
  if (typeof config.structured === 'boolean') {
    isStructured = config.structured;
  }
}

function getTimestamp(): string | number | undefined {
  if (currentTimestampFormat === 'iso') {
    return new Date().toISOString();
  }
  if (currentTimestampFormat === 'unix') {
    return Date.now();
  }
  return undefined;
}

function formatArgs(args: any[]): any[] {
  const timestamp = getTimestamp();

  if (!isStructured) {
    return timestamp !== undefined ? [...args, `(${timestamp})`] : args;
  }

  let message = '';
  let context: Record<string, any> = {};
  const messageParts: any[] = [];

  for (const arg of args) {
    if (arg instanceof Error) {
      context.error = {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    } else if (
      typeof arg === 'object' &&
      arg !== null &&
      !Array.isArray(arg) &&
      Object.getPrototypeOf(arg) === Object.prototype
    ) {
      Object.assign(context, arg);
    } else {
      messageParts.push(arg);
    }
  }

  message = messageParts
    .map((part) => (typeof part === 'object' ? JSON.stringify(part) : part))
    .join(' ');

  const finalLogObject = {
    message,
    ...context,
    ...(timestamp && { timestamp }),
  };

  return [finalLogObject];
}

export const logger = {
  error: (...args: any[]): void => {
    console.error(...formatArgs(args));
  },
  warn: (...args: any[]): void => {
    if (logLevels[currentLogLevel] >= logLevels.warn) {
      console.warn(...formatArgs(args));
    }
  },
  info: (...args: any[]): void => {
    if (logLevels[currentLogLevel] >= logLevels.info) {
      console.info(...formatArgs(args));
    }
  },
  debug: (...args: any[]): void => {
    if (logLevels[currentLogLevel] >= logLevels.debug) {
      console.debug(...formatArgs(args));
    }
  },
};

export function createTraceId(data?: string): string {
  if (data === undefined) {
    return Math.random().toString(36).substring(2, 10);
  }

  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) + hash + char;
  }
  return (hash >>> 0).toString(16);
}

// Initialize logger from environment variables
export function initializeLoggerFromEnv(env: { LOG_LEVEL?: string; STRUCTURED_LOGS?: string }): void {
  const config: ProximaLoggerConfig = {};
  
  if (env.LOG_LEVEL) {
    config.level = env.LOG_LEVEL as LogLevel;
  }
  if (env.STRUCTURED_LOGS) {
    config.structured = env.STRUCTURED_LOGS === 'true';
  }
  
  if (Object.keys(config).length > 0) {
    configureProximaLogger(config);
  }
}