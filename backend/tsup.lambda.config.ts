import { writeFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: { index: 'src/lambda.ts' },
  format: ['cjs'],
  platform: 'node',
  target: 'node24',
  outDir: 'lambda-dist',
  clean: true,
  onSuccess: async () => {
    await writeFile(
      'lambda-dist/package.json',
      JSON.stringify({ type: 'commonjs' }),
    );
  },
  sourcemap: false,
  noExternal: [/.*/],
  outExtension: () => ({ js: '.js' }),
});
