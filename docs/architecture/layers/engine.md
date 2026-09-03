# Engine

The engine is a pure Vim state machine. It accepts a keystroke and current state, applies the command, runs lesson filters, and returns the new state plus a log of actions that occurred.

## Core types

**`EditorState`** — the complete editor state. Key fields:
- `buffer: string[]` — lines of the active file
- `mode` — `normal | insert | visual | visual-line | command-line | explorer | shell | animation`
- `cursor`, `desiredCol`, `selection`, `pendingOperator`, `pendingCount`
- `files: Map<string, VirtualFile>` — virtual filesystem
- `history: Action[]` — append-only log of every executed action
- `undoStack`, `redoStack`, `register`, `marks`

**`Action`** — an atomic edit or movement. Examples: `{ type: 'deleteLines', count: 1 }`, `{ type: 'moveCursor', line: 5, col: 0 }`. Actions are immutable and never modified after creation.

**`dispatch(state, key, allowedCommands?)`** — the main reducer. Pure function: same inputs always produce the same outputs. Returns `{ state, actions }`.

## How it works

1. Routes the keystroke by mode (normal, insert, visual, command-line, etc.)
2. Applies the command using mode-specific handlers (e.g., `processNormalKey`, `processInsertKey`)
3. Logs each action to `history`
4. Runs the optional `allowedCommands` filter, which can reject or cap the command
5. Returns the updated state and action array

Mode handlers are imported from `commands/` and share a common interface: they take `(state, key)` and return `(state, actions)`.

## Command registry

Normal mode commands are registered in `registry.ts` using a simple map:

```ts
normalModeRegistry.set('d', resolveOperatorMotion);
normalModeRegistry.set('gg', moveToLine);
normalModeRegistry.set(':wq', saveAndQuit);
```

Commands can be single keys (`d`), multi-key sequences (`gg`), or complex patterns (operator + motion, command-line ex commands).

## Key design choices

- **No async** — dispatch is synchronous. Async work happens in React (e.g., fetching lesson data).
- **No DOM** — the engine has no knowledge of the terminal or viewport. State is pure data.
- **Action history is immutable** — a checklist predicate can safely read the history without worrying about mutations.
- **Cursor position attached to actions** — a WeakMap (`actionCursors`) records where the cursor was when each action ran, so checklist predicates can match `commandAt` position atomically without adding fields to `Action`.

## Testing

Engine tests call `dispatch()` directly with synthetic state and assert on returned state and actions. See `dispatch.test.ts` and command-specific tests in `commands/*.test.ts`.
