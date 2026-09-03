# Supported command surface

Every key and command the simulated terminal accepts, what it does, and what it
says when it refuses. This is the reference for lesson authoring: if a command is
not listed here, a lesson must not ask the learner to type it.

Scope comes from the curriculum's goal statement
([`docs/curriculum-outline.md`](../../../curriculum-outline.md)):
the small subset of Vim needed to open, navigate, edit, save, and quit a file.
Explicitly out of scope there: `f`/`t`, marks, named registers,
macros, visual block, splits and windows, multi-buffer management, `H`/`M`/`L`,
and anything outside the committed set below.

**Keeping this current.** The engine is the source of truth; this file is a map of
it. When a command is added or removed, update the matching table here in the same
change. The tables are ordered to mirror the source, whose paths are relative to
the project root:

| Area                  | Source                                                              |
| --------------------- | ------------------------------------------------------------------- |
| Key dispatch, counts  | `src/engine/dispatch.ts`                                            |
| Shared key names      | `src/engine/keys.ts`                                                |
| Motions               | `src/engine/commands/motion.ts`                                     |
| Insert mode           | `src/engine/commands/insert.ts`                                     |
| Delete / change       | `src/engine/commands/edit.ts`, `src/engine/commands/textObjects.ts` |
| Yank / paste          | `src/engine/commands/yankPaste.ts`                                  |
| File position         | `src/engine/commands/fileInfo.ts`                                   |
| Visual mode           | `src/engine/commands/visual.ts`                                     |
| Undo / redo           | `src/engine/commands/undo.ts`, `src/engine/undoStack.ts`            |
| Ex command line       | `src/engine/commands/ex.ts`, `src/engine/commandLine.ts`            |
| Search                | `src/engine/commands/search.ts`                                     |
| Files, `:e`, `:w`     | `src/engine/filesystem.ts`                                          |
| netrw explorer        | `src/engine/explorer.ts`                                            |
| Shell and splash      | `src/engine/shell.ts`                                               |
| Unsupported-key reply | `src/engine/unsupported.ts`                                         |

## Lesson command group aliases

Lesson `allowedCommands` and `disallowedCommands` may use an `@`-prefixed alias
instead of listing each command separately. The loader expands aliases to the
commands in the table below, and aliases may be mixed with raw commands:
`["@navigation", "x"]`. An unknown alias fails lesson loading.

| Alias         | Commands                                          |
| ------------- | ------------------------------------------------- |
| `@navigation` | `h`, `j`, `k`, `l`, `0`, `$`, `w`, `b`, `gg`, `G`, `%` |
| `@arrows`     | `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight` |
| `@insert`     | `i`, `a`, `A`, `o`, `O`                           |
| `@deletion`   | `x`, `D`, `dd`, `dw`                              |
| `@change`     | `cc`, `cw`                                        |
| `@copyPaste`  | `yy`, `yl`, `p`                                   |
| `@undo`       | `u`, `Ctrl-r`                                     |
| `@visual`     | `v`, `V`                                          |
| `@search`     | `/`, `n`, `N`                                     |

Aliases are not valid for `commandLimits`, which caps individual commands.

## Normal mode

Counts are accumulated by `dispatch`; `0` starts a count only when one is already
pending, so a bare `0` is still the start-of-line motion.

### Motions

| Key             | Effect                                              | Count |
| --------------- | --------------------------------------------------- | ----- |
| `h` `j` `k` `l` | One column / line in that direction                 | Yes   |
| `←` `↓` `↑` `→` | Same as `hjkl`, recorded under the arrow's own name | Yes   |
| `0`             | First column of the line                            | No    |
| `$`             | Last column of the line                             | No    |
| `w` / `b`       | Next / previous word start                          | Yes   |
| `G`             | Last line; `{n}G` jumps to line `n`                 | Yes   |
| `gg`            | First line (two-key sequence; the first `g` pends)  | No    |
| `%`             | Jump to the matching `()`, `[]`, or `{}` delimiter  | No    |

Arrow keys bypass a lesson's `allowedCommands` filter, so basic navigation
always works even when the allow list omits them. They can be blocked via
`disallowedCommands` (individually as `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`,
`"ArrowRight"`, or as a group with `"@arrows"`), which lets an hjkl-teaching
lesson force learners off the arrow keys. A denied arrow key is blocked in both
normal and insert mode. They record their own command name and never stand in for
a taught motion in a checklist.

### Edits

| Key       | Effect                                                                               | Count |
| --------- | ------------------------------------------------------------------------------------ | ----- |
| `x`       | Delete the character under the cursor                                                | No    |
| `~`       | Toggle the case of the character under the cursor and advance one column             | Yes   |
| `r<char>` | Replace the character under the cursor, staying in normal                            | No    |
| `D`       | Delete from the cursor to end of line                                                | No    |
| `dd`      | Delete the line (linewise)                                                           | Yes   |
| `dw`      | Delete to the next word start, stopping at end of line                               | Yes   |
| `cc`      | Delete the line and enter insert mode                                                | Yes   |
| `cw`      | Delete to the word end and enter insert mode                                         | Yes   |
| `yy`      | Yank the line (linewise)                                                             | No    |
| `yl`      | Yank the character under the cursor (charwise)                                       | No    |
| `p`       | Paste the unnamed register: below the line if linewise, after the cursor if charwise | No    |
| `u`       | Undo                                                                                 | No    |
| `Ctrl-r`  | Redo                                                                                 | No    |

Deletes, changes, and yanks all share the single unnamed register. Named
registers do not exist. `Ctrl-r` in the command line pastes from the unnamed
register (see [Ex command line](#ex-command-line-)).

Charwise register content can span lines, since a `v` selection can (see
[Visual mode](#visual-mode)). Pasting it splits the line the same way the copy
did, and leaves the cursor on the _first_ pasted character rather than the last —
Vim's own asymmetry between single-line and multi-line charwise pastes.

### Text objects

`d` and `c` accept `i` plus one object. Nothing else — `a` (`daw`) is not
implemented, and neither is any object beyond these three.

| Sequence      | Range                                        |
| ------------- | -------------------------------------------- |
| `diw` / `ciw` | The word under the cursor                    |
| `di"` / `ci"` | Inside the surrounding double quotes         |
| `di(` / `ci(` | Inside the innermost surrounding parentheses |

All three are single-line: the range never crosses a line boundary.

### Mode entries

| Key       | Effect                                        |
| --------- | --------------------------------------------- |
| `i`       | Insert before the cursor                      |
| `a`       | Insert after the cursor                       |
| `A`       | Insert at end of line                         |
| `o`       | Open a line below and insert                  |
| `O`       | Open a line above and insert                  |
| `v`       | Start a charwise selection (visual mode)      |
| `V`       | Start a linewise selection (visual line mode) |
| `:`       | Open the ex command line                      |
| `/`       | Open the search prompt                        |
| `n` / `N` | Repeat the last search forward / backward     |

### File position

| Key      | Effect                                                                 |
| -------- | ---------------------------------------------------------------------- |
| `Ctrl-g` | Report the file name, cursor line, total lines, percentage, and column |

The message reads `"<file>" line <L> of <N> --<P>%-- col <C>`, with `[Modified]`
after the file name when the buffer has unsaved edits. `<P>` is
`floor(L * 100 / N)`, so line 1 of a long file reads low and the last line reads
`100%`. It changes nothing in the buffer; it is how Vim surfaces which file a
single-window session is on. It records a `Ctrl-g` action, so a checklist can
match the keystroke.

## Insert mode

Every key routes through insert handling, so digits type literally rather than
starting a count.

| Key                            | Effect                                                      |
| ------------------------------ | ----------------------------------------------------------- |
| `Esc`                          | Return to normal mode, stepping the cursor left one column  |
| `Enter`                        | Split the line at the cursor                                |
| `Backspace`                    | Delete backward, joining with the previous line at column 0 |
| `←` `↓` `↑` `→`                | Move the cursor (may rest one past the last character)      |
| Any single printable character | Type it at the cursor                                       |

`Tab`, function keys, and every other multi-character key name are ignored.

## Visual mode

A selection is the pair (anchor, cursor), where the anchor is the position `v` or
`V` was pressed and the cursor is the end the learner moves. Both ends are
included, so `v` alone selects one character. Motions come from the normal-mode
registry unchanged, which is what makes every motion above work here for free —
counts included (`v3l`, `V2G`, `Vgg`).

| Key        | Effect                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| `v`        | Start a charwise selection; pressed again, end it and return to normal |
| `V`        | Start a linewise selection; pressed again, end it and return to normal |
| `Esc`      | Cancel the selection, leaving the cursor where it is                   |
| `o`        | Jump to the other end of the selection (swap cursor and anchor).       |
| Any motion | Move the cursor end of the selection; the anchor stays put             |
| `d` / `x`  | Delete the selection into the unnamed register                         |
| `y`        | Yank the selection into the unnamed register, leaving the buffer alone |
| `c`        | Delete the selection and enter insert mode where it began              |
| `~`        | Toggle the case of every selected character and return to normal       |

Switching granularity mid-selection keeps the anchor: `vjV` widens a two-line
charwise selection to both whole lines, and `Vv` narrows it back.

**Where the cursor lands.** After `d`, `y`, or `c` the cursor goes to the start of
what was selected — column 0 for a linewise selection, the exact start column for
a charwise one. This is Vim's behavior, and it means `d` on a selection made
backwards still leaves the cursor at the top of the range rather than where the
learner was standing.

**Granularity carries into the register.** A `V` selection is stored linewise, so
`p` puts it back as whole lines below the cursor; a `v` selection is charwise even
when it spans lines. A linewise `c` collapses the selected lines to one empty line
to type into, matching `cc`.

**What visual mode refuses.** Only the keys above act, and the refusal names the
mode: `i`, `a`, `A`, `O`, `p`, `r`, `u`, `Ctrl-r`, `D`, `:`, `/`, `n`, `N` all
report `<key> is not supported in visual mode in this lesson` (or
`visual line mode`, after `V`) and leave the
selection up, because acting on the buffer behind a live selection is never what
the learner meant.

Naming the mode is the point. Every key in that list is a command this course
teaches, so the plain `<key> is not supported in this lesson` would tell a learner
that `p` — which they used two modules ago — does not exist, and quietly contradict
the lesson that taught it. A key the course simulates nowhere (`f`, `t`, `z`)
still gets the plain message, in visual mode as in normal mode. The two messages
draw exactly that line, and `src/engine/unsupported.ts` holds both.

A charwise selection that covers nothing — `v` then `d` on an empty line — leaves
visual mode and records nothing, the same silent no-op as `x` on an empty line.

**What a checklist can match.** Visual mode records `v`, `V`, `d`, `x`, `y`, `c`, and
`~` under exactly those names, so a `command` test names the key the lesson taught.
The bare operator names are unambiguous: normal mode never records `d`, `y`, or `c`
alone — only `dd`, `dw`, `yy`, `cc`, `cw` — so a checklist asking for `d` can only
be satisfied by a selection, and one asking for `dd` is never satisfied by a
visual delete. `x` is the exception, since it is also a normal-mode command; a
lesson that means the visual alias should pair it with `v` or `V`.

## Ex command line (`:`)

Keys buffer into the command line; `Enter` runs the buffered command, `Esc`
cancels, `Backspace` deletes one character or cancels when the buffer is empty,
and `Ctrl-r` pastes the unnamed register into the buffer (works in both `:` and
`/` prompts). Entering the prompt with `:` is always
permitted; the buffered command is what a lesson's `allowedCommands` /
`disallowedCommands` filter judges, on `Enter` — so a rejected ex command reports
its `filtered` action when it runs, not when the `:` opened the prompt.

| Command                       | Effect                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `:w`                          | Write the buffer to the active file                                                                                        |
| `:update`                     | Write the buffer only when it has unsaved changes                                                                          |
| `:q`                          | Quit to the shell; refuses with E37 if the buffer is modified                                                              |
| `:q!`                         | Quit, discarding unsaved edits                                                                                             |
| `:wq`                         | Write and quit                                                                                                             |
| `:e <path>`                   | Open a path; creates a `[New]` buffer when nothing is on disk. Refuses with E37 if the current buffer is modified          |
| `:e! <path>`                  | Same, discarding the current buffer's unsaved edits                                                                        |
| `:Explore`                    | Open the netrw listing                                                                                                     |
| `:set <option>`               | `number`, `nu`, `nonumber`, `nonu`, `number!`, `nu!`, `invnumber`, `invnu`. `number` is the only option simulated          |
| `:s/old/new/[flags]`          | Substitute on the cursor line: first match, or every match with `g`; `i` for case-insensitive; `n` counts only             |
| `:%s/old/new/[flags]`         | Substitute across the whole file: first match per line, or every match with `g`; `i` for case-insensitive; `n` counts only |
| `:vimgrep /pat/[g][j] <glob>` | Search files for a pattern into the quickfix list, then jump to the first match                                            |
| `:grep[!] <pat> <glob>`       | Same as `:vimgrep` with slash-free syntax; `!` suppresses the jump                                                         |
| `:cdo <cmd>`                  | Run an Ex command for every entry in the quickfix list                                                                     |
| `:cnext` / `:cn`              | Jump to the next quickfix match                                                                                            |
| `:cprev` / `:cp` / `:cN`      | Jump to the previous quickfix match                                                                                        |
| `:cc [nr]`                    | Jump to match `nr` (1-based), or re-show the current one                                                                   |
| `:clist` / `:cl`              | List every quickfix match over the buffer; shows `Press ENTER or type command to continue` until the next keystroke        |
| `:cmd1 \| :cmd2`              | Run Ex commands sequentially, passing the resulting buffer state from one command to the next                              |

Substitute notes: both delimiters (`/old/new/`) are required and `%` is the only
range, so `:%s/a/b` (no trailing slash) reports E492. Supported flags: `g`
(replace every match, not just the first), `i` (case-insensitive), `n` (report the
match count without changing anything), and any combination of them. Duplicate or
unknown flags report E492. A bare `:s/…/…/` acts on the cursor's line only;
`:%s/…/…/` acts on every line. A run that changes nothing reports E486. The `n`
query leaves the buffer and `dirty` untouched and reports `N matches on M lines`
(or E486 at zero), counting every match with `g` and one per line without it. It
still records its `:%s/…/n` action, so a `commandLimits` cap that must exclude it
uses the `/pattern/flags` key form (see below) rather than a bare `:%s`. The
pattern is a JavaScript regular expression, and `\/` escapes a literal slash in
the replacement.

`:set` records the spelling the learner typed rather than a canonical form, so a
checklist item can use `exact` to insist on one spelling.

Quickfix notes: the `<glob>` is matched against the flat file list as a string —
`*` / `**` take every file, `*.ext` matches by suffix, anything else is an exact
filename (there is no directory tree). Without the `g` flag `:vimgrep` records one
entry per matching line; with it, one per match. The list **does not wrap**:
`:cnext` past the last match or `:cprev` before the first reports E553. A match in
another file is opened like `:e`, so an unsaved buffer refuses the jump with E37.
A `:vimgrep` that matches nothing reports E480 and leaves the previous list intact.
`:clist` draws over the buffer as a read-only overlay (the real buffer is
untouched) and shows `Press ENTER or type command to continue`. The next key
dismisses the overlay and then runs normally: `:` opens the command line, `j`
moves the cursor down, and `i` enters insert mode.

Undo is per-buffer in Vim, but this engine keeps a single undo stack, so **any
command that switches the active file clears undo/redo** — `:e`, `:e!`, and a
`:vimgrep`/`:cnext`/`:cc` jump into another file. Otherwise `u` in the newly opened
file would restore the buffer of the one just left. Navigation that stays within a
file leaves undo intact.

## Search (`/`)

`/` opens the prompt; `Enter` runs the search. Searching wraps around the file
and reports the wrap on the status line. `/` with an empty pattern repeats the
last one. There is no backward `?` prompt — only `N` searches backward.

## netrw explorer

A read-only listing of the virtual filesystem, sorted by path. Only files on disk
are listed, so a path conjured by `:e <missing>` and never written is absent.

| Key       | Effect                                                             |
| --------- | ------------------------------------------------------------------ |
| `j` / `↓` | Move the selection down                                            |
| `k` / `↑` | Move the selection up                                              |
| `Enter`   | Open the selected file; refuses with E37 if the buffer is modified |

Every other key leaves the listing untouched, including `i` and `:`, so it stays
read-only; a command key says it is unsupported rather than doing nothing, naming
the explorer when the key does work elsewhere in the course
(`i is not supported in the file explorer in this lesson`). The explorer is exempt
from the `allowedCommands` filter.

## Shell

The shell accepts exactly one command, in two forms:

| Command      | Effect                                                                    |
| ------------ | ------------------------------------------------------------------------- |
| `vim`        | Reopen the active file — or show the startup splash at a cold-start shell |
| `vim <path>` | Open a path the lesson seeded in `# --files--`                            |

A path that was never seeded is rejected rather than conjured, the way a typo
would be. Reopening restores the file's **saved** contents and resets undo
history, matching a fresh Vim session.

The startup splash is not a mode and has no keys of its own. A bare `vim` opens
the empty unnamed buffer real Vim opens, in normal mode, with the splash drawn
over it as filler; every command in this reference works underneath it, `:e
<path>` included. The filler clears on the first keystroke that edits the buffer
or loads another one, and survives ones that don't (`:` then `Esc`, a motion, a
rejected command) — as Vim's own intro does. Nothing the screen prints (`:help`,
version info) is real. A lesson can start there directly with
`start: "splash"`, skipping the shell step.

The buffer it opens has no filename, so `:w` and `:wq` report
`E32: No file name` rather than pretending to save. `:w <path>` is not
simulated.

## Messages

Vim's own wording, in the engine's words:

| Message                                           | When                                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `E37: No write since last change`                 | `:q`, `:e`, or netrw `Enter` on a modified buffer                                                                                  |
| `E32: No file name`                               | `:w` or `:wq` on the unnamed buffer a bare `vim` opens                                                                             |
| `E471: Argument required`                         | Bare `:e`, `:e!`, or `:set`                                                                                                        |
| `E492: Not an editor command: :<cmd>`             | Any ex command not in the table above                                                                                              |
| `E518: Unknown option: <opt>`                     | A `:set` option other than `number`                                                                                                |
| `E35: No previous regular expression`             | `/`, `n`, or `N` with no earlier search                                                                                            |
| `E486: Pattern not found: <pattern>`              | `/` or `:%s` finding no match                                                                                                      |
| `E480: No match: <pattern>`                       | `:vimgrep` or `:grep` finding no match (the list is kept)                                                                          |
| `E553: No more items`                             | `:cnext` past the last match or `:cprev` before the first                                                                          |
| `E42: No Errors`                                  | `:cnext`, `:cprev`, `:cc`, or `:clist` with no quickfix list                                                                       |
| `"<path>" [New]`                                  | Opening a path with nothing on disk                                                                                                |
| `"<file>" line L of N --P%-- col C`               | `Ctrl-g` reporting the cursor's position in the file                                                                               |
| `search hit BOTTOM, continuing at TOP`            | A forward search wrapping                                                                                                          |
| `search hit TOP, continuing at BOTTOM`            | A backward search wrapping                                                                                                         |
| `<key> is not supported in this lesson`           | A command key or sequence the engine does not simulate (see below)                                                                 |
| `<key> is not supported in <mode> in this lesson` | A key the engine does simulate, pressed in a mode where it has no meaning (`visual mode`, `visual line mode`, `the file explorer`) |
| `command not found: <cmd>`                        | A shell command other than `vim`                                                                                                   |
| `<path> is not a file in this lesson`             | `vim <path>` on a path the lesson never seeded                                                                                     |

Every message above is also the screen-reader announcement for that keystroke:
`announce` in `src/curriculum/lessonEngine.ts` prefers `state.status` over
everything else it could say.

## Unsupported keys

Nothing the learner types goes unanswered. A command key the engine does not
simulate reports itself on the status line rather than appearing to do nothing —
real Vim rings the bell there, which a browser cannot show. The wording and the
reporting rule live in `src/engine/unsupported.ts`.

There are two wordings, and the difference matters: `is not supported in this
lesson` means the engine simulates the key nowhere, while `is not supported in
<mode> in this lesson` means it does simulate the key, just not where it was
pressed. Never reach for the first when the second is true — a learner told that a
command they have been taught does not exist will not trust the one that does.

The plain wording covers:

- **Any unregistered normal-mode key** — `f`, `t`, `H`, `M`, `L`, `?`, `z`:
  `f is not supported in this lesson`.
- **An operator with an unsupported motion or object** — `d$`, `dj`, `di]`, `yw`.
  The pending operator cancels and the whole attempted sequence is named:
  `d$ is not supported in this lesson`.
- **Any command key in the netrw listing** other than `j`/`k`/`Enter`.
- **An unrecognized shell command** — `command not found: ls`, or
  `missing.md is not a file in this lesson` for an unseeded path.

The mode-named wording covers:

- **A key the course teaches, pressed in visual mode, where it has no meaning** —
  `p`, `u`, `Ctrl-r`, `i`, `o`, `r`, `D`, `:`, `/`:
  `p is not supported in visual mode in this lesson`. See
  [Visual mode](#visual-mode).
- **A key the course teaches, pressed in the netrw listing** — `i`, `:`, `x`, `G`,
  `h`/`l`: `G is not supported in the file explorer in this lesson`. The listing
  tests membership in the normal-mode registry to decide, so a command added later
  is classified correctly without touching `explorer.ts`.

### Still silent, deliberately

- **Hardware keys with no command behind them** — `Shift`, `Home`, `F1`,
  `Backspace` and `Enter` in normal mode. Anything whose key name is longer than
  one character is treated as hardware, which Vim also ignores quietly. `Esc`
  cancels a pending operator without comment, as it should.
- **A supported command with no effect** — `x` or `D` at end of line, `p` with an
  empty register, `diw` with the cursor on whitespace, `v` then `d` on an empty
  line. Calling these unsupported would be a lie: the command exists and ran. Vim
  only beeps.
- **`Enter` at an empty shell prompt.**
- **A refusal E37 blocks** — `:q`, `:e <path>`, or netrw `Enter` on a modified
  buffer. The error shows, but no action is recorded, so a `quit` item or a
  `:e`-matching item never latches on an attempt Vim rejected. Author "quit" as a
  `{ quit: true }` state predicate rather than `{ command: ":q" }`.

A command a lesson's `allowedCommands`/`disallowedCommands` filter rejects is a
separate case: it records a `filtered` action, which the lesson runtime treats as
an attempt and answers by revealing the checklist hint. The filter judges the
_resolved_ command (`dd`, `:wq`), so a multi-key command is rejected when it
completes, not on its leading key; arrow keys and opening the command line/search
are always exempt. It applies in visual mode as in normal mode.
