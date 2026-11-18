import { resolve } from 'node:path';
import type { NextConfig } from 'next';
const config: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, '..'),
  transpilePackages: ['@welspun/contracts'],
  poweredByHeader: false,
  reactStrictMode: true,
};
export default config;
