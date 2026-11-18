import { writeFileSync } from 'node:fs';
// Explicit allowlist: never copy AWS credentials or the entire build environment.
const value = process.env.LMS_BACKEND_ORIGIN;
if (!value)
  throw new Error(
    'Set LMS_BACKEND_ORIGIN to the deployed API Gateway HTTPS origin',
  );
const url = new URL(value);
if (
  url.protocol !== 'https:' ||
  value !== url.origin ||
  url.username ||
  url.password
)
  throw new Error('LMS_BACKEND_ORIGIN must be an exact HTTPS origin');
const live = process.env.LMS_LIVE_ENABLED === 'true';
const frontendOrigin = process.env.LMS_FRONTEND_ORIGIN;
if (
  live &&
  (!frontendOrigin ||
    new URL(frontendOrigin).origin !== frontendOrigin ||
    !frontendOrigin.startsWith('https://'))
)
  throw new Error(
    'Live deployment requires the exact HTTPS LMS_FRONTEND_ORIGIN',
  );
writeFileSync(
  'frontend/.env.production',
  `LMS_BACKEND_ORIGIN=${value}\nLMS_UI_PREVIEW=false\n${live ? `LMS_LIVE_ENABLED=true\nLMS_FRONTEND_ORIGIN=${frontendOrigin}\n` : ''}`,
);
