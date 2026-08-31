# AI Agent Instructions

Standard engineering practices for this project. Any more specific instruction file
overrides these rules.

## Stack

- Astro
- React
- TypeScript
- Vitest with React Testing Library
- pnpm

## Codebase Architecture

[`docs/references/architecture.md`](docs/references/architecture.md) is an overview
of the codebase layers, build pipeline, runtime data flow, engine state shape, and
test structure. Read it first when orienting to a new area of the codebase.

### Curriculum scripts

Three scripts manage the lesson/module scaffolding and the curriculum doc. Run them
from the project root (`projects/vim-course/`).

- **`pnpm add-module -- --number=<N> --slug=<slug> --title="<title>"`** — create a
  new module directory with stub intro and review lessons, and register it in
  `ordering.ts`. Automatically syncs the curriculum doc.
- **`pnpm add-lesson -- --module=<N> --title="<title>" [--type=<learn|practice>]`** —
  add a new lesson to an existing module (inserted before the review lesson) and
  register it in `ordering.ts`. Automatically syncs the curriculum doc.
- **`pnpm sync-curriculum-doc`** — regenerate `docs/vim-course.curriculum.md` from
  `ordering.ts` and the lesson files. Use `--check` to verify without writing
  (runs in CI).

`add-module` and `add-lesson` call `sync-curriculum-doc` automatically, so you do
not need to run it separately after using them.

### Astro islands and `.astro` files

- `.astro` files hold markup and **zero logic**. All behavior lives in `.tsx` islands or plain
  `.ts` modules, tested with React Testing Library / `@testing-library/dom`. Do not put a
  `<script>`/`querySelector` behind `.astro` markup. An interactive component is a whole island.
  **One exception:** read-only `localStorage` decoration (e.g., stamping completion markers on a
  static list) may use a bundled `<script>` that imports a tested `.ts` module, following [Astro's
  client-side scripts pattern](https://docs.astro.build/en/guides/client-side-scripts/). The markup
  must work fully without JS; the script only enhances appearance.
- Islands that read browser-only APIs at render (`localStorage`, `document`) use `client:only="react"`. Islands without that dependency use `client:load`.
- Cross-island state uses the module-level store `src/stores/courseChrome.ts`, not React Context
  (Context only spans a single island).

## Code Style

- Use named exports for components, hooks, and utilities. Do not use default exports.
- Name a file after the thing it exports: `Button.tsx`, not `index.tsx`. `index.{ts,tsx}` is
  reserved for barrel files that only re-export from siblings; any file with real logic must
  not be named `index`.
- Colocate related files under the component name: `Button.module.css`, `Button.test.tsx`.
  Never `index.module.css` or `index.test.tsx`.
- Delete dead code your change leaves behind: no unused imports, unreferenced exports, or
  commented-out blocks.
- Add a comment only when the code is not self-explanatory. Clear naming and structure come first.

## UI Design

- Do not use emojis or ASCII symbols in UI. Use the icon components in
  `src/components/base/Icon/`. Import from `@/components/base/Icon`. Do not use
  raw SVG files or inline SVG in component files. If you need an icon not in this
  set, add it to `Icon.tsx` following the existing pattern (accepts `className?`,
  sets `aria-hidden` and `focusable="false"`), then ask the user to confirm.

## Styling

- Use CSS modules (`.module.css`) for all component and page styles. `.astro` files and React
  islands each import their own module. Do not use Astro scoped `<style>` blocks.
- A CSS module cannot be shared across the `.astro`/island boundary (Astro's server pipeline and
  the island's client pipeline hash the same file to different values). Keep separate modules.
  CSS custom-property overrides on a parent element still cascade into island children. Only if a
  single class truly must appear in both pipelines should it go in `src/styles/global.css` as a
  plain class.
- Never use inline styles or `!important`.
- Keep colors accessible with sufficient contrast.
- Use logical properties, not physical ones, so styles work in RTL locales: `padding-inline`,
  `margin-block`, `border-inline-start`, `inset-inline-start`, `text-align: start | end`,
  `float: inline-start`. Physical values stay correct only for `transform`, `box-shadow`
  offsets, and viewport-tied geometry.
- Use mobile-first `min-width` media queries. The only allowed breakpoints are `600px`,
  `768px`, `1024px`, `1440px`, and `2560px`. The 320px baseline needs no query. Do not
  introduce other breakpoint values.
- Use px for breakpoints, media queries, and border radius values. Use rem for all other
  sizing, including font-size, spacing, and layout dimensions.
- All font sizes, spacing, radii, and transition timings must use a CSS custom property
  from `src/styles/global.css`. No hardcoded literals in component CSS files.
- Terminal grid spacing is measured in monospace character cells: use `ch` for terminal
  gutters, side insets, and other horizontal spacing that aligns with buffer columns.

## Keyboard Handling

Any UI element that is only meaningful to keyboard users — shortcut trigger buttons,
shortcut settings toggles, kbd hint chips, shortcut hint text — must be hidden on
touch devices and shown only on pointer devices that support hover. Use the same
condition everywhere:

```css
.keyboard-only {
  display: none;
}

@media (width >= 768px) and (hover: hover) {
  .keyboard-only {
    display: <appropriate display value>;
  }
}
```

The `hover: hover` condition excludes touchscreens (phones and tablets) regardless
of screen size. The `width >= 768px` floor prevents showing keyboard hints in very
narrow pointer-device windows. Never use a width-only breakpoint for this pattern.

## Testing

- Implementation changes must include tests, except CSS changes.
- Vitest with React Testing Library.
- A test file mirrors the unit under test: `Button.test.tsx` for `Button.tsx`. Never
  `index.test.tsx`.
- Test user-observable behavior and accessibility, not implementation details. Prefer
  `getByRole` / `findByRole` with accessible names, and `userEvent` for interaction flows.
- For modal and drawer tests: wrap disappearance assertions in `waitFor`
  (`waitFor(() => expect(screen.queryByRole(...)).toBeNull())`). Never check disappearance
  with a bare synchronous `queryBy` after an async action.

## Accessibility

- Use semantic HTML first, then add ARIA only where semantics are not enough.
- Every meaningful image needs alt text; decorative images use an empty alt attribute.
- Custom interactive regions must be focusable, keyboard-operable, and expose an accessible name.

## Writing in docs and comments

- Use American English spelling and grammar.

## Validation

- Run the narrowest relevant test file first. Before finishing larger changes, run
  `pnpm test` and `pnpm build` when the touched area justifies it.
- Run `pnpm lint:styles` whenever a `.css` file is created or modified.

## Curriculum Development

[`docs/references/commands.md`](docs/references/commands.md) is the inventory of
every key and ex command the simulated terminal accepts, its messages, and its
silent no-ops. Consult it before authoring a lesson, and update it in the same
change that adds or removes a command.

[`docs/references/lesson-authoring.md`](docs/references/lesson-authoring.md) is
the reference for all lesson-authoring rules: config options, start modes,
checklist test fields, command-filter options, and seed conventions.
