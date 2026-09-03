# Build Process

The production build (`pnpm build`) runs four steps in sequence. Each step
has its own script so it can be run independently during development.

## Steps

### 1. Build lesson data: `pnpm build:lesson-data`

Runs `scripts/build-lesson-data.ts` with `NODE_ENV=production`. Reads every
lesson Markdown file under `src/curriculum/`, renders the Markdown to HTML,
and writes:

- `public/data/lessons/{id}.{hash}.json`, one content-hashed JSON file per
  lesson (instructions HTML, navigation metadata, headings).
- `public/data/curriculum-tree.json`, the module/lesson index with `dataFile`
  references so the client never constructs filenames from lesson IDs.

In production mode, `SHOW_UPCOMING_LESSONS` is forced to `false` regardless
of what `.env` says, so unpublished lessons are stripped from the output.

The dev build (`pnpm dev`) runs the same script without `NODE_ENV=production`,
which respects the `.env` value for `SHOW_UPCOMING_LESSONS`.

### 2. Type-check: `pnpm build:typecheck`

Runs `tsc --noEmit --pretty false`. Catches type errors before bundling.
Identical to `pnpm typecheck` but with `--pretty false` for CI-friendly
output.

### 3. Vite bundle: `pnpm build:vite`

Runs `vite build`. Compiles and bundles the React app into `dist/`, producing
the entry `index.html`, hashed JS/CSS assets, and copying the
`public/data/` files into `dist/data/`.

### 4. Generate static routes: `pnpm build:static-routes`

Runs `scripts/generate-spa-routes.ts`. Reads the curriculum tree from
`dist/data/curriculum-tree.json` and copies `dist/index.html` into
`dist/learn/{id}/index.html` for every lesson ID. This lets a static host
resolve deep links (e.g., `/learn/103-deleting-text`) to a real file so
React Router can take over once JS loads.

## Requirements

- **Node 24** (see `engines` in `package.json`).
- **pnpm** as the package manager (enforced by `preinstall`).
- Dependencies installed (`pnpm install`).

## Running individual steps

Each sub-step is a standalone script:

```sh
pnpm build:lesson-data   # production lesson JSON
pnpm build:typecheck      # type-check only
pnpm build:vite           # Vite bundle only
pnpm build:static-routes  # static route files only
```

For local development, `pnpm build-lesson-data` (without the `build:` prefix)
runs the same lesson-data script without forcing production mode.
