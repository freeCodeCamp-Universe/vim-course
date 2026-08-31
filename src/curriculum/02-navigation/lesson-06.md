---
id: 6a75e416116f97fc366586c2
type: learn
title: 'Jumping to the top and bottom of a file'
---

# --author-notes--

## CAG

**Concept:**

- `gg` jumps to line 1, regardless of the current position.

- `G` with no count jumps to the last line.
- Together they cover both ends of a file in one keystroke each.
- `G` must be uppercase. Lowercase `g` acts as a prefix waiting for a second key to form a command, like `gg`.

**Activity:**
From the middle of the working file, jump to the top with `gg`, then to the bottom with `G`.

**Goal:**
The learner reaches either boundary of a file instantly, without scrolling.

## Notes

<!-- Some other notes -->

# --instructions--

Vim has navigation commands to jump to the top or bottom of a file:

- `gg` jumps to the **first** line.
- `G` jumps to the **last** line.

Note that `G` must be uppercase. Lowercase `g` acts as a prefix waiting for a second key to form a command, like `gg` above.

---

The cursor is placed in the middle of the file. Use `gg` to jump to the top, then `G` to the bottom.

# --files--

## editor-history.md

```md
For early Unix systems, developers used editors like `ed` (short for "editor"). At the time, computers lacked video monitors and used teletype machines that physically printed output onto paper. Because `ed` couldn't display the whole file, users had to blind-type commands to modify text and print lines onto paper to see the result.

In 1976, `ex` (short for "extended") was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens. It introduced a visual mode, using the new screens to render multiple lines of text at once.

In 1979, `vi` (short for "visual") was released as a full-screen editor. It freed users from `ed` and `ex`'s line-by-line constraints. Now they could see and edit an entire screen of text, taking advantage of the new video display monitors replacing paper terminals.

In 1991, Vim (short for "Vi IMproved") was released, adding essential modern features like multiple undo levels, split windows, and syntax highlighting. It eventually became the standard text editor on most Linux systems.
```

# --config--

```json
{
  "cursor": [5, 1],
  "disallowedCommands": ["@arrows"],
  "checklist": [
    {
      "label": "Jump to the very first line.",
      "hint": "You should press <kbd>g</kbd> twice to jump to line 1.",
      "test": { "command": "gg" }
    },
    {
      "label": "Jump to the very last line.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>g</kbd> to jump to the last line.",
      "test": { "command": "G" }
    }
  ]
}
```
