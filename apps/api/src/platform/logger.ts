import pino from 'pino';
export function createLogger(level = 'info') {
  return pino({
    level,
    base: { service: 'welspun-lms' },
    redact: {
      paths: ['authorization', 'cookie', 'password', 'token', 'mongodbUri'],
      censor: '[REDACTED]',
    },
  });
}
