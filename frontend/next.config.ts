import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@welspun/contracts'],
  poweredByHeader: false,
  reactStrictMode: true,
};
export default config;
