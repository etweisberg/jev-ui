import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// The package's exports point at dist, which is what consumers need. Locally we want the
// dev server to read the source so edits show up without a rebuild.
const LIB = resolve(process.cwd(), '../../packages/jev-ui/src');

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
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      'jev-ui/server': `${LIB}/server.ts`,
      'jev-ui/action': `${LIB}/action.ts`,
      'jev-ui': `${LIB}/index.ts`,
    };
    webpackConfig.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return webpackConfig;
  },
};

export default config;
