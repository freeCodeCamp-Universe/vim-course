/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// `getViteConfig` loads astro.config.mjs and merges Astro's resolved Vite config —
// the React integration's JSX transform and the tsconfig `@/*` alias included — so
// the React and plain-DOM tests resolve and transform exactly as they did under the
// old vite.config.ts. jsdom stays: Astro only forbids rendering `.astro` components
// in a client environment, and no test renders one (they hold no logic to test).
export default getViteConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
