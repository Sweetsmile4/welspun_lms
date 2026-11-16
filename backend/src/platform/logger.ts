import pino, { type DestinationStream } from 'pino';
export function createLogger(level = 'info', destination?: DestinationStream) {
  return pino(
    {
      level,
      base: { service: 'welspun-lms' },
      redact: {
        paths: [
          'authorization',
          'cookie',
          'password',
          'token',
          'mongodbUri',
          'sessionToken',
          'csrfToken',
          'sessionTokenHash',
          'csrfBindingHash',
          'MONGOURI',
          '*.sessionToken',
          '*.csrfToken',
          '*.sessionTokenHash',
          '*.csrfBindingHash',
          '*.record.sessionTokenHash',
          '*.record.csrfBindingHash',
          '*.MONGOURI',
        ],
        censor: '[REDACTED]',
      },
    },
    destination,
  );
}
