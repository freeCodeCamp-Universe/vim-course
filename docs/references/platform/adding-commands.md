# Adding an engine command

How to implement a new key command in `src/engine/`. Read `docs/architecture.md` first for the layer overview and `EditorState` field descriptions.

---

## Registry

Every normal-mode command is a handler registered in `normalModeRegistry` (`src/engine/registry.ts`, a module-level singleton). Command files call `normalModeRegistry.register(key, handler)` at import time; `dispatch` imports the files as side-effects. Put handlers in the most relevant existing file under `src/engine/commands/`. If you add a new file, add a bare import in `src/engine/dispatch.ts`:

```ts
import './commands/myFamily';
```

Also add a row to the source table in `docs/references/curriculum/commands.md`.

---

## Handler signature

```ts
type CommandHandler = (context: CommandContext) => CommandResult;

interface CommandContext {
  state: EditorState;
  count: number | null;  // null = no digit prefix was typed
}

interface CommandResult {
  state:            EditorState;
  actions?:         Action[];
  pending?:         boolean;  // true = multi-key prefix; dispatch keeps pending state
  undoTransparent?: boolean;  // true = command manages its own undo (u, Ctrl-r)
}
```

---

## Actions

Actions are the observable surface — `state.history` is what checklists read. Every command must return the right shape:

```ts
type Action =
  | { type: 'edit';     command: string; count?: number }  // buffer mutation
  | { type: 'motion';   command: string; count?: number }  // cursor move only
  | { type: 'mode';     command: string }                  // mode change
  | { type: 'ex';       command: string }                  // executed :cmd
  | { type: 'insert';   chars?: string }                   // text typed in insert mode
  | { type: 'filtered'; command: string }                  // blocked by allowedCommands
```

Include `count` in an action only when the user typed a digit prefix (`context.count !== null`). Checklist predicates match action shapes exactly, so an unexpected `count` field fails the match.

---

## State helpers

Never mutate state directly. Use helpers from `src/engine/state.ts`:

| Helper | Effect |
|--------|--------|
| `markDirty(state)` | Sets `dirty: true` |
| `setBuffer(state, buf)` | Replaces `state.buffer` |
| `moveCursor(state, pos)` | Replaces cursor, clamps to valid bounds |
| `setMode(state, mode)` | Changes editor mode |
| `setRegister(state, { text, linewise })` | Fills the unnamed register |
| `setError(state, msg)` | Sets the status line as an error |

Buffer lines need `src/engine/text.ts` for grapheme-aware indexing (`textChars`, `textAt`, `textSlice`, `textLength`) and `src/engine/buffer.ts` for structural mutations (`getLine`, `deleteChar`, `deleteLine`, `insertText`). Never index a buffer line with `string[n]` — multi-byte characters break it.

---

## dispatch routing

`dispatch` processes a keystroke in this order; the first match wins. Understanding the sequence matters when a command interacts with count accumulation or pending operators:

1. Clear status
2. Mode branches — animation, explorer, shell, command-line, insert, and visual each have their own handler; normal-mode flow continues below
3. Escape — `clearPending()`: zero out `pendingOperator`, `pendingTextObject`, `pendingCount`
4. `pendingOperator === 'r'` — `resolveReplace(state, key)`: next key is the replacement character
5. Digit accumulation — append to `pendingCount`; bare `0` with no pending count is the start-of-line motion
6. `pendingOperator === 'y'` — `resolveYankMotion(state, key)`
7. `EDIT_OPERATORS` (`d`/`c`) — `resolveOperatorMotion(state, key)`
8. Registry lookup — call `handler({ state, count })`
9. `allowedCommands` filter — `applyFilter()` may block the command
10. `trackUndo` + append history

---

## Two-key commands

To implement a command like `r{char}` or `dd`, register the leading key to set `pendingOperator` and return `{ pending: true }`. Dispatch holds the pending state and routes the next keystroke to the resolver.

The existing operators `d`/`c` share `resolveOperatorMotion`. A custom operator needs its own dispatch branch inserted after step 7.

---

## Visual mode

Visual-mode keystrokes go through `processVisualKey` in `src/engine/commands/visual.ts`. Two cases:

**Case A — the command acts on the selection** (like `d`, `y`, `c`, `~`): add the key to `VISUAL_OPERATORS`, implement a `*Selection` function, and handle it in `applyOperator`. The resolved selection comes from `visualSelection(state)` — always ordered, columns already widened to full lines in `visual-line` mode.

**Case B — the command is a pure motion**: nothing to do. `processVisualKey` falls through to the normal-mode registry. The result passes through only if every action has `type === 'motion'`; any non-motion action causes "unsupported in visual mode".

---

## Testing

Engine tests call `dispatch()` directly — no mounts, no DOM. Standard harness:

```ts
function at(lines: string[], cursor: Cursor): EditorState {
  return { ...createState(lines), cursor };
}

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((s, key) => dispatch(s, key).state, state);
}
```

Cover: happy path (buffer, cursor, mode, dirty), cursor clamping, empty-line no-op (`dirty` must stay false), count with and without a digit prefix, action shape in `state.history`, register contents for yank-adjacent commands, and visual mode (enter with `'v'`/`'V'`, extend with motions, then the command key).
