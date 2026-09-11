# Terminal Architecture

The terminal is a custom DOM-based terminal emulator purpose-built for this
project's Vim simulator. It renders buffer content, a cursor, selections, and a
status-line footer. It is not a general-purpose terminal emulator (no PTY, no
escape-code parser). All state flows in one direction: the engine produces an
`EditorState`, a mapping layer converts it to a `TerminalViewModel`, and the
view renders that model into the DOM.

## Layers

```
LessonPage.tsx / VimTerminal.tsx (React island, mount/unmount seam)
        │
        ▼
vimTerminalView.ts        (Vim-specific: owns engine state, maps to TerminalViewModel)
        │
        ▼
terminalView.ts           (engine-agnostic: renders TerminalViewModel into DOM)
        │
        ▼
terminalView.module.css   (layout, cursor, selection, footer, theme)
```

### terminalView.ts (engine-agnostic view)

**File:** `src/terminal/terminalView.ts`

`createTerminalView(options)` builds the DOM and returns a `TerminalView` handle.
The view knows nothing about Vim, lessons, or the engine. It receives a
`TerminalViewModel` on each `update()` call and reconciles the DOM to match.

**Options:**
- `accessibleName: string`. Label for the `role="application"` container.
- `onKey: (key: string) => void`. Raw key callback after normalization.
- `onPaste?: (text: string) => void`. Clipboard paste callback.

**Returned handle (`TerminalView`):**
- `el: HTMLDivElement`. Root element to append into the page.
- `measureCols(): number`. Current column count from the element's width.
- `measureRows(): number`. Current row count from the element's height.
- `update(model: TerminalViewModel): void`. Reconcile DOM to the model.
- `focus(): boolean`. Move focus to the terminal; returns false if off-screen.
- `destroy(): void`. Clean up listeners and observers.

**DOM structure:**

```
div.terminal                          (root)
├── div.screen                        (role="application")
│   ├── textarea.touch-input          (touch only: hidden focus target, see below)
│   └── div.grid                      (role="list", aria-label="{name} contents")
│       ├── div.line [role="listitem"] (one per content row)
│       ├── div [role="img"]          (wrapper for described-image groups)
│       └── div.line [aria-hidden]    (decorative rows)
├── div.sr-only                       (role="status", aria-live="polite")
└── div.footer
    ├── span.footer-start             (status line / shell prompt)
    └── span.footer-end-col
        ├── span.footer-pending       (typed but uncommitted keys like "3d")
        ├── span                      (ruler text, e.g. "1,5")
        └── span.sr-only              (accessible label for ruler)
```

On **pointer devices** (desktops, laptops) the `.screen` div has `tabIndex=0`
and is the focus target. On **touch devices** (detected via
`matchMedia('(hover: none)')`) a hidden `<textarea>` inside `.screen` becomes
the focus target instead. A plain `div[tabindex]` never summons the virtual
keyboard on mobile; the `<textarea>` tells the OS the element accepts text
input.

The textarea is 1×1 px, positioned inside the screen's padding area
(`position: absolute; inset-block-start: 0; inset-inline-start: 0`) with
`opacity: 0`. Mobile browsers silently refuse to focus zero-sized or
off-screen elements, so the textarea must have real dimensions and sit within
the viewport. The 1×1 px size keeps it focusable without covering the grid, so
touch exploration (VoiceOver, TalkBack) still reaches the list items underneath.
`font-size: 1rem` prevents iOS auto-zoom on focus (iOS zooms inputs with
font-size < 16px). This matches the xterm.js pattern of a small in-viewport
textarea whose position can be overridden at runtime. It carries the same
`aria-label` and `aria-roledescription` as the screen div so screen readers on
mobile announce it correctly. Keyboard events on the textarea bubble up to the
screen, so the existing `keydown` handler still fires. For characters that
mobile keyboards deliver via `input` events (where `keydown.key` is
`"Unidentified"`), a separate `input` listener reads the textarea's value and
forwards each character to `onKey`, then clears the textarea. IME composition
is tracked via `compositionstart`/`compositionend` to prevent double-processing
and premature clearing. A `touchend` listener on the screen and a `click`
listener on the terminal root redirect taps to the textarea so the virtual
keyboard opens when tapping anywhere in the terminal. `mousedown` is not used
because iOS Safari synthesizes it from the touch sequence and does not treat a
programmatic `focus()` during a synthetic mouse event as a valid user activation
for opening the keyboard.

### vimTerminalView.ts (Vim binding)

**File:** `src/terminal/vimTerminalView.ts`

`createVimTerminalView(options)` owns the engine state and drives the view.
It holds the `LessonProgress` controller, dispatches keystrokes through the
engine, and pushes snapshots up to React after every state change.

**Options (`VimTerminalViewOptions`):**
- `lesson: LessonDefinition`. The lesson to run.
- `onUpdate: (snapshot: LessonSnapshot) => void`. Called after every advance.
- `engine?: LessonEngine<EditorState>`. Injectable; defaults to `vimLessonEngine`.
- `accessibleName?: string`. Forwarded to the terminal view.

**Key internal functions:**
- `toModel()` maps `EditorState` + context into `TerminalViewModel`.
- `terminalLines()` determines which lines fill the grid (buffer, tildes,
  splash text, shell logo + output, or quickfix listing).
- `render()` measures dimensions and calls `view.update(toModel(...))`.
- `emit()` pushes a `LessonSnapshot` up to React via `options.onUpdate`.

**Snapshot shape (`LessonSnapshot`):**
- `checklist: readonly ChecklistItem[]`
- `complete: boolean`
- `dirty: boolean`. Whether the buffer has diverged from seed.
- `resettable: boolean`. Dirty buffer or accumulated shell output.

## Data flow

```
keystroke → normalizeKey() → onKey callback
  → controller.advance(state, key, visited)
  → new EditorState + announcement
  → toModel(state, announcement, ...) → TerminalViewModel
  → view.update(model)                → DOM reconciliation
  → emit()                            → LessonSnapshot → React
```

`toModel()` is the sole translation point between the engine's world
(`EditorState`) and the view's world (`TerminalViewModel`). The view never
reads engine state directly.

## TerminalViewModel

**Defined in:** `src/terminal/terminalView.ts`, lines 33-95

| Field | Type | Purpose |
|-------|------|---------|
| `lines` | `string[]` | One string per visible row |
| `gutter` | `string[] \| null` | Line-number labels; null hides the gutter |
| `cursor` | `TerminalPosition \| null` | Cursor cell; null hides it |
| `cursorStyle` | `'block' \| 'bar'` | Cursor rendering mode |
| `selection` | `TerminalRange \| null` | Highlighted character range |
| `selectionStyle` | `'accent' \| 'cursor'` | Color variant for selection |
| `decorations` | `readonly Decoration[]` | Highlight ranges (mark, qf-location, qf-column) |
| `visited` | `ReadonlySet<string> \| null` | Cells the cursor has visited (`"line,col"` keys) |
| `footerStart` | `string` | Leading footer cell (status line, shell prompt) |
| `footerIsError` | `boolean` | Whether footer shows an error |
| `footerIsHint` | `boolean` | Whether footer is a continuation hint |
| `footerEnd` | `string` | Trailing footer cell (ruler) |
| `footerEndVisible` | `boolean` | Whether the trailing column is shown |
| `footerEndLabel` | `string` | Accessible-only description for the ruler |
| `footerPending` | `string` | Pending command keys shown above the ruler |
| `footerCursor` | `number \| null` | Cursor column in the leading footer cell |
| `announcement` | `string` | Polite screen reader announcement |
| `contentHidden` | `boolean` | When true, grid is aria-hidden (animations, splash) |
| `lineRoles` | `LineRole[]` | Per-line a11y role, parallel to `lines` |

## Rendering details

### Row construction (`buildLine()`)

Each row is a `div.line` containing an optional `.gutter` span and a `.text`
span. The text span is built from styled sub-spans for selections, decorations,
cursor, and visited highlights. The renderer clips decorations that overlap a
selection to avoid double-highlighting.

Blank lines: when a row's text content is empty after rendering, the text span
is set to ` ` (non-breaking space) so screen readers announce "blank"
instead of skipping the row. xterm.js and hterm both do this.

### Cursor

Rendered as a `span.cursor.block` or `span.cursor.bar` wrapping the character
at the cursor position.

- **Block cursor:** `min-inline-size: 1ch`, 1px outline. When focused:
  filled with `--color-cursor-bg`/`--color-cursor-fg`, outline thickens to 2px.
- **Bar cursor:** `box-shadow: inset 2px 0 currentcolor` draws a vertical bar.

The cursor is also used in the footer for command-line and shell prompt modes.

### Key normalization (`normalizeKey()`)

Tab and modifier-only keys pass through (no keyboard trap). Meta combos and most
Alt/Ctrl combos pass through for global shortcuts. Exceptions that the terminal
captures: `Alt+Arrow`, `Alt+Backspace`, `Ctrl+Arrow`, `Ctrl+Backspace` (word
navigation), `Ctrl+c`, `Ctrl+r`, `Ctrl+g`.

### Grid reconciliation (`update()`)

Every `update()` call rebuilds all rows via `grid.replaceChildren(...)`. This is
fast because the grid is plain text nodes and small spans (no React, no virtual
DOM). A `ResizeObserver` on the terminal root triggers `render()` on resize.

## Connection to React

The React boundary is thin:

1. **`VimTerminal.tsx`** (`src/components/features/VimTerminal.tsx`): renders one
   empty `<div ref={host}>`. A `useEffect` calls `createVimTerminalView()`,
   appends `view.el` to the host div, and stores the view in a ref. On cleanup,
   calls `view.destroy()`. The `onUpdate` callback is read through a ref so
   callback identity changes never re-create the view.

2. **`LessonWorkspace.tsx`** (`src/views/LessonWorkspace.tsx`): renders the
   instructions panel and the terminal side-by-side. Uses the `useLesson()` hook,
   which provides `checklist`, `complete`, `feedback`, `onUpdate`, `viewRef`,
   `reportIncomplete`, and `reset`.

3. The terminal pushes state up via `onUpdate(snapshot)`. React never pushes
   state down into the terminal. React calls `focus()`, `reset()`, and
   `reportIncomplete()` imperatively through the ref, and nothing else.

## Accessibility

### Design principles

All accessibility attributes are always-on with no toggle. They are invisible
to non-screen-reader users (ARIA attributes and visually-hidden text), so there
is no performance cost and nothing to configure. This differs from xterm.js,
which gates its screen reader support behind a `screenReaderMode` flag because
it builds a parallel DOM tree.

### Two screen reader interaction modes

Screen readers operate in two modes on the web:

- **Application mode** (triggered by `role="application"` on `.screen`):
  keystrokes pass through to the page. The user types Vim commands. The live
  region announces what happened.
- **Browse mode** (user toggles with NVDA `Insert+Space` / JAWS `Insert+Z`):
  the screen reader intercepts keys. Arrow keys navigate the DOM. The user
  reads content at their own pace via the list/listitem structure.

### Announcement channel (live region)

**Element:** `div.sr-only[role="status"][aria-live="polite"][aria-atomic="true"]`

The `announce()` function in `src/curriculum/lessonEngine.ts` (line 261)
produces every announcement. The view never generates its own. `announce()`
returns a string after each keystroke, following this priority hierarchy
(highest wins):

1. Status messages (errors, confirmations like "2 lines deleted")
2. Splash screen ("Vim splash screen. Press any key to continue.")
3. Display toggles ("line numbers shown" / "line numbers hidden")
4. Visual-mode selection results (e.g., after operating on a selection)
5. Mode changes ("INSERT", "VISUAL", etc.)
6. Edit announcements (yank, delete feedback)
7. Cursor-movement line content (the text of the destination line)
8. Empty string (no announcement)

When the cursor moves to a different line (via `j`, `k`, `gg`, `G`, or any
other motion), `announce()` returns the destination line's text. For empty
lines, it returns "blank line". Horizontal movement within the same line
produces the same text, so the de-duplication logic below prevents
re-announcement.

**De-duplication:** when the same text repeats (e.g., `j` lands on two identical
lines), `update()` prepends a `\n` so the DOM mutation triggers the screen
reader without changing the spoken output. hterm uses the same trick.

**Priority:** `aria-live="polite"` queues announcements instead of interrupting
mid-speech. The engine is synchronous and action-level, so polite fits. Rapid
`j`/`k` queues line announcements; the user can press a key to stop speech.

### DOM structure for browse mode

**Grid:** `role="list"` with `aria-label="{name} contents"`.

**Rows:** each content line is `role="listitem"` with:
- `aria-posinset` (1-based line number among content lines)
- `aria-setsize` (total content lines, excluding decorative and image rows)

In browse mode, the user arrows through rows and hears "line 3 of 8: [content]".

**Blank lines:** rows with empty text content get ` ` (non-breaking space) so
screen readers announce "blank" instead of skipping the row silently. See
`buildLine()` in the Rendering details section above.

### LineRole type and rendering

**Defined in:** `src/terminal/terminalView.ts`, line 31

```ts
type LineRole = 'content' | 'decorative' | { role: 'img'; label: string };
```

The `lineRoles` array is parallel to `lines` in `TerminalViewModel`. Two
functions in `terminalView.ts` consume it:

**`buildLine()`** reads each line's role and sets DOM attributes:
- `'content'`: sets `role="listitem"`, `aria-posinset`, `aria-setsize`.
- `'decorative'`: sets `aria-hidden="true"`. No listitem role, no position.
- `{ role: 'img', label }`: no attributes on the line itself.

**`update()`** handles image grouping after building all lines. It scans for
consecutive lines that share the same `{ role: 'img', label }` and wraps them
in a single `div[role="img"][aria-label="{label}"]` container. Lines with
different labels get separate containers. The `aria-setsize` count on content
rows excludes both decorative and image-group rows.

### lineRoles computation in toModel()

`toModel()` in `src/terminal/vimTerminalView.ts` computes `lineRoles` from
three sources, merged into one array:

1. **Shell logo** (runtime): first 5 lines in shell mode get `'decorative'`
   (`aria-hidden`). The braille logo is purely decorative branding.
2. **Tilde rows** (runtime): lines beyond `state.buffer.length` in a new
   (not-on-disk) file get `'decorative'`.
3. **Lesson-authored `decorativeRanges`** (config): ranges from `LessonConfig`
   specify a `file`, `lines` (1-based inclusive), optional `description`, and
   optional `anchor`. With a description: `{ role: 'img', label: description }`.
   Without: `'decorative'`. When an `anchor` needle is set, the range is applied
   while at least one buffer line within the range matches the anchor. When none
   match (the drawing was fully deleted or shifted away), the range is skipped so
   surviving content is not mislabeled.

Tilde roles form the base array, then lesson ranges overwrite specific indices.
`lineRoles` is left `undefined` during animations, splash, and quickfix
overlays because those use `contentHidden` to hide the entire grid.

### contentHidden

When `contentHidden` is true (animations, splash screen), `update()` sets
`aria-hidden="true"` on the grid and removes its `aria-label`. The screen
element keeps its accessible name and focusability. The live region still
announces. Announcements carry the state during these phases, not the visual
content.

### Per-mode coverage

| Mode | Announcements | DOM structure |
|------|---------------|---------------|
| **Vim** | Line content on cursor movement; edits and mode changes | Each row is a listitem; tilde and decorativeRanges rows marked decorative or img |
| **Shell** | Output announced | Logo wrapped in `role="img"`; output rows are listitems |
| **Splash** | "Press any key to continue" | Grid is `aria-hidden` via `contentHidden` |
| **Animation** | Completion announced | Grid is `aria-hidden` via `contentHidden` |
| **Command-line** | Results announced | Grid unchanged from last Vim state |
| **Quickfix** | Current entry on navigation | Each entry is a listitem |

### Focus and keyboard trapping

On pointer devices, the `.screen` element has `tabIndex=0` and
`role="application"`. On touch devices the hidden `<textarea>` inside
`.screen` holds `tabIndex=0` instead (see DOM structure above). In both cases,
Tab and Shift+Tab always pass through to prevent keyboard traps. Meta combos
and most Alt/Ctrl combos pass through for browser/OS shortcuts. The `focus()`
method checks `screen.offsetParent !== null` to avoid focusing a hidden tab
panel, then calls `focus()` on whichever element is the focus target.

## CSS structure

**File:** `src/terminal/terminalView.module.css`

- `.terminal`: flex column, full height, monospace font, color custom properties.
- `.screen`: flex-grow scrollable area, `padding-inline: 2ch`.
- `.touch-input`: hidden textarea for touch-device keyboard input (1×1 px,
  in-viewport, `opacity: 0`).
- `.grid`: full width, right inset for gutter alignment.
- `.line`: flex row, min-height from `--terminal-line-height`.
- `.gutter`: fixed width from `--terminal-gutter-width`, `margin-inline-end: 1ch`.
- `.text`: flex-grow, `white-space: pre-wrap`, `word-break: break-all` (matches
  Vim's default `wrap` behavior).
- `.footer`: flex row, `justify-content: space-between`.
- Inactive overlay: `.terminal::after` dims the terminal when not focused;
  hidden via `visibility: hidden; opacity: 0` on `:focus-within`.
- Light theme: `:global([data-theme='light']) .terminal` overrides all color
  custom properties.

The `sr-only` utility class is defined in `src/styles/global.css` (line 232):
`clip-path: inset(50%)`, 1x1 pixel, `position: absolute`.

## Related docs

- [Lesson authoring reference](lesson-authoring.md): `decorativeRanges` config
  field for marking ASCII art as decorative or described images.
- [Terminal screen reader access](../../../../docs/working/terminal-screen-reader-access.md):
  the phased work plan for the accessibility implementation.
- [Architecture overview](architecture.md): codebase layers and data flow.
