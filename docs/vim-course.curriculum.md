---
status: ready
slug: vim-course
date: 2026-07-23
---

# Curriculum: Practical Vim for Terminal Editing

- [`projects/vim-course/docs/references/commands.md`](references/commands.md) for the full set of commands the terminal supports
- [`projects/vim-course/docs/references/lesson-authoring.md`](references/lesson-authoring.md) for lesson file structure, config block, checklist rules, and seed continuity
- [`projects/vim-course/docs/lesson-style-guide.md`](lesson-style-guide.md) for prose style, pedagogical conventions, and spaced repetition principles.

## Goal

Teach the small subset of Vim needed to make quick, confident edits in a terminal: find and open a file, move around it, edit it, save, and quit. The learner already has a daily-driver editor elsewhere; this course targets terminal-editing survival, not Vim mastery or its full command surface. Out of scope: `f`/`t`, marks, registers, macros, visual block, splits/windows, multi-buffer management, `H`/`M`/`L`, and anything not in the committed command set.

## Writing curriculum entries

Each lesson entry in **Modules** below uses this structure:

```
#### N. **Title** — type: `learn` | `practice` | `review`

- **Concept:** What the lesson teaches. One bullet per new command; recap bullets name which earlier lesson each came from.
- **Activity:** What the learner does — concrete, imperative steps.
- **Goal:** One sentence stating what the learner can do after finishing.
```

Followed by the complete lesson markdown in a fenced block (` ````markdown ... ```` `). For stub lessons, a single `- **Content:** TBD` bullet replaces the three standard ones. `review` entries document only what is recapped, with no embedded markdown.

## Activity types

`type` is a UI label; it does not affect how a lesson is validated.

| Type       | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| `learn`    | A guided, step-by-step lesson that walks the learner through specific taught commands. |
| `practice` | An open-ended activity: the learner is given a goal and works out how to reach it.     |
| `review`   | Read-only recap. No `# --config--` section — that absence is what makes it prose.      |

## Modules

### 01. Modes, insert, save, quit (`modes`)

The learner's first contact with Vim: what it is, how to launch it, normal mode vs. insert mode, the four ways into insert mode, and the save/quit commands that end a session. Everything later in the course assumes this round trip is second nature.

Lessons, in teaching order:

#### 1. **What is Vim, and starting it** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b2 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-01.md)

- **Concept:**
  - Vim is a text editor you run entirely from the keyboard, no mouse needed.
  - It comes preinstalled on almost every Linux, macOS, and Unix computer, so it's the one editor you can count on finding already there, even on a computer you don't normally use.
  - You start it by typing `vim` in the terminal (optionally followed by a filename) and pressing `Enter`.
  - This lesson opens on that plain prompt instead of inside the editor, so the last thing it teaches is the launch itself.
- **Activity:** Read why Vim is worth learning, then in the terminal type `vim` and press `Enter` to open the file.
- **Goal:** The learner understands why Vim is worth learning, and performs the exact keystrokes that get them from a bare terminal into Vim.

#### 2. **Opening a file from inside Vim: `:e`** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b3 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-02.md)

- **Concept:**
  - Bare `vim` (lesson 1) lands on an empty welcome screen, not tied to any file.
  - `:e <filename>` opens a file by name without leaving Vim, replacing whatever's in the buffer.
  - This is how you'll load `about-vim.md`, the file you'll keep working in for the rest of this module.
- **Activity:** Start Vim with `vim` (a recap from the previous lesson), then use `:e about-vim.md` to open the file.
- **Goal:** The learner opens a specific file from inside a running Vim session, without quitting back to the shell first.

#### 3. **Opening a file directly: `vim <filename>`** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b4 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-03.md)

- **Concept:**
  - Recap: `:e <filename>` (lesson 2) opens a file from inside a running Vim session.
  - Typing `vim <filename>` at the shell does the same thing in one step, skipping the welcome screen and the `:e` command entirely.
  - Since you're usually starting from the terminal rather than already inside Vim, this is the version you'll reach for most often.
- **Activity:** Type `vim about-vim.md` and press `Enter` to open the file directly.
- **Goal:** The learner opens a specific file by name in one step, instead of opening Vim bare and then running `:e`.

#### 4. **Modes: entering and leaving insert mode** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b5 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-04.md)

- **Concept:**
  - Vim starts in normal mode, where keys are commands, not text.
  - `i` enters insert mode just before the cursor.
  - The status line at the bottom of the screen shows `--INSERT--` while insert mode is active — the way to confirm at a glance which mode you're in.
  - `Esc` returns to normal mode from insert mode.
- **Activity:** Open `about-vim.md` with `vim about-vim.md` (a recap from the previous lesson), press `i`, notice the `--INSERT--` indicator appear at the bottom of the screen, then press `Esc` and notice it disappear.
- **Goal:** The learner reliably switches into and out of insert mode and knows how to confirm their current mode from the status line.

#### 5. **More ways in: a and A** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b6 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-05.md)

- **Concept:**
  - Recap: `i` enters insert mode just before the cursor.
  - `a` enters insert mode just after the cursor — one column to the right of `i`.
  - `A` jumps to the end of the line and enters insert mode there, regardless of the cursor's column; it only works as a command from normal mode, so `Esc` is required before using it.
- **Activity:** Open `about-vim.md` with `vim about-vim.md` (a recap from earlier lessons). Press `i` again to reinforce last lesson, then `Esc`. Press `a` and notice the one-column difference from `i`, then `Esc`. Press `A` and notice it jumps to the end of the line regardless of cursor position.
- **Goal:** The learner distinguishes `i`'s and `a`'s cursor placement and knows `A` always targets the end of the line.
- **Checklist note:** Only one `Return to normal mode` item, at the end. Requiring `a` and then `A` already proves the learner left each prior insert session, because both only register as commands from normal mode (a capital "A" typed in insert mode records an insert action, which `command` matching skips). Two identical `Esc` items would both tick on the first `Esc`, since `command` is an existence check.

#### 6. **Saving with `:w`** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b7 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-06.md)

- **Concept:**
  - The colon opens command-line mode, where file operations live.
  - `:w` writes the buffer to disk without closing it — the status line confirms the write, and you stay in normal mode, ready to keep editing.
  - The Down arrow key moves the cursor to the next line — handy here since Vim's own movement keys haven't been taught yet.
- **Activity:** Press Down once to reach the last line, fix the "useed" typo into "used", then save with `:w`.
- **Goal:** The learner saves work without ending the session.

#### 7. **New lines and quitting** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b8 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-07.md)

- **Concept:**
  - `o` opens a new line below the current one and enters insert mode there.
  - `:w` saves the change — a recap from last lesson.
  - `:q` quits Vim. With no unsaved changes, it closes right away.
- **Activity:** Add a new line below the current one with `o`, save it with `:w`, then quit with `:q`.
- **Goal:** The learner adds a new line without manually positioning the cursor first, reinforces saving, and closes a session with no unsaved changes.

#### 8. **`O` and force quit with `:q!`** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586b9 -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-08.md)

- **Concept:**
  - `O` opens a new line above the current one, mirroring `o` from last lesson.
  - `:q` — a recap from last lesson — refuses to quit when there are unsaved changes, showing `E37: No write since last change`.
  - `:q!` forces the quit anyway, discarding those changes.
- **Activity:** Add a line above with `O`, leave it unsaved, try `:q` and see `E37`, then force-quit with `:q!`.
- **Goal:** The learner practices `O`, sees that Vim protects unsaved work by default, and knows how to override that protection deliberately.

#### 9. **Save and quit together** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586ba -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-09.md)

- **Concept:** `:wq` combines writing and quitting, the single most common way to end an editing session.
- **Activity:** Make an edit and close it out with `:wq`.
- **Goal:** The learner has the complete save/quit toolkit.

#### 10. **Practice: Updating a file** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586bb -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-10.md)

- **Concept:** None new — combine opening a file, an insert-family command, saving, and quitting freely, without being told which command to use at each step.
- **Activity:** Starting from a bare terminal, open a file, finish the incomplete last sentence by replacing the blank with the phrase given in the instructions, then save and quit.
- **Goal:** The learner completes a first realistic multi-step task, starting and ending outside the editor, instead of executing isolated commands.

#### 11. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586bc -->

Status: ✅
Source: [file](../src/curriculum/01-modes/lesson-11.md)

(Authored as `type: review` with no `# --config--` section, which is what makes it prose: instructions only, no terminal or checklist.)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - `vim` to launch the editor from the terminal.
  - `:e <filename>` to open a file from inside a running Vim session.
  - `vim <filename>` to open a specific file directly.
  - `i`/`a`/`A`/`o`/`O` for entering insert mode and where each lands.
  - `Esc` to return to normal mode.
  - `:w` to save.
  - `:q`/`:q!` and the `E37` safeguard.
  - `:wq` to do both at once.

### 02. Navigation (`navigation`)

Efficient movement once a file is longer than one screen: character-, word-, line-, and file-level motions, all composable with counts later in the course.

Lessons, in teaching order:

#### 1. **Moving with h, j, k, l** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586be -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-01.md)

- **Concept:**
  - `h`/`j`/`k`/`l` move left/down/up/right, the home-row equivalent of arrow keys.
  - Hand position: these four keys sit on the home row, so you move around a file without lifting your hands off it to reach a separate arrow key cluster.
  - History: the convention is often traced to the Lear Siegler ADM-3A, a computer terminal from the 1970s with no dedicated arrow keys; its arrows were printed directly on the H, J, K, and L keys, and vi (Vim's predecessor) carried the choice forward.
  - Some developers keep using `hjkl` for that hand-position advantage, but Vim also recognizes the arrow keys, so switching back to them is always an option.
  - Vim's steep learning curve is well known enough that beginners' frustration with it became a running joke online — a Stack Overflow question about how to exit Vim was viewed more than two million times and turned into a meme for a while.
- **Activity:** Open this module's working file with `vim <filename>` (a recap from module 01), then move through it using only `h`/`j`/`k`/`l`.
- **Goal:** The learner understands why `hjkl` exists and moves through a file without touching the arrow keys, while knowing the arrow keys still work.
- **Checklist note:** Seed the cursor mid-file (`[3, 5]`), not top-left. `k` and `h` cannot move from `[1, 1]`, and the engine records a blocked motion anyway, so a top-left seed would tick "move up" and "move left" without the cursor ever moving. Since `reopenVim` now honors `config.cursor` for `start: "shell"` lessons, the seed actually takes effect.

#### 2. **Word jumps: w and b** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586bf -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-02.md)

- **Concept:**
  - `w` jumps to the start of the next word.
  - `b` mirrors it, jumping to the start of the previous word.
  - Together they cover a line faster than stepping through it character by character with `hjkl`.
  - Vim's steep learning curve is well known enough that beginners' frustration with it became a running joke online — a Stack Overflow question about how to exit Vim was viewed more than two million times and turned into a meme for a while.
- **Activity:** With `editor-history.md` already open, move down to the last paragraph with `j`, jump forward through the rest of that line's words with `w` to reach the target word, then jump back with `b` to reach "IMproved".
- **Goal:** The learner covers a line efficiently in both directions, not just forward, and combines the move with last lesson's `j`.

#### 3. **Line start and end: 0 and $** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586c0 -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-03.md)

- **Concept:**
  - `0` jumps to the very start of the line, `$` to the end.
  - Both work regardless of where the cursor currently sits on the line.
- **Activity:** Move down to the third paragraph with `j`, jump to the end of that line with `$`, then back to its start with `0`.
- **Goal:** The learner reaches either end of a line in one keystroke and combines it with `j` from an earlier lesson.

#### 4. **Practice: Navigating with `hjkl`** — type: `practice`

<!-- lesson: 6a771dc4c7ad8347b685c80c -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-04.md)

- **Concept:** Use hjkl to navigate the cursor to specific positions on an ASCII-art "VIM" logo.
- **Activity:** Trace key waypoints on each letter.
- **Goal:** The learner builds muscle memory for hjkl.

#### 5. **Practice: navigate and edit** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586c1 -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-05.md)

- **Concept:** None new — combine `hjkl`/`w`/`b`/`0`/`$` with module 01's insert-family and save commands to reach and edit a specific spot in a file.
- **Activity:** Starting from the end of the file, navigate up to the end of the second paragraph using any combination of this module's motions, append a sentence, then save.
- **Goal:** The learner practices this module's navigation alongside module 01's editing and save commands, on a file where reaching the right spot matters as much as the edit itself.

#### 6. **Top and bottom of file: gg and G** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586c2 -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-06.md)

- **Concept:**
  - `gg` jumps to line 1, regardless of the current position.
  - `G` with no count jumps to the last line.
  - Together they cover both ends of a file in one keystroke each.
  - `G` must be uppercase. Lowercase `g` acts as a prefix waiting for a second key to form a command, like `gg`.
- **Activity:** From the middle of the working file, jump to the top with `gg`, then to the bottom with `G`.
- **Goal:** The learner reaches either boundary of a file instantly, without scrolling.

#### 7. **Go to a specific line** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586c3 -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-07.md)

- **Concept:**
  - Prefixing `G` with a number jumps to that exact line, the same count mechanic used elsewhere in Vim.
  - `:set number` turns on a line number gutter along the left edge of the screen, and `:set nonumber` turns it back off.
  - The gutter is a display setting, not file content: the numbers are never part of the text and never written to the file.
- **Activity:** Turn on line numbers with `:set number`, jump directly to a specific line number given in the instructions, then turn the line numbers off again with `:set nonumber`.
- **Goal:** The learner makes line numbers visible, navigates directly to a known line number while seeing where the cursor lands, and knows how to turn the display back off.

#### 8. **Practice: reach the target** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586c4 -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-08.md)

- **Concept:** None new — combine any of this module's motions freely (`hjkl`/`w`/`b`/`0`/`$`/`gg`/`G`/`{n}G`) to reach four blanks in a file, then clear each placeholder with `Backspace` (already available in insert mode, not a new command) before typing the answer.
- **Activity:** Starting from a bare terminal, open a file categorizing four types of editors by how they work, navigate to each blank, delete the placeholder, and type in the matching name.
- **Goal:** The learner navigates fluently to arbitrary targets using whichever motion fits, instead of executing motions in isolation.

#### 9. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586c5 -->

Status: ✅
Source: [file](../src/curriculum/02-navigation/lesson-09.md)

(Authored as `type: review` with no `# --config--` section, which is what makes it prose: instructions only, no terminal or checklist.)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - `hjkl` for character movement.
  - `w`/`b` for word jumps.
  - `0`/`$` for line boundaries.
  - `gg`/`G` for file boundaries.
  - `{n}G` for a specific line.

#### 10. **Practice: Motion maze** — type: `practice`

<!-- lesson: 6a8f2e7c4b1d3a9e5f0c8d72 -->

Status: 🚧
Source: [file](../src/curriculum/02-navigation/lesson-10.md)

- **Concept:** None new.
- **Activity:** Practice.
- **Goal:** Practice.

### 03. Opening files (`opening-files`)

The course's first real task on an unfamiliar terminal: finding and opening a file, either by name or by browsing.

Lessons, in teaching order:

#### 1. **Open a known file** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586c7 -->

Status: ✅
Source: [file](../src/curriculum/03-opening-files/lesson-01.md)

- **Concept:**
  - Recap: a known file can be opened with `vim <filename>` from the shell or with `:e <filename>` from inside a running Vim session (module 01).
  - `ex`'s colon prompt is where that syntax comes from, and it's still the gateway into Vim's command-line mode today.
  - `Ctrl-g` reports which file is currently open, without changing anything or requiring Enter — useful once several files have been opened in the same session.
- **Activity:** Open `colon.md` either by launching Vim with `vim colon.md` or by starting Vim and using `:e colon.md`, then press `Ctrl-g` to see which file is open.
- **Goal:** The learner refreshes both ways to open a known file, picks up where the colon prompt itself comes from, and learns how to check which file they're on.

#### 2. **Opening a file that doesn't exist** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586c8 -->

Status: ✅
Source: [file](../src/curriculum/03-opening-files/lesson-02.md)

- **Concept:**
  - Opening a filename that doesn't exist creates a new, empty buffer under that name instead of producing an error, as if starting a fresh file from scratch — there's just nothing on disk yet to load into it.
  - A typo in a filename looks identical to a genuinely new file, which is why guessing without knowing exactly what's in a directory is risky.
- **Activity:** Starting from `colon.md` already open, open `Colon.md` and see the empty buffer it produces.
- **Goal:** The learner sees exactly what happens when Vim opens a nonexistent path, motivating the next lesson's directory browsing.

#### 3. **Browsing to find the right file** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586c9 -->

Status: ✅
Source: [file](../src/curriculum/03-opening-files/lesson-03.md)

- **Concept:**
  - `:Explore` opens a read-only directory listing inside the editor.
  - `:Explore` must be capitalized. Vim requires user-defined commands like this one to start with an uppercase letter, so `:explore` doesn't exist at all and errors instead.
  - The listing reuses ordinary movement keys — `j`/`k` move the selection down/up, no new motion commands to learn.
  - Pressing `Enter` on a highlighted entry opens that file, the same result as typing `:e <filename>` yourself.
- **Activity:** From the empty `exclamation.md` buffer (recap of last lesson's mistaken guess), open the directory listing with `:Explore`, move to `exclamation-point.md` with `j`/`k`, and open it with `Enter`. Then browse into the `letters` subdirectory and open `G.md`.
- **Goal:** The learner finds and opens files whose exact names or locations they didn't already know, instead of guessing at `:e`.

#### 4. **Practice: find the right file and fix it** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586ca -->

Status: ✅
Source: [file](../src/curriculum/03-opening-files/lesson-04.md)

- **Concept:** None new — apply file-finding together with insert mode and Backspace across several files: delete a duplicate word, split a sentence into a new paragraph, and start a file from nothing.
- **Activity:** Browse a directory with `:Explore`, open two existing files in turn, fix each one using insert mode and Backspace, save each one, then create a third file with `:e` and write a line into it.
- **Goal:** The learner completes a realistic multi-file editing task, removing and replacing text with only the commands taught so far, without being told the exact keystrokes. The final step turns lesson 2's accident — `:e` on a name that isn't there — into something deliberate.

#### 5. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586cb -->

Status: ✅
Source: [file](../src/curriculum/03-opening-files/lesson-05.md)

(Authored as `type: review` with no `# --config--` section, which is what makes it prose: instructions only, no terminal or checklist.)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - `:e` for known paths, and what happens when the path doesn't exist.
  - `:Explore` for browsing.
  - `j`/`k` to navigate the listing.
  - `Enter` to open from it.
  - `Ctrl-g` to check which file is open.

### 04. Editing (`editing`)

The core editing vocabulary: deleting, replacing, copying, pasting, undoing, and changing text in place.

Lessons, in teaching order:

#### 1. **Single-character fixes** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586cd -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-01.md)

- **Concept:**
  - `x` deletes the character under the cursor.
  - `r` followed by a key replaces the character under the cursor with that key. Both stay in normal mode.
- **Activity:** Open `return.md` from the shell, delete a stray character with `x`, replace a wrong character with `r`, and save the file. Leave `enter.md` untouched.
- **Goal:** The learner removes or replaces individual characters without entering insert mode.

#### 2. **Deleting bigger units** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586ce -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-02.md)

- **Concept:**
  - `dw` deletes from the cursor to the start of the next word — Vim's delete-plus-motion pattern.
  - `dd` deletes the entire current line.
  - `D` deletes from the cursor to the end of the line, a shortcut for `d$`.
  - `D` must be uppercase. Lowercase `d` acts as a prefix waiting for a second key to form a command, like `dw`/`dd`.
- **Activity:** Fix `enter.md` by removing a duplicate word with `dw`, deleting a stray line with `dd`, and trimming trailing text with `D`. Leave `return.md` untouched.
- **Goal:** The learner deletes text at the scope the edit calls for — a word, a whole line, or the rest of a line — and sees that delete commands combine with motions.

#### 3. **Practice: single characters and scoped deletes** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586cf -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-03.md)

- **Concept:** None new — combine `x`/`r`/`dw`/`dd`/`D` freely to bring a file to a target state.
- **Activity:** Edit a small file into its expected end state (delete a stray block of lines with `dd`, remove a duplicated word with `dw`, fix two pairs of swapped letters with `r`, trim trailing text with `D`, and strip out several stray characters with `x`).
- **Goal:** The learner performs a realistic edit combining single-character fixes with deletes at different scopes.

#### 4. **Copy and paste** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586d0 -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-04.md)

- **Concept:**
  - `yy` yanks (copies) the whole line the cursor is on — the column it's sitting in doesn't matter, only the line.
  - `p` pastes whatever text was last yanked or removed (by any of the delete commands) on the line right after the cursor's current line.
- **Activity:** Starting from `abc.md`, yank a line, switch to a new running file (`keyboard-history.md`, already started with the opening sentence) with `:e`, jump to its last line with `G`, and paste. Repeat for a second line, then save. A `qwerty.md` file is introduced alongside it, readable but off-limits to edit or copy from yet.
- **Goal:** The learner moves text between files using yank, switch, jump-to-end, and paste.

#### 5. **Undo and redo** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586d1 -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-05.md)

- **Concept:**
  - Recap: `yy`/`p` copy a line from one file into another (previous lesson).
  - `u` undoes the last change, `Ctrl-r` redoes it — the safety net for every command in this module.
- **Activity:** Copy the one paragraph in `qwerty.md` into `keyboard-history.md` with `yy`/`p`. Undo that paste with `u`, then bring it back with `Ctrl-r`.
- **Goal:** The learner practices moving text between files again, and recovers from an undo without fear.

#### 6. **Change a word/line** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586d2 -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-06.md)

- **Concept:**
  - `cw` deletes a word and drops into insert mode to type its replacement.
  - `cc` does the same for a whole line — delete-and-insert fused into one command.
- **Activity:** `abc.md` and `qwerty.md` have already been copied into `keyboard-history.md`, so they're no longer needed on their own. Get a `cw` rep in `abc.md`, then clear the rest with `dd`. `qwerty.md` is a single line, so a `cc` rep there empties the whole file in one motion.
- **Goal:** The learner edits in place without a separate delete-then-insert step.

#### 7. **Practice: writing a history page** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586d3 -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-07.md)

- **Concept:** None new — combine `cc`, `dd`, `yy`, `p` (and `u`/`Ctrl-r` if something goes wrong) freely to restructure a document.
- **Activity:** Turn a bare skeleton file (`computer-mouse.md`: a placeholder title, two placeholder section headings, and a small picture) into a short history of the computer mouse — rewrite the headings, pull a paragraph in from each of two source files (`first-mouse.md`, `modern-mouse.md`) with `yy`/`p`, and relocate the second heading with `dd`/`p` so it lands after the picture instead of before it.
- **Goal:** The learner restructures a document into an exact target shape using this module's editing commands.

#### 8. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586d4 -->

Status: ✅
Source: [file](../src/curriculum/04-editing/lesson-08.md)

(Authored as `type: review` with no `# --config--` section, which is what makes it prose: instructions only, no terminal or checklist.)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - `x`/`r` for single characters.
  - `dd`/`dw`/`D` for deleting at different scopes. Note: `D` must be uppercase.
  - `yy`/`p` for copy-paste.
  - `u`/`Ctrl-r` for undo/redo.
  - `cw`/`cc` for change-in-place.

### 05. Visual mode (`visual-mode`)

Selecting an arbitrary range first, then acting on exactly that range, instead of relying on a fixed-scope command.

Lessons, in teaching order:

#### 1. **Character-wise selection: try it out** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586d6 -->

Status: ✅
Source: [file](../src/curriculum/05-visual-mode/lesson-01.md)

- **Concept:** `v` starts visual mode, extending a selection character by character as the cursor moves.
- **Activity:** Select a span of text with `v` and movement, then leave visual mode with `Esc` without acting on it yet. This lesson is deliberately just the "try it out" step — selecting is a visible, self-contained thing to explore before the next lesson pairs it with an action.
- **Goal:** The learner sees and controls a live selection, and understands `v` on its own before combining it with anything else.

#### 2. **Line-wise selection: move the first paragraph** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586d7 -->

Status: ✅
Source: [file](../src/curriculum/05-visual-mode/lesson-02.md)

- **Concept:**
  - `V` selects whole lines at a time. `V` must be typed as uppercase; lowercase `v` is the character-wise selection from the previous lesson. When this lesson is authored, call this out for the learner the same way modules 02 and 04 do for `G` and `D`.
  - With a selection active, `d` cuts it, `y` yanks (copies) it, and `p` pastes whatever is in the register after the current line — the same commands from module 4, now acting on entire lines instead of a motion.
- **Activity:** Move two paragraphs at once from `## Clipboard` to `## Final` using `V`, `d`, and `p`.
- **Goal:** The learner applies `V` + `d` + `p` to move a line-wise selection to a new location.

#### 3. **Using o to complete the rearrangement** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586da -->

Status: ✅
Source: [file](../src/curriculum/05-visual-mode/lesson-03.md)

- **Concept:** `o` in visual mode jumps the cursor to the opposite end of the selection. This makes it easier to select and rearrange line-wise content from either end.
- **Activity:** Use `o` with `V`, `d`, and `p` to move the remaining two paragraphs into order, fix the bullet list order, delete the `## Clipboard` heading, and save.
- **Goal:** The learner uses `o` and the visual line editing flow to complete a multi-step rearrangement independently.

#### 4. **Practice: Rearranging keyboard shortcuts** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586e4 -->

Status: ✅
Source: [file](../src/curriculum/05-visual-mode/lesson-04.md)

- **Concept:** None new — use `V`, `o`, `y`, and `p` to copy content between files, then complete a sequence.
- **Activity:** Copy the strand data from `strands.md` into `dna.md`, then use `guide.md` as reference to complete the incomplete Opposite Strand. When selecting multiple lines in `strands.md`, `o` lets the user swap to the top of the selection and trim if they overshoot.
- **Goal:** The learner copies content between files using visual mode and completes a real DNA sequence using a reference file.

#### 5. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586d9 -->

Status: ✅
Source: [file](../src/curriculum/05-visual-mode/lesson-05.md)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - `v` for character selection.
  - `V` for line selection.
  - `o` to jump the cursor to the other end of the selection.
  - `d`/`y`/`c` acting on whatever is selected.

### 06. Search and replace (`search-replace`)

Finding text by content instead of position, and changing many occurrences at once.

Lessons, in teaching order:

#### 1. **Search forward, and repeating it** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586db -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-01.md)

- **Concept:**
  - `/` opens a search prompt; typing a pattern and pressing `Enter` jumps to the next match.
  - `\c` makes a search case-insensitive, so it matches both uppercase and lowercase text.
  - `n` repeats the last search in the same direction, `N` in reverse.
- **Activity:** Search for a given term and land on it, then use `n`/`N` to step through further occurrences.
- **Goal:** The learner finds text by content instead of scrolling to it, and moves between repeated matches without re-typing the search.

#### 2. **Jump to matching bracket** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586dc -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-02.md)

- **Concept:**
  - `%` jumps between a bracket and its matching pair: `[`, `]`.
  - Useful for finding where a bracket closes before editing around it.
- **Activity:** The file has unnecessary brackets around part of a regex description. Position the cursor before the text in brackets, press `%` to jump to its matching closing delimiter, then use `d%` to remove the text without leaving a space before the comma.
- **Goal:** The learner uses `%` to locate matching brackets before removing the bracketed text.

#### 3. **Jumping to matching parenthesis or brace** — type: `learn`

<!-- lesson: 6a8dad423a99ade720f842fb -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-03.md)

- **Concept:**
  - `%` jumps between matching parentheses `()` and braces `{}`, in addition to brackets.
  - `v%` selects the text through the matching delimiter in visual mode.
  - `c%` changes the text through the matching delimiter and enters insert mode.
- **Activity:** Use `v%` to select and move the parenthesized `☆` text, then use `c%` to replace `{must}` with `can`.
- **Goal:** The learner can navigate to and edit text enclosed by matching parentheses and braces.

#### 4. **Current-line substitute** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586dd -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-04.md)

- **Concept:**
  - `:s/old/new/` replaces the first occurrence of `old` with `new` on the current line.
  - `:s/old/new/g` replaces every occurrence of `old` with `new` on the current line.
  - `:s/old/new/i` replaces the first occurrence of `old` with `new` on the current line, case-insensitively.
  - `:s/old/new/gi` replaces every occurrence of `old` with `new` on the current line, case-insensitively.
- **Activity:** The file has a paragraph that starts with a lowercase letter and several incorrectly capitalized letters in another paragraph. Fix each issue using `:s`.
- **Goal:** The learner practices current-line substitution and discovers that `:s` without the `g` flag only replaces the first match per line.

#### 5. **Yanking a character into the command line** — type: `learn`

<!-- lesson: 6a7a4d19e6cc6699ab83a2ab -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-05.md)

- **Concept:**
  - `yl` yanks the character under the cursor into the unnamed register (charwise).
  - `Ctrl-r` pastes the unnamed register into the `:` or `/` command line.
  - Together they let the learner type characters that aren't on the keyboard.
- **Activity:** The file contains a `☆` symbol that the learner must use in a substitute command. They yank the symbol with `yl`, type `:s/`, paste it with `Ctrl-r`, complete the command to replace all `☆` symbols on the second paragraph with `*`, and save.
- **Goal:** The learner discovers how to yank a character and paste it into the command line, solving the practical problem of typing symbols not on the keyboard.

#### 6. **Global substitute** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586de -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-06.md)

- **Concept:**
  - `:s/old/new/` substitutes the first match per line.
  - The `g` flag extends that to every match per line.
  - Prefixing with `%` (as in `:%s`) applies the substitution to the whole file.
  - `:%s/old//gn` counts matches without substituting — the `n` flag is a dry run.
- **Activity:** The file uses placeholder symbols in place of `*` and the word "star". Run two `:%s` commands to restore both, then use `:%s//gn` to verify each symbol is gone.
- **Goal:** The learner performs a global find-and-replace in one command, repeats it for a second term, and confirms completeness with a count-only query.

#### 7. **Checkpoint: search and substitution** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586df -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-07.md)

- **Concept:** No new commands — applies `:%s/pattern//gn` from the previous lesson alongside `/`, `n`/`N`, `:s`, `:%s`, and `r` in one realistic editing task.
- **Activity:** Decrypt a ciphered message by choosing the right substitution tool for each cipher character based on how often it appears.
- **Goal:** The learner chooses the right substitution tool for each part of the task without being told which to use.

#### 8. **Cross-file search with `:vimgrep` and `:cnext`** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586e0 -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-08.md)

- **Concept:**
  - `:vimgrep pattern files` searches all matching files and collects every match into the quickfix list.
  - `:cnext` (`:cn`) jumps to the next entry in the quickfix list, opening its file if needed.
  - `:cprev` (`:cp`) steps backwards through the list.
- **Activity:** Run `:vimgrep fork *.md` to search for the term `fork` across all five files. Navigate through the matches with `:cnext` and `:cprev` to explore the results without making any changes.
- **Goal:** The learner searches across multiple files in one command and navigates through the matches using the quickfix list.

#### 9. **Multi-file fixes with `:cprev`** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586e1 -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-09.md)

- **Concept:**
  - `:clist` (`:cl`) displays the full quickfix list with file, line, and match text, giving a complete overview before navigating.
  - `:cc {number}` jumps directly to a specific entry in the quickfix list.
- **Activity:** Run `:vimgrep fork *.md`, inspect the full result list with `:clist`, then use `:cc {number}` to jump to a specific match.
- **Goal:** The learner can inspect a quickfix list and jump directly to a numbered match.

#### 10. **Navigating and updating files** — type: `learn`

<!-- lesson: 6a8ed61bc9287431260c5e29 -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-10.md)

- **Concept:**
  - `:vimgrep pattern files` searches multiple files and records every match in the quickfix list.
  - Search results can be edited with any previously learned substitution command and saved with `:w`.
- **Activity:** Open the reference file and copy the incorrect symbol, run `:vimgrep 𐂐 *.md` to find every occurrence, replace the matches with `|`, and save the changed files.
- **Goal:** The learner can search across multiple files, apply a consistent replacement, and save the resulting edits.

#### 11. **Practice: search-driven edit and substitution** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586e2 -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-11.md)

- **Concept:**
  - `:cdo {cmd}` runs a command on every entry in the quickfix list, applying a change to all matches at once.
- **Activity:** Run `:vimgrep /fork/ *.md` to collect all occurrences of `fork`, then use `:cdo s/fork/pipe/g | update` to replace and save every instance across all files in one command.
- **Goal:** The learner batch-fixes a consistent error across multiple files using `:cdo`, seeing how it replaces the manual `:cnext`/`:cprev` loop from the previous lesson.

#### 12. **Practice: searching and editing across multiple files** — type: `practice`

<!-- lesson: 6a7b8d5f1e5aa0cf31e40357 -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-12.md)

- **Concept:** No new commands — applies `:vimgrep`, `:clist`, `:cnext`/`:cprev`, and `:cdo` from the previous three lessons. **Setting:** Dallas City Directory. Eight files: a directory (`index.md`), background reading (`about.md`), and six content pages (`page-1.md` through `page-6.md`).
- **Activity:** 1. Fix phone number formatting — the Plumbers section (`page-4.md`) and those same five businesses in the white pages (`page-1.md`) have `555_XXXX` instead of `555-XXXX`. Ten instances across two files. The learner uses `:vimgrep` to find all occurrences, `:clist` to survey, and `:cdo` to fix in bulk. 2. Move a misplaced entry — The Petal Cafe is listed under Florists (`page-3.md`). It belongs under Restaurants (`page-5.md`), alphabetically between Oak & Trinity and Ranch Dressing.
- **Goal:** The learner applies `:vimgrep` to search across multiple files, `:clist` to survey results, `:cnext`/`:cprev` to navigate, and either `:cdo` for bulk substitution or manual editing for structural changes — choosing the right tool for each task without scaffolding.

#### 13. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586e3 -->

Status: ✅
Source: [file](../src/curriculum/06-search-replace/lesson-13.md)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - `/` for search.
  - `n`/`N` for repeating it.
  - `%` to jump between matching brackets.
  - `:%s/old/new/g` for global substitution.
  - `:vimgrep /pattern/ *.md` for cross-file search.
  - `:clist` to inspect the quickfix list.
  - `:cnext` / `:cprev` to navigate it.

### 07. Command grammar: counts + text objects (`command-grammar`)

A number in front of a motion or operator to repeat it, and one text object for editing the word under the cursor without moving to its start first.

Lessons, in teaching order:

#### 1. **Counting a motion or command** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586e5 -->

Status: 🚧
Source: [file](../src/curriculum/07-command-grammar/lesson-01.md)

- **Concept:** A number placed before a motion or operator repeats it that many times — `5j` moves down 5 lines, `3dd` deletes 3 lines. The same mechanic, applied to movement and to editing.
- **Activity:** Use a count with a motion to move a precise distance, then a count with `dd` to delete a precise number of lines.
- **Goal:** The learner repeats a motion or an editing command a precise number of times in one command, instead of pressing it repeatedly.

#### 2. **Text object: inner word** — type: `learn`

<!-- lesson: 6a75e416116f97fc366586e6 -->

Status: 🚧
Source: [file](../src/curriculum/07-command-grammar/lesson-02.md)

- **Concept:** Text objects describe "what," independent of cursor position; `iw` means "the word the cursor is in," usable with `d` or `c` (`diw`, `ciw`).
- **Activity:** Delete or change a word using `diw`/`ciw` without first moving to its start.
- **Goal:** The learner edits a word from anywhere inside it.

#### 3. **Practice: counts and text objects together** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586e7 -->

Status: 🚧
Source: [file](../src/curriculum/07-command-grammar/lesson-03.md)

- **Concept:** None new — real edits often chain a count with a motion, or pair `diw`/`ciw` with the word the cursor happens to be in.
- **Activity:** Bring a file to a target state using a mix of counted commands and `diw`/`ciw`.
- **Goal:** The learner composes the two together.

#### 4. **Module review** — type: `review`

<!-- lesson: 6a75e416116f97fc366586e8 -->

Status: 🚧
Source: [file](../src/curriculum/07-command-grammar/lesson-04.md)

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.
- **Recaps:**
  - Counts on motions and operators (`{n}j`, `{n}dd`).
  - Text object `iw` with `d`/`c`.

### 08. Capstone (`capstone`)

The closing module: a read-only command reference, then one multi-step lab synthesizing the entire course as an escape room, then a recap that closes the loop and explains the riddle. All three live here as lessons in one module rather than as separate modules.

**Engine requirement — not yet implemented:** `:w` (and `:wq`) must refuse to write when the `## Answer` content doesn't yet match the expected value, on top of (not instead of) the existing `E37` dirty-buffer refusal on `:q`. Today `:w` always succeeds unconditionally and `:q`'s only gate is dirty-vs-saved, with no awareness of content — so the escape-room lesson needs new logic in `projects/vim-course/src/engine/commands/ex.ts` (near the existing `E37` handling in `filesystem.ts`) that intercepts `:w`/`:wq`, evaluates the buffer against the answer test, and refuses the write (with its own status message, not `E37`) when it doesn't match. Once the write is accepted, the buffer goes clean and `:q` succeeds through its existing dirty-check unmodified — no change needed there. This is the load-bearing mechanic for lesson 2 and must exist before that lesson can be built.

Lessons, in teaching order:

#### 1. **Command reference** — type: `review`

<!-- lesson: 6a75e416116f97fc366586eb -->

Status: ✅
Source: [file](../src/curriculum/08-capstone/lesson-01.md)

- **Concept:** None new — a read-only reference of the full committed command set, organized by category (modes, motion, editing, visual, search, counts/text objects, quitting).
- **Activity:** None (read-only).
- **Goal:** The learner has a single page to return to going into the escape room, and after.

#### 2. **Escape room: solve the riddle to leave** — type: `practice`

<!-- lesson: 6a75e416116f97fc366586ea -->

Status: ✅
Source: [file](../src/curriculum/08-capstone/lesson-02.md)

- **Concept:** No new commands — this capstone synthesizes file navigation, search, yank and paste, editing, and saving in a puzzle-driven task.
- **Activity:** The learner explores Maren's study and solves three independent puzzles: a rune crossword whose odd word is STORM, a potion formula whose diagonal extraction is LAUREL, and a Sylvan translation puzzle whose pooled initials identify CRANE. They enter the three keys in order in `study.md`.
- **Goal:** The learner chooses and composes previously learned Vim commands to complete a realistic multi-file challenge, then saves the final password without being guided through a prescribed command sequence.
- **Puzzle assets (draft):** Two clue files establish the target coordinates in `manual.md`. The learner counts to get the numbers; the object itself signals which axis.
  - `keyboard.md` — a keyboard diagram, no labels. Three keys are lit: Ctrl (bottom-left), G and J (home row). Lit keys = `█`, unlit keys = `⠿`. The learner counts the lit keys to get the line number (3, if the answer sits on line 3 — TBD pending answer word selection).

#### 3. **Course recap and the riddle explained** — type: `review` — 📝

<!-- lesson: 6a7dbe380cec0eb56fe6a538 -->

Status: ✅
Source: [file](../src/curriculum/08-capstone/lesson-03.md)

Explains how the capstone puzzles could have been solved, including the final keys.

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Review.

#### 4. **Where to go from here** — type: `review`

<!-- lesson: 84b33a45faa62b616d22e329 -->

Status: ✅
Source: [file](../src/curriculum/08-capstone/lesson-04.md)

Provides next steps for continuing to learn Vim after completing the course.

- **Concept:** None new.
- **Activity:** Review.
- **Goal:** Provides next steps for continuing to learn Vim after completing the course.
