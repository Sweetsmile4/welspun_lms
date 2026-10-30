// Owned test process only: prove the runtime flag is absent without editing the user's .env.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
const web = fileURLToPath(new URL('../apps/web/', import.meta.url));
const require = createRequire(
  new URL('../apps/web/package.json', import.meta.url),
);
const next = require('next');
const port = Number(process.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid guard port');
const app = next({ dev: false, dir: web, hostname: '127.0.0.1', port });
await app.prepare();
if (process.argv.includes('--unset')) delete process.env.LMS_UI_PREVIEW;
else process.env.LMS_UI_PREVIEW = 'false';
createServer(app.getRequestHandler()).listen(port, '127.0.0.1');
