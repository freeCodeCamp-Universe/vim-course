# Components

React components are split into two categories: base (reusable UI atoms) and features (domain-aware components).

## Base components

Location: `src/components/base/`

Reusable building blocks with no curriculum or engine knowledge. Imported and used throughout the app:

- **Button, Switch, Modal, TabGroup** — UI primitives
- **Icon** — SVG icon set (see [UI design guidelines in AGENTS.md](../../AGENTS.md))
- **Markdown** — renders pre-rendered HTML (never parses markdown on the client; `marked` is build-time only)
- **LoadingState** — loading spinner
- **VimTerminal** — terminal container (wraps the DOM grid renderer)

## Feature components

Location: `src/components/features/`

Domain-aware components used in lessons and pages:

- **LessonWorkspace** — orchestrates the terminal, checklist, instructions pane, and keyboard event loop
- **Checklist** — renders test results with pass/fail icons
- **NavDrawer** — course navigation tree (open/close toggled by `courseChrome`)
- **SettingsModal, ShortcutsModal** — overlay modals
- **VimTerminal wrapper** — the terminal grid, cursor, selections, status line

## Design patterns

**No prop-drilling** — `courseChrome` (a module-level pub/sub store) holds app-level state (drawer open/close, modal visibility). Components subscribe to state changes via `useSyncExternalStore`.

**Minimal re-renders** — components are memoized where appropriate. The lesson workspace updates checklist and buttons only after keystroke processing, not on every render.

**Accessibility first** — all interactive elements have accessible names, proper ARIA labels, and keyboard support. See [AGENTS.md](../../AGENTS.md) for accessibility conventions.

## Testing

Component tests use React Testing Library and focus on user-observable behavior:

- Query elements by accessible name or role (`getByRole`, `findByRole`)
- Simulate user interactions with `userEvent`
- Verify UI updates and accessibility

See `components/**/*.test.tsx` for examples.
