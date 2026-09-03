# AI Agent Instructions

Standard engineering practices for this project. Any more specific instruction file
overrides these rules.

## Stack

- Vite
- React with React Router
- TypeScript
- Vitest with React Testing Library
- pnpm

## Codebase Architecture

[`docs/architecture.md`](docs/architecture.md) is an overview
of the codebase layers, build pipeline, runtime data flow, engine state shape, and
test structure. Read it first when orienting to a new area of the codebase.

[`docs/references/platform/adding-commands.md`](docs/references/platform/adding-commands.md) is
the step-by-step guide for implementing a new engine command: registry, handler
signature, action shapes, state helpers, dispatch routing, visual-mode support, and
the test harness.

### Curriculum scripts

Three scripts manage the lesson/module scaffolding and the curriculum doc. Run them
from the project root (`projects/vim-course/`).

- **`pnpm add-module -- --number=<N> --slug=<slug> --title="<title>"`** — create a
  new module directory with stub intro and review lessons, and register it in
  `ordering.ts`. Automatically syncs the curriculum doc.
- **`pnpm add-lesson -- --module=<N> --title="<title>" [--type=<learn|practice>]`** —
  add a new lesson to an existing module (inserted before the review lesson) and
  register it in `ordering.ts`. Automatically syncs the curriculum doc.
- **`pnpm sync-curriculum-doc`** — regenerate `docs/curriculum-outline.md` from
  `ordering.ts` and the lesson files. Use `--check` to verify without writing
  (runs in CI).

`add-module` and `add-lesson` call `sync-curriculum-doc` automatically, so you do
not need to run it separately after using them.

### App structure

- The app is a single-page React application. `index.html` is the entry point;
  `src/main.tsx` mounts the React tree. React Router handles client-side routing
  (`src/App.tsx`).
- Lesson data is pre-built by `scripts/build-lesson-data.ts` into static JSON files
  under `public/data/`. The client fetches them at runtime via `useLessonData`.
- `src/stores/courseChrome.ts` is a module-level store (with `useSyncExternalStore`)
  for app-global chrome state (drawer, modals). It could become React Context but
  works as-is.

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

- Use CSS modules (`.module.css`) for all component and page styles.
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

[`docs/references/curriculum/commands.md`](docs/references/curriculum/commands.md) is the inventory of
every key and ex command the simulated terminal accepts, its messages, and its
silent no-ops. Consult it before authoring a lesson, and update it in the same
change that adds or removes a command.

[`docs/references/curriculum/lesson-authoring.md`](docs/references/curriculum/lesson-authoring.md) is
the reference for all lesson-authoring rules: config options, start modes,
checklist test fields, command-filter options, and seed conventions.
