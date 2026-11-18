import { expect, it, vi } from 'vitest';
import { demoBootstrapEnvelopeSchema } from '@welspun/contracts/demo';
it('handles API Gateway HTTP API payloads without opening a listener or database connection', async () => {
  vi.stubEnv('DEMO_API_ENABLED', 'true');
  vi.stubEnv('LOG_LEVEL', 'silent');
  try {
    const { handler } = await import('../src/lambda.js');
    const event = {
      version: '2.0',
      routeKey: 'GET /api/v1/demo/bootstrap',
      rawPath: '/api/v1/demo/bootstrap',
      rawQueryString: '',
      headers: { host: 'demo.execute-api.example', 'user-agent': 'test' },
      requestContext: {
        accountId: 'synthetic',
        apiId: 'synthetic',
        domainName: 'demo.execute-api.example',
        domainPrefix: 'demo',
        requestId: 'synthetic',
        routeKey: 'GET /api/v1/demo/bootstrap',
        stage: '$default',
        time: '',
        timeEpoch: 0,
        http: {
          method: 'GET',
          path: '/api/v1/demo/bootstrap',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'test',
        },
      },
      isBase64Encoded: false,
    };
    const response = (await handler(event, {})) as {
      statusCode: number;
      body: string;
    };
    expect(response.statusCode).toBe(200);
    expect(
      demoBootstrapEnvelopeSchema.parse(JSON.parse(response.body)).data.mode,
    ).toBe('demo');
  } finally {
    vi.unstubAllEnvs();
  }
});
