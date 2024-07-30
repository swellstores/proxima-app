import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // adapter: cloudflare({
  //   runtime: {
  //     mode: 'local',
  //     type: 'pages',
  //   },
  // }),
  integrations: [react()],
  devToolbar: {
    enabled: false,
  },
  vite: {
    resolve: {
      extensions: ['.ts', '.tsx', '.json', '.js', '.mjs', '.cjs'],
    },
    define: {
      'process.platform': 'undefined',
    },
    server: {
      sourcemapIgnoreList: false,
      warmup: {
        // Experimenting with warming up transforms
        ssrFiles: ['./src/**/*'],
        clientFiles: [
          './src/components/EasyblocksEditor.tsx',
          './src/swell/**/*',
        ],
      },
    },
  },
});
