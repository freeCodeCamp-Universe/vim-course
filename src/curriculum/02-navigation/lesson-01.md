---
id: 6a75e416116f97fc366586be
type: learn
title: 'Moving up, down, left, right'
---

# --author-notes--

## CAG

**Concept:**

- `h`/`j`/`k`/`l` move left/down/up/right, the home-row equivalent of arrow keys.

- Hand position: these four keys sit on the home row, so you move around a file without lifting your hands off it to reach a separate arrow key cluster.
- History: the convention is often traced to the Lear Siegler ADM-3A, a computer terminal from the 1970s with no dedicated arrow keys; its arrows were printed directly on the H, J, K, and L keys, and vi (Vim's predecessor) carried the choice forward.
- Some developers keep using `hjkl` for that hand-position advantage, but Vim also recognizes the arrow keys, so switching back to them is always an option.
- Vim's steep learning curve is well known enough that beginners' frustration with it became a running joke online — a Stack Overflow question about how to exit Vim was viewed more than two million times and turned into a meme for a while.

**Activity:**
Open this module's working file with `vim <filename>` (a recap from module 01), then move through it using only `h`/`j`/`k`/`l`.

**Goal:**
The learner understands why `hjkl` exists and moves through a file without touching the arrow keys, while knowing the arrow keys still work.

## Notes

<!-- Some other notes -->

# --instructions--

While you can use arrow keys in Vim, the editor has its own movement keys:

- <kbd>h</kbd> moves left
- <kbd>j</kbd> moves down
- <kbd>k</kbd> moves up
- <kbd>l</kbd> moves right

These four keys sit on the home row of the keyboard, so you can move around a file without having to reach the arrow key cluster.

The convention is often traced back to the Lear Siegler ADM-3A, a computer terminal from the 1970s that had no dedicated arrow keys. Its arrows were printed directly on the H, J, K, and L keys, and `vi` (Vim's predecessor) carried the choice forward.

Some developers stick with `hjkl` for that hand-position advantage, but Vim also recognizes the arrow keys, so you can always use them.

---

For your learning experience, the arrow keys are disabled in this module.

Open `editor-history.md` in the terminal, then move through the file using `hjkl`.

# --files--

## editor-history.md

```md
For early Unix systems, developers used editors like `ed` (short for "editor"). At the time, computers lacked video monitors and used teletype machines that physically printed output onto paper. Because `ed` couldn't display the whole file, users had to blind-type commands to modify text and print lines onto paper to see the result.

In 1976, `ex` (short for "extended") was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens.

In 1979, `vi` (short for "visual") was released as a full-screen editor. It freed users from `ed` and `ex`'s line-by-line constraints. Now they could see and edit an entire screen of text, taking advantage of the new video display monitors.

In 1991, Vim (short for "Vi IMproved") was released, adding modern features like multiple undo levels, split windows, and syntax highlighting. It eventually became the standard text editor on most Linux systems.
```

# --config--

```json
{
  "start": "shell",
  "cursor": [3, 5],
  "disallowedCommands": ["@arrows"],
  "checklist": [
    {
      "label": "Open `editor-history.md`.",
      "hint": "You can use `vim editor-history.md` to open the file. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "open": "editor-history.md" }
    },
    {
      "label": "Move the cursor down.",
      "hint": "You should press <kbd>j</kbd> to move the cursor down one line.",
      "test": { "command": "j" }
    },
    {
      "label": "Move the cursor right.",
      "hint": "You should press <kbd>l</kbd> to move the cursor right one character.",
      "test": { "command": "l" }
    },
    {
      "label": "Move the cursor up.",
      "hint": "You should press <kbd>k</kbd> to move the cursor up one line.",
      "test": { "command": "k" }
    },
    {
      "label": "Move the cursor left.",
      "hint": "You should press <kbd>h</kbd> to move the cursor left one character.",
      "test": { "command": "h" }
    }
  ]
}
```
