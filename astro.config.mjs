import { defineConfig, envField, fontProviders } from 'astro/config';
import react from '@astrojs/react';

// Astro reads the `@/*` alias straight from tsconfig `paths`, and `build.format`
// defaults to `'directory'` (one `learn/<id>/index.html` per lesson), which is the
// output the deleted `emitLessonPages()` plugin produced by hand. Leave both alone.
// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Lato',
      cssVariable: '--font-lato',
      weights: [300, 400, 700],
      styles: ['normal', 'italic'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inconsolata',
      cssVariable: '--font-inconsolata',
      weights: [400, 700],
    },
  ],
  prefetch: {
    defaultStrategy: 'hover',
  },
  vite: {
    plugins: [
      {
        name: 'curriculum-md-reload',
        handleHotUpdate({ file, server }) {
          if (file.includes('/src/curriculum/') && file.endsWith('.md')) {
            server.ws.send({ type: 'full-reload' });
            return [];
          }
        },
      },
    ],
  },
  env: {
    schema: {
      SHOW_UPCOMING_LESSONS: envField.boolean({
        context: 'client',
        access: 'public',
        default: false,
      }),
    },
  },
});
