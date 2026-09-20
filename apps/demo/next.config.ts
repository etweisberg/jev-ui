import type { NextConfig } from 'next';

const config: NextConfig = {
  // The library ships TypeScript source; Next compiles it with the app.
  transpilePackages: ['jev-ui'],
  // Strict Mode double-invokes effects in development, which would double every
  // judgment and make the Inspector's request count a lie. The batching behaviour
  // this demo exists to show is only legible with it off.
  reactStrictMode: false,
  webpack: (webpackConfig) => {
    // jev-ui's imports carry .js specifiers, which is what Node ESM requires of
    // published output. A bundler consuming the TypeScript source needs to be told
    // that ./Branch.js means ./Branch.tsx.
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return webpackConfig;
  },
};

export default config;
