import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
process.env.DEMO_API_ENABLED = 'true';
process.env.IDENTITY_MODE = 'disabled';
process.env.ISOLATED_DEVELOPMENT = 'false';
process.env.LOG_LEVEL = 'silent';
const require = createRequire(import.meta.url);
const { handler } = require('../backend/lambda-dist/index.js');
const result = await handler(
  {
    version: '2.0',
    routeKey: 'GET /api/v1/demo/bootstrap',
    rawPath: '/api/v1/demo/bootstrap',
    rawQueryString: '',
    headers: { host: 'demo.example' },
    requestContext: {
      http: {
        method: 'GET',
        path: '/api/v1/demo/bootstrap',
        sourceIp: '127.0.0.1',
      },
    },
    isBase64Encoded: false,
  },
  {},
);
assert.equal(result.statusCode, 200);
const { data } = JSON.parse(result.body);
assert.equal(data.mode, 'demo');
assert.equal(data.persistence, 'browser-local');
assert.equal(data.courses.length, 5);
console.log('Built Lambda demo smoke check passed');
