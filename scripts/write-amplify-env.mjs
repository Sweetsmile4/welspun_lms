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
writeFileSync(
  'frontend/.env.production',
  `LMS_BACKEND_ORIGIN=${value}\nLMS_UI_PREVIEW=false\n`,
);
