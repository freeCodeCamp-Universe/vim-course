# SPA migration: drop Astro, move to Vite + React Router

**Date:** 2026-09-02
**Status:** Phase 3 complete — Phase 4 in progress

## Phase progress

| Phase | Status | Notes |
|---|---|---|
| 1: Prebuild script | ✅ Done | `scripts/build-lesson-data.ts`, `public/data/` |
| 2: Vite config + `index.html` | ✅ Done | See notes below |
| 3: React Router + App shell | ✅ Done | See notes below |
| 4: Config/dep cleanup | ✅ Done | `src/env.d.ts` deleted; types moved to `tsconfig.json` |
| 5: Remove page loader | ✅ Done | `data-home-page` removed from `Home.tsx`; `data-page-loader` was never added; `data-lesson-page` kept (layout, not loader) |
| 6: Simplify state | ⬜ Optional | |

### Phase 2 implementation notes

**Files created:** `index.html`, `vite.config.ts`, `src/main.tsx` (placeholder)

**Files modified:** `tsconfig.json`, `vitest.config.ts`, `src/env.d.ts`, `package.json`,
`eslint.config.js`, `prettier.config.mjs`, `scripts/prebuild-hooks.mjs`,
`src/curriculum/loader.ts`

**Files deleted:** `astro.config.mjs`

**`src/curriculum/loader.ts` change (moved from Phase 3 to Phase 2):**
Line 2 changed from `import { SHOW_UPCOMING_LESSONS } from 'astro:env/client'` to
`const SHOW_UPCOMING_LESSONS = import.meta.env.VITE_SHOW_UPCOMING_LESSONS === 'true'`.
The prebuild hooks were updated to patch `import.meta.env` → `process.env` in addition
to the existing `import.meta.glob` → `{}` patch.

**`dev` script:** `pnpm build-lesson-data && vite` — populates `public/data/` before
the dev server starts. Vite serves those files statically. The `curriculum-data` Vite
plugin triggers a full-reload on `.md` changes and re-runs the prebuild script.

**Known issues carried into Phase 3:**
- `src/views/LessonWorkspace.tsx` still imports `navigate` from `astro:transitions/client`.
  Causes a typecheck error and a test failure in `LessonWorkspace.test.tsx`. Fixed in Phase 3.
- `pnpm build` fails at `tsc --noEmit` due to the above. Use `npx vite build` to verify
  the Vite output until Phase 3 is complete.

**Env var rename:** `SHOW_UPCOMING_LESSONS` (Astro env schema) →
`VITE_SHOW_UPCOMING_LESSONS` (Vite convention). Update any `.env` files accordingly.
The `loader.test.ts > loadCurriculum > should load the authored vim-course lessons and modules in order`
test may fail if the `.env` file uses the old name.

## Why

The app uses Astro's MPA routing with `<ClientRouter />`, but every page's main
content is a `client:only="react"` island. There is no server-rendered content.
Each navigation fetches a 25-42 KB HTML shell, tears down the entire React tree,
and rebuilds it from scratch. The result: a 2-3 second frozen page on every
click, followed by a spinner, followed by the content. The `<ClientRouter />`
has no loading indicator during the HTML fetch, and nothing hooks into the
`astro:before-preparation` event to show one.

Astro pays off when most of the page is static HTML and islands are small. Here,
every page IS the island. The curriculum tree is cached in a module-level
singleton (`src/curriculum/useCurriculumTree.ts`) and progress is re-read from
`localStorage` on every mount, both working around the fact that React state
dies on every navigation.

Everything Astro provides in this project can be replaced by Vite directly:

| Astro feature used | Vite equivalent |
|---|---|
| Page routing + `getStaticPaths` | React Router |
| `<ClientRouter />` + `navigate()` | React Router `useNavigate()` |
| `<Font>` component | Two `<link>` tags in `index.html` |
| `astro:env/client` (`SHOW_UPCOMING_LESSONS`) | `import.meta.env.VITE_SHOW_UPCOMING_LESSONS` |
| `import.meta.glob` (curriculum md loading) | Same API, it is Vite's feature |
| `getViteConfig()` for vitest | Direct `vitest.config.ts` with `@vitejs/plugin-react` |
| `astro check` | `tsc --noEmit` |
| `astro build` | `vite build` |
| `astro dev` | `vite dev` |

Removing Astro eliminates a framework abstraction layer, simplifies the build
pipeline, and removes 6 dependencies (`astro`, `@astrojs/react`,
`@astrojs/check`, `eslint-plugin-astro`, `prettier-plugin-astro`, and the
generated `.astro/` type directory).

## What stays the same

Almost everything. The migration changes routing, data loading, and the build
config:

- All React components (`Home.tsx`, `LessonPage.tsx`, `LessonWorkspace.tsx`, etc.)
- All CSS modules
- All hooks (`useLesson`, `useProgress`, `useCourseShortcuts`, etc.)
- The terminal engine, checklist validation, curriculum loader
- All tests (with minor import changes for `navigate`)
- `renderMarkdown.ts` and `extractHeadings.ts` (move from Astro build-time to
  a prebuild script, same code)
- `renderInline.tsx` (client-side, no `marked` dependency, unchanged)

## Current architecture

### Pages (Astro routing)

```
src/pages/
  index.astro              → Home (CourseLayout + <Home client:only>)
  HomePage.module.css
  learn/
    index.astro            → 301 redirect to /
    [lessonId].astro       → Lesson (CourseLayout + <LessonPage client:only>)
  data/
    curriculum-tree.json.ts → Static JSON endpoint
```

### Layout shell (`src/layouts/CourseLayout.astro`)

Wraps every page. Provides:
1. `<head>`: fonts, theme script, page loader inline styles, `<ClientRouter />`
2. `<header>`: home link + `<HeaderControls client:only="react" />`
3. `<slot />` for page content
4. `<CourseOverlays client:only="react" />` (nav drawer, shortcuts modal, settings)
5. Page loader `<div data-page-loader>` with spinner SVG

The loader hides when the island stamps its data attribute:

```css
/* CourseLayout.loader.css */
body:has([data-home-page]) [data-page-loader],
body:has([data-lesson-page]) [data-page-loader] { display: none; }
```

### Cross-island state (`src/stores/courseChrome.ts`)

A module-level store with `useSyncExternalStore`, because Astro islands are
separate React roots that cannot share Context. The header, overlay island, and
lesson workspace all import it to coordinate drawer/modal state.

After migration, everything is one React tree. The store still works, but can
become Context later.

### Data flow on the lesson page

`[lessonId].astro` frontmatter computes at build time:
1. `clientLesson` via `toClientLesson(lesson)` — strips raw markdown
2. `instructionsHtml` via `renderMarkdown(lesson.instructions)` — uses `marked`
3. `segmentHtmls` via `renderMarkdown()` per segment
4. `headings` via `extractHeadings()` from raw markdown
5. `nextLessonId` and `isLastLesson` from ordered lesson list

These are serialized as Astro island props (embedded in page HTML as JSON).
`<LessonPage>` receives them and passes through to `<LessonWorkspace>`.

### Navigation

- `<a href>` tags: Home's "Continue" button (`Home.tsx:60`), curriculum tree
  links (`CurriculumTree.tsx:57`)
- `navigate()` from `astro:transitions/client`: lesson completion
  (`LessonWorkspace.tsx:90`), keyboard shortcut nav (`LessonWorkspace.tsx:149`)

Only `LessonWorkspace.tsx` imports `navigate`.

### Build pipeline

```
astro check && astro build && tsx scripts/inject-modulepreload.ts
```

`inject-modulepreload.ts` traces `client:only` island dependencies and injects
`<link rel="modulepreload">` tags into each built HTML file because Astro does
not emit them for `client:only` islands. With an SPA, Vite handles code
splitting and preload hints natively, so this script is no longer needed.

### Astro-specific configuration

**`tsconfig.json`:** Extends `astro/tsconfigs/strict`. Includes `.astro/types.d.ts`.

**`vitest.config.ts`:** Uses `getViteConfig()` from `astro/config` to inherit
Astro's resolved Vite config (React JSX transform, `@/*` alias).

**`eslint.config.mjs`:** Imports `eslint-plugin-astro`, applies
`astroPlugin.configs.recommended`, ignores `.astro/**`.

**`astro.config.mjs`:** Registers `@astrojs/react`, Google Fonts via the
`fonts` config, `prefetch: { defaultStrategy: 'hover' }`, a Vite plugin for
curriculum markdown HMR, and the `SHOW_UPCOMING_LESSONS` env schema.

**`src/env.d.ts`:** References `.astro/types.d.ts` and `astro/client`.

**`src/curriculum/loader.ts`:** Imports `SHOW_UPCOMING_LESSONS` from
`astro:env/client` (line 2). Used at line 65:
`import.meta.env.DEV && SHOW_UPCOMING_LESSONS`.

## Target architecture

### Entry point: `index.html`

A plain HTML file at the repo root (Vite convention). Contains:
- Theme script (same inline `<script>` from `CourseLayout.astro` lines 27-57)
- Reduced-motion script (same, lines 51-57)
- Font preload `<link>` tags (replaces `<Font>` component)
- Favicon link
- `<link rel="preload" href="/data/curriculum-tree.json" as="fetch" crossorigin>`
- `<div id="root"></div>`
- `<script type="module" src="/src/main.tsx"></script>`

### App entry (`src/main.tsx`, new)

```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';
createRoot(document.getElementById('root')!).render(<App />);
```

### App component (`src/App.tsx`, new)

```tsx
<BrowserRouter>
  <CourseLayout>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/learn/:lessonId" element={<LessonRoute />} />
    </Routes>
  </CourseLayout>
</BrowserRouter>
```

### CourseLayout (React version, `src/views/CourseLayout.tsx`, new)

Replaces `CourseLayout.astro`. Contains:
- `<header>` with home link + `<HeaderControls />`
- `{children}` (the routed view)
- `<CourseOverlays />`

No page loader div. Loading states are handled within `<LessonRoute>` via a
spinner component or Suspense boundary.

Stays mounted across navigations, so the header, overlays, and curriculum tree
cache never tear down.

### LessonRoute (`src/views/LessonRoute.tsx`, new)

Reads `lessonId` from the route params, looks up the `dataFile` from the
curriculum tree, fetches `/data/lessons/{dataFile}`, shows a loading spinner
while the fetch runs, then renders `<LessonPage>` with the loaded data.

The `useLessonData` hook (new) fetches and caches lesson JSON:
- Reads `dataFile` for the requested ID from the curriculum tree (via
  `useCurriculumTree`)
- In-memory cache keyed by lesson ID (same pattern as `useCurriculumTree`)
- Returns `{ data, loading, error }`
- Prefetches next lesson's `dataFile` after current lesson loads
- Cache persists for the lifetime of the session (no re-fetch on back-navigation)

### HomePage (`src/views/HomePage.tsx`, new)

Wraps `<Home>` with the page-level markup currently in `index.astro`:
the `<main>`, `<h1>`, and `<footer>`.

### Static lesson data (prebuild script)

A new script `scripts/build-lesson-data.ts` runs before `vite build`. It:
1. Calls `buildCurriculum(markdownByPath)` with a filesystem-built markdown map
2. For each lesson: computes `toClientLesson`, `renderMarkdown`,
   `extractHeadings`, `nextLessonId`, `isLastLesson`
3. Content-hashes each lesson JSON and writes to
   `public/data/lessons/{id}.{hash}.json`
4. Writes `public/data/curriculum-tree.json` with a `dataFile` field on each
   lesson entry pointing to the hashed filename

This script uses the same code paths as the current `.astro` frontmatter. The
`renderMarkdown` and `extractHeadings` functions run at build time, keeping
`marked` out of the client bundle. `marked` moves from `dependencies` to
`devDependencies`.

**Lesson JSON shape** (same props `LessonPage` receives today):

```ts
interface LessonData {
  lesson: ClientLessonDefinition;
  nextLessonId: string | undefined;
  isLastLesson: boolean;
  instructionsHtml: string;
  segmentHtmls: string[] | undefined;
  headings: Heading[];
}
```

**Curriculum tree shape** (extended with `dataFile`):

```ts
interface CurriculumTreeLesson {
  id: string;
  title: string;
  dataFile: string;  // e.g. "6a75e416116f97fc366586b5.a1b2c3d4.json"
}
```

The `dataFile` field is the sole source of truth for lesson data URLs. Client
code never constructs filenames from lesson IDs. To fetch a lesson:

```ts
const lesson = tree.modules.flatMap(m => m.lessons).find(l => l.id === id);
const data = await fetch(`/data/lessons/${lesson.dataFile}`);
```

Lesson JSON files use `Cache-Control: public, max-age=31536000, immutable`
since their content-hash filenames change on every edit. The curriculum tree
itself uses standard HTTP caching (ETag or short max-age) since it changes on
every build and is small (~5 KB).

### Navigation

- `<a href>` tags → React Router `<Link to>` tags
- `navigate()` from `astro:transitions/client` → `useNavigate()` from
  `react-router`
- The `Button` component's `href` prop renders `<Link>` for internal paths
  (those starting with `/`)

### Build pipeline

```
tsx scripts/build-lesson-data.ts && tsc --noEmit && vite build
```

### Dev server: Vite plugin

A Vite plugin serves lesson data on the fly during development, with no separate
process or prebuild step. The plugin:

1. Intercepts requests to `/data/lessons/*.json` and `/data/curriculum-tree.json`
2. Reads curriculum markdown from disk (no `import.meta.glob`, just `fs`)
3. Runs `buildCurriculum`, `renderMarkdown`, `extractHeadings` on the fly
4. Returns the JSON response
5. In dev, `dataFile` values have no hash (just `{id}.json`)

When a curriculum `.md` file changes, the plugin invalidates its cache and
triggers a full page reload (same behavior as the existing `curriculum-md-reload`
Vite plugin, which this replaces).

```ts
// Sketch of the plugin shape in vite.config.ts
{
  name: 'curriculum-data',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/data/curriculum-tree.json') { /* serve tree */ }
      const match = req.url?.match(/^\/data\/lessons\/([a-z0-9]+)\.json$/);
      if (match) { /* serve lesson data for match[1] */ }
      next();
    });
  },
  handleHotUpdate({ file, server }) {
    if (file.includes('/src/curriculum/') && file.endsWith('.md')) {
      // Invalidate cached curriculum, trigger reload
      server.ws.send({ type: 'full-reload' });
      return [];
    }
  }
}
```

This replaces both the Astro data endpoint (`curriculum-tree.json.ts`) and the
`curriculum-md-reload` plugin from `astro.config.mjs`.

### The `SHOW_UPCOMING_LESSONS` env var

**`astro:env/client`** import in `src/curriculum/loader.ts` line 2 changes to:

```ts
const SHOW_UPCOMING_LESSONS = import.meta.env.VITE_SHOW_UPCOMING_LESSONS === 'true';
```

The Astro env schema in `astro.config.mjs` is deleted. The variable is set in
`.env` files as `VITE_SHOW_UPCOMING_LESSONS=true`.

The prebuild script also needs this value to filter visible lessons. It reads
from `process.env.VITE_SHOW_UPCOMING_LESSONS` or the `.env` file (via
`dotenv` or Vite's `loadEnv`).

## Migration steps

### Phase 1: Prebuild script for lesson JSON + curriculum tree

**Create:**
- `scripts/build-lesson-data.ts`

**What it does:**
1. Reads all curriculum markdown files from disk with `fs.readdirSync` +
   `fs.readFileSync`, building the `markdownByPath` map
2. Calls `buildCurriculum(markdownByPath)` (line 118 of `loader.ts` already
   accepts this parameter)
3. For each lesson: computes `toClientLesson`, `renderMarkdown`,
   `extractHeadings`, `nextLessonId`, `isLastLesson`
4. JSON-stringifies each lesson data object, computes a content hash (first 8
   hex chars of SHA-256)
5. Writes to `public/data/lessons/{id}.{hash}.json`
6. Writes `public/data/curriculum-tree.json` with `dataFile` on each lesson entry

The `import.meta.glob` call in `loader.ts` is a Vite feature that only works
inside a Vite context. The prebuild script runs via `tsx`, outside Vite. Since
`buildCurriculum(markdownByPath)` already accepts the map as a parameter, the
script builds the map from disk and passes it in. No refactoring of `loader.ts`
needed.

**Note:** `lessonOrder.ts` calls `loadCurriculum()` at module scope (which uses
`import.meta.glob`), but it is only imported by test files, never by client
code. It continues to work in vitest (which runs in a Vite context).

**Validation:** `pnpm build`, verify JSON files exist in `public/data/lessons/`
with hashed filenames. Verify the curriculum tree's `dataFile` entries match.
Compare a lesson's JSON against the serialized props in the current HTML.

### Phase 2: Vite config + `index.html`

**Create:**
- `index.html` (repo root)
- `vite.config.ts`
- `src/main.tsx`

**Modify:**
- `tsconfig.json` — remove `extends: "astro/tsconfigs/strict"`, set compiler
  options directly. Remove `.astro/types.d.ts` from `include`. Set
  `"moduleResolution": "bundler"`, `"module": "ESNext"`, `"target": "ES2022"`,
  `"lib": ["DOM", "DOM.Iterable", "ES2022"]`, keep the existing strict options.
- `vitest.config.ts` — replace `getViteConfig()` with a plain vitest config
  importing `@vitejs/plugin-react` and defining the `@/*` alias.
- `src/env.d.ts` — remove Astro references, add `/// <reference types="vite/client" />`.
- `package.json` — update scripts, move `marked` and `sanitize-html` to
  devDependencies, remove Astro packages, add `react-router` and
  `@vitejs/plugin-react`.

**Delete:**
- `astro.config.mjs`

**Validation:** `vite dev` starts. `vite build` produces output in `dist/`.

### Phase 3: React Router + App shell

**Create:**
- `src/App.tsx`
- `src/views/CourseLayout.tsx` + `src/views/CourseLayout.module.css`
- `src/views/LessonRoute.tsx`
- `src/views/HomePage.tsx` + `src/views/HomePage.module.css` (absorbs
  `src/pages/HomePage.module.css`)
- `src/hooks/useLessonData.ts`

**Modify:**
- `src/components/base/Button/Button.tsx` — internal `href` renders `<Link>`
- `src/views/LessonWorkspace.tsx` — replace `navigate` import
  (`astro:transitions/client` → `react-router`)
- `src/components/features/CurriculumTree.tsx` — `<a href>` → `<Link to>`
- `src/views/Home.tsx` — "Continue" button `href` → `<Link to>`
- `src/curriculum/loader.ts` — replace `astro:env/client` import with
  `import.meta.env`

**Delete:**
- `src/pages/index.astro`
- `src/pages/HomePage.module.css`
- `src/pages/learn/[lessonId].astro`
- `src/pages/learn/index.astro`
- `src/pages/data/curriculum-tree.json.ts`
- `src/layouts/CourseLayout.astro`
- `src/layouts/CourseLayout.loader.css`
- `scripts/inject-modulepreload.ts`
- `public/_headers`
- `.astro/` (generated directory)

**Validation:** Full navigation flow works: home → lesson → next lesson → home.
`pnpm test` passes. `pnpm build` produces working output.

### Phase 4: Clean up config and dependencies

**Modify:**
- `eslint.config.mjs` — remove `eslint-plugin-astro`, remove `.astro/**` from
  ignores.
- `package.json` — remove `astro`, `@astrojs/react`, `@astrojs/check`,
  `eslint-plugin-astro`, `prettier-plugin-astro` from deps. Move `marked` and
  `sanitize-html` to `devDependencies` (build-only). Add `react-router` to
  `dependencies`, `@vitejs/plugin-react` to `devDependencies`.
- Prettier config — remove `prettier-plugin-astro` if referenced.

**Delete:**
- `src/env.d.ts` if it only contains `/// <reference types="vite/client" />`
  (can be replaced by `tsconfig.json` `types` array).

### Phase 5: Remove page loader artifacts

**Modify or delete:**
- Remove `data-page-loader`, `data-home-page`, `data-lesson-page` attributes
  from components and their CSS rules. Loading states are handled in
  `<LessonRoute>` (a spinner while lesson JSON loads). The home page renders
  synchronously from cached data.
- Remove the inline loader CSS from `index.html` if no longer needed (the
  initial page load shows the React app directly; a brief white flash is
  acceptable, or add a minimal CSS spinner in `index.html` that the React mount
  replaces).

### Phase 6 (optional): Simplify state patterns

- `src/curriculum/useCurriculumTree.ts` — the module-level cache + eager fetch
  can become a Context provider in `<App>`. Or keep it; it works fine.
- `src/stores/courseChrome.ts` — can become Context now that everything is one
  tree. The external store still works.

## SPA concerns and mitigations

### Browser history and deep links

React Router handles both. `/learn/{id}` works as a direct load (the SPA
`index.html` is served for all paths) and as a client-side navigation. For
Cloudflare Pages, a `_redirects` file routes all paths to `index.html`:

```
/*  /index.html  200
```

Cloudflare Pages supports this natively. A `_headers` file sets immutable
caching for hashed assets:

```
/data/lessons/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

(`/assets/` is Vite's default output directory for hashed JS/CSS chunks.)

### Direct-load performance

A user landing directly on `/learn/abc123`:
1. Browser loads `index.html` (~5 KB)
2. Browser loads the JS bundle (code-split by Vite)
3. React mounts, router reads the path, `useCurriculumTree` fetches the tree,
   `useLessonData` looks up the `dataFile`, then fetches the lesson JSON

Step 3 involves two sequential fetches (tree, then lesson). The tree is already
preloaded via `<link rel="preload">` in `index.html`, so it resolves from the
browser cache instantly. The lesson fetch is the real latency.

For subsequent navigations (lesson to lesson), the tree is cached in memory and
the lesson fetch is the only request, often already prefetched.

To further reduce direct-load latency, an inline script in `index.html` can
start the tree fetch early (already done with the preload link) and kick off the
lesson fetch speculatively. But the lesson URL includes a content hash that the
script doesn't know without the tree. Two options:
- Accept the one sequential request (lesson JSON is small, 5-15 KB, and
  subsequent visits are cache hits)
- Start the tree fetch eagerly and have `useLessonData` await it before fetching
  the lesson, so both requests start as early as possible in the React lifecycle

The second option is already the natural flow: `useCurriculumTree` starts its
fetch at module load (before React mounts), and `useLessonData` fires its fetch
the moment the tree resolves. No extra wiring needed.

### SEO

The current pages are not server-rendered (all `client:only`), so there is no
regression. Both versions require JS to render content.

### Bundle size

React Router adds ~15 KB gzipped. Removing Astro's `<ClientRouter />` runtime,
the island bootstrap scripts, and `marked` from the client bundle offsets this.
Net change should be roughly neutral or a small reduction.

## Dependency changes

**Add:**
- `react-router` (dependency)
- `@vitejs/plugin-react` (devDependency)

**Remove:**
- `astro` (dependency)
- `@astrojs/react` (dependency)
- `@astrojs/check` (devDependency)
- `eslint-plugin-astro` (devDependency)
- `prettier-plugin-astro` (devDependency)

**Move to devDependencies:**
- `marked` (build-only after migration)
- `sanitize-html` (build-only, used by `renderMarkdown` and `assertSanitizedHtml`)

## Decisions

- **Router:** React Router (latest version). Two routes, no complex loader
  patterns.
- **Lesson JSON caching:** Content-hash filenames (`{id}.{hash}.json`) with
  immutable cache headers. The curriculum tree maps lesson IDs to hashed
  filenames via the `dataFile` field. Client code never constructs filenames.
- **Dev server:** A Vite plugin serves lesson data on the fly, with no separate
  process. It reads markdown from disk, runs the rendering pipeline, and serves
  JSON. It replaces the `curriculum-md-reload` plugin from `astro.config.mjs`.
