import { demoBootstrap } from './demo/catalog.js';
import { randomUUID } from 'node:crypto';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import {
  foundationQuerySchema,
  requestIdSchema,
  success,
  type ErrorEnvelope,
} from '@welspun/contracts';
import { moduleBoundaries } from './modules/index.js';
import { createIdentityProvider } from './modules/identity/provider.js';
import type { Environment } from './platform/environment.js';
import { createLogger } from './platform/logger.js';
import { HttpError, securityHttpError } from './platform/errors.js';

export function createApp(
  environment: Environment,
  options: {
    readiness?: () => Promise<boolean>;
    logger?: ReturnType<typeof createLogger>;
    isolatedTestRouter?: express.Router;
  } = {},
) {
  if (
    options.isolatedTestRouter &&
    (process.env.NODE_ENV !== 'test' ||
      environment.NODE_ENV !== 'test' ||
      environment.ISOLATED_DEVELOPMENT !== 'true')
  )
    throw new Error('Test routes require an isolated test environment');
  const app = express();
  const logger = options.logger ?? createLogger(environment.LOG_LEVEL);
  const identity = createIdentityProvider(environment);
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use((request, response, next) => {
    const incoming = requestIdSchema.safeParse(request.get('x-request-id'));
    const requestId = incoming.success ? incoming.data : randomUUID();
    response.locals.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    response.setHeader('cache-control', 'no-store');
    const start = performance.now();
    response.on('finish', () =>
      logger.info(
        {
          requestId,
          method: request.method,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - start),
        },
        'request completed',
      ),
    );
    next();
  });
  app.use(helmet());
  // No CORS opt-in: cross-origin access is not enabled. No credential cookies exist yet.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_request, _response, next) =>
        next(new HttpError(429, 'RATE_LIMITED', 'Too many requests')),
    }),
  );
  app.use(express.json({ limit: '16kb', strict: true }));
  const router = express.Router();
  router.get('/health', (_request, response) =>
    response.json(
      success({ status: 'alive', phase: '1A' }, response.locals.requestId),
    ),
  );
  router.get('/ready', async (_request, response) => {
    const ready =
      environment.NODE_ENV !== 'production' &&
      (await (options.readiness?.() ?? Promise.resolve(true)));
    if (!ready)
      throw new HttpError(
        503,
        'NOT_READY',
        'Foundation is not ready for this environment',
      );
    response.json(
      success(
        {
          status: 'ready',
          scope: 'foundation-only',
          database: 'disabled',
          authentication: identity.mode,
          productionReady: false,
        },
        response.locals.requestId,
      ),
    );
  });
  router.get('/foundation', (request, response) => {
    const query = foundationQuerySchema.safeParse(request.query);
    if (!query.success)
      throw new HttpError(
        422,
        'VALIDATION_ERROR',
        'Invalid query parameters',
        query.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      );
    response.json(
      success(
        {
          phase: '1A',
          workflows: 'not-implemented',
          ...(query.data.detail === 'modules'
            ? { modules: moduleBoundaries }
            : {}),
        },
        response.locals.requestId,
      ),
    );
  });
  router.get('/me', async (_request, response) => {
    const principal = await identity.resolveIdentity({});
    if (!principal)
      throw new HttpError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is not configured',
      );
    response.json(success(principal, response.locals.requestId));
  });
  if (environment.DEMO_API_ENABLED === 'true') {
    router.get('/demo/bootstrap', (request, response) => {
      if (Object.keys(request.query).length)
        throw new HttpError(
          422,
          'VALIDATION_ERROR',
          'Demo bootstrap accepts no query parameters',
        );
      response.json(success(demoBootstrap, response.locals.requestId));
    });
  }
  app.use('/api/v1', router);
  if (options.isolatedTestRouter)
    app.use('/api/v1/__test', options.isolatedTestRouter);
  app.use((_request, _response, next) =>
    next(new HttpError(404, 'NOT_FOUND', 'Route not found')),
  );
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _request,
    response,
    _next,
  ) => {
    const bodyError = error as { type?: string };
    const securityError = securityHttpError(error);
    const known =
      error instanceof HttpError
        ? error
        : (securityError ??
          (bodyError?.type === 'entity.parse.failed'
            ? new HttpError(400, 'MALFORMED_JSON', 'Malformed JSON body')
            : bodyError?.type === 'charset.unsupported' ||
                bodyError?.type === 'encoding.unsupported'
              ? new HttpError(
                  415,
                  'UNSUPPORTED_ENCODING',
                  'Request body encoding is not supported',
                )
              : bodyError?.type === 'entity.too.large'
                ? new HttpError(
                    413,
                    'PAYLOAD_TOO_LARGE',
                    'Request body exceeds limit',
                  )
                : new HttpError(
                    500,
                    'INTERNAL_ERROR',
                    'An unexpected error occurred',
                  )));
    if (known.status === 500)
      logger.error(
        { requestId: response.locals.requestId, code: known.code },
        'unhandled request error',
      );
    const envelope: ErrorEnvelope = {
      error: {
        code: known.code,
        message: known.message,
        details: known.details,
      },
      requestId: response.locals.requestId,
    };
    response.status(known.status).json(envelope);
  };
  app.use(errorHandler);
  return app;
}
