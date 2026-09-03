# Architecture

The app is a React SPA with a Vim simulator engine. It's organized into four core layers that depend on each other in one direction only, plus a cross-cutting curriculum layer.

```
┌─────────────────────────────────────────────────┐
│  Views & Routing (React Router)                 │  Page routes + data loading
├─────────────────────────────────────────────────┤
│  Components (React)                             │  UI + user interaction
├─────────────────────────────────────────────────┤
│  Terminal & Validation                          │  DOM grid + checklist
├─────────────────────────────────────────────────┤
│  Engine (Pure functions)                        │  Vim state machine
└─────────────────────────────────────────────────┘
          ↑ Curriculum ↑ (builds all layers)
```

## How the system works

### Build time

The curriculum layer parses lesson Markdown files and generates two outputs:

1. **Lesson JSON files** — one per lesson, content-hashed and versioned
   - Lesson config (start mode, allowed commands, checklist tests)
   - Instructions HTML (pre-rendered Markdown)
   - File seeds and decorations
   
2. **Curriculum tree** — static JSON index of all lessons
   - Module titles, lesson IDs and titles
   - Links to lesson data files
   - Ordered lesson list for navigation

Both are written to `public/data/` and copied into `dist/data/` during the Vite build.

A post-build step generates per-lesson `index.html` files in `dist/learn/{id}/` so a static host can resolve deep links (`/learn/103-deleting-text`) to a real file on disk.

See [build-process](./guides/build-process.md) for the complete sequence.

### Runtime: page load

```
1. Browser loads /learn/{lessonId}
   ↓
2. React mounts, React Router resolves path to <LessonRoute>
   ↓
3. LessonRoute fetches lesson JSON via useLessonData(lessonId)
   - HTTP fetch to public/data/lessons/{id}.{hash}.json
   - Cached in memory for the session
   ↓
4. LessonPage renders with lesson data
   - Instructions pane (pre-rendered HTML)
   - VimTerminal (empty grid)
   - Checklist (all tests unchecked)
   ↓
5. LessonWorkspace initializes the engine
   - Seed files from lesson config
   - Creates initial EditorState
   - Paints first frame to DOM
```

### Runtime: keystroke loop

After the engine initializes, every keystroke triggers:

```
User types key
   ↓
LessonWorkspace catches keyboard event
   ↓
dispatch(state, key, allowedCommands)
   ↓
Engine:
  - Routes keystroke by mode (normal/insert/visual/etc)
  - Applies the command
  - Logs actions to history
  - Runs allowedCommands filter (can reject or cap command)
  - Returns { state, actions }
   ↓
Terminal paints new state to DOM grid
   ↓
evaluateChecklist(context)
   - Tests engine state against lesson requirements
   - Returns { passed, label }[] for each requirement
   ↓
React renders updated checklist + buttons
   ↓
(Back to waiting for next keystroke)
```

No async work in the keystroke loop. State is pure data, mutations are spread-based updates.

## Key directories

| Path | What lives there |
|------|------------------|
| `src/engine/` | Vim simulator. Pure functions only. `dispatch.ts` is the main reducer; `commands/` holds handler functions per command family. See [engine](./layers/engine.md). |
| `src/terminal/` | DOM grid renderer and engine bridge. `terminalView.ts` paints HTML; `vimTerminalView.ts` owns the render loop. See [terminal](./layers/terminal.md). |
| `src/components/` | React UI. `base/` has primitives (Button, Icon, Markdown); `features/` has domain components (Checklist, VimTerminal, NavDrawer). See [components](./layers/components.md). |
| `src/views/` | Page routes. `App.tsx` defines routes; `LessonRoute.tsx` loads lesson data; `LessonPage.tsx` and `HomePage.tsx` render pages. See [views-and-routing](./layers/views-and-routing.md). |
| `src/curriculum/` | Lesson parsing and types. `loader.ts` parses markdown at build time; `types.ts` defines LessonDefinition. See [curriculum](./layers/curriculum.md). |
| `src/validation/` | Checklist evaluation. `checklist.ts` runs tests; `predicates/` holds test implementations. See [validation](./layers/validation.md). |
| `src/stores/` | App-level state. `courseChrome.ts` is a pub/sub store for drawer/modal visibility (not React Context, to survive route changes). |
| `src/hooks/` | React hooks. `useLessonData()`, `useProgress()`, `useKeyboard()`, etc. |
| `scripts/` | Build-time scripts. `build-lesson-data.ts` parses lessons; `generate-spa-routes.ts` creates per-lesson HTML files. |

## Data flow

**Lesson config** flows down from curriculum → engine (for allowed commands, checklist tests) and → components (for instructions, checklist labels).

**Engine state** is owned by LessonWorkspace and updated by dispatch. React receives snapshots (`{ checklist, complete, dirty, resettable }`) to update buttons and progress, but never mutates engine state directly.

**Action history** is append-only. The engine logs every keystroke; the checklist reads the full history to evaluate requirements.

**Progress** persists to `localStorage` under `vim-course:progress` as `{ completed: { id: string, completedAt: number }[] }`. The browser back button or page reload restores it.

## Testing

- **Engine tests** (`src/engine/*.test.ts`) call `dispatch()` directly and assert on returned state.
- **Component tests** (`src/components/**/*.test.tsx`) use React Testing Library, query by role, simulate user events.
- **Curriculum tests** (`src/curriculum/*.test.ts`) load real lesson files and check structural invariants.
- **Validation tests** (`src/validation/**/*.test.ts`) test checklist predicates against synthetic contexts.
- **Terminal tests** (`src/terminal/*.test.ts`) test the DOM grid renderer in jsdom.

All test files are co-located with source (e.g., `dispatch.test.ts` next to `dispatch.ts`). Run with `pnpm test`.

## Extending the system

- [Add a new Vim command](./guides/adding-commands.md)
- [Build process overview](./guides/build-process.md)
- [UX design decisions](./guides/ux-decisions.md)

## Detailed layer docs

- [Engine](./layers/engine.md) — reducer, EditorState, dispatch, command registry
- [Terminal](./layers/terminal.md) — DOM grid rendering, bridge to engine
- [Components](./layers/components.md) — base and feature components, design patterns
- [Views & Routing](./layers/views-and-routing.md) — React Router, data loading, layouts
- [Curriculum](./layers/curriculum.md) — lesson parsing, file format, types
- [Validation](./layers/validation.md) — checklist evaluation, test predicates
