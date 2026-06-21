import 'server-only';

type LogContext = Record<string, unknown>;

export function logInfo(event: string, context: LogContext = {}) {
  writeLog('info', event, context);
}

export function logWarn(event: string, context: LogContext = {}) {
  writeLog('warn', event, context);
}

export function logError(event: string, context: LogContext = {}) {
  writeLog('error', event, context);
}

function writeLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  context: LogContext
) {
  const payload = {
    app: 'gpt-card',
    event,
    level,
    message: event,
    timestamp: new Date().toISOString(),
    ...redact(context)
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}

function redact(context: LogContext) {
  const output: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (/token|secret|password|cookie|code/i.test(key)) {
      output[key] = '[redacted]';
    } else {
      output[key] = value;
    }
  }

  return output;
}
