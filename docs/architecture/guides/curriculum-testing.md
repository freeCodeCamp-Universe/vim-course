# Curriculum testing

How the curriculum test suite verifies that every lesson works correctly. Read the
[architecture overview](../architecture.md) first for the layer overview and the
[curriculum layer doc](../layers/curriculum.md) for lesson types and parsing.

---

## Test files

| File | Purpose |
|------|---------|
| `src/curriculum/curriculumIntegrity.test.ts` | Structural checks: hint phrasing, seed/open consistency, cursor placement, file continuity between lessons, start-state non-completion |
| `src/curriculum/curriculumPlaythrough.test.ts` | Behavioral check: drives every command through the engine and verifies every checklist requirement passes |
| `src/curriculum/testUtils.ts` | Shared helpers for both test files |

Both test files load the real curriculum via `loadFullCurriculum()` and iterate
over every non-WIP, non-prose lesson. No fixtures or mocks. A lesson that fails
these tests has a real bug.

---

## Integrity tests

`curriculumIntegrity.test.ts` catches structural problems a schema can't:

- **Hint phrasing**: every checklist hint starts with "You can" or "You should".
- **Open file exists**: `config.open` names a file that exists in the lesson's seed.
- **Cursor placement**: `config.cursor` points to a line that exists in the open file.
- **File continuity**: each lesson's seed matches the previous lesson's declared end
  state for the same file within a module (catches one-sided edits).
- **Start state**: no lesson passes every requirement before the learner types anything.

These are fast, structural, and independent of the engine.

---

## Playthrough test

`curriculumPlaythrough.test.ts` is the behavioral test. It simulates a learner
completing every lesson by driving commands through the engine and checking that
all checklist requirements pass. The test has four phases per lesson:

```
Phase 1 (Drive)   →  Phase 2 (Check)   →  Phase 3 (Inject)  →  Phase 4 (Verify)
Run every command     Record which items    Write expected        Enter shell,
through the engine    pass from the drive   content for items     assert every
                      alone (latch them)    that still need it    item passes
```

### Phase 1: Drive

Walks the checklist in order. For each requirement, `satisfy()` translates the
test config into the keystrokes a learner would type and feeds them through the
engine via `vimLessonEngine.feed()`.

The translation handles:

| Situation | What `satisfy()` does |
|-----------|----------------------|
| Normal command (`x`, `dd`, `p`, `~`) | Feeds the keys directly |
| Command with count (`3j`, `2dd`) | Prepends count digits |
| `:` or `/` command | Spreads characters + Enter |
| `r` (replace) | Derives the replacement char from content assertions |
| `anyOfCommands` | Picks the first synthesizable alternative |
| `commandAt` position | Navigates cursor there before executing |
| Bracket command (`%`, `d%`, `c%`) | Finds the bracket on the target line, navigates to it |
| `:s` substitution | Navigates to `test.line.number` before executing |
| Register assertion (`register.equals`) | Navigates to the target character in the buffer |
| Register-only (no command) | Navigates to the character and drives `yl` |
| Insert-mode command (`i`, `o`, `c%`) | Derives text to type from expected file content, then Escape |
| Command-line mode (`Ctrl-r` paste) | Executes, then Escape back to normal mode |
| `cursorReached` (single position) | Repeats the command until cursor arrives |
| `cursorReached` (multi-position) | Navigates to each position in sequence |
| `evaluateWhen.fileOpen` | Opens the file before driving the command |
| Shell-start lesson | Enters Vim with the target file first |
| `open` target | Opens the file via `:e` or explorer navigation |
| `saved` / `quit` postcondition | Drives `:w` / `:q` |
| `quickfix.contains` | Drives `:vimgrep /pattern/ *` |

### Phase 2: Check

After driving all items, calls `checkRequirements()` and records which items pass
into a `passedAfterDrive` set. These items are end-to-end verified: the command
ran through the engine and produced state that satisfies the assertion.

Latching after every `satisfy()` call replicates the runtime's monotonic behavior.
Single-position `cursorReached` checks the live cursor, so once the cursor moves
to the next requirement, a post-loop check would show it as failing even though it
passed during drive. Multi-position `cursorReached` uses a `visitedPositions` set
built during Phase 1.

### Phase 3: Inject

For items that didn't pass in Phase 2 (and aren't `KNOWN_UNDERIVABLE`), writes
expected file content into the virtual filesystem. Content sources, in priority
order:

1. **`equals` / `equalsByFile`** from any item in the checklist (cross-item
   lookup via `collectFileEquals()`). Later items win when two declare `equals`
   for the same file.

2. **Derived content** from `contains` patterns + seed (via `deriveFileContent()`).
   Two strategies:
   - **Placeholder replacement**: quiz lessons (e.g., 8.2) use `evaluateWhen.absent`
     to name a placeholder in the seed, and `contains` has a regex with the answer.
     The placeholder is replaced in the seed.
   - **Regex canonicalization**: `matchAgainstSaved` items (e.g., 5.6) have a
     near-literal regex describing the entire expected file. `canonicalizeMatchesPattern()`
     converts it to a plain string by replacing `[Xx]` with `X`, `[ \t]*` with
     space, `\n` with newline, and unescaping `\.` to `.`.

3. **`notEquals`-only**: the requirement only checks that the file differs from its
   original content. Appending a blank line satisfies the "file has changed" check.

Each file is injected at most once (tracked by `injectedFiles` set).

### Phase 4: Verify

Enters the shell (so `quit` and `saved` requirements see shell mode), then calls
`checkRequirements()` and asserts every non-latched, non-deferred,
non-`KNOWN_UNDERIVABLE` item passes.

The test skips items latched in `passedAfterDrive` because re-evaluation could
show false failures (the cursor moved away from a `cursorReached` target, or a
later command changed the buffer).

---

## `KNOWN_UNDERIVABLE`

Items where the test config doesn't carry enough information to reconstruct the
full command. Currently 2 items:

```
6.4 "Capitalize `since` in the second paragraph."
6.4 "Change all capitalized `E` letters in the third paragraph to lowercase."
```

Both use bare `command: ":s"` without the substitution pattern. The lesson works
for learners (they type the full `:s/pattern/replacement/`), but the test can't
derive the arguments from the config alone.

A staleness detector runs alongside the playthrough. If a `KNOWN_UNDERIVABLE`
item passes from Phase 1 drive alone, the test fails and tells you to remove the
entry.

---

## Key helpers in `testUtils.ts`

### Command translation

| Function | Signature | Purpose |
|----------|-----------|---------|
| `commandText(test)` | `LessonTest → string \| undefined` | Extracts the command string from `test.command` or `test.anyOfCommands` |
| `commandToKeys(cmd, open?, rChar?)` | `string → string[]` | Expands a command into the key sequence a learner types |
| `feedKeys(state, keys, allowed?)` | `→ EditorState` | Feeds a run of keys through the engine |
| `satisfy(state, lesson, test, ...)` | `→ EditorState` | Drives one requirement to completion (the core of Phase 1) |

### Content derivation

| Function | Signature | Purpose |
|----------|-----------|---------|
| `collectFileEquals(lesson)` | `→ Record<string, string>` | Cross-item lookup of all `equals` and `equalsByFile` entries |
| `deriveFileContent(lesson, file)` | `→ string \| undefined` | Derives injectable content from `contains` patterns + seed |
| `deriveReplacementChar(test, state)` | `→ string` | Infers the character for `r` from content assertions |
| `canonicalizeMatchesPattern(pattern)` | `→ string \| undefined` | Converts near-literal regex to plain string (internal to `deriveFileContent`) |

### Structural helpers

| Function | Signature | Purpose |
|----------|-----------|---------|
| `name(lesson)` | `→ string` | `"M.L \"title\""` for assertion messages |
| `declaredEndState(lesson)` | `→ Record<string, string>` | Per-file `equals` from the checklist (used by continuity test) |
| `cursorReached(state, row, col)` | `→ boolean` | 1-based position match against 0-based cursor |
| `openFromExplorer(state, lesson, path)` | `→ EditorState` | Navigates netrw selection to a path and opens it |
| `opensNoFile(lesson)` | `→ boolean` | Whether the lesson's start mode (splash/shell) opens no file |
| `toLines(body)` | `→ string[]` | Splits a string into lines |

---

## Coverage

The playthrough asserts every non-`KNOWN_UNDERIVABLE` checklist requirement across
the curriculum. As of this writing:

| Category | Items | How verified |
|----------|-------|-------------|
| End-to-end (command drove + assertion passed) | ~125 | Phase 1 drive through engine |
| Injected (content set, assertion checked) | ~78 | Phase 3 injection + Phase 4 check |
| `KNOWN_UNDERIVABLE` | 2 | Skipped (config limitation) |
| **Total** | **~205** | **100% of non-underivable** |

---

## Extending

### Adding a lesson

Write the lesson file, run `pnpm test`. The playthrough picks it up automatically
via `loadFullCurriculum()`. If the test fails:

1. Check whether the command is drivable. If `satisfy()` doesn't know how to
   translate it, add a case.
2. Check whether Phase 3 can inject content. If the lesson has no `equals` and
   the `contains` pattern doesn't match a known derivation strategy, either add
   an `equals` field to the checklist or extend `deriveFileContent()`.
3. If the command config genuinely can't carry enough information (like bare `:s`),
   add it to `KNOWN_UNDERIVABLE` with a reason string.

### Adding a new command type to the engine

If the command needs special cursor positioning or mode handling in the test,
extend `satisfy()`. The bracket-positioning and register-positioning blocks are
the patterns to follow.

### Debugging a failure

The assertion message includes the lesson name and requirement label:

```
6.5 "Yanking a character into the command line" "Yank a ☆ character."
```

To debug, seed the lesson in isolation, drive the commands, and inspect the state:

```typescript
const lesson = lessons.find(l => l.module === 6 && l.lesson === 5);
let state = vimLessonEngine.seed(lesson);
const allowed = vimLessonEngine.allowedInput(lesson);
// Drive individual items and inspect state.buffer, state.cursor, state.register
```

---

## Architectural details worth knowing

### `fileReader` and `state.buffer` vs `state.files`

The active file's content lives in `state.buffer`, not in `state.files`. The
`fileReader` in `lessonEngine.ts` returns `state.buffer` for the active file when
editing, but reads `file.contents` from the virtual filesystem when in shell mode.

This is why Phase 3 injection into `state.files` works correctly: Phase 4 enters
the shell first, so `fileReader` reads the injected content from `state.files`
rather than the stale `state.buffer`.

### `VirtualFilesystem` is a `Map`

`state.files` is a `Map<string, VirtualFile>`, not a plain object. Use `.get()`
and `setVirtualFile()`, not bracket access.

### Monotonic latching

The runtime latches checklist items once they pass and never un-ticks them. The
playthrough replicates this with the `passedAfterDrive` set. Without latching,
`cursorReached` items would show as failing after the cursor moves to the next
requirement.
