import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'curriculum-data',
      handleHotUpdate({ file, server }) {
        if (file.includes('/src/curriculum/') && file.endsWith('.md')) {
          spawnSync(
            'node',
            [
              '--import',
              'tsx/esm',
              '--import',
              './scripts/prebuild-register.ts',
              'scripts/build-lesson-data.ts',
            ],
            { stdio: 'inherit' }
          );
          server.ws.send({ type: 'full-reload' });
          return [];
        }
      },
    },
  ],
  envPrefix: ['VITE_', 'SHOW_'],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
