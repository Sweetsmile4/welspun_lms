import { expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
it('writes only approved runtime settings with real newlines and rejects unsafe origins', () => {
  const directory = mkdtempSync(join(tmpdir(), 'welspun-amplify-env-'));
  try {
    mkdirSync(join(directory, 'frontend'));
    const script = resolve('scripts/write-amplify-env.mjs');
    execFileSync(process.execPath, [script], {
      cwd: directory,
      windowsHide: true,
      env: {
        ...process.env,
        LMS_BACKEND_ORIGIN: 'https://api.example',
        PRIVATE_TEST_VALUE: 'must-not-appear',
      },
    });
    expect(
      readFileSync(join(directory, 'frontend/.env.production'), 'utf8'),
    ).toBe('LMS_BACKEND_ORIGIN=https://api.example\nLMS_UI_PREVIEW=false\n');
    expect(() =>
      execFileSync(process.execPath, [script], {
        cwd: directory,
        windowsHide: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          LMS_BACKEND_ORIGIN: 'https://user:secret@api.example',
        },
      }),
    ).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
